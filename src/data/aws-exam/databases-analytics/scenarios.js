import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Databases & Analytics scenarios
 *
 * Services: Amazon RDS, Amazon Aurora, Amazon DynamoDB, Amazon ElastiCache,
 *           Amazon Kinesis, Amazon Athena, AWS Glue, Amazon Redshift
 * Reference: https://digitalcloud.training/amazon-rds/
 *            https://digitalcloud.training/amazon-aurora/
 *            https://digitalcloud.training/amazon-dynamodb/
 *            https://digitalcloud.training/amazon-elasticache/
 *            https://digitalcloud.training/amazon-kinesis/
 *            https://digitalcloud.training/amazon-athena/
 *            https://digitalcloud.training/aws-glue/
 *            https://digitalcloud.training/amazon-redshift/
 */

const scenarios = [
    {
        id: 1,
        analogy: "Think of it like a bank vault with a permanent backup twin in another city — every transaction written to the main vault is instantly mirrored to the twin. If the main vault is flooded, the twin vault takes over within seconds and you never lose a single deposit record.",
        icon: "🗄️",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "Amazon RDS Multi-AZ",
        subtitle: "High-availability relational database for Orders and Subscriptions",
        useCase: {
            title: "AMI PVT LTD Marketplace — migrating Orders & Subscriptions to RDS PostgreSQL Multi-AZ",
            story: "AMI PVT LTD migrates the Orders and Subscriptions tables from DynamoDB to a managed relational store after enterprise customers request complex SQL reporting on purchase history. marketplace-orders-db (RDS PostgreSQL 15, db.r6g.large) is deployed in Multi-AZ mode inside marketplace-vpc: the primary instance sits in ap-southeast-1a, a synchronous standby in ap-southeast-1b. The Spring Boot API connects via the CNAME endpoint marketplace-orders-db.cluster.ap-southeast-1.rds.amazonaws.com — during a failover, RDS flips the DNS to the standby in under 60 seconds with no connection string change required. A Read Replica in ap-southeast-1c offloads the finance reporting Lambda that runs daily aggregation queries.",
            diagram: [
                { actor: "Spring Boot API (marketplace-api-asg)", icon: "🏢" },
                { arrow: "writes via CNAME endpoint (port 5432)" },
                { actor: "RDS Primary — marketplace-orders-db (ap-southeast-1a)", icon: "🗄️" },
                { arrow: "synchronous replication" },
                { actor: "RDS Standby (ap-southeast-1b) — auto failover <60 s", icon: "🔒" },
                { arrow: "async replication" },
                { actor: "RDS Read Replica (ap-southeast-1c) — finance reports only", icon: "📊" },
            ],
        },
        buildSystem: [
            "Create a DB Subnet Group marketplace-db-subnet-group spanning private subnets in ap-southeast-1a, ap-southeast-1b, and ap-southeast-1c inside marketplace-vpc",
            "Create Security Group marketplace-rds-sg: allow port 5432 inbound only from marketplace-api-sg and marketplace-lambda-sg; deny all else",
            "Launch RDS PostgreSQL 15 instance marketplace-orders-db: class=db.r6g.large, MultiAZ=true, storage=200 GB gp3, StorageEncrypted=true using KMS CMK marketplace-rds-key",
            "Enable automated backups with RetentionPeriod=7 days and set BackupWindow to 03:00–04:00 UTC (off-peak); enable deletion protection",
            "Create a Read Replica marketplace-orders-db-replica in ap-southeast-1c; configure the finance-reporting Lambda to use the replica endpoint for all SELECT queries",
            "Store the DB credentials in AWS Secrets Manager marketplace-orders-db-secret with automatic rotation every 30 days; update Spring Boot datasource to read from Secrets Manager at startup",
            "Enable Performance Insights on the primary with a 7-day retention window to identify slow queries from the Spring Boot connection pool",
            "Set up a CloudWatch Alarm on FreeStorageSpace < 20 GB and DatabaseConnections > 80 to alert the ops team via marketplace-notifications SNS before capacity issues occur",
        ],
        flow: ["Spring Boot writes via CNAME", "Primary RDS (AZ-a)", "Sync Standby (AZ-b)", "DNS Failover <60 s", "Read Replica (AZ-c)"],
        examTips: [
            "Multi-AZ is for HIGH AVAILABILITY (failover) not performance — reads still go to the primary; use Read Replicas for read scaling",
            "Failover is automatic and DNS-based — the CNAME flips to standby; applications must NOT cache the resolved IP (use the RDS endpoint hostname, not an IP)",
            "Read Replicas use ASYNCHRONOUS replication — there is a replication lag; never use a Read Replica for data that must be 100% up-to-date (e.g. checkout stock checks)",
            "RDS automated backups enable point-in-time recovery (PITR) to any second within the retention window; snapshots are full and manual",
            "Encryption must be enabled at creation time — you cannot encrypt an existing unencrypted RDS instance in place; snapshot + restore with encryption is the migration path",
        ],
        roleJson: [
            {
                label: "AWS CLI — create RDS PostgreSQL Multi-AZ with encrypted storage",
                note: "💡 Always use the CNAME endpoint (not the instance endpoint) in your app — it survives failover; the instance endpoint is AZ-specific and breaks on failover.",
                code: `# Create DB subnet group
aws rds create-db-subnet-group \\
  --db-subnet-group-name marketplace-db-subnet-group \\
  --db-subnet-group-description "Marketplace RDS subnets" \\
  --subnet-ids subnet-aaa111 subnet-bbb222 subnet-ccc333

# Create Multi-AZ RDS PostgreSQL instance
aws rds create-db-instance \\
  --db-instance-identifier marketplace-orders-db \\
  --db-instance-class db.r6g.large \\
  --engine postgres \\
  --engine-version 15.4 \\
  --master-username marketplace_admin \\
  --master-user-password REPLACE_WITH_SECRETS_MANAGER \\
  --allocated-storage 200 \\
  --storage-type gp3 \\
  --storage-encrypted \\
  --kms-key-id alias/marketplace-rds-key \\
  --multi-az \\
  --db-subnet-group-name marketplace-db-subnet-group \\
  --vpc-security-group-ids sg-rds123 \\
  --backup-retention-period 7 \\
  --preferred-backup-window "03:00-04:00" \\
  --deletion-protection \\
  --enable-performance-insights \\
  --performance-insights-retention-period 7`,
            },
        ],
    },

    {
        id: 2,
        analogy: "Think of it like a franchise coffee shop chain — Amazon Aurora is the head office system that runs faster and smarter than a regular shop register, automatically clones itself across 3 buildings for safety, and if one building burns down the other two keep serving customers without anyone noticing.",
        icon: "⚡",
        color: ACCENT.teal,
        tag: "SCENARIO 2",
        title: "Amazon Aurora",
        subtitle: "High-performance MySQL-compatible cluster for the marketplace catalog",
        useCase: {
            title: "AMI PVT LTD Marketplace — Aurora MySQL cluster for the Products catalog with global read scaling",
            story: "AMI PVT LTD deploys marketplace-aurora-cluster (Aurora MySQL 8.0-compatible) for the Products and Sellers catalog — the most read-heavy dataset on the platform. Aurora stores 6 copies of data across 3 AZs automatically, and the cluster auto-scales read replicas from 1 to 5 based on CPU load. A Global Database replicates the cluster to ap-south-1 (Mumbai) with <1 second lag so enterprise customers in India get low-latency catalog reads. Aurora Serverless v2 is used for the marketplace-analytics-cluster that powers ad-hoc reporting — it scales from 0.5 to 32 ACUs and costs zero when idle. Backtrack is enabled with a 72-hour window so the team can roll back to any point without restoring a snapshot.",
            diagram: [
                { actor: "Spring Boot API / Lambda (ap-southeast-1)", icon: "🏢" },
                { arrow: "writes to Writer endpoint" },
                { actor: "Aurora Cluster — marketplace-aurora-cluster (Writer + up to 5 Readers)", icon: "⚡" },
                { arrow: "sub-1s async replication to Global DB" },
                { actor: "Aurora Global Database Secondary — ap-south-1 (Mumbai)", icon: "🌏" },
                { arrow: "reads via Reader endpoint" },
                { actor: "Lambda / Spring Boot (India region reads)", icon: "☁️" },
            ],
        },
        buildSystem: [
            "Create Aurora MySQL 8.0 cluster marketplace-aurora-cluster with 1 writer + 1 reader in ap-southeast-1a/1b; enable Multi-AZ automatically (Aurora stores 6 copies by default)",
            "Enable Aurora Auto Scaling on the reader fleet: policy = CPUUtilization > 60%, min replicas=1, max replicas=5 — the cluster scales readers in/out automatically",
            "Enable Backtrack on the cluster with a TargetBacktrackWindow of 259200 seconds (72 hours) — this allows instant in-place point-in-time rollback without snapshot restore",
            "Create Aurora Global Database: primary cluster = marketplace-aurora-cluster (ap-southeast-1), add secondary cluster in ap-south-1 for Indian enterprise customer reads",
            "Configure Spring Boot datasource to use the Writer Endpoint for INSERT/UPDATE and the Reader Endpoint for SELECT queries; use a separate JDBC URL for read-only transactions",
            "Enable Aurora Serverless v2 for marketplace-analytics-cluster: min=0.5 ACU, max=32 ACU — used by the Athena/reporting Lambda; scales to zero when no queries are running",
            "Store Aurora credentials in Secrets Manager marketplace-aurora-secret with RDS rotation Lambda enabled; Aurora integrates natively with Secrets Manager for rotation",
            "Enable Enhanced Monitoring (60-second granularity) and Performance Insights with 7-day retention to diagnose slow catalog queries from the Spring Boot connection pool",
        ],
        flow: ["Spring Boot writes to Writer", "Aurora 6-copy storage (3 AZs)", "Auto-scale Readers on load", "Global DB replication <1s", "Secondary reads in ap-south-1"],
        examTips: [
            "Aurora automatically maintains 6 copies of data across 3 AZs — this is built-in, not optional; it survives the loss of up to 2 AZ copies for writes and 3 for reads",
            "Aurora Serverless v2 is NOT the same as Aurora Serverless v1 — v2 scales in fine-grained increments (0.5 ACU steps) and can scale to zero; v1 has cold-start delays",
            "Aurora Global Database can be promoted to a standalone cluster in <1 minute for region-level disaster recovery — the secondary becomes the new primary (manual failover)",
            "Backtrack is Aurora-specific and NOT a snapshot restore — it rewinds the entire cluster in place to any point in the Backtrack window without downtime",
            "Aurora MySQL is up to 5× faster than RDS MySQL and Aurora PostgreSQL up to 3× faster than RDS PostgreSQL — for the exam, Aurora = higher performance + higher cost",
        ],
        roleJson: [
            {
                label: "AWS CLI — create Aurora MySQL cluster with auto-scaling readers",
                note: "💡 Use the cluster Reader Endpoint (not individual replica endpoints) for read traffic — Aurora updates the Reader Endpoint automatically as replicas are added or removed.",
                code: `# Create Aurora MySQL cluster
aws rds create-db-cluster \\
  --db-cluster-identifier marketplace-aurora-cluster \\
  --engine aurora-mysql \\
  --engine-version 8.0.mysql_aurora.3.04.0 \\
  --master-username marketplace_admin \\
  --master-user-password REPLACE_WITH_SECRETS_MANAGER \\
  --db-subnet-group-name marketplace-db-subnet-group \\
  --vpc-security-group-ids sg-rds123 \\
  --storage-encrypted \\
  --backtrack-window 259200 \\
  --region ap-southeast-1

# Add writer instance
aws rds create-db-instance \\
  --db-cluster-identifier marketplace-aurora-cluster \\
  --db-instance-identifier marketplace-aurora-writer \\
  --db-instance-class db.r6g.large \\
  --engine aurora-mysql

# Add reader instance
aws rds create-db-instance \\
  --db-cluster-identifier marketplace-aurora-cluster \\
  --db-instance-identifier marketplace-aurora-reader-1 \\
  --db-instance-class db.r6g.large \\
  --engine aurora-mysql`,
            },
        ],
    },

    {
        id: 3,
        analogy: "Think of it like a supermarket self-checkout with a turbocharged helper standing right next to you — DynamoDB is the checkout machine (fast, handles millions of items), and DAX is the helper who already memorised the price of every item on your regular shopping list, so you never have to scan the barcode twice.",
        icon: "⚡",
        color: ACCENT.amber,
        tag: "SCENARIO 3",
        title: "Amazon DynamoDB + DAX",
        subtitle: "Products table with in-memory DAX cache and Streams for real-time events",
        useCase: {
            title: "AMI PVT LTD Marketplace — DynamoDB Products table with DAX cluster and Streams trigger",
            story: "The Products table is the most read-heavy table in the marketplace — every page load hits it. AMI PVT LTD adds a DAX cluster (marketplace-dax-cluster, 3-node r6g.large across 3 AZs) in front of DynamoDB. The Spring Boot API SDK is swapped for the DAX SDK — cache hits return in microseconds vs DynamoDB's low-milliseconds. DynamoDB Streams is enabled on the Products table with NEW_AND_OLD_IMAGES; a Lambda (marketplace-product-indexer) is triggered on every change to update the Elasticsearch product search index. A Global Secondary Index (GSI) SellerId-Price-Index allows the marketplace to query all products from a seller sorted by price — a query pattern not possible on the primary key.",
            diagram: [
                { actor: "Spring Boot API (read — GetItem / Query)", icon: "🏢" },
                { arrow: "DAX SDK request (cache-first)" },
                { actor: "DAX Cluster — marketplace-dax-cluster (3 nodes, microsecond cache)", icon: "⚡" },
                { arrow: "cache miss → passthrough" },
                { actor: "DynamoDB Products Table (primary key: productId)", icon: "🗄️" },
                { arrow: "DynamoDB Streams (NEW_AND_OLD_IMAGES)" },
                { actor: "marketplace-product-indexer Lambda → Elasticsearch", icon: "⚡" },
            ],
        },
        buildSystem: [
            "Enable DynamoDB Streams on Products table: StreamViewType=NEW_AND_OLD_IMAGES — required for the Lambda indexer to receive both pre- and post-change images",
            "Create Lambda event source mapping: function=marketplace-product-indexer, eventSourceArn=Products table stream ARN, batchSize=100, startingPosition=LATEST",
            "Create DAX subnet group marketplace-dax-subnet-group in private subnets; create DAX cluster marketplace-dax-cluster: nodeType=dax.r6g.large, replicationFactor=3, encryptionAtRest enabled",
            "Update Spring Boot API dependency from AWS SDK DynamoDB client to DAX SDK (amazon-dax-client); change endpoint from DynamoDB URL to DAX cluster endpoint — no application logic changes needed",
            "Create GSI SellerId-Price-Index on Products table: partitionKey=sellerId, sortKey=price, projectionType=INCLUDE, non-key attributes=[title, category, thumbnailUrl]",
            "Set DynamoDB table capacity mode to On-Demand for Products (unpredictable spikes during promotions) and Provisioned (RCU=100, WCU=50) for Orders (steady, predictable writes)",
            "Enable DynamoDB Point-in-Time Recovery (PITR) on Products and Orders tables — provides continuous backups with 35-day recovery window at no additional setup cost",
            "Create a CloudWatch Alarm on DAX cache hit rate (CacheHits / (CacheHits + CacheMisses) < 80%) to alert if the cache is being under-utilised after a DAX cluster restart",
        ],
        flow: ["API reads via DAX SDK", "DAX cache hit (µs)", "Cache miss → DynamoDB", "Streams capture change", "Lambda updates search index"],
        examTips: [
            "DAX is a write-through cache for DynamoDB — writes go to DynamoDB first, then DAX; DAX is only beneficial for READ-heavy workloads with repeated GetItem/Query calls",
            "DAX does NOT support table scans, transactions (TransactGetItems/TransactWriteItems), or strongly consistent reads — these pass through directly to DynamoDB",
            "DynamoDB Streams records are available for 24 hours — if your Lambda consumer falls behind or fails for >24 hours, records are lost; use DLQ on the event source mapping",
            "GSIs have their own RCU/WCU separate from the base table — if the GSI runs out of write capacity, writes to the base table are throttled",
            "On-Demand mode costs ~6–7× more per request than fully-utilised Provisioned capacity but requires zero capacity planning — use it for new or unpredictable tables",
        ],
        roleJson: [
            {
                label: "AWS CLI — create DAX cluster and add GSI to Products table",
                note: "💡 DAX caches at the item level — a cache miss on a Query still fetches from DynamoDB; ensure your Query results fit within DAX's item cache to get maximum hit rates.",
                code: `# Create DAX cluster
aws dax create-cluster \\
  --cluster-name marketplace-dax-cluster \\
  --node-type dax.r6g.large \\
  --replication-factor 3 \\
  --iam-role-arn arn:aws:iam::234567890123:role/DAXRole \\
  --subnet-group marketplace-dax-subnet-group \\
  --sse-specification Enabled=true

# Add GSI to Products table (update operation)
aws dynamodb update-table \\
  --table-name Products \\
  --attribute-definitions \\
    AttributeName=sellerId,AttributeType=S \\
    AttributeName=price,AttributeType=N \\
  --global-secondary-index-updates '[{
    "Create": {
      "IndexName": "SellerId-Price-Index",
      "KeySchema": [
        {"AttributeName":"sellerId","KeyType":"HASH"},
        {"AttributeName":"price","KeyType":"RANGE"}
      ],
      "Projection": {"ProjectionType":"INCLUDE","NonKeyAttributes":["title","category","thumbnailUrl"]},
      "BillingMode": "PAY_PER_REQUEST"
    }
  }]'`,
            },
        ],
    },

    {
        id: 4,
        analogy: "Think of it like a clipboard board on the wall of a busy café — instead of the barista running to the stockroom every time a customer orders a latte, the clipboard lists the 50 most popular orders right at arm's reach. The stockroom (database) is only consulted when someone orders something unusual.",
        icon: "🚀",
        color: ACCENT.orange,
        tag: "SCENARIO 4",
        title: "Amazon ElastiCache (Redis)",
        subtitle: "In-memory session store and product listing cache for the marketplace",
        useCase: {
            title: "AMI PVT LTD Marketplace — ElastiCache Redis cluster for session tokens and hot product caching",
            story: "AMI PVT LTD uses ElastiCache for Redis (marketplace-redis-cluster, cluster mode disabled, 2 nodes r7g.large in ap-southeast-1a/1b) for two purposes: (1) Session token store — after Cognito authentication, the Spring Boot API stores the JWT session state in Redis with a 30-minute TTL so stateless EC2 instances share session context across the ALB; (2) Hot product cache — the top 500 most-viewed products are cached in Redis with a 5-minute TTL, reducing DynamoDB reads by 85% during peak traffic. Redis Cluster Mode is intentionally disabled to support multi-key operations (MGET, pipelines) needed for batch product lookups. Multi-AZ with automatic failover promotes the replica to primary in <30 seconds if the primary node fails.",
            diagram: [
                { actor: "Browser / Mobile Client", icon: "🌐" },
                { arrow: "HTTPS → ALB → Spring Boot (stateless)" },
                { actor: "Spring Boot API (marketplace-api-asg)", icon: "🏢" },
                { arrow: "SET session token (TTL 30 min) / GET cached products" },
                { actor: "marketplace-redis-cluster (ElastiCache Redis, Multi-AZ)", icon: "🚀" },
                { arrow: "cache miss → query DynamoDB Products" },
                { actor: "DynamoDB Products Table", icon: "🗄️" },
            ],
        },
        buildSystem: [
            "Create ElastiCache Subnet Group marketplace-redis-subnet-group in private subnets ap-southeast-1a and ap-southeast-1b inside marketplace-vpc",
            "Create Security Group marketplace-redis-sg: allow port 6379 inbound only from marketplace-api-sg; deny public internet access",
            "Create Redis replication group marketplace-redis-cluster: nodeType=cache.r7g.large, numCacheClusters=2, automaticFailoverEnabled=true, multiAZEnabled=true, atRestEncryptionEnabled=true, transitEncryptionEnabled=true",
            "Configure Redis AUTH token stored in Secrets Manager marketplace-redis-auth-secret; pass the token in the Spring Boot Redis client configuration (Lettuce or Jedis)",
            "Implement cache-aside pattern in Spring Boot: on GET /products/{id} — check Redis FIRST (O(1) GET), on miss → DynamoDB GetItem → write result to Redis with EX=300 (5 min TTL)",
            "Implement session store: after Cognito JWT validation, Spring Boot calls Redis SET sessionId:{jwt_payload} EX=1800; every subsequent request reads session from Redis, not DynamoDB",
            "Enable Redis Cluster snapshots: automatic daily snapshot at 04:00 UTC with retention 3 days; in the event of total cluster failure, data can be restored from the last snapshot",
            "Create CloudWatch Alarms on CacheHits, CacheMisses, and EngineCPUUtilization; alert via marketplace-notifications SNS if EngineCPUUtilization > 75% for 5 minutes",
        ],
        flow: ["API checks Redis (GET)", "Cache hit → return <1ms", "Cache miss → DynamoDB", "Write to Redis (TTL 5 min)", "Next request hits cache"],
        examTips: [
            "ElastiCache Redis supports persistence (RDB snapshots + AOF), pub/sub, sorted sets, and Lua scripting — Memcached does NOT support any of these; choose Redis for anything beyond simple caching",
            "Redis Cluster Mode ENABLED shards data across multiple node groups (horizontal scaling) — but multi-key operations across shards are not supported; Cluster Mode DISABLED keeps all data on one primary with replicas",
            "Lazy loading (cache-aside): populate cache only on a miss — risk: cache stampede if many requests miss simultaneously (use probabilistic early expiration to mitigate)",
            "Write-through: populate cache on every write — eliminates stale data but adds write latency and wastes cache space for data never read back",
            "ElastiCache does NOT support public endpoints — it is always deployed inside a VPC; you cannot access it from the internet directly",
        ],
        roleJson: [
            {
                label: "AWS CLI — create ElastiCache Redis replication group with Multi-AZ",
                note: "💡 Enable transitEncryptionEnabled=true when creating the cluster — you cannot enable in-transit encryption on an existing cluster without replacing it.",
                code: `# Create subnet group
aws elasticache create-cache-subnet-group \\
  --cache-subnet-group-name marketplace-redis-subnet-group \\
  --cache-subnet-group-description "Marketplace Redis subnets" \\
  --subnet-ids subnet-aaa111 subnet-bbb222

# Create Redis replication group (Multi-AZ, 2 nodes)
aws elasticache create-replication-group \\
  --replication-group-id marketplace-redis-cluster \\
  --replication-group-description "Marketplace session and product cache" \\
  --cache-node-type cache.r7g.large \\
  --engine redis \\
  --engine-version 7.0 \\
  --num-cache-clusters 2 \\
  --automatic-failover-enabled \\
  --multi-az-enabled \\
  --at-rest-encryption-enabled \\
  --transit-encryption-enabled \\
  --auth-token REPLACE_WITH_SECRETS_MANAGER_VALUE \\
  --cache-subnet-group-name marketplace-redis-subnet-group \\
  --security-group-ids sg-redis123`,
            },
        ],
    },

    {
        id: 5,
        analogy: "Think of it like a live sports scoreboard — millions of fans watch the score update in real time; the scoreboard system ingests every goal, foul, and substitution as it happens (Kinesis Data Streams), relays live stats to TV graphics (processing Lambda), and also records the full match tape for replay analysis later (Firehose → S3).",
        icon: "📡",
        color: ACCENT.purple,
        tag: "SCENARIO 5",
        title: "Amazon Kinesis",
        subtitle: "Real-time order event streaming and analytics pipeline for the marketplace",
        useCase: {
            title: "AMI PVT LTD Marketplace — Kinesis Data Streams ingesting order events for real-time fraud detection and Firehose archiving",
            story: "AMI PVT LTD creates marketplace-order-stream (Kinesis Data Streams, 4 shards) to capture every marketplace event — order placed, payment charged, tool deployed — in real time. The marketplace-order-processor Lambda publishes events to the stream using the Kinesis SDK. A second Lambda (marketplace-fraud-detector, Node.js) is the stream consumer with enhanced fan-out, processing each event within 70ms to flag suspicious orders (unusually large orders, new buyer accounts) by writing a FRAUD_HOLD status to the Orders DynamoDB table. Simultaneously, marketplace-order-firehose (Kinesis Data Firehose) delivers a full copy of all events to S3 bucket marketplace-analytics-raw partitioned by year/month/day for Athena queries.",
            diagram: [
                { actor: "marketplace-order-processor Lambda (producer)", icon: "⚡" },
                { arrow: "PutRecord to marketplace-order-stream (4 shards)" },
                { actor: "Kinesis Data Streams — marketplace-order-stream", icon: "📡" },
                { arrow: "enhanced fan-out consumer (70ms latency)" },
                { actor: "marketplace-fraud-detector Lambda (real-time processing)", icon: "⚡" },
                { arrow: "Firehose delivery (buffered, 60s / 5 MB)" },
                { actor: "S3 marketplace-analytics-raw/year=.../month=.../day=...", icon: "🪣" },
            ],
        },
        buildSystem: [
            "Create Kinesis Data Stream marketplace-order-stream: shardCount=4 (supports 4 MB/s write, 8 MB/s read), retentionPeriodHours=24; increase to 168 hours for compliance audit trail",
            "Register marketplace-fraud-detector Lambda as an enhanced fan-out consumer using RegisterStreamConsumer API — enhanced fan-out gives 2 MB/s dedicated throughput per shard per consumer (vs shared 2 MB/s for standard consumers)",
            "Configure Lambda event source mapping on marketplace-fraud-detector: startingPosition=LATEST, batchSize=100, parallelizationFactor=2 (2 concurrent Lambda per shard)",
            "Create Kinesis Data Firehose delivery stream marketplace-order-firehose: source=Kinesis Data Stream marketplace-order-stream, destination=S3 marketplace-analytics-raw, buffer 60 seconds or 5 MB",
            "Configure Firehose prefix: !{partitionKeyFromQuery:year}/!{partitionKeyFromQuery:month}/!{partitionKeyFromQuery:day}/ with dynamic partitioning enabled using a JQ expression on the event timestamp field",
            "Add Firehose data transformation: attach a Lambda that converts each Kinesis record from raw JSON to Parquet format before delivery to S3 — Athena queries run 30–90% faster on Parquet vs JSON",
            "Update marketplace-order-processor Lambda to call kinesis.putRecord with partitionKey=orderId (ensures all events for the same order land on the same shard for ordering)",
            "Create CloudWatch Alarm on GetRecords.IteratorAgeMilliseconds > 60000 to alert when the fraud detector Lambda is falling behind the stream (iterator age = processing lag)",
        ],
        flow: ["Lambda publishes event", "Kinesis Stream (4 shards)", "Enhanced Fan-out Consumer", "Fraud detection <70ms", "Firehose → S3 Parquet"],
        examTips: [
            "Kinesis Data Streams shard capacity: 1 MB/s or 1,000 records/s write per shard; 2 MB/s read per shard shared across all standard consumers (2 MB/s dedicated with enhanced fan-out)",
            "Enhanced fan-out consumers use HTTP/2 push — each registered consumer gets its own 2 MB/s per shard, independent of other consumers; standard consumers share the 2 MB/s read limit",
            "Kinesis Data Firehose is NOT real-time — it buffers data (minimum 60 seconds or 1 MB) before delivery; for sub-second latency use Kinesis Data Streams with a Lambda consumer",
            "IteratorAgeMilliseconds is the key lag metric for Kinesis consumers — if it keeps growing, the consumer cannot keep up with the stream; add more shards (resharding) or increase Lambda concurrency",
            "Kinesis Data Streams retains records for 24 hours by default (extendable to 365 days); SQS retains messages for up to 14 days — choose Kinesis when multiple consumers need the same data",
        ],
        roleJson: [
            {
                label: "AWS CLI — create Kinesis stream, Firehose delivery, and register enhanced fan-out consumer",
                note: "💡 Set parallelizationFactor > 1 on the Lambda event source mapping to process multiple batches per shard concurrently — this is the fastest way to reduce iterator age without resharding.",
                code: `# Create Kinesis Data Stream
aws kinesis create-stream \\
  --stream-name marketplace-order-stream \\
  --shard-count 4

# Register enhanced fan-out consumer
aws kinesis register-stream-consumer \\
  --stream-arn arn:aws:kinesis:ap-southeast-1:234567890123:stream/marketplace-order-stream \\
  --consumer-name marketplace-fraud-detector

# Create Firehose delivery stream (Kinesis source → S3)
aws firehose create-delivery-stream \\
  --delivery-stream-name marketplace-order-firehose \\
  --delivery-stream-type KinesisStreamAsSource \\
  --kinesis-stream-source-configuration '{
    "KinesisStreamARN": "arn:aws:kinesis:ap-southeast-1:234567890123:stream/marketplace-order-stream",
    "RoleARN": "arn:aws:iam::234567890123:role/FirehoseDeliveryRole"
  }' \\
  --s3-destination-configuration '{
    "RoleARN": "arn:aws:iam::234567890123:role/FirehoseDeliveryRole",
    "BucketARN": "arn:aws:s3:::marketplace-analytics-raw",
    "BufferingHints": {"SizeInMBs": 5, "IntervalInSeconds": 60},
    "CompressionFormat": "UNCOMPRESSED"
  }'`,
            },
        ],
    },

    {
        id: 6,
        analogy: "Think of it like hiring a smart accountant who works directly in your archive room — instead of moving all your old invoices to a special accounting office (ETL to a warehouse), the accountant walks into your storage room (S3), opens the right filing cabinets (Glue Data Catalog), and answers your question on the spot (Athena SQL). You only pay for the time they spend reading, not for the room itself.",
        icon: "🔍",
        color: ACCENT.green,
        tag: "SCENARIO 6",
        title: "Amazon Athena + AWS Glue",
        subtitle: "Serverless SQL analytics on marketplace event data stored in S3",
        useCase: {
            title: "AMI PVT LTD Marketplace — Athena querying Kinesis Firehose Parquet data via Glue Data Catalog for business intelligence",
            story: "The raw order events delivered by Kinesis Firehose to S3 marketplace-analytics-raw are unstructured. AMI PVT LTD runs a Glue Crawler (marketplace-analytics-crawler) nightly at 01:00 UTC to infer the schema and populate the Glue Data Catalog (database: marketplace_analytics, table: order_events). The finance team then runs ad-hoc SQL queries in Athena — total revenue per seller per month, top 10 tools by purchase volume, churn analysis — without provisioning any servers. Athena scans only the partitions that match the WHERE clause (year/month/day) thanks to Firehose's dynamic partitioning, reducing query costs by up to 95% vs scanning the whole bucket. Query results are saved to S3 marketplace-athena-results.",
            diagram: [
                { actor: "S3 marketplace-analytics-raw (Parquet, partitioned by date)", icon: "🪣" },
                { arrow: "Glue Crawler (nightly 01:00 UTC) → infers schema" },
                { actor: "AWS Glue Data Catalog — database: marketplace_analytics", icon: "🗂️" },
                { arrow: "SQL query via Athena console or API" },
                { actor: "Amazon Athena (serverless — scans partitions only)", icon: "🔍" },
                { arrow: "writes results to" },
                { actor: "S3 marketplace-athena-results", icon: "🪣" },
            ],
        },
        buildSystem: [
            "Create Glue Database marketplace_analytics in the Glue Data Catalog; this is the logical namespace for all marketplace analytics tables",
            "Create Glue Crawler marketplace-analytics-crawler: data source=s3://marketplace-analytics-raw/, target database=marketplace_analytics, schedule=cron(0 1 * * ? *) — runs nightly at 01:00 UTC",
            "Configure Glue Crawler to use Parquet classifier and create/update partitions automatically — the crawler detects new year/month/day partitions added by Firehose each day",
            "In Athena console, set query result location to s3://marketplace-athena-results/; enable query result reuse (TTL=60 minutes) to avoid re-scanning S3 for repeated identical queries",
            "Create Athena workgroup marketplace-finance-wg with data usage controls: bytesScannedCutoffPerQuery=10 GB (fail expensive queries before they incur large costs), enforce workgroup settings=true",
            "Run MSCK REPAIR TABLE to manually add any partitions the crawler missed; alternatively configure Firehose to call Glue's AddPartition API on each new partition (avoids crawler delay)",
            "Create a Glue ETL Job marketplace-orders-etl: reads from Orders DynamoDB table via Glue DynamoDB connector, transforms, and writes Parquet to S3 marketplace-analytics-processed for monthly aggregation reporting",
            "Integrate Athena with QuickSight: create QuickSight data source pointing to the marketplace-finance-wg Athena workgroup; build dashboards for seller revenue, order volume trends, and tool adoption rates",
        ],
        flow: ["Firehose delivers Parquet to S3", "Glue Crawler infers schema", "Glue Data Catalog updated", "Athena SQL query (partition pruning)", "Results to S3 / QuickSight"],
        examTips: [
            "Athena charges per byte scanned ($5 per TB) — partitioning and columnar formats (Parquet, ORC) are the two most effective ways to reduce cost; Parquet can reduce scanned data by 87% vs CSV",
            "Glue Crawler populates the Data Catalog — the catalog is just metadata (schema + partition locations); the actual data stays in S3; Athena reads data directly from S3 using the catalog as a map",
            "Athena is serverless and stateless — there is no cluster to provision or manage; you are billed only for the bytes scanned during each query; results are stored in S3",
            "Glue ETL jobs run on a managed Apache Spark environment (DPUs) — use Glue for complex multi-step transformations; use Athena for ad-hoc SQL on existing S3 data without transformation",
            "Athena Federated Query allows querying data sources beyond S3 (RDS, DynamoDB, Redshift) using Glue Lambda connectors — useful for joining marketplace Orders (RDS) with raw events (S3) in a single SQL query",
        ],
        roleJson: [
            {
                label: "AWS CLI — create Glue crawler and query Athena with partition pruning",
                note: "💡 Always set a query result S3 location in the Athena workgroup — without it, queries will fail or default to an unexpected location, which can cause permission issues.",
                code: `# Create Glue database
aws glue create-database \\
  --database-input Name=marketplace_analytics,Description="Marketplace analytics tables"

# Create Glue Crawler
aws glue create-crawler \\
  --name marketplace-analytics-crawler \\
  --role arn:aws:iam::234567890123:role/GlueCrawlerRole \\
  --database-name marketplace_analytics \\
  --targets '{"S3Targets": [{"Path": "s3://marketplace-analytics-raw/"}]}' \\
  --schedule "cron(0 1 * * ? *)"

# Start crawler manually (first run)
aws glue start-crawler --name marketplace-analytics-crawler

# Example Athena query with partition pruning (cost-efficient)
# SELECT seller_id, SUM(amount) AS total_revenue
# FROM marketplace_analytics.order_events
# WHERE year='2026' AND month='04'
# GROUP BY seller_id
# ORDER BY total_revenue DESC
# LIMIT 10;

# Create Athena workgroup with cost controls
aws athena create-work-group \\
  --name marketplace-finance-wg \\
  --configuration '{
    "ResultConfiguration": {
      "OutputLocation": "s3://marketplace-athena-results/"
    },
    "BytesScannedCutoffPerQuery": 10737418240,
    "EnforceWorkGroupConfiguration": true,
    "PublishCloudWatchMetricsEnabled": true
  }'`,
            },
        ],
    },
];

export default scenarios;
