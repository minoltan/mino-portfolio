import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Databases & Analytics matrices
 * RDS, Aurora, DynamoDB, ElastiCache, Kinesis, Athena, Glue, Redshift
 * Reference: https://digitalcloud.training/amazon-rds/
 *            https://digitalcloud.training/amazon-aurora/
 *            https://digitalcloud.training/amazon-dynamodb/
 *            https://digitalcloud.training/amazon-elasticache/
 *            https://digitalcloud.training/amazon-kinesis/
 *            https://digitalcloud.training/amazon-athena/
 *            https://digitalcloud.training/aws-glue/
 *            https://digitalcloud.training/amazon-redshift/
 */

const matrices = [
    {
        id: "database-selection-guide",
        title: "AWS Database Selection Guide",
        subtitle: "Choose the right database for each AMI PVT LTD Marketplace workload",
        color: ACCENT.primary,
        columns: ["Database", "Type", "Use case in Marketplace", "Key strength", "Watch out for"],
        rows: [
            ["Amazon RDS (PostgreSQL/MySQL)", "Relational (OLTP)", "Orders & Subscriptions — complex SQL joins, ACID transactions", "Familiar SQL, ACID, Multi-AZ failover, Read Replicas", "Cannot scale writes horizontally; max 40 TB storage; fixed schema"],
            ["Amazon Aurora MySQL/PostgreSQL", "Relational (OLTP) — cloud-native", "Products & Sellers catalog — high-read, Global Database for multi-region", "5× faster MySQL / 3× faster PostgreSQL; 6-copy storage; Backtrack", "Higher cost than RDS; Aurora Serverless v2 min cost even at idle"],
            ["Amazon DynamoDB", "NoSQL key-value + document", "Products lookup, session tokens, Leaderboard, Spin the Wheel state", "Infinite scale, single-digit ms, serverless, Streams for events", "No joins; eventual consistency by default; hot partition if bad key design"],
            ["Amazon ElastiCache Redis", "In-memory key-value", "Session store, hot product cache, rate limiting, pub/sub notifications", "Sub-millisecond latency, TTL, sorted sets, cluster failover <30 s", "Data lost on restart (unless persistence enabled); VPC-only; not searchable"],
            ["Amazon ElastiCache Memcached", "In-memory key-value (simple)", "Simple object cache (no persistence, no failover needed)", "Multi-threaded, simpler than Redis for pure caching", "No persistence, no replication, no pub/sub, no sorted sets"],
            ["Amazon Redshift", "Columnar OLAP data warehouse", "marketplace-analytics monthly revenue/seller reports, BI dashboards", "Petabyte-scale SQL analytics, Spectrum for S3 queries, fast aggregations", "Not for OLTP or low-latency lookups; charges for cluster even when idle"],
            ["Amazon Athena", "Serverless SQL (S3)", "Ad-hoc queries on Kinesis Firehose Parquet files in marketplace-analytics-raw", "No infrastructure, pay-per-scan, supports Parquet/ORC/JSON/CSV", "Not suitable for sub-second latency; cold start for first query"],
            ["Amazon EMR", "Managed Hadoop/Spark/Hive", "Large-scale batch ETL on raw marketplace event logs (TB/PB scale)", "Open-source ecosystem, custom Spark/Hive/Presto jobs, transient clusters", "Requires cluster management knowledge; not serverless; slower to start"],
            ["AWS Glue", "Serverless ETL + Data Catalog", "Crawl S3 Parquet files and populate Athena schema; DynamoDB → S3 export ETL", "Serverless Spark ETL, unified Data Catalog, auto-discovers schema", "Slower than custom EMR for complex jobs; DPU-based pricing can be expensive"],
            ["Amazon Kinesis Data Streams", "Real-time streaming", "Order event stream for fraud detection, real-time dashboard updates", "Sub-second latency, multiple consumers, 365-day retention, ordered per shard", "Not serverless — you manage shard count; max 1 MB/s per shard write"],
        ],
    },
    {
        id: "rds-aurora-key-numbers",
        title: "RDS & Aurora Key Numbers and Limits",
        subtitle: "Memorise these — they appear directly in SAA-C03 exam questions",
        color: ACCENT.teal,
        columns: ["Item", "RDS", "Aurora", "Exam note"],
        rows: [
            ["Max storage", "64 TB (gp2/gp3/io1)", "128 TB (auto-grows in 10 GB chunks)", "Aurora storage auto-scales; no need to pre-allocate"],
            ["Read Replicas (same region)", "Up to 5", "Up to 15", "Aurora supports 3× more replicas — better for read-heavy workloads"],
            ["Read Replica cross-region", "Yes (async)", "Yes via Global Database (<1s lag)", "Aurora Global DB promotes to primary in <1 min for DR"],
            ["Multi-AZ standby", "1 synchronous standby", "6 copies across 3 AZs (built-in)", "Aurora Multi-AZ is the default storage model, not a separate option"],
            ["Failover time (Multi-AZ)", "60–120 seconds (DNS flip)", "~30 seconds (DNS flip)", "Aurora failover is faster because replicas share the same storage volume"],
            ["Automated backup retention", "0–35 days", "1–35 days (0 disables backups)", "0 = disabled; minimum 1 day recommended for all production databases"],
            ["Point-in-time recovery", "Yes (to any second in retention window)", "Yes + Backtrack (in-place rewind, no restore)", "Backtrack is Aurora-only — it rewinds without creating a new cluster"],
            ["Encryption", "At rest (KMS) + in transit (SSL)", "At rest (KMS) + in transit (SSL)", "Must be enabled at creation; cannot encrypt an existing unencrypted instance"],
            ["Engine support (RDS)", "MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, Db2", "MySQL-compatible / PostgreSQL-compatible only", "Aurora does not support Oracle, SQL Server, or MariaDB"],
            ["Serverless mode", "Not available", "Aurora Serverless v2 (scales in 0.5 ACU steps)", "Aurora Serverless v2 can scale to 0 — suitable for dev/test environments"],
            ["Backtrack window", "Not available", "Up to 72 hours", "Backtrack is Aurora MySQL only; Aurora PostgreSQL does not support Backtrack"],
        ],
    },
    {
        id: "analytics-services-comparison",
        title: "AWS Analytics Services Comparison",
        subtitle: "Kinesis vs Athena vs Glue vs Redshift vs EMR — when to use each",
        color: ACCENT.amber,
        columns: ["Feature", "Kinesis Data Streams", "Kinesis Firehose", "Amazon Athena", "AWS Glue", "Amazon Redshift", "Amazon EMR"],
        rows: [
            ["Type", "Real-time stream (pull)", "Near-real-time delivery pipeline", "Serverless SQL on S3", "Serverless ETL + catalog", "Columnar data warehouse", "Managed Hadoop/Spark cluster"],
            ["Latency", "Sub-second (ms)", "60 s minimum buffer", "Seconds to minutes", "Minutes (job start-up)", "Seconds (optimised queries)", "Minutes (cluster provisioning)"],
            ["Serverless?", "No — manage shards", "Yes — fully managed", "Yes — fully managed", "Yes — fully managed", "No — provision cluster (Serverless option exists)", "No — provision cluster"],
            ["Input data format", "Any bytes (JSON, binary)", "JSON / CSV / Parquet (with transform)", "Parquet, ORC, JSON, CSV, Avro in S3", "DynamoDB, S3, RDS, JDBC sources", "S3 (COPY command), Kinesis, RDS", "S3, DynamoDB, HDFS, JDBC"],
            ["Primary output", "Consumer reads from stream", "S3 / Redshift / OpenSearch", "S3 (query results)", "S3 / RDS / Redshift / Glue catalog", "SQL query results", "S3 / HDFS / JDBC"],
            ["Pricing model", "Per shard-hour + PUT payload", "Per GB delivered", "Per TB scanned ($5/TB)", "DPU-hours for ETL jobs", "Per node-hour (dc2/ra3) or serverless per RPU-hour", "Per instance-hour for each node"],
            ["Best for", "Fraud detection, real-time alerts, log ingestion", "Archiving streams to S3/Redshift without code", "Ad-hoc SQL on S3 data, cost-effective BI queries", "Schema discovery, DynamoDB/RDS exports, Spark ETL", "Complex multi-table SQL analytics, BI tools, OLAP", "Custom Spark/Hive jobs, ML feature engineering, large-scale ETL"],
            ["AMI PVT LTD use", "marketplace-order-stream (fraud detection)", "marketplace-order-firehose → S3 Parquet archive", "Finance team ad-hoc revenue queries on S3", "marketplace-analytics-crawler + DynamoDB export ETL", "Monthly BI dashboards for seller performance", "Large-scale log processing (TB+ historical data)"],
            ["Max retention / data size", "365 days per stream", "No retention (delivery only)", "Unlimited (data stays in S3)", "Unlimited (data stays in source)", "Petabyte-scale per cluster", "Petabyte-scale per cluster"],
        ],
    },
];

export default matrices;
