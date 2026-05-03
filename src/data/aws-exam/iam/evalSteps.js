import { ACCENT } from "../constants";

/**
 * IAM Policy Evaluation Waterfall
 * Every AWS API call passes through these 6 steps in order.
 * Steps 1-3: deny checks. Steps 4-5: allow checks. Step 6: implicit deny fallback.
 *
 * AMI PVT LTD Marketplace context: e.g. "Can the Marketplace-API-EC2-Role call s3:GetObject on marketplace-products-bucket?"
 */

const evalSteps = [
    {
        step: "1",
        label: "Explicit DENY anywhere?",
        yes: "DENIED → always wins, no exceptions",
        no: "Continue →",
        type: "deny",
        details: {
            what: "An explicit Deny is a policy statement with \"Effect\": \"Deny\". AWS evaluates every attached policy across all policy types, and if any single statement contains an explicit Deny for the requested action, access is blocked immediately — no other policy can override it, not even an AdministratorAccess policy.",
            where: "Any policy type can carry an explicit Deny: identity policies (users, groups, roles), resource-based policies (S3, SQS), SCPs (AWS Organizations), and Permission Boundaries. The Deny wins regardless of which policy type it comes from.",
            tip: "Use explicit Denies to enforce non-negotiable guardrails — e.g. block production resource deletion by non-Engineering roles, restrict actions outside approved AWS regions, or prevent the AMI PVT LTD EC2 role from calling iam:* even if someone attaches a broad managed policy.",
            sample: `// AMI PVT LTD Marketplace guardrail: deny S3 delete on production bucket from any role
{
  "Effect": "Deny",
  "Action": [
    "s3:DeleteObject",
    "s3:DeleteBucket"
  ],
  "Resource": [
    "arn:aws:s3:::marketplace-products-bucket",
    "arn:aws:s3:::marketplace-products-bucket/*"
  ],
  "Condition": {
    "StringNotEquals": {
      "aws:PrincipalTag/Team": "Platform-Admins"
    }
  }
}`,
            sampleNote: "Blocks S3 delete on the production bucket for any role not tagged as Platform-Admins — overrides any Allow policies that exist, including AdministratorAccess."
        }
    },

    {
        step: "2",
        label: "SCP (Org) blocks action?",
        yes: "DENIED → SCP caps max permissions",
        no: "Continue →",
        type: "check",
        details: {
            what: "Service Control Policies (SCPs) are organization-level guardrails managed via AWS Organizations. They define the ceiling of permissions any identity in a member account can ever have — including the account root. SCPs do NOT grant permissions; they only restrict what the maximum allowed permissions can be.",
            where: "AWS Organizations console → Policies → Service Control Policies. SCPs can be attached to the Organization Root (applies to all accounts), an OU (Organizational Unit), or a specific member account. They don't affect the management account.",
            tip: "AMI PVT LTD use case: attach an SCP to the 'customer-accounts' OU that denies iam:DeleteRole and iam:DetachRolePolicy — this ensures customers can't remove the Marketplace-Deploy-Role even if they have admin access in their own account.",
            sample: `// SCP on customer-accounts OU: protect the AMI PVT LTD deployment role
{
  "Effect": "Deny",
  "Action": [
    "iam:DeleteRole",
    "iam:DetachRolePolicy",
    "iam:DeleteRolePolicy"
  ],
  "Resource": "arn:aws:iam::*:role/Marketplace-Deploy-Role"
}`,
            sampleNote: "Even if a customer has AdministratorAccess in their account, this SCP prevents them from deleting or modifying the role AMI PVT LTD needs for deployments."
        }
    },

    {
        step: "3",
        label: "Permission Boundary set & blocks?",
        yes: "DENIED → boundary limits scope",
        no: "Continue →",
        type: "check",
        details: {
            what: "A Permission Boundary is an IAM managed policy attached to a user or role as their 'maximum allowed permissions'. The effective permissions are the intersection of what the identity policy allows AND what the boundary allows. If the boundary doesn't include an action, that action is denied — even if the identity policy grants it.",
            where: "IAM console → Users or Roles → 'Permissions boundary' tab → Set boundary. Used in AMI PVT LTD to safely delegate IAM role creation to Engineering: engineers can create Lambda execution roles but the boundary prevents them from creating roles with more permissions than they themselves have (prevents privilege escalation).",
            tip: "AMI PVT LTD pattern: attach a boundary to the Engineering-Group IAM users that caps their max at 'S3 + Lambda + CloudFormation only'. Even if someone attaches AdministratorAccess to an engineer's user, the boundary prevents DynamoDB, EC2, or IAM access from being effective.",
            sample: `// Boundary policy: caps Engineering users to marketplace services only
{
  "Effect": "Allow",
  "Action": [
    "lambda:*",
    "cloudformation:*",
    "s3:*",
    "logs:*"
  ],
  "Resource": "*"
}

// Their identity policy grants S3 + DynamoDB:
{
  "Effect": "Allow",
  "Action": ["s3:*", "dynamodb:*"],
  "Resource": "*"
}

// Effective permissions = intersection = S3 only
// dynamodb:* is blocked by the boundary
// lambda:* is blocked by the identity policy`,
            sampleNote: "Effective permissions = identity policy ∩ boundary. DynamoDB is outside the boundary; Lambda is outside the identity policy. Only S3 is in both — that's all they can do."
        }
    },

    {
        step: "4",
        label: "Resource-based policy allows?",
        yes: "ALLOWED ✓",
        no: "Continue →",
        type: "allow",
        details: {
            what: "Resource-based policies are attached directly to AWS resources (S3 buckets, SQS queues, KMS keys, Lambda functions, etc.). They specify which principals can access that resource. For same-account access, a resource policy alone is enough to grant access — no identity policy needed. For cross-account, both sides must allow.",
            where: "Configured per-resource: S3 → Bucket Policy tab, SQS → Access Policy, KMS → Key Policy, Lambda → Configuration → Permissions → Resource-based policy, SNS → Access Policy, Secrets Manager → Resource Policy. DynamoDB and EC2 do NOT support resource-based policies.",
            tip: "AMI PVT LTD use case: the 'marketplace-tool-artifacts' S3 bucket has a bucket policy allowing the customer's Provisioning-Service-Role to GetObject. For same-account access (e.g. the AMI PVT LTD EC2 role accessing the same bucket), the bucket policy alone is sufficient — the EC2 role doesn't even need its own identity policy allowing S3 GetObject.",
            sample: `// S3 Bucket Policy on marketplace-tool-artifacts (same-account: no identity policy needed)
{
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::123456789012:role/Marketplace-API-EC2-Role"
  },
  "Action": ["s3:GetObject", "s3:ListBucket"],
  "Resource": [
    "arn:aws:s3:::marketplace-tool-artifacts",
    "arn:aws:s3:::marketplace-tool-artifacts/*"
  ]
}`,
            sampleNote: "Same-account: bucket policy alone grants access to the EC2 role — the EC2 role's identity policy does not need to explicitly allow S3 access for this to work."
        }
    },

    {
        step: "5",
        label: "Identity policy allows?",
        yes: "ALLOWED ✓",
        no: "Continue →",
        type: "allow",
        details: {
            what: "Identity-based policies are attached to IAM identities — users, groups, or roles. They define what actions that identity is permitted to perform and on which resources. These are the most common policy type and the primary way you grant permissions to services and users.",
            where: "IAM console → Users / Groups / Roles → Permissions tab → Add permissions → Attach managed policy or create inline policy. In AMI PVT LTD, every service role (EC2, Lambda, cross-account deploy) has a custom identity policy scoped to the exact tables, buckets, and queues it needs.",
            tip: "For the AMI PVT LTD Marketplace-API-EC2-Role: the identity policy grants DynamoDB + S3 + SQS access. If someone asks 'can this EC2 role delete the Products table?' — check if dynamodb:DeleteTable appears in the identity policy. If it doesn't (and no resource policy grants it), it's an implicit deny.",
            sample: `// Identity policy on Marketplace-API-EC2-Role (excerpt)
{
  "Sid": "DynamoDBAccess",
  "Effect": "Allow",
  "Action": [
    "dynamodb:GetItem",
    "dynamodb:PutItem",
    "dynamodb:Query"
  ],
  "Resource": [
    "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Products",
    "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Orders"
  ]
}

// Note: dynamodb:DeleteTable is NOT listed
// → attempting DeleteTable results in implicit deny`,
            sampleNote: "The EC2 role can read and write to Products and Orders tables, but cannot delete them — dynamodb:DeleteTable is not in the Allow list, so it's implicitly denied."
        }
    },

    {
        step: "6",
        label: "No explicit allow found",
        yes: "IMPLICIT DENY → default fallback",
        no: "",
        type: "deny",
        details: {
            what: "AWS uses a default-deny model. If no policy at any layer (SCP, boundary, resource policy, identity policy) explicitly grants an Allow for the requested action, the request is implicitly denied. You never need to write a Deny statement to block everything — silence means no access.",
            where: "This is not configured anywhere — it is AWS's built-in default behavior. It is the reason the principle of least privilege works: start from zero permissions and explicitly grant only what is needed for the workload.",
            tip: "Implicit Deny vs Explicit Deny: both result in 'Access Denied' to the caller, but they behave differently internally. An explicit Deny cannot be overridden by any Allow. An implicit Deny is overridden simply by adding an Allow. Always prefer explicit Denies for security-critical guardrails (like 'never delete production resources').",
            sample: `// A newly created Marketplace-API-EC2-Role with NO policies attached:
// → ALL actions are implicitly denied by default

// Once you attach the permission policy:
{
  "Effect": "Allow",
  "Action": ["dynamodb:GetItem", "dynamodb:PutItem"],
  "Resource": "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Products"
}

// → ONLY dynamodb:GetItem and dynamodb:PutItem on the Products table are allowed
// → dynamodb:DeleteTable, dynamodb:UpdateTable, and ALL other actions
//   remain implicitly denied — no Deny statement needed`,
            sampleNote: "New IAM roles have zero permissions. Every Allow you add carves an explicit exception from the implicit deny baseline. This is the foundation of least-privilege design."
        }
    },
];

export default evalSteps;
