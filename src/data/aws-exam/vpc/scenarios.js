import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Amazon VPC scenarios
 *
 * Source study topic: Amazon Virtual Private Cloud (VPC), grounded in the
 * AMI PVT LTD multi-tenant SaaS marketplace running in ap-southeast-1.
 * Account A (AMI PVT LTD): 123456789012
 * Account B (customer): 987654321098
 */

const scenarios = [
    {
        id: 1,
        analogy: "Think of it like an office building where the lobby and reception area face the street (public subnet) while the back offices and server rooms are locked away from visitors (private subnet) — only the front desk staff deal with the public.",
        icon: "🏗️",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "Custom VPC with Public/Private Subnets",
        subtitle: "Layered network isolation for the marketplace platform",
        useCase: {
            title: "AMI PVT LTD Marketplace — marketplace-vpc design with DMZ and private tiers",
            story: "marketplace-vpc (10.0.0.0/16) is the production network in ap-southeast-1. The public subnet (10.0.1.0/24) in ap-southeast-1a hosts marketplace-alb and the bastion host — both of which need direct internet access. The private subnet (10.0.10.0/24) in ap-southeast-1a hosts the Spring Boot EC2 fleet (marketplace-api-asg) and the marketplace-rds-primary instance. An Internet Gateway (marketplace-igw) is attached to marketplace-vpc and is the only route out for the public subnet. Private subnet resources reach the internet through marketplace-nat-gw.",
            diagram: [
                { actor: "Internet Gateway (marketplace-igw)", icon: "🌐" },
                { arrow: "0.0.0.0/0 route in public route table" },
                { actor: "Public Subnet 10.0.1.0/24 — marketplace-alb, bastion-host", icon: "🔵" },
                { arrow: "marketplace-alb forwards to private targets" },
                { actor: "Private Subnet 10.0.10.0/24 — marketplace-api-asg, marketplace-rds-primary", icon: "🔒" },
            ],
        },
        buildSystem: [
            "Create marketplace-vpc with CIDR 10.0.0.0/16 in ap-southeast-1; disable default DNS hostnames initially, then enable for RDS endpoint resolution",
            "Create public subnet 10.0.1.0/24 in ap-southeast-1a; enable auto-assign public IPv4 for bastion host connectivity",
            "Create private subnet 10.0.10.0/24 in ap-southeast-1a; disable auto-assign public IPv4 — no direct internet exposure",
            "Create and attach marketplace-igw to marketplace-vpc",
            "Create marketplace-public-rt with route 0.0.0.0/0 → marketplace-igw; associate with the public subnet",
            "Create marketplace-private-rt with route 0.0.0.0/0 → marketplace-nat-gw; associate with the private subnet",
            "Place marketplace-alb in public subnets; register marketplace-api-asg instances (private subnet) in marketplace-api-tg",
            "Place marketplace-rds-primary in private subnet with a DB subnet group spanning ap-southeast-1a and ap-southeast-1b",
        ],
        flow: ["marketplace-igw", "Public Subnet (ALB/Bastion)", "marketplace-alb", "Private Subnet (EC2/RDS)", "Outbound via NAT"],
        examTips: [
            "A VPC spans all AZs in a Region; subnets are AZ-specific — deploy across multiple subnets/AZs for high availability",
            "An Internet Gateway is horizontally scaled, redundant, and highly available — it is not a single point of failure",
            "Auto-assign public IPv4 is a subnet-level setting; enable it only for subnets that should give EC2 instances public IPs",
            "The main route table is used by subnets not explicitly associated with a custom route table — keep the main table restrictive",
        ],
        roleJson: [
            {
                label: "AWS CLI — create marketplace-vpc and public/private subnets",
                note: "💡 Tag all VPC resources consistently so Cost Explorer and Resource Groups can filter by marketplace environment.",
                code: `# Create VPC
aws ec2 create-vpc \\
  --cidr-block 10.0.0.0/16 \\
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=marketplace-vpc},{Key=Environment,Value=prod}]'

# Public subnet in ap-southeast-1a
aws ec2 create-subnet \\
  --vpc-id vpc-0marketplace123 \\
  --cidr-block 10.0.1.0/24 \\
  --availability-zone ap-southeast-1a \\
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=marketplace-public-subnet-1a}]'

# Private subnet in ap-southeast-1a
aws ec2 create-subnet \\
  --vpc-id vpc-0marketplace123 \\
  --cidr-block 10.0.10.0/24 \\
  --availability-zone ap-southeast-1a \\
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=marketplace-private-subnet-1a}]'

# Attach internet gateway
aws ec2 create-internet-gateway \\
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=marketplace-igw}]'
aws ec2 attach-internet-gateway \\
  --internet-gateway-id igw-0marketplace \\
  --vpc-id vpc-0marketplace123`,
            },
        ],
        cdkCode: [
            {
                label: "CDK — marketplace-vpc with public and private subnets",
                note: "The CDK Vpc construct creates subnets, route tables, an internet gateway, and (by default) NAT Gateways. Set natGateways to control AZ coverage. Tags are applied with cdk.Tags.",
                code: `import * as ec2 from 'aws-cdk-lib/aws-ec2';

const marketplaceVpc = new ec2.Vpc(this, 'MarketplaceVpc', {
  vpcName: 'marketplace-vpc',
  ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
  maxAzs: 2,
  natGateways: 1,
  subnetConfiguration: [
    {
      name: 'marketplace-public',
      subnetType: ec2.SubnetType.PUBLIC,
      cidrMask: 24,
      mapPublicIpOnLaunch: true,
    },
    {
      name: 'marketplace-private',
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      cidrMask: 24,
    },
  ],
  enableDnsHostnames: true,
  enableDnsSupport: true,
});
cdk.Tags.of(marketplaceVpc).add('Environment', 'prod');`,
            },
        ],
    },

    {
        id: 2,
        analogy: "Think of it like a company mailroom that sends outgoing letters on behalf of staff — employees in the back office can post letters to the outside world, but no one outside can walk in and knock on their doors.",
        icon: "🌍",
        color: ACCENT.teal,
        tag: "SCENARIO 2",
        title: "NAT Gateway",
        subtitle: "Outbound internet access for private EC2 without public exposure",
        useCase: {
            title: "AMI PVT LTD Marketplace — private EC2 pulling software updates and calling Stripe",
            story: "The Spring Boot EC2 instances in the private subnet (10.0.10.0/24) need to pull OS patches, download Maven dependencies from Maven Central, and call the Stripe payment API for marketplace billing. These EC2 instances must not be directly reachable from the internet. AMI PVT LTD deploys marketplace-nat-gw in the public subnet (10.0.1.0/24), assigns it an Elastic IP, and adds a default route in the private route table pointing to it. All outbound internet traffic from private instances is NATted to the gateway's Elastic IP.",
            diagram: [
                { actor: "marketplace-api-asg EC2 (Private Subnet 10.0.10.0/24)", icon: "🖥️" },
                { arrow: "0.0.0.0/0 → marketplace-nat-gw (private route table)" },
                { actor: "marketplace-nat-gw (Public Subnet 10.0.1.0/24, Elastic IP)", icon: "🌍" },
                { arrow: "NATted outbound request to internet" },
                { actor: "Maven Central / Stripe API / OS Patch Servers", icon: "🌐" },
            ],
        },
        buildSystem: [
            "Allocate an Elastic IP for marketplace-nat-gw to give it a fixed outbound public IP",
            "Create marketplace-nat-gw in the public subnet (10.0.1.0/24) with the allocated EIP",
            "Wait for marketplace-nat-gw state to reach 'available' before updating route tables",
            "Add route 0.0.0.0/0 → marketplace-nat-gw in marketplace-private-rt",
            "Verify private EC2 instances can reach the internet (curl https://repo1.maven.org) but are not reachable inbound",
            "Deploy one NAT Gateway per AZ if high availability is required; a single NAT GW is an AZ-level resource",
            "Monitor marketplace-nat-gw data-processing charges — costs $0.045/hr plus $0.045/GB processed in ap-southeast-1",
            "Use VPC Endpoints for S3, DynamoDB, and SQS to reduce NAT Gateway data charges for AWS service traffic",
        ],
        flow: ["Private EC2", "Private Route Table", "marketplace-nat-gw", "Elastic IP", "Internet"],
        examTips: [
            "NAT Gateway is managed by AWS, horizontally scaled within an AZ, and does not require patching or management",
            "NAT Gateway is AZ-specific — for HA, deploy one per AZ with separate route tables per AZ private subnet",
            "NAT Gateway supports TCP, UDP, and ICMP outbound; it does not support inbound connections from the internet",
            "NAT Instance (self-managed EC2) is an older alternative that supports security groups and port forwarding but requires manual HA",
        ],
        roleJson: [
            {
                label: "AWS CLI — create marketplace-nat-gw and update private route table",
                note: "💡 Always create the NAT Gateway in the PUBLIC subnet, not the private subnet — a common exam trap.",
                code: `# Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# Create NAT Gateway in PUBLIC subnet
aws ec2 create-nat-gateway \\
  --subnet-id subnet-pub1a \\
  --allocation-id eipalloc-0natgwprod \\
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=marketplace-nat-gw}]'

# Update private route table to use NAT Gateway
aws ec2 create-route \\
  --route-table-id rtb-marketplace-private \\
  --destination-cidr-block 0.0.0.0/0 \\
  --nat-gateway-id nat-0marketplace123`,
            },
        ],
        cdkCode: [
            {
                label: "CDK — NAT Gateway in public subnet with route in private route table",
                note: "The CDK Vpc construct automatically places NAT Gateways in public subnets and adds the default route in private route tables. Set natGateways=1 for a single NAT GW or natGateways=2 for one per AZ.",
                code: `import * as ec2 from 'aws-cdk-lib/aws-ec2';

// natGateways=1 places one NAT GW in the first public subnet.
// Increase to 2 for HA (one per AZ).
const marketplaceVpc = new ec2.Vpc(this, 'MarketplaceVpc', {
  vpcName: 'marketplace-vpc',
  ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
  maxAzs: 2,
  natGateways: 1,    // set to maxAzs for production HA
  subnetConfiguration: [
    { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
    { name: 'private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
  ],
});

// The CDK VPC construct automatically:
//   1. Creates an EIP for the NAT GW
//   2. Places marketplace-nat-gw in the public subnet
//   3. Adds 0.0.0.0/0 → natGatewayId in every private route table`,
            },
        ],
    },

    {
        id: 3,
        analogy: "Think of it like a building's security: the guard at each office door (Security Group) remembers who they let in and automatically lets them out — while the guard at the building entrance (NACL) checks every person entering AND leaving against a rulebook, with no memory of prior visits.",
        icon: "🛡️",
        color: ACCENT.amber,
        tag: "SCENARIO 3",
        title: "Security Groups vs NACLs",
        subtitle: "Stateful instance-level and stateless subnet-level controls",
        useCase: {
            title: "AMI PVT LTD Marketplace — layered traffic controls for ALB and EC2 tiers",
            story: "marketplace-alb-sg allows inbound HTTPS (443) from the internet (0.0.0.0/0). marketplace-api-sg allows inbound TCP 8080 only from marketplace-alb-sg — EC2 instances are never directly reachable. For an additional layer of DDoS mitigation, a NACL on the private subnet explicitly denies inbound traffic from a known malicious CIDR range (198.51.100.0/24) using a low-priority numbered rule, while the default NACL rules allow all other traffic.",
            diagram: [
                { actor: "Internet (0.0.0.0/0)", icon: "🌐" },
                { arrow: "SG: allow HTTPS 443 inbound" },
                { actor: "marketplace-alb (marketplace-alb-sg)", icon: "🔀" },
                { arrow: "SG: allow TCP 8080 from marketplace-alb-sg only" },
                { actor: "Spring Boot EC2 (marketplace-api-sg) — NACL deny 198.51.100.0/24", icon: "🛡️" },
            ],
        },
        buildSystem: [
            "Create marketplace-alb-sg: inbound TCP 443 from 0.0.0.0/0 (HTTPS); inbound TCP 80 from 0.0.0.0/0 (redirect); no outbound restriction",
            "Create marketplace-api-sg: inbound TCP 8080 from source marketplace-alb-sg (security group reference, not CIDR); deny all other inbound by default",
            "Create marketplace-bastion-sg: inbound TCP 22 from corporate IP range only; allow SSH from bastion SG in marketplace-api-sg for admin access",
            "Create a custom NACL for the private subnet (marketplace-private-nacl)",
            "Add NACL rule 100: DENY inbound from 198.51.100.0/24 all ports (DDoS source mitigation)",
            "Add NACL rule 200: ALLOW inbound from 10.0.1.0/24 TCP 1024-65535 (return traffic from ALB subnet)",
            "Add NACL rule 32766: ALLOW all inbound (default permissive; overridden by lower-numbered deny rules)",
            "Remember to add matching outbound NACL rules — NACLs are stateless unlike security groups",
        ],
        flow: ["Internet", "ALB SG (allow 443)", "marketplace-alb", "EC2 SG (allow 8080 from ALB SG)", "NACL deny rule"],
        examTips: [
            "Security groups are stateful — return traffic is automatically allowed; NACLs are stateless — both directions must be explicitly allowed",
            "Security groups reference other security groups as sources/destinations, enabling precise inter-tier rules without managing CIDRs",
            "NACL rules are evaluated in ascending rule number order; the first matching rule wins — place deny rules before allow rules",
            "A security group's default behavior is deny all inbound, allow all outbound; a NACL default (custom) is deny all inbound and outbound",
        ],
        roleJson: [
            {
                label: "Security group rules — marketplace-api-sg allowing only ALB SG on port 8080",
                note: "💡 Referencing the ALB security group as the source means only traffic from marketplace-alb is allowed — even if the ALB IPs change.",
                code: `{
  "GroupName": "marketplace-api-sg",
  "Description": "Spring Boot API EC2 — allow inbound from ALB SG only",
  "VpcId": "vpc-0marketplace123",
  "InboundRules": [
    {
      "IpProtocol": "tcp",
      "FromPort": 8080,
      "ToPort": 8080,
      "UserIdGroupPairs": [{
        "GroupId": "sg-0alb-marketplace",
        "Description": "Allow traffic from marketplace-alb-sg only"
      }]
    },
    {
      "IpProtocol": "tcp",
      "FromPort": 22,
      "ToPort": 22,
      "UserIdGroupPairs": [{
        "GroupId": "sg-0bastion-marketplace",
        "Description": "SSH from bastion host SG only"
      }]
    }
  ]
}`,
            },
        ],
        cdkCode: [
            {
                label: "CDK — Security Groups with SG-to-SG references for ALB and EC2 tiers",
                note: "Creates marketplace-alb-sg and marketplace-api-sg. The EC2 SG allows inbound 8080 only from the ALB SG — no hardcoded CIDRs needed. A bastion SG is also created for SSH.",
                code: `import * as ec2 from 'aws-cdk-lib/aws-ec2';

const vpc = ec2.Vpc.fromLookup(this, 'MarketplaceVpc', { vpcName: 'marketplace-vpc' });

const albSg = new ec2.SecurityGroup(this, 'AlbSg', {
  vpc,
  securityGroupName: 'marketplace-alb-sg',
  description: 'marketplace-alb — allow HTTPS and HTTP from internet',
});
albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS');
albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP for redirect');

const bastionSg = new ec2.SecurityGroup(this, 'BastionSg', {
  vpc, securityGroupName: 'marketplace-bastion-sg',
  description: 'Bastion host — allow SSH from corporate IP only',
});
bastionSg.addIngressRule(ec2.Peer.ipv4('203.0.113.0/24'), ec2.Port.tcp(22), 'Corporate SSH');

const apiSg = new ec2.SecurityGroup(this, 'ApiSg', {
  vpc,
  securityGroupName: 'marketplace-api-sg',
  description: 'Spring Boot API EC2 — allow inbound from ALB SG only',
  allowAllOutbound: true,
});
apiSg.addIngressRule(albSg, ec2.Port.tcp(8080), 'Allow traffic from marketplace-alb-sg');
apiSg.addIngressRule(bastionSg, ec2.Port.tcp(22), 'SSH from bastion SG only');`,
            },
        ],
    },

    {
        id: 4,
        analogy: "Think of it like an internal office supply room — instead of staff leaving the building to buy pens from a shop downtown, there is a direct internal corridor to the supplies, saving time and cost without anyone stepping outside.",
        icon: "🔌",
        color: ACCENT.orange,
        tag: "SCENARIO 4",
        title: "VPC Endpoints",
        subtitle: "Private AWS service access without internet or NAT traffic",
        useCase: {
            title: "AMI PVT LTD Marketplace — keeping S3, DynamoDB, and SQS traffic inside the AWS network",
            story: "The marketplace platform stores deployment artifacts in S3, tool-instance metadata in DynamoDB, and job queues in SQS. Without VPC Endpoints, all these calls leave the VPC via marketplace-nat-gw, incurring data processing charges and adding latency. AMI PVT LTD creates marketplace-s3-endpoint (Gateway, free) and marketplace-dynamodb-endpoint (Gateway, free) to keep S3 and DynamoDB traffic inside the AWS backbone, and marketplace-sqs-endpoint (Interface, $0.01/hr) to let Lambda functions in the private subnet reach SQS without internet exposure.",
            diagram: [
                { actor: "Lambda / EC2 (Private Subnet)", icon: "⚡" },
                { arrow: "S3/DynamoDB calls → Gateway Endpoints (no NAT, free)" },
                { actor: "marketplace-s3-endpoint / marketplace-dynamodb-endpoint", icon: "🔌" },
                { arrow: "SQS calls → Interface Endpoint (ENI in private subnet)" },
                { actor: "marketplace-sqs-endpoint (ENI 10.0.10.x, $0.01/hr)", icon: "📬" },
            ],
        },
        buildSystem: [
            "Create marketplace-s3-endpoint as a Gateway endpoint for com.amazonaws.ap-southeast-1.s3; associate with marketplace-private-rt",
            "Create marketplace-dynamodb-endpoint as a Gateway endpoint for com.amazonaws.ap-southeast-1.dynamodb; associate with marketplace-private-rt",
            "Add a policy on marketplace-s3-endpoint restricting access to the marketplace-artifacts-bucket ARN only",
            "Create marketplace-sqs-endpoint as an Interface endpoint for com.amazonaws.ap-southeast-1.sqs in the private subnet",
            "Associate marketplace-sqs-endpoint with a security group allowing TCP 443 inbound from marketplace-api-sg and Lambda VPC config",
            "Enable Private DNS on marketplace-sqs-endpoint so Lambda/EC2 can use the standard sqs.ap-southeast-1.amazonaws.com endpoint",
            "Verify that EC2 and Lambda function calls to SQS resolve to the private ENI IP (10.0.10.x) not the public SQS IP",
            "Remove the 0.0.0.0/0 → marketplace-nat-gw route for S3/DynamoDB destinations since the Gateway endpoints now handle that traffic",
        ],
        flow: ["Private Lambda/EC2", "Gateway Endpoint (S3/DynamoDB)", "Interface Endpoint (SQS)", "AWS Service", "No internet transit"],
        examTips: [
            "Gateway endpoints (S3 and DynamoDB only) are free, route-table-based, and do not use an ENI in your subnet",
            "Interface endpoints use an ENI with a private IP in your subnet and incur an hourly and data-processing charge",
            "Enable Private DNS on Interface endpoints so existing application code using public service endpoints resolves to the private ENI automatically",
            "Gateway endpoint policies restrict which buckets or tables can be accessed through the endpoint — an important security boundary",
        ],
        roleJson: [
            {
                label: "AWS CLI — create Gateway endpoint for S3 with bucket-scoped policy",
                note: "💡 Gateway endpoints are free and do not require changes to application code — just update route tables and optionally set a policy.",
                code: `# Gateway endpoint for S3 (free)
aws ec2 create-vpc-endpoint \\
  --vpc-id vpc-0marketplace123 \\
  --service-name com.amazonaws.ap-southeast-1.s3 \\
  --route-table-ids rtb-marketplace-private \\
  --policy-document '{
    "Statement": [{
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject","s3:PutObject","s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::marketplace-artifacts-bucket",
        "arn:aws:s3:::marketplace-artifacts-bucket/*"
      ]
    }]
  }' \\
  --tag-specifications 'ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=marketplace-s3-endpoint}]'

# Interface endpoint for SQS ($0.01/hr)
aws ec2 create-vpc-endpoint \\
  --vpc-id vpc-0marketplace123 \\
  --vpc-endpoint-type Interface \\
  --service-name com.amazonaws.ap-southeast-1.sqs \\
  --subnet-ids subnet-private1a \\
  --security-group-ids sg-0sqs-endpoint \\
  --private-dns-enabled \\
  --tag-specifications 'ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=marketplace-sqs-endpoint}]'`,
            },
        ],
        cdkCode: [
            {
                label: "CDK — Gateway endpoint for S3 and Interface endpoint for SQS",
                note: "Adds a free Gateway endpoint for S3/DynamoDB on the private route table and an Interface endpoint for SQS with Private DNS enabled. No application code changes needed.",
                code: `import * as ec2 from 'aws-cdk-lib/aws-ec2';

// Assumes marketplaceVpc is already defined
const s3Endpoint = marketplaceVpc.addGatewayEndpoint('S3Endpoint', {
  service: ec2.GatewayVpcEndpointAwsService.S3,
  subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
});
// Optional: scope endpoint to specific bucket
s3Endpoint.addToPolicy(new iam.PolicyStatement({
  principals: [new iam.AnyPrincipal()],
  actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket'],
  resources: [
    'arn:aws:s3:::marketplace-artifacts-bucket',
    'arn:aws:s3:::marketplace-artifacts-bucket/*',
  ],
}));

marketplaceVpc.addGatewayEndpoint('DynamoDbEndpoint', {
  service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
  subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
});

const sqsEndpointSg = new ec2.SecurityGroup(this, 'SqsEndpointSg', {
  vpc: marketplaceVpc, description: 'SQS Interface Endpoint SG',
});
sqsEndpointSg.addIngressRule(ec2.Peer.ipv4('10.0.10.0/24'), ec2.Port.tcp(443));

marketplaceVpc.addInterfaceEndpoint('SqsEndpoint', {
  service: ec2.InterfaceVpcEndpointAwsService.SQS,
  subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [sqsEndpointSg],
  privateDnsEnabled: true,
});`,
            },
        ],
    },

    {
        id: 5,
        analogy: "Think of it like building a private connecting corridor between two office buildings — staff can walk directly between them, but the corridor only connects those two buildings, so you need a separate corridor for every additional pair.",
        icon: "🔗",
        color: ACCENT.purple,
        tag: "SCENARIO 5",
        title: "VPC Peering",
        subtitle: "Private connectivity between marketplace-prod and marketplace-analytics VPCs",
        useCase: {
            title: "AMI PVT LTD Marketplace — connecting the production VPC to the analytics pipeline VPC",
            story: "The marketplace-analytics VPC (10.1.0.0/16) runs a data pipeline that processes transaction logs and usage metrics from marketplace-prod (10.0.0.0/16). AMI PVT LTD creates a VPC peering connection (marketplace-prod-analytics-peer) between the two VPCs so the analytics pipeline can read from the marketplace database export bucket and call internal APIs without internet exposure. Route tables on both sides must be updated, and security groups on both sides must allow traffic from the peer CIDR.",
            diagram: [
                { actor: "marketplace-vpc (10.0.0.0/16) — Account 123456789012", icon: "🏢" },
                { arrow: "VPC peering: marketplace-prod-analytics-peer" },
                { actor: "marketplace-analytics-vpc (10.1.0.0/16) — Account 123456789012", icon: "📊" },
                { arrow: "route 10.1.0.0/16 → peer in marketplace-private-rt" },
                { actor: "Analytics Pipeline EC2 accessing marketplace-rds-replica", icon: "🔗" },
            ],
        },
        buildSystem: [
            "Verify marketplace-vpc (10.0.0.0/16) and marketplace-analytics-vpc (10.1.0.0/16) have non-overlapping CIDRs — peering fails if CIDRs overlap",
            "Create VPC peering connection marketplace-prod-analytics-peer from marketplace-vpc to marketplace-analytics-vpc",
            "Accept the peering request from the marketplace-analytics-vpc side (same account in this case)",
            "Add route 10.1.0.0/16 → marketplace-prod-analytics-peer in marketplace-private-rt (production side)",
            "Add route 10.0.0.0/16 → marketplace-prod-analytics-peer in marketplace-analytics-private-rt (analytics side)",
            "Update marketplace-rds-sg to allow inbound TCP 5432 from 10.1.0.0/16 (analytics pipeline CIDR)",
            "Test connectivity from analytics EC2 to marketplace-rds-replica endpoint on port 5432",
            "Remember: VPC peering is not transitive — if a third VPC (marketplace-staging) needs access, a separate peering connection is required",
        ],
        flow: ["marketplace-vpc", "Peering Connection", "marketplace-analytics-vpc", "Route Tables (both sides)", "Security Groups (both sides)"],
        examTips: [
            "VPC peering is non-transitive — traffic cannot flow through a peered VPC to a third VPC; use AWS Transit Gateway for hub-and-spoke topologies",
            "Peering requires non-overlapping CIDRs; even a partial overlap prevents the connection from being established",
            "Both route tables must be updated — adding a peering route on only one side creates a one-way black hole",
            "VPC peering works across accounts and across Regions (inter-region peering); inter-region peering traffic is encrypted by default",
        ],
        roleJson: [
            {
                label: "AWS CLI — create and accept marketplace VPC peering connection",
                note: "💡 After accepting the peering, update route tables on BOTH VPCs — this step is frequently missed in exams and real implementations.",
                code: `# Create peering connection
aws ec2 create-vpc-peering-connection \\
  --vpc-id vpc-0marketplace123 \\
  --peer-vpc-id vpc-0analytics456 \\
  --tag-specifications 'ResourceType=vpc-peering-connection,Tags=[{Key=Name,Value=marketplace-prod-analytics-peer}]'

# Accept the peering connection
aws ec2 accept-vpc-peering-connection \\
  --vpc-peering-connection-id pcx-0marketplacepeer

# Add route on production side
aws ec2 create-route \\
  --route-table-id rtb-marketplace-private \\
  --destination-cidr-block 10.1.0.0/16 \\
  --vpc-peering-connection-id pcx-0marketplacepeer

# Add route on analytics side
aws ec2 create-route \\
  --route-table-id rtb-analytics-private \\
  --destination-cidr-block 10.0.0.0/16 \\
  --vpc-peering-connection-id pcx-0marketplacepeer`,
            },
        ],
        cdkCode: [
            {
                label: "CDK — VPC Peering connection with routes on both sides",
                note: "CDK has no L2 for VPC peering — use CfnVPCPeeringConnection + CfnRoute. Routes on both VPCs must be added manually; the peering connection alone does not add any routes.",
                code: `import * as ec2 from 'aws-cdk-lib/aws-ec2';

// Create the peering connection
const peeringConnection = new ec2.CfnVPCPeeringConnection(this, 'ProdAnalyticsPeer', {
  vpcId: 'vpc-0marketplace123',    // marketplace-prod (10.0.0.0/16)
  peerVpcId: 'vpc-0analytics456',  // marketplace-analytics (10.1.0.0/16)
  tags: [{ key: 'Name', value: 'marketplace-prod-analytics-peer' }],
});

// Route on PRODUCTION side: send analytics CIDR via peering
new ec2.CfnRoute(this, 'ProdToAnalyticsRoute', {
  routeTableId: 'rtb-marketplace-private',
  destinationCidrBlock: '10.1.0.0/16',
  vpcPeeringConnectionId: peeringConnection.ref,
});

// Route on ANALYTICS side: send prod CIDR back via same peering
// (deployed in the analytics VPC stack or cross-stack reference)
new ec2.CfnRoute(this, 'AnalyticsToProdRoute', {
  routeTableId: 'rtb-analytics-private',
  destinationCidrBlock: '10.0.0.0/16',
  vpcPeeringConnectionId: peeringConnection.ref,
});`,
            },
        ],
    },

    {
        id: 6,
        analogy: "Think of it like a secure private doorbell that a customer presses inside their own home — it rings directly in your shop's back room without anyone stepping onto a public street, and you decide which customers get a doorbell.",
        icon: "🔒",
        color: ACCENT.green,
        tag: "SCENARIO 6",
        title: "AWS PrivateLink",
        subtitle: "Expose the Marketplace API to enterprise customers without internet exposure",
        useCase: {
            title: "AMI PVT LTD Marketplace — PrivateLink service for enterprise customer VPC access",
            story: "Enterprise customers (Account B, 987654321098) want to call the AMI PVT LTD Marketplace API from within their own VPC without routing traffic over the public internet. AMI PVT LTD registers marketplace-nlb as the backend of a VPC Endpoint Service (marketplace-api-endpoint-service) in Account A (123456789012). The customer creates a VPC Interface Endpoint in their VPC that connects to this service. Traffic flows privately through the AWS backbone — the customer's application never leaves their VPC and never touches an internet gateway.",
            diagram: [
                { actor: "Customer VPC (Account B: 987654321098) — vpc-0customer789", icon: "🏢" },
                { arrow: "Interface Endpoint (private ENI in customer subnet)" },
                { actor: "AWS PrivateLink (marketplace-api-endpoint-service)", icon: "🔒" },
                { arrow: "AWS internal backbone — no internet" },
                { actor: "marketplace-nlb → marketplace-api-asg (Account A: 123456789012)", icon: "🖥️" },
            ],
        },
        buildSystem: [
            "Ensure marketplace-nlb is the backing load balancer for the endpoint service (PrivateLink requires NLB as the backend)",
            "Create the VPC Endpoint Service marketplace-api-endpoint-service backed by marketplace-nlb in Account A (123456789012)",
            "Enable acceptance required so AMI PVT LTD must approve each customer connection request",
            "Add the customer AWS account ID (987654321098) to the allowed principals list on marketplace-api-endpoint-service",
            "Customer creates a VPC Interface Endpoint in their vpc-0customer789, selecting com.amazonaws.vpce.ap-southeast-1.marketplace-api-endpoint-service",
            "AMI PVT LTD approves the endpoint connection request in the VPC Endpoint Service console",
            "Customer enables Private DNS on their endpoint so their app resolves marketplace-api.ami.com to the private ENI IP",
            "Verify traffic from customer EC2 reaches marketplace-api-asg without traversing any internet gateway",
        ],
        flow: ["Customer VPC (Account B)", "Interface Endpoint (ENI)", "PrivateLink Service", "marketplace-nlb", "marketplace-api-asg (Account A)"],
        examTips: [
            "PrivateLink requires an NLB (or Gateway Load Balancer) as the backend of the endpoint service — ALB is not supported as a PrivateLink backend",
            "The service provider's NLB and the consumer's VPC can have overlapping CIDRs — PrivateLink does not require unique CIDRs unlike VPC peering",
            "With acceptance required enabled, the service provider approves each connection request — important for marketplace entitlement control",
            "PrivateLink traffic does not traverse the internet, VPC peering connections, or NAT devices — it stays on the AWS private backbone",
        ],
        roleJson: [
            {
                label: "AWS CLI — create PrivateLink endpoint service backed by marketplace-nlb (Account A)",
                note: "💡 Enable acceptanceRequired=true so AMI PVT LTD controls which customers can connect to the marketplace API service.",
                code: `# Account A (AMI PVT LTD 123456789012): create endpoint service
aws ec2 create-vpc-endpoint-service-configuration \\
  --network-load-balancer-arns arn:aws:elasticloadbalancing:ap-southeast-1:123456789012:loadbalancer/net/marketplace-nlb/abc123 \\
  --acceptance-required \\
  --tag-specifications 'ResourceType=vpc-endpoint-service,Tags=[{Key=Name,Value=marketplace-api-endpoint-service}]'

# Allow customer account to discover and connect
aws ec2 modify-vpc-endpoint-service-permissions \\
  --service-id vpce-svc-0marketplace123 \\
  --add-allowed-principals '["arn:aws:iam::987654321098:root"]'

# Account B (customer 987654321098): create interface endpoint
aws ec2 create-vpc-endpoint \\
  --vpc-id vpc-0customer789 \\
  --vpc-endpoint-type Interface \\
  --service-name com.amazonaws.vpce.ap-southeast-1.vpce-svc-0marketplace123 \\
  --subnet-ids subnet-customer-private1 \\
  --security-group-ids sg-0customer-endpoint \\
  --private-dns-enabled`,
            },
        ],
        cdkCode: [
            {
                label: "CDK — PrivateLink endpoint service (Account A) and Interface Endpoint (Account B)",
                note: "CfnVPCEndpointService creates the service backed by marketplace-nlb. CfnVPCEndpointServicePermissions allows the customer account to connect. The customer account uses InterfaceVpcEndpoint to connect to the service.",
                code: `import * as ec2 from 'aws-cdk-lib/aws-ec2';

// ── Account A (AMI PVT LTD 123456789012): create Endpoint Service ──
const endpointService = new ec2.CfnVPCEndpointService(this, 'MarketplaceEndpointSvc', {
  networkLoadBalancerArns: [
    'arn:aws:elasticloadbalancing:ap-southeast-1:123456789012:loadbalancer/net/marketplace-nlb/abc123',
  ],
  acceptanceRequired: true,   // AMI PVT LTD approves each connection
  tags: [{ key: 'Name', value: 'marketplace-api-endpoint-service' }],
});

// Allow customer account to discover and connect
new ec2.CfnVPCEndpointServicePermissions(this, 'CustomerPermission', {
  serviceId: endpointService.ref,
  allowedPrincipals: ['arn:aws:iam::987654321098:root'],
});

// ── Account B (customer 987654321098): create Interface Endpoint ──
// (deployed in the customer account stack)
const customerVpc = ec2.Vpc.fromLookup(this, 'CustomerVpc', { vpcId: 'vpc-0customer789' });

const customerEndpoint = new ec2.InterfaceVpcEndpoint(this, 'MarketplaceApiEndpoint', {
  vpc: customerVpc,
  service: new ec2.InterfaceVpcEndpointService(
    'com.amazonaws.vpce.ap-southeast-1.vpce-svc-0marketplace123',
    443,
  ),
  subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  privateDnsEnabled: true,
});`,
            },
        ],
    },
    {
        id: 7,
        analogy: "Think of it like a major highway interchange — instead of building a separate road between every city pair, all roads connect to one central hub, so adding a new city only requires one new on-ramp, not roads to every existing city.",
        icon: "🌐",
        color: ACCENT.red,
        tag: "SCENARIO 7",
        title: "AWS Transit Gateway",
        subtitle: "Hub-and-spoke network for all AMI PVT LTD VPCs and on-premises",
        useCase: {
            title: "AMI PVT LTD Marketplace — replacing point-to-point peering with a central Transit Gateway",
            story: "AMI PVT LTD operates four VPCs: marketplace-prod (10.0.0.0/16), marketplace-analytics (10.1.0.0/16), marketplace-dev (10.2.0.0/16), and marketplace-dr (10.3.0.0/16 in ap-south-1). Using VPC peering, connecting all four requires six individual peering connections, each with its own route table entries — and peering is non-transitive, so traffic cannot flow through an intermediate VPC. AMI PVT LTD creates marketplace-tgw (Transit Gateway) as a central hub. Each VPC attaches to marketplace-tgw. A single route table on the TGW propagates all four CIDR blocks, and each VPC's route table gets a single entry pointing all inter-VPC CIDRs to marketplace-tgw. The on-premises data centre also connects via a Site-to-Site VPN attachment on the same TGW, giving all VPCs on-premises connectivity through one hub.",
            diagram: [
                { actor: "marketplace-prod VPC (10.0.0.0/16)", icon: "🏢" },
                { arrow: "TGW attachment" },
                { actor: "marketplace-tgw (Transit Gateway — central hub)", icon: "🌐" },
                { arrow: "TGW attachment" },
                { actor: "marketplace-analytics (10.1.0.0/16) / marketplace-dev (10.2.0.0/16) / marketplace-dr (10.3.0.0/16)", icon: "📊" },
                { arrow: "VPN attachment" },
                { actor: "On-Premises Data Centre (192.168.0.0/16)", icon: "🏗️" },
            ],
        },
        buildSystem: [
            "Create marketplace-tgw in ap-southeast-1 with auto-accept shared attachments disabled (manual approval for new VPC attachments)",
            "Enable DNS support and VPN ECMP support on marketplace-tgw; keep default route table association and propagation enabled for simplicity",
            "Create TGW VPC attachment for marketplace-prod (10.0.0.0/16) — select one private subnet per AZ for the attachment ENIs",
            "Create TGW VPC attachments for marketplace-analytics (10.1.0.0/16) and marketplace-dev (10.2.0.0/16) the same way",
            "On the TGW default route table, each attachment's CIDR auto-propagates — verify routes: 10.0.0.0/16, 10.1.0.0/16, 10.2.0.0/16 all appear",
            "In each VPC's private route table, add a route for all other VPC CIDRs pointing to marketplace-tgw (e.g. marketplace-prod-private-rt: 10.1.0.0/16 → tgw-id)",
            "Attach the on-premises VPN to marketplace-tgw using a VPN attachment with Customer Gateway (CGW) pointing to the on-premises router IP",
            "Use Resource Access Manager (RAM) to share marketplace-tgw with the marketplace-analytics AWS account if it is in a different account",
        ],
        flow: ["VPC Attachments", "marketplace-tgw", "TGW Route Table", "CIDR Propagation", "All VPCs + On-Premises Connected"],
        examTips: [
            "Transit Gateway is transitive — traffic CAN flow through the TGW hub to reach any attached VPC or VPN, unlike VPC peering",
            "Each VPC attachment uses ENIs in subnets within that VPC — choose one subnet per AZ for high availability",
            "TGW supports VPC attachments, VPN attachments, Direct Connect Gateway attachments, and peering with TGWs in other Regions",
            "VPC route tables still need updating — adding a TGW attachment does NOT automatically add routes in the VPC route tables",
            "Use RAM (Resource Access Manager) to share a TGW across AWS accounts in the same Organization",
        ],
        roleJson: [
            {
                label: "AWS CLI — create marketplace-tgw and attach marketplace-prod VPC",
                note: "💡 After creating the attachment, routes in the TGW route table are auto-propagated — but you must manually add routes in each VPC's route table pointing to the TGW.",
                code: `# Create Transit Gateway
aws ec2 create-transit-gateway \\
  --description "AMI PVT LTD central network hub" \\
  --options AmazonSideAsn=64512,AutoAcceptSharedAttachments=disable,DefaultRouteTableAssociation=enable,DefaultRouteTablePropagation=enable,DnsSupport=enable,VpnEcmpSupport=enable \\
  --tag-specifications 'ResourceType=transit-gateway,Tags=[{Key=Name,Value=marketplace-tgw}]'

# Attach marketplace-prod VPC
aws ec2 create-transit-gateway-vpc-attachment \\
  --transit-gateway-id tgw-0marketplace123 \\
  --vpc-id vpc-0marketplace123 \\
  --subnet-ids subnet-private1a subnet-private1b \\
  --tag-specifications 'ResourceType=transit-gateway-attachment,Tags=[{Key=Name,Value=tgw-attach-marketplace-prod}]'

# Add route in marketplace-prod private route table pointing analytics CIDR to TGW
aws ec2 create-route \\
  --route-table-id rtb-marketplace-private \\
  --destination-cidr-block 10.1.0.0/16 \\
  --transit-gateway-id tgw-0marketplace123`,
            },
        ],
        cdkCode: [
            {
                label: "CDK — Transit Gateway with VPC attachment and VPC route update",
                note: "Use CfnTransitGateway + CfnTransitGatewayAttachment (CDK has no L2). After creating the attachment, add CfnRoute entries in each VPC's private route table pointing inter-VPC CIDRs to the TGW.",
                code: `import * as ec2 from 'aws-cdk-lib/aws-ec2';

const tgw = new ec2.CfnTransitGateway(this, 'MarketplaceTgw', {
  description: 'AMI PVT LTD central network hub',
  amazonSideAsn: 64512,
  autoAcceptSharedAttachments: 'disable',
  defaultRouteTableAssociation: 'enable',
  defaultRouteTablePropagation: 'enable',
  dnsSupport: 'enable',
  vpnEcmpSupport: 'enable',
  tags: [{ key: 'Name', value: 'marketplace-tgw' }],
});

// Attach marketplace-prod VPC (one subnet per AZ for HA)
const prodAttachment = new ec2.CfnTransitGatewayAttachment(this, 'ProdVpcAttachment', {
  transitGatewayId: tgw.ref,
  vpcId: 'vpc-0marketplace123',
  subnetIds: ['subnet-private1a', 'subnet-private1b'],
  tags: [{ key: 'Name', value: 'tgw-attach-marketplace-prod' }],
});

// Route in prod private route table: analytics CIDR → TGW
// (route depends on attachment being active first)
new ec2.CfnRoute(this, 'ProdToAnalyticsRoute', {
  routeTableId: 'rtb-marketplace-private',
  destinationCidrBlock: '10.1.0.0/16',
  transitGatewayId: tgw.ref,
}).addDependency(prodAttachment);

// Repeat CfnTransitGatewayAttachment + CfnRoute for analytics and dev VPCs
// Share the TGW with the analytics account using RAM:
// new ram.CfnResourceShare(this, 'TgwShare', { resourceArns: [tgw.attrTransitGatewayArn], ... })`,
            },
        ],
    },

    {
        id: 8,
        analogy: "Think of it like the difference between a secure courier using public roads (Site-to-Site VPN — encrypted but shares the road with everyone) and a private dedicated railway line (Direct Connect — your own track, consistent speed, lower delays, but takes time to lay).",
        icon: "🔐",
        color: ACCENT.pink,
        tag: "SCENARIO 8",
        title: "Site-to-Site VPN & Direct Connect",
        subtitle: "Hybrid connectivity for on-premises to marketplace-vpc",
        useCase: {
            title: "AMI PVT LTD Marketplace — connecting the on-premises data centre to marketplace-vpc securely",
            story: "AMI PVT LTD's finance team operates legacy systems in an on-premises data centre (192.168.0.0/16) that need to query the marketplace's internal billing API running on the Spring Boot fleet in marketplace-vpc (10.0.0.0/16). For an interim encrypted connection, AMI PVT LTD creates a Site-to-Site VPN: a Virtual Private Gateway (marketplace-vgw) is attached to marketplace-vpc, and a Customer Gateway (marketplace-cgw) represents the on-premises router IP. Two IPSec tunnels are established for redundancy. For the long-term, AMI PVT LTD provisions a 1 Gbps AWS Direct Connect (DX) circuit from the on-premises data centre to the AWS DX location in Singapore, providing dedicated, consistent bandwidth with lower latency than VPN.",
            diagram: [
                { actor: "On-Premises Data Centre (192.168.0.0/16)", icon: "🏗️" },
                { arrow: "IPSec VPN tunnels (2× for HA)" },
                { actor: "marketplace-cgw (Customer Gateway) ↔ marketplace-vgw (Virtual Private Gateway)", icon: "🔐" },
                { arrow: "attached to marketplace-vpc" },
                { actor: "marketplace-vpc (10.0.0.0/16) — Spring Boot EC2 billing API", icon: "🏢" },
                { arrow: "OR: dedicated 1 Gbps DX circuit (lower latency, no public internet)" },
                { actor: "AWS Direct Connect Location (Singapore)", icon: "⚡" },
            ],
        },
        buildSystem: [
            "Create Customer Gateway (marketplace-cgw) specifying the on-premises router's public IP and BGP ASN (e.g. 65000)",
            "Create Virtual Private Gateway (marketplace-vgw) and attach it to marketplace-vpc",
            "Create Site-to-Site VPN connection between marketplace-cgw and marketplace-vgw; download the configuration for the on-premises router",
            "Enable route propagation on marketplace-private-rt to automatically propagate the on-premises CIDR (192.168.0.0/16) from marketplace-vgw",
            "Configure the on-premises router with the VPN tunnel pre-shared keys and IKE/IPSec settings from the AWS config download",
            "Verify both VPN tunnels are UP (one may be UP and one standby — both UP is preferred for Active/Active ECMP)",
            "For Direct Connect: order a hosted or dedicated DX connection via the AWS Direct Connect console or a DX partner; provision a Virtual Interface (VIF) on the DX connection",
            "For hybrid DX + VPN: use DX as primary and Site-to-Site VPN as failover — use BGP route priority to prefer DX routes",
        ],
        flow: ["On-Premises Router", "marketplace-cgw", "IPSec Tunnels (×2)", "marketplace-vgw", "marketplace-vpc Private Subnets"],
        examTips: [
            "Site-to-Site VPN uses the public internet with IPSec encryption — it is quick to set up but bandwidth is limited and latency varies",
            "Direct Connect provides a dedicated private circuit — consistent bandwidth, lower latency, but takes weeks to provision and costs more",
            "Virtual Private Gateway (VGW) is attached to one VPC; use Transit Gateway for VPN access to multiple VPCs from one on-premises connection",
            "Route propagation on the VPC route table automatically adds on-premises CIDRs advertised by BGP — no manual route entries needed",
            "DX supports Public VIF (access AWS public endpoints), Private VIF (access VPC private IPs), and Transit VIF (access via TGW)",
        ],
        roleJson: [
            {
                label: "AWS CLI — create Customer Gateway, Virtual Private Gateway, and Site-to-Site VPN",
                note: "💡 Enable route propagation on the route table so on-premises CIDRs are automatically added via BGP — avoids manual static routes.",
                code: `# Step 1: Create Customer Gateway (on-premises router)
aws ec2 create-customer-gateway \\
  --type ipsec.1 \\
  --public-ip 203.0.113.10 \\
  --bgp-asn 65000 \\
  --tag-specifications 'ResourceType=customer-gateway,Tags=[{Key=Name,Value=marketplace-cgw}]'

# Step 2: Create Virtual Private Gateway and attach to marketplace-vpc
aws ec2 create-vpn-gateway \\
  --type ipsec.1 \\
  --tag-specifications 'ResourceType=vpn-gateway,Tags=[{Key=Name,Value=marketplace-vgw}]'

aws ec2 attach-vpn-gateway \\
  --vpn-gateway-id vgw-0marketplace123 \\
  --vpc-id vpc-0marketplace123

# Step 3: Create Site-to-Site VPN connection
aws ec2 create-vpn-connection \\
  --type ipsec.1 \\
  --customer-gateway-id cgw-0marketplace \\
  --vpn-gateway-id vgw-0marketplace123 \\
  --options StaticRoutesOnly=false

# Step 4: Enable route propagation on private route table
aws ec2 enable-vgw-route-propagation \\
  --route-table-id rtb-marketplace-private \\
  --gateway-id vgw-0marketplace123`,
            },
        ],
        cdkCode: [
            {
                label: "CDK — Site-to-Site VPN with Virtual Private Gateway and route propagation",
                note: "ec2.Vpc.addVpnConnection() creates the VGW, attaches it to the VPC, and establishes the VPN connection in one call. Route propagation is enabled via vpnRoutePropagation on the VPC construct.",
                code: `import * as ec2 from 'aws-cdk-lib/aws-ec2';

const vpc = ec2.Vpc.fromLookup(this, 'MarketplaceVpc', { vpcName: 'marketplace-vpc' });

// Creates VGW, attaches it, and creates two IPSec tunnels automatically
const vpnConnection = vpc.addVpnConnection('OnPremVpn', {
  ip: '203.0.113.10',           // on-premises router public IP
  asn: 65000,                   // on-premises BGP ASN
  tunnelOptions: [
    { preSharedKey: 'marketplace-vpn-psk-1' },
    { preSharedKey: 'marketplace-vpn-psk-2' },
  ],
});

// Enable BGP route propagation on private route table
// so on-premises CIDRs (192.168.0.0/16) are automatically added
const vpnGateway = new ec2.VpnGateway(this, 'VpnGateway', {
  type: 'ipsec.1',
  amazonSideAsn: 64512,
});

// For Direct Connect: use aws-cdk-lib/aws-directconnect (CfnVirtualInterface)
// Note: DX physical circuit must be ordered separately via AWS Console or DX partner`,
            },
        ],
    },
    {
        id: 9,
        analogy: "Think of it like a landlord sharing one large office floor with multiple tenants — each tenant has their own desks and equipment in the shared space, they can talk to each other directly across the room, but the landlord controls the floor plan and the exits.",
        icon: "🤝",
        color: ACCENT.amber,
        tag: "SCENARIO 9",
        title: "AWS Resource Access Manager (RAM) — Subnet Sharing",
        subtitle: "Share marketplace-vpc subnets across accounts so all EC2s live in the same VPC",
        useCase: {
            title: "AMI PVT LTD Marketplace — sharing a private subnet with the analytics account via RAM",
            story: "AMI PVT LTD runs the marketplace-analytics account (SharedServices OU) separately from marketplace-prod (234567890123). The analytics pipeline needs EC2 instances that can directly communicate with the Spring Boot API fleet inside marketplace-vpc — the same VPC, same subnets, no VPC peering, no Transit Gateway overhead. Instead of duplicating the VPC in the analytics account or setting up peering, marketplace-prod uses AWS RAM to share marketplace-private-subnet-1a (10.0.10.0/24) with the marketplace-analytics account. The analytics account can then launch EC2 instances directly into that shared subnet. All instances — owned by different accounts — share the same VPC routing, security groups references, and private IP space. AMI PVT LTD pays nothing extra for RAM itself.",
            diagram: [
                { actor: "marketplace-prod (234567890123) — VPC Owner", icon: "🏢" },
                { arrow: "RAM Resource Share: share marketplace-private-subnet-1a" },
                { actor: "AWS Resource Access Manager (RAM)", icon: "🤝" },
                { arrow: "grants subnet participant access to marketplace-analytics" },
                { actor: "marketplace-analytics account — launches EC2 into shared subnet", icon: "📊" },
                { arrow: "same VPC, same private IP range, direct communication" },
                { actor: "marketplace-api-asg EC2 ↔ analytics EC2 (both in 10.0.10.0/24)", icon: "🔗" },
            ],
        },
        buildSystem: [
            "In marketplace-prod (234567890123): open RAM console → Create Resource Share named 'marketplace-subnet-share'",
            "Select resource type 'Subnets' and choose marketplace-private-subnet-1a (10.0.10.0/24) as the shared resource",
            "Specify the principal: add the marketplace-analytics AWS account ID or the entire SharedServices OU ARN from AWS Organizations",
            "If sharing within the same AWS Organization, enable the 'Enable sharing with AWS Organizations' setting in RAM — no invitation acceptance needed",
            "If sharing with an external account, the recipient must accept the Resource Share invitation before they can use the subnet",
            "In marketplace-analytics account: confirm the shared subnet appears in the VPC console under 'Subnets' (marked as 'Shared')",
            "The analytics team launches EC2 instances into the shared subnet specifying the subnet ID — the instances get IPs from 10.0.10.0/24",
            "VPC owner (marketplace-prod) retains full control: they can modify or delete the subnet, and VPC-level route tables and NACLs still apply",
        ],
        flow: ["VPC Owner creates Resource Share", "Specifies Subnet Resource", "Specifies Analytics Account", "Participant Launches EC2 into Shared Subnet", "All EC2s Communicate Directly in Same VPC"],
        examTips: [
            "RAM subnet sharing lets multiple accounts launch resources into the SAME VPC subnet — no VPC peering or TGW required for inter-account communication within the same VPC",
            "The VPC owner retains control of route tables, NACLs, and the subnet itself; participants can only launch resources into the shared subnet",
            "Participants cannot modify the shared subnet, route tables, or NACLs — only the VPC owner can change these",
            "RAM can share Transit Gateways, subnets, Route 53 Resolver rules, License Manager configs, and more — subnet sharing is the most common VPC use case",
            "RAM is free — there is no additional charge for using RAM to share resources",
            "Sharing within an AWS Organization requires enabling 'sharing with Organizations' in RAM; sharing with external accounts requires an invitation and acceptance",
        ],
        roleJson: [
            {
                label: "AWS CLI — create RAM Resource Share for marketplace-private-subnet-1a",
                note: "💡 If all accounts are in the same AWS Organization, use the OU ARN as the principal — new accounts added to the OU automatically get access.",
                code: `# Step 1: Enable RAM sharing with AWS Organizations (run once in management account)
aws ram enable-sharing-with-aws-organization

# Step 2: In marketplace-prod (234567890123) — create resource share
aws ram create-resource-share \\
  --name "marketplace-subnet-share" \\
  --resource-arns "arn:aws:ec2:ap-southeast-1:234567890123:subnet/subnet-private1a" \\
  --principals "arn:aws:organizations::123456789012:ou/o-marketplace/ou-xxxx-sharedservices" \\
  --allow-external-principals false \\
  --tags key=Name,value=marketplace-subnet-share

# Step 3: Verify the share is active
aws ram get-resource-shares \\
  --resource-owner SELF \\
  --query "resourceShares[?name=='marketplace-subnet-share'].status"

# Step 4: In marketplace-analytics account — confirm shared subnet is visible
aws ec2 describe-subnets \\
  --filters "Name=owner-id,Values=234567890123" \\
  --query "Subnets[*].{SubnetId:SubnetId,CIDR:CidrBlock,OwnerId:OwnerId}"`,
            },
        ],
        cdkCode: [
            {
                label: "CDK — RAM Resource Share to share marketplace-private-subnet-1a with analytics account",
                note: "ram.CfnResourceShare accepts a subnet ARN as the resource and the target account ID or OU ARN as the principal. Deploying within an Organization removes the need for invitation acceptance.",
                code: `import * as ram from 'aws-cdk-lib/aws-ram';

// Deployed in the marketplace-prod account (234567890123)
const subnetShare = new ram.CfnResourceShare(this, 'MarketplaceSubnetShare', {
  name: 'marketplace-subnet-share',
  resourceArns: [
    'arn:aws:ec2:ap-southeast-1:234567890123:subnet/subnet-private1a',
  ],
  principals: [
    // Share with the entire SharedServices OU — new accounts added to OU get access automatically
    'arn:aws:organizations::123456789012:ou/o-marketplace/ou-xxxx-sharedservices',
  ],
  allowExternalPrincipals: false,
  tags: [{ key: 'Name', value: 'marketplace-subnet-share' }],
});

// Note: run 'aws ram enable-sharing-with-aws-organization' once in the management account
// before any RAM shares work within the same Organization without invitation acceptance`,
            },
        ],
    },

    {
        id: 10,
        analogy: "Think of it like a two-door office building — the front door (Security Group A) faces the street and lets in any visitor with a valid appointment (HTTPS on port 443). The server room door (Security Group B) is deep inside the building and will only open for a badge that was issued at the front door — not for anyone who walked in through the car park, a window, or a side entrance. The badge is the security group itself, not the floor they came from.",
        icon: "🔒",
        color: ACCENT.teal,
        tag: "SCENARIO 10",
        title: "Two-Tier Security Group Chaining",
        subtitle: "Most secure web-to-database SG design — referencing SG-A as the source in SG-B",
        useCase: {
            title: "AMI PVT LTD Marketplace — locking the MSSQL database tier so only web-tier EC2s can connect, blocking all other sources including the internet",
            story: "AMI PVT LTD acquired a startup whose flagship product ran on a classic two-tier architecture: IIS web servers in public subnets (ap-southeast-1a and ap-southeast-1b) listening on port 443, backed by MSSQL database instances in private subnets listening on port 1433. The DevOps team migrates this architecture into marketplace-vpc and must configure the most secure Security Group rules. Security Group A (marketplace-web-sg) is assigned to all web server EC2 instances. Security Group B (marketplace-db-sg) is assigned to all MSSQL EC2 instances. The exam question tests whether the team knows to reference SG-A as the inbound source in SG-B — instead of using a VPC CIDR — so only instances wearing SG-A can ever reach the database on port 1433, regardless of which subnet or IP they come from.",
            diagram: [
                { actor: "Internet (0.0.0.0/0)", icon: "🌐" },
                { arrow: "SG-A inbound: allow TCP 443 from 0.0.0.0/0" },
                { actor: "Web Server EC2 — public subnets AZ-a & AZ-b [ Security Group A ]", icon: "🖥️" },
                { arrow: "SG-B inbound: allow TCP 1433 from Security Group A (SG reference, not CIDR)" },
                { actor: "MSSQL Database EC2 — private subnets AZ-a & AZ-b [ Security Group B ]", icon: "🗄️" },
            ],
        },
        buildSystem: [
            "Create Security Group A (marketplace-web-sg): inbound TCP 443 from 0.0.0.0/0 — web servers must accept HTTPS from the public internet; outbound allow all (default)",
            "Create Security Group B (marketplace-db-sg): inbound TCP 1433 from SOURCE = marketplace-web-sg (SG reference) — only EC2 instances assigned SG-A can reach the database; outbound allow all (default)",
            "Never use the VPC CIDR (e.g. 10.0.0.0/16) as the source in SG-B — this would allow every resource in the VPC (bastion hosts, Lambda, other EC2s) to reach the MSSQL port, not just web servers",
            "Never use 0.0.0.0/0 as the source on port 1433 in SG-B — this exposes the database directly to the internet",
            "Confirm SGs are stateful: when a web server EC2 (SG-A) initiates a connection to MSSQL port 1433, the response traffic back on the ephemeral port is automatically allowed — no explicit outbound rule on SG-B needed",
            "Apply SG-A to all web tier instances at launch using the --security-group-ids parameter or via the Launch Template; apply SG-B to all database instances",
            "Optionally add a separate outbound rule on SG-A to explicitly allow TCP 1433 to SG-B (best-practice explicit allow) — even though outbound is open by default, explicit rules document intent",
            "Verify with VPC Reachability Analyzer: source = web EC2, destination = DB EC2 port 1433 → should show REACHABLE; source = internet gateway, destination = DB EC2 port 1433 → should show NOT REACHABLE",
        ],
        flow: ["Internet → SG-A (port 443 allowed)", "Web Server EC2 (wears SG-A)", "SG-B source = SG-A (port 1433)", "MSSQL DB EC2 (wears SG-B)", "Response auto-allowed (stateful)"],
        examTips: [
            "MOST SECURE answer = SG-B inbound allows port 1433 from Security Group A (SG reference) — this means ONLY instances wearing SG-A can reach the DB, regardless of IP, subnet, or AZ",
            "Using a VPC CIDR as the SG-B source is LESS SECURE — any resource in the VPC (not just web servers) could reach the database; always use an SG reference for inter-tier rules",
            "Security groups are STATEFUL — if a web server initiates a TCP connection to the DB on port 1433, the return packets on the ephemeral port (1024–65535) are automatically allowed back; no outbound rule on SG-B is required",
            "Security group rules are ALWAYS PERMISSIVE — you cannot write a DENY rule in a security group; to block traffic you must simply not add an ALLOW rule (unlike NACLs which support explicit DENY)",
            "The correct two answers for this type of exam question are always: (1) SG-A inbound port 443 from 0.0.0.0/0, and (2) SG-B inbound port 1433 from SG-A — not from a CIDR range",
        ],
        roleJson: [
            {
                label: "AWS CLI — create SG-A (web, port 443) and SG-B (MSSQL port 1433 from SG-A only)",
                note: "💡 In --ip-permissions, use UserIdGroupPairs with the GroupId of SG-A as the source for SG-B — this is the SG reference that makes the rule follow the security group, not a static IP range.",
                code: `# Step 1 — Create Security Group A for web servers
aws ec2 create-security-group \\
  --group-name marketplace-web-sg \\
  --description "Web tier — allow HTTPS from internet" \\
  --vpc-id vpc-marketplace123 \\
  --region ap-southeast-1
# Returns: sg-WEBSGID

# Step 2 — Allow inbound HTTPS (port 443) from the internet on SG-A
aws ec2 authorize-security-group-ingress \\
  --group-id sg-WEBSGID \\
  --protocol tcp \\
  --port 443 \\
  --cidr 0.0.0.0/0 \\
  --region ap-southeast-1

# Step 3 — Create Security Group B for MSSQL database instances
aws ec2 create-security-group \\
  --group-name marketplace-db-sg \\
  --description "DB tier — allow MSSQL from web SG only" \\
  --vpc-id vpc-marketplace123 \\
  --region ap-southeast-1
# Returns: sg-DBSGID

# Step 4 — Allow inbound MSSQL (port 1433) from SG-A ONLY (SG reference — not CIDR)
aws ec2 authorize-security-group-ingress \\
  --group-id sg-DBSGID \\
  --ip-permissions '[{
    "IpProtocol": "tcp",
    "FromPort": 1433,
    "ToPort": 1433,
    "UserIdGroupPairs": [{
      "GroupId": "sg-WEBSGID",
      "Description": "MSSQL from marketplace-web-sg only — never from 0.0.0.0/0"
    }]
  }]' \\
  --region ap-southeast-1

# Verify rules — confirm no 0.0.0.0/0 or VPC CIDR source on port 1433
aws ec2 describe-security-groups \\
  --group-ids sg-DBSGID \\
  --query 'SecurityGroups[0].IpPermissions' \\
  --region ap-southeast-1`,
            },
        ],
        cdkCode: [
            {
                label: "CDK (TypeScript) — SG-A (web port 443) and SG-B (MSSQL port 1433 from SG-A reference)",
                note: "💡 Pass the SecurityGroup object directly as the peer in addIngressRule() — CDK translates this to a UserIdGroupPairs reference in CloudFormation, not a hardcoded CIDR.",
                code: `import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class MarketplaceTwoTierSgStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'MarketplaceVpc', { vpcName: 'marketplace-vpc' });

    // Security Group A — web servers in public subnets, accept HTTPS from internet
    const webSg = new ec2.SecurityGroup(this, 'WebSg', {
      vpc,
      securityGroupName: 'marketplace-web-sg',
      description: 'Web tier EC2 — allow HTTPS 443 from internet',
      allowAllOutbound: true,
    });
    webSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS from internet'
    );

    // Security Group B — MSSQL database in private subnets
    // Source is webSg (SG object reference) — NOT a CIDR, NOT 0.0.0.0/0
    const dbSg = new ec2.SecurityGroup(this, 'DbSg', {
      vpc,
      securityGroupName: 'marketplace-db-sg',
      description: 'DB tier EC2 — allow MSSQL 1433 from web SG only',
      allowAllOutbound: true,
    });
    dbSg.addIngressRule(
      webSg,                    // SG reference — only instances wearing webSg can connect
      ec2.Port.tcp(1433),
      'Allow MSSQL from marketplace-web-sg only'
    );

    // Launch web server in public subnet with SG-A
    new ec2.Instance(this, 'WebServer', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      machineImage: ec2.MachineImage.latestWindows(ec2.WindowsVersion.WINDOWS_SERVER_2022_ENGLISH_FULL_BASE),
      securityGroup: webSg,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // Launch MSSQL server in private subnet with SG-B
    new ec2.Instance(this, 'MssqlServer', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.R6I, ec2.InstanceSize.LARGE),
      machineImage: ec2.MachineImage.latestWindows(ec2.WindowsVersion.WINDOWS_SERVER_2022_ENGLISH_FULL_BASE),
      securityGroup: dbSg,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });
  }
}`,
            },
        ],
    },
];

export default scenarios;
