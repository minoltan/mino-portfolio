import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Deployment & Management scenarios
 *
 * Services: AWS CloudFormation, AWS Elastic Beanstalk, AWS Config,
 *           AWS Resource Access Manager, AWS Systems Manager, AWS OpsWorks
 * Reference: https://digitalcloud.training/aws-cloudformation/
 *            https://digitalcloud.training/aws-elastic-beanstalk/
 *            https://digitalcloud.training/aws-config/
 *            https://digitalcloud.training/aws-resource-access-manager/
 *            https://digitalcloud.training/aws-systems-manager/
 *            https://digitalcloud.training/aws-opsworks/
 */

const scenarios = [
    {
        id: 1,
        analogy: "Think of it like an IKEA instruction manual for your cloud — every screw, shelf, and bolt is described in a written document (CloudFormation template), and anyone can hand that document to a factory (CloudFormation stack) that builds the exact same furniture every time, in any room, without any manual steps.",
        icon: "📋",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "AWS CloudFormation Stacks",
        subtitle: "Infrastructure as Code for the entire marketplace platform",
        useCase: {
            title: "AMI PVT LTD Marketplace — CloudFormation stack deploying the core marketplace infrastructure",
            story: "AMI PVT LTD defines the entire marketplace-prod infrastructure in a CloudFormation template marketplace-core-stack.yaml. The template provisions marketplace-vpc (10.0.0.0/16), public/private subnets, marketplace-alb, marketplace-api-asg (min=2/max=10), marketplace-orders-db (RDS Multi-AZ), marketplace-redis-cluster, SQS order-events-queue, SNS marketplace-notifications, and all associated IAM roles. When a bug is found — for example, the SQS visibility timeout not matching the Lambda timeout — an engineer updates the template, runs a Change Set preview to see exactly what will change before applying it, and CloudFormation applies a rolling update without destroying the stack. Drift Detection runs weekly to flag any manual console changes that diverged from the template.",
            diagram: [
                { actor: "Engineer — updates marketplace-core-stack.yaml", icon: "👷" },
                { arrow: "create-change-set → preview → execute" },
                { actor: "CloudFormation Stack — marketplace-core-stack", icon: "📋" },
                { arrow: "creates/updates/deletes resources in dependency order" },
                { actor: "VPC, ALB, ASG, RDS, ElastiCache, SQS, SNS, IAM Roles", icon: "☁️" },
            ],
        },
        buildSystem: [
            "Structure the template with Parameters (env, instanceType), Mappings (region→AMI), Conditions (isProd), Resources (all infrastructure), and Outputs (ALB DNS, RDS endpoint)",
            "Use DependsOn and Ref/GetAtt to express resource ordering — CloudFormation automatically builds a dependency graph and creates resources in parallel where possible",
            "Store the template in S3 marketplace-tool-artifacts/cloudformation/marketplace-core-stack.yaml; reference it via --template-url in CLI commands (templates > 51,200 bytes must use S3)",
            "Create a Change Set before every update: aws cloudformation create-change-set; review the change set in the console to see exactly which resources will be Added/Modified/Removed",
            "Configure Stack Policy on marketplace-core-stack to deny Update:Replace and Update:Delete on the RDS instance — prevents accidental database replacement during stack updates",
            "Enable Termination Protection on the stack to prevent accidental deletion: aws cloudformation update-termination-protection --enable-termination-protection",
            "Set up Drift Detection as a weekly EventBridge scheduled rule — trigger a Lambda that calls detect-stack-drift and publishes results to marketplace-notifications SNS if drift is found",
            "Use CloudFormation Outputs to export the VPC ID, private subnet IDs, and ALB ARN so nested stacks and other stacks can import them via Fn::ImportValue without hardcoding ARNs",
        ],
        flow: ["Template in S3", "Change Set Preview", "Stack Update Executes", "Resources Updated In-order", "Drift Detection Weekly"],
        examTips: [
            "CloudFormation Change Sets let you preview changes BEFORE applying them — always use a Change Set for production stacks to avoid surprises like resource replacement",
            "Stack Policy is a JSON policy that controls which UPDATE actions are allowed on specific resources — use it to protect stateful resources (RDS, DynamoDB) from accidental replacement",
            "Drift Detection identifies resources that have been manually changed outside of CloudFormation — it does NOT automatically fix drift; you must reconcile the template or the resource manually",
            "Nested stacks decompose a large template into reusable modules (networking stack, security stack, app stack); the root stack orchestrates them all via AWS::CloudFormation::Stack resources",
            "DeletionPolicy: Retain preserves the physical resource when its CloudFormation stack is deleted — always set this on RDS instances and S3 buckets to prevent accidental data loss",
        ],
        roleJson: [
            {
                label: "AWS CLI — deploy stack with change set and termination protection",
                note: "💡 Always create a Change Set and review it before executing — especially on stacks with RDS or DynamoDB, where an unwanted resource replacement deletes your data.",
                code: `# Deploy stack from S3 template
aws cloudformation create-stack \\
  --stack-name marketplace-core-stack \\
  --template-url https://s3.ap-southeast-1.amazonaws.com/marketplace-tool-artifacts/cloudformation/marketplace-core-stack.yaml \\
  --parameters ParameterKey=Env,ParameterValue=prod ParameterKey=InstanceType,ParameterValue=t3.medium \\
  --capabilities CAPABILITY_NAMED_IAM \\
  --enable-termination-protection

# Create a Change Set for an update
aws cloudformation create-change-set \\
  --stack-name marketplace-core-stack \\
  --change-set-name marketplace-update-v2 \\
  --template-url https://s3.ap-southeast-1.amazonaws.com/marketplace-tool-artifacts/cloudformation/marketplace-core-stack-v2.yaml \\
  --capabilities CAPABILITY_NAMED_IAM

# Review Change Set
aws cloudformation describe-change-set \\
  --stack-name marketplace-core-stack \\
  --change-set-name marketplace-update-v2

# Execute Change Set after review
aws cloudformation execute-change-set \\
  --stack-name marketplace-core-stack \\
  --change-set-name marketplace-update-v2`,
            },
        ],
    },

    {
        id: 2,
        analogy: "Think of it like a franchise operations manual that headquarters sends to every new branch — instead of each new branch (customer account) wiring up their own store from scratch, head office (management account) runs one command and the same setup is stamped out identically across all 50 branches simultaneously.",
        icon: "🌐",
        color: ACCENT.teal,
        tag: "SCENARIO 2",
        title: "CloudFormation StackSets",
        subtitle: "Deploying marketplace customer tool infrastructure across multiple AWS accounts",
        useCase: {
            title: "AMI PVT LTD Marketplace — StackSets deploying the customer tool stack into every subscriber account",
            story: "When a new enterprise customer subscribes on the AMI PVT LTD Marketplace, the platform must deploy a standard Marketplace-Deploy-Role and initial tool infrastructure into the customer's AWS account (customer = 987654321098 and others). AMI PVT LTD uses a CloudFormation StackSet marketplace-customer-bootstrap-stackset to deploy this stack automatically into every account in the CustomerAccounts OU. The StackSet is managed from the management account (123456789012) with service-managed permissions (AWS Organizations integration) — no manual trust setup needed in each customer account. When an existing customer's stack needs updating (e.g. a new tool permission added to Marketplace-Deploy-Role), AMI PVT LTD updates the StackSet once and it propagates to all 50+ customer accounts.",
            diagram: [
                { actor: "Management Account (123456789012) — StackSet administrator", icon: "👑" },
                { arrow: "create/update StackSet (service-managed, Organizations)" },
                { actor: "CloudFormation StackSet — marketplace-customer-bootstrap-stackset", icon: "🌐" },
                { arrow: "deploys Stack Instance per account automatically" },
                { actor: "Customer Account-B (987654321098) — Stack Instance deployed", icon: "🏢" },
                { arrow: "creates resources" },
                { actor: "Marketplace-Deploy-Role / tool Lambda / DynamoDB tables (in customer account)", icon: "⚙️" },
            ],
        },
        buildSystem: [
            "Enable trusted access for CloudFormation in AWS Organizations: aws organizations enable-aws-service-access --service-principal stacksets.cloudformation.amazonaws.com",
            "Create StackSet marketplace-customer-bootstrap-stackset from management account with PermissionModel=SERVICE_MANAGED; this uses Organizations integration — no manual IAM role creation in target accounts",
            "Define the StackSet template: creates Marketplace-Deploy-Role (with ExternalId condition), output Lambda placeholder, and CloudWatch log group in the customer account",
            "Add Stack Instances targeting the CustomerAccounts OU: aws cloudformation create-stack-instances --stack-set-name marketplace-customer-bootstrap-stackset --deployment-targets OrganizationalUnitIds=ou-xxxx-xxxxxxxx --regions ap-southeast-1",
            "Set OperationPreferences: MaxConcurrentPercentage=20, FailureTolerancePercentage=10 — deploy to 20% of accounts in parallel and tolerate 10% failure before stopping the rollout",
            "Configure automatic deployment: AutoDeployment.Enabled=true, RetainStacksOnAccountRemoval=false — new accounts joining CustomerAccounts OU automatically get the stack; removed accounts get it deleted",
            "To update all customer stacks (e.g. add a new Lambda permission): update the StackSet template and run update-stack-instances; StackSets orchestrates the rollout across all accounts",
            "Monitor StackSet operations in the AWS console or via describe-stack-set-operation — each operation shows per-account status (SUCCEEDED, FAILED, RUNNING) across all Stack Instances",
        ],
        flow: ["Management Account defines StackSet", "Organizations OU targeting", "Stack Instance per account", "Parallel deployment (20%)", "Auto-deploy on new account join"],
        examTips: [
            "StackSets with SERVICE_MANAGED permissions use AWS Organizations — no need to manually create AWSCloudFormationStackSetAdministrationRole in each account; the service handles trust automatically",
            "StackSets with SELF_MANAGED permissions require you to create AWSCloudFormationStackSetAdministrationRole (admin account) and AWSCloudFormationStackSetExecutionRole (target accounts) manually",
            "Automatic deployment (AutoDeployment.Enabled=true) only works with SERVICE_MANAGED and Organizations — it is not available for self-managed StackSets",
            "FailureToleranceCount/Percentage stops the StackSet operation if more than the specified number of accounts fail — prevents a bad update from rolling out to all accounts",
            "StackSets deploy STACKS into target accounts — each target account has a Stack Instance; deleting the StackSet does NOT delete the Stack Instances unless RetainStacksOnAccountRemoval=false",
        ],
        roleJson: [
            {
                label: "AWS CLI — create StackSet with Organizations service-managed permissions",
                note: "💡 Always set FailureTolerancePercentage when updating production StackSets — without it, a single account failure stops the entire rollout and leaves accounts in mixed states.",
                code: `# Enable Organizations trusted access for StackSets
aws organizations enable-aws-service-access \\
  --service-principal stacksets.cloudformation.amazonaws.com

# Create StackSet with service-managed permissions
aws cloudformation create-stack-set \\
  --stack-set-name marketplace-customer-bootstrap-stackset \\
  --template-url https://s3.ap-southeast-1.amazonaws.com/marketplace-tool-artifacts/cloudformation/customer-bootstrap.yaml \\
  --permission-model SERVICE_MANAGED \\
  --auto-deployment '{"Enabled": true, "RetainStacksOnAccountRemoval": false}'

# Deploy to CustomerAccounts OU across all target regions
aws cloudformation create-stack-instances \\
  --stack-set-name marketplace-customer-bootstrap-stackset \\
  --deployment-targets '{"OrganizationalUnitIds": ["ou-xxxx-xxxxxxxx"]}' \\
  --regions ap-southeast-1 \\
  --operation-preferences '{
    "MaxConcurrentPercentage": 20,
    "FailureTolerancePercentage": 10
  }'`,
            },
        ],
    },

    {
        id: 3,
        analogy: "Think of it like a smart hotel key card system — instead of the hotel manager manually patching each door lock, they push an update from the front desk (Systems Manager) to all 500 room locks simultaneously, check which rooms are running old firmware (Inventory), and open a secure remote session to any lock for diagnostics without physically visiting the room (Session Manager).",
        icon: "🔧",
        color: ACCENT.amber,
        tag: "SCENARIO 3",
        title: "AWS Systems Manager",
        subtitle: "Centrally manage, patch, and configure EC2 instances across the marketplace fleet",
        useCase: {
            title: "AMI PVT LTD Marketplace — SSM Parameter Store for config, Session Manager for secure access, and Patch Manager for the EC2 fleet",
            story: "AMI PVT LTD uses Systems Manager across three key workflows: (1) Parameter Store — Spring Boot API reads database credentials, Stripe API keys, and feature flags from SSM Parameter Store at startup (SecureString parameters encrypted with marketplace-kms-key); no secrets are stored in EC2 user data or environment variables. (2) Session Manager — engineers access marketplace-api-asg EC2 instances for debugging via SSM Session Manager instead of SSH bastion hosts; no port 22 is open in any security group, and every session is logged to CloudWatch Logs. (3) Patch Manager — a maintenance window (every Sunday 02:00–04:00 UTC) patches all EC2 instances tagged Environment=prod with the AWS-RunPatchBaseline document; patch compliance reports are sent to the ops team.",
            diagram: [
                { actor: "Spring Boot API (EC2 in marketplace-api-asg)", icon: "🏢" },
                { arrow: "GetParameter at startup (no hardcoded secrets)" },
                { actor: "SSM Parameter Store — /marketplace/prod/* (SecureString + KMS)", icon: "🔐" },
                { actor: "Engineer (no SSH, no bastion host)", icon: "👷" },
                { arrow: "SSM Session Manager (port 443 only, no port 22)" },
                { actor: "EC2 instances via SSM Agent (session logged to CloudWatch)", icon: "🖥️" },
                { actor: "SSM Patch Manager — maintenance window Sunday 02:00 UTC", icon: "🔧" },
                { arrow: "AWS-RunPatchBaseline on all Environment=prod instances" },
            ],
        },
        buildSystem: [
            "Create SSM Parameter Store parameters: /marketplace/prod/db-password (SecureString, KMS key=marketplace-kms-key), /marketplace/prod/stripe-api-key (SecureString), /marketplace/prod/feature-flags (String JSON)",
            "Attach IAM policy to Marketplace-API-EC2-Role: ssm:GetParameter, ssm:GetParameters on /marketplace/prod/* — Spring Boot reads params at startup using AWS SDK, never from env variables",
            "Verify SSM Agent is pre-installed on Amazon Linux 2 AMI (it is, by default); confirm agent is running: aws ssm describe-instance-information --filters Key=tag:Environment,Values=prod",
            "Create Session Manager preferences document: log sessions to CloudWatch Log Group /marketplace/ssm-sessions, KMS encrypt session data with marketplace-kms-key; disable SSH port in all EC2 security groups",
            "Create SSM Maintenance Window marketplace-patch-window: schedule=cron(0 2 ? * SUN *), duration=2 hours, cutoff=1 hour — tasks registered for this window run only during the window",
            "Register Patch Manager task on the maintenance window: RunCommand document=AWS-RunPatchBaseline, target=tag:Environment=prod, concurrencyCount=2, errorThreshold=1 — patches 2 instances at a time",
            "Create Patch Baseline marketplace-amazon-linux-baseline: approve Critical and Important security patches after 7 days; associate the baseline with the Amazon Linux 2 patch group",
            "Enable SSM Inventory on all instances to collect software, network config, and patch compliance data; use Resource Data Sync to aggregate inventory data into S3 marketplace-analytics-raw for Athena queries",
        ],
        flow: ["Spring Boot reads SSM at startup", "Session Manager replaces SSH", "Maintenance Window triggers", "Patch Baseline applied", "Compliance report to ops"],
        examTips: [
            "SSM Parameter Store Standard tier is free; Advanced tier supports parameters >4 KB (up to 8 KB), parameter policies (TTL-based expiry), and higher throughput — use Advanced for large config payloads",
            "SecureString parameters are encrypted with KMS — the IAM role must have BOTH ssm:GetParameter AND kms:Decrypt permissions; missing either causes an AccessDenied error",
            "Session Manager requires no inbound security group rules (no port 22) — the SSM Agent initiates an outbound HTTPS connection to the SSM endpoint; works in private subnets with an SSM VPC Interface Endpoint",
            "Patch Manager Patch Groups link EC2 instances (via the tag key Patch Group) to a Patch Baseline — instances without the tag use the default AWS-provided baseline for their OS",
            "Run Command executes scripts or documents on multiple instances simultaneously without SSH — it is the foundation for both Patch Manager and State Manager; output is streamed to S3 or CloudWatch Logs",
        ],
        roleJson: [
            {
                label: "AWS CLI — create SecureString parameter and start Session Manager session",
                note: "💡 Use Parameter Store paths with a hierarchy (/marketplace/prod/db-password) — this lets you grant IAM access to an entire path prefix with a single policy, instead of one policy per parameter.",
                code: `# Create SecureString parameter (KMS-encrypted)
aws ssm put-parameter \\
  --name "/marketplace/prod/db-password" \\
  --value "super-secret-password" \\
  --type SecureString \\
  --key-id alias/marketplace-kms-key \\
  --description "RDS marketplace-orders-db admin password"

# Get parameter (Spring Boot SDK equivalent)
aws ssm get-parameter \\
  --name "/marketplace/prod/db-password" \\
  --with-decryption

# Start a Session Manager session (no SSH, no bastion)
aws ssm start-session \\
  --target i-0abc123def456 \\
  --region ap-southeast-1

# List patch compliance for all prod instances
aws ssm list-compliance-summaries \\
  --filters Key=ComplianceType,Values=Patch \\
  --region ap-southeast-1`,
            },
        ],
    },

    {
        id: 4,
        analogy: "Think of it like a health inspector for your cloud — they visit every restaurant (AWS resource) and check it against a checklist of food safety regulations (Config rules). If a restaurant is found to be non-compliant (e.g. serving raw chicken), the inspector logs the violation and can automatically alert the owner or even fix the issue on the spot (auto-remediation).",
        icon: "🔍",
        color: ACCENT.orange,
        tag: "SCENARIO 4",
        title: "AWS Config",
        subtitle: "Continuous compliance monitoring and auto-remediation for the marketplace",
        useCase: {
            title: "AMI PVT LTD Marketplace — AWS Config rules enforcing security and compliance across all accounts",
            story: "AMI PVT LTD enables AWS Config across all accounts in the AWS Organizations structure. Three custom and managed Config Rules enforce the marketplace security baseline: (1) rds-multi-az-support checks that marketplace-orders-db and marketplace-aurora-cluster have Multi-AZ enabled; (2) s3-bucket-server-side-encryption-enabled checks that marketplace-products-bucket and marketplace-tool-artifacts have SSE-S3 or SSE-KMS enabled; (3) ec2-instance-no-public-ip-association checks that EC2 instances in private subnets do not have public IPs. Any non-compliant resource triggers an SSM Automation runbook via EventBridge for auto-remediation, and sends an alert to marketplace-notifications SNS. Config also records every configuration change to all resources so the team can answer 'who changed what, when' without manually digging through CloudTrail logs.",
            diagram: [
                { actor: "AWS Resources (EC2, RDS, S3, SQS, IAM Roles…)", icon: "☁️" },
                { arrow: "configuration changes recorded continuously" },
                { actor: "AWS Config — Configuration Recorder + Delivery Channel", icon: "🔍" },
                { arrow: "evaluates against Config Rules" },
                { actor: "Config Rules (rds-multi-az, s3-encryption, ec2-no-public-ip)", icon: "📋" },
                { arrow: "NON_COMPLIANT → EventBridge → SSM Automation" },
                { actor: "Auto-remediation + SNS alert to marketplace-notifications", icon: "🚨" },
            ],
        },
        buildSystem: [
            "Enable AWS Config in ap-southeast-1: create Configuration Recorder (record all resource types), Delivery Channel to S3 marketplace-tool-artifacts/config-snapshots/, and SNS delivery for configuration change notifications",
            "Enable Config Aggregator marketplace-org-aggregator in the management account with source=AWS Organizations — aggregates compliance data from all member accounts into a single view",
            "Add managed Config Rule rds-multi-az-support with scope limited to AWS::RDS::DBInstance resources; set remediation action to SSM Automation document AWS-CreateRDSSnapshot (snapshot before alerting)",
            "Add managed Config Rule s3-bucket-server-side-encryption-enabled; configure auto-remediation via AWS-EnableS3BucketEncryption Automation document with parameters BucketName={ResourceId}",
            "Create custom Config Rule marketplace-ec2-private-subnet-only: a Lambda function checks that any EC2 instance tagged Environment=prod has no public IP and resides in a private subnet",
            "Create Config Conformance Pack marketplace-security-baseline.yaml bundling all marketplace rules into a single deployable package; deploy via StackSets to all accounts in the Platform OU",
            "Set up Config Rule evaluation frequency: change-triggered for S3 and EC2 rules (evaluate on every config change), periodic (every 24 hours) for RDS Multi-AZ rule",
            "Build a Config Timeline query for marketplace-orders-db: use the AWS Config console timeline to see every configuration change to the RDS instance since it was created — invaluable for incident post-mortems",
        ],
        flow: ["Resource changes recorded", "Config Rule evaluates", "COMPLIANT / NON_COMPLIANT", "EventBridge fires on NON_COMPLIANT", "Auto-remediation + SNS alert"],
        examTips: [
            "AWS Config records CONFIGURATION CHANGES — it does not prevent them; to prevent changes, use Service Control Policies (SCPs) or IAM policies; Config is for audit and compliance, not enforcement",
            "Config Aggregator collects compliance data from multiple accounts/regions into one place — use it with Organizations so the management account has a single pane of glass for all member accounts",
            "A Conformance Pack is a collection of Config Rules and remediation actions deployed together as a single entity — use it to implement a security standard (e.g. CIS AWS Foundations) across the organisation",
            "Config stores configuration history and snapshots in S3 — you can query past states using Athena on the delivered JSON snapshots; Config Advanced Queries uses SQL to query current resource state",
            "Config Rule evaluations can be triggered by CONFIGURATION_CHANGE (real-time on resource change) or PERIODIC (scheduled: 1h, 3h, 6h, 12h, 24h) — choose based on how often the compliance state could change",
        ],
        roleJson: [
            {
                label: "AWS CLI — enable Config recorder and add managed compliance rules",
                note: "💡 Config charges per configuration item recorded AND per active rule evaluation — limit the recorded resource types to only what you need to control costs in large organisations.",
                code: `# Create Config configuration recorder
aws configservice put-configuration-recorder \\
  --configuration-recorder '{
    "name": "marketplace-config-recorder",
    "roleARN": "arn:aws:iam::234567890123:role/ConfigRole",
    "recordingGroup": {"allSupported": true, "includeGlobalResourceTypes": true}
  }'

# Create delivery channel (S3 + SNS)
aws configservice put-delivery-channel \\
  --delivery-channel '{
    "name": "marketplace-config-channel",
    "s3BucketName": "marketplace-tool-artifacts",
    "s3KeyPrefix": "config-snapshots",
    "snsTopicARN": "arn:aws:sns:ap-southeast-1:234567890123:marketplace-notifications",
    "configSnapshotDeliveryProperties": {"deliveryFrequency": "TwentyFour_Hours"}
  }'

# Start recorder
aws configservice start-configuration-recorder \\
  --configuration-recorder-name marketplace-config-recorder

# Add managed rule: RDS Multi-AZ
aws configservice put-config-rule \\
  --config-rule '{
    "ConfigRuleName": "rds-multi-az-support",
    "Source": {"Owner": "AWS", "SourceIdentifier": "RDS_MULTI_AZ_SUPPORT"},
    "Scope": {"ComplianceResourceTypes": ["AWS::RDS::DBInstance"]}
  }'`,
            },
        ],
    },

    {
        id: 5,
        analogy: "Think of it like a shared community tool library — instead of every household in the street buying their own expensive drill (VPC subnet), the street council (AWS RAM) registers one set of premium tools in a shared library that any neighbour (any AWS account in the organisation) can borrow and use directly, without the tool ever leaving the library building.",
        icon: "🤝",
        color: ACCENT.purple,
        tag: "SCENARIO 5",
        title: "AWS Resource Access Manager (RAM)",
        subtitle: "Sharing VPC subnets across marketplace platform and analytics accounts",
        useCase: {
            title: "AMI PVT LTD Marketplace — RAM sharing private subnets from marketplace-prod to marketplace-analytics account",
            story: "AMI PVT LTD runs a separate marketplace-analytics account (in the SharedServices OU) for EMR, Glue, and Redshift workloads. Rather than creating a separate VPC in the analytics account and peering it with marketplace-vpc, AMI PVT LTD uses AWS Resource Access Manager to share the private subnets of marketplace-vpc directly with the marketplace-analytics account. The analytics account launches EMR clusters and Glue connections directly into marketplace-vpc private subnets — they get the same network connectivity to RDS and ElastiCache without any VPC peering, NAT gateway duplication, or cross-account data transfer charges. RAM sharing is enabled at the AWS Organizations level, so no manual share acceptance is needed in the analytics account.",
            diagram: [
                { actor: "marketplace-prod account (234567890123) — VPC owner", icon: "🏢" },
                { arrow: "RAM Resource Share → private subnet ARNs" },
                { actor: "AWS RAM Resource Share — marketplace-subnet-share", icon: "🤝" },
                { arrow: "shared to marketplace-analytics account via Organizations" },
                { actor: "marketplace-analytics account — subnet participant", icon: "📊" },
                { arrow: "launches EMR/Glue resources directly into shared subnets" },
                { actor: "EMR cluster / Glue connection in marketplace-vpc private subnets", icon: "⚙️" },
            ],
        },
        buildSystem: [
            "Enable RAM sharing with AWS Organizations: aws ram enable-sharing-with-aws-organization — this allows sharing without manual acceptance in each target account",
            "Create RAM Resource Share marketplace-subnet-share in marketplace-prod account: resource ARNs = [private subnet ap-southeast-1a ARN, private subnet ap-southeast-1b ARN]",
            "Set the principal to the marketplace-analytics account ID (or the SharedServices OU ARN for broader sharing): --principals arn:aws:organizations::123456789012:ou/o-xxxx/ou-SharedServices",
            "In the analytics account, confirm the subnet is visible: aws ec2 describe-subnets — the shared subnets appear with ownerId=234567890123 (the owner account) but are usable for launching resources",
            "Launch EMR cluster in analytics account referencing the shared subnet ID: aws emr create-cluster --ec2-attributes SubnetId=subnet-private-aaa (the shared subnet) — EMR uses the subnet but AMI PVT LTD remains the VPC owner",
            "Security Group ownership: the analytics account creates its own security groups in the shared VPC; the VPC owner (marketplace-prod) controls NACLs and route tables but cannot see analytics account SGs",
            "To share the Transit Gateway for multi-VPC connectivity: add the marketplace-tgw ARN to a second RAM share targeting all accounts in the Platform OU — each account attaches its VPC to the shared TGW without ownership transfer",
            "Audit sharing: aws ram list-resources --resource-owner SELF lists all resources you are sharing; aws ram list-resources --resource-owner OTHER-ACCOUNTS lists resources shared with you",
        ],
        flow: ["Owner creates RAM Resource Share", "Organizations auto-accepts", "Participant sees shared subnets", "Launches resources in shared VPC", "VPC owner retains control"],
        examTips: [
            "RAM sharing with Organizations does NOT require manual acceptance in target accounts — the organization admin enables sharing and it is automatically available; individual account invitations DO require acceptance",
            "Shared subnets: the participant account launches resources into the subnet but does NOT control the VPC, route tables, or NACLs; the VPC owner controls network-level config",
            "Resources that can be shared via RAM include: VPC subnets, Transit Gateways, Route 53 Resolver rules, Aurora DB clusters, Capacity Reservations, License Manager configurations, and more",
            "RAM does NOT copy or transfer the resource — the original resource stays in the owner account; participants use it in-place; there is no data replication or duplication",
            "You cannot share a resource with an account in a different Organisation — RAM cross-organisation sharing requires individual account-level invitations (not OU-level), and each invitation must be accepted",
        ],
        roleJson: [
            {
                label: "AWS CLI — create RAM resource share for VPC subnets",
                note: "💡 Share at the OU level (not individual account IDs) so new accounts joining the OU automatically get access to shared resources without any manual RAM updates.",
                code: `# Enable RAM sharing with AWS Organizations (run once from management account)
aws ram enable-sharing-with-aws-organization

# Create resource share for private subnets
aws ram create-resource-share \\
  --name marketplace-subnet-share \\
  --resource-arns \\
    arn:aws:ec2:ap-southeast-1:234567890123:subnet/subnet-private-1a \\
    arn:aws:ec2:ap-southeast-1:234567890123:subnet/subnet-private-1b \\
  --principals arn:aws:organizations::123456789012:ou/o-xxxx/ou-SharedServices \\
  --allow-external-principals false \\
  --region ap-southeast-1

# Verify from analytics account — shared subnets appear
aws ec2 describe-subnets \\
  --filters Name=owner-id,Values=234567890123 \\
  --region ap-southeast-1`,
            },
        ],
    },

    {
        id: 6,
        analogy: "Think of it like a professional kitchen where a celebrity chef (Elastic Beanstalk) handles all the kitchen logistics — sourcing ingredients, firing the ovens, plating the dishes — so the restaurant owner can focus entirely on creating recipes. The owner can still walk into the kitchen and adjust any setting they want, but they don't have to manage the kitchen day-to-day.",
        icon: "🌱",
        color: ACCENT.green,
        tag: "SCENARIO 6",
        title: "AWS Elastic Beanstalk",
        subtitle: "Managed platform deployment for the marketplace Spring Boot API",
        useCase: {
            title: "AMI PVT LTD Marketplace — Elastic Beanstalk environment for rapid Spring Boot API deployment in the dev/test account",
            story: "AMI PVT LTD's marketplace-dev account uses Elastic Beanstalk (marketplace-api-beanstalk, Java 17 platform, ap-southeast-1) to deploy and manage the Spring Boot API for developers and QA. Instead of manually managing CloudFormation stacks, ASGs, ALBs, and deployment pipelines in dev, Elastic Beanstalk provisions and manages the entire application stack — EC2 instances, ALB, ASG, security groups, and CloudWatch monitoring — from a single eb deploy command. The environment uses Rolling with additional batch deployment policy so at least half the fleet stays live during deployments. Environment variables (DB endpoint, Redis endpoint, feature flags) are set in the Beanstalk environment configuration and injected into the Spring Boot JVM at startup.",
            diagram: [
                { actor: "Developer — runs eb deploy (JAR upload to S3)", icon: "👷" },
                { arrow: "Beanstalk orchestrates deployment" },
                { actor: "Elastic Beanstalk — marketplace-api-beanstalk (Java 17, ap-southeast-1)", icon: "🌱" },
                { arrow: "provisions and manages" },
                { actor: "ALB → ASG (EC2 t3.medium) → Spring Boot JAR → RDS (dev) → ElastiCache (dev)", icon: "🏢" },
                { arrow: "deployment policy: Rolling with additional batch" },
                { actor: "Maintains 50% capacity during deployments (zero downtime)", icon: "✅" },
            ],
        },
        buildSystem: [
            "Install the EB CLI and initialise the project: eb init marketplace-api --platform java-17 --region ap-southeast-1; commit the Procfile (web: java -jar target/marketplace-api.jar) to source control",
            "Create the dev environment: eb create marketplace-api-dev --tier webserver --elb-type application --instance-type t3.medium --min-instances 1 --max-instances 3",
            "Configure environment variables: eb setenv DB_URL=jdbc:postgresql://dev-db-endpoint:5432/marketplace REDIS_HOST=dev-redis-endpoint STRIPE_KEY=test_key — Beanstalk injects these as JVM system properties",
            "Set deployment policy to Rolling with additional batch: update .ebextensions/deployment.config with DeploymentPolicy=RollingWithAdditionalBatch, BatchSizeType=Percentage, BatchSize=50",
            "Configure health reporting to Enhanced mode — Beanstalk publishes per-instance and application-level health to CloudWatch; set HealthCheckSuccessThreshold to 'Ok' to mark instances healthy only on HTTP 200",
            "Use .ebextensions configuration files to customise the EC2 instances at launch: install custom packages, run scripts, add files — these run before the application starts and are version-controlled with the app code",
            "Enable Managed Platform Updates: set UpdateLevel=minor, InstanceRefreshEnabled=true — Beanstalk automatically applies minor platform patches during the weekly maintenance window without requiring manual redeployments",
            "For blue/green deployment in dev: create a second environment marketplace-api-dev-green, deploy new version, run CNAME swap (eb swap) to route traffic — swap is instant and reversible if issues are found",
        ],
        flow: ["eb deploy (JAR to S3)", "Beanstalk provisions resources", "Rolling deployment (50% batch)", "Health check passes", "Old instances terminated"],
        examTips: [
            "Elastic Beanstalk is a PaaS that provisions EC2, ALB, ASG, and CloudWatch — you retain full access to all underlying resources; it is NOT a serverless or fully managed service (you still pay for EC2)",
            "Deployment policies: All at once (fastest, downtime), Rolling (no extra cost, reduced capacity), Rolling with additional batch (no reduced capacity, costs extra), Immutable (safest, doubles capacity temporarily)",
            "Immutable deployments launch a fresh ASG with new instances, run health checks, then swap ASGs — safest for production; if the new version fails health checks, the old ASG is not touched",
            "Blue/Green in Beanstalk = two separate environments + CNAME swap — this is NOT built into Beanstalk as a native feature; it is a manual process of creating a second env and swapping the domain",
            "Elastic Beanstalk is NOT recommended for production workloads that need fine-grained control (custom Auto Scaling policies, precise networking, CloudFormation drift detection) — use CloudFormation or CDK for production",
        ],
        roleJson: [
            {
                label: "AWS EB CLI — create environment and configure rolling deployment",
                note: "💡 Prefer Immutable or Rolling with additional batch for production deployments — All at once causes downtime and Rolling reduces capacity, making it risky during high-traffic periods.",
                code: `# Initialise Elastic Beanstalk project
eb init marketplace-api \\
  --platform java-17 \\
  --region ap-southeast-1

# Create the dev environment
eb create marketplace-api-dev \\
  --elb-type application \\
  --instance-type t3.medium \\
  --min-instances 1 \\
  --max-instances 3

# Set environment variables
eb setenv \\
  DB_URL=jdbc:postgresql://dev-db-endpoint:5432/marketplace \\
  REDIS_HOST=dev-redis-endpoint \\
  ENV=dev

# Deploy a new application version
eb deploy marketplace-api-dev

# Blue/Green: swap CNAMEs between two environments
eb swap marketplace-api-dev --destination-name marketplace-api-dev-green

# Monitor environment health
eb health marketplace-api-dev --refresh`,
            },
        ],
    },
];

export default scenarios;
