import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Serverless Application matrices
 * Lambda, API Gateway, SQS, SNS, Step Functions, CloudWatch
 */

const matrices = [
    {
        id: "lambda-key-numbers",
        title: "Lambda Key Numbers & Limits",
        subtitle: "Memorise these — they appear directly in exam questions",
        color: ACCENT.primary,
        columns: ["Item", "Value", "Exam note"],
        rows: [
            ["Max execution timeout", "15 minutes (900 seconds)", "Default is only 3 seconds — always configure explicitly; API Gateway hard limit is 29 s"],
            ["Memory range", "128 MB to 10,240 MB (10 GB)", "CPU scales proportionally with memory — more memory = more CPU, often faster and cheaper overall"],
            ["Ephemeral /tmp storage", "512 MB (default) to 10,240 MB", "Increase via EphemeralStorage config; shared within execution environment, not across invocations"],
            ["Deployment package (zip)", "50 MB direct upload / 250 MB unzipped", "For larger packages, upload to S3 first and reference the S3 URI; container images up to 10 GB"],
            ["Container image size", "Up to 10 GB", "Push to ECR; ideal for large ML models or custom runtimes; no layer limit when using containers"],
            ["Account concurrency default", "1,000 concurrent executions per Region", "Soft limit — request increase via AWS Support; shared across ALL functions in the account"],
            ["Reserved concurrency", "Guaranteed capacity; throttles above the reserved limit", "Setting to 0 fully throttles the function — useful to disable a function without deleting it"],
            ["Provisioned concurrency", "Pre-warmed instances; eliminates cold start", "Incurs constant hourly charge even when idle; apply to an alias or version, not $LATEST"],
            ["Lambda Layers", "Up to 5 layers per function", "Max total unzipped size (function + all layers) = 250 MB; layers are versioned and immutable"],
            ["Async retry behaviour", "2 automatic retries (3 total attempts)", "Use DLQ or Lambda Destinations to capture final failures; retries are at full payload"],
        ],
    },
    {
        id: "messaging-comparison",
        title: "SQS vs SNS vs EventBridge vs Step Functions",
        subtitle: "Choosing the right integration service for each AMI PVT LTD pattern",
        color: ACCENT.teal,
        columns: ["Feature", "SQS", "SNS", "EventBridge", "Step Functions"],
        rows: [
            ["Type", "Message queue (pull-based)", "Pub/sub notification (push-based)", "Event bus (content-based routing)", "Workflow orchestration engine"],
            ["Delivery model", "At-least-once (Standard); exactly-once (FIFO)", "At-least-once push to all subscribers", "At-least-once to matched targets", "Exactly-once state tracking (Standard)"],
            ["Consumers", "One consumer per message (competing consumers)", "All subscribers receive every message simultaneously", "Multiple targets matched by event pattern rules", "State machine manages the sequence of tasks"],
            ["Message retention", "Up to 14 days in queue", "Not stored — delivered immediately or lost", "Up to 24 hours (with archive replay enabled)", "State tracked for up to 1 year (Standard)"],
            ["Ordering", "Best-effort (Standard) or strict per group (FIFO)", "No ordering guarantee (Standard); ordered per group (FIFO)", "No guaranteed order", "Defined by state machine definition"],
            ["Filtering", "No built-in filtering per consumer", "Subscription filter policies per subscriber", "Event pattern rules on any JSON field", "Choice state for conditional branching"],
            ["Max message/payload size", "256 KB (Extended: up to 2 GB via S3 pointer)", "256 KB", "256 KB per event", "No payload limit (references via ARN/task token)"],
            ["AMI PVT LTD use", "order-events-queue decouples API from order processor Lambda", "marketplace-notifications fans out to SQS + email + audit queue", "EventBridge scheduled rule for nightly cleanup Lambda at 02:00 UTC", "marketplace-order-workflow orchestrates 5-step purchase flow with retries"],
            ["Best for", "Decoupling; absorbing traffic spikes; DLQ for failed messages", "Broadcasting events to multiple consumers at once", "Cross-service event routing; scheduled jobs; third-party SaaS events", "Multi-step workflows needing retry, error handling, and audit trail"],
        ],
    },
    {
        id: "api-gateway-comparison",
        title: "API Gateway Types & Key Behaviours",
        subtitle: "REST API vs HTTP API vs WebSocket API — when to choose each",
        color: ACCENT.orange,
        columns: ["Feature", "REST API", "HTTP API", "WebSocket API"],
        rows: [
            ["Primary use case", "Full-featured API with advanced controls (caching, transforms, usage plans)", "Low-latency, cost-effective Lambda/HTTP proxy", "Real-time bidirectional communication (chat, live updates)"],
            ["Cost vs REST API", "Baseline (per request + data transfer)", "~70% cheaper than REST API", "Per message + connection-minutes"],
            ["Response caching", "✅ Supported — TTL 0 to 3,600 s, configurable per method", "❌ Not supported", "❌ Not applicable"],
            ["Authorizers", "Lambda authorizer, Cognito User Pool, IAM", "Lambda authorizer, JWT (Cognito/OIDC native)", "Lambda authorizer"],
            ["Usage Plans & API Keys", "✅ Yes — per-customer rate limiting and quota", "❌ Not supported", "❌ Not supported"],
            ["Request/response transforms", "✅ Full mapping templates (Velocity)", "❌ Limited — only header/path transforms", "❌ Not supported"],
            ["Private integrations (VPC)", "✅ VPC Link → NLB or ALB", "✅ VPC Link → NLB or ALB", "❌ Not supported"],
            ["Default account throttle", "10,000 RPS burst / 5,000 RPS steady-state", "Scales independently per stage", "500 concurrent connections per API"],
            ["Hard timeout limit", "29 seconds (integration timeout)", "29 seconds", "29 seconds per frame"],
            ["AMI PVT LTD use", "marketplace-api-gw: product catalog with Cognito auth + GET /products caching + enterprise Usage Plans", "Lightweight internal Lambda APIs (e.g. tool health-check endpoints)", "Future: real-time deployment status streaming to enterprise customer dashboards"],
        ],
    },
];

export default matrices;
