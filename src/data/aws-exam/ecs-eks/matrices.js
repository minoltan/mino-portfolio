import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Amazon ECS and EKS comparison matrices
 *
 * Source study topic: Amazon ECS and EKS — Docker Containers (SAA-C03),
 * grounded in the AMI PVT LTD multi-tenant SaaS marketplace running in ap-southeast-1.
 */

const matrices = [
    {
        id: "ecs-eks-ec2-lambda-comparison",
        title: "ECS vs EKS vs EC2 vs Lambda",
        subtitle: "Compute platform comparison for AMI PVT LTD marketplace workloads",
        color: ACCENT.primary,
        columns: ["Feature", "ECS Fargate", "ECS EC2", "EKS", "Lambda"],
        rows: [
            [
                "Control plane",
                "Fully managed by AWS — no version upgrade, no cluster nodes to patch",
                "ECS control plane managed; EC2 hosts are customer-managed (patching, AMI updates)",
                "Managed Kubernetes API server ($0.10/hr); customer triggers k8s version upgrades",
                "Fully serverless — no infrastructure management at all",
            ],
            [
                "Scaling unit",
                "ECS task (vCPU + GB); Application Auto Scaling adjusts desired task count",
                "EC2 instance via ASG + ECS task count via Application Auto Scaling",
                "EC2 node via managed node group ASG + Kubernetes HPA/KEDA for pod count",
                "Concurrent invocations; scales to 1,000 by default per region",
            ],
            [
                "Pricing model",
                "Per task: vCPU-second + GB-second; no idle cost when tasks are 0",
                "Per EC2 instance-hour (On-Demand or Spot) + ECS is free; idle capacity costs money",
                "$0.10/hr per cluster + EC2 node instance-hours; EKS Fargate = same as ECS Fargate pricing",
                "Per request + GB-second of execution; free tier: 1M requests/month",
            ],
            [
                "Cold start",
                "30–90 seconds (Fargate task startup includes container image pull)",
                "Near zero cold start once EC2 instance is running; instance launch ~3 min",
                "Near zero cold start for existing nodes; pod scheduling adds seconds",
                "Milliseconds to seconds depending on runtime; Java (Spring Boot) ~5–10 s cold start",
            ],
            [
                "Max runtime",
                "No maximum — Fargate tasks run until stopped",
                "No maximum — EC2-backed tasks run until stopped",
                "No maximum — Kubernetes pods run until terminated",
                "15 minutes maximum; not suitable for long-running marketplace-api requests",
            ],
            [
                "IAM identity",
                "Task role (app) + Execution role (ECS agent); per-task granularity",
                "Task role (app) + Execution role; or EC2 instance profile (shared by all tasks on host)",
                "IRSA — per Kubernetes ServiceAccount / pod IAM role via OIDC federation",
                "Lambda execution role — one role per function",
            ],
            [
                "Networking",
                "awsvpc only — each task gets its own ENI and VPC IP",
                "awsvpc (recommended), bridge, or host network modes",
                "VPC CNI (each pod gets VPC IP), or overlay (Calico); Security Groups for Pods supported",
                "VPC-attached Lambda gets ENI in private subnet; internet access requires NAT",
            ],
            [
                "Kubernetes features",
                "Not applicable — ECS is AWS proprietary orchestrator",
                "Not applicable — ECS is AWS proprietary orchestrator",
                "Full Kubernetes: RBAC, namespaces, Helm, CRDs, operators, Istio, KEDA",
                "Not applicable — event-driven compute, not a container orchestrator",
            ],
            [
                "AMI PVT LTD use case",
                "marketplace-api-service — Spring Boot API (3 tasks, ALB, Application Auto Scaling)",
                "Large memory workloads requiring GPU or custom instance types not on Fargate",
                "marketplace-tools-cluster — Leaderboard, Skill Matrix, Spin the Wheel (multi-namespace IRSA)",
                "marketplace-order-processor — event-driven Node.js Lambda triggered by SQS",
            ],
        ],
    },
    {
        id: "ecs-task-definition-fields",
        title: "ECS Task Definition Key Fields",
        subtitle: "Critical fields in marketplace-api-task definition for the SAA-C03 exam",
        color: ACCENT.teal,
        columns: ["Field", "What It Controls", "Exam Note"],
        rows: [
            [
                "taskRoleArn",
                "The IAM role assumed by application code inside the container (credentials available via EC2 metadata API at 169.254.170.2)",
                "Task role grants app access to AWS services (DynamoDB, S3, SQS); set to Marketplace-API-EC2-Role — do NOT use execution role for app permissions",
            ],
            [
                "executionRoleArn",
                "The IAM role used by the ECS agent / Fargate infrastructure to pull ECR images and write CloudWatch logs on behalf of the task",
                "Execution role is consumed by ECS control plane, not application code; needs ecr:BatchGetImage and logs:CreateLogStream permissions",
            ],
            [
                "networkMode",
                "Networking model for containers: awsvpc (each task gets its own ENI), bridge (docker NAT), host (host network stack)",
                "Fargate requires awsvpc; awsvpc gives each task a separate security group — best practice for Fargate; bridge mode shares host port space",
            ],
            [
                "logConfiguration",
                "Routing for container stdout/stderr: awslogs sends to CloudWatch Logs; awsfirelens routes to Kinesis/S3/third-party via Fluent Bit",
                "awslogs driver requires the execution role to have logs:CreateLogGroup and logs:PutLogEvents; set awslogs-stream-prefix for readable log streams",
            ],
            [
                "secrets",
                "Securely injects SSM Parameter Store or Secrets Manager values as environment variables at container start; not hardcoded in the task definition",
                "Prefer secrets over environment for sensitive values; execution role needs ssm:GetParameters or secretsmanager:GetSecretValue on the specific ARN",
            ],
            [
                "cpu / memory",
                "Task-level vCPU and RAM allocation for Fargate; must use valid Fargate combination (e.g., 1024 CPU / 2048 MB); container-level values are soft limits within the task",
                "Fargate CPU/memory combos are constrained — 1 vCPU (1024) supports 2 GB, 3 GB, or 4 GB only; container definition cpu/memory values are optional soft hints",
            ],
            [
                "healthCheck",
                "Container health check command run inside the container (separate from ALB target group health check); marks container UNHEALTHY if it fails consecutively",
                "ECS health check + ALB health check are independent; if ECS container health check fails, ECS replaces the task regardless of ALB state",
            ],
            [
                "requiresCompatibilities",
                "Specifies whether the task runs on FARGATE, EC2, or EXTERNAL (ECS Anywhere); determines which launch type the task can be used with",
                "A task definition with requiresCompatibilities=[FARGATE] cannot be used with EC2 launch type; set both to support either launch type",
            ],
        ],
    },
    {
        id: "container-services-key-numbers",
        title: "Container Services Key Numbers",
        subtitle: "Exam-critical limits, defaults, and behaviours for ECS, EKS, and ECR",
        color: ACCENT.amber,
        columns: ["Item", "Value", "Exam Note"],
        rows: [
            [
                "Fargate valid CPU/memory combos (examples)",
                "0.25 vCPU: 0.5–2 GB | 0.5 vCPU: 1–4 GB | 1 vCPU: 2–8 GB | 2 vCPU: 4–16 GB | 4 vCPU: 8–30 GB | 8 vCPU: 16–60 GB",
                "marketplace-api-task uses 1 vCPU / 2 GB — valid combo; if you specify an invalid combo, the task definition registration fails",
            ],
            [
                "ECS service desired count range",
                "0 to 5,000 tasks (soft limit; can be increased)",
                "marketplace-api-service scales between min=2 and max=10 via Application Auto Scaling; setting desired=0 stops all tasks (useful for cost savings)",
            ],
            [
                "ECS service deployment minimum healthy percent",
                "Default: 100% (no downtime); can be reduced to 50% to allow rolling deploys on small clusters",
                "marketplace-api-service uses minimumHealthyPercent=50, maximumPercent=200 — allows 3 old tasks to stop while 3 new tasks start simultaneously",
            ],
            [
                "Fargate Spot interruption notice",
                "2-minute warning via ECS task state change event (SIGTERM sent to container)",
                "Use Fargate Spot for marketplace-api-service non-critical tasks or batch jobs; handle SIGTERM gracefully with a shutdown hook in Spring Boot",
            ],
            [
                "ECR image scan on push (basic)",
                "Scans for OS package CVEs using Clair; results available within minutes of push",
                "Enhanced scanning (Amazon Inspector) provides continuous re-scanning and application-layer CVE detection; configure in ECR repository settings",
            ],
            [
                "ECS container startup grace period (health check)",
                "Configurable startPeriod: 0–300 seconds (default 0); marketplace-api-task sets 60 s",
                "startPeriod delays the first health check evaluation — Spring Boot needs 30–60 s to initialise; without this, early health check failures cause restart loops",
            ],
            [
                "Application Auto Scaling cooldown (ECS)",
                "ScaleOutCooldown default: 300 s; ScaleInCooldown default: 300 s (configurable per policy)",
                "marketplace-api-service sets scale-out cooldown=60 s and scale-in cooldown=300 s (same as the EC2 ASG it replaced)",
            ],
            [
                "EKS cluster Kubernetes version support",
                "AWS supports each k8s minor version for ~14 months; auto-upgrade to next version if cluster is not manually upgraded before end-of-support",
                "marketplace-tools-cluster (1.29) must be upgraded to 1.30 before end-of-support or AWS will auto-upgrade — test workloads in staging first",
            ],
            [
                "EKS managed node group max nodes",
                "Up to 450 nodes per managed node group (default; soft limit); multiple node groups per cluster",
                "marketplace-tools-ng uses max=8 — well within defaults; use separate node groups for On-Demand and Spot to apply different disruption budgets",
            ],
            [
                "Lambda marketplace-order-processor max timeout",
                "15 minutes (900 seconds); Node.js cold start ~200–500 ms (vs Spring Boot ~5–10 s)",
                "SQS-triggered Lambda (marketplace-order-processor) processes order events in under 30 s; 15-minute limit is not a constraint for this workload",
            ],
        ],
    },
];

export default matrices;
