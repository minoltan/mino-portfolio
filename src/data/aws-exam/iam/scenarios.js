import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform IAM scenarios
 *
 * Project context: AMI PVT LTD operates a multi-tenant SaaS marketplace where businesses
 * purchase and deploy small AWS-powered productivity tools (MCP report servers, leaderboards,
 * skill matrices, spin-the-wheel apps, etc.). Sellers publish tools; buyers subscribe and
 * provision them into their own AWS accounts.
 *
 * Architecture accounts:
 *   Account A — marketplace-prod  (the AMI PVT LTD platform)
 *   Account B — customer-account  (a subscriber's AWS account)
 *
 * Tech stack: Spring Boot (Java) for server/EC2 workloads, Node.js for serverless Lambda.
 */

const scenarios = [
    {
        id: 1,
        icon: "👥",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "IAM Users, Groups & MFA",
        subtitle: "AMI PVT LTD team structured access control",
        useCase: {
            title: "AMI PVT LTD Marketplace — Engineering, Ops & Finance team permissions",
            story: "AMI PVT LTD operates the Marketplace platform with three internal teams. The Engineering team deploys Lambda functions, updates CloudFormation stacks, and manages EC2. The Marketplace Ops team manages product listings — reading and writing to DynamoDB and S3. The Finance team only views billing dashboards and Cost Explorer reports. Each team is an IAM Group with a scoped policy. All production write operations enforce MFA to prevent accidental or unauthorized changes.",
            diagram: [
                { actor: "Engineer (Human)", icon: "👩‍💻" },
                { arrow: "login + MFA" },
                { actor: "AWS Console / CLI", icon: "🖥️" },
                { arrow: "checks group membership" },
                { actor: "Engineering-Group Policy", icon: "📋" },
                { arrow: "grants" },
                { actor: "Lambda / EC2 / CloudFormation", icon: "☁️" },
            ],
        },
        buildSystem: [
            "Create IAM Groups: 'Engineering-Group', 'MarketplaceOps-Group', 'Finance-Group'",
            "Engineering-Group policy: EC2, Lambda, CloudFormation, CloudWatch Logs — all gated on MFA",
            "MarketplaceOps-Group policy: S3 read/write on 'marketplace-products-bucket', DynamoDB full access on 'Products' table",
            "Finance-Group policy: AWSBillingReadOnlyAccess + Cost Explorer read",
            "Create IAM User for each employee → add to their respective Group",
            "Enable virtual MFA device on all users → enforce via deny-without-MFA guardrail policy",
            "Password policy: min 14 chars, cannot reuse last 5, rotate every 90 days",
        ],
        flow: ["IAM User", "MFA Auth", "Group Policy", "AWS Services"],
        examTips: [
            "Policies attach to Groups, not individual users — scalable and auditable",
            "Deny-without-MFA guardrail uses BoolIfExists to cover both console and CLI sessions",
            "IAM Groups cannot be nested — no group-of-groups hierarchy in AWS",
            "Never assign AdministratorAccess to engineering — use scoped service permissions",
        ],
        roleJson: [
            {
                label: "Engineering-Group Permission Policy",
                note: "Attached to 'Engineering-Group'. All write actions are gated on MFA being present in the session.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "MarketplaceEngineeringAccess",
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "lambda:*",
        "cloudformation:*",
        "logs:*",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": "*",
      "Condition": {
        "Bool": {
          "aws:MultiFactorAuthPresent": "true"
        }
      }
    }
  ]
}`,
            },
            {
                label: "Deny All Write Actions Without MFA (Security Guardrail)",
                note: "Add as a second statement to block all actions when MFA is absent — even if another Allow grants them. BoolIfExists handles both console and programmatic sessions. NotAction exempts MFA device setup.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyWithoutMFA",
      "Effect": "Deny",
      "NotAction": [
        "iam:CreateVirtualMFADevice",
        "iam:EnableMFADevice",
        "iam:GetUser",
        "sts:GetSessionToken"
      ],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}`,
            },
        ],
    },

    {
        id: 2,
        icon: "🖥️",
        color: ACCENT.teal,
        tag: "SCENARIO 2",
        title: "EC2 Instance Profile",
        subtitle: "AMI PVT LTD API server calling AWS services",
        useCase: {
            title: "AMI PVT LTD Marketplace — Spring Boot API on EC2 reading products & processing orders",
            story: "The AMI PVT LTD Marketplace core API is a Spring Boot (Java) application deployed on EC2. It serves product listing pages (reads the DynamoDB 'Products' table), handles new order creation (writes to the 'Orders' table), manages product image uploads (reads/writes to S3 'marketplace-products-bucket'), and enqueues order events to SQS 'order-events-queue' for async processing. Instead of hardcoding AWS credentials in application.properties — a critical security risk — the EC2 instance is assigned an IAM Instance Profile. The Spring Boot AWS SDK automatically fetches rotating temporary credentials from the Instance Metadata Service (IMDS) at runtime.",
            diagram: [
                { actor: "Spring Boot API (EC2)", icon: "🖥️" },
                { arrow: "fetches creds from IMDS (169.254.169.254)" },
                { actor: "IAM Instance Profile", icon: "🎭" },
                { arrow: "STS issues temp credentials" },
                { actor: "DynamoDB + S3 + SQS", icon: "☁️" },
            ],
        },
        buildSystem: [
            "Create IAM Role: 'Marketplace-API-EC2-Role'",
            "Trust policy: Allow ec2.amazonaws.com to assume the role",
            "Attach permission policy: DynamoDB read/write on 'Products' and 'Orders' tables",
            "Attach permission policy: S3 read/write on 'marketplace-products-bucket'",
            "Attach permission policy: SQS SendMessage on 'order-events-queue'",
            "Launch EC2 → assign 'Marketplace-API-EC2-Role' as the Instance Profile on the instance",
            "Spring Boot app: AWS SDK DefaultCredentialsProvider automatically discovers instance profile — no hardcoding",
            "NEVER set AWS_ACCESS_KEY_ID in environment variables, application.properties, or bake credentials into AMI",
        ],
        flow: ["EC2 (Spring Boot)", "Instance Profile", "IAM Role", "STS Temp Creds", "DynamoDB / S3 / SQS"],
        examTips: [
            "Only 1 IAM role can be attached per EC2 instance — can be changed without stopping the instance",
            "IMDS endpoint 169.254.169.254 — Spring Boot AWS SDK fetches and auto-refreshes credentials",
            "NEVER hardcode access keys in code, config files, or AMI snapshots",
            "Spring Boot uses DefaultAWSCredentialsProviderChain: env → system props → instance profile (in order)",
        ],
        roleJson: [
            {
                label: "Trust Policy — allows EC2 service to assume this role",
                note: "Goes in the role's Trust Relationships tab in IAM. The EC2 service assumes the role on behalf of the instance — not a human user.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EC2TrustPolicy",
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}`,
            },
            {
                label: "Permission Policy — what the Marketplace API is allowed to do",
                note: "Scoped to specific table and bucket ARNs — principle of least privilege. The Spring Boot app gets exactly the permissions the business logic requires.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Products",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Orders"
      ]
    },
    {
      "Sid": "S3ProductAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::marketplace-products-bucket",
        "arn:aws:s3:::marketplace-products-bucket/*"
      ]
    },
    {
      "Sid": "SQSOrderQueue",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:ap-southeast-1:123456789012:order-events-queue"
    }
  ]
}`,
            },
        ],
    },

    {
        id: 3,
        icon: "⚡",
        color: ACCENT.amber,
        tag: "SCENARIO 3",
        title: "Lambda Execution Role",
        subtitle: "AMI PVT LTD serverless order processing pipeline",
        useCase: {
            title: "AMI PVT LTD Marketplace — Node.js Lambda handling tool purchase orders end-to-end",
            story: "When a customer buys a tool (e.g., 'Spin the Wheel') from the AMI PVT LTD Marketplace, a purchase event is placed on the SQS 'order-events-queue'. A Node.js Lambda function is triggered, processes the order: validates the purchase record in DynamoDB 'Orders' table, copies the tool's deployment artifact from the S3 artifacts bucket to a customer staging bucket, updates the order status to PROCESSING, and publishes an SNS notification to the 'marketplace-notifications' topic so the buyer receives a confirmation email. The Lambda has a tightly-scoped Execution Role — nothing more than what the function needs to operate.",
            diagram: [
                { actor: "SQS Order Event", icon: "📨" },
                { arrow: "triggers" },
                { actor: "Node.js Lambda", icon: "⚡" },
                { arrow: "assumes execution role" },
                { actor: "Lambda Execution Role", icon: "🎭" },
                { arrow: "grants access to" },
                { actor: "DynamoDB + S3 + SNS + Logs", icon: "☁️" },
            ],
        },
        buildSystem: [
            "Create IAM Role: 'Marketplace-OrderProcessor-Lambda-Role'",
            "Trust policy: Allow lambda.amazonaws.com to assume the role",
            "Attach AWS managed policy: AWSLambdaBasicExecutionRole (CloudWatch Logs access)",
            "Add SQS permissions: ReceiveMessage, DeleteMessage, GetQueueAttributes on 'order-events-queue'",
            "Add DynamoDB permissions: GetItem, UpdateItem, PutItem on 'Orders' table only",
            "Add S3 permissions: GetObject on 'marketplace-tool-artifacts/*', PutObject on 'marketplace-staging-bucket/*'",
            "Add SNS permission: Publish on 'marketplace-notifications' topic ARN",
            "Set 'Marketplace-OrderProcessor-Lambda-Role' as the Lambda function's execution role in Configuration",
        ],
        flow: ["SQS Trigger", "Node.js Lambda", "Execution Role", "DynamoDB + S3 + SNS"],
        examTips: [
            "Execution role is set on the function definition — not at invocation time",
            "AWSLambdaBasicExecutionRole must always be included — CloudWatch Logs permissions",
            "SQS-triggered Lambda also needs SQS receive/delete permissions in the execution role",
            "ECS task role (not task execution role) is the equivalent pattern for containerized workloads",
        ],
        roleJson: [
            {
                label: "Trust Policy — allows Lambda service to assume this role",
                note: "For ECS tasks, replace 'lambda.amazonaws.com' with 'ecs-tasks.amazonaws.com'. The pattern is identical.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LambdaTrustPolicy",
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}`,
            },
            {
                label: "Permission Policy — Order Processor Lambda allowed actions",
                note: "Scoped to specific queue, table, and bucket prefix ARNs. AWSLambdaBasicExecutionRole (a managed policy) is attached separately and covers the CloudWatch logs permissions.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SQSTriggerAccess",
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:ap-southeast-1:123456789012:order-events-queue"
    },
    {
      "Sid": "DynamoDBOrdersAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Orders"
    },
    {
      "Sid": "S3ArtifactsRead",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::marketplace-tool-artifacts/*"
    },
    {
      "Sid": "S3StagingWrite",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::marketplace-staging-bucket/*"
    },
    {
      "Sid": "SNSNotification",
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:ap-southeast-1:123456789012:marketplace-notifications"
    }
  ]
}`,
            },
        ],
    },

    {
        id: 4,
        icon: "🏢",
        color: ACCENT.orange,
        tag: "SCENARIO 4",
        title: "SAML / OIDC Federation",
        subtitle: "Enterprise customer SSO for AMI PVT LTD dashboard",
        useCase: {
            title: "AMI PVT LTD Marketplace — Enterprise subscriber accessing their tools dashboard via Azure AD",
            story: "FinServ Corp, an enterprise AMI PVT LTD Marketplace subscriber, has 300 employees already managed in Azure Active Directory. Creating 300 individual IAM users would be an operational nightmare and a compliance risk. Instead, AMI PVT LTD configures SAML 2.0 federation — FinServ Corp's Azure AD is registered as a SAML Identity Provider in the AMI PVT LTD AWS account. Employees log in with their existing corporate Azure AD credentials, get mapped to IAM roles based on their AD group ('marketplace-viewer' or 'marketplace-admin'), and access their purchased tools dashboard. Zero IAM users are created for FinServ Corp employees.",
            diagram: [
                { actor: "FinServ Employee", icon: "🧑‍💼" },
                { arrow: "authenticates with" },
                { actor: "Azure AD (SAML IdP)", icon: "🏢" },
                { arrow: "returns SAML assertion" },
                { actor: "AWS STS", icon: "🔐" },
                { arrow: "AssumeRoleWithSAML → temp creds" },
                { actor: "Marketplace Dashboard", icon: "🛒" },
            ],
        },
        buildSystem: [
            "In Azure AD: Register AWS as Service Provider — download AWS federation metadata XML",
            "In IAM: Create SAML Identity Provider using Azure AD federation metadata XML",
            "Create IAM Roles: 'Enterprise-Viewer-Role' (read-only dashboard), 'Enterprise-Admin-Role' (manage subscriptions)",
            "Both role trust policies: Principal = SAML IdP ARN, Action = sts:AssumeRoleWithSAML",
            "Configure Azure AD claim rules: map AD groups → IAM role ARNs in the SAML assertion attributes",
            "For modern deployments: use AWS IAM Identity Center (SSO) — preferred over direct SAML federation setup",
            "For mobile/web end-user apps: use Cognito User Pools + OIDC (Google, Apple login) — not direct IAM federation",
        ],
        flow: ["Azure AD Login", "SAML Assertion", "STS AssumeRoleWithSAML", "Temp Creds", "Marketplace Dashboard"],
        examTips: [
            "No IAM user is created for federated users — identity stays in the corporate IdP",
            "AWS IAM Identity Center is the modern recommended approach (replaces complex SAML federation)",
            "Mobile/web app users: Cognito + OIDC — never direct IAM federation for end users",
            "SAML session max duration: min 15 min, max 12 hours — configurable in trust policy",
        ],
        roleJson: [
            {
                label: "Trust Policy — SAML federated role for Azure AD",
                note: "Replace the Federated ARN with your actual SAML IdP ARN from IAM. The StringEquals condition pins the audience to the AWS SAML sign-in endpoint.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SAMLFederation",
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:saml-provider/AzureAD-FinServCorp"
      },
      "Action": "sts:AssumeRoleWithSAML",
      "Condition": {
        "StringEquals": {
          "SAML:aud": "https://signin.aws.amazon.com/saml"
        }
      }
    }
  ]
}`,
            },
            {
                label: "Enterprise-Viewer-Role Permission Policy",
                note: "Read-only access to the marketplace dashboard DynamoDB tables and product assets. Mapped from Azure AD group 'marketplace-viewer' via SAML claim rules.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DashboardReadOnly",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Products",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Subscriptions"
      ]
    },
    {
      "Sid": "S3DashboardAssets",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::marketplace-products-bucket",
        "arn:aws:s3:::marketplace-products-bucket/*"
      ]
    }
  ]
}`,
            },
        ],
    },

    {
        id: 5,
        icon: "🔑",
        color: ACCENT.purple,
        tag: "SCENARIO 5",
        title: "Cross-Account Role",
        subtitle: "AMI PVT LTD deploys tools into customer AWS accounts",
        useCase: {
            title: "AMI PVT LTD Marketplace — Deployment Agent provisioning the Leaderboard Tool in a customer account",
            story: "When a customer purchases the 'Leaderboard Tool' from the AMI PVT LTD Marketplace, the platform's Deployment Agent (running in the AMI PVT LTD AWS account — Account A: marketplace-prod) must provision resources in the customer's AWS account (Account B: customer-account): deploy a CloudFormation stack, create a Lambda function, and set up a DynamoDB table. The customer creates a 'Marketplace-Deploy-Role' in their account and grants the AMI PVT LTD account permission to assume it. The Deployment Agent calls STS AssumeRole, receives temporary credentials for Account B, and runs the CloudFormation deployment. All actions appear in the customer's CloudTrail under the AMI PVT LTD account identity — full audit trail with zero shared credentials.",
            diagram: [
                { actor: "Marketplace Deploy Agent (Account A)", icon: "🤖" },
                { arrow: "calls STS AssumeRole (needs caller permission in Account A)" },
                { actor: "AWS STS Service", icon: "🔐" },
                { arrow: "issues temp creds for" },
                { actor: "Marketplace-Deploy-Role (Account B)", icon: "🎭" },
                { arrow: "deploys to" },
                { actor: "CloudFormation / Lambda / DynamoDB (Account B)", icon: "☁️" },
            ],
        },
        buildSystem: [
            "In Customer Account-B: Create IAM Role 'Marketplace-Deploy-Role'",
            "Trust policy in Account-B: Allow Marketplace Account-A Deploy Agent role ARN to assume — add ExternalId condition",
            "Permission policy in Account-B: CloudFormation, Lambda, DynamoDB scoped to 'marketplace-*' resource prefix",
            "In Marketplace Account-A: Give Deployment Agent role an inline policy allowing sts:AssumeRole on the customer's role ARN",
            "Deployment Agent calls: aws sts assume-role --role-arn arn:aws:iam::CUST-ACCT:role/Marketplace-Deploy-Role --external-id marketplace-token-xyz",
            "Use returned temp credentials (AccessKeyId, SecretAccessKey, SessionToken) to run CloudFormation in Account-B",
            "All Account-B actions are logged in Account-B's CloudTrail under the Marketplace account identity",
        ],
        flow: ["Account-A Agent", "sts:AssumeRole", "STS Issues Creds", "Account-B Deploy Role", "Customer Resources"],
        examTips: [
            "Both sides required: trust policy in Account-B (who can assume) + sts:AssumeRole permission in Account-A",
            "ExternalId condition in trust policy prevents confused-deputy attacks from other third parties",
            "Wildcard (*) NOT allowed as Principal in cross-account trust policies",
            "CloudTrail in Account-B shows 'marketplace-prod assumed role' — full audit without shared secrets",
        ],
        roleJson: [
            {
                label: "Trust Policy in Customer Account-B — who can assume this role",
                note: "ExternalId prevents confused-deputy attacks. The Marketplace provides this secret token when the customer sets up the integration. Never omit ExternalId for third-party cross-account roles.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowMarketplaceDeployment",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::MARKETPLACE-ACCT-ID:role/Marketplace-DeploymentAgent-Role"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "marketplace-deploy-secret-token-xyz"
        }
      }
    }
  ]
}`,
            },
            {
                label: "Permission Policy in Account-B — minimal deployment permissions",
                note: "Scoped to 'marketplace-*' resource names. Never grant AdministratorAccess to cross-account roles — least privilege per tool deployment needs only.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudFormationDeploy",
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents"
      ],
      "Resource": "arn:aws:cloudformation:*:*:stack/marketplace-tool-*"
    },
    {
      "Sid": "LambdaProvision",
      "Effect": "Allow",
      "Action": [
        "lambda:CreateFunction",
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction",
        "lambda:AddPermission"
      ],
      "Resource": "arn:aws:lambda:*:*:function:marketplace-*"
    },
    {
      "Sid": "DynamoDBProvision",
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/marketplace-*"
    }
  ]
}`,
            },
            {
                label: "Caller Policy in Marketplace Account-A — allows agent to assume the role",
                note: "Without this, even if Account-B's trust policy allows it, the Deployment Agent cannot call sts:AssumeRole. Both sides of the trust must be established.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAssumeCustomerDeployRole",
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::CUSTOMER-ACCT-ID:role/Marketplace-Deploy-Role"
    }
  ]
}`,
            },
        ],
    },

    {
        id: 6,
        icon: "🪣",
        color: ACCENT.green,
        tag: "SCENARIO 6",
        title: "Resource-Based Policy",
        subtitle: "AMI PVT LTD central artifact bucket shared with customers",
        useCase: {
            title: "AMI PVT LTD Marketplace — distributing tool artifacts directly to customer AWS accounts via S3 bucket policy",
            story: "AMI PVT LTD stores all tool deployment artifacts — Lambda function ZIPs, CloudFormation templates, seed data — in a central S3 bucket 'marketplace-tool-artifacts' in the AMI PVT LTD AWS account (Account A). When a customer's Provisioning Service (a role in Account B) needs to pull tool files during setup, it accesses the bucket directly. For this cross-account S3 access to work, BOTH sides must have policies allowing the action: the bucket policy in Account A grants the customer role read access, AND the identity policy on the customer's provisioning role in Account B also explicitly allows reading that bucket. Either alone is insufficient for cross-account access.",
            diagram: [
                { actor: "Provisioning Role (Account-B)", icon: "🤖" },
                { arrow: "identity policy: allow s3:GetObject on marketplace bucket" },
                { actor: "S3 Bucket (Account-A)", icon: "🪣" },
                { arrow: "bucket policy: allow Account-B provisioning role" },
                { actor: "Access GRANTED", icon: "✅" },
                { arrow: "either policy missing →" },
                { actor: "Access DENIED", icon: "❌" },
            ],
        },
        buildSystem: [
            "In Marketplace Account-A: Add S3 bucket policy to 'marketplace-tool-artifacts' bucket",
            "Bucket policy Principal: customer's 'Provisioning-Service-Role' ARN in Account-B",
            "Bucket policy Actions: s3:GetObject, s3:ListBucket — read-only, no write/delete",
            "In Customer Account-B: Attach identity policy to 'Provisioning-Service-Role' allowing GetObject on the bucket ARN",
            "BOTH policies required for cross-account access — unlike same-account (either alone is enough)",
            "If bucket uses KMS encryption: also update KMS key policy in Account-A to allow Account-B role to use the key",
            "Check S3 Block Public Access settings — these override permissive bucket policies for public access attempts",
        ],
        flow: ["Account-B Role", "Identity Policy ✓", "S3 Bucket Policy ✓", "Cross-Account Read ✓"],
        examTips: [
            "Same account: identity OR resource policy = ALLOW. Cross-account: BOTH identity AND resource policy needed",
            "S3 Block Public Access overrides permissive bucket policies — separate control plane",
            "KMS exception: key policy must always explicitly allow the principal, even within the same account",
            "Services supporting resource-based policies: S3, SQS, SNS, KMS, Lambda, API GW, ECR, Secrets Manager",
        ],
        roleJson: [
            {
                label: "S3 Bucket Policy in Marketplace Account-A (resource-based policy)",
                note: "Attached directly to the 'marketplace-tool-artifacts' bucket in the Marketplace account. Grants the customer's provisioning role read access to tool artifacts only.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCustomerProvisioning",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::CUSTOMER-ACCT-ID:role/Provisioning-Service-Role"
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::marketplace-tool-artifacts",
        "arn:aws:s3:::marketplace-tool-artifacts/*"
      ]
    }
  ]
}`,
            },
            {
                label: "Identity Policy on Provisioning-Service-Role in Customer Account-B",
                note: "This AND the bucket policy above must both exist for cross-account S3 access. Either alone results in Access Denied.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadMarketplaceArtifacts",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::marketplace-tool-artifacts",
        "arn:aws:s3:::marketplace-tool-artifacts/*"
      ]
    }
  ]
}`,
            },
        ],
    },
];

export default scenarios;
