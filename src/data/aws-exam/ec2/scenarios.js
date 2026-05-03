import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform EC2 / AMI scenarios
 *
 * Source study topic: Amazon EC2, with AMI-specific notes adapted from
 * Digital Cloud Training's Amazon EC2 cheat sheet.
 */

const scenarios = [
    {
        id: 1,
        analogy: "Think of it like a master key mould kept in a locksmith's safe — every new key for the building is cut from the same tested mould, so all copies are identical and no one has to measure and cut from scratch each time.",
        icon: "🖥️",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "Golden AMI",
        subtitle: "Standardized Spring Boot EC2 image",
        useCase: {
            title: "AMI PVT LTD Marketplace — building a reusable Spring Boot API server image",
            story: "AMI PVT LTD runs several Java Spring Boot APIs on EC2. Instead of configuring each server by hand, the platform team creates a golden AMI that contains Amazon Linux, the Java runtime, CloudWatch Agent, SSM Agent, common hardening settings, and the bootstrap folders used by deployments. New EC2 instances launch from this AMI so every API server starts from the same tested baseline.",
            diagram: [
                { actor: "Base EC2 Builder", icon: "🏗️" },
                { arrow: "install Java, agents, hardening" },
                { actor: "Create AMI", icon: "💿" },
                { arrow: "launch template references" },
                { actor: "Marketplace API EC2 Fleet", icon: "🖥️" },
            ],
        },
        buildSystem: [
            "Launch a temporary EC2 builder instance from Amazon Linux 2023",
            "Install Java, CloudWatch Agent, SSM Agent, security patches, and the Marketplace deployment folder structure",
            "Do not store AWS access keys, customer data, or environment secrets inside the AMI",
            "Create an AMI named 'marketplace-api-golden-ami-v1'",
            "Create a Launch Template that references the AMI ID and the 'Marketplace-API-EC2-Role' instance profile",
            "Use Auto Scaling Groups to launch API servers from the Launch Template",
            "Patch and rebuild the golden AMI regularly, then update the Launch Template version",
        ],
        flow: ["Builder EC2", "Create AMI", "Launch Template", "Auto Scaling Group", "API Instances"],
        examTips: [
            "An AMI contains the root-volume template, launch permissions, and block-device mapping",
            "AMIs are used to launch EC2 instances with a known operating system and software baseline",
            "Never bake credentials into an AMI; use IAM roles and instance profiles for runtime access",
            "Use Launch Templates to version AMI updates cleanly for Auto Scaling Groups",
        ],
        roleJson: [
            {
                label: "Launch Template excerpt — golden AMI with instance profile",
                note: "The AMI provides the server image; the IAM instance profile provides temporary credentials at runtime.",
                code: `{
  "LaunchTemplateName": "marketplace-api-template",
  "LaunchTemplateData": {
    "ImageId": "ami-0abc123marketplaceapi",
    "InstanceType": "t3.medium",
    "IamInstanceProfile": {
      "Name": "Marketplace-API-EC2-InstanceProfile"
    },
    "SecurityGroupIds": ["sg-0123marketplaceapi"],
    "MetadataOptions": {
      "HttpTokens": "required"
    }
  }
}`,
            },
        ],
    },

    {
        id: 2,
        analogy: "Think of it like photocopying an important document at your main office and filing a copy in each branch — if the head office burns down, every branch already has a ready-to-use duplicate and operations can continue without delay.",
        icon: "🌏",
        color: ACCENT.teal,
        tag: "SCENARIO 2",
        title: "Regional AMI Copy",
        subtitle: "Disaster recovery across AWS Regions",
        useCase: {
            title: "AMI PVT LTD Marketplace — copying an API server AMI from Singapore to Mumbai",
            story: "The production marketplace runs in ap-southeast-1, but the DR plan requires the platform to recover in ap-south-1. Because AMIs are regional, the EC2 image created in Singapore cannot be launched directly in Mumbai. AMI PVT LTD copies the golden AMI to the DR Region, validates the copied AMI, and stores the new regional AMI ID in the DR Launch Template.",
            diagram: [
                { actor: "AMI in ap-southeast-1", icon: "💿" },
                { arrow: "copy AMI" },
                { actor: "AMI in ap-south-1", icon: "🌏" },
                { arrow: "DR launch template" },
                { actor: "Recovery EC2 Fleet", icon: "🖥️" },
            ],
        },
        buildSystem: [
            "Create or select the tested golden AMI in the primary Region",
            "Copy the AMI to the DR Region using the EC2 console, CLI, or API",
            "If encrypted EBS snapshots are used, make sure the destination KMS key policy allows the copy and launch path",
            "Record the destination Region AMI ID; it will be different from the source AMI ID",
            "Update the DR Launch Template to reference the copied AMI ID",
            "Run a test launch in the DR VPC and verify SSM, CloudWatch logs, and application health checks",
        ],
        flow: ["Primary AMI", "Copy AMI", "DR Region AMI", "DR Launch Template", "Test Launch"],
        examTips: [
            "AMIs are regional; launch an AMI only from the Region where it is stored",
            "Copying an AMI creates a separate AMI ID in the destination Region",
            "EBS-backed AMIs use EBS snapshots as the source for the root and data volumes",
            "For encrypted AMIs, remember KMS permissions in the destination Region",
        ],
        roleJson: [
            {
                label: "CLI example — copy AMI to a DR Region",
                note: "The copied AMI must be referenced by its new destination Region AMI ID.",
                code: `aws ec2 copy-image \\
  --source-region ap-southeast-1 \\
  --source-image-id ami-0abc123marketplaceapi \\
  --region ap-south-1 \\
  --name marketplace-api-golden-ami-v1-dr`,
            },
        ],
    },

    {
        id: 3,
        analogy: "Think of it like a film studio lending a licensed DVD master to a specific cinema chain — the studio retains ownership, the cinema can play it for their audience, and when the contract ends the studio simply revokes the lending agreement.",
        icon: "🤝",
        color: ACCENT.amber,
        tag: "SCENARIO 3",
        title: "AMI Launch Permissions",
        subtitle: "Share a customer deployment image safely",
        useCase: {
            title: "AMI PVT LTD Marketplace — sharing a hardened analytics-tool AMI with one customer account",
            story: "Some marketplace products are delivered as prebuilt EC2 appliances. AMI PVT LTD creates a hardened AMI for the analytics tool and shares it only with the subscribing customer's AWS account. The customer can launch instances from the AMI, but the AMI remains controlled by AMI PVT LTD until the product subscription ends.",
            diagram: [
                { actor: "Marketplace AMI Owner", icon: "🏢" },
                { arrow: "grant launch permission" },
                { actor: "Customer AWS Account", icon: "🤝" },
                { arrow: "launches" },
                { actor: "Analytics EC2 Appliance", icon: "📊" },
            ],
        },
        buildSystem: [
            "Create the hardened analytics-tool AMI in the Marketplace AWS account",
            "Grant launch permission to the customer's AWS account ID",
            "Share any required encrypted snapshot access and KMS key permissions if the AMI uses encrypted EBS volumes",
            "Customer launches the EC2 appliance from the shared AMI in the same Region",
            "Remove the launch permission when the customer cancels the subscription",
            "Track shared AMI permissions as part of the marketplace entitlement lifecycle",
        ],
        flow: ["Owner AMI", "Launch Permission", "Customer Account", "EC2 Appliance"],
        examTips: [
            "AMI launch permissions control which AWS accounts can use an AMI to launch instances",
            "Launch permission is Region-specific because the AMI itself is Region-specific",
            "Encrypted AMIs also require snapshot and KMS access to be usable by another account",
            "Sharing an AMI is not the same as sharing live EC2 instances",
        ],
        roleJson: [
            {
                label: "CLI example — add launch permission for one customer account",
                note: "Use remove-launch-permission during offboarding or subscription cancellation.",
                code: `aws ec2 modify-image-attribute \\
  --image-id ami-0def456analyticstool \\
  --launch-permission "Add=[{UserId=111122223333}]"`,
            },
        ],
    },

    {
        id: 4,
        analogy: "Think of it like a furniture delivery order that lists exactly which items come with a new apartment — the sofa (root volume) arrives with every tenant, and a filing cabinet (data volume) is added for tenants who need extra storage, specified in advance on the order form.",
        icon: "💾",
        color: ACCENT.green,
        tag: "SCENARIO 4",
        title: "Block Device Mapping",
        subtitle: "Root and data volumes from an AMI",
        useCase: {
            title: "AMI PVT LTD Marketplace — controlling root and data volumes for a reporting server",
            story: "The reporting server AMI needs a small encrypted root volume for the operating system and a larger encrypted EBS data volume for report caches. The AMI block-device mapping defines which volumes are attached when EC2 launches. The team avoids storing critical report data on instance store because instance store is ephemeral and can be lost when the instance is stopped or terminated.",
            diagram: [
                { actor: "Reporting AMI", icon: "💿" },
                { arrow: "block-device mapping" },
                { actor: "Root EBS + Data EBS", icon: "💾" },
                { arrow: "attached at launch" },
                { actor: "Reporting EC2", icon: "📈" },
            ],
        },
        buildSystem: [
            "Define the AMI root volume as encrypted EBS with the approved KMS key",
            "Add an encrypted EBS data volume for report cache and application working files",
            "Use DeleteOnTermination intentionally: true for disposable cache volumes, false for data that must survive termination",
            "Avoid instance store for durable application data because instance store is ephemeral",
            "Test stop/start behavior and verify the EBS data volume persists as expected",
        ],
        flow: ["AMI", "Block Device Mapping", "EBS Root", "EBS Data Volume", "EC2 Launch"],
        examTips: [
            "Block-device mapping specifies the volumes attached when an instance launches",
            "EBS provides persistent storage; EBS snapshots stored in S3 back EBS volumes",
            "Instance store is non-persistent; do not use it for durable business data",
            "Root EBS volumes can be encrypted at launch",
        ],
        roleJson: [
            {
                label: "Launch Template excerpt — encrypted EBS mappings",
                note: "The device names vary by AMI and instance type; check the AMI's expected root device name.",
                code: `{
  "BlockDeviceMappings": [
    {
      "DeviceName": "/dev/xvda",
      "Ebs": {
        "VolumeSize": 30,
        "VolumeType": "gp3",
        "Encrypted": true,
        "DeleteOnTermination": true
      }
    },
    {
      "DeviceName": "/dev/sdf",
      "Ebs": {
        "VolumeSize": 100,
        "VolumeType": "gp3",
        "Encrypted": true,
        "DeleteOnTermination": false
      }
    }
  ]
}`,
            },
        ],
    },

    {
        id: 5,
        analogy: "Think of it like a hire car that comes with a standard setup, but you leave a note on the seat with personalised instructions — 'tune the radio to Jazz FM, set AC to 22°C' — so the same model car feels right for you the moment you start driving.",
        icon: "🧾",
        color: ACCENT.purple,
        tag: "SCENARIO 5",
        title: "User Data & Metadata",
        subtitle: "Runtime config without rebuilding the AMI",
        useCase: {
            title: "AMI PVT LTD Marketplace — using one AMI for dev, staging, and production",
            story: "The marketplace API uses the same golden AMI in every environment. Environment-specific setup is handled by EC2 user data at launch, such as selecting the Spring profile and fetching configuration from SSM Parameter Store. The application reads instance metadata only from inside the instance when it needs details such as instance ID, Region, or attached role credentials.",
            diagram: [
                { actor: "Golden AMI", icon: "💿" },
                { arrow: "launch with user data" },
                { actor: "EC2 Instance", icon: "🖥️" },
                { arrow: "reads metadata locally" },
                { actor: "Configured API Runtime", icon: "⚙️" },
            ],
        },
        buildSystem: [
            "Keep the AMI generic and environment-neutral",
            "Pass environment-specific bootstrap commands through EC2 user data during launch",
            "Limit user data to non-secret bootstrap logic; fetch secrets from managed services such as Secrets Manager or SSM Parameter Store",
            "Require IMDSv2 in the Launch Template metadata options",
            "Use instance metadata only from inside the EC2 instance at 169.254.169.254",
            "If the user data script changes later, stop the instance before modifying user data",
        ],
        flow: ["Golden AMI", "User Data", "IMDSv2", "SSM Parameters", "Running API"],
        examTips: [
            "User data is supplied at launch as a script and is limited in size",
            "Instance metadata is available from the link-local address 169.254.169.254",
            "User data and metadata are not encrypted, so do not place secrets there",
            "User data is one of the EC2 attributes that can be modified only when the instance is stopped",
        ],
        roleJson: [
            {
                label: "User data example — environment bootstrap",
                note: "Use user data for bootstrap logic, not long-lived credentials or customer secrets.",
                code: `#!/bin/bash
set -euo pipefail

ENVIRONMENT="prod"
APP_DIR="/opt/marketplace-api"

aws ssm get-parameter \\
  --name "/marketplace/$ENVIRONMENT/api-config" \\
  --with-decryption \\
  --query "Parameter.Value" \\
  --output text > "$APP_DIR/application-prod.yml"

systemctl enable marketplace-api
systemctl start marketplace-api`,
            },
        ],
    },

    {
        id: 6,
        analogy: "Think of it like hiring the right vehicle for each job — you would not deliver letters in a 40-tonne lorry or move house in a bicycle; a van fits general errands, a refrigerated truck fits food transport, and a sports car fits speed.",
        icon: "⚙️",
        color: ACCENT.orange,
        tag: "SCENARIO 6",
        title: "Instance Type Selection",
        subtitle: "Map workload shape to EC2 family",
        useCase: {
            title: "AMI PVT LTD Marketplace — choosing instance families for mixed workloads",
            story: "AMI PVT LTD runs several compute patterns: Spring Boot APIs, CPU-heavy report generation, in-memory leaderboard analytics, GPU-assisted media processing, and storage-heavy log indexing. The architecture team maps each workload to the EC2 instance family that fits the CPU, memory, storage, network, and accelerator profile instead of defaulting everything to one general-purpose family.",
            diagram: [
                { actor: "Workload Profile", icon: "📋" },
                { arrow: "match CPU / memory / I/O" },
                { actor: "EC2 Instance Family", icon: "⚙️" },
                { arrow: "launch from AMI" },
                { actor: "Right-sized Fleet", icon: "🖥️" },
            ],
        },
        buildSystem: [
            "Use General Purpose instances for balanced API servers and small admin tools",
            "Use Compute Optimized instances for CPU-bound report rendering and batch workers",
            "Use Memory Optimized instances for leaderboards, cache-heavy workloads, and in-memory analytics",
            "Use Accelerated Computing instances for GPU, ML inference, video, graphics, or FPGA-style workloads",
            "Use Storage Optimized instances for high random I/O, high sequential throughput, and local NVMe workloads",
            "Load test before committing to Reserved Instances or capacity reservations",
        ],
        flow: ["Workload", "Instance Family", "AMI", "Launch Template", "Fleet"],
        examTips: [
            "Instance types combine CPU, memory, storage, and networking capacity",
            "General Purpose balances compute, memory, and networking",
            "Compute Optimized is for compute-bound applications",
            "Storage Optimized targets low-latency local storage, high IOPS, and high sequential throughput",
        ],
    },

    {
        id: 7,
        analogy: "Think of it like booking a hotel — you can pay full price per night with no commitment (On-Demand), grab a last-minute deal that the hotel can cancel if a better guest arrives (Spot), pre-pay for a year at a discount (Reserved), or rent an entire private floor for compliance reasons (Dedicated Host).",
        icon: "💸",
        color: ACCENT.pink,
        tag: "SCENARIO 7",
        title: "Billing & Provisioning",
        subtitle: "On-Demand, Spot, Reserved, Dedicated",
        useCase: {
            title: "AMI PVT LTD Marketplace — selecting EC2 purchase options per environment",
            story: "The marketplace team uses On-Demand EC2 for dev/test and unpredictable traffic, Spot for stateless background workers, Reserved Instances for steady API capacity, and Dedicated Hosts only when customer licensing or compliance requires physical-host control. Each purchase model is tied to the workload's interruption tolerance and predictability.",
            diagram: [
                { actor: "Cost / Availability Need", icon: "💸" },
                { arrow: "choose purchase model" },
                { actor: "On-Demand / Spot / RI / Dedicated", icon: "🧾" },
                { arrow: "run workload" },
                { actor: "Optimized Spend", icon: "📉" },
            ],
        },
        buildSystem: [
            "Run dev/test and unpredictable marketplace services on On-Demand",
            "Run stateless queue workers and batch jobs on Spot with retry and interruption handling",
            "Use Reserved Instances for steady baseline API capacity over 1-year or 3-year terms",
            "Use Zonal RIs or On-Demand Capacity Reservations when capacity in a specific AZ matters",
            "Use Dedicated Hosts for server-bound licenses or strict compliance isolation",
            "Track running, stopped, and Elastic IP resources to avoid surprise charges",
        ],
        flow: ["Workload Pattern", "Pricing Model", "Capacity Plan", "Cost Control"],
        examTips: [
            "Spot can be heavily discounted but may receive a two-minute interruption notice",
            "Reserved Instances are for steady, predictable usage and terms of 1 or 3 years",
            "Dedicated Hosts expose host-level controls useful for per-core or per-socket licenses",
            "Instances are billed while running; stop or terminate to avoid compute charges",
        ],
    },

    {
        id: 8,
        analogy: "Think of it like a building's phone system — each office has an internal extension (private IP), the reception desk has a public phone number (public IP), and the CEO gets a dedicated direct-dial line that never changes even if they move desk (Elastic IP).",
        icon: "🌐",
        color: ACCENT.teal,
        tag: "SCENARIO 8",
        title: "IP Addresses & ENI",
        subtitle: "Public, private, Elastic IP, ENI design",
        useCase: {
            title: "AMI PVT LTD Marketplace — stable network identities for API and failover servers",
            story: "The public API servers receive traffic through a load balancer, while admin and failover nodes use private IP addresses. When AMI PVT LTD needs a static public endpoint for a legacy customer integration, it uses an Elastic IP. For failover patterns, the team attaches a secondary ENI or reassigns a private IP to move traffic to a standby instance in the same Availability Zone.",
            diagram: [
                { actor: "EC2 Instance", icon: "🖥️" },
                { arrow: "eth0 primary ENI" },
                { actor: "Private IP / Public IP / EIP", icon: "🌐" },
                { arrow: "failover option" },
                { actor: "Secondary ENI", icon: "🔁" },
            ],
        },
        buildSystem: [
            "Use private IPs for internal service-to-service communication",
            "Place public workloads behind an ALB instead of depending on individual public IP addresses",
            "Use Elastic IP only when a static public IPv4 endpoint is truly required",
            "Use secondary private IPs or secondary ENIs for failover patterns within the same AZ",
            "Remember eth0 is the primary network interface and cannot be detached",
            "Do not try to increase bandwidth by teaming multiple ENIs",
        ],
        flow: ["Instance", "ENI", "Private IP", "Public/EIP", "Failover"],
        examTips: [
            "Public IPv4 is lost on stop/start; private IP is retained",
            "Elastic IP is static and can be remapped between instances or network interfaces",
            "An ENI is bound to one Availability Zone",
            "You can hot attach ENIs to running instances, warm attach to stopped instances, or cold attach at launch",
        ],
    },

    {
        id: 9,
        analogy: "Think of it like road upgrades — a standard road (ENI) handles everyday traffic, a motorway (ENA) moves more vehicles faster with less congestion, and a private race circuit with no traffic lights (EFA) lets formula-one teams push at maximum speed with zero interference.",
        icon: "🚀",
        color: ACCENT.red,
        tag: "SCENARIO 9",
        title: "ENA & EFA",
        subtitle: "Enhanced and HPC networking",
        useCase: {
            title: "AMI PVT LTD Marketplace — high-throughput analytics and tightly-coupled compute",
            story: "A premium analytics seller runs a distributed compute engine in the marketplace. Normal ENIs are enough for standard API traffic, ENA is selected for higher bandwidth and lower latency between analytics nodes, and EFA is reserved for tightly-coupled HPC or ML workloads that need MPI/NCCL-style communication with OS-bypass behavior.",
            diagram: [
                { actor: "Network Need", icon: "📶" },
                { arrow: "basic / enhanced / HPC" },
                { actor: "ENI / ENA / EFA", icon: "🚀" },
                { arrow: "attach to EC2" },
                { actor: "Analytics Cluster", icon: "🧠" },
            ],
        },
        buildSystem: [
            "Use ENI for normal VPC networking and multi-IP attachment patterns",
            "Use ENA when the workload needs higher bandwidth, higher PPS, and lower latency",
            "Launch an HVM AMI with the right drivers when using ENA",
            "Use EFA for HPC, MPI, ML, and tightly-coupled distributed workloads",
            "Validate that the selected instance type supports ENA or EFA before launch",
        ],
        flow: ["Network Requirement", "ENI", "ENA", "EFA", "Cluster"],
        examTips: [
            "ENA uses SR-IOV for enhanced networking performance",
            "ENA requires supported instance types and HVM AMIs with drivers",
            "EFA is an ENA with additional OS-bypass capabilities",
            "EFA is commonly tested with HPC, MPI, and ML collective communication workloads",
        ],
    },

    {
        id: 10,
        analogy: "Think of it like seating arrangements at a conference — cluster seating puts a team all at one table so they can whisper quickly (low latency), spread seating puts VIP speakers at separate tables so one spill does not affect all of them, and partition seating groups large delegations into separate sections so a fire in one section does not disrupt the others.",
        icon: "📍",
        color: ACCENT.amber,
        tag: "SCENARIO 10",
        title: "Placement Groups",
        subtitle: "Cluster, spread, partition placement",
        useCase: {
            title: "AMI PVT LTD Marketplace — selecting placement strategy for compute workloads",
            story: "AMI PVT LTD uses cluster placement groups for latency-sensitive analytics nodes, spread placement groups for a small number of critical licensing servers that must not share hardware, and partition placement groups for large replicated data platforms where failures should be isolated by rack partition.",
            diagram: [
                { actor: "Compute Topology Need", icon: "📍" },
                { arrow: "low latency / isolation / partitions" },
                { actor: "Placement Group Type", icon: "🧩" },
                { arrow: "launch instances" },
                { actor: "Controlled Failure Domain", icon: "🛡️" },
            ],
        },
        buildSystem: [
            "Use cluster placement groups for low latency and high network throughput in one AZ",
            "Use spread placement groups for a small number of critical instances across distinct hardware",
            "Use partition placement groups for large distributed systems such as Cassandra, HDFS, or HBase",
            "Launch required cluster capacity together where possible because capacity is finite",
            "Keep instance types homogeneous inside a placement group for best results",
            "Use private IP communication for best placement-group network performance",
        ],
        flow: ["Cluster", "Spread", "Partition", "Failure Domain", "Performance"],
        examTips: [
            "Cluster placement groups are single-AZ and optimized for low latency or high throughput",
            "Spread placement groups reduce simultaneous failure risk and have a small per-AZ instance limit",
            "Partition placement groups split instances across partitions with distinct racks",
            "An instance can be launched in only one placement group at a time",
        ],
    },

    {
        id: 11,
        analogy: "Think of it like a staffed security gatehouse at the entrance of a gated estate — visitors check in with the guard, prove their identity, and the guard escorts or grants access to the private residences inside; no one walks directly to the front door from the street.",
        icon: "🔐",
        color: ACCENT.green,
        tag: "SCENARIO 11",
        title: "Bastion / Jump Hosts",
        subtitle: "Controlled admin access to private EC2",
        useCase: {
            title: "AMI PVT LTD Marketplace — administering private EC2 instances without public exposure",
            story: "The marketplace keeps API and worker instances in private subnets. Administrators either connect through AWS Systems Manager Session Manager or, where legacy SSH workflows remain, through a hardened bastion host in a public subnet. The bastion accepts SSH only from corporate IP ranges and reaches private instances through security-group rules.",
            diagram: [
                { actor: "Admin", icon: "👩‍💻" },
                { arrow: "SSH or SSM" },
                { actor: "Bastion / Session Manager", icon: "🔐" },
                { arrow: "private access" },
                { actor: "Private EC2 Fleet", icon: "🖥️" },
            ],
        },
        buildSystem: [
            "Prefer Session Manager with an EC2 IAM role for audit-friendly shell access without inbound SSH",
            "If using a bastion, place it in a public subnet and keep workloads in private subnets",
            "Restrict bastion security-group ingress to approved corporate IP ranges",
            "Allow private instances to accept SSH only from the bastion security group",
            "Harden the bastion AMI, rotate keys, enable CloudWatch logs, and patch frequently",
            "Use Multi-AZ bastions or Session Manager for higher administrative availability",
        ],
        flow: ["Admin", "Bastion / SSM", "Security Group", "Private EC2"],
        examTips: [
            "A bastion host is a controlled jump point into private subnets",
            "Session Manager can remove the need for public SSH access when the instance has the right IAM role",
            "Security groups should reference other security groups for private-instance access",
            "Avoid putting workload instances directly in public subnets just for administration",
        ],
    },

    {
        id: 12,
        analogy: "Think of it like a hospital with vital-signs monitors at every bed (CloudWatch metrics), nurses writing notes in patient charts (application logs), and a reception ledger that records every visitor who entered or left the building (CloudTrail API audit).",
        icon: "📊",
        color: ACCENT.purple,
        tag: "SCENARIO 12",
        title: "Monitoring & Auditing",
        subtitle: "CloudWatch, unified agent, logs, CloudTrail",
        useCase: {
            title: "AMI PVT LTD Marketplace — operational visibility for EC2 workloads",
            story: "AMI PVT LTD needs instance metrics, application logs, OS-level memory and disk metrics, and an audit trail of EC2 API activity. Basic CloudWatch monitoring gives hypervisor-level metrics, detailed monitoring increases metric frequency, the unified CloudWatch Agent collects OS and application logs, and CloudTrail records control-plane actions such as RunInstances, StopInstances, and ModifyImageAttribute.",
            diagram: [
                { actor: "EC2 Instance", icon: "🖥️" },
                { arrow: "metrics / logs" },
                { actor: "CloudWatch Agent", icon: "📊" },
                { arrow: "API audit" },
                { actor: "CloudTrail / AWS Config", icon: "🧾" },
            ],
        },
        buildSystem: [
            "Enable basic CloudWatch monitoring by default, or detailed monitoring when 1-minute metrics are required",
            "Install and configure the unified CloudWatch Agent in the golden AMI",
            "Collect application logs, system logs, memory, disk, and custom metrics through the agent",
            "Use CloudTrail for EC2 API auditing and AWS Config to track EC2 configuration changes",
            "Use tags for ownership, cost allocation, automation, and IAM condition-based access",
            "Create alarms for status checks, CPU, memory, disk, and application health endpoints",
        ],
        flow: ["EC2", "CloudWatch", "Unified Agent", "CloudTrail", "AWS Config"],
        examTips: [
            "Basic EC2 monitoring uses 5-minute periods; detailed monitoring uses 1-minute periods and is chargeable",
            "CloudWatch Agent is needed for OS-level metrics such as memory and disk usage",
            "CloudTrail audits API calls; it does not replace instance logs",
            "Most taggable resources support up to 50 tags",
        ],
    },

    {
        id: 13,
        analogy: "Think of it like a chain of restaurants — if one branch closes for repairs the others stay open, a queue management system (load balancer) directs hungry customers to whichever branch has space, and a health inspector (Route 53) can redirect diners away from any branch that fails its checks.",
        icon: "🛡️",
        color: ACCENT.slate,
        tag: "SCENARIO 13",
        title: "High Availability Compute",
        subtitle: "AMI, ASG, ELB, Route 53 recovery",
        useCase: {
            title: "AMI PVT LTD Marketplace — self-healing compute for marketplace APIs",
            story: "The marketplace APIs must survive instance failure and Availability Zone outages. AMI PVT LTD keeps AMIs current, deploys horizontally across multiple smaller instances, uses Auto Scaling Groups with Elastic Load Balancing, and relies on Route 53 health checks for higher-level failover. AMIs are copied to another Region for disaster recovery staging.",
            diagram: [
                { actor: "Current AMI", icon: "💿" },
                { arrow: "launch across AZs" },
                { actor: "ASG + ELB", icon: "⚖️" },
                { arrow: "health checks" },
                { actor: "Route 53 Failover", icon: "🛡️" },
            ],
        },
        buildSystem: [
            "Keep golden AMIs patched and ready for rapid failover",
            "Use horizontal scaling across multiple smaller instances instead of one large instance",
            "Deploy an Auto Scaling Group across multiple Availability Zones",
            "Attach an Application Load Balancer or Network Load Balancer with health checks",
            "Use Route 53 health checks for DNS-level failover when needed",
            "Copy AMIs to a DR Region and test recovery launch templates",
        ],
        flow: ["AMI", "Multi-AZ ASG", "ELB", "Health Checks", "Route 53"],
        examTips: [
            "Auto Scaling and Elastic Load Balancing work together for automated recovery",
            "Up-to-date AMIs are critical for rapid failover",
            "Horizontal scaling spreads risk across multiple smaller machines",
            "Reserved capacity is the way to improve assurance that compute capacity is available when needed",
        ],
    },

    {
        id: 14,
        analogy: "Think of it like a removalist company that photographs every room of your old house (VM image), packs everything into a standardised shipping container (VMDK/VHD), and reassembles it exactly in the new location so you can move in and continue life without rebuilding from scratch.",
        icon: "🚚",
        color: ACCENT.orange,
        tag: "SCENARIO 14",
        title: "Migration to EC2",
        subtitle: "VM Import/Export and Server Migration Service",
        useCase: {
            title: "AMI PVT LTD Marketplace — migrating a customer VM appliance into AWS",
            story: "A customer has a legacy VMware reporting appliance that must move into AWS before it can integrate with the marketplace. For one-off VM conversion, the team uses VM Import/Export to import a VMDK or VHD and convert it into an EC2 AMI. For larger migration waves, Server Migration Service-style replication can automate, schedule, and track incremental replications that create periodic AMIs for cutover.",
            diagram: [
                { actor: "On-Prem VM", icon: "🏢" },
                { arrow: "VMDK / VHD import" },
                { actor: "S3 + VM Import", icon: "🚚" },
                { arrow: "creates" },
                { actor: "EC2 AMI", icon: "💿" },
            ],
        },
        buildSystem: [
            "Stop the source VM before generating VMDK or VHD images for VM Import/Export",
            "Upload supported VM image formats to S3 and run VM Import/Export through CLI or API",
            "Convert the imported VM image into an EC2 AMI and test launch behavior",
            "Use scheduled incremental replication for larger server migration waves",
            "Validate networking, IAM roles, monitoring agents, and backups after migration",
            "Remember migrated servers should still be rebuilt into standard golden AMIs over time",
        ],
        flow: ["VMware / Hyper-V / XEN", "S3", "VM Import/Export", "EC2 AMI", "Launch"],
        examTips: [
            "VM Import/Export supports Windows and Linux VM migration workflows",
            "VM Import/Export is used through the API or CLI, not the console",
            "Server migration replication reduces cutover downtime with incremental syncs",
            "Migration output commonly becomes an AMI that can launch EC2 instances",
        ],
    },
];

export default scenarios;
