import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Amazon S3 & Glacier scenarios
 *
 * Source study topic: Amazon S3 and Glacier (SAA-C03), grounded in the
 * AMI PVT LTD multi-tenant SaaS marketplace running in ap-southeast-1.
 * marketplace-prod account: 234567890123
 * customer-account: 987654321098
 * management account: 123456789012
 */

const scenarios = [
    {
        id: 1,
        analogy: "Think of it like your email inbox — recent emails stay in your main inbox (Standard), older ones move to an archive folder (Standard-IA), and after a year they're automatically deleted or put in deep cold storage (Glacier) where retrieving them takes hours.",
        icon: "🗂️",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "S3 Storage Classes & Lifecycle",
        subtitle: "Automatically tier and expire marketplace-tool-artifacts over time",
        useCase: {
            title: "AMI PVT LTD Marketplace — lifecycle policy on marketplace-tool-artifacts",
            story: "marketplace-tool-artifacts stores Lambda deployment ZIPs, CloudFormation templates, and audit logs for the AMI PVT LTD platform. Newly uploaded ZIP files are accessed frequently during customer provisioning (S3 Standard). After 90 days, access drops sharply, so AMI PVT LTD applies a lifecycle rule to transition them to S3 Standard-IA (infrequent access). Versions older than 365 days expire and are deleted. Audit log prefixes (audit-logs/) are transitioned to Glacier Flexible Retrieval after 30 days and then to Glacier Deep Archive after 180 days for 7-year compliance retention. This combination reduces storage costs significantly while meeting regulatory requirements.",
            diagram: [
                { actor: "New Lambda ZIP uploaded to marketplace-tool-artifacts", icon: "📦" },
                { arrow: "Days 0–90: S3 Standard (frequent access during provisioning)" },
                { actor: "Lifecycle transition at day 90", icon: "🔄" },
                { arrow: "Days 90–365: S3 Standard-IA (infrequent, 30-day min charge)" },
                { actor: "Lifecycle expiry at day 365 (ZIPs) / Glacier archive (audit-logs/)", icon: "🗄️" },
            ],
        },
        buildSystem: [
            "Enable versioning on marketplace-tool-artifacts before configuring lifecycle — lifecycle transition rules require versioning for noncurrent versions",
            "Create lifecycle rule 'tier-tool-artifacts': filter prefix='' (all objects), transition to S3 Standard-IA after 90 days",
            "Add an expiration action to the same rule: expire current version after 365 days",
            "Create lifecycle rule 'expire-old-versions': NoncurrentVersionTransition to S3 Glacier Flexible Retrieval after 30 noncurrent days",
            "Create lifecycle rule 'archive-audit-logs': filter prefix='audit-logs/', transition to S3 Glacier Flexible Retrieval after 30 days",
            "Add a second transition on 'archive-audit-logs': transition to S3 Glacier Deep Archive after 180 days",
            "Use S3 Intelligent-Tiering for marketplace-staging-bucket objects where access patterns are unknown",
            "Enable S3 Storage Class Analysis on marketplace-tool-artifacts to observe access patterns before committing to lifecycle transitions",
        ],
        flow: ["S3 Standard (0–90d)", "S3 Standard-IA (90–365d)", "Expire / Glacier (365d+)", "Glacier Deep Archive (audit-logs/ 180d+)", "Vault Lock"],
        examTips: [
            "S3 Standard-IA and One Zone-IA have a 30-day minimum storage duration — transitioning objects before 30 days still incurs the full 30-day charge",
            "Glacier Flexible Retrieval has a 90-day minimum storage duration; Glacier Deep Archive has a 180-day minimum — lifecycle rules are only cost-effective when objects will be retained longer than the minimum",
            "Objects cannot be transitioned directly from S3 Standard to Glacier Instant/Flexible/Deep Archive in the same lifecycle rule if they are smaller than 128 KB — such objects are not cost-effective in Glacier",
            "Lifecycle rules require versioning to manage noncurrent versions separately from current versions — enable versioning before writing lifecycle rules",
            "S3 Intelligent-Tiering automatically moves objects between frequent and infrequent access tiers with no retrieval fee — ideal for unpredictable access patterns in marketplace-staging-bucket",
        ],
        roleJson: [
            {
                label: "AWS CLI — put lifecycle configuration on marketplace-tool-artifacts",
                note: "💡 Both the current-version transition and the noncurrent-version transition are separate actions in the same or different lifecycle rules.",
                code: `aws s3api put-bucket-lifecycle-configuration \\
  --bucket marketplace-tool-artifacts \\
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "tier-tool-artifacts",
        "Status": "Enabled",
        "Filter": { "Prefix": "" },
        "Transitions": [
          { "Days": 90, "StorageClass": "STANDARD_IA" }
        ],
        "Expiration": { "Days": 365 }
      },
      {
        "ID": "archive-audit-logs",
        "Status": "Enabled",
        "Filter": { "Prefix": "audit-logs/" },
        "Transitions": [
          { "Days": 30,  "StorageClass": "GLACIER" },
          { "Days": 180, "StorageClass": "DEEP_ARCHIVE" }
        ]
      },
      {
        "ID": "expire-old-versions",
        "Status": "Enabled",
        "Filter": { "Prefix": "" },
        "NoncurrentVersionTransitions": [
          { "NoncurrentDays": 30, "StorageClass": "GLACIER" }
        ],
        "NoncurrentVersionExpiration": { "NoncurrentDays": 365 }
      }
    ]
  }'`,
            },
        ],
    },

    {
        id: 2,
        analogy: "Think of it like a document shredder with an undo button — every time you update a file, the old copy is quietly kept in a drawer (versioning), accidental 'deletions' are just a sticky note on top that you can peel off, and MFA Delete is the padlock on that drawer that only the building owner can open.",
        icon: "🔁",
        color: ACCENT.teal,
        tag: "SCENARIO 2",
        title: "S3 Versioning & MFA Delete",
        subtitle: "Roll back product image updates and guard against accidental permanent deletion",
        useCase: {
            title: "AMI PVT LTD Marketplace — versioning and MFA Delete on marketplace-products-bucket",
            story: "marketplace-products-bucket stores product images, thumbnail sprites, and metadata JSON files that are displayed to customers across the marketplace UI. When a seller republishes an incorrect product image, AMI PVT LTD needs to roll back to the previous version without re-uploading. S3 Versioning keeps every PUT as a separate version. If the current version is deleted by mistake, the delete marker can be removed to restore the previous version. MFA Delete is enabled on the bucket so that permanently deleting a specific version or disabling versioning requires an MFA code from the bucket owner — protecting against both accidental deletion and compromised IAM credentials.",
            diagram: [
                { actor: "Seller uploads product-image-v2.jpg (overwrites v1)", icon: "🖼️" },
                { arrow: "S3 versioning keeps v1 and v2 as separate version IDs" },
                { actor: "marketplace-products-bucket (versioning=Enabled)", icon: "🪣" },
                { arrow: "Accidental delete creates a delete marker — v1 still exists" },
                { actor: "MFA Delete required to permanently remove a specific version", icon: "🔐" },
            ],
        },
        buildSystem: [
            "Enable versioning on marketplace-products-bucket: aws s3api put-bucket-versioning with Status=Enabled",
            "Enable MFA Delete simultaneously — MFA Delete can only be enabled/disabled by the bucket owner using the root account with an MFA device",
            "Update the marketplace-upload-role IAM policy to include s3:PutObject and s3:GetObject but NOT s3:DeleteObject on specific versions (requires MFA)",
            "Configure a lifecycle rule to expire delete markers that have no remaining noncurrent versions (clean up orphaned markers)",
            "Set a lifecycle rule to transition noncurrent versions to S3 Standard-IA after 30 days, then expire after 90 days",
            "Test rollback: upload a new product image, delete it (creates a delete marker), then remove the delete marker to restore the image",
            "Use aws s3api list-object-versions to enumerate versions and delete markers for a given object key",
            "Configure bucket replication after versioning is enabled to replicate marketplace-products-bucket to ap-south-1 for DR",
        ],
        flow: ["Upload v2 (creates new version)", "marketplace-products-bucket", "Accidental delete (delete marker)", "Remove delete marker", "v1 restored"],
        examTips: [
            "Once versioning is enabled on a bucket, it can only be suspended — it cannot be fully disabled; suspended versioning stops adding new versions but retains existing ones",
            "Deleting a versioned object without specifying a version ID creates a delete marker — the object is not permanently deleted and can be recovered by removing the marker",
            "MFA Delete requires the bucket owner's root account MFA — it cannot be enabled by IAM users or roles, even those with AdministratorAccess",
            "Each version of an object is billed separately — versioning can significantly increase storage costs if large objects are updated frequently; use lifecycle rules to expire noncurrent versions",
        ],
        roleJson: [
            {
                label: "AWS CLI — enable versioning and MFA Delete on marketplace-products-bucket",
                note: "💡 MFA Delete must be configured with root account credentials — use the serial number and TOTP code from the root MFA device.",
                code: `# Enable versioning (IAM user/role allowed)
aws s3api put-bucket-versioning \\
  --bucket marketplace-products-bucket \\
  --versioning-configuration Status=Enabled

# Enable MFA Delete (root account + MFA required)
aws s3api put-bucket-versioning \\
  --bucket marketplace-products-bucket \\
  --versioning-configuration Status=Enabled,MFADelete=Enabled \\
  --mfa "arn:aws:iam::234567890123:mfa/root-account-mfa-device 123456"

# List all versions of a specific product image
aws s3api list-object-versions \\
  --bucket marketplace-products-bucket \\
  --prefix "products/tool-xyz/hero-image.jpg"

# Restore a previous version by deleting the delete marker
aws s3api delete-object \\
  --bucket marketplace-products-bucket \\
  --key "products/tool-xyz/hero-image.jpg" \\
  --version-id dm-0abc123deleteMarkerVersionId \\
  --mfa "arn:aws:iam::234567890123:mfa/root-account-mfa-device 654321"`,
            },
        ],
    },

    {
        id: 3,
        analogy: "Think of it like a bank that photocopies every customer document and sends a copy to a secure vault in another city — if the main branch burns down, the other city still has everything safe, though any documents destroyed before the copying was set up are not automatically recreated.",
        icon: "🌏",
        color: ACCENT.amber,
        tag: "SCENARIO 3",
        title: "Cross-Region Replication (CRR)",
        subtitle: "Replicate marketplace-tool-artifacts to ap-south-1 for disaster recovery",
        useCase: {
            title: "AMI PVT LTD Marketplace — CRR from ap-southeast-1 to ap-south-1 for DR",
            story: "marketplace-tool-artifacts (ap-southeast-1, account 234567890123) contains Lambda ZIPs and CloudFormation templates that customers use to deploy marketplace tools into their accounts. To protect against an ap-southeast-1 regional disruption, AMI PVT LTD configures Cross-Region Replication (CRR) to a destination bucket marketplace-tool-artifacts-dr in ap-south-1 (same account). If ap-southeast-1 becomes unavailable, customers can be redirected to the DR bucket by updating a CloudFront origin. The replication IAM role (marketplace-s3-replication-role) has permissions to read from the source and write to the destination. Both buckets must have versioning enabled.",
            diagram: [
                { actor: "marketplace-tool-artifacts (ap-southeast-1, account 234567890123)", icon: "🪣" },
                { arrow: "CRR replication rule — all objects, storage class STANDARD_IA at destination" },
                { actor: "marketplace-s3-replication-role (sts:AssumeRole by s3.amazonaws.com)", icon: "🔑" },
                { arrow: "Asynchronous replication — typically seconds to minutes" },
                { actor: "marketplace-tool-artifacts-dr (ap-south-1, account 234567890123)", icon: "🪣" },
            ],
        },
        buildSystem: [
            "Enable versioning on source bucket marketplace-tool-artifacts in ap-southeast-1 — CRR requires versioning on both source and destination",
            "Create destination bucket marketplace-tool-artifacts-dr in ap-south-1 and enable versioning",
            "Create marketplace-s3-replication-role with a trust policy allowing s3.amazonaws.com to assume the role",
            "Attach a permissions policy to marketplace-s3-replication-role: s3:GetReplicationConfiguration and s3:ListBucket on the source; s3:ReplicateObject, s3:ReplicateDelete, and s3:ReplicateTags on the destination",
            "Configure CRR rule on marketplace-tool-artifacts: replicate all objects, destination=marketplace-tool-artifacts-dr, storage class=STANDARD_IA, role=marketplace-s3-replication-role",
            "Enable Replication Time Control (RTC) if SLA of 15-minute replication is required for DR",
            "Note: existing objects are NOT automatically replicated — use S3 Batch Replication to replicate pre-existing objects",
            "For cross-account CRR, add a bucket policy on the destination granting the replication role from the source account write permissions",
        ],
        flow: ["Source (ap-southeast-1)", "marketplace-s3-replication-role", "CRR Rule", "Asynchronous replication", "Destination (ap-south-1)"],
        examTips: [
            "Both source and destination buckets must have versioning enabled — CRR is impossible without versioning on both sides",
            "CRR does not retroactively replicate existing objects — use S3 Batch Replication (a separate feature) to copy pre-existing objects to the destination",
            "Delete markers are NOT replicated by default in CRR — you must explicitly enable delete marker replication in the replication rule",
            "For cross-account CRR, the destination bucket policy must grant the source account's replication role permission to write objects; the ACL is owned by the destination account",
            "Replication Time Control (RTC) adds a 99.99% SLA for replication within 15 minutes and provides replication metrics in CloudWatch — it has an additional cost",
        ],
        roleJson: [
            {
                label: "AWS CLI — configure CRR on marketplace-tool-artifacts",
                note: "💡 The IAM role ARN must be the replication role that s3.amazonaws.com can assume — not a user role.",
                code: `# Enable versioning on source bucket
aws s3api put-bucket-versioning \\
  --bucket marketplace-tool-artifacts \\
  --versioning-configuration Status=Enabled

# Enable versioning on destination bucket
aws s3api put-bucket-versioning \\
  --bucket marketplace-tool-artifacts-dr \\
  --versioning-configuration Status=Enabled

# Configure CRR replication rule
aws s3api put-bucket-replication \\
  --bucket marketplace-tool-artifacts \\
  --replication-configuration '{
    "Role": "arn:aws:iam::234567890123:role/marketplace-s3-replication-role",
    "Rules": [
      {
        "ID": "replicate-all-to-ap-south-1",
        "Status": "Enabled",
        "Filter": { "Prefix": "" },
        "Destination": {
          "Bucket": "arn:aws:s3:::marketplace-tool-artifacts-dr",
          "StorageClass": "STANDARD_IA",
          "ReplicationTime": {
            "Status": "Enabled",
            "Time": { "Minutes": 15 }
          },
          "Metrics": {
            "Status": "Enabled",
            "EventThreshold": { "Minutes": 15 }
          }
        },
        "DeleteMarkerReplication": { "Status": "Enabled" }
      }
    ]
  }'`,
            },
        ],
    },

    {
        id: 4,
        analogy: "Think of it like a concert ticket with a QR code — the venue (S3 bucket) stays locked to the public, but a valid ticket (pre-signed URL) lets exactly one person in for a limited time window, and if the ticket issuer (the Lambda role) loses their job, all their tickets stop working immediately.",
        icon: "🔗",
        color: ACCENT.orange,
        tag: "SCENARIO 4",
        title: "S3 Pre-Signed URLs",
        subtitle: "Time-limited download access for purchased tool ZIPs without making the bucket public",
        useCase: {
            title: "AMI PVT LTD Marketplace — Lambda generates pre-signed URLs for customer download of tool ZIPs",
            story: "When a customer purchases a tool on the AMI PVT LTD marketplace, the marketplace-order-processor Lambda generates a time-limited pre-signed URL for the corresponding Lambda ZIP in marketplace-tool-artifacts. The customer's browser downloads the ZIP directly from S3 using this URL — no API proxy needed. The bucket remains private with no public access. The pre-signed URL is valid for 15 minutes (sufficient for one download attempt). The URL is signed using the marketplace-order-processor Lambda execution role, which must have s3:GetObject on marketplace-tool-artifacts. If STS temporary credentials are used, the pre-signed URL expires when either the URL TTL or the STS session expires — whichever is sooner.",
            diagram: [
                { actor: "Customer browser — POST /purchase (authenticated)", icon: "🌐" },
                { arrow: "API Gateway → marketplace-order-processor Lambda" },
                { actor: "marketplace-order-processor Lambda (marketplace-order-lambda-role)", icon: "⚡" },
                { arrow: "s3.generate_presigned_url('get_object', expiry=900s)" },
                { actor: "marketplace-tool-artifacts (private bucket)", icon: "🪣" },
                { arrow: "Pre-signed URL returned to customer — valid 15 min" },
                { actor: "Customer downloads ZIP directly from S3", icon: "📥" },
            ],
        },
        buildSystem: [
            "Ensure marketplace-tool-artifacts Block Public Access is fully enabled — no bucket policy or ACL should allow public reads",
            "Attach a policy to marketplace-order-lambda-role granting s3:GetObject on arn:aws:s3:::marketplace-tool-artifacts/tools/* only",
            "In marketplace-order-processor Lambda, use the AWS SDK to call generate_presigned_url with operation='get_object', Expires=900 (15 min)",
            "Return the pre-signed URL in the API response body; the client uses it directly with a browser download or HTTP GET",
            "Set Expires to no more than the Lambda execution role's STS session duration — if the session expires first, the URL becomes invalid even before the TTL",
            "Log the pre-signed URL generation event to CloudTrail with the requester's customer-id in the Lambda context for audit purposes",
            "Consider adding a CloudFront signed URL on top of the pre-signed URL if the tool ZIP needs CDN caching across multiple downloads",
            "Test with an expired URL to confirm that S3 returns 403 AccessDenied after the expiry window",
        ],
        flow: ["Customer purchase", "marketplace-order-processor Lambda", "generate_presigned_url (900s)", "Pre-signed URL returned", "Direct S3 download"],
        examTips: [
            "A pre-signed URL inherits the permissions of the IAM identity that signed it — if the signing role loses s3:GetObject permission, existing pre-signed URLs immediately stop working",
            "Pre-signed URLs signed with STS temporary credentials (Lambda execution role) expire at the earlier of the URL TTL or the STS session expiry — a 1-hour STS session limits the max URL validity to 1 hour regardless of the Expires parameter",
            "Pre-signed URLs work for private objects without any bucket policy change — the authorization is embedded in the URL signature itself",
            "Pre-signed URLs can also be generated for PUT operations — useful for allowing customers to upload assets directly to S3 without routing through the API",
        ],
        roleJson: [
            {
                label: "Python (boto3) — generate a pre-signed GET URL in marketplace-order-processor Lambda",
                note: "💡 The URL is signed by the Lambda's execution role. If the role's STS session is shorter than ExpiresIn, the URL will expire at the STS session boundary.",
                code: `import boto3
from botocore.config import Config

s3_client = boto3.client(
    's3',
    region_name='ap-southeast-1',
    config=Config(signature_version='s3v4')
)

def generate_download_url(tool_key: str, customer_id: str) -> str:
    """
    Generate a 15-minute pre-signed URL for a purchased tool ZIP.
    tool_key: e.g. 'tools/marketplace-tool-xyz/v1.2.3/function.zip'
    """
    url = s3_client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': 'marketplace-tool-artifacts',
            'Key': tool_key,
            'ResponseContentDisposition': f'attachment; filename="marketplace-tool.zip"',
        },
        ExpiresIn=900,   # 15 minutes
    )
    print(f"[AUDIT] Pre-signed URL generated for customer={customer_id} key={tool_key}")
    return url`,
            },
        ],
    },

    {
        id: 5,
        analogy: "Think of it like a motion-sensor doorbell — the moment someone drops a parcel (new object) on your doorstep (S3 bucket), the doorbell (event notification) instantly alerts your phone (Lambda), the parcel office (SQS), and the security company (SNS fan-out) all at the same time without you having to keep checking the door.",
        icon: "📬",
        color: ACCENT.green,
        tag: "SCENARIO 5",
        title: "S3 Event Notifications",
        subtitle: "New object in marketplace-staging-bucket triggers downstream order processing",
        useCase: {
            title: "AMI PVT LTD Marketplace — S3 event fans out to SQS and triggers marketplace-order-processor Lambda",
            story: "When a customer completes a purchase, the marketplace-checkout service writes a JSON order manifest to marketplace-staging-bucket under the prefix orders/pending/. This PUT triggers an S3 event notification. In the standard single-consumer setup, the event is delivered to the order-events-queue SQS queue, and the marketplace-order-processor Lambda polls the queue with an event source mapping. For enterprise multi-tenant scenarios, an SNS topic (marketplace-order-topic) is used as a fan-out layer: S3 notifies SNS, and SNS fans the event to both order-events-queue (processing) and marketplace-audit-queue (compliance logging). This decouples the order pipeline from audit requirements.",
            diagram: [
                { actor: "marketplace-staging-bucket (orders/pending/)", icon: "🪣" },
                { arrow: "S3 Event Notification (ObjectCreated:Put) → SNS topic" },
                { actor: "marketplace-order-topic (SNS)", icon: "📣" },
                { arrow: "SNS fan-out to SQS subscribers" },
                { actor: "order-events-queue (SQS) + marketplace-audit-queue (SQS)", icon: "📬" },
                { arrow: "SQS event source mapping triggers Lambda" },
                { actor: "marketplace-order-processor Lambda", icon: "⚡" },
            ],
        },
        buildSystem: [
            "Create SQS queue order-events-queue and add a resource-based policy allowing s3.amazonaws.com to call sqs:SendMessage from marketplace-staging-bucket ARN",
            "Create SNS topic marketplace-order-topic and add a resource-based policy allowing s3.amazonaws.com to call sns:Publish from marketplace-staging-bucket ARN",
            "Subscribe order-events-queue and marketplace-audit-queue to marketplace-order-topic",
            "Configure S3 event notification on marketplace-staging-bucket: event=s3:ObjectCreated:*, prefix=orders/pending/, destination=marketplace-order-topic (SNS ARN)",
            "Create an SQS event source mapping on marketplace-order-processor Lambda with order-events-queue, batch size=10",
            "Set a Dead Letter Queue (order-events-dlq) on order-events-queue for failed processing events",
            "Test by uploading a JSON order manifest: aws s3 cp order.json s3://marketplace-staging-bucket/orders/pending/ — verify Lambda is invoked",
            "Enable S3 Event Bridge notifications as an alternative to deliver events to multiple services via EventBridge rules",
        ],
        flow: ["S3 ObjectCreated", "SNS fan-out", "SQS (order-events-queue)", "Lambda event source mapping", "marketplace-order-processor"],
        examTips: [
            "S3 event notifications can target SQS, SNS, Lambda, or EventBridge directly — for fan-out to multiple consumers, use SNS as an intermediary",
            "The SQS queue (or SNS topic) must have a resource-based policy explicitly allowing s3.amazonaws.com to publish messages — without this policy, S3 cannot deliver events",
            "S3 events are delivered at least once — idempotent processing in the Lambda is essential; use a DynamoDB idempotency key based on the S3 object version ID",
            "EventBridge (S3 Event Bridge notifications) supports more event types and richer filtering than native S3 event notifications — enable it when you need content-based filtering or cross-account event routing",
        ],
        roleJson: [
            {
                label: "AWS CLI — configure S3 event notification to SNS (fan-out pattern)",
                note: "💡 The SNS topic resource policy must allow s3.amazonaws.com to publish — this is separate from IAM and is often missed.",
                code: `# SNS topic resource policy — allow S3 to publish
aws sns set-topic-attributes \\
  --topic-arn arn:aws:sns:ap-southeast-1:234567890123:marketplace-order-topic \\
  --attribute-name Policy \\
  --attribute-value '{
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "s3.amazonaws.com" },
      "Action": "SNS:Publish",
      "Resource": "arn:aws:sns:ap-southeast-1:234567890123:marketplace-order-topic",
      "Condition": {
        "ArnLike": {
          "aws:SourceArn": "arn:aws:s3:::marketplace-staging-bucket"
        }
      }
    }]
  }'

# Configure S3 event notification to SNS
aws s3api put-bucket-notification-configuration \\
  --bucket marketplace-staging-bucket \\
  --notification-configuration '{
    "TopicConfigurations": [{
      "Id": "order-pending-sns-notify",
      "TopicArn": "arn:aws:sns:ap-southeast-1:234567890123:marketplace-order-topic",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [{ "Name": "prefix", "Value": "orders/pending/" }]
        }
      }
    }]
  }'`,
            },
        ],
    },

    {
        id: 6,
        analogy: "Think of S3 Select like asking a librarian to find only the chapter you need instead of handing you the whole encyclopaedia — you get just the relevant pages and only pay for those pages. Glacier Vault Lock is like sealing legal documents in a tamper-evident safe-deposit box where even the bank manager cannot open it early.",
        icon: "🔍",
        color: ACCENT.purple,
        tag: "SCENARIO 6",
        title: "S3 Select & Glacier Vault Lock",
        subtitle: "Query product metadata in-place and lock audit logs with compliance retention",
        useCase: {
            title: "AMI PVT LTD Marketplace — S3 Select on product metadata and Glacier Vault Lock for 7-year audit logs",
            story: "marketplace-products-bucket stores one JSON metadata file per tool (e.g. products/tool-xyz/metadata.json) containing pricing, category tags, and feature flags. The marketplace-search-lambda queries these files to build search index updates. Instead of downloading the full metadata file (some exceed 10 MB with embedded schema), S3 Select is used to extract only the required fields (product_id, category, price_usd) using an SQL-like expression — reducing data transfer and Lambda memory usage by up to 80%. For compliance, completed order logs in marketplace-tool-artifacts/audit-logs/ are archived to an S3 Glacier Vault (marketplace-audit-vault) with a Vault Lock policy that enforces a 7-year WORM (Write Once Read Many) retention period, preventing any deletion or policy change once the lock is in compliance mode.",
            diagram: [
                { actor: "marketplace-search-lambda", icon: "⚡" },
                { arrow: "S3 Select SQL — SELECT product_id, category, price_usd FROM S3Object" },
                { actor: "marketplace-products-bucket/products/*/metadata.json", icon: "🪣" },
                { arrow: "Lifecycle: archive audit-logs/ to Glacier Vault after 30 days" },
                { actor: "marketplace-audit-vault (Glacier Vault Lock — 7 year WORM)", icon: "🔒" },
            ],
        },
        buildSystem: [
            "Store product metadata as JSON in marketplace-products-bucket under products/{tool-id}/metadata.json",
            "In marketplace-search-lambda, use s3_client.select_object_content() with InputSerialization={JSON:{Type:LINES}} and a SQL expression",
            "SQL expression example: SELECT s.product_id, s.category, s.price_usd FROM S3Object s WHERE s.status = 'active'",
            "Process the streaming response from S3 Select — results arrive as a stream of Records events, not a single response body",
            "Create Glacier Vault marketplace-audit-vault in ap-southeast-1 on account 234567890123",
            "Create a Vault Lock policy: deny all DeleteArchive and AbortVaultLock actions for 7 years (2555 days), enforce with a date condition",
            "Initiate the Vault Lock and complete it within 24 hours — once in compliance mode, the policy cannot be changed",
            "Configure a lifecycle rule on marketplace-tool-artifacts to archive audit-logs/ prefix to Glacier and then copy archives to marketplace-audit-vault for WORM enforcement",
        ],
        flow: ["marketplace-search-lambda", "S3 Select (SQL filter)", "Partial JSON returned", "Glacier archive", "Vault Lock (7-year WORM)"],
        examTips: [
            "S3 Select filters data server-side before returning it — you pay only for the data scanned and returned, reducing transfer costs and improving Lambda performance for large JSON/CSV files",
            "S3 Select supports JSON (LINES or DOCUMENT), CSV, and Parquet formats — it is not a full SQL engine; only SELECT, WHERE, and LIMIT are supported",
            "Glacier Vault Lock is separate from S3 Object Lock — Vault Lock policies are immutable once in compliance mode and enforce WORM at the Glacier vault level",
            "S3 Object Lock (in compliance mode) provides equivalent WORM protection for S3 objects without Glacier — use it when data must remain in S3 rather than be archived to Glacier",
            "Once a Glacier Vault Lock is in compliance mode, no user including the AWS account root can delete the vault or change the policy — plan retention periods carefully before locking",
        ],
        roleJson: [
            {
                label: "Python (boto3) — S3 Select query on product metadata JSON",
                note: "💡 S3 Select returns a streaming response — iterate over the EventStream to collect Records events rather than reading the body as a single object.",
                code: `import boto3, json

s3 = boto3.client('s3', region_name='ap-southeast-1')

def query_product_metadata(tool_id: str) -> list:
    resp = s3.select_object_content(
        Bucket='marketplace-products-bucket',
        Key=f'products/{tool_id}/metadata.json',
        ExpressionType='SQL',
        Expression=(
            "SELECT s.product_id, s.category, s.price_usd "
            "FROM S3Object s "
            "WHERE s.status = 'active'"
        ),
        InputSerialization={'JSON': {'Type': 'LINES'}, 'CompressionType': 'NONE'},
        OutputSerialization={'JSON': {}},
    )
    results = []
    for event in resp['Payload']:
        if 'Records' in event:
            chunk = event['Records']['Payload'].decode('utf-8')
            for line in chunk.strip().splitlines():
                results.append(json.loads(line))
    return results

# Glacier Vault Lock — initiate policy
glacier = boto3.client('glacier', region_name='ap-southeast-1')
glacier.initiate_vault_lock(
    accountId='234567890123',
    vaultName='marketplace-audit-vault',
    policy={
        'Policy': json.dumps({
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Deny",
                "Principal": "*",
                "Action": ["glacier:DeleteArchive", "glacier:AbortVaultLock"],
                "Resource": "arn:aws:glacier:ap-southeast-1:234567890123:vaults/marketplace-audit-vault",
                "Condition": {
                    "DateGreaterThan": {"glacier:ArchiveAgeInDays": "2555"}
                }
            }]
        })
    }
)`,
            },
        ],
    },
];

export default scenarios;
