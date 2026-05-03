import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Monitoring, Logging & Auditing matrices
 * CloudWatch, CloudTrail, X-Ray, EventBridge
 * Reference: https://digitalcloud.training/amazon-cloudwatch/
 *            https://digitalcloud.training/aws-cloudtrail/
 */

const matrices = [
    {
        id: "monitoring-tools-comparison",
        title: "CloudWatch vs CloudTrail vs X-Ray vs EventBridge",
        subtitle: "Know which tool answers which observability question for the SAA-C03 exam",
        color: ACCENT.primary,
        columns: ["Tool", "Answers the question…", "Data type", "Real-time?", "Marketplace use", "Key exam point"],
        rows: [
            ["CloudWatch Metrics", "Is my infrastructure healthy right now?", "Numeric time-series (CPU, Errors, Latency)", "Yes (1-min Detailed, 5-min Basic)", "marketplace-api-asg CPU, Lambda Errors, ALB RequestCount, custom OrderProcessingDurationMs", "EC2 memory/disk NOT in default metrics — need CloudWatch Agent"],
            ["CloudWatch Alarms", "Has a metric crossed a threshold?", "Alarm state (OK / ALARM / INSUFFICIENT_DATA)", "Yes (fires within 1 evaluation period)", "marketplace-critical-incident-alarm composite alarm for on-call paging", "Composite Alarms combine multiple alarms with AND/OR to reduce alert fatigue"],
            ["CloudWatch Logs", "What did my application log?", "Unstructured or structured text log events", "Near-real-time (seconds)", "/aws/lambda/marketplace-order-processor, /marketplace/ec2/spring-boot-api", "Metric Filters extract metrics from logs; Logs Insights runs ad-hoc SQL queries"],
            ["CloudWatch Container Insights", "How are my containers performing?", "ECS/EKS container-level metrics and logs", "Yes (1-min)", "marketplace-ecs-cluster container CPU, memory, network metrics without manual CW Agent config", "Enabled at cluster level; aggregates metrics and logs per task/service/cluster"],
            ["AWS CloudTrail", "Who called which AWS API, when, from where?", "API call records (JSON events per API call)", "Near-real-time via EventBridge; S3 delivery in ≤15 min", "Org trail recording all IAM, S3, Lambda invocations across all accounts", "Management Events = control plane (free); Data Events = data plane (paid, off by default)"],
            ["AWS X-Ray", "Where is the latency in my distributed system?", "Distributed traces (segments, subsegments, annotations)", "Near-real-time (service map updates in ~1 min)", "Tracing API Gateway → Lambda → DynamoDB → SNS full order flow", "Requires SDK instrumentation in code + Daemon on EC2 (or Active Tracing on Lambda)"],
            ["Amazon EventBridge", "What should happen when an event occurs?", "JSON events from AWS services, custom apps, SaaS", "Near-real-time (<1 sec event delivery)", "IAM change alerts, nightly cleanup schedule, Config auto-remediation", "Successor to CloudWatch Events; adds custom buses, SaaS integrations, Schema Registry"],
            ["CloudWatch Synthetics", "Is my API/URL reachable from outside?", "Canary run results (pass/fail, latency, screenshots)", "Scheduled (configurable frequency)", "Scheduled canary on marketplace-alb HTTPS endpoint to detect external outages", "Uses headless Chromium or Node.js scripts to simulate user flows"],
        ],
    },
    {
        id: "cloudwatch-key-numbers",
        title: "CloudWatch Key Numbers & Limits",
        subtitle: "Critical CloudWatch limits and retention periods for the SAA-C03 exam",
        color: ACCENT.teal,
        columns: ["Item", "Value", "Exam note"],
        rows: [
            ["Basic monitoring (EC2)", "5-minute resolution (free)", "Default for all EC2; does not include memory or disk — need CW Agent for those"],
            ["Detailed monitoring (EC2)", "1-minute resolution (paid)", "Required for ASG to react quickly to load spikes; enable on launch template"],
            ["High-resolution custom metrics", "1-second resolution (StorageResolution=1)", "Retained for 3 hours only; use for latency-sensitive sub-minute alerting"],
            ["Standard custom metrics retention", "60-sec data: 15 days; 5-min data: 63 days; 1-hr data: 15 months", "Design dashboards around these windows — data is rolled up over time, older data has lower resolution"],
            ["Alarm evaluation period", "Min 10 seconds (high-res) / 60 seconds (standard)", "Evaluation period × datapoints to alarm = total time before alarm fires; e.g. 3 of 5 × 1 min = 5 min window"],
            ["Logs Insights max query range", "7 days per query (default)", "Increase limit or use Athena on exported S3 logs for longer-range analysis"],
            ["Log Group retention", "Never expire (default) to 10 years", "Always set a retention policy — default 'never expire' incurs unbounded storage costs"],
            ["Metric Filters per Log Group", "Maximum 100 metric filters", "Each filter can extract one metric; split large log groups if you need many metrics"],
            ["Dashboard maximum", "500 metrics per dashboard", "Use metric math to combine metrics and reduce widget count"],
            ["CloudTrail S3 delivery delay", "Within 15 minutes of API call", "EventBridge receives events in near-real-time (<1 min) — use EventBridge for real-time alerting, not S3 polling"],
            ["CloudTrail Data Events cost", "$0.10 per 100,000 events", "Enable selectively — high-traffic S3 buckets can generate millions of events/day; estimate cost before enabling"],
        ],
    },
    {
        id: "cloudwatch-alarm-states",
        title: "CloudWatch Alarm States & Best Practices",
        subtitle: "Alarm configuration patterns for the AMI PVT LTD Marketplace ops team",
        color: ACCENT.amber,
        columns: ["Alarm type / setting", "Purpose", "Marketplace example", "Best practice"],
        rows: [
            ["Simple Alarm — OK", "Metric is within threshold; no action needed", "marketplace-alb 5xx count < 10 for last 5 minutes", "Set OK action to send 'resolved' notification to ops — close the incident ticket automatically"],
            ["Simple Alarm — ALARM", "Metric breached threshold; action triggered", "marketplace-order-error-alarm: Lambda Errors > 5 in 5 min", "Set ALARM action to publish to marketplace-notifications SNS; include runbook link in message"],
            ["Simple Alarm — INSUFFICIENT_DATA", "No metric data in evaluation window; alarm cannot evaluate", "New Lambda function — no invocations yet so no Errors metric data exists", "Set TreatMissingData appropriately; for Lambda use notBreaching (no invocations = no errors)"],
            ["Composite Alarm — AND", "Fire only when ALL child alarms are ALARM simultaneously", "marketplace-critical-incident-alarm: Errors AND DLQ AND 5xx all in ALARM", "Use AND composite alarms for on-call paging to eliminate false positives from single-metric spikes"],
            ["Composite Alarm — OR", "Fire when ANY child alarm is ALARM", "marketplace-degraded-alarm: Errors OR 5xx in ALARM → team Slack message", "Use OR composite alarms for lower-priority awareness notifications that don't require immediate action"],
            ["TreatMissingData: notBreaching", "Missing data points are treated as within threshold (OK)", "Lambda function not invoked → no Errors metric → alarm stays OK", "Use for Lambda, SQS, and any service where no data means no activity (not a problem)"],
            ["TreatMissingData: breaching", "Missing data points are treated as threshold violation (ALARM)", "EC2 instance should ALWAYS report CPU — if data stops, something is wrong", "Use when absence of metric data itself indicates a problem (e.g. EC2 stopped reporting metrics = instance is down)"],
            ["M out of N evaluation", "Alarm fires only if M of the last N data points breach threshold", "Threshold 70% CPU over 3 of 5 consecutive 1-min periods", "Reduces noise from transient spikes — single-period threshold is more sensitive to false positives"],
            ["Alarm on Anomaly Detection", "Alarm fires when metric deviates from ML-predicted band", "OrderProcessingDurationMs spikes above predicted normal range", "Use for metrics with seasonal or cyclical patterns where a fixed threshold would cause false alarms at peak times"],
        ],
    },
];

export default matrices;
