import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform DNS, Caching & Performance scenarios
 *
 * Source study topic: Route 53, CloudFront, and Global Accelerator (SAA-C03),
 * grounded in the AMI PVT LTD multi-tenant SaaS marketplace running in ap-southeast-1.
 * marketplace-prod account: 234567890123
 * customer-account: 987654321098
 * management account: 123456789012
 */

const scenarios = [
    {
        id: 1,
        analogy: "Think of it like a hotel chain's reservation system — it automatically routes you to the nearest branch with availability (latency routing), and during a soft launch of a new branch, it sends 10% of guests there to test it before fully opening (weighted routing).",
        icon: "🌐",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "Route 53 Routing Policies",
        subtitle: "Latency-based routing to ap-southeast-1/ap-south-1 and weighted blue/green rollout",
        useCase: {
            title: "AMI PVT LTD Marketplace — latency routing for api.marketplace.ami.com with weighted blue/green DNS",
            story: "api.marketplace.ami.com is the primary entry point for all marketplace API calls. AMI PVT LTD deploys the Spring Boot stack in ap-southeast-1 (primary) and a DR copy in ap-south-1 (secondary). Route 53 latency-based routing records route each customer request to the region that provides the lowest measured latency — customers in Southeast Asia hit ap-southeast-1 while customers in India hit ap-south-1. Separately, for rolling out a new v2 API deployment without a full traffic cutover, AMI PVT LTD uses weighted routing: two records share the same name (api.marketplace.ami.com) with weights 10 (new ALB) and 90 (existing ALB). Once v2 is confirmed stable, the weight is shifted to 100/0.",
            diagram: [
                { actor: "Customer DNS query for api.marketplace.ami.com", icon: "🔍" },
                { arrow: "Route 53 latency policy — measure latency to ap-southeast-1 vs ap-south-1" },
                { actor: "ap-southeast-1 marketplace-alb (lower latency for SEA customers)", icon: "⚡" },
                { arrow: "Weighted routing: 90% → v1 ALB, 10% → v2 ALB (blue/green rollout)" },
                { actor: "marketplace-alb-v1 (weight=90) / marketplace-alb-v2 (weight=10)", icon: "🔀" },
            ],
        },
        buildSystem: [
            "Create a hosted zone for marketplace.ami.com in Route 53",
            "Create two latency-based A records for api.marketplace.ami.com: one pointing to marketplace-alb DNS name in ap-southeast-1, one pointing to marketplace-alb-dr in ap-south-1",
            "Set the SetIdentifier for each latency record to its region name (ap-southeast-1, ap-south-1) — SetIdentifier must be unique within a record set",
            "For blue/green: create two weighted A records sharing the same name api.marketplace.ami.com — marketplace-alb-v1 with Weight=90, marketplace-alb-v2 with Weight=10",
            "Use an Alias record (not CNAME) for ALB DNS names — Alias records are free for AWS resources and support Apex domain (zone apex)",
            "Associate Route 53 health checks with each latency record so Route 53 fails over to the healthy region automatically",
            "To complete the blue/green cutover: update marketplace-alb-v2 weight to 100 and marketplace-alb-v1 weight to 0 — Route 53 sends all traffic to v2",
            "Monitor Route 53 DNS query metrics in CloudWatch to confirm traffic split matches expected weight ratio",
        ],
        flow: ["DNS query", "Route 53 latency policy", "Nearest ALB region", "Weighted split (90/10)", "Blue/green cutover (100/0)"],
        examTips: [
            "Latency-based routing routes to the AWS region with the lowest network latency from the client — it is not based on the client's geographic location",
            "Weighted routing with weight=0 removes all traffic from a record without deleting it — a weight=0 record is kept in Route 53 and can be re-enabled instantly",
            "Use Alias records (not CNAME) for zone apex (e.g. marketplace.ami.com without a subdomain) — CNAME cannot be created at the zone apex",
            "SetIdentifier is required for all routing policy records that share the same name and type — it uniquely identifies each record within a weighted/latency/failover/geolocation set",
        ],
        roleJson: [
            {
                label: "AWS CLI — create latency-based A record for api.marketplace.ami.com",
                note: "💡 Use AliasTarget for ALB endpoints — Alias records resolve within AWS infrastructure and are free for Route 53 queries to AWS resources.",
                code: `# Latency record for ap-southeast-1 (primary)
aws route53 change-resource-record-sets \\
  --hosted-zone-id ZMARKETPLACE123 \\
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "api.marketplace.ami.com",
          "Type": "A",
          "SetIdentifier": "ap-southeast-1-primary",
          "Region": "ap-southeast-1",
          "AliasTarget": {
            "HostedZoneId": "Z1LMS91P8CMLE5",
            "DNSName": "marketplace-alb-1234567890.ap-southeast-1.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      },
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "api.marketplace.ami.com",
          "Type": "A",
          "SetIdentifier": "ap-south-1-dr",
          "Region": "ap-south-1",
          "AliasTarget": {
            "HostedZoneId": "ZP97RAFLXTNZK",
            "DNSName": "marketplace-alb-dr-987654321.ap-south-1.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }'`,
            },
        ],
    },

    {
        id: 2,
        analogy: "Think of it like a building's backup generator — a health monitor checks the main power every 30 seconds, and the moment the lights flicker three times in a row, it automatically switches the whole building to the backup generator so tenants barely notice an outage.",
        icon: "🏥",
        color: ACCENT.teal,
        tag: "SCENARIO 2",
        title: "Route 53 Health Checks & DNS Failover",
        subtitle: "Active-passive failover from marketplace-alb to a static S3 failover page",
        useCase: {
            title: "AMI PVT LTD Marketplace — automatic DNS failover when marketplace-alb becomes unhealthy",
            story: "AMI PVT LTD runs an active-passive DNS failover for the marketplace. The primary record points to marketplace-alb (ap-southeast-1 ALB), which has an associated Route 53 health check that sends HTTP GET requests to /health every 30 seconds. If the health check fails three consecutive times, Route 53 automatically updates DNS to point the marketplace.ami.com record to a static failover page hosted in marketplace-failover-bucket (S3 static website). This gives customers a maintenance notice and contact information instead of a timeout. The secondary record is only served when the primary is unhealthy — classic active-passive configuration.",
            diagram: [
                { actor: "marketplace-alb (primary — ap-southeast-1)", icon: "🔀" },
                { arrow: "Route 53 health check: GET /health every 30s from 15 global checkers" },
                { actor: "Health check FAIL (3 consecutive failures)", icon: "❌" },
                { arrow: "Route 53 DNS failover — TTL expires, secondary record served" },
                { actor: "marketplace-failover-bucket (S3 static website — maintenance page)", icon: "🪣" },
            ],
        },
        buildSystem: [
            "Create a Route 53 endpoint health check targeting marketplace-alb DNS name on port 443, path /health, protocol HTTPS",
            "Set health check intervals to 30 seconds with a failure threshold of 3 — failover triggers after ~90 seconds of unavailability",
            "Create the primary failover A record for marketplace.ami.com: type=FAILOVER, failover=PRIMARY, pointing to marketplace-alb, with the health check ID attached",
            "Enable S3 static website hosting on marketplace-failover-bucket; upload a maintenance index.html and error.html",
            "Create the secondary failover A record for marketplace.ami.com: type=FAILOVER, failover=SECONDARY, pointing to the S3 website endpoint",
            "The secondary record does NOT need a health check — Route 53 serves it whenever the primary is unhealthy",
            "Set low TTL (60 seconds) on both records so clients pick up the DNS change quickly after failover",
            "Use Route 53 Resolver DNS Firewall to block DNS lookups for known malicious domains from within marketplace-vpc",
        ],
        flow: ["Primary: marketplace-alb", "Health check (30s interval)", "3 failures → unhealthy", "DNS TTL expires", "Secondary: S3 static page"],
        examTips: [
            "Route 53 health checks originate from ~15 global health check locations — a resource behind a firewall must allow TCP/HTTPS from the published Route 53 health check IP ranges",
            "Failover routing requires one PRIMARY and one SECONDARY record — only the primary needs a health check; the secondary is always considered healthy as a fallback",
            "Calculated health checks combine the results of child health checks using AND/OR logic — useful for declaring a region healthy only when multiple endpoints are up",
            "CloudWatch alarm-based health checks allow Route 53 to react to internal CloudWatch metrics (e.g. ALB 5xx rate) rather than direct endpoint polling — useful for internal resources not reachable from the internet",
        ],
        roleJson: [
            {
                label: "AWS CLI — create Route 53 health check for marketplace-alb",
                note: "💡 Set a low FailureThreshold (3) and 30-second intervals so Route 53 detects failure and triggers failover within ~90 seconds.",
                code: `# Create health check for marketplace-alb
aws route53 create-health-check \\
  --caller-reference marketplace-alb-hc-$(date +%s) \\
  --health-check-config '{
    "Type": "HTTPS",
    "FullyQualifiedDomainName": "marketplace-alb-1234567890.ap-southeast-1.elb.amazonaws.com",
    "Port": 443,
    "ResourcePath": "/health",
    "RequestInterval": 30,
    "FailureThreshold": 3,
    "EnableSNI": true
  }'

# Create PRIMARY failover record pointing to marketplace-alb
aws route53 change-resource-record-sets \\
  --hosted-zone-id ZMARKETPLACE123 \\
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "marketplace.ami.com",
        "Type": "A",
        "SetIdentifier": "marketplace-alb-primary",
        "Failover": "PRIMARY",
        "HealthCheckId": "hc-0marketplace123",
        "AliasTarget": {
          "HostedZoneId": "Z1LMS91P8CMLE5",
          "DNSName": "marketplace-alb-1234567890.ap-southeast-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'`,
            },
        ],
    },

    {
        id: 3,
        analogy: "Think of it like a chain of local convenience stores stocking popular items from a central warehouse — customers grab what they need nearby (edge cache) instead of travelling to headquarters, and when the warehouse updates its stock the local stores are told to throw out the old version (cache invalidation).",
        icon: "🚀",
        color: ACCENT.amber,
        tag: "SCENARIO 3",
        title: "CloudFront Distribution for Marketplace UI",
        subtitle: "Cache product images from S3 and API responses from marketplace-alb via origin groups",
        useCase: {
            title: "AMI PVT LTD Marketplace — marketplace-cdn with multiple origins and cache behaviors",
            story: "The marketplace UI serves product images (S3) and API responses (ALB) through a single CloudFront distribution (marketplace-cdn). Two origins are configured: S3 origin (marketplace-products-bucket) for /images/* and /static/*, and ALB origin (marketplace-alb) for /api/*. A separate cache behavior with TTL=0 is set for /api/* to ensure API responses are never cached at the edge (pass-through). Product images have a default TTL of 86,400 seconds (1 day). When a product image is updated, AMI PVT LTD creates a CloudFront invalidation for /images/{tool-id}/* to purge the cache. An origin group combining the primary S3 origin and a failover S3 DR origin (marketplace-products-bucket-dr) provides automatic origin failover.",
            diagram: [
                { actor: "Customer browser request to marketplace-cdn (d1abc123.cloudfront.net)", icon: "🌐" },
                { arrow: "Cache behavior match: /images/* → S3 origin (TTL=86400s)" },
                { actor: "marketplace-products-bucket (S3 Origin, OAC)", icon: "🪣" },
                { arrow: "Cache behavior match: /api/* → ALB origin (TTL=0, no cache)" },
                { actor: "marketplace-alb → marketplace-api-asg (Spring Boot EC2)", icon: "🔀" },
            ],
        },
        buildSystem: [
            "Create CloudFront distribution marketplace-cdn with default origin pointing to marketplace-alb",
            "Add a second S3 origin for marketplace-products-bucket using Origin Access Control (OAC) — replace legacy OAI with OAC for new distributions",
            "Update marketplace-products-bucket bucket policy to allow CloudFront service principal (cloudfront.amazonaws.com) with the distribution ARN condition",
            "Create cache behavior for /images/* and /static/*: origin=marketplace-products-bucket, TTL=86400, Compress=true, Viewer Protocol Policy=redirect-to-https",
            "Create cache behavior for /api/*: origin=marketplace-alb, TTL=0 (disable caching), forward all headers and cookies, allowed methods=GET/HEAD/OPTIONS/PUT/POST/PATCH/DELETE",
            "Create origin group combining marketplace-products-bucket (primary) and marketplace-products-bucket-dr (failover) — failover triggers on 4xx/5xx from primary",
            "Configure a CloudFront Function or Lambda@Edge on the /api/* behavior to inject X-Customer-Id header from the JWT for downstream routing",
            "Create a wildcard invalidation for /images/* after bulk product image updates: aws cloudfront create-invalidation --paths '/images/*'",
        ],
        flow: ["/images/* → S3 (TTL=1d)", "/api/* → ALB (TTL=0)", "OAC auth", "Origin group failover", "Invalidation on update"],
        examTips: [
            "CloudFront cache behaviors are matched in order of specificity — more specific path patterns (e.g. /api/v2/*) take precedence over less specific ones (/api/*); the default (*) behavior matches last",
            "Origin Access Control (OAC) replaces Origin Access Identity (OAI) — OAC supports S3 SSE-KMS encrypted buckets and all S3 regions; OAI does not support SSE-KMS",
            "Setting TTL=0 on a cache behavior does not disable CloudFront — CloudFront still validates the cached response with the origin using conditional GET (If-None-Match); use Cache-Control: no-store to prevent any caching",
            "CloudFront invalidations are eventually consistent — not all edge locations clear simultaneously. Versioned object keys (image-v2.jpg) are preferred over invalidations for high-frequency updates",
        ],
        roleJson: [
            {
                label: "AWS CLI — create CloudFront invalidation for updated product images",
                note: "💡 Wildcard invalidations (/images/*) count as one path for the free 1,000 paths/month — more cost-effective than individual file paths.",
                code: `# Create invalidation for all product images
aws cloudfront create-invalidation \\
  --distribution-id EEXAMPLEMARKETPLACE \\
  --paths '/images/*' '/static/css/*'

# Create CloudFront distribution with S3 and ALB origins (JSON skeleton)
aws cloudfront create-distribution \\
  --distribution-config '{
    "Origins": {
      "Items": [
        {
          "Id": "marketplace-products-s3",
          "DomainName": "marketplace-products-bucket.s3.ap-southeast-1.amazonaws.com",
          "OriginAccessControlId": "oac-0marketplace123",
          "S3OriginConfig": { "OriginAccessIdentity": "" }
        },
        {
          "Id": "marketplace-alb-origin",
          "DomainName": "marketplace-alb-1234567890.ap-southeast-1.elb.amazonaws.com",
          "CustomOriginConfig": {
            "HTTPSPort": 443,
            "OriginProtocolPolicy": "https-only"
          }
        }
      ],
      "Quantity": 2
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "marketplace-alb-origin",
      "ViewerProtocolPolicy": "redirect-to-https",
      "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    },
    "Comment": "marketplace-cdn",
    "Enabled": true
  }'`,
            },
        ],
    },

    {
        id: 4,
        analogy: "Think of it like a members-only library where a librarian stamps a time-limited borrowing pass (signed URL) for a single book, or issues a membership card (signed cookie) that lets a subscriber browse an entire section without needing a new stamp for every book they pick up.",
        icon: "🔐",
        color: ACCENT.orange,
        tag: "SCENARIO 4",
        title: "CloudFront Signed URLs & Signed Cookies",
        subtitle: "Time-limited access to purchased tool documentation via CloudFront (not S3 pre-signed URLs)",
        useCase: {
            title: "AMI PVT LTD Marketplace — CloudFront signed URLs for enterprise tool documentation PDFs",
            story: "Enterprise subscribers on AMI PVT LTD marketplace purchase access to premium tool documentation PDFs stored in marketplace-tool-artifacts/docs/. These files are served through marketplace-cdn (CloudFront) — not directly from S3. S3 pre-signed URLs bypass CloudFront, so they cannot leverage edge caching or enforce CloudFront access controls. Instead, the marketplace-portal Lambda generates CloudFront signed URLs using a CloudFront key pair associated with a trusted key group. The signed URL embeds an expiry timestamp and resource path restriction. For enterprise users with access to an entire documentation suite, signed cookies are used instead — one cookie grants access to all PDFs matching docs/{suite-id}/* without generating individual URLs.",
            diagram: [
                { actor: "Enterprise subscriber — authenticated session", icon: "👤" },
                { arrow: "marketplace-portal Lambda generates CloudFront signed URL (2-hour expiry)" },
                { actor: "CloudFront signed URL: d1abc.cloudfront.net/docs/tool-xyz/guide.pdf?Policy=...&Signature=...&Key-Pair-Id=...", icon: "🔗" },
                { arrow: "CloudFront edge validates signature against trusted key group" },
                { actor: "marketplace-cdn → marketplace-tool-artifacts/docs/ (S3 origin, OAC)", icon: "🚀" },
            ],
        },
        buildSystem: [
            "Create a CloudFront key pair in the AWS console (Account > Security Credentials) — download the private key PEM file securely",
            "Create a trusted key group in the CloudFront distribution and associate the public key ID",
            "Configure the /docs/* cache behavior on marketplace-cdn to require signed URLs/cookies: restrict viewer access, trusted key groups=marketplace-key-group",
            "Store the CloudFront private key in AWS Secrets Manager (marketplace-cloudfront-privkey) — the marketplace-portal Lambda retrieves it at runtime",
            "In marketplace-portal Lambda, use the CloudFront signed URL library to create a URL with a custom policy: resource=d1abc.cloudfront.net/docs/{tool-id}/*.pdf, DateLessThan=now+7200",
            "For enterprise suite access, generate signed cookies (CloudFront-Policy, CloudFront-Signature, CloudFront-Key-Pair-Id) and set them on the session — the browser sends the cookies with every /docs/* request",
            "Rotate CloudFront key pairs periodically by adding a new key to the trusted key group before removing the old one — zero-downtime rotation",
            "Confirm that direct S3 access is blocked (OAC on the bucket restricts all access to CloudFront only) — signed URLs must go through CloudFront",
        ],
        flow: ["Enterprise login", "Lambda signs URL/cookie", "CloudFront edge validates", "OAC fetch from S3", "PDF served to browser"],
        examTips: [
            "CloudFront signed URLs are used when content is delivered through CloudFront — S3 pre-signed URLs bypass CloudFront and cannot use CloudFront edge caching or access controls",
            "Trusted key groups (the modern approach) replace trusted signers — trusted key groups do not require root account credentials; key pairs are managed per-distribution",
            "Use signed cookies instead of signed URLs when granting access to multiple files (e.g. all PDFs in a documentation suite) — one cookie covers all matching resource patterns",
            "A CloudFront signed URL always overrides the S3 bucket policy — even if the S3 bucket is fully public, adding a CloudFront restriction requires the signed URL/cookie to be valid",
            "Signed URLs include a signature based on the private key — rotating the key pair invalidates all URLs signed with the old key; always add the new key before removing the old one",
        ],
        roleJson: [
            {
                label: "Python (boto3 + CloudFront signer) — generate a CloudFront signed URL",
                note: "💡 Use a custom policy (not a canned policy) to restrict access to a specific resource path pattern and set an exact expiry time.",
                code: `import datetime, json
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
import base64, boto3

def get_cloudfront_private_key() -> bytes:
    """Retrieve CloudFront private key PEM from Secrets Manager."""
    client = boto3.client('secretsmanager', region_name='ap-southeast-1')
    resp = client.get_secret_value(SecretId='marketplace-cloudfront-privkey')
    return resp['SecretString'].encode('utf-8')

def generate_cloudfront_signed_url(
    tool_id: str,
    doc_key: str,
    key_pair_id: str,
    expiry_seconds: int = 7200,
) -> str:
    """
    Generate a CloudFront signed URL for a documentation PDF.
    resource: https://d1abc123.cloudfront.net/docs/{tool_id}/{doc_key}
    """
    expiry_ts = int((datetime.datetime.utcnow() +
                     datetime.timedelta(seconds=expiry_seconds)).timestamp())
    resource = f"https://d1abc123.cloudfront.net/docs/{tool_id}/{doc_key}"

    policy = json.dumps({
        "Statement": [{
            "Resource": resource,
            "Condition": {"DateLessThan": {"AWS:EpochTime": expiry_ts}}
        }]
    }, separators=(',', ':'))

    private_key = serialization.load_pem_private_key(
        get_cloudfront_private_key(), password=None, backend=default_backend()
    )
    signature = private_key.sign(policy.encode('utf-8'), padding.PKCS1v15(), hashes.SHA1())
    encoded_sig = base64.b64encode(signature).decode().replace('+', '-').replace('=', '_').replace('/', '~')
    encoded_policy = base64.b64encode(policy.encode()).decode().replace('+', '-').replace('=', '_').replace('/', '~')

    return (
        f"{resource}"
        f"?Policy={encoded_policy}"
        f"&Signature={encoded_sig}"
        f"&Key-Pair-Id={key_pair_id}"
    )`,
            },
        ],
    },

    {
        id: 5,
        analogy: "Think of it like a highway that has a private express lane running through a city — instead of fighting traffic on public roads (the internet), your data jumps onto a dedicated fast lane the moment it enters the city boundary (AWS edge PoP) and travels on reserved roads all the way to the destination.",
        icon: "🌍",
        color: ACCENT.green,
        tag: "SCENARIO 5",
        title: "AWS Global Accelerator",
        subtitle: "Two static Anycast IPs routing EU and US enterprise traffic over the AWS global network",
        useCase: {
            title: "AMI PVT LTD Marketplace — Global Accelerator for enterprise customers in Europe and the US",
            story: "AMI PVT LTD has enterprise marketplace customers in Frankfurt (EU) and New York (US) who complain about variable latency and packet loss when calling the marketplace API hosted in ap-southeast-1. AMI PVT LTD enables AWS Global Accelerator, which provisions two static Anycast IP addresses (203.0.113.1 and 203.0.113.2). Global Accelerator routes client traffic from the nearest AWS edge PoP into the AWS global backbone network immediately, bypassing the public internet for most of the journey. Traffic is then routed to the nearest healthy endpoint: marketplace-alb in ap-southeast-1 (primary, weight=100) or marketplace-alb-dr in ap-south-1 (secondary, weight=0 — kept for failover). When ap-southeast-1 becomes unhealthy, Global Accelerator shifts traffic to ap-south-1 in under 30 seconds.",
            diagram: [
                { actor: "EU enterprise customer (Frankfurt)", icon: "🇩🇪" },
                { arrow: "Connects to nearest AWS edge PoP — AWS backbone network" },
                { actor: "Global Accelerator Anycast IPs (203.0.113.1 / 203.0.113.2)", icon: "🌍" },
                { arrow: "Routed over AWS global network to closest healthy endpoint" },
                { actor: "marketplace-alb (ap-southeast-1) — weight=100", icon: "🔀" },
                { arrow: "Health check fail → automatic failover" },
                { actor: "marketplace-alb-dr (ap-south-1) — weight=0 (standby)", icon: "🔀" },
            ],
        },
        buildSystem: [
            "Create a Global Accelerator accelerator named marketplace-global-accelerator in the Global Accelerator console",
            "Note the two static Anycast IPs assigned — update enterprise customer firewall allowlists with these IPs",
            "Create a listener on the accelerator: protocol=TCP, port ranges=443,80",
            "Create an endpoint group for ap-southeast-1: add marketplace-alb as an endpoint with weight=128 and traffic dial=100%",
            "Create a second endpoint group for ap-south-1: add marketplace-alb-dr as an endpoint with weight=128 and traffic dial=0% (standby for failover only)",
            "Enable health checks on the endpoint groups — Global Accelerator monitors endpoints every 30 seconds",
            "Update DNS record for api.marketplace.ami.com to point to the Global Accelerator DNS name (marketplace-global-accelerator.awsglobalaccelerator.com) using CNAME or Alias",
            "Test failover by changing the ap-southeast-1 endpoint group traffic dial to 0% and verifying traffic shifts to ap-south-1 within 30 seconds",
        ],
        flow: ["Client → AWS edge PoP", "AWS global backbone", "Global Accelerator", "Nearest healthy endpoint", "marketplace-alb / marketplace-alb-dr"],
        examTips: [
            "Global Accelerator provides two static Anycast IPs — useful when enterprise customers configure firewall allowlists and cannot update them for changing ALB IPs; CloudFront uses dynamic IPs and does not provide static IPs",
            "Global Accelerator works at Layer 4 (TCP/UDP) and does not cache content — it is a network acceleration and availability service, not a CDN; use CloudFront for content caching",
            "Traffic dial is a percentage (0–100%) applied at the endpoint group level — setting a region to 0% diverts all traffic away from that region without removing the endpoint; CloudFront does not have an equivalent traffic dial",
            "Global Accelerator health checks are independent of Route 53 health checks — failover time is typically under 30 seconds when an endpoint becomes unhealthy",
        ],
        roleJson: [
            {
                label: "AWS CLI — create Global Accelerator and add marketplace-alb endpoint",
                note: "💡 Save the two Anycast IPs from the create-accelerator output — enterprise customers need these for firewall allowlisting.",
                code: `# Create Global Accelerator
aws globalaccelerator create-accelerator \\
  --name marketplace-global-accelerator \\
  --ip-address-type IPV4 \\
  --enabled \\
  --tags Key=Environment,Value=prod Key=Service,Value=marketplace-api \\
  --region us-west-2

# Create listener on port 443
aws globalaccelerator create-listener \\
  --accelerator-arn arn:aws:globalaccelerator::234567890123:accelerator/marketplace-global-accelerator \\
  --protocol TCP \\
  --port-ranges '[{"FromPort":443,"ToPort":443},{"FromPort":80,"ToPort":80}]' \\
  --region us-west-2

# Create endpoint group for ap-southeast-1 (primary)
aws globalaccelerator create-endpoint-group \\
  --listener-arn arn:aws:globalaccelerator::234567890123:accelerator/.../listener/marketplace-listener \\
  --endpoint-group-region ap-southeast-1 \\
  --traffic-dial-percentage 100 \\
  --endpoint-configurations '[{
    "EndpointId": "arn:aws:elasticloadbalancing:ap-southeast-1:234567890123:loadbalancer/app/marketplace-alb/abc123",
    "Weight": 128,
    "ClientIPPreservationEnabled": true
  }]' \\
  --region us-west-2`,
            },
        ],
    },

    {
        id: 6,
        analogy: "Think of it like an internal company phone directory that only works inside the office building — employees dial short extension names (order-processor.internal) instead of memorising long external phone numbers (RDS endpoint strings), and none of these numbers are listed in the public phone book.",
        icon: "🔒",
        color: ACCENT.purple,
        tag: "SCENARIO 6",
        title: "Route 53 Private Hosted Zone",
        subtitle: "Internal DNS for marketplace microservices so services call each other by name",
        useCase: {
            title: "AMI PVT LTD Marketplace — private hosted zone internal.marketplace.local for service-to-service DNS",
            story: "The AMI PVT LTD marketplace backend consists of several microservices deployed across marketplace-vpc: the Spring Boot marketplace-api (EC2), the order-processor Lambda, the marketplace-rds-primary (RDS), and an internal reporting service. Rather than hardcoding private IP addresses or RDS endpoint strings, AMI PVT LTD creates a Route 53 private hosted zone (internal.marketplace.local) associated with marketplace-vpc. Each service registers an A or CNAME record: order-processor.internal.marketplace.local (Lambda ENI IP or ALB), db.internal.marketplace.local (CNAME to marketplace-rds-primary endpoint), and reporting.internal.marketplace.local. Lambda functions that run inside marketplace-vpc (VPC-connected Lambda) resolve these names automatically via the VPC DNS resolver at 10.0.0.2.",
            diagram: [
                { actor: "marketplace-api EC2 (10.0.10.x) in marketplace-vpc", icon: "🖥️" },
                { arrow: "DNS query: order-processor.internal.marketplace.local → VPC resolver (10.0.0.2)" },
                { actor: "Route 53 Private Hosted Zone: internal.marketplace.local (associated with marketplace-vpc)", icon: "🔒" },
                { arrow: "Returns A record → internal ALB or Lambda ENI IP" },
                { actor: "order-processor internal endpoint (no public exposure)", icon: "⚡" },
            ],
        },
        buildSystem: [
            "Create Route 53 private hosted zone internal.marketplace.local and associate it with marketplace-vpc",
            "Ensure enableDnsHostnames and enableDnsSupport are both enabled on marketplace-vpc — required for Route 53 private hosted zone resolution",
            "Create A record order-processor.internal.marketplace.local pointing to the internal ALB endpoint for order-processor microservice",
            "Create CNAME record db.internal.marketplace.local pointing to the RDS endpoint marketplace-rds-primary.cluster-xyz.ap-southeast-1.rds.amazonaws.com",
            "Create A record reporting.internal.marketplace.local pointing to the EC2 private IP of the reporting service instance",
            "Configure Lambda functions that need internal DNS resolution to run inside marketplace-vpc with VPC config pointing to the private subnet",
            "Test DNS resolution from within the VPC: nslookup order-processor.internal.marketplace.local 10.0.0.2 — should return the correct internal IP",
            "To share the private zone across a peered VPC (marketplace-analytics-vpc), create an authorization and associate the zone with the additional VPC",
        ],
        flow: ["marketplace-api / Lambda", "VPC resolver (10.0.0.2)", "Private Hosted Zone", "DNS record lookup", "Internal service endpoint"],
        examTips: [
            "Route 53 private hosted zones resolve DNS names only from within the associated VPCs — the same domain name in a public hosted zone (if it exists) is shadowed by the private zone for VPC traffic",
            "Both enableDnsHostnames and enableDnsSupport must be enabled on the VPC for Route 53 private hosted zone resolution to work — without these, the VPC DNS resolver ignores the private zone",
            "To share a private hosted zone with a peered VPC, you must associate the zone with the additional VPC — peering alone does not make the private zone resolvable from the peer VPC",
            "Lambda functions must be VPC-connected (configured with subnet IDs and security groups) to resolve internal.marketplace.local records — non-VPC Lambda functions cannot access private hosted zones",
        ],
        roleJson: [
            {
                label: "AWS CLI — create private hosted zone and register internal service records",
                note: "💡 The caller-reference must be unique per create-hosted-zone call — use a timestamp or UUID to avoid conflicts on repeated runs.",
                code: `# Create private hosted zone for marketplace-vpc
aws route53 create-hosted-zone \\
  --name internal.marketplace.local \\
  --caller-reference "marketplace-phz-$(date +%s)" \\
  --vpc VPCRegion=ap-southeast-1,VPCId=vpc-0marketplace123 \\
  --hosted-zone-config Comment="AMI PVT LTD internal service DNS",PrivateZone=true

# Register order-processor internal DNS record
aws route53 change-resource-record-sets \\
  --hosted-zone-id ZPHZMARKETPLACE \\
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "order-processor.internal.marketplace.local",
          "Type": "A",
          "TTL": 60,
          "ResourceRecords": [{ "Value": "10.0.10.45" }]
        }
      },
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "db.internal.marketplace.local",
          "Type": "CNAME",
          "TTL": 60,
          "ResourceRecords": [{
            "Value": "marketplace-rds-primary.cluster-xyz.ap-southeast-1.rds.amazonaws.com"
          }]
        }
      }
    ]
  }'`,
            },
        ],
    },
];

export default scenarios;
