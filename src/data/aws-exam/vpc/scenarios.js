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
    },

    {
        id: 2,
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
    },

    {
        id: 3,
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
    },

    {
        id: 4,
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
    },

    {
        id: 5,
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
    },

    {
        id: 6,
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
    },
];

export default scenarios;
