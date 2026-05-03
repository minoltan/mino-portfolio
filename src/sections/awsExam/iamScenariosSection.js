import { useState } from "react";
import { useTheme, alpha, useMediaQuery } from "@mui/material";
import {
    Box, Typography, Stack, Chip, Card, CardContent, Divider,
    Dialog, DialogContent, IconButton
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";

const ACCENT = {
    primary: "#e76715",
    teal: "#2dd4bf",
    amber: "#fbbf24",
    orange: "#fb923c",
    purple: "#c084fc",
    green: "#4ade80",
    pink: "#f472b6",
    red: "#f87171",
    slate: "#94a3b8",
};

const scenarios = [
    {
        id: 1,
        icon: "👤",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "IAM User + MFA",
        subtitle: "Humans accessing AWS directly",
        useCase: {
            title: "A startup's DevOps engineer managing infrastructure",
            story: "Priya is a DevOps engineer at a fintech startup. She needs to log into the AWS Console to configure EC2 instances, review CloudWatch alarms, and push deployments. Her company creates an IAM User for her, assigns her to the \"DevOps\" group which has relevant policies, and enforces MFA on her account.",
            diagram: [
                { actor: "Priya (Human)", icon: "👩‍💼" },
                { arrow: "enters password + MFA code" },
                { actor: "AWS Console", icon: "🖥️" },
                { arrow: "checks identity policy" },
                { actor: "DevOps Group Policy", icon: "📋" },
                { arrow: "grants access to" },
                { actor: "EC2 / CloudWatch / S3", icon: "☁️" },
            ],
        },
        buildSystem: [
            "Create IAM Group: 'DevOps-Engineers'",
            "Attach policy: AmazonEC2FullAccess, CloudWatchFullAccess",
            "Create IAM User for each engineer → add to group",
            "Enable virtual MFA device on each user",
            "Set password policy: min 12 chars, rotate every 90 days",
            "Never give engineers root access → use admin role if needed",
        ],
        flow: ["IAM User", "Password + MFA", "Group Policy", "AWS Resources"],
        examTips: [
            "Never use root for daily tasks → lock root access keys",
            "Max 2 access keys per user → rotate regularly",
            "Access keys = CLI/SDK only, not Console login",
            "Policies attached to groups, not individual users",
        ],
        roleJson: [
            {
                label: "Group Permission Policy",
                note: "Attached to 'DevOps-Engineers' group. MFA condition ensures credentials are only valid after MFA authentication.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "cloudwatch:*",
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
                label: "Deny All Without MFA (Security Guardrail)",
                note: "Add this as a second statement to block all actions when MFA is not present — even if another policy allows them.",
                code: `{
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
        subtitle: "App on EC2 calls other AWS services",
        useCase: {
            title: "An e-commerce app on EC2 reading product images from S3",
            story: "ShopFast runs their Node.js product catalog API on EC2. The app needs to read product images from S3 and write order data to DynamoDB. Instead of hardcoding access keys (a security disaster), they attach an IAM Role to the EC2 instance. The app calls S3/DynamoDB using temp credentials fetched automatically from instance metadata.",
            diagram: [
                { actor: "EC2 (Node.js App)", icon: "🖥️" },
                { arrow: "fetches creds from metadata (169.254.169.254)" },
                { actor: "Instance Profile / IAM Role", icon: "🎭" },
                { arrow: "STS issues temp credentials" },
                { actor: "S3 Bucket", icon: "🪣" },
                { arrow: "also writes to" },
                { actor: "DynamoDB Orders Table", icon: "🗄️" },
            ],
        },
        buildSystem: [
            "Create IAM Role: 'EC2-ShopFast-AppRole'",
            "Trust policy: Allow EC2 service (ec2.amazonaws.com) to assume role",
            "Attach policy: S3 read on product-images bucket, DynamoDB write on orders table",
            "Launch EC2 → attach role via Instance Profile",
            "App uses AWS SDK → SDK auto-fetches creds from metadata service",
            "NEVER put access keys in code, env vars, or AMI",
        ],
        flow: ["EC2 Instance", "Instance Profile", "IAM Role", "STS Temp Creds", "S3 / DynamoDB"],
        examTips: [
            "Only 1 role per EC2 instance → can swap at any time",
            "Creds from 169.254.169.254 (instance metadata)",
            "NEVER embed access keys in application code",
            "SDK automatically handles credential refresh",
        ],
        roleJson: [
            {
                label: "Trust Policy — allows EC2 to assume this role",
                note: "The 'Principal: Service' tells AWS that the EC2 service can assume this role on behalf of the instance.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
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
                label: "Permission Policy — what the EC2 app is allowed to do",
                note: "Scoped to specific bucket and table ARNs — never use '*' for resources in production.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::product-images-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/Orders"
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
        title: "Lambda / ECS Execution Role",
        subtitle: "Serverless & containers accessing AWS services",
        useCase: {
            title: "A Lambda function processing S3 uploads and sending SNS alerts",
            story: "ImagePro builds a photo processing pipeline. When a user uploads an image to S3, it triggers a Lambda function that: resizes the image, writes metadata to DynamoDB, and sends an SNS notification to the user. The Lambda has an Execution Role granting it exactly these three permissions — nothing more.",
            diagram: [
                { actor: "User uploads image", icon: "📸" },
                { arrow: "triggers" },
                { actor: "Lambda Function", icon: "⚡" },
                { arrow: "assumes execution role" },
                { actor: "IAM Execution Role", icon: "🎭" },
                { arrow: "grants access to S3 + DynamoDB + SNS" },
                { actor: "S3 → DynamoDB → SNS", icon: "☁️" },
            ],
        },
        buildSystem: [
            "Create IAM Role: 'Lambda-ImageProcessor-Role'",
            "Trust policy: Allow lambda.amazonaws.com to assume role",
            "Attach policies: S3 read/write (specific bucket), DynamoDB write, SNS publish",
            "Also attach: AWSLambdaBasicExecutionRole (for CloudWatch logs)",
            "Set this role as the Lambda function's execution role",
            "ECS equivalent: use 'task role' (not task execution role which is for pulling images)",
        ],
        flow: ["S3 Event Trigger", "Lambda", "Execution Role", "S3 + DynamoDB + SNS"],
        examTips: [
            "Lambda role set on function, not invocation",
            "ECS task role ≠ task execution role (execution = pull image + logs)",
            "Lambda needs resource-based policy for cross-account invocation",
            "Principle of least privilege → only grant what the function needs",
        ],
        roleJson: [
            {
                label: "Trust Policy — allows Lambda to assume this role",
                note: "Change 'lambda.amazonaws.com' to 'ecs-tasks.amazonaws.com' for ECS task roles.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
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
                label: "Permission Policy — Lambda's allowed actions",
                note: "AWSLambdaBasicExecutionRole covers the logs permissions. The rest are custom least-privilege grants.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::uploads-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": "dynamodb:PutItem",
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/ImageMetadata"
    },
    {
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:us-east-1:123456789012:UserNotifications"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
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
        subtitle: "Corporate users access AWS without IAM accounts",
        useCase: {
            title: "A 500-person company using Microsoft AD to access AWS",
            story: "MegaCorp has 500 developers already managed in Microsoft Active Directory (AD). Creating 500 IAM users would be a management nightmare. Instead, they configure SAML 2.0 federation between their AD (via ADFS) and AWS. Developers log in with their existing AD credentials, get mapped to IAM roles based on their AD groups, and access AWS — no IAM users created at all.",
            diagram: [
                { actor: "Developer (AD user)", icon: "🧑‍💼" },
                { arrow: "authenticates with" },
                { actor: "Microsoft AD / ADFS", icon: "🏢" },
                { arrow: "returns SAML assertion" },
                { actor: "AWS STS", icon: "🔐" },
                { arrow: "AssumeRoleWithSAML → temp creds" },
                { actor: "AWS Console / CLI", icon: "☁️" },
            ],
        },
        buildSystem: [
            "Set up AWS as Service Provider in ADFS (download metadata XML)",
            "Configure ADFS as IdP in AWS IAM (upload ADFS metadata)",
            "Create IAM Roles: 'Dev-Role', 'Admin-Role', 'ReadOnly-Role'",
            "Trust policy: Allow SAML federation principal (ADFS ARN)",
            "Map AD groups → IAM roles in ADFS claim rules",
            "For modern approach: use AWS IAM Identity Center (SSO) instead",
        ],
        flow: ["Corp AD Login", "SAML Assertion", "STS AssumeRoleWithSAML", "Temp Creds", "AWS Access"],
        examTips: [
            "No IAM user is created → users auth via corporate IdP",
            "AWS IAM Identity Center = modern recommended approach for SSO",
            "Mobile apps → Cognito + OIDC (Google, Facebook login)",
            "STS API: AssumeRoleWithSAML or AssumeRoleWithWebIdentity",
        ],
        roleJson: [
            {
                label: "Trust Policy — SAML federated role (ADFS)",
                note: "The 'Federated' principal references your SAML IdP ARN registered in IAM. The condition locks it to the AWS sign-in endpoint.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:saml-provider/ADFS"
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
                label: "Dev-Role Permission Policy",
                note: "Grants read-only EC2 and S3 access to developers who federate in via AD. Extend per AD group.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "s3:GetObject",
        "s3:ListBucket",
        "cloudwatch:GetMetricData",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
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
        subtitle: "Dev account accesses Prod resources safely",
        useCase: {
            title: "A DevOps team in Account-A deploying to Production in Account-B",
            story: "TechCorp has two AWS accounts: Account-A (Dev/Staging) and Account-B (Production). A DevOps engineer needs to deploy code to production, but they live in Account-A. Instead of giving them credentials to Account-B, they assume a 'DeployRole' in Account-B. The role grants only deployment permissions, and all actions are logged in CloudTrail under their original identity.",
            diagram: [
                { actor: "DevOps in Account-A", icon: "🧑‍💼" },
                { arrow: "calls STS AssumeRole (needs sts:AssumeRole permission)" },
                { actor: "STS Service", icon: "🔐" },
                { arrow: "issues temp creds for" },
                { actor: "DeployRole in Account-B", icon: "🎭" },
                { arrow: "grants access to" },
                { actor: "Account-B ECS / CodeDeploy", icon: "☁️" },
            ],
        },
        buildSystem: [
            "In Account-B: Create IAM Role 'CrossAccount-DeployRole'",
            "Role trust policy: allow Account-A root (arn:aws:iam::ACCT-A:root) to assume",
            "Role permission policy: ECS deploy, CodeDeploy actions only",
            "In Account-A: Give DevOps user permission to sts:AssumeRole on the Account-B role ARN",
            "DevOps assumes role: aws sts assume-role --role-arn arn:aws:iam::ACCT-B:role/DeployRole",
            "Use temporary credentials returned by STS to operate in Account-B",
        ],
        flow: ["Account-A User", "sts:AssumeRole", "STS Issues Creds", "Account-B Role", "Prod Resources"],
        examTips: [
            "Role needs: Trust policy (who) + Permissions policy (what)",
            "Caller also needs sts:AssumeRole in their own identity policy",
            "Wildcard (*) NOT allowed in trust policy Principal for cross-account",
            "Actions logged in CloudTrail under original identity → full audit trail",
        ],
        roleJson: [
            {
                label: "Trust Policy in Account-B — who can assume this role",
                note: "Using ':root' allows any identity in Account-A to assume the role, controlled by the caller's own identity policy. Replace with a specific role ARN for tighter control.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT-A-ID:root"
      },
      "Action": "sts:AssumeRole",
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
                label: "Permission Policy in Account-B — what the role can do",
                note: "Minimal deployment permissions. Never grant AdministratorAccess in cross-account roles.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "codedeploy:CreateDeployment",
        "codedeploy:GetDeployment",
        "codedeploy:GetDeploymentConfig"
      ],
      "Resource": "*"
    }
  ]
}`,
            },
            {
                label: "Caller Policy in Account-A — allows the DevOps user to assume the role",
                note: "Without this, even if Account-B trusts Account-A, the individual user cannot call sts:AssumeRole.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::ACCOUNT-B-ID:role/CrossAccount-DeployRole"
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
        subtitle: "S3 / SQS shared across accounts or made public",
        useCase: {
            title: "Company A's analytics pipeline reads from Company B's S3 data lake",
            story: "DataCo (Account-B) maintains a raw data lake in S3. AnalyticsCo (Account-A) needs to read this data for their ML pipeline. DataCo adds a bucket policy granting Account-A's ETL role read access. AnalyticsCo's ETL role also has an identity policy allowing s3:GetObject. Both policies together allow the cross-account access — neither alone is sufficient.",
            diagram: [
                { actor: "ETL Role in Account-A", icon: "☁️" },
                { arrow: "identity policy: allow s3:GetObject" },
                { actor: "S3 Bucket in Account-B", icon: "🪣" },
                { arrow: "bucket policy: allow Account-A ETL role" },
                { actor: "Access GRANTED", icon: "✅" },
                { arrow: "BUT if only 1 side has policy →" },
                { actor: "Access DENIED", icon: "❌" },
            ],
        },
        buildSystem: [
            "In Account-B: Add S3 bucket policy allowing Account-A role ARN to s3:GetObject",
            "In Account-A: Give ETL role an identity policy allowing s3:GetObject on Account-B bucket ARN",
            "BOTH policies needed for cross-account → unlike same-account (only one needed)",
            "Check S3 Block Public Access settings → these override even permissive policies",
            "KMS encrypted bucket: also need KMS key policy allowing Account-A to use the key",
            "Services that support resource policies: S3, SQS, SNS, KMS, Lambda, API GW, ECR",
        ],
        flow: ["Account-A Role", "Identity Policy ✓", "S3 Bucket Policy ✓", "Cross-Account Access ✓"],
        examTips: [
            "Same account: identity OR resource policy → ALLOW",
            "Cross-account: BOTH identity AND resource policy needed",
            "S3 Block Public Access overrides all permissive policies",
            "KMS: key policy MUST allow → IAM policy alone is insufficient",
        ],
        roleJson: [
            {
                label: "S3 Bucket Policy in Account-B (resource-based policy)",
                note: "Attached directly to the S3 bucket. Grants Account-A's ETL role read access to this bucket.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT-A-ID:role/ETL-Role"
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::data-lake-bucket",
        "arn:aws:s3:::data-lake-bucket/*"
      ]
    }
  ]
}`,
            },
            {
                label: "Identity Policy on ETL-Role in Account-A",
                note: "Both this AND the bucket policy must exist for cross-account access. Either alone is insufficient.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::data-lake-bucket",
        "arn:aws:s3:::data-lake-bucket/*"
      ]
    }
  ]
}`,
            },
        ],
    },
];

const evalSteps = [
    {
        step: "1", label: "Explicit DENY anywhere?",
        yes: "DENIED → always wins, no exceptions", no: "Continue →", type: "deny",
        details: {
            what: "An explicit Deny is a policy statement with \"Effect\": \"Deny\". AWS evaluates every attached policy, and if any one of them contains an explicit Deny for the action, access is blocked immediately — no other policy can override it.",
            where: "Any policy type can carry an explicit Deny: identity policies (users, groups, roles), resource-based policies (S3, SQS), SCPs (AWS Organizations), and Permission Boundaries.",
            tip: "Use explicit Denies to enforce non-negotiable guardrails — e.g. block access outside approved regions, prevent deletion of production resources, or lock down root account actions.",
            sample: `{
  "Effect": "Deny",
  "Action": "s3:DeleteBucket",
  "Resource": "*",
  "Condition": {
    "StringNotEquals": {
      "aws:RequestedRegion": "us-east-1"
    }
  }
}`,
            sampleNote: "Denies S3 bucket deletion in every region except us-east-1 — overrides any Allow policies that exist."
        }
    },
    {
        step: "2", label: "SCP (Org) blocks action?",
        yes: "DENIED → SCP caps max permissions", no: "Continue →", type: "check",
        details: {
            what: "Service Control Policies (SCPs) are organization-level guardrails attached via AWS Organizations. They define the ceiling of permissions any identity in an account can ever have. SCPs do NOT grant permissions — they only restrict what can be granted.",
            where: "AWS Organizations console → Policies → Service Control Policies. Attach to the Organization Root, an OU (Organizational Unit), or a specific member account.",
            tip: "An SCP of Allow * plus an identity policy of Allow S3 = S3 access allowed. But an SCP that Denies EC2 means no one in that account can use EC2, even if identity policies grant it.",
            sample: `{
  "Effect": "Deny",
  "Action": "*",
  "Resource": "*",
  "Condition": {
    "StringNotEquals": {
      "aws:RequestedRegion": [
        "us-east-1",
        "eu-west-1"
      ]
    }
  }
}`,
            sampleNote: "Blocks all API calls made outside us-east-1 and eu-west-1 for every identity in the account."
        }
    },
    {
        step: "3", label: "Permission Boundary set & blocks?",
        yes: "DENIED → boundary limits scope", no: "Continue →", type: "check",
        details: {
            what: "A Permission Boundary is an IAM managed policy attached to a user or role as their 'maximum allowed permissions'. The effective permissions are the intersection of what the identity policy allows AND what the boundary allows. If the boundary doesn't include an action, that action is denied — even if the identity policy grants it.",
            where: "IAM console → Users or Roles → 'Permissions boundary' tab → Set boundary. Commonly used to delegate safe IAM user/role creation to developers without letting them escalate their own privileges.",
            tip: "If a developer's identity policy allows iam:CreateRole but the boundary doesn't include IAM permissions, they cannot create roles. Boundaries are invisible guardrails — users don't see them but they feel the effect.",
            sample: `// Boundary policy (limits the role to S3 + EC2 only)
{
  "Effect": "Allow",
  "Action": ["s3:*", "ec2:*"],
  "Resource": "*"
}

// Identity policy (grants S3 + DynamoDB)
{
  "Effect": "Allow",
  "Action": ["s3:*", "dynamodb:*"],
  "Resource": "*"
}

// Effective permissions = intersection = S3 only
// DynamoDB is blocked by boundary
// EC2 is blocked by identity policy`,
            sampleNote: "Effective permissions = identity policy ∩ boundary. DynamoDB and EC2 cancel out."
        }
    },
    {
        step: "4", label: "Resource-based policy allows?",
        yes: "ALLOWED ✓", no: "Continue →", type: "allow",
        details: {
            what: "Resource-based policies are attached directly to AWS resources (S3 buckets, SQS queues, KMS keys, Lambda functions, etc.). They specify which principals can access that resource and what actions they can perform. For same-account access, a resource policy alone is enough to grant access.",
            where: "Configured per-resource: S3 → Bucket Policy tab, SQS → Access Policy, KMS → Key Policy, Lambda → Configuration → Permissions → Resource-based policy, SNS → Access Policy, API Gateway → Resource Policy.",
            tip: "Cross-account: BOTH the resource policy AND the caller's identity policy must allow the action. Same-account: either one is sufficient. KMS is the exception — key policy must always explicitly allow, even same-account.",
            sample: `// S3 Bucket Policy (attached to the bucket)
{
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::111122223333:role/ETL-Role"
  },
  "Action": ["s3:GetObject", "s3:ListBucket"],
  "Resource": [
    "arn:aws:s3:::data-lake-bucket",
    "arn:aws:s3:::data-lake-bucket/*"
  ]
}`,
            sampleNote: "Grants the ETL-Role in account 111122223333 read access to this bucket."
        }
    },
    {
        step: "5", label: "Identity policy allows?",
        yes: "ALLOWED ✓", no: "Continue →", type: "allow",
        details: {
            what: "Identity-based policies are attached to IAM identities — users, groups, or roles. They define what actions that identity is permitted to perform and on which resources. These are the most common policy type you'll work with.",
            where: "IAM console → Users / Groups / Roles → Permissions tab → Add permissions → Attach managed policy or create inline policy. Can also be applied via IaC (CDK, CloudFormation, Terraform).",
            tip: "Managed policies (AWS or customer) can be reused across multiple identities. Inline policies are embedded in a single identity and deleted with it. Prefer managed policies for consistency and auditability.",
            sample: `// Inline policy on an IAM Role
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject",
    "s3:PutObject"
  ],
  "Resource": "arn:aws:s3:::my-app-bucket/*"
}

// Another statement in the same policy
{
  "Effect": "Allow",
  "Action": "dynamodb:PutItem",
  "Resource": "arn:aws:dynamodb:us-east-1:*:table/Orders"
}`,
            sampleNote: "Role can read/write a specific S3 bucket and write to a specific DynamoDB table — nothing else."
        }
    },
    {
        step: "6", label: "No explicit allow found",
        yes: "IMPLICIT DENY → default fallback", no: "", type: "deny",
        details: {
            what: "AWS uses a default-deny model. If no policy explicitly grants an Allow for the requested action, the request is implicitly denied. You never need to write a Deny statement to block everything — silence means no access.",
            where: "This is not configured anywhere — it is AWS's built-in default behavior. It is the reason the principle of least privilege works: start with zero permissions and grant only what is explicitly needed.",
            tip: "Implicit Deny vs Explicit Deny: both result in 'Access Denied' to the caller, but internally they're different. An explicit Deny cannot be overridden by any Allow. An implicit Deny can be overridden simply by adding an Allow. Always prefer explicit Denies for security-critical restrictions.",
            sample: `// No policy attached to a new IAM user
// → ALL actions are implicitly denied by default

// Once you attach this policy:
{
  "Effect": "Allow",
  "Action": "s3:ListAllMyBuckets",
  "Resource": "*"
}
// → ONLY s3:ListAllMyBuckets is allowed
// → Everything else remains implicitly denied`,
            sampleNote: "New IAM identities have zero permissions. Every Allow you add carves out an explicit exception from the implicit deny baseline."
        }
    },
];

const stsApis = [
    { name: "AssumeRole", color: ACCENT.primary, who: "IAM users / roles", useCase: "Dev assumes prod role. MFA-enforced access. Cross-account deployments." },
    { name: "AssumeRoleWithSAML", color: ACCENT.orange, who: "SAML federated users", useCase: "Corp AD users (via ADFS) logging into AWS Console or CLI." },
    { name: "AssumeRoleWithWebIdentity", color: ACCENT.green, who: "OIDC / web identity users", useCase: "Mobile app users (Google/Facebook login) → use Cognito instead directly." },
    { name: "GetSessionToken", color: ACCENT.purple, who: "IAM or root user", useCase: "Enforce MFA for CLI access. Root user creating temp creds." },
];

const keyNumbers = [
    { num: "5,000", label: "IAM users / account", color: ACCENT.primary, note: "Use federation for large orgs" },
    { num: "2", label: "Access keys / user", color: ACCENT.teal, note: "Rotate: deactivate old, create new, delete old" },
    { num: "1", label: "Role / EC2 instance", color: ACCENT.amber, note: "Can change role without stopping instance" },
    { num: "10", label: "Managed policies / entity", color: ACCENT.orange, note: "Hard limit → plan your policy structure" },
    { num: "1 hr", label: "Default STS duration", color: ACCENT.purple, note: "Min 15min, max 12hr for roles" },
    { num: "36 hr", label: "Root user STS max", color: ACCENT.pink, note: "GetSessionToken for root" },
    { num: "Global", label: "IAM service scope", color: ACCENT.green, note: "Not replicated per region" },
    { num: "Free", label: "IAM cost", color: ACCENT.slate, note: "No charge for IAM itself" },
];

/* ── Compact scenario card — click opens modal ── */
function ScenarioCard({ s, onOpen }) {
    const theme = useTheme();
    return (
        <Card
            onClick={() => onOpen(s)}
            sx={{
                borderRadius: 3,
                cursor: 'pointer',
                borderLeft: `4px solid ${s.color}`,
                border: `1px solid ${alpha(s.color, 0.25)}`,
                borderLeftWidth: 4,
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 32px ${alpha(s.color, 0.22)}`,
                    borderColor: s.color,
                },
            }}
        >
            <CardContent sx={{ pb: '14px !important' }}>
                <Stack direction="row" alignItems="flex-start" spacing={1.5} mb={1.25}>
                    <Typography fontSize={26} lineHeight={1.1}>{s.icon}</Typography>
                    <Box flex={1} minWidth={0}>
                        <Typography variant="caption" fontWeight={700}
                            sx={{ color: s.color, letterSpacing: '0.08em', display: 'block', mb: 0.25 }}>
                            {s.tag}
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                            {s.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{s.subtitle}</Typography>
                    </Box>
                </Stack>

                <Stack direction="row" flexWrap="wrap" gap={0.5} mb={1.5}>
                    {s.flow.map((step, i) => (
                        <Stack key={i} direction="row" alignItems="center" gap={0.4}>
                            <Chip label={step} size="small" sx={{
                                fontSize: 9, fontWeight: 600, height: 20,
                                backgroundColor: alpha(s.color, 0.12),
                                color: s.color,
                                border: `1px solid ${alpha(s.color, 0.3)}`,
                            }} />
                            {i < s.flow.length - 1 && (
                                <Typography sx={{ color: alpha(s.color, 0.5), fontSize: 10, lineHeight: 1 }}>→</Typography>
                            )}
                        </Stack>
                    ))}
                </Stack>

                <Typography variant="caption" sx={{ color: s.color, fontWeight: 600 }}>
                    View details →
                </Typography>
            </CardContent>
        </Card>
    );
}

/* ── Modal popup with full scenario details ── */
function ScenarioModal({ scenario: s, onClose }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [expanded, setExpanded] = useState(false);
    const isFullScreen = isMobile || expanded;
    const subBg = isDark ? alpha('#000', 0.35) : theme.palette.grey[50];
    const codeBg = isDark ? '#0d1117' : '#1a1f2e';

    return (
        <Dialog
            open
            onClose={onClose}
            maxWidth="md"
            fullWidth
            fullScreen={isFullScreen}
            PaperProps={{
                sx: {
                    borderRadius: isFullScreen ? 0 : 3,
                    border: isFullScreen ? 'none' : `1px solid ${alpha(s.color, 0.3)}`,
                    overflow: 'hidden',
                    maxHeight: isFullScreen ? '100vh' : '92vh',
                    transition: 'all 0.25s ease',
                },
            }}
        >
            {/* Coloured header */}
            <Box sx={{
                background: `linear-gradient(135deg, ${alpha(s.color, isDark ? 0.28 : 0.13)} 0%, ${alpha(s.color, isDark ? 0.08 : 0.04)} 100%)`,
                borderBottom: `3px solid ${s.color}`,
                p: { xs: 2, md: 3 },
                position: 'relative',
            }}>
                {/* Action buttons: expand + close */}
                <Stack direction="row" spacing={0.75} sx={{ position: 'absolute', top: 10, right: 10 }}>
                    {!isMobile && (
                        <IconButton
                            onClick={() => setExpanded(prev => !prev)}
                            size="small"
                            aria-label={expanded ? "exit fullscreen" : "expand"}
                            sx={{
                                color: 'text.secondary',
                                backgroundColor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05),
                                '&:hover': { backgroundColor: isDark ? alpha('#fff', 0.12) : alpha('#000', 0.1) },
                            }}
                        >
                            {expanded
                                ? <CloseFullscreenIcon fontSize="small" />
                                : <OpenInFullIcon fontSize="small" />
                            }
                        </IconButton>
                    )}
                    <IconButton
                        onClick={onClose}
                        size="small"
                        aria-label="close"
                        sx={{
                            color: 'text.secondary',
                            backgroundColor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05),
                            '&:hover': { backgroundColor: isDark ? alpha('#fff', 0.12) : alpha('#000', 0.1) },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>

                <Stack direction="row" alignItems="flex-start" spacing={2} pr={5}>
                    <Typography fontSize={{ xs: 34, md: 42 }} lineHeight={1}>{s.icon}</Typography>
                    <Box>
                        <Typography variant="caption" fontWeight={700}
                            sx={{ color: s.color, letterSpacing: '0.1em', display: 'block', mb: 0.25 }}>
                            {s.tag}
                        </Typography>
                        <Typography variant="h5" fontWeight={700} lineHeight={1.2}>{s.title}</Typography>
                        <Typography variant="body2" color="text.secondary" mt={0.5}>{s.subtitle}</Typography>
                    </Box>
                </Stack>

                <Stack direction="row" flexWrap="wrap" gap={0.5} mt={2}>
                    {s.flow.map((step, i) => (
                        <Stack key={i} direction="row" alignItems="center" gap={0.5}>
                            <Chip label={step} size="small" sx={{
                                fontSize: 11, fontWeight: 600, height: 24,
                                backgroundColor: alpha(s.color, isDark ? 0.2 : 0.12),
                                color: s.color,
                                border: `1px solid ${alpha(s.color, 0.4)}`,
                            }} />
                            {i < s.flow.length - 1 && (
                                <Typography variant="caption" color="text.disabled" fontSize={12}>→</Typography>
                            )}
                        </Stack>
                    ))}
                </Stack>
            </Box>

            {/* Scrollable content */}
            <DialogContent sx={{ p: { xs: 2, md: 3 }, overflowY: 'auto' }}>

                {/* ── Use Case ── */}
                <Box mb={3}>
                    <Typography variant="overline" fontWeight={700}
                        sx={{ color: s.color, letterSpacing: '0.12em', display: 'block', mb: 1 }}>
                        🌍 Real-World Use Case
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={600} mb={1}>{s.useCase.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.85 }}>
                        {s.useCase.story}
                    </Typography>

                    {/* Architecture diagram */}
                    <Box sx={{
                        backgroundColor: subBg,
                        borderRadius: 2, p: { xs: 1.5, md: 2 }, mt: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        overflowX: 'auto',
                    }}>
                        <Typography variant="caption" color="text.disabled" fontWeight={700}
                            display="block" mb={1.5} sx={{ letterSpacing: '0.1em' }}>
                            ARCHITECTURE FLOW
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1.5}>
                            {s.useCase.diagram.map((node, i) => {
                                if (node.actor) return (
                                    <Stack key={i} alignItems="center" spacing={0.75} sx={{ minWidth: 72, maxWidth: 100 }}>
                                        <Box sx={{
                                            width: 50, height: 50, borderRadius: 2.5,
                                            backgroundColor: alpha(s.color, isDark ? 0.15 : 0.1),
                                            border: `1px solid ${alpha(s.color, 0.3)}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Typography fontSize={24}>{node.icon}</Typography>
                                        </Box>
                                        <Typography variant="caption" textAlign="center"
                                            sx={{ fontSize: 10, lineHeight: 1.35, color: 'text.secondary' }}>
                                            {node.actor}
                                        </Typography>
                                    </Stack>
                                );
                                if (node.arrow) return (
                                    <Stack key={i} alignItems="center" spacing={0.25} sx={{ minWidth: 48, maxWidth: 80 }}>
                                        <Typography sx={{ color: s.color, fontSize: 18, lineHeight: 1 }}>→</Typography>
                                        <Typography variant="caption" color="text.disabled" textAlign="center"
                                            sx={{ fontSize: 9, lineHeight: 1.3 }}>
                                            {node.arrow}
                                        </Typography>
                                    </Stack>
                                );
                                return null;
                            })}
                        </Stack>
                    </Box>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* ── Build Steps ── */}
                <Box mb={3}>
                    <Typography variant="overline" fontWeight={700}
                        sx={{ color: s.color, letterSpacing: '0.12em', display: 'block', mb: 2 }}>
                        🛠️ How to Build This System
                    </Typography>
                    <Stack spacing={1.25}>
                        {s.buildSystem.map((step, i) => (
                            <Stack key={i} direction="row" gap={1.5} alignItems="flex-start">
                                <Box sx={{
                                    width: 26, height: 26, borderRadius: 1.5, flexShrink: 0,
                                    backgroundColor: alpha(s.color, 0.15),
                                    border: `1px solid ${alpha(s.color, 0.4)}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: s.color }}>{i + 1}</Typography>
                                </Box>
                                <Typography variant="body2" sx={{ lineHeight: 1.75, pt: '2px' }}>{step}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* ── Exam Tips ── */}
                <Box>
                    <Typography variant="overline" fontWeight={700}
                        sx={{ color: ACCENT.amber, letterSpacing: '0.12em', display: 'block', mb: 2 }}>
                        💡 Exam Tips
                    </Typography>
                    <Stack spacing={1}>
                        {s.examTips.map((tip, i) => (
                            <Stack key={i} direction="row" gap={1.25} alignItems="flex-start" sx={{
                                backgroundColor: alpha(ACCENT.amber, isDark ? 0.08 : 0.06),
                                borderLeft: `3px solid ${ACCENT.amber}`,
                                borderRadius: '0 8px 8px 0',
                                pl: 1.5, py: 1, pr: 1.5,
                            }}>
                                <Typography sx={{ color: ACCENT.amber, fontSize: 14, flexShrink: 0, mt: '1px' }}>💡</Typography>
                                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{tip}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Box>
            </DialogContent>
        </Dialog>
    );
}

/* ── Eval step detail popup ── */
function EvalStepModal({ step: s, onClose }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const stepColor = s.type === 'allow' ? ACCENT.green : s.type === 'check' ? ACCENT.amber : ACCENT.red;
    const codeBg = isDark ? '#0d1117' : '#1a1f2e';

    return (
        <Dialog
            open
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    borderRadius: isMobile ? 0 : 3,
                    border: isMobile ? 'none' : `1px solid ${alpha(stepColor, 0.35)}`,
                    overflow: 'hidden',
                    maxHeight: isMobile ? '100vh' : '90vh',
                },
            }}
        >
            {/* Header */}
            <Box sx={{
                background: `linear-gradient(135deg, ${alpha(stepColor, isDark ? 0.28 : 0.12)} 0%, ${alpha(stepColor, isDark ? 0.06 : 0.03)} 100%)`,
                borderBottom: `3px solid ${stepColor}`,
                p: { xs: 2, md: 2.5 },
                position: 'relative',
            }}>
                <IconButton
                    onClick={onClose}
                    size="small"
                    aria-label="close"
                    sx={{
                        position: 'absolute', top: 10, right: 10,
                        color: 'text.secondary',
                        backgroundColor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05),
                        '&:hover': { backgroundColor: isDark ? alpha('#fff', 0.12) : alpha('#000', 0.1) },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>

                <Stack direction="row" alignItems="center" spacing={1.5} pr={5}>
                    <Box sx={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        backgroundColor: alpha(stepColor, 0.2),
                        border: `2px solid ${stepColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: stepColor }}>{s.step}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" fontWeight={700}
                            sx={{ color: stepColor, letterSpacing: '0.1em', display: 'block', mb: 0.25 }}>
                            DECISION STEP {s.step}
                        </Typography>
                        <Typography variant="h6" fontWeight={700} lineHeight={1.25}>{s.label}</Typography>
                    </Box>
                </Stack>

                {/* Outcome chips */}
                <Stack direction="row" spacing={1} mt={1.75} flexWrap="wrap" rowGap={0.75}>
                    <Chip label={`✓ YES → ${s.yes}`} size="small" sx={{
                        fontSize: 10, fontWeight: 600, height: 'auto',
                        backgroundColor: alpha(s.type === 'allow' ? ACCENT.green : ACCENT.red, isDark ? 0.18 : 0.1),
                        color: s.type === 'allow' ? ACCENT.green : ACCENT.red,
                        border: `1px solid ${alpha(s.type === 'allow' ? ACCENT.green : ACCENT.red, 0.4)}`,
                        '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5, lineHeight: 1.4 },
                    }} />
                    {s.no && (
                        <Chip label={`✗ NO → ${s.no}`} size="small" sx={{
                            fontSize: 10, fontWeight: 600, height: 'auto',
                            border: `1px dashed ${theme.palette.divider}`,
                            color: 'text.disabled',
                            '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
                        }} />
                    )}
                </Stack>
            </Box>

            <DialogContent sx={{ p: { xs: 2, md: 2.5 }, overflowY: 'auto' }}>

                {/* What it means */}
                <Box mb={2.5}>
                    <Typography variant="overline" fontWeight={700}
                        sx={{ color: stepColor, letterSpacing: '0.12em', display: 'block', mb: 1 }}>
                        🔍 What This Means
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.85 }}>
                        {s.details.what}
                    </Typography>
                </Box>

                <Divider sx={{ mb: 2.5 }} />

                {/* Where configured */}
                <Box mb={2.5}>
                    <Typography variant="overline" fontWeight={700}
                        sx={{ color: stepColor, letterSpacing: '0.12em', display: 'block', mb: 1 }}>
                        ⚙️ Where It's Configured
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.85 }}>
                        {s.details.where}
                    </Typography>
                </Box>

                <Divider sx={{ mb: 2.5 }} />

                {/* Sample policy */}
                <Box mb={2.5}>
                    <Typography variant="overline" fontWeight={700}
                        sx={{ color: stepColor, letterSpacing: '0.12em', display: 'block', mb: 1.25 }}>
                        📋 Sample Policy / Config
                    </Typography>
                    <Box component="pre" sx={{
                        fontSize: 11.5, color: '#86efac',
                        backgroundColor: codeBg,
                        p: { xs: 1.5, md: 2 }, borderRadius: 2,
                        overflowX: 'auto', lineHeight: 1.7, m: 0,
                        fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                        border: `1px solid ${alpha(stepColor, 0.2)}`,
                    }}>
                        {s.details.sample}
                    </Box>
                    {s.details.sampleNote && (
                        <Stack direction="row" spacing={1} mt={1} alignItems="flex-start">
                            <Typography sx={{ color: ACCENT.amber, fontSize: 14, flexShrink: 0, mt: '1px' }}>💡</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                {s.details.sampleNote}
                            </Typography>
                        </Stack>
                    )}
                </Box>

                <Divider sx={{ mb: 2.5 }} />

                {/* Pro tip */}
                <Box sx={{
                    backgroundColor: alpha(ACCENT.amber, isDark ? 0.08 : 0.06),
                    borderLeft: `3px solid ${ACCENT.amber}`,
                    borderRadius: '0 8px 8px 0',
                    pl: 1.5, py: 1.25, pr: 1.5,
                }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color: ACCENT.amber, display: 'block', mb: 0.5 }}>
                        💡 Pro Tip
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                        {s.details.tip}
                    </Typography>
                </Box>

            </DialogContent>
        </Dialog>
    );
}

/* ── Main exported section ── */
export default function IamScenariosSection({ hideHeader }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [openScenario, setOpenScenario] = useState(null);
    const [openEvalStep, setOpenEvalStep] = useState(null);
    const [tab, setTab] = useState("scenarios");

    const codeBg = isDark ? '#0d1117' : '#1a1f2e';
    const subBg = isDark ? alpha(theme.palette.background.default, 0.6) : theme.palette.grey[50];

    const tabs = [
        { id: "scenarios", label: "🎯 Scenarios" },
        { id: "eval", label: "⚖️ Policy Eval" },
        { id: "sts", label: "🔐 STS APIs" },
        { id: "numbers", label: "🔢 Key Numbers" },
    ];

    return (
        <Box>
            {!hideHeader && (
                <Stack direction="row" alignItems="center" spacing={1} mb={3} flexWrap="wrap" rowGap={1}>
                    <Typography variant="h5" fontWeight={700}>
                        IAM <span style={{ color: theme.palette.primary.main }}>Scenario Map</span>
                    </Typography>
                    <Chip label="SAA-C03" size="small" color="primary" variant="outlined" />
                    <Chip label="Interactive" size="small" variant="outlined"
                        sx={{ color: ACCENT.green, borderColor: ACCENT.green }} />
                </Stack>
            )}

            {/* Tab bar */}
            <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
                {tabs.map(t => (
                    <Chip
                        key={t.id}
                        label={t.label}
                        onClick={() => setTab(t.id)}
                        variant={tab === t.id ? "filled" : "outlined"}
                        color={tab === t.id ? "primary" : "default"}
                        sx={{ fontWeight: 600, cursor: 'pointer' }}
                    />
                ))}
            </Stack>

            {/* ── SCENARIOS TAB ── */}
            {tab === "scenarios" && (
                <>
                    <Typography variant="caption" color="text.disabled"
                        sx={{ letterSpacing: '0.08em', display: 'block', mb: 2 }}>
                        CLICK ANY CARD TO VIEW FULL SCENARIO DETAILS
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
                        {scenarios.map(s => (
                            <ScenarioCard key={s.id} s={s} onOpen={setOpenScenario} />
                        ))}
                    </Box>
                </>
            )}

            {/* ── POLICY EVAL TAB ── */}
            {tab === "eval" && (
                <>
                    <Typography variant="caption" color="text.disabled"
                        sx={{ letterSpacing: '0.08em', display: 'block', mb: 2 }}>
                        EVERY API CALL GOES THROUGH THIS EXACT WATERFALL — MOST TESTED IAM TOPIC
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary"
                                    sx={{ letterSpacing: '0.08em' }}>
                                    DECISION WATERFALL
                                </Typography>
                                <Chip label="every API call" size="small" variant="outlined"
                                    sx={{ fontSize: 9, height: 18, color: 'text.disabled', borderColor: 'divider' }} />
                            </Stack>

                            {/* Start marker */}
                            <Stack direction="row" alignItems="center" spacing={1} mb={0.5} sx={{ pl: 1 }}>
                                <Box sx={{
                                    px: 1.25, py: 0.4, borderRadius: 5,
                                    backgroundColor: alpha(ACCENT.primary, 0.12),
                                    border: `1px solid ${alpha(ACCENT.primary, 0.4)}`,
                                }}>
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: ACCENT.primary }}>
                                        ▶ API CALL RECEIVED
                                    </Typography>
                                </Box>
                            </Stack>

                            {evalSteps.map((s, i) => {
                                const isLast = i === evalSteps.length - 1;
                                const stepColor = s.type === 'allow' ? ACCENT.green : s.type === 'check' ? ACCENT.amber : ACCENT.red;
                                const yesColor = s.type === 'allow' ? ACCENT.green : ACCENT.red;

                                return (
                                    <Box key={i}>
                                        {/* Connector from previous */}
                                        <Stack alignItems="flex-start" sx={{ pl: '19px', py: '2px' }}>
                                            <Box sx={{ width: 2, height: 14, backgroundColor: theme.palette.divider }} />
                                            <Typography sx={{ fontSize: 9, color: 'text.disabled', lineHeight: 1, ml: '-4px' }}>▼</Typography>
                                        </Stack>

                                        {/* Decision card */}
                                        <Box
                                            onClick={() => setOpenEvalStep(s)}
                                            sx={{
                                                borderLeft: `4px solid ${stepColor}`,
                                                border: `1px solid ${alpha(stepColor, isDark ? 0.28 : 0.2)}`,
                                                borderLeftWidth: 4,
                                                borderRadius: '0 8px 8px 0',
                                                backgroundColor: alpha(stepColor, isDark ? 0.07 : 0.04),
                                                p: '10px 12px',
                                                cursor: 'pointer',
                                                transition: 'box-shadow 0.18s ease, background-color 0.18s ease',
                                                '&:hover': {
                                                    backgroundColor: alpha(stepColor, isDark ? 0.13 : 0.08),
                                                    boxShadow: `0 4px 16px ${alpha(stepColor, 0.2)}`,
                                                },
                                            }}
                                        >
                                            {/* Question row */}
                                            <Stack direction="row" alignItems="center" spacing={1.25} mb={1.25}>
                                                <Box sx={{
                                                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                                    backgroundColor: alpha(stepColor, 0.18),
                                                    border: `1.5px solid ${stepColor}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <Typography sx={{ fontSize: 10, fontWeight: 800, color: stepColor, lineHeight: 1 }}>
                                                        {s.step}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3, flex: 1 }}>
                                                    {s.label}
                                                </Typography>
                                                <Typography variant="caption"
                                                    sx={{ color: alpha(stepColor, 0.6), fontSize: 9, flexShrink: 0, alignSelf: 'center' }}>
                                                    tap for details →
                                                </Typography>
                                            </Stack>

                                            {/* YES / NO outcome boxes */}
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} sx={{ pl: '36px' }}>
                                                <Box sx={{
                                                    flex: 1,
                                                    backgroundColor: alpha(yesColor, isDark ? 0.14 : 0.09),
                                                    border: `1px solid ${alpha(yesColor, 0.45)}`,
                                                    borderRadius: 1.5, px: 1.25, py: 0.6,
                                                }}>
                                                    <Typography sx={{ fontSize: 9, fontWeight: 800, color: yesColor, display: 'block', mb: 0.2, letterSpacing: '0.04em' }}>
                                                        ✓ YES
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: yesColor, lineHeight: 1.45, fontSize: 10 }}>
                                                        {s.yes}
                                                    </Typography>
                                                </Box>

                                                {s.no && (
                                                    <Box sx={{
                                                        flex: 1,
                                                        border: `1px dashed ${theme.palette.divider}`,
                                                        borderRadius: 1.5, px: 1.25, py: 0.6,
                                                    }}>
                                                        <Typography sx={{ fontSize: 9, fontWeight: 800, color: 'text.disabled', display: 'block', mb: 0.2, letterSpacing: '0.04em' }}>
                                                            ✗ NO
                                                        </Typography>
                                                        <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.45, fontSize: 10 }}>
                                                            {s.no}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Stack>
                                        </Box>

                                        {/* Final outcome marker */}
                                        {isLast && (
                                            <Stack alignItems="flex-start" sx={{ pl: '19px', pt: '4px' }}>
                                                <Box sx={{ width: 2, height: 10, backgroundColor: theme.palette.divider }} />
                                                <Box sx={{
                                                    px: 1.25, py: 0.4, borderRadius: 5, mt: '2px',
                                                    backgroundColor: alpha(ACCENT.red, 0.12),
                                                    border: `1px solid ${alpha(ACCENT.red, 0.4)}`,
                                                }}>
                                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: ACCENT.red }}>
                                                        ■ ACCESS DENIED
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        )}
                                    </Box>
                                );
                            })}
                        </Box>

                        <Box>
                            <Typography variant="caption" fontWeight={700} color="text.secondary"
                                display="block" mb={1.5} sx={{ letterSpacing: '0.08em' }}>
                                CRITICAL RULES
                            </Typography>
                            <Stack spacing={1}>
                                {[
                                    { icon: "🚫", title: "Explicit DENY always wins", body: "Even if 10 other policies allow it — one explicit deny cancels everything." },
                                    { icon: "🏢", title: "SCPs are a ceiling, not a floor", body: "SCPs limit max permissions in AWS Orgs. They don't grant permissions by themselves." },
                                    { icon: "🔒", title: "Permission Boundaries — limits, not grants", body: "A boundary restricts what an identity policy CAN grant. It never grants access on its own." },
                                    { icon: "🔄", title: "Same vs Cross-Account", body: "Same account: identity OR resource policy = allow. Cross-account: BOTH required." },
                                    { icon: "🛡️", title: "Session policies", body: "Limit what a federated/assumed-role session can do — most restrictive of identity+session wins." },
                                ].map((r, i) => (
                                    <Card key={i} sx={{ borderRadius: 2 }}>
                                        <CardContent sx={{ py: '10px !important', px: '12px !important' }}>
                                            <Typography variant="body2" fontWeight={600} mb={0.5}>{r.icon} {r.title}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>{r.body}</Typography>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Stack>
                        </Box>
                    </Box>
                </>
            )}

            {/* ── STS APIS TAB ── */}
            {tab === "sts" && (
                <>
                    <Typography variant="caption" color="text.disabled"
                        sx={{ letterSpacing: '0.08em', display: 'block', mb: 2 }}>
                        STS = SECURITY TOKEN SERVICE — ISSUES TEMPORARY CREDENTIALS
                    </Typography>
                    <Stack spacing={1.5} mb={2}>
                        {stsApis.map((api, i) => (
                            <Card key={i} sx={{ borderRadius: 3, border: `1px solid ${alpha(api.color, 0.35)}` }}>
                                <CardContent>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={700} sx={{ color: api.color, mb: 0.25 }}>
                                                {api.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                WHO CALLS IT: <span style={{ color: theme.palette.text.primary }}>{api.who}</span>
                                            </Typography>
                                        </Box>
                                        <Box sx={{
                                            backgroundColor: alpha(api.color, 0.08),
                                            border: `1px solid ${alpha(api.color, 0.25)}`,
                                            borderRadius: 2, p: 1.5, flex: 1, maxWidth: { sm: 420 }
                                        }}>
                                            <Typography variant="caption" color="text.disabled" display="block" mb={0.5} sx={{ letterSpacing: '0.06em' }}>
                                                REAL-WORLD USE CASE
                                            </Typography>
                                            <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{api.useCase}</Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>

                    <Card sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="body2" fontWeight={700} mb={1.5} sx={{ color: ACCENT.amber }}>
                                🔑 Role Trust Policy — Who Can Assume the Role?
                            </Typography>
                            <Box component="pre" sx={{
                                fontSize: 11, color: '#86efac',
                                backgroundColor: codeBg, p: 1.5, borderRadius: 2,
                                overflowX: 'auto', lineHeight: 1.7, m: 0,
                                fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                            }}>
                                {`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::ACCOUNT-A:user/DevOpsUser"
    },
    "Action": "sts:AssumeRole",
    "Condition": {
      "Bool": { "aws:MultiFactorAuthPresent": "true" }
    }
  }]
}`}
                            </Box>
                            <Typography variant="caption" color="text.secondary" mt={1} display="block">
                                For services: Principal would be{" "}
                                <span style={{ color: ACCENT.teal }}>"Service": "ec2.amazonaws.com"</span>
                                {" "}or{" "}
                                <span style={{ color: ACCENT.teal }}>"lambda.amazonaws.com"</span>
                            </Typography>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ── KEY NUMBERS TAB ── */}
            {tab === "numbers" && (
                <>
                    <Typography variant="caption" color="text.disabled"
                        sx={{ letterSpacing: '0.08em', display: 'block', mb: 2 }}>
                        MEMORIZE THESE — THEY APPEAR DIRECTLY IN EXAM QUESTIONS
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 1.5, mb: 3 }}>
                        {keyNumbers.map((k, i) => (
                            <Card key={i} sx={{ borderRadius: 3, border: `1px solid ${alpha(k.color, 0.35)}`, textAlign: 'center' }}>
                                <CardContent sx={{ py: '14px !important' }}>
                                    <Typography variant="h5" fontWeight={700}
                                        sx={{ color: k.color, letterSpacing: '-0.5px', mb: 0.25 }}>
                                        {k.num}
                                    </Typography>
                                    <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>{k.label}</Typography>
                                    <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.5 }}>{k.note}</Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>

                    <Card sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="body2" fontWeight={700} mb={1.5} sx={{ color: ACCENT.amber }}>
                                🔍 Audit Tools — Know Which Tool For Which Job
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                                {[
                                    { icon: "🧪", name: "IAM Policy Simulator", use: "Test policies BEFORE deploying. Confirm allow/deny for any principal+action combination." },
                                    { icon: "📊", name: "Credential Report", use: "CSV of all users + credential ages, last login, MFA status. Generate once per 4 hours." },
                                    { icon: "🎭", name: "Access Advisor", use: "Shows last service access time per user/role. Remove unused permissions = least privilege." },
                                    { icon: "🔍", name: "Access Analyzer", use: "Finds resources shared externally (cross-account or public). Flags overly-permissive policies." },
                                ].map((t, i) => (
                                    <Stack key={i} direction="row" gap={1.5} alignItems="flex-start"
                                        sx={{ backgroundColor: subBg, borderRadius: 2, p: 1.5 }}>
                                        <Typography fontSize={22} flexShrink={0}>{t.icon}</Typography>
                                        <Box>
                                            <Typography variant="body2" fontWeight={700} mb={0.5}>{t.name}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>{t.use}</Typography>
                                        </Box>
                                    </Stack>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ── Scenario modal ── */}
            {openScenario && (
                <ScenarioModal scenario={openScenario} onClose={() => setOpenScenario(null)} />
            )}

            {/* ── Eval step detail modal ── */}
            {openEvalStep && (
                <EvalStepModal step={openEvalStep} onClose={() => setOpenEvalStep(null)} />
            )}
        </Box>
    );
}
