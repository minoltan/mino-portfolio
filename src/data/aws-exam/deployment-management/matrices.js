import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Deployment & Management matrices
 * CloudFormation, Elastic Beanstalk, Config, RAM, Systems Manager, OpsWorks
 * Reference: https://digitalcloud.training/aws-cloudformation/
 *            https://digitalcloud.training/aws-elastic-beanstalk/
 *            https://digitalcloud.training/aws-config/
 *            https://digitalcloud.training/aws-resource-access-manager/
 *            https://digitalcloud.training/aws-systems-manager/
 *            https://digitalcloud.training/aws-opsworks/
 */

const matrices = [
    {
        id: "iac-deployment-comparison",
        title: "IaC & Deployment Tools Comparison",
        subtitle: "CloudFormation vs Elastic Beanstalk vs CDK vs OpsWorks — when to use each for the marketplace",
        color: ACCENT.primary,
        columns: ["Tool", "Type", "Abstraction level", "Best for", "Marketplace use case", "Watch out for"],
        rows: [
            ["AWS CloudFormation", "IaC (declarative JSON/YAML)", "Low — full resource control", "Complete infrastructure management with fine-grained control and drift detection", "marketplace-core-stack: VPC, ASG, RDS, ElastiCache, SQS, IAM in one stack", "Verbose templates; 500 resource limit per stack (use nested stacks)"],
            ["AWS CDK (TypeScript)", "IaC (imperative, compiles to CFN)", "Medium — constructs abstract common patterns", "Infrastructure defined in code with type safety; generates CloudFormation under the hood", "Post-all-topics final CDK deployment of the full marketplace system", "Requires Node.js/Python knowledge; CDK synth must run before deploy"],
            ["AWS Elastic Beanstalk", "PaaS (application platform)", "High — manages EC2/ALB/ASG for you", "Rapid application deployment without manual infrastructure management", "marketplace-api-beanstalk for dev/test Spring Boot API deployments", "Less control than CloudFormation; not ideal for complex production topologies"],
            ["AWS OpsWorks (Chef)", "Configuration management (Chef layers)", "Medium — Chef recipes manage instance config", "Complex multi-tier apps needing custom Chef cookbooks for instance configuration", "Legacy marketplace EC2 tiers requiring OS-level Chef-managed configuration", "Being deprecated direction; Stacks/Layers model is less flexible than CDK/CloudFormation"],
            ["AWS OpsWorks (Puppet)", "Configuration management (Puppet manifests)", "Medium — Puppet manifests manage instance config", "Enterprise environments with existing Puppet infrastructure", "Not used at AMI PVT LTD; mentioned for completeness", "Puppet Master on OpsWorks requires a dedicated master server"],
            ["AWS Systems Manager (State Manager)", "Desired-state configuration", "Medium — SSM documents define desired state", "Applying consistent configuration (e.g. install CW Agent) across a fleet of EC2 instances", "Ensure CloudWatch Agent is installed and running on all marketplace-api-asg instances", "Not a full IaC tool — complements CloudFormation, does not replace it"],
        ],
    },
    {
        id: "cloudformation-key-concepts",
        title: "CloudFormation Key Concepts & Limits",
        subtitle: "Critical CloudFormation facts for the SAA-C03 exam",
        color: ACCENT.teal,
        columns: ["Concept", "Detail", "Exam note"],
        rows: [
            ["Max resources per stack", "500 resources", "Use nested stacks (AWS::CloudFormation::Stack) to split large infrastructures into modules"],
            ["Template size limit", "51,200 bytes direct upload; no limit via S3 URL", "Always upload large templates to S3 and reference via --template-url"],
            ["Change Set", "Preview of changes before applying an update", "Always use Change Sets in production — shows Add/Modify/Remove per resource, including Replacement flag"],
            ["Stack Policy", "JSON policy controlling which UPDATE actions are allowed", "Protects critical resources (RDS, DynamoDB) from accidental Replacement or Delete during updates"],
            ["DeletionPolicy", "Retain | Delete | Snapshot per resource", "Set DeletionPolicy=Retain on RDS and S3 to prevent data loss when the stack is deleted"],
            ["UpdateReplacePolicy", "Retain | Delete | Snapshot on resource replacement", "Similar to DeletionPolicy but triggered when a resource must be REPLACED (not just deleted with the stack)"],
            ["Drift Detection", "Identifies manual changes outside of CloudFormation", "Drift does NOT auto-fix — it only reports; you must reconcile the template or the console manually"],
            ["StackSets", "Deploy stacks across multiple accounts and/or regions", "SERVICE_MANAGED = Organizations integration (no manual role setup); SELF_MANAGED = manual role creation"],
            ["Nested Stacks", "A stack that creates another stack as a resource", "Nested stacks share Outputs via Fn::GetAtt; Cross-Stack References use Outputs + Fn::ImportValue"],
            ["Rollback triggers", "CloudWatch Alarms that trigger rollback during stack operations", "If the alarm fires during a CREATE or UPDATE, CloudFormation rolls back the entire operation"],
            ["cfn-init / cfn-signal", "Helper scripts on EC2 for bootstrapping and signalling completion", "cfn-signal is required for CloudFormation to know an EC2 UserData bootstrap finished successfully (CreationPolicy)"],
        ],
    },
    {
        id: "ssm-capabilities-guide",
        title: "AWS Systems Manager Capabilities Guide",
        subtitle: "SSM is not just SSH replacement — it has 15+ capabilities; know the key ones for the exam",
        color: ACCENT.amber,
        columns: ["Capability", "What it does", "Marketplace use", "Key exam point"],
        rows: [
            ["Session Manager", "Browser/CLI shell into EC2 without SSH, bastion, or open ports", "Engineers access marketplace-api-asg instances; sessions logged to CloudWatch Logs", "No port 22 needed; requires SSM Agent + IAM role with ssm:StartSession; works in private subnets via Interface Endpoint"],
            ["Parameter Store", "Secure hierarchical key-value config and secret storage", "Spring Boot reads /marketplace/prod/* (SecureString + KMS) at startup; no hardcoded secrets", "Standard tier is free; Advanced tier supports >4 KB params, parameter policies, and higher throughput"],
            ["Secrets Manager", "Secret storage with automatic rotation", "marketplace-orders-db RDS password rotation every 30 days via Lambda", "Secrets Manager ≠ Parameter Store: SM has native rotation + costs $0.40/secret/month; SSM SecureString is cheaper for config"],
            ["Run Command", "Execute scripts on multiple instances without SSH", "Run custom scripts on all marketplace-api-asg instances simultaneously; output to S3/CloudWatch", "Foundation for Patch Manager and State Manager; runs documents (SSM Documents) on targeted instances"],
            ["Patch Manager", "Automated OS patching with baseline rules and maintenance windows", "Sunday 02:00–04:00 UTC patches all Environment=prod instances with AWS-RunPatchBaseline", "Patch Groups link EC2 instances (via tag) to Patch Baselines; default AWS baseline approves patches after 7 days"],
            ["Maintenance Windows", "Scheduled time windows for disruptive operations", "Sunday patch window for EC2 fleet; Tuesday window for database maintenance scripts", "Tasks registered to a window only run during the window; cutoff prevents new tasks starting near the window end"],
            ["Inventory", "Collect software, OS, network config, and patch data from instances", "Aggregate inventory of all marketplace EC2 instances into S3 marketplace-analytics-raw for Athena", "Inventory data synced to S3 via Resource Data Sync; query with Athena for fleet-wide compliance reports"],
            ["State Manager", "Ensure instances maintain a desired configuration state over time", "Ensure CloudWatch Agent is always installed and running on all marketplace-api-asg instances", "Periodically checks and re-applies the association document if configuration drifts from the desired state"],
            ["Automation", "Run multi-step automated runbooks (SSM Documents)", "Auto-remediate AWS Config NON_COMPLIANT findings (e.g. AWS-EnableS3BucketEncryption)", "Automation documents can call AWS API actions, run Lambda, or execute scripts; used heavily with Config auto-remediation"],
        ],
    },
];

export default matrices;
