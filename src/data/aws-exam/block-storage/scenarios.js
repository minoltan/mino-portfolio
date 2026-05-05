import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Block & File Storage scenarios
 *
 * Source study topic: Amazon EBS and Amazon EFS (SAA-C03),
 * grounded in the AMI PVT LTD multi-tenant SaaS marketplace running in ap-southeast-1.
 * marketplace-prod account: 234567890123
 */

const scenarios = [
    {
        id: 1,
        analogy: "Think of it like choosing a hard drive for your computer — a standard SSD (gp3) works great for everyday use and you can choose its speed separately from its size, while a high-performance NVMe drive (io2) is for professionals doing heavy video editing who need the absolute fastest speeds.",
        icon: "💾",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "EBS Volume Types",
        subtitle: "Choosing the right volume for Spring Boot API and the MCP Report Generator",
        useCase: {
            title: "AMI PVT LTD Marketplace — gp3 for API root volumes, io2 for latency-sensitive DB writes",
            story: "Every EC2 instance in marketplace-api-asg (min=2/max=10/desired=3) launches from the marketplace-api-golden-ami-v1, which carries a gp3 root volume. AMI PVT LTD provisions each gp3 volume with 16,000 IOPS and 1,000 MB/s throughput — both tuned independently of the 100 GiB size, which is the key advantage of gp3 over the older gp2 that tied IOPS to storage size (3 IOPS/GiB). The MCP Report Generator, which performs latency-sensitive sequential database writes, uses an io2 Block Express volume providing up to 256,000 IOPS at sub-millisecond latency. Warm data and nightly report archives land on st1 throughput-optimised volumes for cost efficiency.",
            diagram: [
                { actor: "marketplace-api-asg EC2 instance", icon: "🖥️" },
                { arrow: "root volume: gp3 (16,000 IOPS, 1,000 MB/s, 100 GiB)" },
                { actor: "gp3 EBS Volume (independent IOPS + throughput)", icon: "💾" },
                { arrow: "DB write path for MCP Report Generator" },
                { actor: "io2 Block Express Volume (up to 256,000 IOPS, sub-ms)", icon: "⚡" },
            ],
        },
        buildSystem: [
            "In the marketplace-api-launch-template, set the block device mapping for /dev/xvda to volume type gp3, size 100 GiB",
            "Use --iops 16000 and --throughput 1000 in the launch template device mapping to provision IOPS/throughput independently of size",
            "Verify gp3 baseline: all volumes get 3,000 IOPS and 125 MB/s free; provisioned IOPS above 3,000 incur an additional charge",
            "For the MCP Report Generator EC2, attach an io2 Block Express volume: aws ec2 create-volume --volume-type io2 --iops 64000 --size 500",
            "Enable EBS-Optimized on all marketplace-api-asg instances (set in the launch template) for dedicated EBS bandwidth",
            "Attach st1 volumes (500 GiB each) to the nightly report archive instances for high-throughput sequential reads at low cost",
            "Tag all volumes with Service=marketplace-api, Environment=prod, and CostCenter=platform for billing visibility",
            "Monitor EBSIOBalance% and EBSThroughputBalance% CloudWatch metrics on gp2 volumes; if consistently low, migrate to gp3",
        ],
        flow: ["Launch Template", "gp3 Root Volume (16K IOPS)", "marketplace-api-asg EC2", "io2 Block Express (MCP DB)", "st1 Archive Volumes"],
        examTips: [
            "gp3 decouples IOPS and throughput from volume size — you can provision up to 16,000 IOPS on any size volume; gp2 is limited to 3 IOPS/GiB (max 16,000 only at 5,334+ GiB)",
            "io1/io2 support multi-attach (up to 16 Nitro-based EC2 instances simultaneously); gp2/gp3 do not support multi-attach",
            "io2 Block Express delivers up to 256,000 IOPS and 4,000 MB/s throughput with 99.999% durability — use for mission-critical databases",
            "st1 (throughput-optimised HDD) and sc1 (cold HDD) cannot be used as boot volumes; gp2, gp3, io1, io2 can",
            "EBS-Optimized instances provide dedicated throughput between EC2 and EBS, eliminating network contention with other traffic",
        ],
        roleJson: [
            {
                label: "AWS CLI — modify existing gp2 root volume to gp3 with custom IOPS and throughput",
                note: "💡 Modifying a live volume with ModifyVolume requires no downtime; the change takes effect within minutes.",
                code: `# Find the volume ID attached to a marketplace-api-asg instance
aws ec2 describe-volumes \\
  --filters Name=attachment.instance-id,Values=i-0abc123marketplace \\
            Name=volume-type,Values=gp2 \\
  --query 'Volumes[*].{ID:VolumeId,Size:Size,IOPS:Iops}'

# Modify from gp2 → gp3 with custom IOPS and throughput (no reboot needed)
aws ec2 modify-volume \\
  --volume-id vol-0abc123marketplace \\
  --volume-type gp3 \\
  --iops 16000 \\
  --throughput 1000

# Create io2 Block Express volume for MCP Report Generator
aws ec2 create-volume \\
  --availability-zone ap-southeast-1a \\
  --volume-type io2 \\
  --size 500 \\
  --iops 64000 \\
  --encrypted \\
  --kms-key-id alias/marketplace-ebs-key \\
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=marketplace-mcp-db-vol},{Key=Service,Value=mcp-report-generator}]'`,
            },
        ],
        cdkCode: [
            {
                label: "AWS CDK v2 — Launch Template with gp3 root volume (16K IOPS) for marketplace-api-asg",
                note: "💡 CDK's LaunchTemplate.blockDevices sets the EBS volume type and provisioned IOPS. Use EbsDeviceVolumeType.GP3 to get independent IOPS/throughput tuning.",
                code: `import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';

const ebsKey = kms.Key.fromLookup(this, 'MarketplaceEbsKey', {
  aliasName: 'alias/marketplace-ebs-key',
});

const launchTemplate = new ec2.LaunchTemplate(this, 'MarketplaceApiLaunchTemplate', {
  launchTemplateName: 'marketplace-api-launch-template',
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.XLARGE),
  machineImage: ec2.MachineImage.genericLinux({
    'ap-southeast-1': 'ami-0marketplace123', // marketplace-api-golden-ami-v1
  }),
  ebsOptimized: true,
  blockDevices: [
    {
      deviceName: '/dev/xvda',
      volume: ec2.BlockDeviceVolume.ebs(100, {
        volumeType: ec2.EbsDeviceVolumeType.GP3,
        iops: 16000,
        throughput: 1000,
        encrypted: true,
        kmsKey: ebsKey,
        deleteOnTermination: true,
      }),
    },
  ],
});`,
            },
        ],
    },

    {
        id: 2,
        analogy: "Think of it like a camera that takes a photo of your whiteboard every night — the first photo captures everything, but each one after only records what changed since yesterday (incremental), and you can always reconstruct the full board from any point in history.",
        icon: "📸",
        color: ACCENT.teal,
        tag: "SCENARIO 2",
        title: "EBS Snapshots & AMI Backup",
        subtitle: "Incremental snapshots and DLM for automated marketplace AMI lifecycle",
        useCase: {
            title: "AMI PVT LTD Marketplace — daily EBS snapshots and the marketplace-api-golden-ami-v1 build pipeline",
            story: "AMI PVT LTD takes daily EBS snapshots of the root gp3 volume on every running Spring Boot EC2 instance in marketplace-api-asg. Snapshots are incremental — the first snapshot copies the full volume to S3 (managed by AWS, not in the marketplace-tool-artifacts bucket), and each subsequent snapshot stores only the changed blocks. Data Lifecycle Manager (DLM) automates the schedule: a DLM policy targets instances tagged Service=marketplace-api, creates a snapshot every 24 hours at 02:00 UTC, and retains the last 7 snapshots. When a new Spring Boot version is validated, the ops team registers a new AMI — marketplace-api-golden-ami-v1 — from the latest snapshot, and updates the marketplace-api-launch-template to reference the new AMI version for the next instance refresh.",
            diagram: [
                { actor: "marketplace-api-asg EC2 (root gp3 volume)", icon: "🖥️" },
                { arrow: "DLM policy triggers daily snapshot at 02:00 UTC" },
                { actor: "EBS Snapshot (incremental, AWS-managed S3)", icon: "📸" },
                { arrow: "register snapshot as AMI" },
                { actor: "marketplace-api-golden-ami-v1 (new AMI version)", icon: "🏆" },
                { arrow: "referenced in marketplace-api-launch-template" },
                { actor: "marketplace-api-asg (instance refresh rolls out new AMI)", icon: "🔄" },
            ],
        },
        buildSystem: [
            "Tag all marketplace-api-asg EC2 instances with Service=marketplace-api, Environment=prod for DLM targeting",
            "Create a DLM lifecycle policy with schedule frequency 24 hours, create time 02:00, and retention count 7",
            "Set the DLM target tags to Service=marketplace-api so only marketplace API volumes are captured",
            "Enable DLM cross-region copy to ap-southeast-2 (Sydney) for disaster recovery of the golden AMI lineage",
            "After a Spring Boot release is validated in staging, take a manual snapshot of the root volume: aws ec2 create-snapshot --volume-id vol-0abc123",
            "Register a new AMI from the snapshot: aws ec2 register-image --name marketplace-api-golden-ami-v1 --root-device-name /dev/xvda --block-device-mappings",
            "Update marketplace-api-launch-template to the new AMI ID and create a new launch template version",
            "Trigger an ASG instance refresh to roll out the new AMI across marketplace-api-asg with minimum healthy 90%",
        ],
        flow: ["DLM Policy (daily 02:00)", "EBS Snapshot (incremental)", "Manual Snapshot (release)", "Register AMI", "Launch Template Update", "Instance Refresh"],
        examTips: [
            "EBS snapshots are incremental — only changed blocks are stored after the first snapshot; restoring always gives the complete volume",
            "Snapshots are stored in AWS-managed S3 and are regionally durable across multiple AZs; they are NOT stored in your S3 buckets",
            "Creating an AMI from a running instance creates snapshots of all attached volumes; use --no-reboot to avoid disruption (consistency risk)",
            "DLM can automate snapshot lifecycle including creation, retention, cross-region copy, and cross-account sharing",
            "Snapshots can be shared with other AWS accounts or made public; encrypted snapshots can only be shared with accounts that have access to the CMK",
        ],
        roleJson: [
            {
                label: "AWS CLI — create DLM lifecycle policy for daily marketplace-api snapshots",
                note: "💡 DLM requires an IAM role (AWSDataLifecycleManagerDefaultRole) to create and delete snapshots on your behalf.",
                code: `# Create the DLM policy — targets EC2 instances tagged Service=marketplace-api
aws dlm create-lifecycle-policy \\
  --description "Daily EBS snapshots for marketplace-api-asg root volumes" \\
  --state ENABLED \\
  --execution-role-arn arn:aws:iam::234567890123:role/AWSDataLifecycleManagerDefaultRole \\
  --policy-details '{
    "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
    "ResourceTypes": ["INSTANCE"],
    "TargetTags": [{"Key": "Service", "Value": "marketplace-api"}],
    "Schedules": [{
      "Name": "daily-2am-utc",
      "CreateRule": {
        "Interval": 24,
        "IntervalUnit": "HOURS",
        "Times": ["02:00"]
      },
      "RetainRule": { "Count": 7 },
      "CopyTags": true
    }]
  }'

# Register a new AMI from a snapshot for golden AMI pipeline
aws ec2 register-image \\
  --name "marketplace-api-golden-ami-v1" \\
  --description "Spring Boot API golden AMI built from validated snapshot" \\
  --architecture x86_64 \\
  --root-device-name /dev/xvda \\
  --virtualization-type hvm \\
  --block-device-mappings '[{
    "DeviceName": "/dev/xvda",
    "Ebs": {
      "SnapshotId": "snap-0abc123marketplace",
      "VolumeType": "gp3",
      "VolumeSize": 100,
      "DeleteOnTermination": true,
      "Encrypted": true,
      "KmsKeyId": "alias/marketplace-ebs-key"
    }
  }]'`,
            },
        ],
        cdkCode: [
            {
                label: "AWS CDK v2 — DLM lifecycle policy for daily EBS snapshots of marketplace-api-asg instances",
                note: "💡 CDK's dlm.CfnLifecyclePolicy targets instances by tag (Service=marketplace-api) and creates incremental snapshots on a schedule with a retention count.",
                code: `import * as dlm from 'aws-cdk-lib/aws-dlm';
import * as iam from 'aws-cdk-lib/aws-iam';

const dlmRole = iam.Role.fromRoleName(
  this, 'DlmRole', 'AWSDataLifecycleManagerDefaultRole'
);

new dlm.CfnLifecyclePolicy(this, 'MarketplaceApiSnapshotPolicy', {
  description: 'Daily EBS snapshots for marketplace-api-asg root volumes',
  state: 'ENABLED',
  executionRoleArn: dlmRole.roleArn,
  policyDetails: {
    policyType: 'EBS_SNAPSHOT_MANAGEMENT',
    resourceTypes: ['INSTANCE'],
    targetTags: [{ key: 'Service', value: 'marketplace-api' }],
    schedules: [
      {
        name: 'daily-2am-utc',
        createRule: {
          interval: 24,
          intervalUnit: 'HOURS',
          times: ['02:00'],
        },
        retainRule: { count: 7 },
        copyTags: true,
        tagsToAdd: [
          { key: 'CreatedBy', value: 'DLM-marketplace-api' },
        ],
      },
    ],
  },
});`,
            },
        ],
    },

    {
        id: 3,
        analogy: "Think of it like a building where every filing cabinet is automatically fitted with a combination lock using the master key — even the cleaners can't read the files inside, and if someone brings in an old unlocked cabinet from outside, you simply make a locked copy and put the original away.",
        icon: "🔐",
        color: ACCENT.amber,
        tag: "SCENARIO 3",
        title: "EBS Encryption",
        subtitle: "KMS CMK encryption at rest and in transit for all marketplace volumes",
        useCase: {
            title: "AMI PVT LTD Marketplace — marketplace-ebs-key encrypts every volume in marketplace-vpc",
            story: "AMI PVT LTD enforces a policy that all EBS volumes in marketplace-vpc (10.0.0.0/16) must be encrypted using the KMS Customer Managed Key (CMK) marketplace-ebs-key (alias/marketplace-ebs-key) in account 234567890123. The marketplace-api-launch-template specifies this KMS key ID in the block device mapping, so every instance launched by marketplace-api-asg gets an encrypted root volume automatically. Data is encrypted at rest on the physical disk and also encrypted in transit between the EC2 instance and the EBS volume over the internal AWS network. When an encrypted AMI snapshot is shared with the management account (123456789012) for audit, the recipient must be granted kms:ReEncrypt* and kms:CreateGrant permissions on marketplace-ebs-key. An unencrypted snapshot imported from an on-premises backup can be encrypted at copy time by specifying the CMK in the CopySnapshot call.",
            diagram: [
                { actor: "marketplace-api-asg EC2 (in marketplace-vpc)", icon: "🖥️" },
                { arrow: "all I/O encrypted in transit (AES-256)" },
                { actor: "EBS Volume (encrypted at rest with marketplace-ebs-key)", icon: "🔐" },
                { arrow: "snapshot inherits encryption from source volume" },
                { actor: "Encrypted Snapshot (marketplace-ebs-key)", icon: "📸" },
                { arrow: "CopySnapshot with --kms-key-id to encrypt unencrypted snapshot" },
                { actor: "Re-encrypted Snapshot (marketplace-ebs-key)", icon: "🔑" },
            ],
        },
        buildSystem: [
            "Create a KMS CMK with alias marketplace-ebs-key in ap-southeast-1, account 234567890123",
            "Enable AWS account-level EBS encryption by default: aws ec2 enable-ebs-encryption-by-default --region ap-southeast-1",
            "Set the default CMK: aws ec2 modify-ebs-default-kms-key-id --kms-key-id alias/marketplace-ebs-key",
            "In marketplace-api-launch-template block device mapping, set Encrypted=true and KmsKeyId=alias/marketplace-ebs-key",
            "Verify all running volumes are encrypted: aws ec2 describe-volumes --filters Name=encrypted,Values=false",
            "To encrypt an unencrypted legacy snapshot: aws ec2 copy-snapshot --source-snapshot-id snap-old --encrypted --kms-key-id alias/marketplace-ebs-key",
            "Grant management account (123456789012) kms:DescribeKey, kms:ReEncrypt*, kms:CreateGrant on marketplace-ebs-key for snapshot sharing",
            "Add an SCP in the management account to deny creation of unencrypted EBS volumes across all marketplace child accounts",
        ],
        flow: ["KMS CMK (marketplace-ebs-key)", "Launch Template (encrypted=true)", "Encrypted EBS Volume", "Encrypted Snapshot", "Cross-Account Snapshot Share"],
        examTips: [
            "EBS encryption uses AES-256; data is encrypted at rest on disk and in transit between EC2 and EBS over the AWS network — no application changes needed",
            "Encrypted snapshots always produce encrypted volumes; you cannot remove encryption from a snapshot once it is applied",
            "Copying an unencrypted snapshot with --encrypted and --kms-key-id produces an encrypted copy — the original remains unencrypted",
            "When you share an encrypted snapshot, the recipient account must have kms:CreateGrant on the CMK to be able to use the snapshot",
            "Enabling EBS encryption by default at the account level ensures all new volumes and snapshots are encrypted, even if the requester does not specify a key",
        ],
        roleJson: [
            {
                label: "AWS CLI — enable EBS encryption by default and encrypt an unencrypted legacy snapshot",
                note: "💡 Enabling encryption by default is region-scoped; repeat for every region where marketplace resources are deployed.",
                code: `# Enable account-level EBS encryption by default in ap-southeast-1
aws ec2 enable-ebs-encryption-by-default \\
  --region ap-southeast-1

# Set the default CMK to the marketplace CMK
aws ec2 modify-ebs-default-kms-key-id \\
  --kms-key-id alias/marketplace-ebs-key \\
  --region ap-southeast-1

# Encrypt a legacy unencrypted snapshot at copy time
aws ec2 copy-snapshot \\
  --source-region ap-southeast-1 \\
  --source-snapshot-id snap-0legacyunencrypted \\
  --destination-region ap-southeast-1 \\
  --encrypted \\
  --kms-key-id alias/marketplace-ebs-key \\
  --description "Re-encrypted copy of legacy snapshot for marketplace compliance"

# KMS key policy — allow management account to use the key for snapshot sharing
{
  "Sid": "AllowManagementAccountSnapshotShare",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::123456789012:root" },
  "Action": ["kms:DescribeKey", "kms:ReEncrypt*", "kms:CreateGrant"],
  "Resource": "*"
}`,
            },
        ],
        cdkCode: [
            {
                label: "AWS CDK v2 — KMS CMK (marketplace-ebs-key) with cross-account grant for snapshot sharing",
                note: "💡 Create the KMS key in CDK with the alias marketplace-ebs-key and add the management account as a principal for kms:ReEncrypt* and kms:CreateGrant.",
                code: `import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';

const ebsKey = new kms.Key(this, 'MarketplaceEbsKey', {
  alias: 'marketplace-ebs-key',
  description: 'CMK for all EBS volumes in marketplace-vpc (ap-southeast-1)',
  enableKeyRotation: true,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  policy: new iam.PolicyDocument({
    statements: [
      // Key admin — marketplace-prod account root
      new iam.PolicyStatement({
        principals: [new iam.AccountRootPrincipal()],
        actions: ['kms:*'],
        resources: ['*'],
      }),
      // Cross-account: allow management account to use key for snapshot sharing
      new iam.PolicyStatement({
        sid: 'AllowManagementAccountSnapshotShare',
        principals: [new iam.AccountPrincipal('123456789012')],
        actions: ['kms:DescribeKey', 'kms:ReEncrypt*', 'kms:CreateGrant'],
        resources: ['*'],
      }),
    ],
  }),
});

// Enforce EBS encryption by default (escape hatch — no CDK L2 for this)
new cdk.CfnCustomResource(this, 'EbsEncryptionByDefault', {
  serviceToken: enableEbsEncryptionLambda.functionArn,
});
// In practice, run: aws ec2 enable-ebs-encryption-by-default --region ap-southeast-1`,
            },
        ],
    },

    {
        id: 4,
        analogy: "Think of it like a shared office printer on a network — any desk in any room of the building can send documents to it simultaneously, unlike a USB printer that only one computer can use at a time, and each department gets their own private tray so their printouts don't mix.",
        icon: "📂",
        color: ACCENT.orange,
        tag: "SCENARIO 4",
        title: "EFS — Shared File System",
        subtitle: "Multi-AZ shared writable directory for the marketplace report generator",
        useCase: {
            title: "AMI PVT LTD Marketplace — EFS shared mount for report generator across ap-southeast-1a and ap-southeast-1b",
            story: "The marketplace report generator tool is a Spring Boot service that needs multiple EC2 instances (in both ap-southeast-1a and ap-southeast-1b private subnets of marketplace-vpc) to read and write a shared /reports directory simultaneously. EBS cannot satisfy this because an EBS volume can only be attached to one instance at a time (except io1/io2 multi-attach which is limited and does not support concurrent writes with standard filesystems). AMI PVT LTD creates an EFS file system marketplace-reports-efs with one mount target per AZ, accessible over NFS port 2049 from the private subnets. An EFS Access Point /reports/tenant enforces a POSIX UID 1001 / GID 1001 for the marketplace report generator process, ensuring path isolation between the tool and any future tenants sharing the same EFS.",
            diagram: [
                { actor: "EC2 instance (ap-southeast-1a, private subnet 10.0.10.0/24)", icon: "🖥️" },
                { arrow: "NFS mount: marketplace-reports-efs mount target 1a (port 2049)" },
                { actor: "marketplace-reports-efs (EFS — multi-AZ, fully managed NFS)", icon: "📂" },
                { arrow: "NFS mount: marketplace-reports-efs mount target 1b (port 2049)" },
                { actor: "EC2 instance (ap-southeast-1b, private subnet 10.0.11.0/24)", icon: "🖥️" },
            ],
        },
        buildSystem: [
            "Create EFS file system: aws efs create-file-system --performance-mode generalPurpose --throughput-mode bursting --encrypted",
            "Tag the file system with Name=marketplace-reports-efs, Service=report-generator, Environment=prod",
            "Create a mount target in private subnet ap-southeast-1a: aws efs create-mount-target --file-system-id fs-0abc123 --subnet-id subnet-private1a --security-groups sg-efs-mount",
            "Create a mount target in private subnet ap-southeast-1b: aws efs create-mount-target --file-system-id fs-0abc123 --subnet-id subnet-private1b --security-groups sg-efs-mount",
            "Create security group sg-efs-mount allowing TCP 2049 inbound from the EC2 security group (marketplace-api-sg)",
            "Create an EFS Access Point for the report generator with root directory /reports/tenant, POSIX UID 1001, GID 1001, and permissions 755",
            "Mount EFS on each EC2 instance using the EFS mount helper: mount -t efs -o tls,accesspoint=fsap-0abc123 fs-0abc123:/ /mnt/reports",
            "Add the EFS mount to /etc/fstab using the amazon-efs-utils package for automatic remount after instance reboot",
        ],
        flow: ["EFS File System (marketplace-reports-efs)", "Mount Targets (1a + 1b)", "NFS Mount (port 2049)", "EFS Access Point (POSIX UID 1001)", "Shared /reports Directory"],
        examTips: [
            "EFS provides a POSIX-compliant shared NFS file system mountable by thousands of concurrent EC2 instances across multiple AZs — EBS is single-instance only",
            "EFS mount targets are per-AZ; create one in every AZ where your EC2 instances run to avoid cross-AZ data transfer charges",
            "EFS Access Points enforce a specific root directory, POSIX UID/GID, and file permissions — use them to isolate different application paths on the same EFS",
            "EFS uses NFS v4.1 over TLS (using the amazon-efs-utils mount helper with the tls option) for encryption in transit",
            "EFS Standard stores data across a minimum of 3 AZs; EFS One Zone stores in a single AZ at lower cost (good for dev/test or tolerant workloads)",
        ],
        roleJson: [
            {
                label: "AWS CLI — create marketplace-reports-efs with mount targets and access point",
                note: "💡 The EFS Access Point root directory is created automatically if it does not exist, applying the configured permissions.",
                code: `# Create the EFS file system
aws efs create-file-system \\
  --performance-mode generalPurpose \\
  --throughput-mode bursting \\
  --encrypted \\
  --kms-key-id alias/marketplace-ebs-key \\
  --tags Key=Name,Value=marketplace-reports-efs Key=Service,Value=report-generator

# Create mount targets in each private subnet AZ
aws efs create-mount-target \\
  --file-system-id fs-0abc123marketplace \\
  --subnet-id subnet-private1a \\
  --security-groups sg-0efs123mount

aws efs create-mount-target \\
  --file-system-id fs-0abc123marketplace \\
  --subnet-id subnet-private1b \\
  --security-groups sg-0efs123mount

# Create EFS Access Point — enforces POSIX UID 1001 for the report generator
aws efs create-access-point \\
  --file-system-id fs-0abc123marketplace \\
  --root-directory '{
    "Path": "/reports/tenant",
    "CreationInfo": {
      "OwnerUid": 1001,
      "OwnerGid": 1001,
      "Permissions": "755"
    }
  }' \\
  --posix-user '{"Uid": 1001, "Gid": 1001}' \\
  --tags Key=Name,Value=marketplace-reports-ap

# Mount on EC2 using amazon-efs-utils (add to /etc/fstab for persistence)
sudo mount -t efs -o tls,accesspoint=fsap-0abc123marketplace \\
  fs-0abc123marketplace:/ /mnt/reports`,
            },
        ],
        cdkCode: [
            {
                label: "AWS CDK v2 — EFS file system (marketplace-reports-efs) with mount targets and access point",
                note: "💡 CDK's efs.FileSystem automatically creates one mount target per AZ in the provided VPC. Add an AccessPoint for POSIX UID/GID enforcement.",
                code: `import * as efs from 'aws-cdk-lib/aws-efs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';

const ebsKey = kms.Key.fromLookup(this, 'MarketplaceEbsKey', {
  aliasName: 'alias/marketplace-ebs-key',
});

const efsMountSg = new ec2.SecurityGroup(this, 'EfsMountSg', {
  vpc: marketplaceVpc,
  securityGroupName: 'sg-efs-mount',
  description: 'Allow NFS from marketplace-api-sg',
});
efsMountSg.addIngressRule(marketplaceApiSg, ec2.Port.tcp(2049), 'NFS from marketplace-api-sg');

const reportsEfs = new efs.FileSystem(this, 'MarketplaceReportsEfs', {
  fileSystemName: 'marketplace-reports-efs',
  vpc: marketplaceVpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroup: efsMountSg,
  performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
  throughputMode: efs.ThroughputMode.BURSTING,
  encrypted: true,
  kmsKey: ebsKey,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// EFS Access Point — POSIX UID 1001 for the report generator process
const reportsAccessPoint = reportsEfs.addAccessPoint('ReportsAccessPoint', {
  path: '/reports/tenant',
  createAcl: {
    ownerUid: '1001',
    ownerGid: '1001',
    permissions: '755',
  },
  posixUser: {
    uid: '1001',
    gid: '1001',
  },
});`,
            },
        ],
    },

    {
        id: 5,
        analogy: "Think of it like a water tap — a normal tap (bursting) gives you steady flow and lets you open it wide for a short burst, but if your restaurant needs guaranteed high-pressure water all day long, you pay for a dedicated pressurised pipe (provisioned throughput) that never slows down regardless of demand.",
        icon: "📊",
        color: ACCENT.purple,
        tag: "SCENARIO 5",
        title: "EFS Performance Modes",
        subtitle: "General Purpose vs Max I/O and Bursting vs Provisioned Throughput",
        useCase: {
            title: "AMI PVT LTD Marketplace — analytics dashboard on Max I/O, API workloads on General Purpose EFS",
            story: "AMI PVT LTD runs two EFS workloads. The high-concurrency marketplace analytics dashboard aggregates data from thousands of concurrent Lambda and EC2 readers simultaneously — it uses EFS Max I/O performance mode to scale IOPS virtually without limit (at a slight increase in per-operation latency). The standard marketplace-reports-efs file system uses General Purpose performance mode, which delivers the lowest latency per file operation and is suitable for the hundreds (not thousands) of concurrent connections from the report generator EC2 fleet. For throughput, the analytics EFS uses Provisioned Throughput (500 MiB/s guaranteed) because the dashboard's large sequential reads would exhaust the Bursting credit bucket. The report generator EFS uses Bursting Throughput, which provides a baseline of 50 KiB/s per GiB stored and burst credits for occasional spikes.",
            diagram: [
                { actor: "marketplace-analytics-efs (Max I/O, Provisioned 500 MiB/s)", icon: "📊" },
                { arrow: "thousands of concurrent readers — analytics Lambda + EC2" },
                { actor: "Analytics Dashboard Lambda Functions & EC2", icon: "⚡" },
                { arrow: "hundreds of concurrent connections — report generator EC2" },
                { actor: "marketplace-reports-efs (General Purpose, Bursting Throughput)", icon: "📂" },
            ],
        },
        buildSystem: [
            "Create marketplace-analytics-efs with performance-mode maxIO for the high-concurrency analytics workload",
            "Set throughput mode to provisioned with --provisioned-throughput-in-mibps 500 on marketplace-analytics-efs",
            "Create marketplace-reports-efs with performance-mode generalPurpose and throughput mode bursting (default)",
            "Monitor BurstCreditBalance metric in CloudWatch for marketplace-reports-efs; if it trends toward zero, switch to Provisioned Throughput",
            "Monitor PercentIOLimit for General Purpose EFS; if it reaches 100% consistently, migrate to Max I/O mode",
            "Note: once you set Max I/O, it cannot be changed back — create a new EFS file system and migrate data using AWS DataSync if needed",
            "Use Amazon CloudWatch metric PermittedThroughput to track the throughput limit for Bursting mode file systems",
            "Set a CloudWatch alarm on BurstCreditBalance < 1,000,000,000 (1 GiB) to get early warning before bursting capacity is exhausted",
        ],
        flow: ["EFS Performance Mode Selection", "General Purpose (low latency)", "Max I/O (high concurrency)", "Bursting Throughput (credit-based)", "Provisioned Throughput (guaranteed)"],
        examTips: [
            "Max I/O performance mode scales to higher aggregate throughput and IOPS than General Purpose, but has slightly higher per-operation latency — use for big data and media workloads",
            "General Purpose is the default and best for latency-sensitive workloads with fewer than a few thousand concurrent connections",
            "Bursting Throughput baseline is 50 KiB/s per GiB stored (minimum 1 MiB/s); burst rate is 100 MiB/s (up to 1 GiB/s for larger file systems)",
            "Provisioned Throughput charges you for the throughput you provision above what Bursting mode would provide based on file system size",
            "EFS Intelligent-Tiering automatically moves files between EFS Standard and EFS Standard-IA (infrequent access) tiers based on access patterns",
        ],
        roleJson: [
            {
                label: "AWS CLI — create Max I/O EFS with Provisioned Throughput for analytics dashboard",
                note: "💡 Provisioned Throughput is billed per MiB/s per month — only provision what the workload actually needs.",
                code: `# Create analytics EFS with Max I/O and Provisioned Throughput
aws efs create-file-system \\
  --performance-mode maxIO \\
  --throughput-mode provisioned \\
  --provisioned-throughput-in-mibps 500 \\
  --encrypted \\
  --kms-key-id alias/marketplace-ebs-key \\
  --tags Key=Name,Value=marketplace-analytics-efs Key=Service,Value=analytics-dashboard

# Create standard EFS with General Purpose and Bursting Throughput (default)
aws efs create-file-system \\
  --performance-mode generalPurpose \\
  --throughput-mode bursting \\
  --encrypted \\
  --kms-key-id alias/marketplace-ebs-key \\
  --tags Key=Name,Value=marketplace-reports-efs Key=Service,Value=report-generator

# CloudWatch alarm — alert when burst credits are running low
aws cloudwatch put-metric-alarm \\
  --alarm-name marketplace-efs-burst-credit-low \\
  --metric-name BurstCreditBalance \\
  --namespace AWS/EFS \\
  --dimensions Name=FileSystemId,Value=fs-0abc123marketplace \\
  --period 300 \\
  --statistic Average \\
  --comparison-operator LessThanThreshold \\
  --threshold 1073741824 \\
  --evaluation-periods 2 \\
  --alarm-actions arn:aws:sns:ap-southeast-1:234567890123:marketplace-ops-alerts`,
            },
        ],
        cdkCode: [
            {
                label: "CDK — EFS file systems with Max I/O + Provisioned and General Purpose + Bursting",
                note: "PerformanceMode.MAX_IO with ThroughputMode.PROVISIONED for analytics (500 MiB/s). PerformanceMode.GENERAL_PURPOSE with ThroughputMode.BURSTING for reports. Note: Max I/O cannot be changed after creation.",
                code: `import * as efs from 'aws-cdk-lib/aws-efs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';

const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcName: 'marketplace-vpc' });
const efsKey = kms.Key.fromAlias(this, 'EfsKey', 'alias/marketplace-ebs-key');

// Analytics EFS — Max I/O + Provisioned 500 MiB/s for high-concurrency dashboard
const analyticsEfs = new efs.FileSystem(this, 'AnalyticsEfs', {
  fileSystemName: 'marketplace-analytics-efs',
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  encrypted: true,
  kmsKey: efsKey,
  performanceMode: efs.PerformanceMode.MAX_IO,
  throughputMode: efs.ThroughputMode.PROVISIONED,
  provisionedThroughputPerSecond: cdk.Size.mebibytes(500),
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// Reports EFS — General Purpose + Bursting (default, free, credit-based)
const reportsEfs = new efs.FileSystem(this, 'ReportsEfs', {
  fileSystemName: 'marketplace-reports-efs',
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  encrypted: true,
  kmsKey: efsKey,
  performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
  throughputMode: efs.ThroughputMode.BURSTING,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});`,
            },
        ],
    },

    {
        id: 6,
        analogy: "Think of it like a whiteboard in a meeting room — it's the fastest way to scribble and read information during the meeting, but the moment everyone leaves and the room is cleaned (instance stops or terminates), everything on it is gone forever, so anything important must be copied to a notebook (DynamoDB) before the meeting ends.",
        icon: "⚡",
        color: ACCENT.green,
        tag: "SCENARIO 6",
        title: "Instance Store",
        subtitle: "NVMe ephemeral storage for ultra-low latency caching on i3 instances",
        useCase: {
            title: "AMI PVT LTD Marketplace — i3 instance NVMe instance store for the in-memory caching layer",
            story: "AMI PVT LTD's marketplace caching layer uses EC2 i3.2xlarge instances with NVMe instance store volumes (1.9 TiB per instance) for an ultra-low latency local scratch tier — a cost-effective alternative to running a separate ElastiCache cluster for large ephemeral datasets. The caching layer holds pre-computed marketplace catalogue pages, session tokens, and recommendation scores that can be rebuilt from DynamoDB if lost. Instance store delivers sub-millisecond I/O latency and hundreds of thousands of IOPS at no additional cost (included in the instance price). The critical trade-off: instance store data is permanently lost if the instance is stopped, terminated, or fails — it does not survive across start/stop cycles unlike EBS. AMI PVT LTD therefore runs the caching layer with warm-up jobs that repopulate the store from DynamoDB on every new instance launch.",
            diagram: [
                { actor: "marketplace-api-asg (Spring Boot) / Lambda order processor", icon: "🖥️" },
                { arrow: "cache read/write (microsecond latency, high IOPS)" },
                { actor: "i3.2xlarge EC2 — NVMe Instance Store (1.9 TiB, ephemeral)", icon: "⚡" },
                { arrow: "cache miss / instance launch: warm-up from DynamoDB" },
                { actor: "DynamoDB marketplace-catalogue-table (persistent source of truth)", icon: "🗄️" },
            ],
        },
        buildSystem: [
            "Launch i3.2xlarge instances for the caching layer — these provide 1x 1.9 TiB NVMe instance store at no extra cost",
            "Format the NVMe instance store on first launch: lsblk → mkfs.xfs /dev/nvme0n1 → mount /dev/nvme0n1 /mnt/cache",
            "Add an EC2 user-data script that formats and mounts the instance store on every launch (instance store is not persisted across stops)",
            "After mount, run the cache warm-up job that reads from DynamoDB and populates /mnt/cache with serialised catalogue data",
            "Configure the caching service to serve reads from /mnt/cache and fall back to DynamoDB on a cache miss",
            "Tag the i3 instances with Service=marketplace-cache, InstanceStoreEphemeral=true to flag them in monitoring",
            "Set a CloudWatch alarm on StatusCheckFailed_Instance for the i3 fleet — a failed instance means all local cache is lost",
            "Document the RTO: cache warm-up from DynamoDB takes ~3 minutes; during warm-up, all requests fall through to DynamoDB (higher latency but no data loss)",
        ],
        flow: ["i3 Instance Launch", "Format NVMe (ephemeral)", "Warm-Up from DynamoDB", "Serve from Instance Store Cache", "Instance Stop/Terminate → Cache Lost"],
        examTips: [
            "Instance store is physically attached to the host server — data is lost on stop, termination, or hardware failure; EBS persists across all three",
            "Instance store provides the highest possible IOPS and lowest latency because there is no network path — I/O goes directly to local NVMe",
            "Instance store is included in the instance hourly price; provisioned IOPS EBS volumes incur a separate per-IOPS charge",
            "You cannot attach or detach instance store volumes — they are fixed to the instance type; EBS volumes can be detached and re-attached",
            "Instance store volumes are not automatically encrypted by default; use OS-level encryption (LUKS/dm-crypt) for data-at-rest protection",
        ],
        roleJson: [
            {
                label: "EC2 user-data — format NVMe instance store and run cache warm-up on launch",
                note: "💡 Always format and mount instance store in user-data because the device is blank on every new instance launch.",
                code: `#!/bin/bash
# --- marketplace-cache instance store bootstrap ---

# Identify the NVMe instance store device
DEVICE=$(lsblk -dpno NAME,TYPE | awk '$2=="disk" && /nvme/ {print $1}' | head -1)

# Format and mount
mkfs.xfs -f $DEVICE
mkdir -p /mnt/cache
mount $DEVICE /mnt/cache
chmod 755 /mnt/cache

echo "$DEVICE /mnt/cache xfs defaults,noatime 0 0" >> /etc/fstab

# Run cache warm-up from DynamoDB (marketplace-catalogue-table)
# This script reads popular catalogue items and serialises them to /mnt/cache
aws dynamodb scan \\
  --table-name marketplace-catalogue-table \\
  --region ap-southeast-1 \\
  --filter-expression "popularity > :p" \\
  --expression-attribute-values '{":p":{"N":"100"}}' \\
  --output json > /mnt/cache/catalogue-warm.json

echo "Instance store cache warm-up complete at $(date)" >> /var/log/marketplace-cache-init.log`,
            },
        ],
        cdkCode: [
            {
                label: "CDK — i3.2xlarge ASG with UserData that formats NVMe instance store on launch",
                note: "Instance store cannot be provisioned in CDK — it is physically attached based on instance type. The key CDK work is the Launch Template with UserData that formats, mounts, and warms up the NVMe device on every new instance launch.",
                code: `import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as iam from 'aws-cdk-lib/aws-iam';

const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcName: 'marketplace-vpc' });

const cacheRole = new iam.Role(this, 'CacheInstanceRole', {
  assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
    iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
  ],
});
cacheRole.addToPolicy(new iam.PolicyStatement({
  actions: ['dynamodb:Scan', 'dynamodb:GetItem'],
  resources: ['arn:aws:dynamodb:ap-southeast-1:234567890123:table/marketplace-catalogue-table'],
}));

const userData = ec2.UserData.forLinux();
userData.addCommands(
  'DEVICE=$(lsblk -dpno NAME,TYPE | awk \'$2=="disk" && /nvme/ {print $1}\' | head -1)',
  'mkfs.xfs -f $DEVICE',
  'mkdir -p /mnt/cache && mount $DEVICE /mnt/cache && chmod 755 /mnt/cache',
  'echo "$DEVICE /mnt/cache xfs defaults,noatime 0 0" >> /etc/fstab',
  'aws dynamodb scan --table-name marketplace-catalogue-table --region ap-southeast-1 --output json > /mnt/cache/catalogue-warm.json',
);

const cacheAsg = new autoscaling.AutoScalingGroup(this, 'CacheAsg', {
  vpc,
  instanceType: new ec2.InstanceType('i3.2xlarge'),  // 1x 1.9 TiB NVMe instance store included
  machineImage: ec2.MachineImage.genericLinux({ 'ap-southeast-1': 'ami-0abc123marketplaceapi' }),
  role: cacheRole,
  userData,
  minCapacity: 2,
  maxCapacity: 6,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
});`,
            },
        ],
    },
];

export default scenarios;
