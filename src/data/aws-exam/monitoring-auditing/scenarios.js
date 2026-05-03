import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Monitoring, Logging & Auditing scenarios
 *
 * Services: Amazon CloudWatch (Metrics, Logs, Alarms, Dashboards, Container Insights),
 *           AWS CloudTrail, AWS X-Ray
 * Reference: https://digitalcloud.training/amazon-cloudwatch/
 *            https://digitalcloud.training/aws-cloudtrail/
 */

const scenarios = [
    {
        id: 1,
        analogy: "Think of it like the vital signs monitor in a hospital ICU — every patient (AWS resource) is wired up to sensors that continuously report heart rate, blood pressure, and oxygen levels (metrics). A nurse's station (CloudWatch) collects all readings in real time, and an alarm fires immediately if any reading crosses a danger threshold — without the nurse having to watch every screen manually.",
        icon: "📊",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "CloudWatch Metrics & Custom Metrics",
        subtitle: "Service metrics and custom business KPIs for the marketplace platform",
        useCase: {
            title: "AMI PVT LTD Marketplace — CloudWatch default metrics plus custom OrderProcessingDurationMs and RevenuePerHour metrics",
            story: "AMI PVT LTD monitors the marketplace platform through two layers of CloudWatch metrics. Default metrics (AWS namespaces) cover infrastructure: AWS/EC2 CPUUtilization on marketplace-api-asg, AWS/ApplicationELB RequestCount and TargetResponseTime on marketplace-alb, AWS/Lambda Errors and Duration on marketplace-order-processor, and AWS/RDS DatabaseConnections on marketplace-orders-db. Custom metrics (MarketplacePlatform namespace) cover business KPIs: marketplace-order-processor Lambda publishes OrderProcessingDurationMs (how long each order takes end-to-end) and marketplace-api-asg EC2 instances publish via CloudWatch Agent ActiveOrderCount (orders currently in-flight) and RevenuePerHour (sum of order amounts in the last 60 minutes). These custom metrics are visualised on marketplace-ops-dashboard.",
            diagram: [
                { actor: "EC2 / Lambda / RDS / ALB / ECS (AWS services)", icon: "☁️" },
                { arrow: "auto-publish default metrics (1-min or 5-min intervals)" },
                { actor: "AWS/* Namespaces — CloudWatch default metrics", icon: "📊" },
                { actor: "Spring Boot EC2 + CloudWatch Agent", icon: "🏢" },
                { arrow: "PutMetricData to MarketplacePlatform namespace" },
                { actor: "CloudWatch Custom Metrics — OrderProcessingDurationMs / RevenuePerHour", icon: "📈" },
                { arrow: "visualised on" },
                { actor: "marketplace-ops-dashboard (CloudWatch Dashboard)", icon: "🖥️" },
            ],
        },
        buildSystem: [
            "Enable Detailed Monitoring on marketplace-api-asg EC2 instances — changes metric resolution from 5-minute (Basic) to 1-minute (Detailed); required for ASG to react faster to load spikes",
            "Install and configure CloudWatch Agent on all EC2 instances via SSM Run Command: agent collects memory utilisation (mem_used_percent) and disk space (disk_used_percent) — these are NOT available as default EC2 metrics",
            "Configure CloudWatch Agent for custom metric MarketplacePlatform/ActiveOrderCount: read from a custom stats file written by the Spring Boot API every 30 seconds; set namespace and dimensions (InstanceId, Environment=prod)",
            "Publish OrderProcessingDurationMs from marketplace-order-processor Lambda using AWS SDK v3 PutMetricDataCommand: Namespace=MarketplacePlatform, MetricName=OrderProcessingDurationMs, Unit=Milliseconds, Value=durationMs",
            "Set metric storage resolution: use StandardResolution (60-second) for cost metrics; use HighResolution (1-second, StorageResolution=1) only for latency metrics needing sub-minute granularity",
            "Create CloudWatch Dashboard marketplace-ops-dashboard with widgets: EC2 CPUUtilization (line), ALB RequestCount (bar), Lambda Errors (number), DynamoDB ConsumedWriteCapacity (stacked area), custom OrderProcessingDurationMs (line with p99 statistic)",
            "Configure metric math expression on the dashboard: (Lambda Errors / Lambda Invocations) × 100 to display error rate as a percentage — metric math runs on-the-fly without PutMetricData",
            "Set metric retention: high-resolution metrics (1s) are stored for 3 hours; 60-second metrics for 15 days; 5-minute metrics for 63 days; 1-hour metrics for 15 months — design dashboards around these retention windows",
        ],
        flow: ["AWS services auto-publish metrics", "CloudWatch Agent publishes custom metrics", "CloudWatch aggregates in namespaces", "Alarms evaluate thresholds", "Dashboard visualises KPIs"],
        examTips: [
            "EC2 default metrics (CPU, network, disk I/O) do NOT include memory or disk space usage — these require the CloudWatch Agent; this distinction appears frequently on the exam",
            "Basic monitoring = 5-minute granularity (free); Detailed monitoring = 1-minute granularity (paid); for ASGs to react quickly to CPU spikes, Detailed monitoring must be enabled",
            "High-Resolution custom metrics support 1-second granularity (StorageResolution=1) but are only retained for 3 hours — use them for latency-sensitive alerting, not long-term trending",
            "Metric Math allows you to compute derived metrics (e.g. error rate, throughput per instance) directly in the CloudWatch console without writing Lambda or custom code",
            "PutMetricData has a limit of 150 TPS per account per region; if you publish many metrics from many Lambda invocations, batch them using the --metric-data array form to avoid throttling",
        ],
        roleJson: [
            {
                label: "AWS CLI — publish custom metric and create CloudWatch dashboard",
                note: "💡 Use dimensions (e.g. FunctionName, Environment) on your custom metrics so you can filter and aggregate them per function or environment in alarms and dashboards.",
                code: `# Publish custom metric from Lambda / EC2
aws cloudwatch put-metric-data \\
  --namespace MarketplacePlatform \\
  --metric-data '[
    {
      "MetricName": "OrderProcessingDurationMs",
      "Dimensions": [{"Name": "FunctionName", "Value": "marketplace-order-processor"}, {"Name": "Environment", "Value": "prod"}],
      "Value": 1250,
      "Unit": "Milliseconds",
      "StorageResolution": 60
    }
  ]'

# Enable Detailed Monitoring on an EC2 instance
aws ec2 monitor-instances --instance-ids i-0abc123def456

# Get metric statistics for the last hour
aws cloudwatch get-metric-statistics \\
  --namespace MarketplacePlatform \\
  --metric-name OrderProcessingDurationMs \\
  --dimensions Name=Environment,Value=prod \\
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \\
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \\
  --period 300 \\
  --statistics Average p99`,
            },
        ],
    },

    {
        id: 2,
        analogy: "Think of it like a smart search engine for your application's diary — every line the application writes to its diary (log) is indexed and stored centrally. Instead of manually flipping through thousands of diary pages to find the one that mentions 'payment failed', you type a SQL-like query and the search engine returns the 5 relevant lines in seconds.",
        icon: "📜",
        color: ACCENT.teal,
        tag: "SCENARIO 2",
        title: "CloudWatch Logs & Logs Insights",
        subtitle: "Centralised log aggregation and SQL-powered queries across the marketplace",
        useCase: {
            title: "AMI PVT LTD Marketplace — CloudWatch Logs collecting Lambda, EC2, and ALB logs with Logs Insights for incident investigation",
            story: "AMI PVT LTD aggregates all application logs into CloudWatch Log Groups: /aws/lambda/marketplace-order-processor (Lambda auto-creates this), /marketplace/ec2/spring-boot-api (CloudWatch Agent collects Spring Boot logs from marketplace-api-asg instances), and /marketplace/alb/access-logs (ALB access logs forwarded via Firehose). During a payment incident, the on-call engineer runs a CloudWatch Logs Insights query across /aws/lambda/marketplace-order-processor to find all ERROR-level events in the last 30 minutes, correlate by requestId, and extract the exact order ID and failure reason — cutting investigation time from 2 hours to 5 minutes. A Metric Filter on the Lambda log group creates a custom CloudWatch metric LambdaPaymentErrors whenever the log contains \"PAYMENT_FAILED\", triggering an alarm within 60 seconds of the first failure.",
            diagram: [
                { actor: "Lambda marketplace-order-processor / Spring Boot EC2 / ALB", icon: "☁️" },
                { arrow: "emit log lines to CloudWatch Log Groups" },
                { actor: "CloudWatch Log Groups (/aws/lambda/marketplace-order-processor, /marketplace/ec2/...)", icon: "📜" },
                { arrow: "Metric Filter on PAYMENT_FAILED pattern" },
                { actor: "CloudWatch Metric — LambdaPaymentErrors (triggers alarm)", icon: "🚨" },
                { arrow: "Logs Insights query during incident investigation" },
                { actor: "Insights results — filtered ERRORs, correlated by requestId", icon: "🔍" },
            ],
        },
        buildSystem: [
            "Lambda auto-creates /aws/lambda/marketplace-order-processor — set log retention to 90 days (default is never expire, which incurs unbounded storage costs): aws logs put-retention-policy --log-group-name /aws/lambda/marketplace-order-processor --retention-in-days 90",
            "Configure CloudWatch Agent on marketplace-api-asg to collect Spring Boot application logs (/opt/marketplace/logs/application.log) and publish to /marketplace/ec2/spring-boot-api with 30-second flush interval",
            "Create Metric Filter on /aws/lambda/marketplace-order-processor: filterPattern='[date, requestId, level=ERROR*, ...]', metricName=LambdaOrderErrors, namespace=MarketplacePlatform, value=1 — increments counter each time a log line matches",
            "Create a second Metric Filter for payment failures: filterPattern='PAYMENT_FAILED', metricName=LambdaPaymentErrors, namespace=MarketplacePlatform — attach a CloudWatch Alarm to trigger marketplace-notifications SNS when LambdaPaymentErrors > 0",
            "Enable CloudWatch Logs subscription filter for real-time log streaming to Kinesis Data Firehose marketplace-order-firehose — delivers logs to S3 marketplace-analytics-raw for long-term archiving beyond the 90-day retention window",
            "Run Logs Insights incident query on /aws/lambda/marketplace-order-processor: filter @message like /ERROR/ | fields @timestamp, @requestId, orderId, errorMessage | sort @timestamp desc | limit 50",
            "Create a saved Logs Insights query marketplace-payment-failures-query for reuse by the ops team: filter @message like /PAYMENT_FAILED/ | stats count(*) by bin(5min) — shows payment failure rate over time",
            "Set up Container Insights on marketplace-ecs-cluster to automatically collect container logs from ECS tasks into structured log groups without configuring the CloudWatch Agent on each container",
        ],
        flow: ["Services emit logs", "Log Groups store with retention", "Metric Filter creates metric", "Alarm fires on threshold", "Logs Insights queries on-demand"],
        examTips: [
            "CloudWatch Logs retention is NOT set to Never by default in practice — always set a retention policy; without it, logs accumulate indefinitely and incur storage costs",
            "Metric Filters extract numeric values from log events and publish them as CloudWatch metrics — the filter only evaluates NEW log events after the filter is created; it does NOT backfill historical log data",
            "Logs Insights queries are interactive (run on demand) — they are NOT running continuously; use Metric Filters for real-time alerting and Logs Insights for investigation",
            "CloudWatch Logs subscription filters push log data to Kinesis Data Streams, Kinesis Data Firehose, or Lambda in near-real-time — use subscriptions for streaming logs to OpenSearch or S3",
            "Cross-account log sharing: set up a cross-account subscription filter on the source account to push logs to a central logging account — CloudWatch Logs does not natively aggregate logs across accounts without this",
        ],
        roleJson: [
            {
                label: "AWS CLI — set log retention, create metric filter, and run Logs Insights query",
                note: "💡 Always set log retention on Lambda log groups — Lambda creates them automatically but with no retention policy, so logs accumulate forever until you explicitly set a retention period.",
                code: `# Set log retention to 90 days
aws logs put-retention-policy \\
  --log-group-name /aws/lambda/marketplace-order-processor \\
  --retention-in-days 90

# Create Metric Filter for payment errors
aws logs put-metric-filter \\
  --log-group-name /aws/lambda/marketplace-order-processor \\
  --filter-name marketplace-payment-failures \\
  --filter-pattern "PAYMENT_FAILED" \\
  --metric-transformations \\
    metricName=LambdaPaymentErrors,metricNamespace=MarketplacePlatform,metricValue=1,defaultValue=0

# Run Logs Insights query for incident investigation
aws logs start-query \\
  --log-group-name /aws/lambda/marketplace-order-processor \\
  --start-time $(date -d '30 minutes ago' +%s) \\
  --end-time $(date +%s) \\
  --query-string 'filter @message like /ERROR/ | fields @timestamp, @requestId | sort @timestamp desc | limit 50'`,
            },
        ],
    },

    {
        id: 3,
        analogy: "Think of it like a security system with both individual door sensors (simple alarms) and a master control panel (composite alarm) — a single door sensor might trigger from a cat walking past, but the master panel only sounds the full alarm when BOTH the door sensor AND the motion detector AND the window sensor fire together, eliminating false alerts.",
        icon: "🚨",
        color: ACCENT.amber,
        tag: "SCENARIO 3",
        title: "CloudWatch Alarms & Composite Alarms",
        subtitle: "Multi-condition alerting to eliminate noise and escalate only real incidents",
        useCase: {
            title: "AMI PVT LTD Marketplace — composite alarm combining Lambda errors, DLQ depth, and ALB 5xx to trigger true incident alert",
            story: "AMI PVT LTD found that individual CloudWatch Alarms caused alert fatigue — a single Lambda error or a brief ALB 5xx spike triggered midnight pages that turned out to be transient blips. The team replaces individual paging alarms with a Composite Alarm marketplace-critical-incident-alarm that fires only when ALL three conditions are true simultaneously: (1) marketplace-order-error-alarm — Lambda Errors > 5 in 5 minutes, (2) marketplace-dlq-depth-alarm — ApproximateNumberOfMessagesVisible on order-events-dlq > 0, and (3) marketplace-alb-5xx-alarm — ALB HTTPCode_Target_5XX_Count > 10 in 5 minutes. Individual alarms still send low-priority email; only the composite alarm pages the on-call engineer via SNS.",
            diagram: [
                { actor: "Lambda marketplace-order-processor (Errors > 5)", icon: "⚡" },
                { actor: "SQS order-events-dlq (DLQ depth > 0)", icon: "📬" },
                { actor: "ALB marketplace-alb (5xx > 10)", icon: "⚖️" },
                { arrow: "individual alarms report state (OK / ALARM)" },
                { actor: "Composite Alarm — marketplace-critical-incident-alarm (ALL must be ALARM)", icon: "🚨" },
                { arrow: "fires ONLY when all three are simultaneously ALARM" },
                { actor: "marketplace-notifications SNS → on-call PagerDuty page", icon: "📟" },
            ],
        },
        buildSystem: [
            "Create individual alarm marketplace-order-error-alarm: metric=AWS/Lambda Errors, dimension=FunctionName:marketplace-order-processor, period=300, threshold=5, statistic=Sum, treatMissingData=notBreaching",
            "Create individual alarm marketplace-dlq-depth-alarm: metric=AWS/SQS ApproximateNumberOfMessagesVisible, dimension=QueueName:order-events-dlq, period=60, threshold=1, comparisonOperator=GreaterThanOrEqualToThreshold",
            "Create individual alarm marketplace-alb-5xx-alarm: metric=AWS/ApplicationELB HTTPCode_Target_5XX_Count, dimension=LoadBalancer:marketplace-alb, period=300, threshold=10, statistic=Sum",
            "Create Composite Alarm marketplace-critical-incident-alarm: alarmRule='ALARM(marketplace-order-error-alarm) AND ALARM(marketplace-dlq-depth-alarm) AND ALARM(marketplace-alb-5xx-alarm)', actionEnabled=true",
            "Set action on composite alarm: publish to marketplace-notifications SNS with message including dashboard link and runbook URL — individual alarms send low-priority email only",
            "Configure alarm actions per state: ALARM action = SNS publish; OK action = SNS publish 'incident resolved'; INSUFFICIENT_DATA action = SNS publish warning (metric collection may have stopped)",
            "Create a second Composite Alarm marketplace-degraded-alarm using OR logic: 'ALARM(marketplace-order-error-alarm) OR ALARM(marketplace-alb-5xx-alarm)' — fires at lower severity for team awareness Slack messages",
            "Enable alarm history retention: CloudWatch stores alarm state change history for 14 days; use it in post-mortems to reconstruct exactly when each alarm fired and in what order",
        ],
        flow: ["Individual alarms evaluate metrics", "Each reports OK/ALARM/INSUFFICIENT_DATA", "Composite evaluates rule (AND/OR)", "Composite fires only on true incident", "SNS → on-call page"],
        examTips: [
            "Composite Alarms reduce alert fatigue by combining multiple alarms with AND/OR logic — they are the recommended pattern for production paging; individual alarms should only send low-noise notifications",
            "TreatMissingData options: notBreaching (treats missing as OK), breaching (treats missing as ALARM), ignore (keeps current state), missing (INSUFFICIENT_DATA) — for Lambda, use notBreaching (no invocations = no errors)",
            "INSUFFICIENT_DATA is the initial state when an alarm is created and also occurs when the metric has no data points in the evaluation period — it is NOT the same as OK",
            "Alarm evaluation period: the alarm evaluates M out of N data points — e.g. 3 out of 5 consecutive 1-minute periods must breach the threshold before firing, reducing false positives from transient spikes",
            "Alarms can only trigger SNS, EC2 actions (reboot/stop/terminate), ASG scaling policies, or Systems Manager OpsCenter items — they CANNOT directly invoke Lambda; use SNS → Lambda for Lambda-based remediation",
        ],
        roleJson: [
            {
                label: "AWS CLI — create composite alarm combining three individual alarms",
                note: "💡 Set TreatMissingData=notBreaching on Lambda and SQS alarms — if a Lambda is not invoked or a queue is empty, you want the alarm to stay OK, not flip to INSUFFICIENT_DATA.",
                code: `# Create individual Lambda error alarm
aws cloudwatch put-metric-alarm \\
  --alarm-name marketplace-order-error-alarm \\
  --namespace AWS/Lambda \\
  --metric-name Errors \\
  --dimensions Name=FunctionName,Value=marketplace-order-processor \\
  --statistic Sum --period 300 --threshold 5 \\
  --comparison-operator GreaterThanOrEqualToThreshold \\
  --evaluation-periods 1 --treat-missing-data notBreaching

# Create DLQ depth alarm
aws cloudwatch put-metric-alarm \\
  --alarm-name marketplace-dlq-depth-alarm \\
  --namespace AWS/SQS \\
  --metric-name ApproximateNumberOfMessagesVisible \\
  --dimensions Name=QueueName,Value=order-events-dlq \\
  --statistic Sum --period 60 --threshold 1 \\
  --comparison-operator GreaterThanOrEqualToThreshold \\
  --evaluation-periods 1 --treat-missing-data notBreaching

# Create Composite Alarm (AND logic — fires only when ALL alarms are in ALARM)
aws cloudwatch put-composite-alarm \\
  --alarm-name marketplace-critical-incident-alarm \\
  --alarm-rule "ALARM(marketplace-order-error-alarm) AND ALARM(marketplace-dlq-depth-alarm) AND ALARM(marketplace-alb-5xx-alarm)" \\
  --alarm-actions arn:aws:sns:ap-southeast-1:234567890123:marketplace-notifications`,
            },
        ],
    },

    {
        id: 4,
        analogy: "Think of it like a flight recorder (black box) installed in every aircraft — it silently records every cockpit action, every instrument reading, and every radio transmission during the flight. After a crash, investigators replay the black box to reconstruct exactly what happened, in what order, and who did what. CloudTrail is AWS's black box.",
        icon: "🛡️",
        color: ACCENT.orange,
        tag: "SCENARIO 4",
        title: "AWS CloudTrail",
        subtitle: "Organisation-wide API audit trail for compliance and incident forensics",
        useCase: {
            title: "AMI PVT LTD Marketplace — CloudTrail org-wide trail recording all API calls across marketplace-prod, customer, and management accounts",
            story: "AMI PVT LTD creates an organisational CloudTrail trail marketplace-org-trail from the management account (123456789012). The trail records all Management Events (API calls to AWS control plane: CreateStack, DeleteBucket, AttachRolePolicy, etc.) across every member account and delivers logs to S3 marketplace-tool-artifacts/cloudtrail-logs/ in the management account with SSE-KMS encryption. Data Events are selectively enabled for S3 marketplace-tool-artifacts (GetObject, PutObject, DeleteObject) and Lambda marketplace-order-processor (InvokeFunction) to track who accessed sensitive tool artifacts and who invoked the function. When a security alert fires — an IAM role was deleted in a customer account — CloudTrail provides the exact API call, user identity, source IP, timestamp, and all request parameters.",
            diagram: [
                { actor: "Any IAM user / role / service in any account makes an API call", icon: "👤" },
                { arrow: "API call recorded by CloudTrail" },
                { actor: "CloudTrail — marketplace-org-trail (organisational, all accounts)", icon: "🛡️" },
                { arrow: "delivers log files (15-min intervals)" },
                { actor: "S3 marketplace-tool-artifacts/cloudtrail-logs/ (SSE-KMS encrypted)", icon: "🪣" },
                { arrow: "EventBridge rule detects DeleteRole event" },
                { actor: "marketplace-notifications SNS → security alert to ops team", icon: "🚨" },
            ],
        },
        buildSystem: [
            "Create organisational trail from management account: aws cloudtrail create-trail --name marketplace-org-trail --s3-bucket-name marketplace-tool-artifacts --s3-key-prefix cloudtrail-logs --is-organization-trail --is-multi-region-trail",
            "Enable SSE-KMS encryption on the trail using marketplace-cloudtrail-key KMS CMK; add KMS key policy allowing CloudTrail service principal to GenerateDataKey and Decrypt",
            "Enable Management Events with ReadWriteType=All — records all control-plane API calls (CreateInstance, DeleteBucket, etc.); disable read-only events if cost is a concern (most security-relevant events are write events)",
            "Enable Data Events selectively: add S3 selector for arn:aws:s3:::marketplace-tool-artifacts/ (GetObject, PutObject, DeleteObject) and Lambda selector for arn:aws:lambda:ap-southeast-1:234567890123:function:marketplace-order-processor",
            "Enable Log File Validation: --enable-log-file-validation — CloudTrail creates a SHA-256 digest file every hour so you can cryptographically verify that log files have not been tampered with",
            "Create EventBridge rule on the management account event bus: event source=aws.iam, detail-type=AWS API Call via CloudTrail, detail.eventName=DeleteRole OR DetachRolePolicy — target=marketplace-notifications SNS for real-time security alerting",
            "Enable CloudTrail Lake marketplace-audit-lake as a managed query store: copy events from the S3 trail into the lake; run SQL queries to find all API calls by a specific user in the last 90 days without Athena setup",
            "Configure S3 bucket policy on marketplace-tool-artifacts/cloudtrail-logs/: deny s3:DeleteObject and s3:PutObject except from CloudTrail service principal — prevents tampering with audit logs",
        ],
        flow: ["API call made in any account", "CloudTrail records event (15 min delivery)", "Delivered to S3 (SSE-KMS)", "EventBridge detects security event", "SNS alert → ops team"],
        examTips: [
            "CloudTrail logs API activity — WHO called WHAT API, WHEN, from WHERE; CloudWatch Logs captures application-level logs; they are complementary, not alternatives",
            "CloudTrail delivers log files to S3 within 15 minutes of the API call; EventBridge can receive CloudTrail events in near-real-time (within seconds) for real-time alerting via the management event bus",
            "CloudTrail Data Events are disabled by default and incur additional cost — enable them selectively for high-sensitivity resources (S3 objects, Lambda invocations, DynamoDB items)",
            "Log File Validation uses SHA-256 hashing to detect any tampering with delivered log files — always enable it for compliance trails; validation is done with the aws cloudtrail validate-logs command",
            "Organisational trails (is-organization-trail=true) created in the management account automatically apply to ALL current and future member accounts — member accounts can view but cannot modify or delete the trail",
        ],
        roleJson: [
            {
                label: "AWS CLI — create organisational CloudTrail trail with data events",
                note: "💡 Always enable --is-multi-region-trail for organisational trails — without it, API calls in other regions (e.g. us-east-1 for IAM global service) are not recorded.",
                code: `# Create multi-region organisational trail
aws cloudtrail create-trail \\
  --name marketplace-org-trail \\
  --s3-bucket-name marketplace-tool-artifacts \\
  --s3-key-prefix cloudtrail-logs \\
  --is-organization-trail \\
  --is-multi-region-trail \\
  --enable-log-file-validation \\
  --kms-key-id alias/marketplace-cloudtrail-key

# Start logging
aws cloudtrail start-logging --name marketplace-org-trail

# Enable Data Events for S3 and Lambda
aws cloudtrail put-event-selectors \\
  --trail-name marketplace-org-trail \\
  --event-selectors '[
    {
      "ReadWriteType": "All",
      "IncludeManagementEvents": true,
      "DataResources": [
        {"Type": "AWS::S3::Object", "Values": ["arn:aws:s3:::marketplace-tool-artifacts/"]},
        {"Type": "AWS::Lambda::Function", "Values": ["arn:aws:lambda:ap-southeast-1:234567890123:function:marketplace-order-processor"]}
      ]
    }
  ]'`,
            },
        ],
    },

    {
        id: 5,
        analogy: "Think of it like GPS turn-by-turn navigation for a parcel — instead of just knowing the parcel left Warehouse A and arrived at House B, you can see exactly which roads it took, how long it spent at each sorting facility, which highway it got stuck on, and precisely where the 20-minute delay happened. X-Ray gives you that same turn-by-turn trace for every request through your microservices.",
        icon: "🔭",
        color: ACCENT.purple,
        tag: "SCENARIO 5",
        title: "AWS X-Ray",
        subtitle: "Distributed tracing across Lambda, API Gateway, and DynamoDB for the order flow",
        useCase: {
            title: "AMI PVT LTD Marketplace — X-Ray tracing the full order purchase path from API Gateway through Lambda to DynamoDB and SNS",
            story: "Buyers report occasional slow order processing (>5 seconds) but CloudWatch metrics only show average latency — they cannot identify which step is slow. AMI PVT LTD enables X-Ray active tracing on marketplace-api-gw (API Gateway), marketplace-order-processor Lambda, and the Step Functions marketplace-order-workflow. X-Ray automatically creates a Service Map showing: API Gateway (p50=120ms) → Lambda cold start (p99=1,800ms) → DynamoDB PutItem (p99=45ms) → SNS Publish (p99=30ms). The Service Map immediately reveals that Lambda cold starts (provisioned concurrency not fully warmed) account for 90% of the slow requests. X-Ray groups and sampling rules are configured to capture 100% of traces where the total duration exceeds 2 seconds, ensuring all slow outliers are captured without 100% sampling cost.",
            diagram: [
                { actor: "Buyer → API Gateway marketplace-api-gw (X-Ray active tracing)", icon: "🚪" },
                { arrow: "trace context propagated via X-Amzn-Trace-Id header" },
                { actor: "marketplace-order-processor Lambda (X-Ray active tracing)", icon: "⚡" },
                { arrow: "X-Ray SDK creates subsegments for each AWS call" },
                { actor: "DynamoDB Orders / SNS marketplace-notifications / Secrets Manager", icon: "🗄️" },
                { arrow: "all segments aggregated into" },
                { actor: "X-Ray Service Map + Trace Timeline (end-to-end latency breakdown)", icon: "🔭" },
            ],
        },
        buildSystem: [
            "Enable X-Ray active tracing on marketplace-api-gw: aws apigateway update-stage --rest-api-id abc123 --stage-name prod --patch-operations op=replace,path=/tracingEnabled,value=true",
            "Enable X-Ray active tracing on marketplace-order-processor Lambda: aws lambda update-function-configuration --function-name marketplace-order-processor --tracing-config Mode=Active",
            "Install X-Ray SDK in the Node.js Lambda: npm install aws-xray-sdk; wrap the AWS SDK: const AWS = AWSXRay.captureAWS(require('aws-sdk')); this automatically creates subsegments for every DynamoDB, SNS, and SQS call",
            "Add custom annotations to Lambda traces: seg.addAnnotation('orderId', orderId); seg.addAnnotation('sellerId', sellerId) — annotations are indexed and allow filtering traces in the X-Ray console by orderId",
            "Enable X-Ray on Step Functions marketplace-order-workflow: set tracingConfiguration.enabled=true; X-Ray propagates the trace across all Task states and shows each Lambda as a separate subsegment in the Service Map",
            "Configure X-Ray Sampling Rules: create rule marketplace-slow-requests (priority=1, reservoir=1, rate=1.0, attributes: url_path=/api/orders/*, http_method=POST) to capture 100% of order API calls; default rule captures 5% of everything else",
            "Create X-Ray Group marketplace-slow-orders with filter expression: ResponseTime > 2 — group all traces where total duration >2 seconds; set up CloudWatch Alarm on the group's ErrorRate metric to alert when slow orders spike",
            "Install X-Ray Daemon on marketplace-api-asg EC2 instances via CloudFormation UserData or SSM; the daemon buffers segments and uploads them to the X-Ray service in batches — no direct SDK → X-Ray API calls needed",
        ],
        flow: ["Request enters API Gateway", "Trace ID propagated downstream", "SDK creates segment per service", "X-Ray Daemon uploads segments", "Service Map + Timeline in console"],
        examTips: [
            "X-Ray traces require the X-Ray SDK in your application code AND the X-Ray Daemon on EC2 (or Active Tracing on Lambda/API Gateway) — enabling active tracing alone without the SDK does not capture subsegments for downstream calls",
            "Annotations are indexed key-value pairs that you can filter on in the X-Ray console — they are searchable; Metadata is not indexed and cannot be used for filtering",
            "X-Ray Sampling: not all requests are traced by default (would be too expensive) — the default sampling rule traces 1 request/second + 5% of additional requests; custom rules let you trace 100% of specific patterns",
            "X-Ray Service Map shows the health of connections between services (error rate, latency p50/p99) — it is the fastest way to identify WHICH service in a chain is causing latency, not just that latency exists",
            "X-Ray is an active tracing tool — it adds slight latency overhead (~1ms) to each instrumented call; for Lambda, enabling Active Tracing adds the X-Ray Daemon as a built-in layer; you do not deploy it manually",
        ],
        roleJson: [
            {
                label: "Node.js — instrument Lambda with X-Ray SDK for automatic subsegments",
                note: "💡 Wrap the AWS SDK with AWSXRay.captureAWS() — this automatically creates subsegments for every DynamoDB, SQS, SNS, and S3 call without writing any additional tracing code.",
                code: `// In marketplace-order-processor Lambda (Node.js)
const AWSXRay = require('aws-xray-sdk');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

// All AWS SDK calls below are automatically traced as X-Ray subsegments
const dynamodb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();

exports.handler = async (event) => {
    const segment = AWSXRay.getSegment();

    // Add custom annotation (indexed — filterable in X-Ray console)
    segment.addAnnotation('orderId', event.orderId);
    segment.addAnnotation('environment', 'prod');

    // Add custom metadata (not indexed — for debugging only)
    segment.addMetadata('rawPayload', event);

    // These DynamoDB and SNS calls automatically create subsegments
    await dynamodb.put({ TableName: 'Orders', Item: {...event} }).promise();
    await sns.publish({ TopicArn: process.env.SNS_TOPIC_ARN, Message: JSON.stringify(event) }).promise();
};

# Enable X-Ray on Lambda via CLI
# aws lambda update-function-configuration \\
#   --function-name marketplace-order-processor \\
#   --tracing-config Mode=Active`,
            },
        ],
    },

    {
        id: 6,
        analogy: "Think of it like a building's smart security camera network — instead of someone watching each camera feed separately, an intelligent system (EventBridge) watches all cameras at once and automatically triggers specific responses when certain patterns are detected: if Camera 3 (CloudTrail) detects someone entering the server room after hours, it automatically locks the doors (Lambda) and calls the security guard (SNS) without any human needing to be awake and watching.",
        icon: "🔔",
        color: ACCENT.green,
        tag: "SCENARIO 6",
        title: "Amazon EventBridge + CloudWatch Events",
        subtitle: "Event-driven automation for scheduled jobs and security response",
        useCase: {
            title: "AMI PVT LTD Marketplace — EventBridge rules for nightly cleanup, IAM change alerts, and Config remediation",
            story: "AMI PVT LTD uses EventBridge as the automation backbone for the marketplace platform. Three EventBridge rules run on the management event bus: (1) marketplace-nightly-cleanup: cron schedule (0 2 * * ? *) triggers marketplace-cleanup-lambda every night at 02:00 UTC to archive orders older than 90 days; (2) marketplace-iam-change-alert: event pattern matching CloudTrail events where eventSource=iam.amazonaws.com AND eventName=AttachRolePolicy OR CreateUser — publishes to marketplace-notifications SNS within seconds of any IAM change for the security team; (3) marketplace-config-remediation: event pattern on AWS Config NON_COMPLIANT findings for specific rule IDs — invokes SSM Automation runbooks to auto-remediate non-compliant S3 buckets. The custom event bus marketplace-tool-deployment-bus handles cross-account events from customer accounts during tool deployment.",
            diagram: [
                { actor: "CloudTrail (IAM change) / AWS Config (NON_COMPLIANT) / Cron schedule", icon: "🔔" },
                { arrow: "events published to EventBridge event bus" },
                { actor: "EventBridge — marketplace event bus (event pattern rules)", icon: "⚡" },
                { arrow: "marketplace-nightly-cleanup rule (cron 02:00 UTC)" },
                { actor: "marketplace-cleanup-lambda (archive old orders)", icon: "⚡" },
                { arrow: "marketplace-iam-change-alert rule (IAM events)" },
                { actor: "marketplace-notifications SNS → security team Slack", icon: "🚨" },
            ],
        },
        buildSystem: [
            "Create EventBridge rule marketplace-nightly-cleanup: schedule=cron(0 2 * * ? *), target=Lambda ARN of marketplace-cleanup-lambda, input transformer adds {executionDate: <aws.events.event.time>} to the Lambda event",
            "Add Lambda resource-based policy allowing EventBridge to invoke marketplace-cleanup-lambda: aws lambda add-permission --action lambda:InvokeFunction --principal events.amazonaws.com --source-arn {rule-arn}",
            "Create EventBridge rule marketplace-iam-change-alert with event pattern: {\"source\": [\"aws.cloudtrail\"], \"detail-type\": [\"AWS API Call via CloudTrail\"], \"detail\": {\"eventSource\": [\"iam.amazonaws.com\"], \"eventName\": [\"AttachRolePolicy\",\"CreateUser\",\"DeleteRole\"]}}",
            "Set target of marketplace-iam-change-alert to marketplace-notifications SNS with input transformer: extract userName, eventName, sourceIPAddress from the event detail and format a readable alert message",
            "Create custom event bus marketplace-tool-deployment-bus; create resource-based policy allowing customer accounts to PutEvents — enables tool deployment completion events to flow from customer account to marketplace-prod",
            "Create EventBridge rule on marketplace-tool-deployment-bus matching {detail-type: [\"ToolDeploymentComplete\"]} — target Step Functions to trigger post-deployment verification workflow",
            "Create EventBridge Archive marketplace-events-archive on the default event bus: event pattern={} (capture all), retention=30 days — enables event replay to reprocess events after a downstream failure",
            "Enable EventBridge Schema Registry: auto-discover schemas for all events on the marketplace event buses; use generated code bindings (Java/TypeScript) in Spring Boot and Lambda functions for type-safe event handling",
        ],
        flow: ["Event source emits event", "EventBridge matches event pattern", "Rule targets triggered (Lambda/SNS/SFn)", "Dead-letter SQS on failure", "Archive enables event replay"],
        examTips: [
            "EventBridge is the evolution of CloudWatch Events — they share the same underlying infrastructure; the CloudWatch Events console redirects to EventBridge; EventBridge adds custom buses, SaaS integrations, and Schema Registry",
            "EventBridge event patterns are JSON-based and match on source, detail-type, and any field inside the event detail — the pattern is a partial match (you only need to specify the fields you care about)",
            "EventBridge can deliver events cross-account and cross-region using Event Bus resource policies — the target event bus must have a policy allowing PutEvents from the source account",
            "EventBridge Archive + Replay allows you to capture all events and replay them to a target — crucial for disaster recovery scenarios where downstream services missed events during an outage",
            "EventBridge Pipes connect event sources (SQS, Kinesis, DynamoDB Streams) directly to targets with optional filtering and enrichment Lambda — eliminates the need for a pass-through Lambda that just reads and forwards events",
        ],
        roleJson: [
            {
                label: "AWS CLI — create scheduled rule and IAM change alert rule",
                note: "💡 Use Input Transformers on EventBridge targets to reshape the raw event JSON before it reaches Lambda or SNS — this avoids writing a pass-through Lambda just to reformat the payload.",
                code: `# Create nightly cleanup scheduled rule
aws events put-rule \\
  --name marketplace-nightly-cleanup \\
  --schedule-expression "cron(0 2 * * ? *)" \\
  --state ENABLED \\
  --description "Nightly archive of orders older than 90 days"

# Add Lambda as target with input transformer
aws events put-targets \\
  --rule marketplace-nightly-cleanup \\
  --targets '[{
    "Id": "CleanupLambda",
    "Arn": "arn:aws:lambda:ap-southeast-1:234567890123:function:marketplace-cleanup-lambda",
    "InputTransformer": {
      "InputPathsMap": {"time": "$.time"},
      "InputTemplate": "{\"executionDate\": \"<time>\", \"environment\": \"prod\"}"
    }
  }]'

# Create IAM change alert rule (event pattern)
aws events put-rule \\
  --name marketplace-iam-change-alert \\
  --event-pattern '{"source":["aws.cloudtrail"],"detail-type":["AWS API Call via CloudTrail"],"detail":{"eventSource":["iam.amazonaws.com"],"eventName":["AttachRolePolicy","CreateUser","DeleteRole"]}}' \\
  --state ENABLED`,
            },
        ],
    },
];

export default scenarios;
