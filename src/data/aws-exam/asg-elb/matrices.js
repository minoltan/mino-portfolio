import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Auto Scaling & Elastic Load Balancing comparison matrices
 */

const matrices = [
    {
        id: "lb-comparison",
        title: "Load Balancer Comparison",
        subtitle: "ALB vs NLB vs CLB — feature differences for the AMI PVT LTD marketplace",
        color: ACCENT.primary,
        columns: ["Feature", "ALB", "NLB", "CLB"],
        rows: [
            ["Layer", "Layer 7 (Application)", "Layer 4 (Transport)", "Layer 4/7 (Legacy)"],
            ["Protocol", "HTTP, HTTPS, gRPC, WebSocket", "TCP, UDP, TLS, TCP_UDP", "HTTP, HTTPS, TCP, SSL"],
            ["Use case", "marketplace-alb — path/host routing for API and static assets", "marketplace-nlb — MCP TCP event streams with static IP", "Legacy apps only; avoid for new workloads"],
            ["Static IP", "Not supported (use Global Accelerator)", "One static EIP per AZ", "Not supported"],
            ["Path-based routing", "Yes — /api/* and /static/* rules on marketplace-alb", "No", "No"],
            ["Host-based routing", "Yes — route by Host header", "No", "No"],
            ["WebSocket", "Natively supported", "Natively supported (TCP)", "Limited"],
            ["Source IP preservation", "No — uses X-Forwarded-For header", "Yes — client IP visible at EC2", "Partial (PROXY protocol)"],
            ["SSL/TLS termination", "Yes — ACM certificate on listener", "Yes — TLS listener (pass-through also supported)", "Yes"],
            ["Health check protocols", "HTTP, HTTPS", "TCP, HTTP, HTTPS", "TCP, HTTP, HTTPS, SSL"],
            ["Security group", "Yes — marketplace-alb-sg", "No — control via EC2/NACL", "Yes"],
            ["Cross-zone load balancing", "Enabled by default (chargeable)", "Disabled by default (configurable)", "Enabled by default"],
        ],
    },
    {
        id: "scaling-policy-types",
        title: "Scaling Policy Types",
        subtitle: "When to use each Auto Scaling policy for marketplace-api-asg",
        color: ACCENT.teal,
        columns: ["Policy", "Trigger", "Use case", "AMI PVT LTD example"],
        rows: [
            [
                "Target Tracking",
                "Keep a CloudWatch metric at a target value; AWS manages alarms automatically",
                "Steady demand that correlates well with a single metric; simplest to configure",
                "Keep ALBRequestCountPerTarget ≤ 1000 on marketplace-api-tg; scale out/in automatically",
            ],
            [
                "Step Scaling",
                "CloudWatch alarm breaches a threshold; step adjustments add/remove a defined number of instances per breach magnitude",
                "Workloads with distinct load tiers where different breach sizes need different responses",
                "CPU 70–85% → add 2 instances on marketplace-api-asg; CPU > 85% → add 4 instances",
            ],
            [
                "Simple Scaling",
                "Single CloudWatch alarm triggers a fixed change; waits for default cooldown before next action",
                "Basic scale-out/in with predictable traffic; legacy option — prefer target tracking or step scaling",
                "CPU > 80% alarm adds 1 instance to marketplace-api-asg; waits 300 s before next action",
            ],
            [
                "Scheduled Scaling",
                "Cron-based time schedule sets min/max/desired at a defined date and time",
                "Predictable traffic patterns such as business hours, batch windows, or seasonal promotions",
                "Scale marketplace-api-asg desired to 6 at 08:00 SGT weekdays for morning marketplace traffic peak",
            ],
        ],
    },
    {
        id: "asg-key-numbers",
        title: "ASG Key Limits & Numbers",
        subtitle: "Exam-critical settings, defaults, and behaviours for marketplace-api-asg",
        color: ACCENT.amber,
        columns: ["Setting", "Value / Behavior", "Exam tip"],
        rows: [
            [
                "Default cooldown",
                "300 seconds",
                "Applies after simple scaling actions; target tracking and step scaling have their own per-policy cooldowns",
            ],
            [
                "Scale-out cooldown (target tracking)",
                "60 seconds (recommended)",
                "Shorter than scale-in so the fleet reacts quickly to spikes; marketplace-api-asg uses 60 s scale-out",
            ],
            [
                "Scale-in cooldown (target tracking)",
                "300 seconds (recommended)",
                "Longer than scale-out to avoid removing capacity during brief traffic valleys",
            ],
            [
                "Health check grace period",
                "Default 300 seconds; set to 120 s for marketplace-api-asg",
                "ASG ignores instance health check failures during the grace period so Spring Boot has time to start up",
            ],
            [
                "Launch template versions",
                "Supports $Latest and $Default shortcuts, plus explicit version numbers",
                "Use $Latest with caution in prod; pin to a tested version or use $Default for controlled rollouts",
            ],
            [
                "Max instances (default account limit)",
                "2000 Auto Scaling groups per region; 10 000 instances per group (soft limit)",
                "marketplace-api-asg max=10 is well within defaults; request increases for large-scale deployments",
            ],
            [
                "Min/max/desired relationship",
                "min ≤ desired ≤ max; changing desired triggers a scaling action if outside current capacity",
                "If you set desired below min or above max the API returns a validation error",
            ],
            [
                "Termination policy (default)",
                "OldestLaunchTemplate → OldestInstance → closest to next billing hour",
                "Default termination policy replaces stale instances first; use OldestLaunchConfiguration to retire legacy configs",
            ],
            [
                "Instance refresh",
                "Rolls out launch template changes by replacing instances in batches (minimum healthy %)",
                "Set minimum healthy percentage to 90% on marketplace-api-asg to keep capacity during rolling updates",
            ],
            [
                "Warm pools",
                "Pre-initialised stopped or running instances ready to enter InService immediately",
                "Reduces scale-out latency for slow-starting Spring Boot applications in marketplace-api-asg",
            ],
        ],
    },
];

export default matrices;
