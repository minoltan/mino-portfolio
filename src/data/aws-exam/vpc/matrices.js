import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Amazon VPC comparison matrices
 * Account A (AMI PVT LTD): 123456789012  |  Account B (customer): 987654321098
 */

const matrices = [
    {
        id: "sg-vs-nacl",
        title: "Security Group vs NACL Comparison",
        subtitle: "Stateful instance-level vs stateless subnet-level traffic controls in marketplace-vpc",
        color: ACCENT.primary,
        columns: ["Feature", "Security Group", "NACL"],
        rows: [
            [
                "Scope",
                "Attached to an ENI / EC2 instance (e.g. marketplace-api-sg on each EC2)",
                "Attached to a subnet (e.g. marketplace-private-nacl on 10.0.10.0/24)",
            ],
            [
                "State",
                "Stateful — return traffic is automatically allowed without an explicit rule",
                "Stateless — return traffic requires an explicit allow rule (e.g. ephemeral ports 1024–65535)",
            ],
            [
                "Rule evaluation",
                "All rules are evaluated together; the most permissive matching rule applies",
                "Rules evaluated in ascending number order; first match wins and stops further evaluation",
            ],
            [
                "Allow / Deny",
                "Allow rules only — there is no Deny rule in a security group",
                "Both Allow and Deny rules — use Deny to block a specific malicious CIDR (e.g. 198.51.100.0/24)",
            ],
            [
                "Default behavior (custom)",
                "Default: deny all inbound, allow all outbound — must add rules to permit traffic",
                "Default custom NACL: deny all inbound and outbound — must add rules to permit traffic",
            ],
            [
                "Default behavior (VPC default)",
                "Default SG: allow all inbound from same SG, allow all outbound",
                "Default NACL: allow all inbound and outbound (rule 100 allow all)",
            ],
            [
                "Apply timing",
                "Applied before traffic reaches the instance — evaluated at the ENI",
                "Applied at the subnet boundary — evaluated before and after routing",
            ],
            [
                "Rule count",
                "Up to 60 inbound + 60 outbound rules per SG (default); up to 5 SGs per ENI",
                "Up to 20 inbound + 20 outbound rules per NACL (default); soft limit increase available",
            ],
            [
                "AMI PVT LTD example",
                "marketplace-api-sg: allow TCP 8080 inbound from marketplace-alb-sg only",
                "marketplace-private-nacl: rule 100 DENY inbound 198.51.100.0/24 for DDoS mitigation",
            ],
        ],
    },
    {
        id: "vpc-endpoint-types",
        title: "VPC Endpoint Types",
        subtitle: "Gateway, Interface, and PrivateLink options used in the AMI PVT LTD marketplace",
        color: ACCENT.teal,
        columns: ["Type", "Services", "Cost", "Use case", "AMI PVT LTD example"],
        rows: [
            [
                "Gateway endpoint",
                "Amazon S3 and Amazon DynamoDB only",
                "Free — no hourly charge and no data processing charge",
                "Keep S3/DynamoDB traffic inside the AWS backbone; remove those routes from NAT Gateway to reduce cost",
                "marketplace-s3-endpoint (artifacts bucket) and marketplace-dynamodb-endpoint (tool metadata table) in marketplace-private-rt",
            ],
            [
                "Interface endpoint (AWS PrivateLink)",
                "Most AWS services — SQS, SNS, SSM, Secrets Manager, ECR, CloudWatch, etc.",
                "$0.01/hr per AZ per endpoint + $0.01/GB data processed (ap-southeast-1 rates)",
                "Private connectivity to AWS services from Lambda or EC2 in private subnets without NAT or internet gateway",
                "marketplace-sqs-endpoint in private subnet — Lambdas and Spring Boot access SQS without internet; Private DNS enabled",
            ],
            [
                "PrivateLink (custom endpoint service)",
                "Customer-defined NLB-backed services shared across accounts or with customers",
                "Provider side: no charge; consumer side: same as Interface endpoint — hourly + data processing",
                "Expose an internal API to other AWS accounts privately; overlapping CIDRs are allowed unlike VPC peering",
                "marketplace-api-endpoint-service backed by marketplace-nlb; enterprise customers (Account B: 987654321098) connect via Interface Endpoint in their VPC",
            ],
        ],
    },
    {
        id: "vpc-cidr-facts",
        title: "VPC CIDR & Subnet Key Facts",
        subtitle: "Exam-critical numbers and traps for marketplace-vpc design",
        color: ACCENT.amber,
        columns: ["Concept", "Detail", "Exam trap"],
        rows: [
            [
                "VPC CIDR block size",
                "Allowed range: /16 (65 536 IPs) to /28 (16 IPs); marketplace-vpc uses /16 (10.0.0.0/16)",
                "Cannot create a VPC with a /15 or larger; /28 is the smallest allowed — smaller blocks cannot be used",
            ],
            [
                "Reserved IPs per subnet",
                "AWS reserves 5 IP addresses in every subnet: .0 (network), .1 (VPC router), .2 (DNS), .3 (future), .255 (broadcast)",
                "A /28 subnet has 16 IPs but only 11 usable; a /24 has 256 IPs but only 251 usable — subtract 5 for every subnet",
            ],
            [
                "Default VPC CIDR",
                "AWS creates a default VPC in each Region with CIDR 172.31.0.0/16 and /20 subnets in each AZ",
                "172.31.0.0/16 is the default VPC, not 10.0.0.0/16; the marketplace uses a custom VPC to avoid conflicts with customer VPCs",
            ],
            [
                "Max subnets per VPC",
                "200 subnets per VPC by default (soft limit; can be increased)",
                "There is no hard limit of one subnet per AZ; you can have multiple subnets in the same AZ",
            ],
            [
                "AZ per subnet rule",
                "A subnet spans exactly ONE Availability Zone and cannot span multiple AZs",
                "A VPC spans all AZs in a Region — the AZ restriction is at the subnet level, not the VPC level",
            ],
            [
                "Secondary CIDR blocks",
                "A VPC can have up to 5 IPv4 CIDR blocks (primary + 4 secondary); useful for VPC expansion",
                "Secondary CIDRs cannot overlap with any existing CIDR in the VPC or any peered VPC",
            ],
            [
                "VPC peering CIDR requirement",
                "CIDRs of peered VPCs must not overlap even partially; marketplace-prod (10.0.0.0/16) and marketplace-analytics (10.1.0.0/16) are non-overlapping",
                "PrivateLink does NOT require non-overlapping CIDRs — only VPC peering and Transit Gateway attachments have this constraint",
            ],
            [
                "IPv6 CIDR",
                "VPCs can have an IPv6 /56 CIDR; subnets get /64; IPv6 addresses are globally unique and always public-routable",
                "IPv6 addresses on EC2 are always public — there is no NAT for IPv6; use Egress-Only Internet Gateway for IPv6 outbound-only access",
            ],
        ],
    },
    {
        id: "vpc-connectivity-comparison",
        title: "VPC Connectivity Options Comparison",
        subtitle: "VPC Peering vs Transit Gateway vs PrivateLink vs VPN vs Direct Connect",
        color: ACCENT.purple,
        columns: ["Feature", "VPC Peering", "Transit Gateway", "PrivateLink", "Site-to-Site VPN", "Direct Connect"],
        rows: [
            [
                "Transitive routing",
                "❌ Non-transitive — traffic cannot flow through a peered VPC to a third VPC",
                "✅ Transitive — all attachments can route to each other through the TGW hub",
                "N/A — one-directional service exposure, not general routing",
                "❌ Non-transitive via VGW; use TGW for multi-VPC VPN",
                "❌ Non-transitive via VGW; use TGW Transit VIF for multi-VPC DX",
            ],
            [
                "Overlapping CIDRs allowed",
                "❌ No — even partial CIDR overlap prevents the peering connection",
                "❌ No — TGW route tables require unique CIDRs per attachment",
                "✅ Yes — service consumer and provider CIDRs can overlap",
                "❌ No — on-premises and VPC CIDRs must not overlap",
                "❌ No — on-premises and VPC CIDRs must not overlap",
            ],
            [
                "Cross-account support",
                "✅ Yes — peering works cross-account and cross-Region",
                "✅ Yes — share TGW across accounts via RAM",
                "✅ Yes — designed for cross-account service exposure",
                "✅ Yes — Customer Gateway can be in any account",
                "✅ Yes — hosted connections and VIFs can be cross-account",
            ],
            [
                "Cross-Region support",
                "✅ Yes — inter-Region peering available (encrypted in transit)",
                "✅ Yes — TGW peering between Regions",
                "✅ Yes — with multi-Region NLB backends",
                "✅ Yes — VPN over public internet is Region-agnostic",
                "✅ Yes — via DX Gateway spanning multiple Regions",
            ],
            [
                "On-premises connectivity",
                "❌ Not designed for on-premises connectivity",
                "✅ Yes — VPN and DX attachments on TGW reach all connected VPCs",
                "❌ Not designed for on-premises — requires VPC consumer",
                "✅ Yes — primary use case; IPSec over public internet",
                "✅ Yes — dedicated physical circuit; consistent bandwidth",
            ],
            [
                "Bandwidth & latency",
                "No additional overhead — native VPC-level routing within AWS",
                "Up to 50 Gbps per VPC attachment; slight latency for hub routing",
                "Backed by NLB — up to 100 Gbps; very low latency",
                "Variable — shared public internet; typically 1–4 Gbps max",
                "Dedicated — 1 Gbps, 10 Gbps, or 100 Gbps; consistent low latency",
            ],
            [
                "Cost model",
                "Data transfer charge per GB; no hourly fee",
                "Hourly per attachment + per GB data processed",
                "Consumer: hourly per AZ + per GB; Provider: no charge",
                "Hourly per VPN connection + standard data transfer",
                "Port hours + data transfer; higher setup cost",
            ],
            [
                "Setup complexity",
                "Low — create connection, accept, update 2× route tables",
                "Medium — create TGW, attachments, update route tables in each VPC",
                "Medium — NLB backend, endpoint service, approval, consumer endpoint",
                "Low-Medium — CGW, VGW, VPN connection, on-premises router config",
                "High — physical circuit order, DX location, VIF provisioning (weeks)",
            ],
            [
                "Encryption",
                "Not encrypted by default within the same Region; inter-Region peering is encrypted",
                "Not encrypted — use VPN attachment or MACsec on DX for encryption over TGW",
                "Traffic stays on AWS private backbone — not publicly exposed; no IPSec",
                "✅ Always IPSec encrypted over the public internet",
                "Not encrypted by default — use MACsec on dedicated DX or add VPN over DX for encryption",
            ],
            [
                "AMI PVT LTD use case",
                "marketplace-prod ↔ marketplace-analytics (2 VPC, same account, non-overlapping)",
                "marketplace-prod + analytics + dev + dr VPCs + on-premises hub via marketplace-tgw",
                "marketplace-api-endpoint-service — enterprise customers connect without VPC peering or CIDR constraints",
                "Interim on-premises connectivity; finance team accesses billing API while DX is provisioned",
                "Long-term 1 Gbps dedicated circuit; replaces VPN once provisioned; used for bulk data sync",
            ],
        ],
    },
];

export default matrices;
