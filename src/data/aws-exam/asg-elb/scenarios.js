import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Auto Scaling & Elastic Load Balancing scenarios
 *
 * Source study topic: AWS Auto Scaling Groups (ASG) and Elastic Load Balancing (ELB),
 * grounded in the AMI PVT LTD multi-tenant SaaS marketplace running in ap-southeast-1.
 */

const scenarios = [
    {
        id: 1,
        analogy: "Think of it like a restaurant that hires extra waitstaff during dinner rush and sends them home after closing — the kitchen always has the right number of people. If a waiter calls in sick, a replacement is hired automatically.",
        icon: "📈",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "Auto Scaling Group (ASG)",
        subtitle: "Self-healing Spring Boot EC2 fleet",
        useCase: {
            title: "AMI PVT LTD Marketplace — scaling the API server fleet automatically",
            story: "The marketplace API backend runs on Spring Boot Java servers. AMI PVT LTD configures marketplace-api-asg in ap-southeast-1 with min=2, max=10, and desired=3. Instances launch from marketplace-api-launch-template, which references the golden AMI, the Marketplace-API-EC2-InstanceProfile, and the marketplace-api-sg security group. The ASG replaces unhealthy instances automatically so the marketplace remains available even during AZ disruptions.",
            diagram: [
                { actor: "marketplace-api-launch-template", icon: "📄" },
                { arrow: "defines instance config" },
                { actor: "marketplace-api-asg (min=2, max=10, desired=3)", icon: "⚖️" },
                { arrow: "launches/terminates EC2 across AZs" },
                { actor: "Spring Boot EC2 Fleet (ap-southeast-1a/1b/1c)", icon: "🖥️" },
            ],
        },
        buildSystem: [
            "Create marketplace-api-launch-template referencing ami-0abc123marketplaceapi, t3.medium, and Marketplace-API-EC2-InstanceProfile",
            "Create marketplace-api-asg spanning availability zones ap-southeast-1a, ap-southeast-1b, and ap-southeast-1c",
            "Set min=2, max=10, desired=3 to keep baseline capacity with room to scale",
            "Attach marketplace-api-asg to the marketplace-api-tg target group so the ALB routes traffic to ASG instances",
            "Configure EC2 health checks in addition to ELB health checks so the ASG replaces instances the ALB marks unhealthy",
            "Set a default cooldown of 300 seconds to prevent premature scale-in after a scale-out event",
            "Enable instance refresh on the ASG to roll out launch template version updates without downtime",
            "Tag ASG instances with Environment=prod, Team=platform, and Service=marketplace-api for cost allocation",
        ],
        flow: ["Launch Template", "marketplace-api-asg", "Multi-AZ EC2 Fleet", "ELB Health Check", "Auto Replace"],
        examTips: [
            "An ASG launches instances from a Launch Template or Launch Configuration — prefer Launch Templates as they support versioning",
            "ASG health checks can be EC2 (instance status) or ELB (target group health); ELB health checks are more application-aware",
            "The default cooldown (300 s) prevents rapid repeated scaling actions; it is separate from policy-level cooldowns",
            "When an AZ becomes unhealthy, the ASG rebalances by launching replacement instances in healthy AZs",
        ],
        roleJson: [
            {
                label: "AWS CLI — create marketplace-api-asg",
                note: "💡 Attach the target group ARN at creation time so new instances register with the ALB automatically.",
                code: `aws autoscaling create-auto-scaling-group \\
  --auto-scaling-group-name marketplace-api-asg \\
  --launch-template LaunchTemplateName=marketplace-api-launch-template,Version='$Latest' \\
  --min-size 2 \\
  --max-size 10 \\
  --desired-capacity 3 \\
  --availability-zones ap-southeast-1a ap-southeast-1b ap-southeast-1c \\
  --target-group-arns arn:aws:elasticloadbalancing:ap-southeast-1:123456789012:targetgroup/marketplace-api-tg/abc123 \\
  --health-check-type ELB \\
  --health-check-grace-period 120 \\
  --default-cooldown 300 \\
  --tags Key=Environment,Value=prod,PropagateAtLaunch=true \\
         Key=Service,Value=marketplace-api,PropagateAtLaunch=true`,
            },
        ],
    },

    {
        id: 2,
        analogy: "Think of it like a hotel concierge who reads your request and directs you to the right department — guests asking for room service go to the kitchen, guests asking for a taxi go to the transport desk — all through one front door.",
        icon: "🔀",
        color: ACCENT.teal,
        tag: "SCENARIO 2",
        title: "Application Load Balancer (ALB)",
        subtitle: "Path-based routing for the marketplace API",
        useCase: {
            title: "AMI PVT LTD Marketplace — routing marketplace traffic with path-based rules",
            story: "marketplace-alb sits in public subnets across ap-southeast-1a and ap-southeast-1b, terminating HTTPS on port 443 using an ACM certificate for api.marketplace.ami.com. Listener rules route /api/* requests to marketplace-api-tg (Spring Boot EC2 fleet) and /static/* requests to marketplace-static-tg (a separate static-asset target group). HTTP on port 80 redirects to HTTPS. This single ALB handles both API and static traffic without exposing EC2 instances directly.",
            diagram: [
                { actor: "Client Browser / Customer App", icon: "🌐" },
                { arrow: "HTTPS 443 → marketplace-alb" },
                { actor: "marketplace-alb (ACM cert, listener rules)", icon: "🔀" },
                { arrow: "/api/* → marketplace-api-tg  |  /static/* → marketplace-static-tg" },
                { actor: "Spring Boot EC2 Fleet (port 8080) / Static Asset Servers", icon: "🖥️" },
            ],
        },
        buildSystem: [
            "Create marketplace-alb as internet-facing in public subnets of ap-southeast-1a and ap-southeast-1b",
            "Attach marketplace-alb-sg allowing inbound 80 and 443 from 0.0.0.0/0",
            "Request an ACM certificate for api.marketplace.ami.com with DNS validation using Route 53",
            "Add an HTTPS listener on port 443 with the ACM certificate as the default SSL policy",
            "Add an HTTP listener on port 80 with a redirect action to HTTPS (301)",
            "Create marketplace-api-tg (target type: instance, protocol HTTP, port 8080) with a /health check path",
            "Create marketplace-static-tg (target type: instance, protocol HTTP, port 8081)",
            "Add listener rules: /api/* → marketplace-api-tg (higher priority), /static/* → marketplace-static-tg, default → marketplace-api-tg",
        ],
        flow: ["Client", "marketplace-alb", "Listener Rules", "marketplace-api-tg", "Spring Boot EC2"],
        examTips: [
            "ALB operates at Layer 7 and supports path-based, host-based, header-based, and query-string routing rules",
            "ALB listener rules are evaluated in priority order; lower number = higher priority; default rule has no priority number",
            "SSL/TLS termination at the ALB removes the overhead of certificate management from each EC2 instance",
            "ALB access logs and CloudWatch metrics provide request count, latency, HTTP error rates, and target health per target group",
        ],
        roleJson: [
            {
                label: "ALB listener rule — path-based routing for /api/* and /static/*",
                note: "💡 Rules are evaluated top-to-bottom by priority; the default rule (no condition) is the fallback.",
                code: `{
  "ListenerArn": "arn:aws:elasticloadbalancing:ap-southeast-1:123456789012:listener/app/marketplace-alb/abc/def",
  "Rules": [
    {
      "Priority": "10",
      "Conditions": [{ "Field": "path-pattern", "Values": ["/api/*"] }],
      "Actions": [{
        "Type": "forward",
        "TargetGroupArn": "arn:aws:elasticloadbalancing:ap-southeast-1:123456789012:targetgroup/marketplace-api-tg/abc123"
      }]
    },
    {
      "Priority": "20",
      "Conditions": [{ "Field": "path-pattern", "Values": ["/static/*"] }],
      "Actions": [{
        "Type": "forward",
        "TargetGroupArn": "arn:aws:elasticloadbalancing:ap-southeast-1:123456789012:targetgroup/marketplace-static-tg/def456"
      }]
    }
  ]
}`,
            },
        ],
    },

    {
        id: 3,
        analogy: "Think of it like a thermostat that automatically turns the heating up or down to maintain your desired room temperature — you set the target and the system figures out how much power is needed, adjusting continuously as the weather changes.",
        icon: "🎯",
        color: ACCENT.amber,
        tag: "SCENARIO 3",
        title: "Target Tracking Scaling Policy",
        subtitle: "Demand-driven scale-out and scale-in for the API fleet",
        useCase: {
            title: "AMI PVT LTD Marketplace — automatically scaling based on ALB request count and CPU",
            story: "During flash sales and product launches, the marketplace API traffic spikes unpredictably. AMI PVT LTD attaches two target tracking policies to marketplace-api-asg: one tracks ALBRequestCountPerTarget and scales out when it exceeds 1000 requests per target, and a second tracks average CPU and scales out above 70%. Scale-out cooldown is set to 60 seconds to react quickly to bursts, while scale-in cooldown is 300 seconds to prevent premature capacity removal.",
            diagram: [
                { actor: "marketplace-alb CloudWatch Metric (RequestCountPerTarget)", icon: "📊" },
                { arrow: "exceeds 1000 req/target OR CPU > 70%" },
                { actor: "Target Tracking Policy on marketplace-api-asg", icon: "🎯" },
                { arrow: "launches new EC2 instances" },
                { actor: "marketplace-api-asg (scaled out)", icon: "🖥️" },
            ],
        },
        buildSystem: [
            "Attach a target tracking policy named marketplace-api-request-scaling with metric ALBRequestCountPerTarget, target value 1000",
            "Reference the marketplace-alb and marketplace-api-tg ARNs in the predefined metric specification",
            "Set scale-out cooldown to 60 seconds so the fleet reacts within one minute of a traffic spike",
            "Set scale-in cooldown to 300 seconds to avoid terminating instances during brief traffic valleys",
            "Attach a second target tracking policy named marketplace-api-cpu-scaling targeting ASGAverageCPUUtilization at 70%",
            "Disable scale-in on the CPU policy if you want only the request-count policy to drive scale-in decisions",
            "Monitor policy activity in CloudWatch under the AWS/AutoScaling namespace and set alarms on ScalingActivity",
            "Test with a load generator against marketplace-alb and verify new instances join marketplace-api-tg before serving traffic",
        ],
        flow: ["CloudWatch Alarm", "Target Tracking Policy", "ASG Scale-Out", "New EC2 Registers to TG", "Traffic Absorbed"],
        examTips: [
            "Target tracking scaling adjusts capacity to keep a chosen metric at the target value — AWS manages the alarm thresholds automatically",
            "ALBRequestCountPerTarget is a predefined metric that scales proportionally to load balancer traffic",
            "Scale-out cooldown (60 s default for target tracking) should be shorter than scale-in cooldown (300 s) so you scale out fast and scale in conservatively",
            "You can disable scale-in on a target tracking policy to use a separate, more conservative policy for scale-in decisions",
        ],
        roleJson: [
            {
                label: "AWS CLI — target tracking policy on ALBRequestCountPerTarget",
                note: "💡 The ResourceLabel ties the metric to the specific marketplace-alb / marketplace-api-tg pair.",
                code: `aws autoscaling put-scaling-policy \\
  --auto-scaling-group-name marketplace-api-asg \\
  --policy-name marketplace-api-request-scaling \\
  --policy-type TargetTrackingScaling \\
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ALBRequestCountPerTarget",
      "ResourceLabel": "app/marketplace-alb/abc123/targetgroup/marketplace-api-tg/def456"
    },
    "TargetValue": 1000,
    "ScaleOutCooldown": 60,
    "ScaleInCooldown": 300
  }'`,
            },
        ],
    },

    {
        id: 4,
        analogy: "Think of it like a restaurant that rings a bell before closing so the last customers can finish their meals — the doors lock only after everyone has been served, not in the middle of a dish being delivered.",
        icon: "🔗",
        color: ACCENT.orange,
        tag: "SCENARIO 4",
        title: "Lifecycle Hooks",
        subtitle: "Graceful connection drain before instance termination",
        useCase: {
            title: "AMI PVT LTD Marketplace — letting Spring Boot finish in-flight requests before scale-in",
            story: "When marketplace-api-asg scales in, a Spring Boot instance may be handling active HTTP requests or holding database connections. AMI PVT LTD adds a lifecycle hook on AUTOSCALING:EC2_INSTANCE_TERMINATING that holds the instance in the Terminating:Wait state for up to 30 seconds. An SNS notification triggers a Lambda that calls an SSM Run Command on the instance to flush the in-flight queue and close connections cleanly, then signals the lifecycle hook to CONTINUE. The ALB deregistration delay is also set to 30 seconds.",
            diagram: [
                { actor: "marketplace-api-asg (scale-in decision)", icon: "⚖️" },
                { arrow: "AUTOSCALING:EC2_INSTANCE_TERMINATING lifecycle hook" },
                { actor: "SNS → Lambda (marketplace-drain-hook-fn)", icon: "🔔" },
                { arrow: "SSM Run Command: drain connections (30 s)" },
                { actor: "Spring Boot EC2 (Terminating:Wait → CONTINUE)", icon: "🖥️" },
            ],
        },
        buildSystem: [
            "Add a terminating lifecycle hook named marketplace-api-drain-hook with heartbeat timeout 30 seconds and default result ABANDON",
            "Create an SNS topic marketplace-asg-lifecycle-events and subscribe marketplace-drain-hook-fn Lambda to it",
            "In marketplace-drain-hook-fn, send SSM SendCommand to run the drain script, then call complete-lifecycle-action with result CONTINUE",
            "Set the ALB target group marketplace-api-tg deregistration delay to 30 seconds to match the lifecycle hook timeout",
            "Grant the ASG service-linked role permission to publish to marketplace-asg-lifecycle-events SNS topic",
            "Test by triggering a manual scale-in and verifying no 502 errors appear in marketplace-alb access logs during termination",
            "Monitor hook heartbeat timeouts in CloudWatch and alert if the Lambda fails to complete the hook within the timeout window",
        ],
        flow: ["Scale-In Decision", "Terminating:Wait", "SNS Notification", "Lambda Drain", "CONTINUE → Terminate"],
        examTips: [
            "Lifecycle hooks pause the instance in a wait state (Pending:Wait or Terminating:Wait) while external processing completes",
            "The heartbeat timeout defines the maximum wait; if complete-lifecycle-action is not called, the default result (ABANDON or CONTINUE) applies",
            "AUTOSCALING:EC2_INSTANCE_LAUNCHING hooks are used for custom bootstrapping before the instance enters InService",
            "Deregistration delay on the target group works alongside the terminating hook to prevent new requests reaching a draining instance",
        ],
        roleJson: [
            {
                label: "AWS CLI — add terminating lifecycle hook to marketplace-api-asg",
                note: "💡 Set DefaultResult to ABANDON so that if the Lambda times out, the instance is not left running unexpectedly.",
                code: `aws autoscaling put-lifecycle-hook \\
  --lifecycle-hook-name marketplace-api-drain-hook \\
  --auto-scaling-group-name marketplace-api-asg \\
  --lifecycle-transition autoscaling:EC2_INSTANCE_TERMINATING \\
  --notification-target-arn arn:aws:sns:ap-southeast-1:123456789012:marketplace-asg-lifecycle-events \\
  --role-arn arn:aws:iam::123456789012:role/marketplace-asg-lifecycle-role \\
  --heartbeat-timeout 30 \\
  --default-result CONTINUE`,
            },
        ],
    },

    {
        id: 5,
        analogy: "Think of it like a road diversion where a new bypass is built alongside the old road — traffic is gradually shifted from the old road to the new one, and if the new road has potholes, you can instantly redirect everyone back.",
        icon: "🟦",
        color: ACCENT.purple,
        tag: "SCENARIO 5",
        title: "Blue/Green Deployment via ALB",
        subtitle: "Zero-downtime Spring Boot version rollout",
        useCase: {
            title: "AMI PVT LTD Marketplace — shifting traffic from v1 to v2 with weighted ALB routing",
            story: "AMI PVT LTD needs to deploy a new Spring Boot API version (v2) without dropping customer requests. The existing fleet behind marketplace-api-tg-blue serves 100% of traffic. A new ASG (marketplace-api-asg-green) launches v2 instances and registers them to marketplace-api-tg-green. The team uses ALB weighted target groups to shift traffic gradually: 90/10, then 50/50, then 0/100. Once green is stable, marketplace-api-tg-blue is deregistered and the blue ASG is terminated.",
            diagram: [
                { actor: "marketplace-alb (HTTPS listener)", icon: "🔀" },
                { arrow: "weighted forward: 90% blue / 10% green" },
                { actor: "marketplace-api-tg-blue (v1 EC2) / marketplace-api-tg-green (v2 EC2)", icon: "🟦🟩" },
                { arrow: "shift weight to 0% / 100%" },
                { actor: "marketplace-api-tg-green (full traffic, v2 stable)", icon: "🟩" },
            ],
        },
        buildSystem: [
            "Create marketplace-api-asg-green from a new launch template version referencing the v2 golden AMI",
            "Create marketplace-api-tg-green with identical health check settings as marketplace-api-tg-blue",
            "Wait until all green instances pass health checks and are in the InService state",
            "Update the ALB default listener rule to use a weighted forward action: marketplace-api-tg-blue weight 9, marketplace-api-tg-green weight 1",
            "Monitor CloudWatch metrics (5xx errors, latency, healthy host count) on both target groups",
            "Gradually increase green weight and reduce blue weight: 50/50, then 10/90, then 0/100",
            "After full cutover, deregister marketplace-api-tg-blue from the listener and delete the blue ASG",
            "Keep the blue launch template version for rollback for at least one release cycle",
        ],
        flow: ["New AMI (v2)", "Green ASG + TG", "Weighted ALB Rule", "Traffic Shift", "Deregister Blue"],
        examTips: [
            "ALB weighted target groups allow precise traffic splitting between two target groups using integer weights (0–999)",
            "Blue/green deployment provides instant rollback by shifting weight back to the blue target group",
            "Both target groups must have the same health check protocol and path for comparable health reporting",
            "AWS CodeDeploy can automate the traffic shifting steps for ALB + ASG blue/green deployments",
        ],
        roleJson: [
            {
                label: "ALB listener rule — weighted forward action (90% blue / 10% green)",
                note: "💡 Weights are relative integers; blue=9, green=1 gives approximately 90/10 split.",
                code: `{
  "ListenerArn": "arn:aws:elasticloadbalancing:ap-southeast-1:123456789012:listener/app/marketplace-alb/abc/def",
  "Rules": [
    {
      "RuleArn": "arn:aws:elasticloadbalancing:ap-southeast-1:123456789012:listener-rule/app/marketplace-alb/abc/def/rule1",
      "Actions": [{
        "Type": "forward",
        "ForwardConfig": {
          "TargetGroups": [
            {
              "TargetGroupArn": "arn:aws:elasticloadbalancing:ap-southeast-1:123456789012:targetgroup/marketplace-api-tg-blue/aaa",
              "Weight": 9
            },
            {
              "TargetGroupArn": "arn:aws:elasticloadbalancing:ap-southeast-1:123456789012:targetgroup/marketplace-api-tg-green/bbb",
              "Weight": 1
            }
          ],
          "TargetGroupStickinessConfig": { "Enabled": false }
        }
      }]
    }
  ]
}`,
            },
        ],
    },

    {
        id: 6,
        analogy: "Think of it like a dedicated express mail courier who delivers packages as fast as possible without opening them to read the address label — speed and raw delivery are the only goals, and the sender's name is always visible on the package.",
        icon: "⚡",
        color: ACCENT.green,
        tag: "SCENARIO 6",
        title: "Network Load Balancer (NLB)",
        subtitle: "Ultra-low-latency event streaming for the MCP tool",
        useCase: {
            title: "AMI PVT LTD Marketplace — high-throughput TCP event ingestion for MCP Report Server",
            story: "The MCP Report Server tool handles high-volume telemetry and event streams from customer applications. These connections are long-lived TCP streams where millisecond latency matters and the receiving server must see the client's real source IP for geo-filtering and audit logging. AMI PVT LTD deploys marketplace-nlb as a Network Load Balancer in ap-southeast-1, assigning one static Elastic IP per AZ. marketplace-nlb operates at Layer 4, terminates nothing at the load balancer, and preserves source IP natively.",
            diagram: [
                { actor: "Customer App (TCP event stream)", icon: "📡" },
                { arrow: "TCP to static EIP on marketplace-nlb" },
                { actor: "marketplace-nlb (Layer 4, static IPs, ap-southeast-1a/1b)", icon: "⚡" },
                { arrow: "raw TCP forwarded — source IP preserved" },
                { actor: "MCP Report Server EC2 Fleet (marketplace-mcp-tg)", icon: "🖥️" },
            ],
        },
        buildSystem: [
            "Create marketplace-nlb as an internet-facing Network Load Balancer in public subnets of ap-southeast-1a and ap-southeast-1b",
            "Allocate one Elastic IP per AZ and assign them to the NLB subnet mappings for a fixed public IP per zone",
            "Create marketplace-mcp-tg as a TCP target group on port 9000 (MCP event ingestion port)",
            "Add an NLB listener on TCP port 9000 forwarding to marketplace-mcp-tg",
            "Enable client IP preservation on marketplace-mcp-tg so the MCP Report Server sees the original customer IP",
            "Configure the MCP EC2 security group to allow TCP 9000 from the NLB subnet CIDRs (NLB does not have a security group)",
            "Enable cross-zone load balancing if instances are unevenly distributed across AZs",
            "Set marketplace-mcp-tg health checks to TCP protocol with a 10-second interval for accurate NLB health state",
        ],
        flow: ["Customer TCP Stream", "marketplace-nlb (Static EIP)", "TCP Port 9000", "marketplace-mcp-tg", "MCP Report Server"],
        examTips: [
            "NLB operates at Layer 4 (TCP/UDP/TLS) and does not inspect HTTP headers — use ALB for HTTP routing decisions",
            "NLB allocates one static IP per AZ (via Elastic IP or AWS-assigned); ALB does not support static IPs",
            "NLB preserves the client source IP by default for TCP targets; ALB uses the X-Forwarded-For header instead",
            "NLB does not have a security group — control access using security groups or NACLs on the target EC2 instances",
        ],
        roleJson: [
            {
                label: "AWS CLI — create marketplace-nlb with static Elastic IPs per AZ",
                note: "💡 Assign pre-allocated EIPs to the NLB so customers can whitelist a fixed IP rather than a changing DNS range.",
                code: `aws elbv2 create-load-balancer \\
  --name marketplace-nlb \\
  --type network \\
  --scheme internet-facing \\
  --subnet-mappings \\
    SubnetId=subnet-pub1a,AllocationId=eipalloc-0aaaa111 \\
    SubnetId=subnet-pub1b,AllocationId=eipalloc-0bbbb222 \\
  --tags Key=Service,Value=marketplace-mcp Key=Environment,Value=prod

# Create TCP target group
aws elbv2 create-target-group \\
  --name marketplace-mcp-tg \\
  --protocol TCP \\
  --port 9000 \\
  --vpc-id vpc-0marketplace123 \\
  --health-check-protocol TCP \\
  --health-check-interval-seconds 10 \\
  --target-type instance`,
            },
        ],
    },
];

export default scenarios;
