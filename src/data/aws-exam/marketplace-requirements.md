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
| Account A | `marketplace-prod` | AMI PVT LTD platform — API, data, artifact storage |
| Account B | `customer-account` | Each subscriber's AWS account (tool deployment target) |

**Tech stack:**
- Server/EC2 workloads: **Spring Boot (Java)**
- Serverless workloads: **Node.js (Lambda)**
- IaC: **AWS CDK (TypeScript)** — to be implemented after all topics complete

---

## Topics Completed

### ✅ Topic 1: IAM — Identity & Access Management

**SAA-C03 coverage:** IAM Users, Groups, Roles, MFA, Federation, STS, Resource-Based Policies, Policy Evaluation

---

#### 1.1 Team Access Control (IAM Users & Groups)

**What's built:**
- `Engineering-Group` — IAM Group for the engineering team
- `MarketplaceOps-Group` — IAM Group for marketplace operations (product listings management)
- `Finance-Group` — IAM Group for finance/billing read access
- MFA enforced on all users via deny-without-MFA guardrail policy
- Password policy: 14 chars minimum, 90-day rotation, no reuse of last 5

**IAM resources:**
```
IAM Groups:
  - Engineering-Group           → Lambda, EC2, CloudFormation, CloudWatch (MFA required)
  - MarketplaceOps-Group        → DynamoDB Products table, S3 marketplace-products-bucket (R/W)
  - Finance-Group               → Billing read-only, Cost Explorer read

IAM Users:
  - (one per employee) → assigned to respective group
  - All require virtual MFA device
```

---

#### 1.2 Marketplace Core API — EC2 Instance Profile

**What's built:**
- `Marketplace-API-EC2-Role` — IAM Role with EC2 instance profile
- Spring Boot (Java) API on EC2; credentials sourced automatically from IMDS (no hardcoded keys)

**IAM resources:**
```
Role: Marketplace-API-EC2-Role
  Trust Policy: ec2.amazonaws.com (AssumeRole)
  Permission Policy:
    - DynamoDB: GetItem, PutItem, UpdateItem, Query, Scan
        → arn:aws:dynamodb:ap-southeast-1:*:table/Products
        → arn:aws:dynamodb:ap-southeast-1:*:table/Orders
    - S3: GetObject, PutObject, ListBucket
        → arn:aws:s3:::marketplace-products-bucket
        → arn:aws:s3:::marketplace-products-bucket/*
    - SQS: SendMessage, GetQueueAttributes
        → arn:aws:sqs:ap-southeast-1:*:order-events-queue
```

**AWS resources used:**
- EC2 instance (Spring Boot API server)
- DynamoDB tables: `Products`, `Orders`
- S3 bucket: `marketplace-products-bucket`
- SQS queue: `order-events-queue`

---

#### 1.3 Order Processing Pipeline — Lambda Execution Role

**What's built:**
- `Marketplace-OrderProcessor-Lambda-Role` — IAM Execution Role for the order processor Lambda
- Node.js Lambda triggered by SQS; processes purchases end-to-end

**IAM resources:**
```
Role: Marketplace-OrderProcessor-Lambda-Role
  Trust Policy: lambda.amazonaws.com (AssumeRole)
  Managed Policy attached: AWSLambdaBasicExecutionRole (CloudWatch Logs)
  Permission Policy:
    - SQS: ReceiveMessage, DeleteMessage, GetQueueAttributes
        → arn:aws:sqs:ap-southeast-1:*:order-events-queue
    - DynamoDB: GetItem, UpdateItem, PutItem
        → arn:aws:dynamodb:ap-southeast-1:*:table/Orders
    - S3: GetObject
        → arn:aws:s3:::marketplace-tool-artifacts/*
    - S3: PutObject
        → arn:aws:s3:::marketplace-staging-bucket/*
    - SNS: Publish
        → arn:aws:sns:ap-southeast-1:*:marketplace-notifications
```

**AWS resources used:**
- Lambda function: `marketplace-order-processor` (Node.js)
- SQS queue: `order-events-queue` (trigger source)
- DynamoDB table: `Orders`
- S3 buckets: `marketplace-tool-artifacts` (read), `marketplace-staging-bucket` (write)
- SNS topic: `marketplace-notifications`

---

#### 1.4 Enterprise Customer SSO — SAML Federation

**What's built:**
- SAML IdP registered in IAM for enterprise subscriber Azure AD integration
- `Enterprise-Viewer-Role` and `Enterprise-Admin-Role` for federated access
- No IAM users created for enterprise subscriber employees

**IAM resources:**
```
SAML Provider: arn:aws:iam::*:saml-provider/AzureAD-{CustomerName}
  (one per enterprise subscriber)

Roles (per enterprise subscriber):
  Enterprise-Viewer-Role
    Trust Policy: Federated = SAML IdP ARN, Condition: SAML:aud = AWS signin endpoint
    Permission: DynamoDB read on Products, Subscriptions; S3 read on marketplace-products-bucket

  Enterprise-Admin-Role
    Trust Policy: same as above
    Permission: DynamoDB read/write on Subscriptions; additional management actions
```

---

#### 1.5 Tool Deployment — Cross-Account Role

**What's built:**
- `Marketplace-DeploymentAgent-Role` in Account A — calls STS AssumeRole into customer accounts
- `Marketplace-Deploy-Role` in Account B (each customer) — assumed by the Deployment Agent
- ExternalId condition prevents confused-deputy attacks
- All deployment actions appear in customer CloudTrail under Marketplace account identity

**IAM resources:**
```
In Marketplace Account-A:
  Role: Marketplace-DeploymentAgent-Role
    Permission: sts:AssumeRole → arn:aws:iam::CUSTOMER-ACCT-ID:role/Marketplace-Deploy-Role

In Customer Account-B (per customer):
  Role: Marketplace-Deploy-Role
    Trust Policy: Principal = Marketplace-DeploymentAgent-Role ARN
                  Condition: sts:ExternalId = marketplace-deploy-secret-token-xyz
    Permission:
      - CloudFormation: CreateStack, UpdateStack, DescribeStacks, DescribeStackEvents
          → arn:aws:cloudformation:*:*:stack/marketplace-tool-*
      - Lambda: CreateFunction, UpdateFunctionCode, GetFunction, AddPermission
          → arn:aws:lambda:*:*:function:marketplace-*
      - DynamoDB: CreateTable, DescribeTable
          → arn:aws:dynamodb:*:*:table/marketplace-*
```

---

#### 1.6 Artifact Distribution — Resource-Based Policy (S3)

**What's built:**
- `marketplace-tool-artifacts` S3 bucket policy granting cross-account read to customer provisioning roles
- Customer `Provisioning-Service-Role` identity policy allowing access to the bucket
- Both sides required for cross-account access

**IAM resources:**
```
S3 Bucket Policy on marketplace-tool-artifacts (Account-A):
  Principal: arn:aws:iam::CUSTOMER-ACCT-ID:role/Provisioning-Service-Role
  Actions: s3:GetObject, s3:ListBucket
  Resources: marketplace-tool-artifacts, marketplace-tool-artifacts/*

Customer Account-B Identity Policy on Provisioning-Service-Role:
  Actions: s3:GetObject, s3:ListBucket
  Resources: same bucket ARNs as above
```

---

## AWS Resources Summary (post-IAM topic)

| Service | Resource Name | Purpose |
|---------|--------------|---------|
| EC2 | Marketplace API Server | Spring Boot core API |
| Lambda | `marketplace-order-processor` | Node.js order processing pipeline |
| DynamoDB | `Products` | Product catalog |
| DynamoDB | `Orders` | Purchase orders |
| DynamoDB | `Subscriptions` | Enterprise subscriber subscriptions |
| S3 | `marketplace-products-bucket` | Product images and metadata |
| S3 | `marketplace-tool-artifacts` | Tool deployment packages (Lambda ZIPs, CFN templates) |
| S3 | `marketplace-staging-bucket` | Staging area for customer tool provisioning |
| SQS | `order-events-queue` | Async order processing queue |
| SNS | `marketplace-notifications` | Buyer/seller notification topic |

---

## Upcoming Topics (to be added)

Each topic below will extend the marketplace system with new AWS services and design patterns.

| Topic | Planned Marketplace Feature |
|-------|---------------------------|
| EC2 & AMIs | Auto Scaling marketplace API servers, custom AMI for Spring Boot |
| S3 Advanced | Tool artifact versioning, lifecycle policies, cross-region replication |
| RDS / Aurora | Migrate Orders & Subscriptions from DynamoDB to Aurora PostgreSQL |
| VPC & Networking | Private subnets for EC2/RDS, NAT Gateway, Security Groups, VPC endpoints |
| CloudFront & API Gateway | CDN for marketplace UI, REST API Gateway in front of Lambda |
| SQS & SNS | Fan-out notification patterns, DLQ for failed order processing |
| ECS / EKS | Containerize Spring Boot API (Docker → ECS Fargate) |
| CloudFormation / CDK | Full IaC for the entire system (post all topics) |
| Monitoring | CloudWatch dashboards, alarms, X-Ray tracing for Lambda |
| Security | WAF, Shield, Secrets Manager, KMS encryption for S3 and DynamoDB |

---

*Last updated: IAM topic complete (Scenario 1–6)*
