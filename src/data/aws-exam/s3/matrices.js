import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Amazon S3 & Glacier comparison matrices
 * marketplace-prod account: 234567890123
 * customer-account: 987654321098
 * management account: 123456789012
 */

const matrices = [
    {
        id: "s3-storage-classes",
        title: "S3 Storage Classes",
        subtitle: "Cost, retrieval time, and minimum duration for every S3 storage class used in the AMI PVT LTD marketplace",
        color: ACCENT.primary,
        columns: ["Class", "Min storage duration", "Retrieval time", "Use case"],
        rows: [
            [
                "S3 Standard",
                "None",
                "Milliseconds",
                "Active Lambda ZIPs and CloudFormation templates in marketplace-tool-artifacts during customer provisioning; product images in marketplace-products-bucket",
            ],
            [
                "S3 Intelligent-Tiering",
                "None (monitoring fee per object)",
                "Milliseconds (frequent/infrequent tier); minutes (Archive tiers)",
                "marketplace-staging-bucket objects with unpredictable access patterns; auto-moves between frequent and infrequent access tiers with no retrieval fee",
            ],
            [
                "S3 Standard-IA (Infrequent Access)",
                "30 days",
                "Milliseconds",
                "Tool ZIP versions older than 90 days in marketplace-tool-artifacts; noncurrent product image versions in marketplace-products-bucket",
            ],
            [
                "S3 One Zone-IA",
                "30 days",
                "Milliseconds",
                "Recreatable secondary thumbnails or cache-warm data; NOT suitable for marketplace-tool-artifacts which requires multi-AZ durability",
            ],
            [
                "S3 Glacier Instant Retrieval",
                "90 days",
                "Milliseconds",
                "Quarterly compliance reports that must still be accessible immediately on demand; accessed once per quarter but retrieval latency must be low",
            ],
            [
                "S3 Glacier Flexible Retrieval",
                "90 days",
                "Minutes (Expedited) / 3–5 hrs (Standard) / 5–12 hrs (Bulk)",
                "marketplace-tool-artifacts/audit-logs/ after 30 days; completed order logs for compliance review requested occasionally",
            ],
            [
                "S3 Glacier Deep Archive",
                "180 days",
                "12 hrs (Standard) / 48 hrs (Bulk)",
                "marketplace-audit-vault long-term logs after 180 days; 7-year WORM retention for financial and regulatory compliance audit trails",
            ],
            [
                "S3 Reduced Redundancy (RRS)",
                "None",
                "Milliseconds",
                "Deprecated — not recommended for new workloads; use S3 Standard or One Zone-IA instead; kept for legacy reference only",
            ],
        ],
    },
    {
        id: "s3-security-controls",
        title: "S3 Security Controls",
        subtitle: "Every security mechanism used to protect marketplace-products-bucket and marketplace-tool-artifacts",
        color: ACCENT.teal,
        columns: ["Control", "Scope", "Key detail"],
        rows: [
            [
                "Bucket Policy (resource-based)",
                "Entire bucket or specific object prefixes",
                "JSON policy attached to the bucket; grants or denies access to specific AWS principals (accounts, roles, services). Used on marketplace-tool-artifacts to allow cross-account read by customer-account (987654321098) for specific tool prefixes.",
            ],
            [
                "ACL (Access Control List)",
                "Individual objects or buckets",
                "Legacy per-object or per-bucket access control. AWS recommends disabling ACLs (Object Ownership=BucketOwnerEnforced) and using bucket policies instead. marketplace-products-bucket uses BucketOwnerEnforced.",
            ],
            [
                "Block Public Access (BPA)",
                "Account level or per bucket",
                "Four settings that block public bucket policies and ACLs. Enable all four on every AMI PVT LTD bucket — marketplace-tool-artifacts and marketplace-products-bucket must never be publicly accessible. BPA overrides any permissive bucket policy.",
            ],
            [
                "Pre-signed URLs",
                "Individual objects, time-limited",
                "A URL signed by an IAM identity that grants temporary GET (or PUT) access to a private object. marketplace-order-processor Lambda generates 15-minute pre-signed URLs for purchased tool ZIPs from marketplace-tool-artifacts without making the bucket public.",
            ],
            [
                "VPC Gateway Endpoint Policy",
                "Requests via marketplace-s3-endpoint only",
                "An endpoint policy on the S3 gateway endpoint restricts which buckets EC2/Lambda in the VPC can access. Prevents data exfiltration to arbitrary S3 buckets from inside marketplace-vpc.",
            ],
            [
                "MFA Delete",
                "Permanent version deletion and versioning changes",
                "Requires the bucket owner's root account MFA code to permanently delete a versioned object or disable versioning. Enabled on marketplace-products-bucket to protect against compromised IAM credentials performing irreversible deletions.",
            ],
            [
                "S3 Object Lock (WORM)",
                "Individual objects or bucket default",
                "Prevents object deletion or overwrite for a fixed retention period. Compliance mode: even root cannot delete. Governance mode: users with special permission can bypass. Used on compliance audit exports in marketplace-tool-artifacts.",
            ],
            [
                "Server-Side Encryption (SSE-S3 / SSE-KMS)",
                "All objects in the bucket",
                "SSE-S3 uses AWS-managed keys (AES-256, free). SSE-KMS uses a customer-managed KMS key — enables audit of key usage via CloudTrail and supports key rotation. marketplace-tool-artifacts uses SSE-KMS with a CMK for envelope encryption of Lambda ZIPs.",
            ],
        ],
    },
    {
        id: "s3-key-numbers",
        title: "S3 Key Numbers",
        subtitle: "Exam-critical limits, thresholds, and performance facts for AMI PVT LTD architecture",
        color: ACCENT.amber,
        columns: ["Item", "Value", "Exam note"],
        rows: [
            [
                "Max object size",
                "5 TB per object",
                "A single PUT can upload up to 5 GB; objects larger than 5 GB MUST use Multipart Upload. Lambda ZIPs in marketplace-tool-artifacts are <250 MB so single-part PUT is fine.",
            ],
            [
                "Multipart Upload recommended threshold",
                "Recommended: >100 MB; Required: >5 GB",
                "AWS recommends Multipart Upload for objects >100 MB for better throughput and resilience. Mandatory for objects >5 GB. S3 Transfer Acceleration also benefits from Multipart.",
            ],
            [
                "Max buckets per account (default)",
                "100 buckets (soft limit)",
                "Can be increased via Service Quotas to 1,000. AMI PVT LTD uses separate buckets per environment and function (marketplace-tool-artifacts, marketplace-products-bucket, marketplace-staging-bucket) — well within limits.",
            ],
            [
                "S3 request rate (prefix)",
                "3,500 PUT/COPY/POST/DELETE per second; 5,500 GET/HEAD per second per prefix",
                "Performance is per prefix, not per bucket. Distributing objects across multiple prefixes (tools/a/, tools/b/) in marketplace-tool-artifacts scales read throughput horizontally.",
            ],
            [
                "Lifecycle transition minimum (Standard-IA / One Zone-IA)",
                "30 days from creation",
                "Objects in S3 Standard must be at least 30 days old before they can be transitioned to Standard-IA or One Zone-IA in a lifecycle rule. marketplace-tool-artifacts lifecycle rule starts at day 90.",
            ],
            [
                "Lifecycle transition minimum (Glacier Instant / Flexible / Deep Archive)",
                "No minimum from S3 Standard; 90 days min after Glacier Instant; 180 days min for Deep Archive objects",
                "Deep Archive has a 180-day minimum storage duration — objects deleted before 180 days are still charged for the full 180 days.",
            ],
            [
                "CRR / SRR replication lag",
                "Most objects replicate in seconds; RTC SLA: 99.99% within 15 minutes",
                "Standard replication has no SLA — enable Replication Time Control (RTC) for a 15-minute SLA with CloudWatch metrics. RTC adds cost on top of standard replication pricing.",
            ],
            [
                "S3 Transfer Acceleration",
                "Uses CloudFront edge locations for upload acceleration",
                "Speeds up long-distance uploads by routing through the nearest CloudFront PoP over the AWS backbone. Useful for enterprise customers in Europe uploading large tool packages to marketplace-tool-artifacts (ap-southeast-1).",
            ],
            [
                "Requester Pays",
                "Requester pays data transfer and request costs",
                "When Requester Pays is enabled, the requester (not the bucket owner) pays for downloads and requests. Useful for marketplace-tool-artifacts if AMI PVT LTD wants customers to bear the egress cost of downloading tool ZIPs.",
            ],
            [
                "S3 Consistency model",
                "Strong read-after-write consistency for all operations (since Dec 2020)",
                "After a successful PUT or DELETE, any subsequent GET or LIST immediately reflects the change. No eventual consistency window — safe to read immediately after write in marketplace-order-processor.",
            ],
        ],
    },
];

export default matrices;
