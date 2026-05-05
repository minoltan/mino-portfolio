import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Serverless Application scenarios
 *
 * Services: AWS Lambda, Amazon API Gateway, SQS, SNS, Step Functions, CloudWatch
 * Tech stack: Node.js for Lambda, Spring Boot on EC2 for server workloads
 * Accounts: marketplace-prod (234567890123), customer (987654321098), management (123456789012)
 */

const scenarios = [
    {
        id: 1,
        analogy: "Think of it like a vending machine — you press a button (trigger), it does exactly one job, charges you only for what it used, then goes back to sleep until the next button press. You never pay for it just sitting there.",
        icon: "⚡",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "AWS Lambda",
        subtitle: "Serverless order processor triggered by SQS",
        useCase: {
            title: "AMI PVT LTD Marketplace — marketplace-order-processor Lambda handling purchase events",
            story: "AMI PVT LTD runs marketplace-order-processor (Node.js 18.x) as the core of the purchase pipeline. When a buyer completes checkout, the Spring Boot API publishes a message to order-events-queue (SQS). Lambda polls the queue, processes each order — validates, updates DynamoDB Orders table, reads tool artifacts from S3, and publishes to marketplace-notifications SNS. The function uses reserved concurrency of 50 to guarantee capacity without starving other functions, and provisioned concurrency of 10 to eliminate cold starts during business hours. Sensitive config (Stripe API key, DB connection string) is loaded from AWS Secrets Manager at init time, never hardcoded.",
            diagram: [
                { actor: "order-events-queue (SQS)", icon: "📬" },
                { arrow: "event source mapping (batch size 10)" },
                { actor: "marketplace-order-processor (Lambda Node.js 18.x)", icon: "⚡" },
                { arrow: "reads artifacts, updates records, notifies" },
                { actor: "S3 marketplace-tool-artifacts / DynamoDB Orders / SNS marketplace-notifications", icon: "☁️" },
            ],
        },
        buildSystem: [
            "Create Lambda function marketplace-order-processor with runtime nodejs18.x, handler index.handler, and attach Marketplace-OrderProcessor-Lambda-Role",
            "Set memory to 512 MB and timeout to 5 minutes (300 s) — order processing involves S3 reads and DynamoDB writes",
            "Configure /tmp ephemeral storage at 1,024 MB for temporary artifact extraction during tool deployment",
            "Create Lambda Layer marketplace-utils-layer with shared Node.js utility modules (AWS SDK v3 clients, validation helpers) and attach to the function",
            "Add environment variable SECRETS_ARN pointing to the Secrets Manager secret; load actual values in the function init block, not handler",
            "Create SQS event source mapping: queue=order-events-queue, batchSize=10, maximumBatchingWindowInSeconds=30, bisectBatchOnFunctionError=true",
            "Set reserved concurrency to 50 to cap costs and guarantee slots; enable provisioned concurrency of 10 on an alias for cold-start elimination",
            "Configure Lambda Destinations: on-success → marketplace-notifications SNS, on-failure → order-events-dlq SQS for dead-letter analysis",
        ],
        flow: ["SQS Trigger", "Lambda Init (cold/warm)", "Handler Executes", "DynamoDB + S3 + SNS", "Response / Destination"],
        examTips: [
            "Lambda bills per 1 ms of execution × memory — a function with more memory runs faster and may cost the same or less than a slow low-memory function",
            "Reserved concurrency = hard cap on concurrent executions for that function; setting it to 0 effectively disables the function",
            "Provisioned concurrency keeps instances pre-warmed — eliminates cold starts but incurs a constant hourly cost even when idle",
            "Cold start = download code + start runtime + run init code; provisioned concurrency skips all three steps",
            "Lambda Layers are versioned and immutable; a function can use up to 5 layers; total unzipped deployment (function + layers) cannot exceed 250 MB",
        ],
        roleJson: [
            {
                label: "AWS CLI — create marketplace-order-processor with reserved concurrency",
                note: "💡 Set bisectBatchOnFunctionError=true on the SQS event source mapping so a bad message in a batch doesn't block the entire batch from retrying.",
                code: `# Create function
aws lambda create-function \\
  --function-name marketplace-order-processor \\
  --runtime nodejs18.x \\
  --handler index.handler \\
  --role arn:aws:iam::234567890123:role/Marketplace-OrderProcessor-Lambda-Role \\
  --zip-file fileb://function.zip \\
  --timeout 300 \\
  --memory-size 512 \\
  --ephemeral-storage '{"Size": 1024}' \\
  --environment 'Variables={SECRETS_ARN=arn:aws:secretsmanager:ap-southeast-1:234567890123:secret/marketplace-order-secrets}'

# Set reserved concurrency
aws lambda put-function-concurrency \\
  --function-name marketplace-order-processor \\
  --reserved-concurrent-executions 50

# Create SQS event source mapping
aws lambda create-event-source-mapping \\
  --function-name marketplace-order-processor \\
  --event-source-arn arn:aws:sqs:ap-southeast-1:234567890123:order-events-queue \\
  --batch-size 10 \\
  --maximum-batching-window-in-seconds 30 \\
  --bisect-batch-on-function-error`,
            },
        ],
        cdkCode: [
            {
                label: "CDK — Lambda function with SQS event source and reserved concurrency",
                note: "lambda.Function with reservedConcurrentExecutions sets the ceiling. eventsources.SqsEventSource wires the SQS trigger with bisectBatchOnError to isolate poisoned messages in a batch.",
                code: `import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda_events from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';

const orderQueue = sqs.Queue.fromQueueArn(
  this, 'OrderQueue', 'arn:aws:sqs:ap-southeast-1:234567890123:order-events-queue'
);

const orderProcessorRole = new iam.Role(this, 'OrderProcessorRole', {
  roleName: 'Marketplace-OrderProcessor-Lambda-Role',
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaSQSQueueExecutionRole'),
  ],
});

const orderProcessorFn = new lambda.Function(this, 'OrderProcessor', {
  functionName: 'marketplace-order-processor',
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/order-processor'),
  timeout: cdk.Duration.seconds(300),
  memorySize: 512,
  ephemeralStorageSize: cdk.Size.mebibytes(1024),
  reservedConcurrentExecutions: 50,
  role: orderProcessorRole,
  tracing: lambda.Tracing.ACTIVE,
});

orderProcessorFn.addEventSource(new lambda_events.SqsEventSource(orderQueue, {
  batchSize: 10,
  maxBatchingWindow: cdk.Duration.seconds(30),
  bisectBatchOnError: true,   // isolates the failing message without blocking the whole batch
}));`,
            },
        ],
    },

    {
        id: 2,
        analogy: "Think of it like a hotel front desk — guests (API clients) never walk directly into the kitchen or storeroom (backend Lambda/EC2); the front desk receives every request, checks if the guest is registered (authorizer), routes it to the right department, and hands back the response.",
        icon: "🚪",
        color: ACCENT.teal,
        tag: "SCENARIO 2",
        title: "Amazon API Gateway",
        subtitle: "Managed REST API in front of Lambda for the marketplace",
        useCase: {
            title: "AMI PVT LTD Marketplace — marketplace-api-gw routing product catalog and subscription APIs",
            story: "AMI PVT LTD deploys marketplace-api-gw (REST API) as the front door for the marketplace's public-facing APIs — GET /products, POST /subscriptions, GET /orders/{id}. Each method integrates with a dedicated Lambda function via Lambda Proxy integration. A Cognito User Pool Authorizer validates buyer JWTs on all endpoints. A Usage Plan (marketplace-enterprise-plan) limits enterprise customers to 10,000 requests/day and 100 RPS, enforced via API Keys. The GET /products endpoint has a 300-second cache enabled so Lambda is not invoked on every catalog browse. The prod stage URL is https://{api-id}.execute-api.ap-southeast-1.amazonaws.com/prod.",
            diagram: [
                { actor: "Client (buyer app / enterprise system)", icon: "🌐" },
                { arrow: "HTTPS request with JWT or API Key" },
                { actor: "marketplace-api-gw (REST API — Cognito Authorizer)", icon: "🚪" },
                { arrow: "Lambda Proxy integration (per resource/method)" },
                { actor: "Lambda: GetProducts / CreateSubscription / GetOrder", icon: "⚡" },
            ],
        },
        buildSystem: [
            "Create REST API marketplace-api-gw in ap-southeast-1; set endpoint type REGIONAL (not EDGE) since enterprise customers connect via PrivateLink or Direct Connect",
            "Create resources: /products (GET), /subscriptions (POST), /orders/{orderId} (GET); configure Lambda Proxy integration for each method",
            "Create Cognito User Pool Authorizer pointing to marketplace-buyer-pool; set token source to Authorization header; cache authorizer result for 300 s",
            "Create Usage Plan marketplace-enterprise-plan: throttle 100 RPS burst 200, quota 10,000 requests/day; create API Key per enterprise customer and associate with the plan",
            "Enable API caching on the prod stage for GET /products: TTL=300 s, cache size 0.5 GB; mark orderId path parameter as cache key on GET /orders/{orderId}",
            "Create a deployment and promote to prod stage; use stage variables (stageVariables.lambdaAlias) to point prod stage to the prod Lambda alias",
            "Enable CloudWatch access logging on the prod stage with a log group /aws/apigateway/marketplace-api-gw-prod; log request ID, status, latency, and error message",
            "Set up a custom domain name api.marketplace.ami.com with ACM certificate; create base path mapping to the marketplace-api-gw prod stage",
        ],
        flow: ["Client Request", "Cognito Authorizer", "API Gateway Cache Check", "Lambda Proxy Integration", "Response to Client"],
        examTips: [
            "REST API supports caching, usage plans, and request/response transformation — HTTP API does not; choose REST API when you need these features",
            "HTTP API is ~70% cheaper than REST API and supports JWT authorizers natively — use it for simple Lambda or HTTP proxy integrations without advanced features",
            "Lambda Proxy integration passes the entire HTTP request as a single event object to Lambda; Lambda must return a specific JSON structure with statusCode, headers, and body",
            "API Gateway has a hard 29-second integration timeout — Lambda functions called by API Gateway must complete within 29 seconds regardless of their own timeout setting",
            "Usage Plans and API Keys provide rate limiting per customer; they do NOT provide authentication — combine with an authorizer for both auth and throttling",
        ],
        roleJson: [
            {
                label: "AWS CLI — create REST API, resource, method, and Lambda integration",
                note: "💡 The 29-second timeout on API Gateway is a hard limit — always set your Lambda timeout below 29 s when it is invoked synchronously through API Gateway.",
                code: `# Create REST API
aws apigateway create-rest-api \\
  --name marketplace-api-gw \\
  --endpoint-configuration types=REGIONAL \\
  --region ap-southeast-1

# Get root resource ID
aws apigateway get-resources \\
  --rest-api-id abc123apiid \\
  --query 'items[?path==\`/\`].id' --output text

# Create /products resource
aws apigateway create-resource \\
  --rest-api-id abc123apiid \\
  --parent-id rootResourceId \\
  --path-part products

# Create GET method with Lambda Proxy integration
aws apigateway put-method \\
  --rest-api-id abc123apiid \\
  --resource-id productsResourceId \\
  --http-method GET \\
  --authorization-type COGNITO_USER_POOLS \\
  --authorizer-id cognitoAuthorizerId

aws apigateway put-integration \\
  --rest-api-id abc123apiid \\
  --resource-id productsResourceId \\
  --http-method GET \\
  --type AWS_PROXY \\
  --integration-http-method POST \\
  --uri arn:aws:apigateway:ap-southeast-1:lambda:path/2015-03-31/functions/arn:aws:lambda:ap-southeast-1:234567890123:function:GetProducts/invocations`,
            },
        ],
        cdkCode: [
            {
                label: "CDK — API Gateway REST API with Lambda Proxy integration and Cognito authorizer",
                note: "apigateway.RestApi with LambdaIntegration creates the /products GET endpoint. CognitoUserPoolsAuthorizer wires the Cognito User Pool for JWT validation. UsagePlan and ApiKey enforce per-customer rate limits.",
                code: `import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';

const getProductsFn = lambda.Function.fromFunctionName(this, 'GetProductsFn', 'GetProducts');
const buyerPool = cognito.UserPool.fromUserPoolId(this, 'BuyerPool', 'ap-southeast-1_buyerPoolId');

const api = new apigateway.RestApi(this, 'MarketplaceApiGw', {
  restApiName: 'marketplace-api-gw',
  endpointConfiguration: { types: [apigateway.EndpointType.REGIONAL] },
  deployOptions: {
    stageName: 'prod',
    cachingEnabled: true,
    cacheClusterEnabled: true,
    cacheClusterSize: '0.5',
    methodOptions: {
      '/products/GET': { cachingEnabled: true, cacheTtl: cdk.Duration.seconds(300) },
    },
    tracingEnabled: true,
    loggingLevel: apigateway.MethodLoggingLevel.INFO,
  },
});

const cognitoAuth = new apigateway.CognitoUserPoolsAuthorizer(this, 'BuyerAuth', {
  cognitoUserPools: [buyerPool],
  resultsCacheTtl: cdk.Duration.seconds(300),
});

const products = api.root.addResource('products');
products.addMethod('GET', new apigateway.LambdaIntegration(getProductsFn, { proxy: true }), {
  authorizer: cognitoAuth,
  authorizationType: apigateway.AuthorizationType.COGNITO,
});

// Usage plan with throttling and quota for enterprise customers
const plan = api.addUsagePlan('EnterprisePlan', {
  name: 'marketplace-enterprise-plan',
  throttle: { rateLimit: 100, burstLimit: 200 },
  quota: { limit: 10000, period: apigateway.Period.DAY },
});
plan.addApiStage({ api, stage: api.deploymentStage });`,
            },
        ],
    },

    {
        id: 3,
        analogy: "Think of it like a restaurant order ticket system — orders are clipped to a rail (queue) for the kitchen to process one at a time; if a ticket falls off the rail three times without being cooked, it goes into a separate 'problem orders' tray (DLQ) so the manager can investigate without losing the original order.",
        icon: "📬",
        color: ACCENT.amber,
        tag: "SCENARIO 3",
        title: "Amazon SQS + DLQ",
        subtitle: "Resilient order queue with dead-letter handling for failed messages",
        useCase: {
            title: "AMI PVT LTD Marketplace — order-events-queue with DLQ for failed order processing",
            story: "order-events-queue (Standard SQS) decouples the Spring Boot API (producer) from marketplace-order-processor Lambda (consumer). The Lambda event source mapping polls the queue with batchSize=10. If a message fails processing 3 times (maxReceiveCount=3 in the redrive policy), SQS automatically moves it to order-events-dlq so the failed order is not lost and can be inspected and replayed. Long polling (WaitTimeSeconds=20) is used to reduce empty API calls and cost. A FIFO variant (order-events-fifo.fifo) is used for the Leaderboard tool where update order must be preserved per team ID.",
            diagram: [
                { actor: "Spring Boot API / marketplace-order-processor (producer)", icon: "🏢" },
                { arrow: "SendMessage to order-events-queue" },
                { actor: "order-events-queue (Standard SQS, visibilityTimeout=300s)", icon: "📬" },
                { arrow: "Lambda polls (batchSize=10, long poll 20s)" },
                { actor: "marketplace-order-processor Lambda", icon: "⚡" },
                { arrow: "after 3 failures → redrive to DLQ" },
                { actor: "order-events-dlq (Dead Letter Queue)", icon: "🚨" },
            ],
        },
        buildSystem: [
            "Create order-events-dlq (Standard queue) first — the DLQ must exist before creating the source queue with a redrive policy",
            "Create order-events-queue with VisibilityTimeout=300 s (match Lambda timeout) and RedrivePolicy: deadLetterTargetArn=order-events-dlq ARN, maxReceiveCount=3",
            "Enable long polling on order-events-queue: set ReceiveMessageWaitTimeSeconds=20 to reduce empty poll API calls and cost",
            "Set message retention on order-events-dlq to 14 days (maximum) so failed messages are available for debugging and replay",
            "Configure Lambda event source mapping: batchSize=10, maximumBatchingWindowInSeconds=30, bisectBatchOnFunctionError=true",
            "Create a CloudWatch Alarm on ApproximateNumberOfMessagesVisible metric for order-events-dlq — alert the ops team via SNS when DLQ depth > 0",
            "For the Leaderboard tool: create order-events-fifo.fifo (FIFO queue) with ContentBasedDeduplication=true; use MessageGroupId=teamId for per-team ordering",
            "Grant marketplace-order-processor Lambda role: sqs:ReceiveMessage, sqs:DeleteMessage, sqs:GetQueueAttributes on both queues",
        ],
        flow: ["Producer sends message", "SQS Queue (Standard)", "Lambda polls & processes", "Failure × 3 → DLQ", "CloudWatch Alarm → SNS Alert"],
        examTips: [
            "Visibility timeout must be at least as long as your Lambda function timeout — if Lambda takes longer than visibility timeout, SQS makes the message visible again and it gets processed twice",
            "Standard queues: at-least-once delivery, best-effort ordering. FIFO queues: exactly-once processing, strict ordering, but 300 TPS (3,000 with batching)",
            "Long polling (WaitTimeSeconds=1–20) is almost always better than short polling — it reduces empty API calls and cost while reducing latency",
            "DLQ maxReceiveCount starts counting after the message first becomes visible; it is NOT the same as Lambda retry count",
            "SQS Extended Client Library (Java/Python) stores message payloads > 256 KB in S3 and puts a pointer in SQS — useful for large order payloads",
        ],
        roleJson: [
            {
                label: "AWS CLI — create SQS queue with DLQ redrive policy",
                note: "💡 Always create the DLQ before the source queue — you need the DLQ ARN to set the redrive policy on the source queue.",
                code: `# Step 1: Create DLQ first
aws sqs create-queue \\
  --queue-name order-events-dlq \\
  --attributes MessageRetentionPeriod=1209600

# Get DLQ ARN
DLQ_ARN=$(aws sqs get-queue-attributes \\
  --queue-url https://sqs.ap-southeast-1.amazonaws.com/234567890123/order-events-dlq \\
  --attribute-names QueueArn --query Attributes.QueueArn --output text)

# Step 2: Create source queue with redrive policy and long polling
aws sqs create-queue \\
  --queue-name order-events-queue \\
  --attributes \\
    VisibilityTimeout=300 \\
    ReceiveMessageWaitTimeSeconds=20 \\
    RedrivePolicy="{\\"deadLetterTargetArn\\":\\"$DLQ_ARN\\",\\"maxReceiveCount\\":\\"3\\"}"`,
            },
        ],
        cdkCode: [
            {
                label: "CDK — SQS queue with Dead Letter Queue and long polling",
                note: "Create the DLQ first, then pass it as deadLetterQueue to the source queue. CDK automatically sets up the redrive policy. Long polling is set via receiveMessageWaitTime.",
                code: `import * as sqs from 'aws-cdk-lib/aws-sqs';

// Step 1: Create DLQ first (14-day retention for debugging)
const orderEventsDlq = new sqs.Queue(this, 'OrderEventsDlq', {
  queueName: 'order-events-dlq',
  retentionPeriod: cdk.Duration.days(14),
  visibilityTimeout: cdk.Duration.seconds(300),
});

// Step 2: Create source queue with DLQ redrive and long polling
const orderEventsQueue = new sqs.Queue(this, 'OrderEventsQueue', {
  queueName: 'order-events-queue',
  visibilityTimeout: cdk.Duration.seconds(300),   // must be >= Lambda timeout
  receiveMessageWaitTime: cdk.Duration.seconds(20),  // long polling
  deadLetterQueue: {
    queue: orderEventsDlq,
    maxReceiveCount: 3,
  },
});

// FIFO variant for Leaderboard tool (ordered per teamId)
const leaderboardFifo = new sqs.Queue(this, 'LeaderboardFifo', {
  queueName: 'order-events-fifo.fifo',
  fifo: true,
  contentBasedDeduplication: true,
  visibilityTimeout: cdk.Duration.seconds(60),
});`,
            },
        ],
    },

    {
        id: 4,
        analogy: "Think of it like a radio broadcast — one presenter (publisher) speaks into a single microphone (SNS topic), and every radio tuned to that frequency (subscriber) hears it simultaneously. The presenter doesn't know or care how many radios are listening.",
        icon: "📡",
        color: ACCENT.orange,
        tag: "SCENARIO 4",
        title: "Amazon SNS Fan-out",
        subtitle: "marketplace-notifications broadcasting to multiple downstream consumers",
        useCase: {
            title: "AMI PVT LTD Marketplace — SNS fan-out to SQS queues, Lambda, and email for order events",
            story: "marketplace-notifications (SNS Standard topic) is the central notification hub for AMI PVT LTD. When an order is placed, the marketplace-order-processor Lambda publishes to this topic with a MessageAttribute eventType=order_placed. Three subscriptions fan out simultaneously: (1) order-events-queue (SQS) receives messages with filter eventType=order_placed for further processing, (2) marketplace-audit-queue (SQS) receives ALL messages for compliance logging, (3) buyer@example.com email subscription delivers a confirmation to the buyer. A separate FIFO topic (marketplace-notifications-fifo.fifo) handles tool deployment events where ordering matters per customer account.",
            diagram: [
                { actor: "marketplace-order-processor Lambda (publisher)", icon: "⚡" },
                { arrow: "Publish message with MessageAttribute eventType=order_placed" },
                { actor: "marketplace-notifications (SNS Standard Topic)", icon: "📡" },
                { arrow: "fan-out to all subscribers" },
                { actor: "order-events-queue (SQS, filter: order_placed) / marketplace-audit-queue (SQS, all) / buyer email", icon: "📬" },
            ],
        },
        buildSystem: [
            "Create marketplace-notifications SNS Standard topic; note the topic ARN for publisher IAM policy and subscriber configuration",
            "Subscribe order-events-queue (SQS) to the topic; enable raw message delivery so SQS receives the original JSON without SNS envelope wrapper",
            "Add a subscription filter policy on the order-events-queue subscription: {\"eventType\": [\"order_placed\"]} — queue only receives order placement events, not status updates",
            "Subscribe marketplace-audit-queue (SQS) to the topic without a filter policy — it receives every message for compliance logging",
            "Subscribe buyer email address to the topic; filter on eventType=order_confirmation; buyer must confirm the subscription via email before messages are delivered",
            "Grant marketplace-order-processor Lambda role: sns:Publish on marketplace-notifications topic ARN",
            "Add an SQS access policy on order-events-queue allowing sns:SendMessage from the SNS topic ARN — required for cross-service delivery",
            "For FIFO needs (tool deployment events): create marketplace-notifications-fifo.fifo SNS FIFO topic; subscribe order-events-fifo.fifo SQS FIFO queue",
        ],
        flow: ["Lambda publishes to SNS", "SNS Topic receives message", "Filter policies applied per subscription", "Fan-out to SQS / Lambda / Email simultaneously", "Each consumer processes independently"],
        examTips: [
            "SNS Fan-out + SQS is more resilient than SNS → Lambda directly — if Lambda is throttled, SQS buffers the messages; SNS → Lambda directly will lose messages if Lambda is at concurrency limit",
            "Subscription filter policies reduce the number of messages each subscriber receives — consumers only process relevant events, reducing Lambda invocations and SQS charges",
            "Raw message delivery on SQS subscriptions removes the SNS JSON wrapper — use this when the consumer expects plain JSON, not the SNS envelope structure",
            "SNS FIFO topics can only fan out to SQS FIFO queues — they cannot deliver to email, HTTP, or Lambda directly",
            "SNS does not store messages — if delivery fails and there is no SQS buffer, the message is lost; always use SNS + SQS for durable fan-out",
        ],
        roleJson: [
            {
                label: "AWS CLI — subscribe SQS to SNS with message filter policy",
                note: "💡 The SQS queue policy must explicitly allow SNS to send messages — without this resource-based policy, SNS delivery silently fails.",
                code: `# Subscribe SQS to SNS topic with filter policy
aws sns subscribe \\
  --topic-arn arn:aws:sns:ap-southeast-1:234567890123:marketplace-notifications \\
  --protocol sqs \\
  --notification-endpoint arn:aws:sqs:ap-southeast-1:234567890123:order-events-queue \\
  --attributes '{"FilterPolicy":"{\"eventType\":[\"order_placed\"]}", "RawMessageDelivery":"true"}'

# Add SQS access policy to allow SNS to send messages
aws sqs set-queue-attributes \\
  --queue-url https://sqs.ap-southeast-1.amazonaws.com/234567890123/order-events-queue \\
  --attributes '{
    "Policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"sns.amazonaws.com\"},\"Action\":\"sqs:SendMessage\",\"Resource\":\"arn:aws:sqs:ap-southeast-1:234567890123:order-events-queue\",\"Condition\":{\"ArnEquals\":{\"aws:SourceArn\":\"arn:aws:sns:ap-southeast-1:234567890123:marketplace-notifications\"}}}]}"
  }'`,
            },
        ],
        cdkCode: [
            {
                label: "CDK (TypeScript) — SNS fan-out with SQS subscriptions and filter policies",
                note: "💡 CDK automatically adds the SQS resource-based policy when you call addSubscription — no manual aws sqs set-queue-attributes needed.",
                code: `import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

export class MarketplaceFanoutStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const notificationsTopic = sns.Topic.fromTopicArn(this, 'Notifications',
      'arn:aws:sns:ap-southeast-1:234567890123:marketplace-notifications');

    const dlq = new sqs.Queue(this, 'OrderEventsDlq', {
      queueName: 'order-events-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    const orderQueue = new sqs.Queue(this, 'OrderEventsQueue', {
      queueName: 'order-events-queue',
      deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
      visibilityTimeout: cdk.Duration.seconds(300),
    });

    const analyticsQueue = new sqs.Queue(this, 'AnalyticsQueue', {
      queueName: 'order-analytics-queue',
    });

    // Order processor queue — receives only order_placed events via filter policy
    notificationsTopic.addSubscription(
      new subs.SqsSubscription(orderQueue, {
        rawMessageDelivery: true,
        filterPolicy: {
          eventType: sns.SubscriptionFilter.stringFilter({
            allowlist: ['order_placed'],
          }),
        },
      })
    );

    // Analytics queue — receives all order event types
    notificationsTopic.addSubscription(
      new subs.SqsSubscription(analyticsQueue, {
        rawMessageDelivery: false,
        filterPolicy: {
          eventType: sns.SubscriptionFilter.stringFilter({
            allowlist: ['order_placed', 'order_cancelled', 'order_refunded'],
          }),
        },
      })
    );
  }
}`,
            },
        ],
    },

    {
        id: 5,
        analogy: "Think of it like a recipe card — each step is written out in sequence; if the oven breaks mid-bake (a step fails), the recipe card tells you exactly what to do next — retry, use a backup oven, or stop and report. No single chef has to keep the whole workflow in their head.",
        icon: "🔄",
        color: ACCENT.purple,
        tag: "SCENARIO 5",
        title: "AWS Step Functions",
        subtitle: "Orchestrating the multi-step marketplace tool purchase workflow",
        useCase: {
            title: "AMI PVT LTD Marketplace — marketplace-order-workflow state machine replacing Lambda-to-Lambda chaining",
            story: "The tool purchase flow at AMI PVT LTD involves five sequential steps: validate order → charge payment (Stripe via Lambda) → deploy tool to customer account (cross-account Lambda) → update Orders DynamoDB table → publish confirmation to marketplace-notifications SNS. Previously this was implemented as Lambda calling Lambda, which chained timeouts and made error handling fragile. AMI PVT LTD replaces this with marketplace-order-workflow (Step Functions Standard Workflow). Each step is a Task state calling a dedicated Lambda. The Payment step has a Retry policy (3 attempts, 2-second backoff) and a Catch block that routes failures to a NotifyFailure state which updates the order status to FAILED and alerts the ops team.",
            diagram: [
                { actor: "API Gateway / Spring Boot (start execution)", icon: "🚪" },
                { arrow: "StartExecution with order payload" },
                { actor: "marketplace-order-workflow (Step Functions Standard)", icon: "🔄" },
                { arrow: "Task → Task → Choice → Parallel → Task" },
                { actor: "ValidateOrder → ChargePayment → DeployTool → UpdateDB → NotifyBuyer Lambdas", icon: "⚡" },
            ],
        },
        buildSystem: [
            "Define the state machine in Amazon States Language (ASL JSON): states = ValidateOrder (Task), ChargePayment (Task with Retry/Catch), DeployTool (Task), UpdateOrders (Task), NotifyBuyer (Task), OrderFailed (Task)",
            "Configure Retry on ChargePayment state: ErrorEquals=[States.TaskFailed], IntervalSeconds=2, MaxAttempts=3, BackoffRate=2.0",
            "Configure Catch on ChargePayment: ErrorEquals=[States.ALL], Next=OrderFailed — routes any unrecoverable failure to the failure handler state",
            "Add a Parallel state after DeployTool to simultaneously update DynamoDB and publish to SNS, reducing total workflow duration",
            "Create IAM role for the state machine with permissions: lambda:InvokeFunction for all five Lambda ARNs, dynamodb:UpdateItem on Orders table, sns:Publish on marketplace-notifications",
            "Choose Standard Workflow (not Express) — Standard provides exactly-once execution, up to 1-year duration, and full execution history in CloudWatch",
            "Integrate with API Gateway: POST /orders triggers a Step Functions StartExecution API call (not a Lambda) — API Gateway → Step Functions direct integration",
            "Enable X-Ray tracing on the state machine to trace latency across each Task state for performance optimization",
        ],
        flow: ["StartExecution", "ValidateOrder", "ChargePayment (Retry/Catch)", "DeployTool", "Parallel: UpdateDB + NotifyBuyer"],
        examTips: [
            "Step Functions Standard: exactly-once execution, up to 1 year, full history, priced per state transition — use for critical business workflows like order processing",
            "Step Functions Express: at-least-once execution, up to 5 minutes, high throughput (100,000 exec/sec), priced per duration — use for IoT, streaming, high-volume short workflows",
            "Never chain Lambda → Lambda for multi-step workflows — each Lambda has a 15-minute max timeout and chaining risks cascading failures; use Step Functions instead",
            "The Catch and Retry blocks in ASL handle transient failures gracefully without writing retry logic inside the Lambda function itself",
            "Step Functions can integrate directly with DynamoDB, SNS, SQS, ECS, Glue, and more using optimised integrations — the Lambda function is not always needed as a pass-through",
        ],
        roleJson: [
            {
                label: "Step Functions — ASL definition for marketplace-order-workflow (simplified)",
                note: "💡 Use a Parallel state to run independent tasks (UpdateDB + NotifyBuyer) concurrently — this reduces overall workflow duration without adding complexity.",
                code: `{
  "Comment": "AMI PVT LTD marketplace tool purchase workflow",
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:ap-southeast-1:234567890123:function:ValidateOrder",
      "Next": "ChargePayment"
    },
    "ChargePayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:ap-southeast-1:234567890123:function:ChargePayment",
      "Retry": [{
        "ErrorEquals": ["States.TaskFailed"],
        "IntervalSeconds": 2,
        "MaxAttempts": 3,
        "BackoffRate": 2.0
      }],
      "Catch": [{
        "ErrorEquals": ["States.ALL"],
        "Next": "OrderFailed"
      }],
      "Next": "DeployTool"
    },
    "DeployTool": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:ap-southeast-1:234567890123:function:DeployTool",
      "Next": "FinaliseOrder"
    },
    "FinaliseOrder": {
      "Type": "Parallel",
      "Branches": [
        { "StartAt": "UpdateOrders", "States": { "UpdateOrders": { "Type": "Task", "Resource": "arn:aws:states:::dynamodb:updateItem", "End": true }}},
        { "StartAt": "NotifyBuyer",  "States": { "NotifyBuyer":  { "Type": "Task", "Resource": "arn:aws:states:::sns:publish",         "End": true }}}
      ],
      "End": true
    },
    "OrderFailed": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:ap-southeast-1:234567890123:function:NotifyFailure",
      "End": true
    }
  }
}`,
            },
        ],
        cdkCode: [
            {
                label: "CDK (TypeScript) — Step Functions Standard Workflow with Retry/Catch and Parallel state",
                note: "💡 addRetry() and addCatch() chain directly on LambdaInvoke tasks — no need to write raw ASL JSON in CDK.",
                code: `import * as cdk from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class MarketplaceWorkflowStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const fn = (id: string, name: string) =>
      lambda.Function.fromFunctionArn(this, id,
        'arn:aws:lambda:ap-southeast-1:234567890123:function:' + name);

    const validateOrderFn  = fn('ValidateFn',  'ValidateOrder');
    const chargePaymentFn  = fn('ChargeFn',    'ChargePayment');
    const deployToolFn     = fn('DeployFn',    'DeployTool');
    const updateOrdersFn   = fn('UpdateFn',    'UpdateOrders');
    const notifyBuyerFn    = fn('NotifyFn',    'NotifyBuyer');
    const notifyFailureFn  = fn('FailFn',      'NotifyFailure');

    const orderFailed = new tasks.LambdaInvoke(this, 'OrderFailed',
      { lambdaFunction: notifyFailureFn });

    const chargePayment = new tasks.LambdaInvoke(this, 'ChargePayment', {
      lambdaFunction: chargePaymentFn,
      outputPath: '$.Payload',
    })
      .addRetry({
        errors: ['States.TaskFailed'],
        interval: cdk.Duration.seconds(2),
        maxAttempts: 3,
        backoffRate: 2,
      })
      .addCatch(orderFailed, { errors: ['States.ALL'] });

    const finaliseOrder = new sfn.Parallel(this, 'FinaliseOrder')
      .branch(new tasks.LambdaInvoke(this, 'UpdateOrders', { lambdaFunction: updateOrdersFn }))
      .branch(new tasks.LambdaInvoke(this, 'NotifyBuyer',  { lambdaFunction: notifyBuyerFn }));

    const definition = new tasks.LambdaInvoke(this, 'ValidateOrder', {
      lambdaFunction: validateOrderFn, outputPath: '$.Payload',
    })
      .next(chargePayment)
      .next(new tasks.LambdaInvoke(this, 'DeployTool', {
        lambdaFunction: deployToolFn, outputPath: '$.Payload',
      }))
      .next(finaliseOrder);

    new sfn.StateMachine(this, 'MarketplaceOrderWorkflow', {
      stateMachineName: 'marketplace-order-workflow',
      definition,
      stateMachineType: sfn.StateMachineType.STANDARD,
      tracingEnabled: true,
    });
  }
}`,
            },
        ],
    },

    {
        id: 6,
        analogy: "Think of it like the dashboard of a car — it continuously watches everything (speed, fuel, engine temp), lights up a warning icon when something is wrong (alarm), and stores fault codes the mechanic can read later (logs). You don't watch every gauge constantly — the car alerts you when action is needed.",
        icon: "📊",
        color: ACCENT.green,
        tag: "SCENARIO 6",
        title: "Amazon CloudWatch",
        subtitle: "Monitoring, alarms, and dashboards for the marketplace platform",
        useCase: {
            title: "AMI PVT LTD Marketplace — CloudWatch monitoring Lambda errors, EC2 CPU, and custom order metrics",
            story: "AMI PVT LTD sets up CloudWatch as the observability layer for the entire marketplace platform. A CloudWatch Alarm watches marketplace-order-processor Lambda error rate (Errors / Invocations > 5% over 5 minutes) and triggers the marketplace-notifications SNS topic to alert the on-call team. A custom metric OrderProcessingDurationMs is published via PutMetricData from inside the Lambda function for business-level SLA tracking. CloudWatch Logs Insights queries /aws/lambda/marketplace-order-processor for timeout and memory errors. A CloudWatch Dashboard marketplace-ops-dashboard consolidates Lambda invocations, ALB RequestCount, DynamoDB ConsumedWriteCapacityUnits, and ECS CPU utilisation on a single screen. An EventBridge scheduled rule fires a cleanup Lambda every night at 02:00 UTC to archive old order records.",
            diagram: [
                { actor: "Lambda / EC2 / ECS / RDS / API Gateway", icon: "☁️" },
                { arrow: "emit metrics + logs automatically" },
                { actor: "CloudWatch Metrics + Log Groups", icon: "📊" },
                { arrow: "alarm threshold breached" },
                { actor: "CloudWatch Alarm → marketplace-notifications SNS → On-call team", icon: "🚨" },
                { arrow: "EventBridge scheduled rule (02:00 UTC)" },
                { actor: "Cleanup Lambda (archive old orders)", icon: "⚡" },
            ],
        },
        buildSystem: [
            "Create CloudWatch Alarm marketplace-order-error-alarm: metric=Errors namespace=AWS/Lambda, period=300 s, statistic=Sum, threshold=5, comparison=GreaterThanOrEqualToThreshold, treat missing data as notBreaching",
            "Add alarm action: publish to marketplace-notifications SNS topic when state transitions to ALARM",
            "Install and configure CloudWatch Agent on marketplace-api-asg EC2 instances to collect memory utilisation and disk space (not available as default EC2 metrics)",
            "Publish custom metric from Lambda: aws cloudwatch put-metric-data with namespace=MarketplacePlatform, MetricName=OrderProcessingDurationMs, unit=Milliseconds",
            "Create Log Insights query on /aws/lambda/marketplace-order-processor: filter @message like /ERROR/ | stats count() by bin(5m) — save as named query for the ops team",
            "Create CloudWatch Dashboard marketplace-ops-dashboard: add widgets for Lambda Invocations, Lambda Errors, ALB RequestCount, DynamoDB ConsumedWriteCapacity, ECS CPUUtilization",
            "Create EventBridge rule marketplace-nightly-cleanup: schedule expression cron(0 2 * * ? *), target = arn of cleanup Lambda, input transformer adds execution date",
            "Enable CloudWatch Container Insights on marketplace-ecs-cluster for container-level CPU, memory, and network metrics without custom agent configuration",
        ],
        flow: ["Services emit metrics/logs", "CloudWatch ingests", "Alarm evaluates threshold", "SNS alert to on-call", "EventBridge triggers scheduled jobs"],
        examTips: [
            "EC2 default metrics do NOT include memory or disk — you must install the CloudWatch Agent to collect these; the default metrics are CPU, network, and disk I/O (not usage)",
            "Basic monitoring = 5-minute metric resolution (free); Detailed monitoring = 1-minute resolution (paid) — enable detailed monitoring for ASG to react faster to load spikes",
            "CloudWatch Alarms have three states: OK, ALARM, INSUFFICIENT_DATA — INSUFFICIENT_DATA is the initial state and also occurs when the metric stops being reported",
            "Composite Alarms combine multiple alarms with AND/OR logic — use them to suppress noise (e.g. only alert if BOTH error rate AND latency are high simultaneously)",
            "EventBridge (formerly CloudWatch Events) replaced CloudWatch Events — EventBridge has the same scheduler capability plus cross-account event buses and third-party integrations",
        ],
        roleJson: [
            {
                label: "AWS CLI — create Lambda error alarm and publish custom metric",
                note: "💡 Set TreatMissingData to notBreaching on Lambda alarms — if the function is not invoked, there are no errors and the alarm should stay OK, not flip to INSUFFICIENT_DATA.",
                code: `# Create Lambda error rate alarm
aws cloudwatch put-metric-alarm \\
  --alarm-name marketplace-order-error-alarm \\
  --alarm-description "Alert when order processor Lambda errors >= 5 in 5 minutes" \\
  --namespace AWS/Lambda \\
  --metric-name Errors \\
  --dimensions Name=FunctionName,Value=marketplace-order-processor \\
  --statistic Sum \\
  --period 300 \\
  --threshold 5 \\
  --comparison-operator GreaterThanOrEqualToThreshold \\
  --evaluation-periods 1 \\
  --treat-missing-data notBreaching \\
  --alarm-actions arn:aws:sns:ap-southeast-1:234567890123:marketplace-notifications

# Publish custom metric from Lambda (in Node.js code):
# const { CloudWatchClient, PutMetricDataCommand } = require("@aws-sdk/client-cloudwatch");
# await cwClient.send(new PutMetricDataCommand({
#   Namespace: "MarketplacePlatform",
#   MetricData: [{ MetricName: "OrderProcessingDurationMs", Value: durationMs, Unit: "Milliseconds" }]
# }));

# Create EventBridge scheduled rule
aws events put-rule \\
  --name marketplace-nightly-cleanup \\
  --schedule-expression "cron(0 2 * * ? *)" \\
  --state ENABLED

aws events put-targets \\
  --rule marketplace-nightly-cleanup \\
  --targets Id=CleanupLambda,Arn=arn:aws:lambda:ap-southeast-1:234567890123:function:NightlyCleanup`,
            },
        ],
        cdkCode: [
            {
                label: "CDK (TypeScript) — CloudWatch Alarm, Dashboard, and EventBridge scheduled rule",
                note: "💡 TreatMissingData.NOT_BREACHING keeps the alarm OK when Lambda is idle — without this, a quiet period triggers INSUFFICIENT_DATA which can page the on-call team unnecessarily.",
                code: `import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cw_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class MarketplaceMonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const notificationsTopic = sns.Topic.fromTopicArn(this, 'Notifications',
      'arn:aws:sns:ap-southeast-1:234567890123:marketplace-notifications');

    // Lambda error rate alarm
    const orderErrors = new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
      dimensionsMap: { FunctionName: 'marketplace-order-processor' },
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    const errorAlarm = new cloudwatch.Alarm(this, 'OrderProcessorErrorAlarm', {
      alarmName: 'marketplace-order-error-alarm',
      alarmDescription: 'Alert when order processor Lambda errors >= 5 in 5 minutes',
      metric: orderErrors,
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    errorAlarm.addAlarmAction(new cw_actions.SnsAction(notificationsTopic));

    // Nightly cleanup EventBridge rule at 02:00 UTC
    const cleanupFn = lambda.Function.fromFunctionArn(this, 'NightlyCleanupFn',
      'arn:aws:lambda:ap-southeast-1:234567890123:function:NightlyCleanup');

    new events.Rule(this, 'NightlyCleanupRule', {
      ruleName: 'marketplace-nightly-cleanup',
      schedule: events.Schedule.cron({ minute: '0', hour: '2' }),
      targets: [new targets.LambdaFunction(cleanupFn)],
    });

    // Ops dashboard
    new cloudwatch.Dashboard(this, 'MarketplaceOpsDashboard', {
      dashboardName: 'marketplace-ops-dashboard',
      widgets: [[
        new cloudwatch.GraphWidget({
          title: 'Lambda Invocations vs Errors',
          left: [new cloudwatch.Metric({
            namespace: 'AWS/Lambda', metricName: 'Invocations',
            dimensionsMap: { FunctionName: 'marketplace-order-processor' }, statistic: 'Sum',
          })],
          right: [orderErrors],
        }),
        new cloudwatch.GraphWidget({
          title: 'ALB Request Count',
          left: [new cloudwatch.Metric({
            namespace: 'AWS/ApplicationELB', metricName: 'RequestCount',
            dimensionsMap: { LoadBalancer: 'marketplace-alb' }, statistic: 'Sum',
          })],
        }),
        new cloudwatch.GraphWidget({
          title: 'DynamoDB Consumed Write Capacity',
          left: [new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB', metricName: 'ConsumedWriteCapacityUnits',
            dimensionsMap: { TableName: 'Orders' }, statistic: 'Sum',
          })],
        }),
      ]],
    });
  }
}`,
            },
        ],
    },
];

export default scenarios;
