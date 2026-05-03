import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Amazon ECS and EKS scenarios
 *
 * Source study topic: Amazon ECS and EKS — Docker Containers (SAA-C03),
 * grounded in the AMI PVT LTD multi-tenant SaaS marketplace running in ap-southeast-1.
 * marketplace-prod account: 234567890123
 * Story arc: AMI PVT LTD containerises the Spring Boot API from EC2 to ECS Fargate.
 */

const scenarios = [
    {
        id: 1,
        analogy: "Think of it like a supermarket's private label product warehouse — before items hit store shelves, they're inspected for quality (image scanning), labelled with a version number, and stored in a secured stockroom (private ECR) that only authorised staff can access.",
        icon: "🐳",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "ECR & Docker Image Build",
        subtitle: "Private ECR repository and CI/CD image push for the marketplace Spring Boot API",
        useCase: {
            title: "AMI PVT LTD Marketplace — ECR private repo, image tagging, and lifecycle policy for marketplace/api",
            story: "AMI PVT LTD creates a private ECR repository named marketplace/api in account 234567890123, region ap-southeast-1. The CI/CD pipeline (CodePipeline + CodeBuild) builds the Spring Boot Docker image from the marketplace-api source, tags it with the full ECR URI 234567890123.dkr.ecr.ap-southeast-1.amazonaws.com/marketplace/api:v1.2.3, and pushes it to ECR. An ECR lifecycle policy automatically expires untagged images older than 14 days to prevent repository bloat. The Marketplace-API-EC2-Role (also used as the ECS task execution role) is granted ecr:GetAuthorizationToken and ecr:BatchGetImage so ECS Fargate tasks can pull the image at launch. ECR image scanning (enhanced scanning via Amazon Inspector) runs on every push and fails the pipeline if critical vulnerabilities are found.",
            diagram: [
                { actor: "CodeBuild — docker build marketplace/api:v1.2.3", icon: "🔨" },
                { arrow: "aws ecr get-login-password | docker login + docker push" },
                { actor: "ECR repo: marketplace/api (account 234567890123, ap-southeast-1)", icon: "📦" },
                { arrow: "ecr:GetAuthorizationToken + ecr:BatchGetImage" },
                { actor: "ECS Fargate task (Marketplace-API-EC2-Role as execution role)", icon: "🐳" },
            ],
        },
        buildSystem: [
            "Create the ECR private repository: aws ecr create-repository --repository-name marketplace/api --image-scanning-configuration scanOnPush=true",
            "Authenticate CodeBuild to ECR: aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 234567890123.dkr.ecr.ap-southeast-1.amazonaws.com",
            "Build the Spring Boot Docker image: docker build -t marketplace/api:v1.2.3 -f Dockerfile.marketplace .",
            "Tag with the full ECR URI: docker tag marketplace/api:v1.2.3 234567890123.dkr.ecr.ap-southeast-1.amazonaws.com/marketplace/api:v1.2.3",
            "Push the image: docker push 234567890123.dkr.ecr.ap-southeast-1.amazonaws.com/marketplace/api:v1.2.3",
            "Apply ECR lifecycle policy: expire untagged images older than 14 days to prevent unlimited image accumulation",
            "Attach an IAM policy to Marketplace-API-EC2-Role granting ecr:GetAuthorizationToken, ecr:BatchCheckLayerAvailability, ecr:GetDownloadUrlForLayer, ecr:BatchGetImage",
            "Enable enhanced image scanning via Amazon Inspector to block pipeline on CRITICAL findings before images reach ECS",
        ],
        flow: ["CodeBuild (docker build)", "ECR Authentication (get-login-password)", "docker push to ECR marketplace/api", "Lifecycle Policy (prune untagged)", "ECS Pull via Execution Role"],
        examTips: [
            "ECR GetAuthorizationToken must be allowed at the account level (not repository level) — it cannot be scoped to a specific repository ARN",
            "ECR lifecycle policies do not have an immediate effect — they run periodically (at least once every 24 hours)",
            "ECR private repositories support cross-account access via repository policies; public ECR galleries do not require authentication for pulls",
            "The ECS task execution role (not the task role) is responsible for pulling ECR images and writing CloudWatch logs — keep these roles separate",
        ],
        roleJson: [
            {
                label: "ECR lifecycle policy — expire untagged images older than 14 days",
                note: "💡 Use countType=sinceImagePushed with days=14 for untagged images; add a second rule to keep only the last 10 tagged releases.",
                code: `# Create ECR repository with scan on push
aws ecr create-repository \\
  --repository-name marketplace/api \\
  --image-scanning-configuration scanOnPush=true \\
  --region ap-southeast-1

# Apply lifecycle policy to marketplace/api repository
aws ecr put-lifecycle-policy \\
  --repository-name marketplace/api \\
  --region ap-southeast-1 \\
  --lifecycle-policy-text '{
    "rules": [
      {
        "rulePriority": 1,
        "description": "Expire untagged images older than 14 days",
        "selection": {
          "tagStatus": "untagged",
          "countType": "sinceImagePushed",
          "countUnit": "days",
          "countNumber": 14
        },
        "action": { "type": "expire" }
      },
      {
        "rulePriority": 2,
        "description": "Keep only the last 10 tagged release images",
        "selection": {
          "tagStatus": "tagged",
          "tagPrefixList": ["v"],
          "countType": "imageCountMoreThan",
          "countNumber": 10
        },
        "action": { "type": "expire" }
      }
    ]
  }'

# IAM policy for Marketplace-API-EC2-Role to pull from ECR
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "arn:aws:ecr:ap-southeast-1:234567890123:repository/marketplace/api"
    }
  ]
}`,
            },
        ],
    },

    {
        id: 2,
        analogy: "Think of it like a job description posted by HR — it specifies exactly what the role requires (CPU, memory), what tools are needed (the Docker image), what confidential access keys to bring (SSM secrets), and which department the person reports to (task role vs execution role), before any actual employee starts work.",
        icon: "📋",
        color: ACCENT.teal,
        tag: "SCENARIO 2",
        title: "ECS Task Definition",
        subtitle: "marketplace-api-task: Fargate container spec with SSM secrets and CloudWatch logging",
        useCase: {
            title: "AMI PVT LTD Marketplace — defining the Spring Boot container workload as an ECS task definition",
            story: "The ECS task definition marketplace-api-task describes the complete runtime specification for the Spring Boot API container. It references the ECR image 234567890123.dkr.ecr.ap-southeast-1.amazonaws.com/marketplace/api:v1.2.3, allocates 1 vCPU and 2 GB memory (valid Fargate combination), maps container port 8080, and reads configuration from SSM Parameter Store (database URL, API keys) using the secrets array — never hardcoded environment variables. All container logs are shipped to the CloudWatch log group /ecs/marketplace-api via the awslogs driver. The task role is Marketplace-API-EC2-Role, granting the container DynamoDB, S3, and SQS access. The execution role is Marketplace-API-ECS-ExecutionRole, used only by the ECS control plane to pull the ECR image and write logs.",
            diagram: [
                { actor: "marketplace-api-task (ECS Task Definition rev 5)", icon: "📋" },
                { arrow: "image pull from ECR using execution role" },
                { actor: "ECR: marketplace/api:v1.2.3", icon: "📦" },
                { arrow: "secrets resolved at startup from SSM Parameter Store" },
                { actor: "SSM Parameter Store: /marketplace/prod/db-url, /marketplace/prod/api-key", icon: "🔑" },
                { arrow: "logs streamed via awslogs driver" },
                { actor: "CloudWatch Log Group: /ecs/marketplace-api", icon: "📊" },
            ],
        },
        buildSystem: [
            "Create SSM parameters: aws ssm put-parameter --name /marketplace/prod/db-url --type SecureString --value <rds-endpoint>",
            "Create SSM parameters: aws ssm put-parameter --name /marketplace/prod/api-key --type SecureString --value <secret>",
            "Create CloudWatch log group: aws logs create-log-group --log-group-name /ecs/marketplace-api",
            "Register the task definition with aws ecs register-task-definition specifying requiresCompatibilities=[FARGATE], networkMode=awsvpc, cpu=1024, memory=2048",
            "In the container definition, set portMappings to containerPort 8080, and use secrets to reference SSM parameters",
            "Set the logConfiguration to awslogs driver with logGroup=/ecs/marketplace-api and region=ap-southeast-1",
            "Set taskRoleArn to Marketplace-API-EC2-Role for application permissions (DynamoDB, S3, SQS)",
            "Set executionRoleArn to Marketplace-API-ECS-ExecutionRole for ECS system permissions (ECR pull, CloudWatch logs)",
        ],
        flow: ["SSM SecureString Params", "Task Definition (marketplace-api-task)", "Execution Role (ECR Pull + Logs)", "Task Role (DynamoDB/S3/SQS)", "Container Port 8080"],
        examTips: [
            "The task execution role is used by the ECS agent/Fargate to pull images and write logs — it is NOT available to application code inside the container",
            "The task role is the IAM role assumed by application code inside the container via EC2 metadata endpoint — use least privilege per service",
            "For Fargate, networkMode must be awsvpc — each task gets its own ENI and private IP from the VPC subnet",
            "Secrets in ECS task definitions (sourced from SSM Parameter Store or Secrets Manager) are injected as environment variables at task launch — not retrieved by the app at runtime",
            "CPU and memory combinations for Fargate are constrained — not all combinations are valid; valid example: 1 vCPU (1024) with 2 GB, 3 GB, or 4 GB only",
        ],
        roleJson: [
            {
                label: "ECS task definition — marketplace-api-task with SSM secrets and awslogs",
                note: "💡 Use the secrets field (not environment) for sensitive values — ECS resolves them from SSM/Secrets Manager before starting the container.",
                code: `aws ecs register-task-definition \\
  --family marketplace-api-task \\
  --requires-compatibilities FARGATE \\
  --network-mode awsvpc \\
  --cpu 1024 \\
  --memory 2048 \\
  --task-role-arn arn:aws:iam::234567890123:role/Marketplace-API-EC2-Role \\
  --execution-role-arn arn:aws:iam::234567890123:role/Marketplace-API-ECS-ExecutionRole \\
  --container-definitions '[{
    "name": "marketplace-api",
    "image": "234567890123.dkr.ecr.ap-southeast-1.amazonaws.com/marketplace/api:v1.2.3",
    "portMappings": [{"containerPort": 8080, "protocol": "tcp"}],
    "environment": [
      {"name": "SPRING_PROFILES_ACTIVE", "value": "prod"},
      {"name": "AWS_REGION", "value": "ap-southeast-1"}
    ],
    "secrets": [
      {"name": "DB_URL",  "valueFrom": "arn:aws:ssm:ap-southeast-1:234567890123:parameter/marketplace/prod/db-url"},
      {"name": "API_KEY", "valueFrom": "arn:aws:ssm:ap-southeast-1:234567890123:parameter/marketplace/prod/api-key"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/marketplace-api",
        "awslogs-region": "ap-southeast-1",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 60
    },
    "essential": true
  }]'`,
            },
        ],
    },

    {
        id: 3,
        analogy: "Think of it like a restaurant chain that replaced its kitchen staff with a catering company — the menu (your app) stays the same, the dining room (ALB) stays the same, but now the caterers (Fargate) bring their own equipment and you only pay for the meals actually served rather than keeping a full kitchen running 24/7.",
        icon: "🚀",
        color: ACCENT.amber,
        tag: "SCENARIO 3",
        title: "ECS Fargate Service & ALB",
        subtitle: "marketplace-api-service: 3 Fargate tasks across 2 AZs behind marketplace-alb",
        useCase: {
            title: "AMI PVT LTD Marketplace — ECS Fargate service replacing the marketplace-api-asg EC2 fleet",
            story: "AMI PVT LTD creates the ECS Fargate service marketplace-api-service in cluster marketplace-ecs-cluster with a desired count of 3 tasks split across ap-southeast-1a and ap-southeast-1b private subnets. The service attaches to the existing marketplace-alb target group (port 8080), reusing the same ALB that previously served the EC2 ASG. Application Auto Scaling replaces the EC2 ASG scaling policies: a scaling policy triggers on ECSServiceAverageCPUUtilization > 70% (matching the former EC2 policy) and a second policy fires on ALBRequestCountPerTarget > 1000 per task (matching the former ASG target tracking policy). Fargate launch type eliminates the need to manage EC2 host infrastructure — AMI PVT LTD pays per vCPU-second and GB-second consumed by running tasks.",
            diagram: [
                { actor: "marketplace-alb (HTTPS listener, existing ALB reused)", icon: "🔀" },
                { arrow: "forwards /api/* to marketplace-api-tg (port 8080)" },
                { actor: "marketplace-api-service (ECS Fargate, desired=3, cluster=marketplace-ecs-cluster)", icon: "🚀" },
                { arrow: "3 tasks across ap-southeast-1a and ap-southeast-1b private subnets" },
                { actor: "Fargate Task 1 / Task 2 / Task 3 (each with own ENI)", icon: "🐳" },
            ],
        },
        buildSystem: [
            "Create ECS cluster: aws ecs create-cluster --cluster-name marketplace-ecs-cluster --capacity-providers FARGATE FARGATE_SPOT",
            "Create the ECS service: aws ecs create-service --cluster marketplace-ecs-cluster --service-name marketplace-api-service --task-definition marketplace-api-task:5 --desired-count 3 --launch-type FARGATE",
            "Set network configuration: awsvpcConfiguration with subnets [subnet-private1a, subnet-private1b], security groups [marketplace-api-sg], assignPublicIp DISABLED",
            "Attach to the ALB: --load-balancers targetGroupArn=<marketplace-api-tg-arn>,containerName=marketplace-api,containerPort=8080",
            "Register Application Auto Scaling target: aws application-autoscaling register-scalable-target --service-namespace ecs --resource-id service/marketplace-ecs-cluster/marketplace-api-service --scalable-dimension ecs:service:DesiredCount --min-capacity 2 --max-capacity 10",
            "Add CPU scaling policy: target tracking on ECSServiceAverageCPUUtilization at 70%, scale-out cooldown 60s, scale-in cooldown 300s",
            "Add ALB request count policy: target tracking on ALBRequestCountPerTarget at 1000, referencing marketplace-alb and marketplace-api-tg",
            "Monitor service events and CloudWatch metrics: RunningTaskCount, CPUUtilization, MemoryUtilization per service",
        ],
        flow: ["marketplace-ecs-cluster", "marketplace-api-service (Fargate)", "3 Tasks (private subnets)", "marketplace-alb Target Group", "Application Auto Scaling"],
        examTips: [
            "ECS Fargate launch type removes EC2 host management — tasks are the billing unit (per vCPU-second and GB-second); EC2 launch type gives more control over host configuration",
            "Each Fargate task gets its own ENI (awsvpc network mode) — security groups are applied at the task level, not the host level",
            "Application Auto Scaling for ECS services is independent of EC2 ASG — it adjusts the service's desired task count, not the number of EC2 hosts",
            "ECS service deployment minimum healthy percent and maximum percent control how many tasks can be stopped/started during an update",
        ],
        roleJson: [
            {
                label: "AWS CLI — create marketplace-api-service with Fargate and ALB integration",
                note: "💡 Set --health-check-grace-period-seconds to at least 60 to allow Spring Boot time to start before ALB health checks begin.",
                code: `# Create ECS cluster with Fargate and Fargate Spot capacity providers
aws ecs create-cluster \\
  --cluster-name marketplace-ecs-cluster \\
  --capacity-providers FARGATE FARGATE_SPOT \\
  --tags key=Environment,value=prod key=Service,value=marketplace-api

# Create the ECS Fargate service
aws ecs create-service \\
  --cluster marketplace-ecs-cluster \\
  --service-name marketplace-api-service \\
  --task-definition marketplace-api-task:5 \\
  --desired-count 3 \\
  --launch-type FARGATE \\
  --network-configuration 'awsvpcConfiguration={
    subnets=[subnet-private1a,subnet-private1b],
    securityGroups=[sg-0marketplace-api],
    assignPublicIp=DISABLED
  }' \\
  --load-balancers 'targetGroupArn=arn:aws:elasticloadbalancing:ap-southeast-1:234567890123:targetgroup/marketplace-api-tg/abc123,containerName=marketplace-api,containerPort=8080' \\
  --health-check-grace-period-seconds 60 \\
  --deployment-configuration 'minimumHealthyPercent=50,maximumPercent=200'

# Register Application Auto Scaling target
aws application-autoscaling register-scalable-target \\
  --service-namespace ecs \\
  --resource-id service/marketplace-ecs-cluster/marketplace-api-service \\
  --scalable-dimension ecs:service:DesiredCount \\
  --min-capacity 2 \\
  --max-capacity 10

# Target tracking policy — CPU at 70%
aws application-autoscaling put-scaling-policy \\
  --policy-name marketplace-ecs-cpu-scaling \\
  --service-namespace ecs \\
  --resource-id service/marketplace-ecs-cluster/marketplace-api-service \\
  --scalable-dimension ecs:service:DesiredCount \\
  --policy-type TargetTrackingScaling \\
  --target-tracking-scaling-policy-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "TargetValue": 70,
    "ScaleOutCooldown": 60,
    "ScaleInCooldown": 300
  }'`,
            },
        ],
    },

    {
        id: 4,
        analogy: "Think of it like repainting a hotel one floor at a time — guests on freshly painted floors (new version) coexist with guests on old floors until every floor is done, or for riskier changes, you open a brand-new identical hotel next door (blue/green), quietly move guests across, and if anything goes wrong you move them straight back.",
        icon: "🔄",
        color: ACCENT.orange,
        tag: "SCENARIO 4",
        title: "ECS Lifecycle & Rolling Updates",
        subtitle: "Rolling update, blue/green, and canary deployment strategies for marketplace-api-service",
        useCase: {
            title: "AMI PVT LTD Marketplace — zero-downtime Spring Boot image update with rolling and blue/green strategies",
            story: "When the CI/CD pipeline pushes a new Docker image 234567890123.dkr.ecr.ap-southeast-1.amazonaws.com/marketplace/api:v1.3.0 to ECR, the ECS service marketplace-api-service must update its running tasks with no customer-facing downtime. In a rolling update (ECS native), new tasks start with the v1.3.0 image, the ALB health checks on port 8080 confirm they are healthy (minimumHealthyPercent=50, maximumPercent=200 allows 3→6 tasks during rollout), and then old v1.2.3 tasks are drained and stopped. For higher-risk releases, AMI PVT LTD uses AWS CodeDeploy blue/green: the existing marketplace-api-service tasks are the blue environment; CodeDeploy creates a green replacement task set, runs validation tests, then shifts 100% of ALB traffic to green instantly (or canary: 10% for 5 minutes, then 100%). Rollback re-shifts traffic to blue in seconds.",
            diagram: [
                { actor: "New ECR Image (marketplace/api:v1.3.0)", icon: "📦" },
                { arrow: "ECS rolling update: start new tasks (v1.3.0), wait for health checks" },
                { actor: "marketplace-api-service (mixed v1.2.3 + v1.3.0 during rollout)", icon: "🔄" },
                { arrow: "ALB health check passes on port 8080 for v1.3.0 tasks" },
                { actor: "marketplace-alb drains v1.2.3 tasks, switches all traffic to v1.3.0", icon: "🔀" },
            ],
        },
        buildSystem: [
            "For a rolling update, update the service with the new task definition revision: aws ecs update-service --cluster marketplace-ecs-cluster --service marketplace-api-service --task-definition marketplace-api-task:6",
            "Set deployment configuration: minimumHealthyPercent=50, maximumPercent=200 to allow 3 new tasks to start before old tasks stop",
            "Monitor deployment progress: aws ecs describe-services --services marketplace-api-service; watch for runningCount=3 on new revision",
            "For CodeDeploy blue/green: create a CodeDeploy application and deployment group targeting marketplace-api-service and marketplace-alb",
            "Configure the deployment group with deployment style BLUE_GREEN and BlueGreenDeploymentConfiguration including termination wait time 5 minutes",
            "Create a CodeDeploy deployment referencing the new task definition ARN and container name/port to update",
            "For canary: set traffic routing type LINEAR with interval=5 minutes, percentage=10 for a 10% canary before full cutover",
            "Test rollback: if CloudWatch alarms detect elevated 5xx errors during deployment, CodeDeploy automatically rolls back by re-routing traffic to the blue task set",
        ],
        flow: ["New Task Definition (v1.3.0)", "Rolling Update / CodeDeploy Blue/Green", "New Tasks Start (green)", "ALB Health Check", "Old Tasks Drained (blue)"],
        examTips: [
            "ECS rolling update is the simplest deployment — controlled by minimumHealthyPercent and maximumPercent on the service deployment configuration",
            "CodeDeploy blue/green for ECS creates a new replacement task set (green) alongside the original (blue); ALB traffic is shifted at once or via linear/canary steps",
            "Blue/green rollback shifts ALB traffic back to the original (blue) task set instantly — no re-deployment needed",
            "Canary deployment sends a small percentage (e.g., 10%) of traffic to the new version first, then shifts the remainder after a validation interval",
            "ECS service deployments do NOT use ASG instance refresh — container replacement is managed by the ECS scheduler, not EC2 Auto Scaling",
        ],
        roleJson: [
            {
                label: "AWS CLI — rolling update and CodeDeploy AppSpec for marketplace-api-service blue/green",
                note: "💡 The CodeDeploy AppSpec TaskDefinition ARN must use the full ARN including revision number — :latest is not supported.",
                code: `# Rolling update — force new deployment with latest task definition
aws ecs update-service \\
  --cluster marketplace-ecs-cluster \\
  --service marketplace-api-service \\
  --task-definition marketplace-api-task:6 \\
  --deployment-configuration 'minimumHealthyPercent=50,maximumPercent=200' \\
  --force-new-deployment

# CodeDeploy AppSpec for ECS blue/green deployment (appspec.yaml)
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: "arn:aws:ecs:ap-southeast-1:234567890123:task-definition/marketplace-api-task:6"
        LoadBalancerInfo:
          ContainerName: "marketplace-api"
          ContainerPort: 8080
        PlatformVersion: "LATEST"

# Create CodeDeploy blue/green deployment
aws deploy create-deployment \\
  --application-name marketplace-api-codedeploy-app \\
  --deployment-group-name marketplace-api-bg-dg \\
  --revision 'revisionType=AppSpecContent,appSpecContent={content="{version: 0.0, Resources: [{TargetService: {Type: AWS::ECS::Service, Properties: {TaskDefinition: arn:aws:ecs:ap-southeast-1:234567890123:task-definition/marketplace-api-task:6}}}]}"}'`,
            },
        ],
    },

    {
        id: 5,
        analogy: "Think of it like a large office building with separate floors for different companies — each company (namespace) has its own entrance, security badge system (IRSA), and rules, so the leaderboard team on floor 3 can't accidentally walk into the payroll room on floor 5 even though they share the same building.",
        icon: "☸️",
        color: ACCENT.purple,
        tag: "SCENARIO 5",
        title: "EKS for Multi-Tool Orchestration",
        subtitle: "marketplace-tools-cluster: Kubernetes namespaces, IRSA, and managed node groups",
        useCase: {
            title: "AMI PVT LTD Marketplace — EKS cluster for Leaderboard, Skill Matrix, and Spin the Wheel tools",
            story: "AMI PVT LTD's marketplace tooling team runs three internal tools — Leaderboard, Skill Matrix, and Spin the Wheel — as Kubernetes workloads in EKS cluster marketplace-tools-cluster (ap-southeast-1). Each tool runs in its own Kubernetes namespace (leaderboard, skill-matrix, spin-the-wheel), providing resource isolation and independent RBAC. The EKS managed node group marketplace-tools-ng uses a mix of On-Demand and Spot instances (m5.large) to balance availability and cost. IAM Roles for Service Accounts (IRSA) gives each tool's pod its own IAM identity — the Leaderboard pod assumes LeaderboardPodRole (DynamoDB read), the Skill Matrix pod assumes SkillMatrixPodRole (S3 read/write), and Spin the Wheel assumes SpinWheelPodRole (SQS publish). No tool shares a single IAM role or node-level instance profile.",
            diagram: [
                { actor: "EKS cluster: marketplace-tools-cluster (ap-southeast-1)", icon: "☸️" },
                { arrow: "namespace: leaderboard → IRSA: LeaderboardPodRole (DynamoDB)" },
                { actor: "Leaderboard Pod (Kubernetes namespace: leaderboard)", icon: "🏆" },
                { arrow: "namespace: skill-matrix → IRSA: SkillMatrixPodRole (S3)" },
                { actor: "Skill Matrix Pod (Kubernetes namespace: skill-matrix)", icon: "📊" },
                { arrow: "namespace: spin-the-wheel → IRSA: SpinWheelPodRole (SQS)" },
                { actor: "Spin the Wheel Pod (Kubernetes namespace: spin-the-wheel)", icon: "🎡" },
            ],
        },
        buildSystem: [
            "Create the EKS cluster: eksctl create cluster --name marketplace-tools-cluster --region ap-southeast-1 --version 1.29",
            "Create a managed node group: eksctl create nodegroup --cluster marketplace-tools-cluster --name marketplace-tools-ng --instance-types m5.large --desired-capacity 3 --nodes-min 2 --nodes-max 8 --spot",
            "Create Kubernetes namespaces: kubectl create namespace leaderboard; kubectl create namespace skill-matrix; kubectl create namespace spin-the-wheel",
            "Enable IRSA on the cluster: eksctl utils associate-iam-oidc-provider --cluster marketplace-tools-cluster --approve",
            "Create IAM service account for Leaderboard: eksctl create iamserviceaccount --cluster marketplace-tools-cluster --namespace leaderboard --name leaderboard-sa --attach-policy-arn arn:aws:iam::234567890123:policy/LeaderboardDynamoDBReadPolicy --approve",
            "Create IAM service accounts for Skill Matrix and Spin the Wheel with their respective IAM policies",
            "Deploy tools using Helm charts: helm install leaderboard ./charts/leaderboard --namespace leaderboard -f values-prod.yaml",
            "Configure HorizontalPodAutoscaler for each tool deployment to scale on CPU > 70% or custom metrics from CloudWatch via KEDA",
        ],
        flow: ["EKS Cluster (marketplace-tools-cluster)", "Managed Node Group (On-Demand + Spot)", "Namespaces (leaderboard/skill-matrix/spin-wheel)", "IRSA (per-pod IAM role)", "HPA Autoscaling"],
        examTips: [
            "IRSA (IAM Roles for Service Accounts) annotates a Kubernetes ServiceAccount with an IAM role ARN; the pod assumes the role via OIDC federation — no EC2 instance profile needed",
            "EKS managed node groups handle node lifecycle (patching, replacement) automatically; self-managed node groups give more control but require manual management",
            "Kubernetes namespaces provide logical isolation but not network isolation by default — use NetworkPolicies or security groups for pods (SGP) for network-level isolation",
            "EKS Fargate profiles run pods as serverless Fargate tasks (no node group EC2); use for burstable workloads that do not need persistent local storage",
        ],
        roleJson: [
            {
                label: "eksctl + kubectl — create EKS cluster, IRSA, and Leaderboard namespace service account",
                note: "💡 IRSA requires the cluster's OIDC provider to be associated — eksctl utils associate-iam-oidc-provider must run before creating IAM service accounts.",
                code: `# Create EKS cluster with eksctl
eksctl create cluster \\
  --name marketplace-tools-cluster \\
  --region ap-southeast-1 \\
  --version 1.29 \\
  --without-nodegroup

# Create managed node group with On-Demand + Spot mix
eksctl create nodegroup \\
  --cluster marketplace-tools-cluster \\
  --name marketplace-tools-ng \\
  --instance-types m5.large,m5a.large \\
  --desired-capacity 3 \\
  --nodes-min 2 \\
  --nodes-max 8 \\
  --spot

# Associate OIDC provider (required for IRSA)
eksctl utils associate-iam-oidc-provider \\
  --cluster marketplace-tools-cluster \\
  --approve

# Create Kubernetes namespaces
kubectl create namespace leaderboard
kubectl create namespace skill-matrix
kubectl create namespace spin-the-wheel

# Create IRSA service account for Leaderboard tool
eksctl create iamserviceaccount \\
  --cluster marketplace-tools-cluster \\
  --namespace leaderboard \\
  --name leaderboard-sa \\
  --attach-policy-arn arn:aws:iam::234567890123:policy/LeaderboardDynamoDBReadPolicy \\
  --override-existing-serviceaccounts \\
  --approve

# Deploy Leaderboard tool using Helm
helm install leaderboard ./charts/leaderboard \\
  --namespace leaderboard \\
  --set serviceAccount.name=leaderboard-sa \\
  --set image.repository=234567890123.dkr.ecr.ap-southeast-1.amazonaws.com/marketplace/leaderboard \\
  --set image.tag=v2.1.0`,
            },
        ],
    },

    {
        id: 6,
        analogy: "Think of it like choosing between a managed serviced office (ECS Fargate) and a self-managed office block (EKS) — the serviced office handles cleaning, security, and maintenance so you just show up and work, while the self-managed block gives you full control to knock down walls and add custom facilities but you hire your own maintenance crew.",
        icon: "⚖️",
        color: ACCENT.green,
        tag: "SCENARIO 6",
        title: "ECS vs EKS Decision",
        subtitle: "Architecture decision: Spring Boot API on ECS Fargate vs tools on EKS",
        useCase: {
            title: "AMI PVT LTD Marketplace — when to use ECS vs EKS for platform and tooling workloads",
            story: "AMI PVT LTD's architecture team evaluates two containers paths. ECS Fargate is chosen for the marketplace Spring Boot API (marketplace-api-service) because it integrates natively with AWS services (ALB, IAM task roles, CloudWatch, AppMesh) without Kubernetes operational overhead, and the team's Spring Boot developers do not need Kubernetes expertise. EKS is chosen for the internal tooling cluster (marketplace-tools-cluster) because the multi-tool, multi-namespace model maps directly to Kubernetes primitives (namespaces, RBAC, Helm), the team already uses Helm charts for tool packaging, and they need Kubernetes-specific operators (e.g., KEDA for custom autoscaling). For service mesh, ECS uses AWS App Mesh with Envoy sidecars (fully managed by AWS), while the EKS cluster uses Istio (community Kubernetes service mesh) — Istio provides more flexibility but requires additional operational expertise.",
            diagram: [
                { actor: "marketplace-api-service (Spring Boot)", icon: "🚀" },
                { arrow: "AWS-native integrations (ALB, IAM, CloudWatch, App Mesh)" },
                { actor: "ECS Fargate — lower ops overhead, AWS-native", icon: "🐳" },
                { arrow: "vs" },
                { actor: "marketplace-tools-cluster (Leaderboard/Skill Matrix/Spin Wheel)", icon: "☸️" },
                { arrow: "Helm, RBAC, KEDA operators, Istio service mesh" },
                { actor: "EKS — Kubernetes features required for multi-tool orchestration", icon: "⚙️" },
            ],
        },
        buildSystem: [
            "Evaluate workload requirements: if you need Kubernetes-specific features (RBAC, Helm operators, CRDs, Istio), choose EKS",
            "Choose ECS Fargate for Spring Boot API: native AWS integrations, no control plane management, task-level IAM roles, pay-per-use",
            "Choose EKS for tooling cluster: multi-namespace isolation, Helm chart packaging, KEDA for event-driven autoscaling on SQS queues",
            "For service mesh on ECS: enable AWS App Mesh with Envoy proxies injected as sidecar containers by the ECS service mesh controller",
            "For service mesh on EKS: deploy Istio (or AWS App Mesh with Kubernetes CRD controllers) for fine-grained traffic management",
            "Cost comparison: ECS Fargate charges per task vCPU-second and GB-second; EKS charges $0.10/hr per cluster + EC2 node costs; use Fargate profiles on EKS for serverless nodes",
            "Operational complexity: ECS control plane is fully managed with no version upgrade responsibility; EKS control plane upgrades are customer-initiated (1.29 → 1.30)",
            "Migration path: marketplace-api-service can move from ECS to EKS later by packaging the same Docker image as a Kubernetes Deployment using Helm",
        ],
        flow: ["Workload Requirements Analysis", "ECS Fargate (AWS-native, Spring Boot API)", "EKS (Kubernetes features, tooling cluster)", "App Mesh (ECS) vs Istio (EKS)", "Cost and Ops Complexity"],
        examTips: [
            "ECS is the AWS-native container orchestrator with deep integrations (ALB, IAM, CloudWatch) and no Kubernetes knowledge required — best for teams moving from EC2",
            "EKS is fully managed Kubernetes — choose it when you need Kubernetes-specific features: Helm, CRDs, operators, RBAC, or Istio/Linkerd service mesh",
            "App Mesh works with both ECS and EKS and provides consistent service mesh observability across both platforms using Envoy proxies",
            "EKS Fargate profiles remove the need to manage EC2 nodes for EKS; each pod runs as an isolated Fargate task with its own compute resources",
            "On the SAA-C03 exam, ECS is the default answer for containerised AWS workloads unless Kubernetes-specific features are explicitly mentioned",
        ],
        roleJson: [
            {
                label: "Architecture decision — ECS vs EKS comparison template for AMI PVT LTD",
                note: "💡 Start with ECS for new containerized workloads unless you already have Kubernetes expertise or need Kubernetes-specific features.",
                code: `# ECS Fargate — marketplace-api-service deployment summary
# Control plane:  Fully managed by AWS (no version upgrade needed)
# Billing unit:   Per task: vCPU-second + GB-second
# Networking:     awsvpc — each task gets its own ENI
# IAM:            Task role (app permissions) + Execution role (pull/log)
# Service mesh:   AWS App Mesh (Envoy sidecar, managed via ECS agent)
# Scaling:        Application Auto Scaling on ECS service desired count
# Best for:       marketplace-api-service (Spring Boot, AWS-native integrations)

# EKS — marketplace-tools-cluster deployment summary
# Control plane:  Managed Kubernetes API server ($0.10/hr); customer upgrades k8s version
# Billing unit:   EC2 node instances + EKS cluster fee (or Fargate pod pricing)
# Networking:     VPC CNI (each pod gets VPC IP) or Calico overlay
# IAM:            IRSA — per-pod IAM via OIDC federation
# Service mesh:   Istio (community) or AWS App Mesh with k8s CRD controllers
# Scaling:        HPA (CPU/memory) + KEDA (SQS message count, custom metrics)
# Best for:       marketplace-tools-cluster (Leaderboard, Skill Matrix, Spin the Wheel)

# Quick reference: create EKS Fargate profile for serverless pods
aws eks create-fargate-profile \\
  --cluster-name marketplace-tools-cluster \\
  --fargate-profile-name marketplace-tools-fargate \\
  --pod-execution-role-arn arn:aws:iam::234567890123:role/AmazonEKSFargatePodExecutionRole \\
  --subnets subnet-private1a subnet-private1b \\
  --selectors 'namespace=spin-the-wheel' 'namespace=leaderboard'`,
            },
        ],
    },
];

export default scenarios;
