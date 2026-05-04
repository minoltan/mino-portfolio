# AMI PVT LTD — Marketplace Platform System Requirements Document

> **Purpose:** Tracks what has been built into the AMI PVT LTD Marketplace system as each AWS exam topic is completed.  
> Used as the reference for the final CDK deployment of the full system.

---

## System Overview

**AMI PVT LTD Marketplace** is a multi-tenant SaaS platform where businesses can discover, purchase, and deploy small AWS-powered productivity tools into their own AWS accounts.

**Example tools sold on the marketplace:**
- MCP Server for automated report generation
- Leaderboard system (real-time team rankings)
- Skill Matrix tracker (team competency management)
- Spin the Wheel (engagement/gamification tool)
- And more added by sellers via the platform

---

## Account Architecture

| Account | Name | Purpose |
|---------|------|---------|
| Management | `ami-pvt-ltd-management` (123456789012) | Billing, governance, org-wide policies |
| Platform | `marketplace-prod` (234567890123) | AMI PVT LTD platform — API, data, artifact storage |
| Customer | `customer-account` (987654321098) | Each subscriber's AWS account (tool deployment target) |
| Shared Services | `marketplace-analytics` | EMR, Glue, Redshift data pipeline |
| Dev/Test | `marketplace-dev` | Development and QA workloads |

**Organization structure:**
```
Root
├── Management Account: ami-pvt-ltd-management (123456789012)
│   ├── OU: Platform
│   │   └── marketplace-prod (234567890123)
│   ├── OU: CustomerAccounts
│   │   └── finserv-corp-account (987654321098) — one per enterprise subscriber
│   ├── OU: SharedServices
│   │   └── marketplace-analytics
│   └── OU: Dev/Test
│       └── marketplace-dev
```

**Tech stack:**
- Server/EC2 workloads: **Spring Boot (Java)**
- Serverless workloads: **Node.js (Lambda)**
- IaC: **AWS CDK (TypeScript)** — final deployment after all topics complete

---

## Topics Completed

### ✅ Topic 1: IAM — Identity & Access Management

**SAA-C03 coverage:** IAM Users, Groups, Roles, MFA, Federation, STS, Resource-Based Policies, Policy Evaluation

#### 1.1 Team Access Control (IAM Users & Groups)
```
IAM Groups:
  - Engineering-Group           → Lambda, EC2, CloudFormation, CloudWatch (MFA required)
  - MarketplaceOps-Group        → DynamoDB Products table, S3 marketplace-products-bucket (R/W)
  - Finance-Group               → Billing read-only, Cost Explorer read
IAM Users: one per employee → assigned to respective group; all require virtual MFA device
Password policy: 14 chars minimum, 90-day rotation, no reuse of last 5
```

#### 1.2 Marketplace Core API — EC2 Instance Profile
```
Role: Marketplace-API-EC2-Role
  Trust: ec2.amazonaws.com
  Permissions: DynamoDB (Products, Orders), S3 (marketplace-products-bucket), SQS (order-events-queue)
```

#### 1.3 Order Processing Pipeline — Lambda Execution Role
```
Role: Marketplace-OrderProcessor-Lambda-Role
  Trust: lambda.amazonaws.com
  Managed: AWSLambdaBasicExecutionRole
  Permissions: SQS (order-events-queue), DynamoDB (Orders), S3 (tool-artifacts R / staging-bucket W), SNS (marketplace-notifications)
```

#### 1.4 Enterprise Customer SSO — SAML Federation
```
SAML Provider: arn:aws:iam::*:saml-provider/AzureAD-{CustomerName} (one per enterprise subscriber)
Roles: Enterprise-Viewer-Role, Enterprise-Admin-Role (federated via SAML IdP)
```

#### 1.5 Tool Deployment — Cross-Account Role
```
Account-A: Marketplace-DeploymentAgent-Role → sts:AssumeRole into customer accounts
Account-B: Marketplace-Deploy-Role (trust = DeploymentAgent ARN, Condition: ExternalId)
  Permissions: CloudFormation (marketplace-tool-*), Lambda (marketplace-*), DynamoDB (marketplace-*)
```

#### 1.6 Artifact Distribution — Resource-Based Policy (S3)
```
marketplace-tool-artifacts bucket policy: grants cross-account GetObject/ListBucket to customer Provisioning-Service-Role
Customer identity policy mirrors the same permissions (both sides required for cross-account)
```

---

### ✅ Topic 2: EC2 — Elastic Compute Cloud

**SAA-C03 coverage:** AMIs, Instance Types, Billing Models, Networking, ENI/ENA/EFA, Placement Groups, Bastion Hosts, Monitoring, High Availability, Migration, Launch Templates

**Marketplace additions:**
- `marketplace-api-golden-ami-v1` — hardened Amazon Linux 2 + Java 17 runtime + CloudWatch Agent pre-installed
- `marketplace-api-launch-template` — references golden AMI + `Marketplace-API-EC2-Role` instance profile + user data bootstrap
- AMI copied to `ap-south-1` for DR; detailed monitoring enabled for sub-5-minute ASG reaction

---

### ✅ Topic 3: Auto Scaling & Elastic Load Balancing

**SAA-C03 coverage:** ASG, Scaling Policies, Launch Templates, Lifecycle Hooks, ALB, NLB, Target Groups, Health Checks, Blue/Green Deployments

**Marketplace additions:**
- `marketplace-api-asg` — min=2, max=10, desired=3 across ap-southeast-1a/1b
- `marketplace-alb` — HTTPS 443, ACM certificate, path routing `/api/*` → EC2 target group
- `marketplace-nlb` — Layer 4 TCP, static EIP per AZ for MCP Report Server tool
- Target Tracking: scale out when ALBRequestCountPerTarget > 1000 or CPUUtilization > 70%
- Lifecycle hook on `AUTOSCALING:EC2_INSTANCE_TERMINATING` for graceful Spring Boot connection drain

---

### ✅ Topic 4: Amazon VPC

**SAA-C03 coverage:** VPC, Subnets, Internet Gateway, NAT Gateway, Security Groups, NACLs, VPC Endpoints, VPC Peering, AWS PrivateLink, Route Tables, Transit Gateway, VPN

**Marketplace additions:**
- `marketplace-vpc` (10.0.0.0/16) — public subnets (10.0.1.0/24, 10.0.2.0/24): ALB, NAT GW; private subnets (10.0.10.0/24, 10.0.11.0/24): EC2 fleet, RDS, ElastiCache
- `marketplace-nat-gw` — private EC2 outbound internet (Stripe API calls, OS updates)
- `marketplace-s3-endpoint` + `marketplace-dynamodb-endpoint` — free Gateway endpoints
- `marketplace-sqs-endpoint` + `marketplace-kms-endpoint` + `marketplace-ssm-endpoint` — Interface VPC Endpoints (private subnet access with no internet)
- `marketplace-prod-analytics-peer` — VPC Peering to marketplace-analytics account (10.1.0.0/16)
- `marketplace-api-endpoint-service` — PrivateLink service backed by NLB for enterprise customer private access

---

### ✅ Topic 5: AWS Organizations

**SAA-C03 coverage:** Organization Structure, OUs, SCPs, Consolidated Billing, Cross-Account Access, Delegated Admin, AWS Config org-wide

**SCPs applied:**
- `CustomerAccounts` OU: Deny `iam:DeleteRole` / `iam:DetachRolePolicy` on `Marketplace-Deploy-Role`
- All OUs: Deny actions outside approved regions (ap-southeast-1, ap-south-1)
- Org-wide AWS Config: EC2 instance profiles required, S3 versioning required, no public buckets

---

### ✅ Topic 6: Amazon S3 and Glacier

**SAA-C03 coverage:** Storage Classes, Lifecycle Policies, Versioning, CRR, Pre-Signed URLs, Event Notifications, S3 Select, Glacier Vault Lock, S3 Object Lock, Transfer Acceleration

**Marketplace additions:**
- `marketplace-products-bucket` — versioning enabled; lifecycle: transition to IA after 30 days, Glacier after 90 days; CORS for browser uploads
- `marketplace-tool-artifacts` — versioning + S3 Object Lock (WORM, COMPLIANCE mode, 7-year retention for audit); SSE-KMS with `marketplace-s3-key` (Multi-Region Key, primary ap-southeast-1); CRR to `marketplace-tool-artifacts-dr` in ap-south-1 using same MRK replica
- `marketplace-analytics-raw` — destination for Kinesis Firehose Parquet delivery; partitioned by year/month/day for Athena partition pruning
- `marketplace-athena-results` — Athena query output bucket
- S3 event notification on `marketplace-products-bucket/sellers/*` → triggers `marketplace-product-processor` Lambda on ObjectCreated
- Pre-signed URLs (15-min TTL) issued by Spring Boot API for secure seller product image uploads without exposing credentials
- S3 Batch Replication job to backfill pre-existing objects into `marketplace-tool-artifacts-dr`

**SSE-KMS + CRR note:** `marketplace-s3-replication-role` has `kms:GenerateDataKey` on source MRK key (ap-southeast-1) and `kms:Encrypt` on replica MRK key (ap-south-1). S3 treats Multi-Region Keys as single-region — it still calls the local KMS endpoint in each region; MRK benefit is that objects encrypted with the primary are decryptable with the replica (same key material) satisfying the "same key in both regions" compliance requirement.

---

### ✅ Topic 7: DNS, Caching and Performance Optimization

**SAA-C03 coverage:** Route 53 Routing Policies, Health Checks, Failover, Private Hosted Zones, CloudFront Distributions, Signed URLs, OAC, AWS Global Accelerator

**Marketplace additions:**
- Route 53 public hosted zone `marketplace.ami.com` — ALB alias record (A/AAAA), latency-based routing between ap-southeast-1 and ap-south-1 DR
- `marketplace-cloudfront-distribution` — CDN for the marketplace React web app (S3 origin); Origin Access Control (OAC) restricts direct S3 access; custom cache behaviours: `/api/*` pass-through (no cache), `/static/*` TTL 86400s
- CloudFront signed URLs (15-min TTL) for premium tool documentation downloads from `marketplace-tool-artifacts`
- Route 53 health checks on `marketplace-alb` — auto failover to `marketplace-alb-dr` in ap-south-1 if primary unhealthy
- `marketplace-global-accelerator` — two static Anycast IPs for enterprise customers requiring fixed IPs for firewall allowlisting; routes to nearest ALB endpoint

---

### ✅ Topic 8: Block & File Storage

**SAA-C03 coverage:** EBS Volume Types, Snapshots, Encryption, DLM, EBS Multi-Attach, Amazon EFS, EFS Performance/Throughput Modes, EFS Access Points, Instance Store

**Marketplace additions:**
- EC2 instances in `marketplace-api-asg` use gp3 EBS root volumes (30 GB, 3000 IOPS, 125 MB/s); encrypted with `marketplace-ebs-key` KMS CMK
- `marketplace-orders-db` RDS instances use io2 EBS volumes (3000 IOPS) for consistent sub-ms DB latency
- `marketplace-efs-shared` — Amazon EFS (General Purpose performance mode, Bursting throughput) mounted on all ECS task containers and EC2 instances for shared configuration files and tool staging area
- EFS Access Points per environment (`/prod`, `/dev`) with enforced POSIX UID/GID for isolation
- Data Lifecycle Manager (DLM) policy: daily EBS snapshots at 02:00 UTC, retain 7 snapshots, copy to ap-south-1 for DR

---

### ✅ Topic 9: Amazon ECS and EKS (Docker containers)

**SAA-C03 coverage:** ECR, ECS Task Definitions, ECS Services, Fargate vs EC2 Launch Types, ECS Service Auto Scaling, Rolling Updates, Blue/Green (CodeDeploy), Task Role vs Execution Role, EKS Overview, IRSA

**Marketplace additions:**
- `marketplace-ecs-cluster` — ECS cluster hosting the containerised marketplace API
- ECR repository `marketplace/api` — Docker images tagged by Git SHA; lifecycle policy retains last 10 images; image scanning on push enabled
- ECS Task Definition `marketplace-api-task` — Fargate launch type, 1 vCPU / 2 GB RAM, awsvpc networking mode; mounts `marketplace-efs-shared`
- ECS Service `marketplace-api-service` — desired=3, min=2/max=10; Application Load Balancer target group integration; blue/green deployments via AWS CodeDeploy
- ECS Service Auto Scaling: Target Tracking on ALBRequestCountPerTarget > 1000 per task
- Task Role `marketplace-ecs-task-role` (runtime permissions: DynamoDB, S3, SQS, SNS) separate from Execution Role `marketplace-ecs-execution-role` (ECR pull, CloudWatch Logs, Secrets Manager)
- Container Insights enabled on `marketplace-ecs-cluster` for per-container CPU/memory/network metrics without CloudWatch Agent

---

### ✅ Topic 10: Serverless Application

**SAA-C03 coverage:** Lambda Execution Model, Cold Start, Concurrency (Reserved & Provisioned), Layers, API Gateway (REST/HTTP/WebSocket), API Gateway Authorizers, SQS DLQ, SNS Fan-out, Step Functions (Standard vs Express), CloudWatch Metrics/Logs/Alarms, EventBridge

**Marketplace additions:**
- `marketplace-order-processor` Lambda (Node.js 18.x, 512 MB, 5-min timeout) — triggered by SQS order-events-queue (batchSize=10); reserved concurrency=50, provisioned concurrency=10 on prod alias
- `marketplace-api-gw` (REST API, Regional) — Cognito User Pool Authorizer, GET /products cached 300s, POST /subscriptions, GET /orders/{id}; Usage Plan `marketplace-enterprise-plan` (10,000 req/day, 100 RPS) with API Keys per enterprise customer
- `order-events-queue` (SQS Standard) — VisibilityTimeout=300s, ReceiveMessageWaitTimeSeconds=20 (long polling); RedrivePolicy to `order-events-dlq` after 3 failures
- `order-events-dlq` — retention=14 days; CloudWatch Alarm fires when depth > 0
- `marketplace-notifications` (SNS Standard) — fan-out to order-events-queue (filter: order_placed), audit-queue (no filter), buyer email; raw message delivery enabled
- `marketplace-order-workflow` (Step Functions Standard) — 5-state machine: ValidateOrder → ChargePayment (Retry 3×/Catch) → DeployTool → Parallel(UpdateOrders + NotifyBuyer); replaces Lambda-chaining
- CloudWatch Alarm `marketplace-order-error-alarm` + Composite Alarm `marketplace-critical-incident-alarm` (AND: Lambda Errors + DLQ depth + ALB 5xx)
- EventBridge rule `marketplace-nightly-cleanup` — cron(0 2 * * ? *) → cleanup Lambda to archive orders older than 90 days

---

### ✅ Topic 11: AWS Databases and Analytics

**SAA-C03 coverage:** RDS Multi-AZ, Read Replicas, Aurora Global DB, Backtrack, DynamoDB Streams, DAX, GSI, ElastiCache Redis, Kinesis Data Streams, Kinesis Firehose, Athena, Glue, Redshift, EMR

**Marketplace additions:**
- `marketplace-orders-db` (RDS PostgreSQL 15, db.r6g.large, Multi-AZ) — Orders & Subscriptions tables; Read Replica in ap-southeast-1c for finance reports; credentials rotated via Secrets Manager
- `marketplace-aurora-cluster` (Aurora MySQL 8.0, db.r6g.large writer + reader) — Products & Sellers catalog; Backtrack=72h; Aurora Auto Scaling readers (max=5); Global Database secondary in ap-south-1; Aurora Serverless v2 (`marketplace-analytics-cluster`, 0.5–32 ACU) for ad-hoc reporting
- `marketplace-dax-cluster` (DAX r6g.large, 3 nodes, 3 AZs) — in-memory cache in front of DynamoDB Products table; microsecond GET latency; Spring Boot uses DAX SDK
- DynamoDB `Products` table: Streams enabled (NEW_AND_OLD_IMAGES) → `marketplace-product-indexer` Lambda → Elasticsearch; GSI `SellerId-Price-Index`; PITR enabled
- `marketplace-redis-cluster` (ElastiCache Redis 7.0, cache.r7g.large, 2 nodes, Multi-AZ) — session token store (TTL 30 min) + hot product cache (TTL 5 min); in-transit + at-rest encryption; AUTH token in Secrets Manager
- `marketplace-order-stream` (Kinesis Data Streams, 4 shards, 24h retention) — order events published by Lambda; enhanced fan-out consumer `marketplace-fraud-detector` (70ms latency); `marketplace-order-firehose` delivers Parquet to `marketplace-analytics-raw`
- `marketplace-analytics-crawler` (Glue Crawler, nightly 01:00 UTC) — discovers Parquet schema in S3, populates `marketplace_analytics` Glue DB; Athena workgroup `marketplace-finance-wg` with 10 GB scan limit per query

---

### ✅ Topic 12: Deployment & Management

**SAA-C03 coverage:** CloudFormation Stacks, Change Sets, Stack Policy, Drift Detection, Nested Stacks, StackSets (SERVICE_MANAGED), Elastic Beanstalk, AWS Config Rules, Conformance Packs, Systems Manager (Parameter Store, Session Manager, Patch Manager, Run Command, Inventory, Automation), AWS Resource Access Manager, OpsWorks

**Marketplace additions:**
- `marketplace-core-stack` (CloudFormation) — defines entire marketplace-prod infrastructure (VPC, ASG, RDS, ElastiCache, SQS, SNS, IAM); Change Sets used for every production update; Stack Policy protects RDS from accidental replacement; Termination Protection enabled; weekly Drift Detection via EventBridge → Lambda
- `marketplace-customer-bootstrap-stackset` (StackSets, SERVICE_MANAGED) — deploys `Marketplace-Deploy-Role` into every account in CustomerAccounts OU; AutoDeployment=true; FailureTolerancePercentage=10; MaxConcurrentPercentage=20
- SSM Parameter Store hierarchy `/marketplace/prod/*` (SecureString, KMS key=`marketplace-kms-key`) — DB credentials, Stripe API key, feature flags; Spring Boot reads at startup via AWS SDK (no hardcoded secrets or env vars)
- Session Manager enabled on all EC2 instances — no port 22 open in any security group; all sessions logged to CloudWatch Logs `/marketplace/ssm-sessions`
- Patch Manager maintenance window `marketplace-patch-window` (Sunday 02:00–04:00 UTC) — `AWS-RunPatchBaseline` document on all `Environment=prod` instances; compliance reports to ops team
- AWS Config org-wide aggregator `marketplace-org-aggregator` — rules: `rds-multi-az-support`, `s3-bucket-server-side-encryption-enabled`, `ec2-instance-no-public-ip-association`; auto-remediation via SSM Automation runbooks; Conformance Pack `marketplace-security-baseline.yaml` deployed via StackSets
- RAM Resource Share `marketplace-subnet-share` — private subnets shared from marketplace-prod (234567890123) to marketplace-analytics account via Organizations OU; no VPC peering or data transfer cost
- `marketplace-api-beanstalk` (Elastic Beanstalk, Java 17, dev/test account) — Rolling with additional batch (50%) deployment policy; Managed Platform Updates enabled; environment variables inject DB/Redis endpoints

---

### ✅ Topic 13: Monitoring, Logging and Auditing

**SAA-C03 coverage:** CloudWatch Metrics (default + custom + high-resolution), CloudWatch Agent, CloudWatch Logs, Metric Filters, Logs Insights, Alarms (Simple + Composite), Dashboards, Anomaly Detection, Container Insights, AWS CloudTrail (Management + Data Events, Log File Validation, Lake), AWS X-Ray (Active Tracing, SDK, Sampling Rules, Groups), Amazon EventBridge (Scheduled Rules, Event Patterns, Custom Buses, Archive + Replay)

**Marketplace additions:**
- CloudWatch Agent on all `marketplace-api-asg` EC2 instances — publishes `mem_used_percent`, `disk_used_percent`; custom metrics `MarketplacePlatform/OrderProcessingDurationMs` (from Lambda) and `MarketplacePlatform/ActiveOrderCount` (from EC2)
- CloudWatch Dashboard `marketplace-ops-dashboard` — EC2 CPU, ALB RequestCount, Lambda Errors, DynamoDB ConsumedWriteCapacity, ECS CPUUtilization, custom order KPIs; metric math for error rate %
- Metric Filters on `/aws/lambda/marketplace-order-processor`: `LambdaOrderErrors` (pattern=ERROR) and `LambdaPaymentErrors` (pattern=PAYMENT_FAILED) → CloudWatch alarms
- Log retention policies set on all log groups (90 days for Lambda; 180 days for EC2); subscription filter streams Lambda logs to Kinesis Firehose for long-term S3 archiving
- Composite Alarm `marketplace-critical-incident-alarm` (AND logic: Lambda Errors + DLQ depth + ALB 5xx) — on-call SNS page; individual alarms send low-priority email only
- `marketplace-org-trail` (CloudTrail, organisational, multi-region) — delivers to `marketplace-tool-artifacts/cloudtrail-logs/` (SSE-KMS, log file validation enabled); Data Events on `marketplace-tool-artifacts` S3 bucket and `marketplace-order-processor` Lambda; EventBridge rule for IAM change alerts (AttachRolePolicy, CreateUser, DeleteRole)
- X-Ray active tracing on `marketplace-api-gw` and `marketplace-order-processor` Lambda; X-Ray SDK wraps all AWS SDK calls (automatic subsegments for DynamoDB, SNS, SQS); custom annotations (orderId, environment); sampling rule captures 100% of requests with total duration > 2s
- EventBridge custom bus `marketplace-tool-deployment-bus` — cross-account events from customer accounts during tool deployment; Archive `marketplace-events-archive` (30-day retention) enables event replay after downstream failures

---

### ✅ Topic 14: Security in the Cloud

**SAA-C03 coverage:** Cognito User Pools, Cognito Identity Pools, AWS Directory Service (Managed AD, AD Connector, Simple AD), AWS KMS (CMKs, Key Policies, MRK, Rotation, Envelope Encryption), AWS CloudHSM (FIPS 140-2 Level 3), AWS WAF (Web ACL, Managed Rules, Rate Limiting), AWS Shield (Standard + Advanced), AWS Secrets Manager, AWS Macie, AWS GuardDuty

**Marketplace additions:**
- `marketplace-buyer-pool` (Cognito User Pool) — buyer sign-up/sign-in, MFA (TOTP optional), Google/Facebook federation, Hosted UI at `marketplace.auth.ap-southeast-1.amazoncognito.com`; API Gateway Cognito Authorizer (cache 300s); Lambda triggers (Pre-SignUp validation, Post-Confirmation profile creation)
- `marketplace-identity-pool` (Cognito Identity Pool) — authenticated sellers get temp STS credentials scoped to `marketplace-products-bucket/uploads/${cognito-identity.amazonaws.com:sub}/*` for direct browser-to-S3 uploads; unauthenticated guests get read-only access to `marketplace-products-bucket/public/*`
- KMS CMKs: `marketplace-s3-key` (MRK, primary ap-southeast-1 + replica ap-south-1), `marketplace-rds-key`, `marketplace-dynamo-key`, `marketplace-secrets-key`, `marketplace-ebs-key`, `marketplace-cloudtrail-key`; all with annual auto-rotation; SSE-KMS on all S3 buckets, RDS, DynamoDB, EBS, Secrets Manager
- `marketplace-hsm-cluster` (CloudHSM, 2× hsm1.medium in AZ-a/AZ-b, FIPS 140-2 Level 3) — for finserv-corp enterprise customer requiring Level 3 compliance for transaction signing; Spring Boot uses JCE CaviumProvider; HSM credentials in Secrets Manager
- WAF Web ACL `marketplace-web-acl` (REGIONAL, associated with `marketplace-alb` + `marketplace-api-gw`): rules in priority order — (1) AWSManagedRulesCommonRuleSet, (2) AWSManagedRulesBotControlRuleSet (scoped to /api/auth/*), (3) rate-limit rule (2000 req/5min per IP → BLOCK), (4) geo-block rule for non-business regions; WAF logs to S3 + Firehose
- Shield Advanced enabled on `marketplace-alb` and `marketplace-nlb`; DRT access role configured; cost protection active
- `marketplace-managed-ad` (AWS Managed Microsoft AD, marketplace.ami.internal, Standard edition) — forest trust to finserv.local on-premises AD via Direct Connect; IAM Identity Center uses Managed AD as identity source; permission sets `MarketplaceReadOnly` and `MarketplaceAdmin` assigned to finserv AD groups

---

### ✅ Topic 15: Migration and Transfer

**SAA-C03 coverage:** AWS MGN (Application Migration Service), AWS DMS, AWS Schema Conversion Tool (SCT), AWS DataSync, AWS Snow Family (Snowball Edge, Snowmobile, Snowcone), AWS Transfer Family (SFTP/FTP/FTPS), AWS Migration Hub, Migration Strategies (7 Rs)

**Marketplace additions:**
- **MGN lift-and-shift** — 4 on-premises Spring Boot API servers migrated to EC2 in `marketplace-vpc` via MGN; Replication Agent installed; Test Instances validated before 30-minute cutover window; Route 53 A record flipped at cutover; post-migration modernisation to ECS Fargate underway
- `marketplace-dms-instance` (DMS, dms.r5.large, Multi-AZ) — Full Load + CDC migration of on-premises PostgreSQL 14 `marketplace_orders` database to `marketplace-aurora-cluster` (Aurora PostgreSQL 15); WAL-level logical replication enabled on source; zero-lag cutover in < 5 minutes
- **SCT** — used for finserv-corp Oracle 19c → Aurora PostgreSQL heterogeneous migration; 85% objects auto-converted, 10% minor manual fixes, 5% complex rewrites (CONNECT BY → recursive CTE); SCT-generated DDL applied to Aurora before DMS data load
- `marketplace-datasync-agent` (DataSync Agent VM, on-premises NFS network) — hourly incremental sync of 50 TB tool artifacts from on-prem NFS to `marketplace-tool-artifacts`; verifyMode=ONLY_FILES_TRANSFERRED; bandwidth throttled 100 Mbps peak / 1 Gbps off-peak
- **Snowball Edge** — 5× Storage Optimized (80 TB each) ordered for 400 TB historical log migration to `marketplace-analytics-raw/historical/`; SSE-KMS encryption with `marketplace-s3-key`; post-import Glue Crawler run to register new partitions
- `marketplace-sftp-server` (Transfer Family, SFTP, VPC endpoint with Elastic IPs) — enterprise seller ERP systems upload product assets via SFTP directly to `marketplace-products-bucket/sellers/{username}/`; logical home directory mappings isolate each seller; S3 event notification triggers `marketplace-product-processor` Lambda on upload; session logs to CloudWatch Logs

---

## Complete AWS Resources Summary (All Topics 1–15)

| Service | Resource Name | Region | Purpose |
|---------|--------------|--------|---------|
| **Compute** ||||
| EC2 (ASG) | `marketplace-api-asg` (min=2/max=10/desired=3) | ap-southeast-1 | Spring Boot Java API fleet |
| EC2 AMI | `marketplace-api-golden-ami-v1` | ap-southeast-1/ap-south-1 | Hardened base image with Java 17 + CW Agent |
| ECS Cluster | `marketplace-ecs-cluster` | ap-southeast-1 | Fargate container orchestration |
| ECS Service | `marketplace-api-service` (desired=3) | ap-southeast-1 | Containerised API (blue/green via CodeDeploy) |
| ECR | `marketplace/api` | ap-southeast-1 | Docker image registry (scan on push) |
| Lambda | `marketplace-order-processor` (Node.js 18.x) | ap-southeast-1 | Order processing pipeline |
| Lambda | `marketplace-product-indexer` | ap-southeast-1 | DynamoDB Streams → Elasticsearch indexer |
| Lambda | `marketplace-fraud-detector` | ap-southeast-1 | Kinesis stream consumer — real-time fraud detection |
| Lambda | `marketplace-product-processor` | ap-southeast-1 | S3 upload validator + indexer (Transfer Family trigger) |
| Lambda | `marketplace-cleanup-lambda` | ap-southeast-1 | Nightly archival of orders >90 days |
| Step Functions | `marketplace-order-workflow` (Standard) | ap-southeast-1 | 5-step order purchase orchestration |
| **Networking** ||||
| VPC | `marketplace-vpc` (10.0.0.0/16) | ap-southeast-1 | Main platform network |
| ALB | `marketplace-alb` (HTTPS 443) | ap-southeast-1 | Application Load Balancer — API traffic |
| NLB | `marketplace-nlb` (static EIP) | ap-southeast-1 | Network Load Balancer — MCP tool streaming |
| NAT GW | `marketplace-nat-gw` | ap-southeast-1 | Private subnet outbound internet |
| VPC Endpoint | `marketplace-s3-endpoint` (Gateway) | ap-southeast-1 | Free S3 private access |
| VPC Endpoint | `marketplace-dynamodb-endpoint` (Gateway) | ap-southeast-1 | Free DynamoDB private access |
| VPC Endpoint | `marketplace-sqs-endpoint` (Interface) | ap-southeast-1 | Private SQS access |
| VPC Endpoint | `marketplace-kms-endpoint` (Interface) | ap-southeast-1 | Private KMS access (compliance) |
| VPC Endpoint | `marketplace-ssm-endpoint` (Interface) | ap-southeast-1 | SSM Session Manager (no port 22) |
| PrivateLink | `marketplace-api-endpoint-service` | ap-southeast-1 | Private API access for enterprise customers |
| Route 53 | `marketplace.ami.com` hosted zone | Global | DNS with latency routing + health check failover |
| CloudFront | `marketplace-cloudfront-distribution` | Global | CDN for React web app; OAC on S3 origin |
| Global Accelerator | `marketplace-global-accelerator` | Global | Static Anycast IPs for enterprise customers |
| **Storage** ||||
| S3 | `marketplace-products-bucket` | ap-southeast-1 | Product images and metadata; CORS for browser uploads |
| S3 | `marketplace-tool-artifacts` | ap-southeast-1 | Tool deployment packages (WORM, Object Lock, CRR) |
| S3 | `marketplace-tool-artifacts-dr` | ap-south-1 | CRR DR destination; same MRK key material |
| S3 | `marketplace-staging-bucket` | ap-southeast-1 | Customer tool provisioning staging area |
| S3 | `marketplace-analytics-raw` | ap-southeast-1 | Firehose Parquet delivery; Athena partition source |
| S3 | `marketplace-athena-results` | ap-southeast-1 | Athena query output |
| EFS | `marketplace-efs-shared` | ap-southeast-1 | Shared config + staging files for ECS tasks and EC2 |
| **Databases** ||||
| RDS | `marketplace-orders-db` (PostgreSQL 15, Multi-AZ) | ap-southeast-1 | Orders & Subscriptions (relational, ACID) |
| Aurora | `marketplace-aurora-cluster` (MySQL 8.0) | ap-southeast-1 | Products & Sellers catalog (high-read, Global DB) |
| Aurora Global DB | Secondary cluster | ap-south-1 | Sub-1s replica for DR and India reads |
| Aurora Serverless v2 | `marketplace-analytics-cluster` (0.5–32 ACU) | ap-southeast-1 | Ad-hoc reporting (scales to zero when idle) |
| DynamoDB | `Products` | ap-southeast-1 | Product catalog (on-demand, Streams, DAX, GSI) |
| DynamoDB | `Orders` | ap-southeast-1 | Purchase orders (provisioned RCU=100/WCU=50) |
| DynamoDB | `Subscriptions` | ap-southeast-1 | Enterprise subscriber subscriptions |
| DAX | `marketplace-dax-cluster` (3× r6g.large) | ap-southeast-1 | In-memory cache for DynamoDB Products reads |
| ElastiCache | `marketplace-redis-cluster` (Redis 7.0, 2× r7g.large) | ap-southeast-1 | Session tokens (TTL 30 min) + hot product cache (TTL 5 min) |
| **Messaging & Streaming** ||||
| SQS | `order-events-queue` (Standard) | ap-southeast-1 | Async order processing; VisibilityTimeout=300s |
| SQS | `order-events-dlq` | ap-southeast-1 | Dead-letter queue for failed order messages |
| SQS | `order-events-fifo.fifo` | ap-southeast-1 | Ordered Leaderboard tool updates per team |
| SQS | `marketplace-audit-queue` | ap-southeast-1 | SNS subscription — all events for compliance log |
| SNS | `marketplace-notifications` (Standard) | ap-southeast-1 | Fan-out to SQS + email + audit queue |
| SNS | `marketplace-notifications-fifo.fifo` | ap-southeast-1 | Ordered tool deployment events |
| Kinesis Streams | `marketplace-order-stream` (4 shards) | ap-southeast-1 | Real-time order event ingestion |
| Kinesis Firehose | `marketplace-order-firehose` | ap-southeast-1 | Buffered Parquet delivery to S3 (60s / 5 MB) |
| **API & Gateway** ||||
| API Gateway | `marketplace-api-gw` (REST, Regional) | ap-southeast-1 | Public marketplace API with Cognito authorizer |
| Transfer Family | `marketplace-sftp-server` (SFTP, VPC + EIP) | ap-southeast-1 | Legacy SFTP uploads from seller ERPs to S3 |
| **Security & Identity** ||||
| Cognito | `marketplace-buyer-pool` (User Pool) | ap-southeast-1 | Buyer authentication, MFA, JWT issuance |
| Cognito | `marketplace-identity-pool` (Identity Pool) | ap-southeast-1 | Temp AWS credentials for S3 uploads + guest access |
| KMS CMK | `marketplace-s3-key` (Multi-Region, primary) | ap-southeast-1 | S3 buckets encryption |
| KMS CMK | `marketplace-s3-key` (MRK replica) | ap-south-1 | Same key material for DR bucket decryption |
| KMS CMK | `marketplace-rds-key` | ap-southeast-1 | RDS + Aurora encryption |
| KMS CMK | `marketplace-dynamo-key` | ap-southeast-1 | DynamoDB encryption |
| KMS CMK | `marketplace-secrets-key` | ap-southeast-1 | Secrets Manager encryption |
| KMS CMK | `marketplace-ebs-key` | ap-southeast-1 | EBS volume encryption |
| KMS CMK | `marketplace-cloudtrail-key` | ap-southeast-1 | CloudTrail log encryption |
| CloudHSM | `marketplace-hsm-cluster` (2× hsm1.medium) | ap-southeast-1 | FIPS 140-2 Level 3 HSM for finserv-corp signing |
| WAF | `marketplace-web-acl` (REGIONAL) | ap-southeast-1 | OWASP rules + bot control + rate limiting on ALB + API GW |
| Shield | Advanced on ALB + NLB | ap-southeast-1 | DDoS protection with DRT access |
| Directory | `marketplace-managed-ad` (Managed Microsoft AD) | ap-southeast-1 | Enterprise SSO via IAM Identity Center + forest trust |
| **Monitoring & Operations** ||||
| CloudWatch | `marketplace-ops-dashboard` | ap-southeast-1 | Unified ops dashboard (EC2, ALB, Lambda, DynamoDB, ECS) |
| CloudWatch Alarm | `marketplace-critical-incident-alarm` (Composite) | ap-southeast-1 | AND composite — on-call page (Lambda + DLQ + ALB 5xx) |
| CloudTrail | `marketplace-org-trail` (org-wide, multi-region) | Global | API audit trail for all accounts |
| CloudTrail Lake | `marketplace-audit-lake` | ap-southeast-1 | SQL-queryable event store (90-day retention) |
| X-Ray | Active tracing on API GW + Lambda + Step Functions | ap-southeast-1 | Distributed trace — end-to-end order flow latency |
| EventBridge | `marketplace-tool-deployment-bus` (custom bus) | ap-southeast-1 | Cross-account tool deployment events |
| EventBridge Archive | `marketplace-events-archive` (30-day) | ap-southeast-1 | Event replay after downstream failures |
| **Deployment & Management** ||||
| CloudFormation | `marketplace-core-stack` | ap-southeast-1 | Full platform IaC (Change Sets, Stack Policy, Drift Detection) |
| CloudFormation | `marketplace-customer-bootstrap-stackset` | ap-southeast-1 | Auto-deploys Marketplace-Deploy-Role to all customer accounts |
| SSM | Parameter Store `/marketplace/prod/*` | ap-southeast-1 | Secrets + config for Spring Boot (SecureString, KMS-encrypted) |
| SSM | Patch Manager window `marketplace-patch-window` | ap-southeast-1 | Sunday 02:00 UTC patching for all prod EC2 instances |
| Config | `marketplace-org-aggregator` | Global | Org-wide compliance visibility |
| Beanstalk | `marketplace-api-beanstalk` (Java 17) | ap-southeast-1 | Dev/test managed platform for Spring Boot API |
| RAM Share | `marketplace-subnet-share` | ap-southeast-1 | Private subnets shared to marketplace-analytics account |
| **Analytics** ||||
| Glue | `marketplace-analytics-crawler` (nightly) | ap-southeast-1 | Auto-discovers Parquet schema in S3 → Data Catalog |
| Glue DB | `marketplace_analytics` | ap-southeast-1 | Data Catalog for Athena |
| Athena | Workgroup `marketplace-finance-wg` (10 GB limit) | ap-southeast-1 | Ad-hoc SQL on S3 Parquet (revenue, seller analytics) |
| **Migration** ||||
| DMS | `marketplace-dms-instance` (dms.r5.large, Multi-AZ) | ap-southeast-1 | Full Load + CDC migration of Orders DB to Aurora |
| DataSync | `marketplace-datasync-agent` (on-premises VM) | ap-southeast-1 | NFS → S3 tool artifact sync (hourly incremental) |
| Transfer Family | `marketplace-sftp-server` | ap-southeast-1 | SFTP endpoint for legacy seller ERP file uploads |

---

*Last updated: All 15 topics complete (IAM, EC2, Auto Scaling & ELB, VPC, AWS Organizations, S3 & Glacier, DNS & Caching, Block & File Storage, ECS & EKS, Serverless Application, Databases & Analytics, Deployment & Management, Monitoring & Auditing, Security in the Cloud, Migration & Transfer)*
