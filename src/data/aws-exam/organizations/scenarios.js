import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform AWS Organizations scenarios
 *
 * Account structure:
 *   Management Account  — ami-pvt-ltd-management   (123456789012)  billing, policies, governance
 *   OU: Platform        — marketplace-prod          (234567890123)  the SaaS marketplace
 *   OU: CustomerAccounts— finserv-corp-account      (987654321098)  one per enterprise subscriber
 *   OU: SharedServices  — marketplace-analytics               data pipeline
 *   OU: Dev/Test        — marketplace-dev                      development & staging
 *
 * Tech stack: Spring Boot (Java) on EC2 for server workloads, Node.js for Lambda.
 */

const scenarios = [
    {
        id: 1,
        analogy: "Think of it like a company org chart — the CEO's office (management account) sits at the top, departments like Finance, Engineering, and Sales (OUs) group teams together, and individual employees (member accounts) each do their own work while sharing one company invoice.",
        icon: "🏢",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "Organization Structure",
        subtitle: "AMI PVT LTD multi-account hierarchy",
        useCase: {
            title: "AMI PVT LTD Marketplace — setting up AWS Organizations with OUs and member accounts",
            story: "AMI PVT LTD manages four distinct AWS environments: the production marketplace, customer-provisioned accounts, a shared analytics pipeline, and a dev/test sandbox. Rather than operating these as unrelated accounts with separate billing, the platform team creates an AWS Organization under the 'ami-pvt-ltd-management' management account. OUs are created for Platform, CustomerAccounts, SharedServices, and Dev/Test. Member accounts are either created directly in the org or invited via email. All accounts roll up to a single consolidated bill in the management account, while each account retains its own resource isolation.",
            diagram: [
                { actor: "ami-pvt-ltd-management (Root)", icon: "🏢" },
                { arrow: "creates OUs" },
                { actor: "Platform OU / CustomerAccounts OU / SharedServices OU / Dev-Test OU", icon: "🗂️" },
                { arrow: "contains member accounts" },
                { actor: "marketplace-prod / finserv-corp-account / marketplace-analytics / marketplace-dev", icon: "☁️" },
            ],
        },
        buildSystem: [
            "In AWS Console: enable AWS Organizations from the 'ami-pvt-ltd-management' account (123456789012)",
            "Enable 'All Features' (not Consolidated Billing only) to unlock SCPs, tag policies, and delegated admin",
            "Create OU 'Platform' under root — move 'marketplace-prod' account (234567890123) into it",
            "Create OU 'CustomerAccounts' under root — create or invite one account per enterprise subscriber (e.g. 'finserv-corp-account' 987654321098)",
            "Create OU 'SharedServices' under root — create 'marketplace-analytics' account for the data pipeline",
            "Create OU 'Dev/Test' under root — create 'marketplace-dev' account for development and staging",
            "Enable consolidated billing: all accounts appear on a single AWS invoice under the management account",
            "Management account itself is NOT affected by SCPs — keep only billing and governance resources there",
        ],
        flow: ["Management Account", "Root", "OUs", "Member Accounts", "Consolidated Billing"],
        examTips: [
            "Management account is the only account that can create, invite, or remove member accounts",
            "Management account is NEVER affected by SCPs — even if an SCP is attached to the root",
            "Enabling All Features (not Consolidated Billing only) is required to use SCPs and other policy types",
            "Member accounts can be created directly in the org or invited via email; invited accounts must accept",
            "An account can only belong to one organization at a time",
        ],
        roleJson: [
            {
                label: "AWS Organizations — create OU and move account (CLI)",
                note: "Run from the management account. First create the OU under the org root, then move the member account into it.",
                code: `# Step 1: Get the root ID
aws organizations list-roots --query "Roots[0].Id" --output text
# Returns: r-xxxx

# Step 2: Create the Platform OU under root
aws organizations create-organizational-unit \\
  --parent-id r-xxxx \\
  --name Platform
# Returns: { "OrganizationalUnit": { "Id": "ou-xxxx-platform", "Name": "Platform" } }

# Step 3: Move marketplace-prod into the Platform OU
aws organizations move-account \\
  --account-id 234567890123 \\
  --source-parent-id r-xxxx \\
  --destination-parent-id ou-xxxx-platform`,
            },
        ],
    },

    {
        id: 2,
        analogy: "Think of it like a building manager who hands out master keys but can permanently block certain doors — even if a tenant has a key, the manager's override lock means they can never open the forbidden room, regardless of what the key says.",
        icon: "🔒",
        color: ACCENT.orange,
        tag: "SCENARIO 2",
        title: "Service Control Policies",
        subtitle: "Guard deployment roles and restrict regions",
        useCase: {
            title: "AMI PVT LTD Marketplace — preventing customers from removing the deployment role and restricting approved regions",
            story: "When enterprise customers subscribe to the AMI PVT LTD Marketplace, a 'Marketplace-Deploy-Role' is created in their AWS account so the platform's Deployment Agent can provision tools on their behalf. Without guardrails, a customer admin could accidentally delete or detach policies from this role, breaking automated provisioning. AMI PVT LTD solves this with an SCP attached to the 'CustomerAccounts' OU that denies 'iam:DeleteRole' and 'iam:DetachRolePolicy' on the 'Marketplace-Deploy-Role'. A second SCP attached to all OUs restricts API calls to approved regions only (ap-southeast-1 and ap-south-1), preventing accidental resource creation in unsupported regions.",
            diagram: [
                { actor: "ami-pvt-ltd-management", icon: "🏢" },
                { arrow: "attaches SCP to OU" },
                { actor: "CustomerAccounts OU (finserv-corp-account)", icon: "🗂️" },
                { arrow: "SCP denies destructive IAM actions on" },
                { actor: "Marketplace-Deploy-Role (987654321098)", icon: "🔒" },
                { arrow: "customer admin blocked" },
                { actor: "Access DENIED", icon: "❌" },
            ],
        },
        buildSystem: [
            "Create SCP 'marketplace-protect-deploy-role': deny iam:DeleteRole and iam:DetachRolePolicy on 'Marketplace-Deploy-Role' ARN",
            "Attach 'marketplace-protect-deploy-role' SCP to the 'CustomerAccounts' OU",
            "Create SCP 'marketplace-approved-regions': deny all actions where aws:RequestedRegion is NOT in [ap-southeast-1, ap-south-1]",
            "Use NotAction to exempt global services: IAM, STS, S3, Route 53, CloudFront, Support",
            "Attach 'marketplace-approved-regions' SCP to each OU (Platform, CustomerAccounts, SharedServices, Dev/Test)",
            "SCPs only restrict — they do NOT grant permissions; IAM policies must still allow actions",
            "Test: attempt to delete 'Marketplace-Deploy-Role' from 'finserv-corp-account' — should be denied",
            "Test: attempt to launch EC2 in us-east-1 from any member account — should be denied",
        ],
        flow: ["Management Account", "SCP Created", "Attached to OU", "Member Accounts Restricted", "Deny Enforced"],
        examTips: [
            "SCPs restrict what can be done — they never grant permissions on their own",
            "Management account is NEVER subject to SCPs, even if attached to root",
            "SCPs affect the account root user of member accounts — unlike IAM policies",
            "An explicit Deny in an SCP cannot be overridden by any IAM policy in the member account",
            "Use NotAction with a global-services exemption list when writing region-deny SCPs",
        ],
        roleJson: [
            {
                label: "SCP — protect Marketplace-Deploy-Role from deletion",
                note: "Attached to the CustomerAccounts OU. Prevents any principal in customer accounts from deleting or stripping policies from the deployment role AMI PVT LTD relies on.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ProtectMarketplaceDeployRole",
      "Effect": "Deny",
      "Action": [
        "iam:DeleteRole",
        "iam:DetachRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:PutRolePolicy"
      ],
      "Resource": "arn:aws:iam::*:role/Marketplace-Deploy-Role"
    }
  ]
}`,
            },
            {
                label: "SCP — restrict all API calls to approved regions only",
                note: "Attached to all OUs. NotAction exempts global services (IAM, STS, S3, Route 53) that do not have regional endpoints. Management account is never affected by SCPs.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyNonApprovedRegions",
      "Effect": "Deny",
      "NotAction": [
        "iam:*",
        "sts:*",
        "s3:*",
        "route53:*",
        "cloudfront:*",
        "support:*",
        "organizations:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotIn": {
          "aws:RequestedRegion": [
            "ap-southeast-1",
            "ap-south-1"
          ]
        }
      }
    }
  ]
}`,
            },
        ],
    },

    {
        id: 3,
        analogy: "Think of it like a family mobile phone plan — each family member has their own number and usage, but all bills roll up into one family account that qualifies for bulk discounts that no individual member could get on their own.",
        icon: "💰",
        color: ACCENT.teal,
        tag: "SCENARIO 3",
        title: "Consolidated Billing",
        subtitle: "Volume discounts and shared RI benefits across AMI PVT LTD accounts",
        useCase: {
            title: "AMI PVT LTD Marketplace — pooling EC2 usage across marketplace-prod and marketplace-analytics for Reserved Instance benefits",
            story: "AMI PVT LTD runs Spring Boot APIs on EC2 in 'marketplace-prod' and heavy Spark analytics workloads in 'marketplace-analytics'. Taken separately, neither account reaches the usage threshold for volume pricing tiers. With AWS Organizations consolidated billing, all compute hours from both accounts are summed at the organization level. Reserved Instances purchased in the management account automatically apply to matching instance usage anywhere in the org, giving 'marketplace-analytics' discount coverage even though that account never purchased RIs directly. Savings Plans work the same way — the org-level commitment covers usage across all member accounts.",
            diagram: [
                { actor: "marketplace-prod EC2 usage", icon: "🖥️" },
                { arrow: "pooled at org level" },
                { actor: "ami-pvt-ltd-management (billing aggregator)", icon: "💰" },
                { arrow: "applies RI discount to" },
                { actor: "marketplace-analytics EC2 usage", icon: "📊" },
                { arrow: "single invoice" },
                { actor: "Reduced AWS Bill", icon: "📉" },
            ],
        },
        buildSystem: [
            "Consolidated billing is active automatically when AWS Organizations is enabled",
            "Purchase Reserved Instances in 'ami-pvt-ltd-management' (123456789012) for t3.large in ap-southeast-1",
            "RI discount automatically applies to any t3.large usage in any member account in the same region",
            "Purchase Compute Savings Plans in the management account — org-wide coverage across all member accounts",
            "Check Cost Explorer at org level to identify which accounts generate the most compute spend",
            "Use RI sharing controls per-account if a specific account should not share RI benefits",
            "Data transfer costs between accounts in the same AZ over private IPs are free — architecture accordingly",
        ],
        flow: ["Member Account Usage", "Org-Level Aggregation", "Volume Tier Applied", "RI/SP Coverage", "Single Invoice"],
        examTips: [
            "Consolidated billing sums usage across all accounts for volume pricing tiers automatically",
            "Reserved Instances and Savings Plans purchased in any account can be shared org-wide",
            "RI sharing is enabled by default but can be disabled per-account by the management account",
            "Each member account still gets its own detailed bill — the org invoice is a single consolidated view",
            "Free data transfer between accounts only applies to private IPs in the same AZ",
        ],
        roleJson: [
            {
                label: "Cost Explorer — org-level RI utilization check (CLI)",
                note: "Run from the management account (123456789012). Shows RI coverage and underutilized reservations across all member accounts in the org.",
                code: `# View org-level RI recommendations from management account
aws ce get-reservation-utilization \\
  --time-period Start=2025-01-01,End=2025-02-01 \\
  --granularity MONTHLY \\
  --filter '{
    "Dimensions": {
      "Key": "LINKED_ACCOUNT",
      "Values": ["234567890123", "987654321098"]
    }
  }'

# View Savings Plans coverage across the org
aws ce get-savings-plans-coverage \\
  --time-period Start=2025-01-01,End=2025-02-01 \\
  --granularity MONTHLY`,
            },
        ],
    },

    {
        id: 4,
        analogy: "Think of it like a company badge that works in every branch office — any staff member wearing the company lanyard can enter branch buildings without being added to each branch's individual visitor list, and new branches automatically honour the same badge.",
        icon: "🔗",
        color: ACCENT.purple,
        tag: "SCENARIO 4",
        title: "Cross-Account Access with Organizations",
        subtitle: "Dynamic trust using aws:PrincipalOrgID",
        useCase: {
            title: "AMI PVT LTD Marketplace — Deployment Agent assumes customer roles without maintaining a static list of account IDs",
            story: "The AMI PVT LTD Deployment Agent (running in 'marketplace-prod', account 234567890123) must provision tools into hundreds of customer accounts. Managing a separate ExternalId or account-ID allowlist for each customer creates an operational burden and a security surface. Instead, each customer's 'Marketplace-Deploy-Role' trust policy uses the 'aws:PrincipalOrgID' condition — any principal from within the AMI PVT LTD AWS Organization can assume the role. New customer accounts added to the 'CustomerAccounts' OU automatically satisfy the condition. The Deployment Agent never needs updating when new customers onboard.",
            diagram: [
                { actor: "Marketplace Deploy Agent (marketplace-prod 234567890123)", icon: "🤖" },
                { arrow: "sts:AssumeRole" },
                { actor: "AWS STS", icon: "🔐" },
                { arrow: "checks trust policy condition" },
                { actor: "aws:PrincipalOrgID == o-xxxxxxxxxx", icon: "🔍" },
                { arrow: "match → issues temp creds for" },
                { actor: "Marketplace-Deploy-Role (finserv-corp-account 987654321098)", icon: "🎭" },
            ],
        },
        buildSystem: [
            "Get the AWS Organizations Organization ID: aws organizations describe-organization → o-xxxxxxxxxx",
            "In each customer account: create 'Marketplace-Deploy-Role' with trust policy using aws:PrincipalOrgID condition",
            "Trust principal: '*' (any principal) constrained by Condition: StringEquals aws:PrincipalOrgID = o-xxxxxxxxxx",
            "In 'marketplace-prod' (234567890123): attach sts:AssumeRole permission to the Deployment Agent role",
            "Deployment Agent calls: aws sts assume-role --role-arn arn:aws:iam::987654321098:role/Marketplace-Deploy-Role",
            "New customer accounts joining the org automatically satisfy the PrincipalOrgID condition — zero agent changes",
            "For tighter control: combine PrincipalOrgID with aws:PrincipalOrgPaths to restrict to the CustomerAccounts OU only",
        ],
        flow: ["Deploy Agent (Account A)", "sts:AssumeRole", "PrincipalOrgID Check", "Temp Creds", "Customer Resources (Account B)"],
        examTips: [
            "aws:PrincipalOrgID condition matches any principal (IAM user, role, service) whose account is in the specified org",
            "Unlike per-account ExternalId, PrincipalOrgID scales to any number of accounts without policy updates",
            "Use aws:PrincipalOrgPaths to restrict to a specific OU path within the organization",
            "PrincipalOrgID is a global condition key — works on trust policies, S3 bucket policies, KMS key policies, and more",
            "Still need sts:AssumeRole permission in Account A — trust policy alone is insufficient for cross-account assume",
        ],
        roleJson: [
            {
                label: "Trust policy in customer account — allow any org principal to assume deploy role",
                note: "Attached to 'Marketplace-Deploy-Role' in each customer account (e.g. finserv-corp-account 987654321098). Replace o-xxxxxxxxxx with the actual AMI PVT LTD organization ID.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowMarketplaceOrgPrincipal",
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "aws:PrincipalOrgID": "o-xxxxxxxxxx"
        }
      }
    }
  ]
}`,
            },
            {
                label: "Tighter trust policy — restrict to CustomerAccounts OU path only",
                note: "Use aws:PrincipalOrgPaths to constrain to a specific OU instead of the entire org. Format: o-orgid/r-rootid/ou-root-ouid/ou-level2-ouid/*",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowMarketplacePlatformOU",
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringLike": {
          "aws:PrincipalOrgPaths": "o-xxxxxxxxxx/r-xxxx/ou-xxxx-platform/*"
        }
      }
    }
  ]
}`,
            },
            {
                label: "Permission policy in marketplace-prod — allow Deployment Agent to assume customer roles",
                note: "Without this Allow on the caller side, the cross-account assume fails even if the trust policy permits it. Wildcarded on account ID so the policy covers all current and future customer accounts.",
                code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAssumeCustomerDeployRoles",
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::*:role/Marketplace-Deploy-Role"
    }
  ]
}`,
            },
        ],
    },

    {
        id: 5,
        analogy: "Think of it like a health-and-safety inspector who sets one set of rules from headquarters — every branch office is automatically audited against the same checklist, and new branches opening next month are inspected too without anyone updating the rulebook.",
        icon: "📋",
        color: ACCENT.green,
        tag: "SCENARIO 5",
        title: "AWS Config + Organizations",
        subtitle: "Org-wide compliance rules from a delegated admin account",
        useCase: {
            title: "AMI PVT LTD Marketplace — enforcing compliance rules across all customer accounts without using the management account",
            story: "AMI PVT LTD must ensure that every customer account using the marketplace meets a compliance baseline: EC2 instances must have IAM instance profiles, S3 buckets must have versioning enabled, and no S3 bucket may have public access. Deploying Config rules individually in each customer account is unscalable. Using the AWS Organizations delegated admin feature, AMI PVT LTD registers 'marketplace-prod' (234567890123) as the Config delegated admin. The platform team then deploys org-wide Config conformance pack rules from 'marketplace-prod' — the rules propagate automatically to all accounts in the org including new accounts joining the 'CustomerAccounts' OU.",
            diagram: [
                { actor: "ami-pvt-ltd-management (123456789012)", icon: "🏢" },
                { arrow: "registers delegated admin" },
                { actor: "marketplace-prod (234567890123)", icon: "🛒" },
                { arrow: "deploys org-wide Config rules" },
                { actor: "All Member Accounts (CustomerAccounts OU)", icon: "🗂️" },
                { arrow: "Config evaluates resources" },
                { actor: "Compliance Dashboard (Non-compliant findings)", icon: "📋" },
            ],
        },
        buildSystem: [
            "Enable AWS Config in every member account (can be done via CloudFormation StackSets from management account)",
            "From management account (123456789012): register 'marketplace-prod' as delegated administrator for AWS Config",
            "Command: aws organizations register-delegated-administrator --account-id 234567890123 --service-principal config.amazonaws.com",
            "From 'marketplace-prod': create org-wide Config rule 'marketplace-ec2-has-instance-profile' targeting EC2 resources",
            "Create org-wide Config rule 'marketplace-s3-versioning-enabled' targeting S3 buckets",
            "Create org-wide Config rule 'marketplace-s3-no-public-access' — checks S3 Block Public Access settings",
            "Rules automatically deploy to 'finserv-corp-account' (987654321098) and all other CustomerAccounts OU accounts",
            "New accounts joining the org receive Config rules automatically within the aggregation period",
        ],
        flow: ["Management Account", "Delegated Admin Registration", "marketplace-prod deploys rules", "All Member Accounts", "Compliance Findings"],
        examTips: [
            "Delegated admin allows a non-management account to administer org-wide services — reduces management account blast radius",
            "AWS Config delegated admin can create org-wide conformance packs and aggregators from the delegated account",
            "Config rules evaluate resources but do NOT automatically remediate — use Config Remediation Actions (SSM Automation) for that",
            "New accounts auto-inherit org Config rules when they join an OU covered by the org conformance pack",
            "AWS Config aggregator collects compliance data from all accounts and regions into a single view",
        ],
        roleJson: [
            {
                label: "Register marketplace-prod as Config delegated admin (CLI from management account)",
                note: "Run from 'ami-pvt-ltd-management' (123456789012). This allows the marketplace-prod team to manage org-wide Config without needing management account credentials for day-to-day operations.",
                code: `# Run from ami-pvt-ltd-management (123456789012)
aws organizations register-delegated-administrator \\
  --account-id 234567890123 \\
  --service-principal config.amazonaws.com

# Verify registration
aws organizations list-delegated-administrators \\
  --service-principal config.amazonaws.com`,
            },
            {
                label: "Org-wide Config conformance pack — marketplace compliance baseline",
                note: "Deploy from 'marketplace-prod' (234567890123) after delegated admin is registered. Automatically creates Config rules in all accounts within the org.",
                code: `# marketplace-compliance-pack.yaml
Parameters: {}
Resources:
  EC2HasInstanceProfile:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: marketplace-ec2-has-instance-profile
      Source:
        Owner: AWS
        SourceIdentifier: EC2_INSTANCE_PROFILE_ATTACHED
      Scope:
        ComplianceResourceTypes:
          - AWS::EC2::Instance

  S3VersioningEnabled:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: marketplace-s3-versioning-enabled
      Source:
        Owner: AWS
        SourceIdentifier: S3_BUCKET_VERSIONING_ENABLED
      Scope:
        ComplianceResourceTypes:
          - AWS::S3::Bucket

  S3NoPublicAccess:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: marketplace-s3-no-public-access
      Source:
        Owner: AWS
        SourceIdentifier: S3_BUCKET_LEVEL_PUBLIC_ACCESS_PROHIBITED
      Scope:
        ComplianceResourceTypes:
          - AWS::S3::Bucket`,
            },
        ],
    },
];

export default scenarios;
