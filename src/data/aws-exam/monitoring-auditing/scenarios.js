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
        cdkCode: [
            {
                label: "AWS CDK v2 — CloudWatch Dashboard with default and custom metric widgets",
                note: "💡 Use Metric objects with statistic='p99' to display percentile statistics on the dashboard — CDK's GraphWidget accepts any Metric with any statistic string.",
                code: `import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

// Custom metric: OrderProcessingDurationMs (MarketplacePlatform namespace)
const orderDurationMetric = new cloudwatch.Metric({
  namespace: 'MarketplacePlatform',
  metricName: 'OrderProcessingDurationMs',
  dimensionsMap: { FunctionName: 'marketplace-order-processor', Environment: 'prod' },
  statistic: 'p99',
  period: cdk.Duration.minutes(5),
});

// Default Lambda errors metric
const lambdaErrorsMetric = new cloudwatch.Metric({
  namespace: 'AWS/Lambda',
  metricName: 'Errors',
  dimensionsMap: { FunctionName: 'marketplace-order-processor' },
  statistic: 'Sum',
  period: cdk.Duration.minutes(5),
});

// Default RDS connections metric
const rdsConnectionsMetric = new cloudwatch.Metric({
  namespace: 'AWS/RDS',
  metricName: 'DatabaseConnections',
  dimensionsMap: { DBInstanceIdentifier: 'marketplace-orders-db' },
  statistic: 'Average',
  period: cdk.Duration.minutes(5),
});

// CloudWatch Dashboard: marketplace-ops-dashboard
const opsDashboard = new cloudwatch.Dashboard(this, 'MarketplaceOpsDashboard', {
  dashboardName: 'marketplace-ops-dashboard',
  widgets: [
    [
      new cloudwatch.GraphWidget({
        title: 'Order Processing Duration (p99)',
        left: [orderDurationMetric],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Errors',
        left: [lambdaErrorsMetric],
        width: 6,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'RDS Connections',
        metrics: [rdsConnectionsMetric],
        width: 6,
      }),
    ],
  ],
});`,
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
        cdkCode: [
            {
                label: "AWS CDK v2 — CloudWatch Log Group with retention and Metric Filter",
                note: "💡 Create the log group explicitly in CDK with a retention policy — if Lambda creates it implicitly, there is no retention set and you will be billed for indefinite log storage.",
                code: `import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

// Lambda log group with 90-day retention
const orderProcessorLogGroup = new logs.LogGroup(this, 'OrderProcessorLogGroup', {
  logGroupName: '/aws/lambda/marketplace-order-processor',
  retention: logs.RetentionDays.THREE_MONTHS, // 90 days
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// Spring Boot EC2 application log group
const springBootLogGroup = new logs.LogGroup(this, 'SpringBootLogGroup', {
  logGroupName: '/marketplace/ec2/spring-boot-api',
  retention: logs.RetentionDays.THREE_MONTHS,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// Metric Filter: count PAYMENT_FAILED log lines as LambdaPaymentErrors metric
const paymentErrorFilter = new logs.MetricFilter(this, 'PaymentFailedFilter', {
  logGroup: orderProcessorLogGroup,
  filterName: 'marketplace-payment-failures',
  filterPattern: logs.FilterPattern.literal('PAYMENT_FAILED'),
  metricNamespace: 'MarketplacePlatform',
  metricName: 'LambdaPaymentErrors',
  metricValue: '1',
  defaultValue: 0,
});

// Alarm on LambdaPaymentErrors > 0 (any payment failure triggers SNS)
const paymentErrorAlarm = new cloudwatch.Alarm(this, 'PaymentErrorAlarm', {
  alarmName: 'marketplace-payment-errors-alarm',
  metric: paymentErrorFilter.metric({ statistic: 'Sum', period: cdk.Duration.minutes(1) }),
  threshold: 1,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  alarmDescription: 'Fires when any PAYMENT_FAILED log line appears',
});`,
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
        cdkCode: [
            {
                label: "AWS CDK v2 — individual alarms and composite alarm for incident detection",
                note: "💡 Use CompositeAlarm in CDK with alarmRule built from Alarm.anyAlarmInAlarm() or a custom expression string — CompositeAlarm supports both AND and OR logic via the alarmRule property.",
                code: `import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cw_actions from 'aws-cdk-lib/aws-cloudwatch-actions';

const notificationsTopic = sns.Topic.fromTopicArn(
  this, 'NotificationsTopic',
  \`arn:aws:sns:\${this.region}:\${this.account}:marketplace-notifications\`
);

// Individual alarm 1: Lambda errors > 5 in 5 min
const orderErrorAlarm = new cloudwatch.Alarm(this, 'OrderErrorAlarm', {
  alarmName: 'marketplace-order-error-alarm',
  metric: new cloudwatch.Metric({
    namespace: 'AWS/Lambda',
    metricName: 'Errors',
    dimensionsMap: { FunctionName: 'marketplace-order-processor' },
    statistic: 'Sum',
    period: cdk.Duration.minutes(5),
  }),
  threshold: 5,
  evaluationPeriods: 1,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

// Individual alarm 2: DLQ depth >= 1
const dlqDepthAlarm = new cloudwatch.Alarm(this, 'DlqDepthAlarm', {
  alarmName: 'marketplace-dlq-depth-alarm',
  metric: new cloudwatch.Metric({
    namespace: 'AWS/SQS',
    metricName: 'ApproximateNumberOfMessagesVisible',
    dimensionsMap: { QueueName: 'order-events-dlq' },
    statistic: 'Sum',
    period: cdk.Duration.minutes(1),
  }),
  threshold: 1,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

// Individual alarm 3: ALB 5xx > 10 in 5 min
const alb5xxAlarm = new cloudwatch.Alarm(this, 'Alb5xxAlarm', {
  alarmName: 'marketplace-alb-5xx-alarm',
  metric: new cloudwatch.Metric({
    namespace: 'AWS/ApplicationELB',
    metricName: 'HTTPCode_Target_5XX_Count',
    dimensionsMap: { LoadBalancer: 'marketplace-alb' },
    statistic: 'Sum',
    period: cdk.Duration.minutes(5),
  }),
  threshold: 10,
  evaluationPeriods: 1,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

// Composite alarm: ALL three must be ALARM simultaneously
const criticalIncidentAlarm = new cloudwatch.CompositeAlarm(this, 'CriticalIncidentAlarm', {
  compositeAlarmName: 'marketplace-critical-incident-alarm',
  alarmRule: cloudwatch.AlarmRule.allOf(orderErrorAlarm, dlqDepthAlarm, alb5xxAlarm),
});
criticalIncidentAlarm.addAlarmAction(new cw_actions.SnsAction(notificationsTopic));`,
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
        cdkCode: [
            {
                label: "CDK — Org-wide CloudTrail trail with KMS encryption and data events",
                note: "CDK L2 Trail supports most options, but isOrganizationTrail requires CfnTrail or deploying from the management account. Use addS3EventSelector and addLambdaEventSelector for data events.",
                code: `import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';

const cloudtrailKey = kms.Key.fromAlias(this, 'CloudTrailKey', 'alias/marketplace-cloudtrail-key');
const trailBucket = s3.Bucket.fromBucketName(this, 'TrailBucket', 'marketplace-tool-artifacts');

const orgTrail = new cloudtrail.Trail(this, 'MarketplaceOrgTrail', {
  trailName: 'marketplace-org-trail',
  bucket: trailBucket,
  s3KeyPrefix: 'cloudtrail-logs',
  encryptionKey: cloudtrailKey,
  isMultiRegionTrail: true,
  includeGlobalServiceEvents: true,
  enableFileValidation: true,
  sendToCloudWatchLogs: false,
});

// Enable S3 data events for marketplace-tool-artifacts
orgTrail.addS3EventSelector([{ bucket: trailBucket }]);

// Enable Lambda data events for order processor
const orderFn = lambda.Function.fromFunctionName(
  this, 'OrderProcessor', 'marketplace-order-processor'
);
orgTrail.addLambdaEventSelector([orderFn]);`,
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
        cdkCode: [
            {
                label: "CDK — Enable X-Ray active tracing on Lambda and API Gateway",
                note: "Set tracing: lambda.Tracing.ACTIVE on the Function and deployOptions.tracingEnabled=true on the RestApi stage. The X-Ray Daemon is bundled as a built-in Lambda layer automatically.",
                code: `import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as xray from 'aws-cdk-lib/aws-xray';

const orderProcessorFn = new lambda.Function(this, 'OrderProcessor', {
  functionName: 'marketplace-order-processor',
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/order-processor'),
  tracing: lambda.Tracing.ACTIVE,  // X-Ray active tracing — adds daemon as built-in layer
  environment: { POWERTOOLS_SERVICE_NAME: 'marketplace-order-processor' },
});

const api = new apigateway.RestApi(this, 'MarketplaceApiGw', {
  restApiName: 'marketplace-api-gw',
  deployOptions: {
    stageName: 'prod',
    tracingEnabled: true,       // X-Ray active tracing on API Gateway
    metricsEnabled: true,
    loggingLevel: apigateway.MethodLoggingLevel.INFO,
    dataTraceEnabled: false,
  },
});

// X-Ray sampling rule to capture 100% of slow orders (>2s)
new xray.CfnSamplingRule(this, 'SlowOrderSamplingRule', {
  samplingRule: {
    ruleName: 'marketplace-slow-requests',
    priority: 1,
    reservoirSize: 1,
    fixedRate: 1.0,
    urlPath: '/api/orders/*',
    httpMethod: 'POST',
    host: '*',
    serviceName: 'marketplace-api-gw',
    serviceType: 'AWS::ApiGateway::Stage',
    resourceArn: '*',
    version: 1,
  },
});`,
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
        cdkCode: [
            {
                label: "CDK — EventBridge scheduled rule + IAM change alert rule",
                note: "Use events.Schedule.cron() for scheduled rules and eventPattern for CloudTrail-sourced IAM change detection. Targets.SnsTopic delivers the alert to marketplace-notifications.",
                code: `import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';

const cleanupFn = lambda.Function.fromFunctionName(
  this, 'CleanupFn', 'marketplace-cleanup-lambda'
);
const notificationsTopic = sns.Topic.fromTopicArn(
  this, 'Notifications',
  'arn:aws:sns:ap-southeast-1:234567890123:marketplace-notifications'
);

// Nightly cleanup — 02:00 UTC every day
const nightlyRule = new events.Rule(this, 'NightlyCleanup', {
  ruleName: 'marketplace-nightly-cleanup',
  schedule: events.Schedule.cron({ minute: '0', hour: '2' }),
  description: 'Archive orders older than 90 days',
});
nightlyRule.addTarget(new targets.LambdaFunction(cleanupFn, {
  event: events.RuleTargetInput.fromObject({
    environment: 'prod',
    executionDate: events.EventField.time,
  }),
}));

// IAM change alert — triggers on CloudTrail IAM events
const iamAlertRule = new events.Rule(this, 'IamChangeAlert', {
  ruleName: 'marketplace-iam-change-alert',
  eventPattern: {
    source: ['aws.cloudtrail'],
    detailType: ['AWS API Call via CloudTrail'],
    detail: {
      eventSource: ['iam.amazonaws.com'],
      eventName: ['AttachRolePolicy', 'CreateUser', 'DeleteRole', 'DetachRolePolicy'],
    },
  },
});
iamAlertRule.addTarget(new targets.SnsTopic(notificationsTopic));

// Custom event bus for cross-account tool deployment events
const toolDeploymentBus = new events.EventBus(this, 'ToolDeploymentBus', {
  eventBusName: 'marketplace-tool-deployment-bus',
});`,
            },
        ],
    },
    {
        id: 7,
        analogy: "Think of it like a multinational corporation's centralised security operations centre (SOC) — instead of each regional office (AWS account) keeping its own security incident binder (CloudTrail logs, VPC Flow Logs, GuardDuty findings), a specialised team (Security Lake) automatically collects every binder from every office, translates them all into a single standard report format (OCSF), and files them in one secure archive room (S3) that any analyst tool can query — without any manual collection, formatting, or filing.",
        icon: "🛡️",
        color: ACCENT.red,
        tag: "SCENARIO 7",
        title: "Amazon Security Lake",
        subtitle: "Centralised, OCSF-normalised security data lake across all AWS accounts and Regions",
        useCase: {
            title: "Enterprise organisation — Security Lake aggregating CloudTrail, VPC Flow Logs, GuardDuty, and third-party SIEM feeds from multiple AWS accounts into a single S3-backed security data lake",
            story: "A multinational enterprise operates 15 AWS accounts across 3 Regions (ap-southeast-1, us-east-1, eu-west-1). The security team needs to evaluate posture and detect threats across all accounts without building custom ETL pipelines. They enable Amazon Security Lake in the Security Hub delegated administrator account. Security Lake automatically collects CloudTrail management events, VPC Flow Logs, Route 53 Resolver query logs, AWS Lambda data events, Amazon EKS audit logs, and GuardDuty findings from all 15 accounts. All data is automatically normalised to the Open Cybersecurity Schema Framework (OCSF) v1.1 and stored in partitioned Apache Parquet format in S3. The security team grants subscriber access to Amazon Security Hub, Amazon OpenSearch Service, and a third-party SIEM (Splunk) — each tool queries the OCSF-normalised data without custom parsing. Retention policies archive data to S3 Glacier after 90 days.",
            diagram: [
                { actor: "15 AWS accounts (3 Regions) — CloudTrail, VPC Flow Logs, GuardDuty, EKS audit logs", icon: "🏢" },
                { arrow: "Security Lake automatically ingests — no custom ETL needed" },
                { actor: "Amazon Security Lake (delegated admin account)", icon: "🛡️" },
                { arrow: "normalises to OCSF v1.1 → Parquet partitioned by account/region/date" },
                { actor: "S3 security-lake-{accountId}-{region} (managed by Security Lake)", icon: "🪣" },
                { arrow: "subscriber query access" },
                { actor: "Amazon Security Hub / OpenSearch / Splunk (SIEM subscribers)", icon: "🔍" },
            ],
        },
        buildSystem: [
            "Enable AWS Organizations and designate a delegated administrator account for Security Lake (security-audit-account 999988887777) — this account manages Security Lake configuration for all member accounts",
            "Enable Security Lake in the delegated admin account for all required Regions: aws securitylake create-data-lake for each Region; Security Lake creates the S3 bucket, Glue Data Catalog, and IAM roles automatically",
            "Configure log sources for all organization accounts: aws securitylake create-aws-log-source — enable CLOUD_TRAIL_MGMT, VPC_FLOW, ROUTE53, LAMBDA_EXECUTION, EKS_AUDIT, GUARD_DUTY across all accounts and all 3 Regions",
            "Add third-party custom sources (Splunk on-prem, Palo Alto firewall logs): aws securitylake create-custom-log-source — Security Lake provides an S3 ingestion path and SQS notification queue for external sources to write OCSF-formatted events",
            "Create Security Lake subscribers for each consuming tool: aws securitylake create-subscriber — grant Amazon Security Hub access as an S3 data access subscriber; grant OpenSearch access; grant Splunk Cloud access via SQS notification (event-based) or S3 direct query",
            "Configure retention lifecycle: set Security Lake to retain hot data (standard S3) for 90 days, then transition to S3 Glacier Instant Retrieval for 1 year, then Glacier Deep Archive for 7-year compliance retention",
            "Enable Security Lake rollup Region (ap-southeast-1 as primary): replicates all OCSF data from us-east-1 and eu-west-1 into a single rollup Region so the SOC team can run cross-Region queries from one S3 location",
            "Verify ingestion: aws securitylake list-log-sources and check CloudWatch metric SecurityLakeObjectCount per source type; confirm Parquet files appear in the S3 bucket under the expected partition structure (region/accountId/eventDay/)",
        ],
        flow: ["Security Lake enabled org-wide", "Sources auto-ingested (CloudTrail, VPC Flow, GuardDuty)", "Normalised to OCSF Parquet in S3", "Subscribers query via S3/SQS", "Retention → Glacier after 90 days"],
        examTips: [
            "Amazon Security Lake is the correct answer when the question asks for centralised security data with least development effort — it auto-ingests AWS native sources (CloudTrail, VPC Flow Logs, GuardDuty, Route 53, EKS), normalises to OCSF, and stores in S3 without any custom ETL code",
            "OCSF (Open Cybersecurity Schema Framework) is the key differentiator — Security Lake normalises all security events into a single schema, so SIEM tools and analytics engines can query data from different sources without custom parsers",
            "Security Lake stores data in Apache Parquet format in YOUR S3 bucket — the data is in your account (not AWS's), partitioned by account/region/date for efficient querying with Athena, OpenSearch, or any Parquet-compatible tool",
            "Subscribers are the consumption layer — Security Lake supports two subscriber types: S3 data access (polling/query-based, e.g. Athena, Splunk) and SQS notification-based (event-driven, e.g. real-time SIEM ingestion); configure based on latency requirements",
            "Security Lake vs manually configured S3 + CloudTrail + Athena: Security Lake eliminates 5–10 custom Lambda functions, Glue crawlers, and schema-conversion jobs — it is the low-effort option for the exam and in practice",
            "Exam trigger keywords: 'centralize security data', 'multiple accounts', 'least development effort', 'normalize security logs', 'OCSF', 'security data lake', 'third-party SIEM integration' — all point to Amazon Security Lake",
            "Security Lake requires AWS Organizations + a delegated administrator account — it cannot be enabled on a single standalone account without Organizations; this is a key constraint when the question mentions multi-account security centralization",
        ],
        roleJson: [
            {
                label: "AWS CLI — enable Security Lake org-wide, configure sources, and create subscribers",
                note: "💡 Enable Security Lake in the delegated administrator account FIRST — member accounts automatically start sending log sources once Security Lake is enabled at the org level; no per-account configuration is required.",
                code: `# Step 1 — Enable Security Lake in each required Region (run in delegated admin account)
aws securitylake create-data-lake \\
  --configurations '[
    {
      "region": "ap-southeast-1",
      "encryptionConfiguration": {"kmsKeyId": "alias/security-lake-key"},
      "lifecycleConfiguration": {
        "transitions": [{"days": 90, "storageClass": "GLACIER_IR"}],
        "expiration": {"days": 2555}
      },
      "replicationConfiguration": {
        "regions": ["us-east-1", "eu-west-1"],
        "roleArn": "arn:aws:iam::999988887777:role/SecurityLakeReplicationRole"
      }
    }
  ]' \\
  --meta-store-manager-role-arn arn:aws:iam::999988887777:role/AmazonSecurityLakeMetaStoreManager \\
  --region ap-southeast-1

# Step 2 — Enable all critical AWS native log sources org-wide
aws securitylake create-aws-log-source \\
  --sources '[
    {"regions": ["ap-southeast-1","us-east-1","eu-west-1"], "sourceName": "CLOUD_TRAIL_MGMT",   "sourceVersion": "2.0"},
    {"regions": ["ap-southeast-1","us-east-1","eu-west-1"], "sourceName": "VPC_FLOW",            "sourceVersion": "2.0"},
    {"regions": ["ap-southeast-1","us-east-1","eu-west-1"], "sourceName": "GUARD_DUTY",          "sourceVersion": "2.0"},
    {"regions": ["ap-southeast-1","us-east-1","eu-west-1"], "sourceName": "ROUTE53",             "sourceVersion": "2.0"},
    {"regions": ["ap-southeast-1","us-east-1","eu-west-1"], "sourceName": "EKS_AUDIT",           "sourceVersion": "2.0"},
    {"regions": ["ap-southeast-1","us-east-1","eu-west-1"], "sourceName": "LAMBDA_EXECUTION",    "sourceVersion": "2.0"}
  ]' \\
  --region ap-southeast-1

# Step 3 — Create subscriber for Amazon Security Hub (S3 data access)
aws securitylake create-subscriber \\
  --subscriber-name security-hub-subscriber \\
  --subscriber-identity '{"principal": "securityhub.amazonaws.com", "externalId": "999988887777"}' \\
  --sources '[
    {"awsLogSource": {"sourceName": "CLOUD_TRAIL_MGMT", "sourceVersion": "2.0"}},
    {"awsLogSource": {"sourceName": "GUARD_DUTY",        "sourceVersion": "2.0"}}
  ]' \\
  --access-types S3 \\
  --region ap-southeast-1

# Step 4 — Create subscriber for Splunk SIEM (SQS event-based notification)
aws securitylake create-subscriber \\
  --subscriber-name splunk-siem-subscriber \\
  --subscriber-identity '{"principal": "arn:aws:iam::SPLUNK-ACCOUNT-ID:root", "externalId": "splunk-ext-id"}' \\
  --sources '[
    {"awsLogSource": {"sourceName": "VPC_FLOW",          "sourceVersion": "2.0"}},
    {"awsLogSource": {"sourceName": "CLOUD_TRAIL_MGMT",  "sourceVersion": "2.0"}}
  ]' \\
  --access-types SQS \\
  --region ap-southeast-1

# Step 5 — Verify ingestion
aws securitylake list-log-sources --region ap-southeast-1`,
            },
        ],
        cdkCode: [
            {
                label: "CDK (TypeScript) — Security Lake data lake + org-wide log sources + Security Hub subscriber",
                note: "💡 Security Lake has no L2 CDK constructs — use CfnDataLake and CfnAwsLogSource (L1). The MetaStoreManager IAM role must exist before the data lake is created; CDK dependency ordering handles this automatically.",
                code: `import * as cdk from 'aws-cdk-lib';
import * as securitylake from 'aws-cdk-lib/aws-securitylake';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export class SecurityLakeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const slKey = new kms.Key(this, 'SecurityLakeKey', {
      alias: 'security-lake-key',
      enableKeyRotation: true,
      description: 'CMK for Amazon Security Lake data at rest',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // MetaStoreManager role — required by Security Lake for Glue Data Catalog management
    const metaStoreRole = new iam.Role(this, 'MetaStoreManager', {
      roleName: 'AmazonSecurityLakeMetaStoreManager',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonSecurityLakeMetaStoreManagerV2'),
      ],
    });

    // Security Lake data lake — ap-southeast-1 as rollup region for all 3 regions
    const dataLake = new securitylake.CfnDataLake(this, 'DataLake', {
      encryptionConfiguration: { kmsKeyId: slKey.keyId },
      lifecycleConfiguration: {
        transitions: [{ days: 90, storageClass: 'GLACIER_IR' }],
        expiration: { days: 2555 },
      },
      replicationConfiguration: {
        regions: ['us-east-1', 'eu-west-1'],
        roleArn: \`arn:aws:iam::\${this.account}:role/SecurityLakeReplicationRole\`,
      },
      metaStoreManagerRoleArn: metaStoreRole.roleArn,
    });

    // Enable all critical AWS native log sources org-wide
    ['CLOUD_TRAIL_MGMT', 'VPC_FLOW', 'GUARD_DUTY', 'ROUTE53', 'EKS_AUDIT', 'LAMBDA_EXECUTION']
      .forEach((sourceName, idx) => {
        const src = new securitylake.CfnAwsLogSource(this, \`LogSource\${idx}\`, {
          sourceName,
          sourceVersion: '2.0',
          regions: ['ap-southeast-1', 'us-east-1', 'eu-west-1'],
          accounts: [],  // empty = all org member accounts
        });
        src.addDependency(dataLake);
      });

    // Security Hub subscriber — S3 query access for posture management
    new securitylake.CfnSubscriber(this, 'SecurityHubSubscriber', {
      subscriberName: 'security-hub-subscriber',
      subscriberIdentity: {
        principal: 'securityhub.amazonaws.com',
        externalId: this.account,
      },
      sources: [
        { awsLogSource: { sourceName: 'CLOUD_TRAIL_MGMT', sourceVersion: '2.0' } },
        { awsLogSource: { sourceName: 'GUARD_DUTY',        sourceVersion: '2.0' } },
      ],
      accessTypes: ['S3'],
    });
  }
}`,
            },
        ],
    },
    {
        id: 8,
        analogy: "Think of it like hiring a general-purpose warehouse builder (Lake Formation + Glue) to set up a specialised forensics evidence locker — the warehouse builder can absolutely build a room and organise files, but they don't understand evidence chain-of-custody formats (OCSF), they don't know which security agencies need access (SIEM subscribers), and you'd have to hand-write every evidence tag format yourself. A purpose-built forensics vault (Security Lake) already knows all of this out of the box.",
        icon: "🚧",
        color: ACCENT.amber,
        tag: "SCENARIO 8",
        title: "AWS Lake Formation + Glue — Wrong Answer Pattern for Security Centralisation",
        subtitle: "Why Lake Formation + Glue ETL is a high-effort, wrong-fit answer for security log centralisation",
        useCase: {
            title: "Why NOT Lake Formation + Glue for security event centralisation — and when Lake Formation IS the right choice",
            story: "A common exam distractor presents 'AWS Lake Formation + AWS Glue ETL' as the solution for centralising security logs from CloudTrail, GuardDuty, and VPC Flow Logs. Lake Formation is a powerful governed data lake service — but it is designed for structured business data (sales, inventory, analytics), not for purpose-built security log ingestion. To replicate what Amazon Security Lake does natively, a team using Lake Formation + Glue would need to: (1) build custom Lambda functions or Kinesis Firehose pipelines to collect logs from each service; (2) write Glue ETL jobs to parse and normalise each log format (CloudTrail JSON ≠ VPC Flow Logs TSV ≠ GuardDuty findings JSON); (3) define a common schema manually (no OCSF out of the box); (4) manage Glue Crawlers, Data Catalog tables, and IAM permissions per source. This is exactly the 'significant custom code and manual integration' the question says must be avoided. Lake Formation's strengths are fine-grained column/row access control, data sharing across accounts (via RAM), and governed tables — not security event normalisation.",
            diagram: [
                { actor: "CloudTrail (JSON) + VPC Flow Logs (TSV) + GuardDuty (JSON) + EKS Audit + Route53", icon: "📋" },
                { arrow: "custom Lambda / Kinesis Firehose per source (you build these)" },
                { actor: "Raw S3 landing zone (unstructured, different formats per service)", icon: "🪣" },
                { arrow: "Glue ETL job per source to normalise (you write these)" },
                { actor: "Normalised S3 bucket (no OCSF standard — your own schema)", icon: "🗂️" },
                { arrow: "Lake Formation + Glue Data Catalog (you configure table definitions)" },
                { actor: "Lake Formation governed tables (manual setup, no SIEM subscriber model)", icon: "🚧" },
            ],
        },
        buildSystem: [
            "What you would need to build manually: (1) Kinesis Data Firehose or Lambda for each log source — CloudTrail → S3, VPC Flow Logs → S3, GuardDuty → S3, Route53 → S3; each has different S3 path formats",
            "Glue ETL jobs to transform each source: CloudTrail JSON → common schema, VPC Flow Logs space-delimited TSV → common schema, GuardDuty nested JSON → common schema — different parser for each",
            "Define a common target schema in the Glue Data Catalog manually — no OCSF (Open Cybersecurity Schema Framework) provided; you must design and maintain the schema yourself",
            "Lake Formation permissions: grant column-level and row-level access to each consuming team — powerful, but adds configuration overhead; you must define every data filter manually",
            "Glue Crawlers to detect new partitions as data arrives — must be scheduled or triggered; missed crawls mean Athena queries see stale partition metadata",
            "Cross-account access via AWS RAM (Resource Access Manager) to share Glue Data Catalog tables with SIEM subscriber accounts — no built-in subscriber model like Security Lake provides",
            "CloudWatch alarms or EventBridge rules to detect Glue job failures, pipeline delays, or missing data — you own the monitoring of the ingestion pipeline itself",
            "WHEN Lake Formation IS the right answer: governed data sharing across accounts for business analytics (sales, inventory, product data); fine-grained column/row access control for sensitive PII in a data warehouse; cross-account data lake sharing via AWS RAM — NOT for security log centralisation",
        ],
        flow: ["Custom ingestion (Lambda/Firehose)", "Custom Glue ETL per source", "Manual schema in Glue Catalog", "Lake Formation permissions config", "No subscriber model — query only"],
        examTips: [
            "Lake Formation + Glue is the WRONG answer for 'centralise security logs with least development effort' — it requires custom ETL pipelines, schema design, and per-source parsers; choose Amazon Security Lake instead",
            "Lake Formation IS the right answer for: governed cross-account data sharing of business data, fine-grained column/row access control on sensitive analytics tables, or building a general-purpose data lake with structured business data",
            "The exam often pairs a correct answer (Security Lake) with a plausible distractor (Lake Formation + Glue) — the key discriminator is 'least development effort' and 'security-specific logs'; Lake Formation has no native understanding of OCSF or security service log formats",
            "Glue is an ETL tool, not a log normalisation platform — it can normalise data, but you must write the transformation logic; Security Lake normalises CloudTrail/VPC Flow/GuardDuty to OCSF automatically with no code",
            "Lake Formation strengths to remember for the exam: (1) fine-grained access control on data lake tables (column-level, row-level); (2) cross-account data sharing via AWS RAM; (3) governed tables with ACID transactions; (4) centralised permissions model replacing S3 bucket policies — none of these are relevant to security event centralisation",
            "If the question mentions 'OCSF', 'security posture', 'GuardDuty + CloudTrail + VPC Flow Logs' in the same context as 'centralise' → always Security Lake, never Lake Formation",
        ],
        roleJson: [
            {
                label: "Comparison — Security Lake (correct) vs Lake Formation + Glue (high-effort distractor)",
                note: "💡 This side-by-side shows the effort difference: Security Lake = 3 CLI commands to ingest 6 log sources; Lake Formation + Glue = custom ETL code per source, schema design, Crawler setup, and manual permission configuration.",
                code: `# ─── SECURITY LAKE approach (correct — 3 commands, no custom code) ───────────────

# Enable Security Lake
aws securitylake create-data-lake \\
  --configurations '[{"region":"ap-southeast-1","encryptionConfiguration":{"kmsKeyId":"alias/sl-key"}}]' \\
  --meta-store-manager-role-arn arn:aws:iam::999988887777:role/AmazonSecurityLakeMetaStoreManager

# Auto-ingest 6 sources across all org accounts — OCSF normalisation is automatic
aws securitylake create-aws-log-source \\
  --sources '[
    {"sourceName":"CLOUD_TRAIL_MGMT","sourceVersion":"2.0","regions":["ap-southeast-1"]},
    {"sourceName":"VPC_FLOW","sourceVersion":"2.0","regions":["ap-southeast-1"]},
    {"sourceName":"GUARD_DUTY","sourceVersion":"2.0","regions":["ap-southeast-1"]}
  ]'

# Create SIEM subscriber — done
aws securitylake create-subscriber --subscriber-name splunk --access-types SQS ...


# ─── LAKE FORMATION + GLUE approach (wrong — weeks of custom work) ───────────────

# You must build a custom Glue ETL job for EACH log source.
# Example: CloudTrail JSON → your custom schema (not OCSF)
# glue_cloudtrail_etl.py (you write and maintain this):
#
# import sys
# from awsglue.transforms import *
# from awsglue.utils import getResolvedOptions
# from pyspark.context import SparkContext
# from awsglue.context import GlueContext
# from awsglue.job import Job
#
# args = getResolvedOptions(sys.argv, ['JOB_NAME'])
# sc = SparkContext()
# glueContext = GlueContext(sc)
# job = Job(glueContext)
# job.init(args['JOB_NAME'], args)
#
# cloudtrail_df = glueContext.create_dynamic_frame.from_options(
#     "s3", {"paths": ["s3://raw-logs/cloudtrail/"]}, "json"
# )
# # manually map CloudTrail fields to your custom schema
# mapped = ApplyMapping.apply(frame=cloudtrail_df, mappings=[
#     ("detail.userIdentity.arn", "string", "actor_arn", "string"),
#     ("detail.eventName", "string", "event_name", "string"),
#     # ... 30 more field mappings ...
# ])
# glueContext.write_dynamic_frame.from_options(mapped, "s3",
#     {"path": "s3://normalised-logs/cloudtrail/"}, "parquet")
# job.commit()
#
# Repeat for VPC Flow Logs (TSV format, different fields),
# GuardDuty (nested JSON, different schema),
# Route53, EKS Audit, Lambda — each needs its own ETL job.
# Then set up Lake Formation permissions, Glue Crawlers, etc.
# Total effort: 4–6 weeks vs Security Lake's 30-minute setup.`,
            },
        ],
        cdkCode: [
            {
                label: "CDK — Lake Formation correct use case: fine-grained access control on business analytics data lake",
                note: "💡 This shows what Lake Formation IS good for — governing a business analytics data lake with column-level permissions. This is NOT the security log centralisation use case.",
                code: `import * as cdk from 'aws-cdk-lib';
import * as lakeformation from 'aws-cdk-lib/aws-lakeformation';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

// Lake Formation — CORRECT use case: governed business analytics data lake
// with fine-grained column/row access control and cross-account sharing
export class MarketplaceAnalyticsLakeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for business analytics data (orders, products, revenue)
    const analyticsBucket = new s3.Bucket(this, 'AnalyticsBucket', {
      bucketName: 'marketplace-analytics-governed',
      encryption: s3.BucketEncryption.KMS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Register S3 location with Lake Formation (enables LF to manage permissions)
    new lakeformation.CfnResource(this, 'LfResource', {
      resourceArn: analyticsBucket.bucketArn,
      useServiceLinkedRole: true,
    });

    // Glue Data Catalog database for business analytics tables
    new glue.CfnDatabase(this, 'AnalyticsDb', {
      catalogId: this.account,
      databaseInput: { name: 'marketplace_analytics' },
    });

    // Lake Formation data lake settings — use LF permissions (not S3 bucket policies)
    new lakeformation.CfnDataLakeSettings(this, 'LfSettings', {
      admins: [{ dataLakePrincipalIdentifier: \`arn:aws:iam::\${this.account}:role/DataLakeAdmin\` }],
    });

    // Fine-grained column permission — analyst role can query revenue but NOT customer PII columns
    new lakeformation.CfnPermissions(this, 'AnalystPermissions', {
      dataLakePrincipal: {
        dataLakePrincipalIdentifier: \`arn:aws:iam::\${this.account}:role/marketplace-analyst\`,
      },
      resource: {
        tableWithColumnsResource: {
          catalogId: this.account,
          databaseName: 'marketplace_analytics',
          name: 'orders',
          columnNames: ['order_id', 'amount', 'product_id', 'created_at'],
          // customer_email, customer_phone NOT included — column-level restriction
        },
      },
      permissions: ['SELECT'],
      permissionsWithGrantOption: [],
    });
  }
}`,
            },
        ],
    },
];

export default scenarios;
