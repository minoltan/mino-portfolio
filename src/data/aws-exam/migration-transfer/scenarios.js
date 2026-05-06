import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Migration & Transfer scenarios
 *
 * Services: AWS Migration Hub, AWS Application Migration Service (MGN),
 *           AWS Database Migration Service (DMS), AWS Schema Conversion Tool (SCT),
 *           AWS DataSync, AWS Snow Family, AWS Transfer Family
 * Reference: https://digitalcloud.training/aws-migration-services/
 */

const scenarios = [
    {
        id: 1,
        analogy: "Think of it like relocating a running factory to a new building — instead of shutting down production, packing everything, and restarting (downtime migration), a team of workers continuously photographs every machine and its state, sets up identical copies in the new building, and keeps them perfectly in sync until the moment the factory owner flips a switch and all production moves over in minutes — with zero product lost.",
        icon: "🚚",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "AWS Application Migration Service (MGN)",
        subtitle: "Lift-and-shift of the on-premises Spring Boot API servers to EC2",
        useCase: {
            title: "AMI PVT LTD Marketplace — MGN replicating on-prem marketplace API servers to EC2 with near-zero downtime",
            story: "Before AMI PVT LTD existed purely in AWS, the original marketplace-api ran on 4 bare-metal servers in a Singapore co-location facility. The team uses AWS Application Migration Service (MGN) to perform a lift-and-shift to EC2 without re-architecting. The AWS Replication Agent is installed on each server; it continuously replicates disk data to a staging area in marketplace-prod (234567890123). When ready for cutover, a Test Instance is launched in marketplace-vpc to validate the application. During the 30-minute maintenance window, a final sync completes, a Cutover Instance replaces the on-prem servers, and the Route 53 A record for api.marketplace.ami.com is updated to the new EC2 IPs. Total downtime: under 15 minutes. Post-migration, the servers are modernised incrementally from EC2 to ECS Fargate.",
            diagram: [
                { actor: "On-prem Spring Boot API servers (Singapore co-location)", icon: "🖥️" },
                { arrow: "AWS Replication Agent installed — continuous block-level replication" },
                { actor: "MGN Staging Area — marketplace-prod account (S3 + EC2 replication servers)", icon: "🚚" },
                { arrow: "launch Test Instance to validate app before cutover" },
                { actor: "Test EC2 Instance in marketplace-vpc (isolated, no production traffic)", icon: "🧪" },
                { arrow: "Cutover — final sync + Route 53 flip" },
                { actor: "Cutover EC2 Instance in marketplace-api-asg (production traffic)", icon: "✅" },
            ],
        },
        buildSystem: [
            "Set up MGN in marketplace-prod account: aws mgn initialize-service — creates the required IAM roles and the replication staging area in ap-southeast-1",
            "Install AWS Replication Agent on each on-prem server: download the agent installer from the MGN console, run with the IAM credentials for an MGN agent user — agent begins continuous block-level disk replication immediately",
            "Monitor replication lag in the MGN console: wait for Initial Sync to complete (100%) and replication lag to drop below 60 seconds before scheduling the cutover window",
            "Configure Launch Settings for cutover instances: instance type=t3.large (match on-prem CPU/RAM profile), VPC=marketplace-vpc, subnet=private subnet ap-southeast-1a, security group=marketplace-api-sg, IAM instance profile=Marketplace-API-EC2-Role",
            "Launch Test Instance to validate the migrated application: run Spring Boot integration tests against the test instance endpoint; verify DynamoDB connectivity, S3 access, and SQS integration before proceeding to cutover",
            "Schedule cutover window (30-minute maintenance): stop write traffic to on-prem servers, wait for MGN final sync (typically <5 minutes), launch Cutover Instance from MGN console",
            "Update Route 53 A records for api.marketplace.ami.com to point to the new EC2 instance private IPs (accessed via ALB); verify health checks pass on marketplace-alb target group",
            "After successful cutover: mark source servers as 'Cutover complete' in MGN; terminate the MGN staging instances to stop replication billing; schedule on-prem decommission after a 2-week monitoring period",
        ],
        flow: ["Install Replication Agent", "Continuous block replication", "Launch Test Instance", "Validate application", "Cutover + Route 53 flip"],
        examTips: [
            "MGN (Application Migration Service) replaced SMS (Server Migration Service) — SMS is deprecated; MGN is the current recommended lift-and-shift tool for server migrations to AWS",
            "MGN replicates at the BLOCK level (not file level) — it captures every disk change in near-real-time, making the cutover window very short (only the final incremental changes need to be synced)",
            "Test Instances launched during migration do NOT affect production — they run in an isolated test subnet; run your full test suite against test instances before committing to cutover",
            "MGN supports Windows and Linux servers; it does NOT re-architect the application — after migration, you should modernise further (e.g. EC2 → ECS/Lambda) as a separate initiative",
            "The migration process: Discover → Replicate → Launch Test → Cutover; the Replication Agent must be installed on each source server and requires outbound internet or Direct Connect to reach the MGN endpoints",
        ],
        roleJson: [
            {
                label: "AWS CLI — initialise MGN and configure replication settings",
                note: "💡 Always launch a Test Instance and run your full test suite before scheduling the cutover window — this is the single most important step to prevent a failed cutover that requires rolling back to on-premises.",
                code: `# Initialise MGN in the target account and region
aws mgn initialize-service --region ap-southeast-1

# List source servers (after agent installation on on-prem)
aws mgn describe-source-servers \\
  --filters '{"isArchived": false}' \\
  --region ap-southeast-1

# Update launch template for a source server
aws mgn update-launch-configuration \\
  --source-server-id s-1234567890abcdef0 \\
  --launch-disposition STARTED \\
  --target-instance-type-right-sizing-method NONE \\
  --region ap-southeast-1

# Launch test instances to validate before cutover
aws mgn start-test \\
  --source-server-i-ds s-1234567890abcdef0 \\
  --region ap-southeast-1

# Start cutover after test validation passes
aws mgn start-cutover \\
  --source-server-i-ds s-1234567890abcdef0 \\
  --region ap-southeast-1`,
            },
        ],
        cdkCode: [
            {
                label: "CDK (TypeScript) — MGN initialisation and launch configuration via AwsCustomResource",
                note: "💡 MGN has no CloudFormation L1 constructs — use AwsCustomResource (backed by a Lambda custom resource) to call the MGN SDK. The Replication Agent itself is installed manually on each source server.",
                code: `import * as cdk from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

// MGN has no CloudFormation/CDK L2 — use AwsCustomResource for SDK calls
export class MarketplaceMgnStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Initialise MGN in the target account (creates staging area + IAM roles)
    new cr.AwsCustomResource(this, 'InitMgn', {
      onCreate: {
        service: 'mgn',
        action: 'initializeService',
        parameters: {},
        physicalResourceId: cr.PhysicalResourceId.of('mgn-initialized'),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['mgn:InitializeService'],
          resources: ['*'],
        }),
      ]),
    });

    // Configure launch template for cutover instance (after agent reports in)
    new cr.AwsCustomResource(this, 'ConfigureLaunchTemplate', {
      onCreate: {
        service: 'mgn',
        action: 'updateLaunchConfiguration',
        parameters: {
          sourceServerID: 's-1234567890abcdef0',
          launchDisposition: 'STARTED',
          targetInstanceTypeRightSizingMethod: 'NONE',
        },
        physicalResourceId: cr.PhysicalResourceId.of('mgn-launch-config'),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['mgn:UpdateLaunchConfiguration'],
          resources: ['*'],
        }),
      ]),
    });
    // Note: install the Replication Agent on each source server manually,
    // then use mgn:StartTest and mgn:StartCutover via CLI or console for the
    // actual cutover — these are one-time operations that should not be in IaC.
  }
}`,
            },
        ],
    },

    {
        id: 2,
        analogy: "Think of it like a bilingual translator who lives between two offices — they sit at a desk between the old office (source database) and the new office (target database), reading every document written in the old office, translating it on the fly if necessary, and placing it in the correct inbox in the new office — without either office ever stopping work.",
        icon: "🔄",
        color: ACCENT.teal,
        tag: "SCENARIO 2",
        title: "AWS Database Migration Service (DMS)",
        subtitle: "Migrating the on-premises Orders PostgreSQL database to RDS Aurora with zero downtime",
        useCase: {
            title: "AMI PVT LTD Marketplace — DMS replicating on-prem PostgreSQL Orders DB to Aurora PostgreSQL with CDC for live cutover",
            story: "The original AMI PVT LTD marketplace-orders-db ran on an on-premises PostgreSQL 14 server in the Singapore co-location. The team uses DMS to migrate it to marketplace-aurora-cluster (Aurora PostgreSQL 15) in AWS with near-zero downtime. A DMS replication instance marketplace-dms-instance (dms.r5.large) is launched in marketplace-vpc. The migration has two phases: (1) Full Load — DMS reads all existing Orders, Subscriptions, and Products tables from the source PostgreSQL and inserts them into Aurora; (2) Change Data Capture (CDC) — after the full load, DMS continuously captures and applies every INSERT/UPDATE/DELETE from the source PostgreSQL transaction log to Aurora, keeping both databases in sync. The cutover window is under 5 minutes: stop writes to on-prem, wait for DMS CDC to catch up (zero lag), switch the JDBC connection string in Spring Boot, restart the API pods.",
            diagram: [
                { actor: "On-prem PostgreSQL 14 — marketplace-orders-db (source)", icon: "🗄️" },
                { arrow: "Full Load: read all tables and insert into Aurora" },
                { actor: "DMS Replication Instance — marketplace-dms-instance (dms.r5.large)", icon: "🔄" },
                { arrow: "CDC: capture every WAL change and apply to Aurora" },
                { actor: "Aurora PostgreSQL 15 — marketplace-aurora-cluster (target)", icon: "⚡" },
                { arrow: "Spring Boot JDBC connection string updated at cutover" },
                { actor: "marketplace-api-asg — now reading/writing Aurora only", icon: "🏢" },
            ],
        },
        buildSystem: [
            "Create DMS replication instance marketplace-dms-instance: dms.r5.large, MultiAZ=true, allocated storage=100 GB, VPC=marketplace-vpc, security group=marketplace-dms-sg (allow port 5432 to both source and target)",
            "Create DMS source endpoint: engine=postgres, server=<on-prem IP>, port=5432, database=marketplace_orders; enable SSL; test connection from the replication instance",
            "Create DMS target endpoint: engine=aurora-postgresql, server=<aurora-cluster-writer-endpoint>, port=5432, database=marketplace_orders; test connection",
            "Create DMS Task marketplace-orders-full-load-cdc: migrationType=full-load-and-cdc, source=on-prem endpoint, target=aurora endpoint; enable LOB mode for large text columns; set target table preparation mode=DO_NOTHING (schema already created by SCT)",
            "Enable WAL (Write-Ahead Logging) on the source PostgreSQL: set wal_level=logical, max_replication_slots=5, max_wal_senders=5 in postgresql.conf — required for DMS CDC to read the transaction log",
            "Monitor DMS task: watch TableStatistics in the DMS console — confirm Full Load rows match source count; watch CDCLatencyTarget (should trend toward 0 seconds as CDC catches up)",
            "Before cutover: quiesce writes to source database, wait for CDCLatencyTarget to reach 0, stop the DMS task, verify row counts match between source and Aurora",
            "Update Spring Boot datasource URL from on-prem JDBC to Aurora writer endpoint; perform a rolling restart of marketplace-api-asg; verify application health checks pass on marketplace-alb",
        ],
        flow: ["DMS Full Load (all rows)", "CDC begins (transaction log)", "Aurora synced in near-real-time", "Zero-lag cutover window", "Spring Boot switches to Aurora"],
        examTips: [
            "DMS supports HOMOGENEOUS migrations (e.g. PostgreSQL → Aurora PostgreSQL, MySQL → Aurora MySQL) and HETEROGENEOUS migrations (e.g. Oracle → Aurora PostgreSQL) — heterogeneous requires SCT first to convert schema",
            "CDC (Change Data Capture) requires the source database to have transaction logging enabled (WAL for PostgreSQL, binary log for MySQL, LogMiner for Oracle) — verify this before starting DMS",
            "DMS replication instances are EC2 instances — they run inside your VPC and must have network connectivity to both source and target endpoints; size them appropriately for the data volume",
            "Full Load + CDC is the recommended approach for near-zero downtime migrations — Full Load copies existing data, then CDC keeps the target in sync until the cutover window",
            "DMS does NOT migrate stored procedures, triggers, sequences, or user-defined types — use AWS Schema Conversion Tool (SCT) for schema objects, then DMS for data",
        ],
        roleJson: [
            {
                label: "AWS CLI — create DMS replication instance and migration task",
                note: "💡 Always create the target schema (tables, indexes, constraints) using SCT BEFORE starting the DMS Full Load task — use target table preparation mode=DO_NOTHING to avoid DMS truncating tables it created.",
                code: `# Create DMS replication instance
aws dms create-replication-instance \\
  --replication-instance-identifier marketplace-dms-instance \\
  --replication-instance-class dms.r5.large \\
  --allocated-storage 100 \\
  --multi-az \\
  --vpc-security-group-ids sg-dms123 \\
  --replication-subnet-group-identifier marketplace-dms-subnet-group \\
  --region ap-southeast-1

# Create source endpoint (on-premises PostgreSQL)
aws dms create-endpoint \\
  --endpoint-identifier marketplace-orders-source \\
  --endpoint-type source \\
  --engine-name postgres \\
  --server-name 192.168.1.100 \\
  --port 5432 \\
  --database-name marketplace_orders \\
  --username dms_user \\
  --password REPLACE_WITH_SECRET

# Create DMS replication task (Full Load + CDC)
aws dms create-replication-task \\
  --replication-task-identifier marketplace-orders-migration \\
  --source-endpoint-arn arn:aws:dms:ap-southeast-1:234567890123:endpoint:source \\
  --target-endpoint-arn arn:aws:dms:ap-southeast-1:234567890123:endpoint:target \\
  --replication-instance-arn arn:aws:dms:ap-southeast-1:234567890123:rep:marketplace-dms-instance \\
  --migration-type full-load-and-cdc \\
  --table-mappings file://table-mappings.json`,
            },
        ],
        cdkCode: [
            {
                label: "CDK (TypeScript) — DMS replication instance, endpoints, and Full Load + CDC task",
                note: "💡 Enable WAL logical replication on the source PostgreSQL (wal_level=logical) before creating the DMS task — without it, CDC will fail to read transaction log changes.",
                code: `import * as cdk from 'aws-cdk-lib';
import * as dms from 'aws-cdk-lib/aws-dms';
import { Construct } from 'constructs';

export class MarketplaceDmsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Replication instance — MultiAZ for HA during migration
    const repInstance = new dms.CfnReplicationInstance(this, 'DmsRepInstance', {
      replicationInstanceIdentifier: 'marketplace-dms-instance',
      replicationInstanceClass: 'dms.r5.large',
      allocatedStorage: 100,
      multiAz: true,
      replicationSubnetGroupIdentifier: 'marketplace-dms-subnet-group',
      vpcSecurityGroupIds: ['sg-dms123'],
    });

    // Source: on-premises PostgreSQL 14
    const sourceEndpoint = new dms.CfnEndpoint(this, 'SourceEndpoint', {
      endpointIdentifier: 'marketplace-orders-source',
      endpointType: 'source',
      engineName: 'postgres',
      serverName: '192.168.1.100',
      port: 5432,
      databaseName: 'marketplace_orders',
      username: 'dms_user',
      password: cdk.SecretValue.secretsManager('marketplace-dms-source-pw').unsafeUnwrap(),
    });

    // Target: Aurora PostgreSQL 15
    const targetEndpoint = new dms.CfnEndpoint(this, 'TargetEndpoint', {
      endpointIdentifier: 'marketplace-orders-target',
      endpointType: 'target',
      engineName: 'aurora-postgresql',
      serverName: 'marketplace-aurora-cluster.cluster-xxx.ap-southeast-1.rds.amazonaws.com',
      port: 5432,
      databaseName: 'marketplace_orders',
      username: 'dms_user',
      password: cdk.SecretValue.secretsManager('marketplace-dms-target-pw').unsafeUnwrap(),
    });

    // Full Load + CDC — copies all rows then streams ongoing changes
    new dms.CfnReplicationTask(this, 'MigrationTask', {
      replicationTaskIdentifier: 'marketplace-orders-migration',
      sourceEndpointArn: sourceEndpoint.ref,
      targetEndpointArn: targetEndpoint.ref,
      replicationInstanceArn: repInstance.ref,
      migrationType: 'full-load-and-cdc',
      tableMappings: JSON.stringify({
        rules: [{
          'rule-type': 'selection', 'rule-id': '1', 'rule-name': 'all-tables',
          'object-locator': { 'schema-name': 'public', 'table-name': '%' },
          'rule-action': 'include',
        }],
      }),
    });
  }
}`,
            },
        ],
    },

    {
        id: 3,
        analogy: "Think of it like a professional removalist who specialises in cross-country moves — when you move house within the same city (homogeneous migration), you can move everything yourself; but when you move to another country where furniture sizes and plug sockets are different (heterogeneous migration), you hire a specialist who repackages everything to fit the new house's standards before loading it onto the truck.",
        icon: "🔀",
        color: ACCENT.amber,
        tag: "SCENARIO 3",
        title: "AWS Schema Conversion Tool (SCT)",
        subtitle: "Converting an enterprise customer's Oracle schema to Aurora PostgreSQL",
        useCase: {
            title: "AMI PVT LTD Marketplace — SCT converting finserv-corp's Oracle 19c database schema to Aurora PostgreSQL before DMS data migration",
            story: "Enterprise subscriber finserv-corp (account 987654321098) stores their subscription billing data in Oracle 19c on-premises. Before migrating to Aurora PostgreSQL with DMS, the team uses AWS Schema Conversion Tool (SCT) to assess and convert the Oracle schema. SCT analyses 150 database objects: 40 tables, 25 stored procedures, 15 triggers, 30 indexes, and 40 views. The SCT report shows 85% of objects can be automatically converted (green); 10% need minor manual adjustments (amber — mostly Oracle-specific date functions converted to PostgreSQL equivalents); 5% require significant rewrites (red — Oracle CONNECT BY hierarchical queries replaced with PostgreSQL recursive CTEs). The team fixes the red/amber items and generates the DDL script for Aurora. DMS is then run with the converted schema already in place, migrating data only.",
            diagram: [
                { actor: "Oracle 19c Database — finserv-corp (on-premises)", icon: "🗄️" },
                { arrow: "SCT connects and extracts schema (DDL, procedures, triggers)" },
                { actor: "AWS Schema Conversion Tool (SCT) — desktop app / web", icon: "🔀" },
                { arrow: "automated conversion report (green/amber/red items)" },
                { actor: "SCT Assessment Report — 85% auto, 10% manual, 5% complex rewrites", icon: "📋" },
                { arrow: "apply converted DDL to target" },
                { actor: "Aurora PostgreSQL — converted schema ready for DMS data load", icon: "⚡" },
            ],
        },
        buildSystem: [
            "Download and install AWS SCT on the migration engineer's laptop; connect to the source Oracle 19c database using JDBC with appropriate read permissions on the schema being migrated",
            "Run SCT Assessment Report: SCT analyses all schema objects and produces a report estimating migration complexity, estimated hours for manual conversion, and a list of conversion issues per object",
            "Review the Assessment Report: categorise objects by traffic light — GREEN (automatic conversion, no action needed), AMBER (minor adjustments needed), RED (significant rewrites required)",
            "For AMBER items (e.g. Oracle TO_DATE → PostgreSQL to_timestamp, SYSDATE → NOW()): apply SCT's suggested transformations with minor manual corrections in the SCT editor",
            "For RED items (Oracle CONNECT BY hierarchical queries): manually rewrite as PostgreSQL recursive CTEs (WITH RECURSIVE); update the corresponding Java stored-procedure calls in the Spring Boot service",
            "Generate the converted DDL script from SCT; apply it to the target Aurora PostgreSQL cluster to create tables, indexes, and views; verify schema with a diff against the original Oracle schema",
            "Use SCT Data Extraction Agents for large Oracle databases (>100 GB): deploy agents on the source network, parallel-extract data to S3 marketplace-staging-bucket, then DMS loads from S3 rather than directly from Oracle — faster for large tables",
            "After schema conversion, configure DMS task with tableMapping rules to handle Oracle-to-PostgreSQL naming differences (Oracle uses uppercase column names, PostgreSQL uses lowercase by default)",
        ],
        flow: ["SCT connects to Oracle source", "Generates Assessment Report", "Engineer fixes amber/red items", "Converted DDL applied to Aurora", "DMS migrates data into converted schema"],
        examTips: [
            "SCT is used for HETEROGENEOUS migrations (different database engines, e.g. Oracle → Aurora PostgreSQL, SQL Server → MySQL) — for homogeneous migrations (PostgreSQL → Aurora PostgreSQL), SCT is optional since schemas are already compatible",
            "SCT converts schema (DDL, stored procedures, functions, views, triggers) — it does NOT migrate data; DMS migrates the data after SCT has prepared the target schema",
            "SCT's Assessment Report gives an estimated 'Action Required Items' count — a high number of red items means more manual effort before migration; factor this into migration timeline estimates",
            "Oracle-to-PostgreSQL common conversions SCT handles: DATE → TIMESTAMP, SYSDATE → CURRENT_TIMESTAMP, ROWNUM → ROW_NUMBER(), NVL → COALESCE, DECODE → CASE WHEN",
            "SCT can also assess application code (Java, C#) for Oracle-specific SQL embedded in the application — it flags queries that reference Oracle syntax so developers know what application code also needs updating",
        ],
        roleJson: [
            {
                label: "SCT assessment — Oracle to Aurora PostgreSQL migration complexity report",
                note: "💡 Run the SCT Assessment Report BEFORE committing to a migration timeline — the number of red items determines the actual migration effort; a surprise 50 red-item schema can add weeks to the project.",
                code: `# SCT is a desktop GUI tool — these are the key workflow steps:

# 1. Connect SCT to Oracle source (JDBC)
# Source: oracle.jdbc.driver.OracleDriver
# Connection: jdbc:oracle:thin:@192.168.1.100:1521:FINSERVDB
# Credentials: migration_user (needs SELECT ANY TABLE, SELECT ANY DICTIONARY)

# 2. Connect SCT to Aurora PostgreSQL target
# Target: org.postgresql.Driver
# Connection: jdbc:postgresql://<aurora-writer-endpoint>:5432/finservdb

# 3. Run migration assessment (from SCT GUI → Assessment Report)
# Output: migration-assessment-report.pdf + detailed CSV of action items

# 4. Apply auto-converted schema to Aurora (from SCT GUI → Apply to DB)
# Or export DDL script and review before applying:
# SCT → File → Save As SQL → finserv-aurora-schema.sql

# 5. Then run DMS for data migration with target table prep = DO_NOTHING
aws dms create-replication-task \\
  --replication-task-identifier finserv-orders-migration \\
  --migration-type full-load-and-cdc \\
  --replication-task-settings '{"TargetMetadata":{"TargetSchema":"public","TablePrep":"do-nothing"}}' \\
  --table-mappings '{"rules":[{"rule-type":"selection","rule-id":"1","rule-name":"all-tables","object-locator":{"schema-name":"FINSERV","table-name":"%"},"rule-action":"include"}]}'`,
            },
        ],
        cdkCode: [
            {
                label: "CDK (TypeScript) — DMS task for heterogeneous Oracle-to-Aurora migration (SCT output pre-applied)",
                note: "💡 SCT is a desktop GUI tool — it cannot be deployed via CDK. Apply the SCT-converted DDL to Aurora BEFORE deploying this stack, then set TablePrep to 'do-nothing' so DMS does not recreate or truncate tables.",
                code: `import * as cdk from 'aws-cdk-lib';
import * as dms from 'aws-cdk-lib/aws-dms';
import { Construct } from 'constructs';

// SCT is a desktop tool — run the assessment and apply DDL to Aurora manually first
// Then deploy this CDK stack to start the DMS data migration
export class MarketplaceSchemaConversionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Oracle 19c source (heterogeneous migration — requires SCT schema conversion first)
    const oracleSource = new dms.CfnEndpoint(this, 'OracleSource', {
      endpointIdentifier: 'finserv-oracle-source',
      endpointType: 'source',
      engineName: 'oracle',
      serverName: '192.168.1.100',
      port: 1521,
      databaseName: 'FINSERVDB',
      username: 'migration_user',
      password: cdk.SecretValue.secretsManager('finserv-oracle-password').unsafeUnwrap(),
      oracleSettings: { useLogminerReader: true, accessAlternateDirectly: false },
    });

    const auroraTarget = new dms.CfnEndpoint(this, 'AuroraTarget', {
      endpointIdentifier: 'finserv-aurora-target',
      endpointType: 'target',
      engineName: 'aurora-postgresql',
      serverName: 'finserv-aurora.cluster-xxx.ap-southeast-1.rds.amazonaws.com',
      port: 5432,
      databaseName: 'finservdb',
      username: 'dms_user',
      password: cdk.SecretValue.secretsManager('finserv-aurora-password').unsafeUnwrap(),
    });

    // TablePrep=do-nothing — schema already applied by SCT; DMS migrates data only
    new dms.CfnReplicationTask(this, 'FinservMigrationTask', {
      replicationTaskIdentifier: 'finserv-orders-migration',
      sourceEndpointArn: oracleSource.ref,
      targetEndpointArn: auroraTarget.ref,
      replicationInstanceArn: 'arn:aws:dms:ap-southeast-1:234567890123:rep:marketplace-dms-instance',
      migrationType: 'full-load-and-cdc',
      replicationTaskSettings: JSON.stringify({
        TargetMetadata: { TargetSchema: 'public', TablePrep: 'do-nothing' },
      }),
      tableMappings: JSON.stringify({
        rules: [{
          'rule-type': 'selection', 'rule-id': '1', 'rule-name': 'finserv-tables',
          'object-locator': { 'schema-name': 'FINSERV', 'table-name': '%' },
          'rule-action': 'include',
        }],
      }),
    });
  }
}`,
            },
        ],
    },

    {
        id: 4,
        analogy: "Think of it like a logistics courier who specialises in moving archive boxes between two warehouses in different cities — instead of you driving a truck back and forth repeatedly, the courier maintains a dedicated truck lane (managed transfer network), verifies that every box arrives undamaged (data integrity checksums), and delivers them automatically on a schedule without you having to manually copy files one by one.",
        icon: "📦",
        color: ACCENT.orange,
        tag: "SCENARIO 4",
        title: "AWS DataSync",
        subtitle: "Online transfer of tool artifact files from on-premises NAS to S3",
        useCase: {
            title: "AMI PVT LTD Marketplace — DataSync migrating 50 TB of tool artifacts from on-prem NFS to S3 marketplace-tool-artifacts",
            story: "Before full cloud migration, AMI PVT LTD stores all tool deployment packages (Lambda ZIP files, CloudFormation templates, tool documentation PDFs) on an on-premises NFS server (50 TB total). Rather than manually copying files or using the AWS CLI sync command, the team deploys a DataSync Agent as a VMware virtual appliance on the NFS host network. DataSync Agent connects to the DataSync service over HTTPS and transfers files to S3 marketplace-tool-artifacts with bandwidth throttling (peak hours: 100 Mbps, off-peak: 1 Gbps). DataSync performs automatic checksum verification on every file transferred — any corrupt or incomplete file transfer is automatically retried. An hourly incremental sync continues until full migration cutover, keeping the S3 bucket current with any new files added on-premises.",
            diagram: [
                { actor: "On-prem NFS Server (50 TB tool artifacts)", icon: "🖥️" },
                { arrow: "DataSync Agent reads NFS share" },
                { actor: "DataSync Agent VM (deployed on-premises network)", icon: "📦" },
                { arrow: "HTTPS transfer to DataSync service (checksums verified)" },
                { actor: "AWS DataSync Service (ap-southeast-1)", icon: "☁️" },
                { arrow: "writes objects with SSE-KMS encryption" },
                { actor: "S3 marketplace-tool-artifacts (destination)", icon: "🪣" },
            ],
        },
        buildSystem: [
            "Deploy DataSync Agent as a VMware OVA or EC2 AMI on the on-premises network (must have direct access to the NFS server); register the agent in the DataSync console: aws datasync create-agent --agent-name marketplace-datasync-agent",
            "Create DataSync source location: NFS type, server hostname=<NFS-server-IP>, subdirectory=/tools, agent ARN=marketplace-datasync-agent ARN; DataSync uses the agent to mount the NFS share",
            "Create DataSync destination location: S3 type, bucketArn=arn:aws:s3:::marketplace-tool-artifacts, subdirectory=/migrated-tools/, IAM role with s3:PutObject and s3:GetBucketLocation permissions",
            "Configure data transfer task options: verifyMode=ONLY_FILES_TRANSFERRED (checksum verify all transferred files), overwriteMode=ALWAYS (overwrite existing S3 objects with newer on-prem versions), logLevel=TRANSFER (log every file transfer to CloudWatch Logs)",
            "Set bandwidth limit: aws datasync update-task --task-arn <ARN> --options BytesPerSecond=104857600 (100 Mbps during business hours); schedule off-peak task execution with no throttle at 23:00–06:00 SGT",
            "Create task schedule for incremental sync: aws datasync create-task --schedule ScheduleExpression='cron(0 * * * ? *)' (every hour) to keep S3 current with any new on-prem files during the migration transition period",
            "Monitor DataSync task execution: check CloudWatch Logs group /aws/datasync for file-level transfer results; verify BytesTransferred, FilesTransferred, and FilesVerified counters match expectations",
            "After migration cutover: disable the DataSync task schedule, verify S3 object count matches NFS file count, decommission the DataSync Agent VM, and update all marketplace deployments to reference S3 paths directly",
        ],
        flow: ["DataSync Agent mounts NFS", "Files read and checksummed", "HTTPS transfer to DataSync", "Objects written to S3 (SSE-KMS)", "Verification pass on all files"],
        examTips: [
            "DataSync is for online data transfer (NFS/SMB/HDFS/S3/EFS/FSx) — it is NOT for server migration (use MGN) or database migration (use DMS); it transfers files between storage systems",
            "DataSync performs automatic data integrity verification with checksums — it verifies data at the source, in transit, and at the destination; manual rsync/CLI sync does NOT automatically verify integrity",
            "DataSync Agent is required for on-premises sources (NFS/SMB) — it is deployed as a VM or EC2 instance on the local network; for AWS-to-AWS transfers (S3 to S3, EFS to EFS), no agent is needed",
            "DataSync can throttle bandwidth to avoid saturating the network connection — use the BytesPerSecond setting or the DataSync bandwidth throttle schedule for time-based limits",
            "DataSync transfers include built-in encryption in transit (TLS) and can configure SSE-KMS encryption at the destination — it is NOT just a file copy tool; it is a managed, verified data transfer service",
        ],
        roleJson: [
            {
                label: "AWS CLI — create DataSync NFS-to-S3 transfer task with verification",
                note: "💡 Set verifyMode=ONLY_FILES_TRANSFERRED (not POINT_IN_TIME_CONSISTENT) for large migrations — verifying only transferred files is much faster and sufficient for most migration use cases.",
                code: `# Create DataSync source location (NFS on-premises)
aws datasync create-location-nfs \\
  --server-hostname 192.168.1.50 \\
  --subdirectory /tools \\
  --on-prem-config AgentArns=arn:aws:datasync:ap-southeast-1:234567890123:agent/agent-xxx \\
  --mount-options Version=NFS4_1

# Create DataSync destination location (S3)
aws datasync create-location-s3 \\
  --s3-bucket-arn arn:aws:s3:::marketplace-tool-artifacts \\
  --subdirectory /migrated-tools/ \\
  --s3-config BucketAccessRoleArn=arn:aws:iam::234567890123:role/DataSyncS3Role

# Create transfer task with verification and bandwidth limit
aws datasync create-task \\
  --source-location-arn arn:aws:datasync:ap-southeast-1:234567890123:location/nfs-xxx \\
  --destination-location-arn arn:aws:datasync:ap-southeast-1:234567890123:location/s3-xxx \\
  --name marketplace-artifact-migration \\
  --options VerifyMode=ONLY_FILES_TRANSFERRED,OverwriteMode=ALWAYS,LogLevel=TRANSFER,BytesPerSecond=104857600 \\
  --schedule ScheduleExpression="cron(0 * * * ? *)"`,
            },
        ],
        cdkCode: [
            {
                label: "CDK (TypeScript) — DataSync NFS-to-S3 task with checksum verification and bandwidth throttle",
                note: "💡 The DataSync Agent VM must be deployed and registered in the console before this stack — the agentArn is obtained from the console after agent activation.",
                code: `import * as cdk from 'aws-cdk-lib';
import * as datasync from 'aws-cdk-lib/aws-datasync';
import { Construct } from 'constructs';

export class MarketplaceDataSyncStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Agent registered in console after VM deployment on-premises
    const agentArn = 'arn:aws:datasync:ap-southeast-1:234567890123:agent/agent-xxx';

    // Source: on-premises NFS /tools share (50 TB tool artifacts)
    const nfsSource = new datasync.CfnLocationNFS(this, 'NfsSource', {
      serverHostname: '192.168.1.50',
      subdirectory: '/tools',
      onPremConfig: { agentArns: [agentArn] },
      mountOptions: { version: 'NFS4_1' },
    });

    // Destination: S3 marketplace-tool-artifacts
    const s3Dest = new datasync.CfnLocationS3(this, 'S3Destination', {
      s3BucketArn: 'arn:aws:s3:::marketplace-tool-artifacts',
      subdirectory: '/migrated-tools/',
      s3Config: {
        bucketAccessRoleArn: 'arn:aws:iam::234567890123:role/DataSyncS3Role',
      },
    });

    // Transfer task — checksum verify all files, throttle at 100 Mbps
    new datasync.CfnTask(this, 'ArtifactMigrationTask', {
      name: 'marketplace-artifact-migration',
      sourceLocationArn: nfsSource.ref,
      destinationLocationArn: s3Dest.ref,
      options: {
        verifyMode: 'ONLY_FILES_TRANSFERRED',
        overwriteMode: 'ALWAYS',
        logLevel: 'TRANSFER',
        bytesPerSecond: 104857600,  // 100 Mbps — prevents saturating the WAN link
      },
      schedule: {
        scheduleExpression: 'cron(0 * * * ? *)',  // hourly incremental sync
      },
    });
  }
}`,
            },
        ],
    },

    {
        id: 5,
        analogy: "Think of it like moving a library overseas — if you have 500 books, you ship them by mail (internet upload); if you have 5 million books, posting them would take 3 years and cost a fortune. Instead, you hire a specialised moving truck (Snowball Edge) that loads all the books in a day, drives to the dock, sails to the destination, and hands them over at the other end — much faster and cheaper at scale.",
        icon: "❄️",
        color: ACCENT.purple,
        tag: "SCENARIO 5",
        title: "AWS Snow Family",
        subtitle: "Offline bulk data transfer of historical marketplace logs to S3",
        useCase: {
            title: "AMI PVT LTD Marketplace — Snowball Edge transferring 400 TB of historical transaction logs from on-premises to S3",
            story: "AMI PVT LTD has 400 TB of historical transaction logs, old product images, and audit trail archives on on-premises storage that needs to be moved to S3 marketplace-analytics-raw for Athena analysis. Uploading over the internet (1 Gbps uplink) would take over 40 days. Instead, the team orders 5 Snowball Edge Storage Optimized devices (80 TB usable each = 400 TB total). Each device is pre-configured in the AWS Snow Family console, shipped to the Singapore co-location, loaded via the DataSync-compatible local interface, sealed, and shipped back to AWS. AWS physically loads the data into S3 marketplace-analytics-raw within 1 week of receiving each device. The entire 400 TB transfer completes in under 3 weeks including shipping, vs 40+ days of internet upload.",
            diagram: [
                { actor: "On-premises storage — 400 TB historical logs + archives", icon: "🖥️" },
                { arrow: "DataSync Local Agent loads Snowball Edge (local 10 GbE connection)" },
                { actor: "5× Snowball Edge Storage Optimized devices (80 TB each)", icon: "❄️" },
                { arrow: "devices shipped back to AWS (encrypted, tamper-evident)" },
                { actor: "AWS data centre — physical ingest", icon: "🏭" },
                { arrow: "data loaded into S3" },
                { actor: "S3 marketplace-analytics-raw/historical/ (400 TB available for Athena)", icon: "🪣" },
            ],
        },
        buildSystem: [
            "Create Snow Family job in the AWS console: job type=Import, device=Snowball Edge Storage Optimized (80 TB), quantity=5, S3 destination bucket=marketplace-analytics-raw, prefix=/historical/",
            "Specify S3 encryption: KMS key=marketplace-s3-key for all objects loaded from the Snowball devices — data is encrypted on the device (256-bit AES) and KMS-encrypted when imported to S3",
            "Receive devices at the co-location facility: power on each Snowball Edge, unlock using the unlock code from the Snow console; connect via 10 GbE to the local switch",
            "Use the Snowball Edge client or S3 adapter to transfer data: snowballEdge cp -r /nas/historical-logs/ s3://local-snowball-alias/historical/ OR use the DataSync local agent with the Snowball Edge as the NFS/S3 destination",
            "Monitor transfer progress on each device using the Snowball Edge LCD panel or snowballEdge list-jobs; transfer 80 TB per device takes approximately 22 hours at 10 GbE speeds",
            "After loading completes on each device: return the device to AWS shipping — seal it, attach the pre-paid return label, and notify the shipping carrier; AWS tracks the return and sends a notification when data is loaded into S3",
            "Verify S3 data after import: compare the object count and total byte count in S3 marketplace-analytics-raw/historical/ against the source; AWS provides a job completion report with a manifest of imported files",
            "After all devices are imported: run the Glue Crawler marketplace-analytics-crawler to discover the new /historical/ partition and add it to the Glue Data Catalog so Athena can query the historical data",
        ],
        flow: ["Order Snowball Edge devices", "Load data on-premises (22h/device)", "Ship sealed devices to AWS", "AWS ingests to S3 (<1 week/device)", "Athena queries historical data"],
        examTips: [
            "Use Snow Family when internet upload would take more than 1 week — the rule of thumb: if your data size (GB) / your bandwidth (Gbps) / 86,400 > 7 days, use Snowball; for 400 TB at 1 Gbps: 400,000/1/86,400 = 4.6 days (borderline); factor in latency and retries",
            "Snowball Edge Storage Optimized: 80 TB usable storage, no compute EC2 instances — for pure data transfer; Snowball Edge Compute Optimized: 28 TB storage + EC2 + GPU — for edge computing at disconnected sites",
            "Snowmobile is an 18-wheeler truck with a 100 PB container — use it only for exabyte-scale migrations; for anything under 10 PB, multiple Snowball Edge devices are faster and easier to manage",
            "All data on Snowball devices is encrypted with 256-bit AES using keys managed by AWS KMS — the key is never stored on the device; the device automatically encrypts all data written to it",
            "Snowball data is imported to S3 only (not EFS or EBS directly) — if your destination is EFS or EBS, you must import to S3 first and then transfer from S3 to EFS/EBS using DataSync or rsync",
        ],
        roleJson: [
            {
                label: "AWS CLI — create Snowball Edge import job and verify S3 completion",
                note: "💡 Order multiple smaller devices (e.g. 5 × 80 TB) in parallel rather than one large device — you can load and ship them in parallel, cutting the total transfer time to the duration of one device rather than five.",
                code: `# Create Snow Family import job (5 devices)
aws snowball create-job \\
  --job-type IMPORT \\
  --resources '{
    "S3Resources": [{
      "BucketArn": "arn:aws:s3:::marketplace-analytics-raw",
      "KeyRange": {"BeginMarker": "historical/", "EndMarker": "historical/z"}
    }]
  }' \\
  --description "400TB historical log migration to marketplace-analytics-raw" \\
  --address-id <shipping-address-id> \\
  --kms-key-arn arn:aws:kms:ap-southeast-1:234567890123:key/marketplace-s3-key \\
  --snowball-type EDGE_STORAGE_OPTIMIZED \\
  --shipping-option FASTEST \\
  --region ap-southeast-1

# Check job status
aws snowball describe-job --job-id JID-xxxxxxxxx

# After devices returned: verify S3 object count
aws s3 ls s3://marketplace-analytics-raw/historical/ --recursive --summarize \\
  | tail -3`,
            },
        ],
        cdkCode: [
            {
                label: "CDK (TypeScript) — Snow Family import jobs via AwsCustomResource (no CloudFormation support)",
                note: "💡 Order multiple devices in parallel rather than one at a time — 5 × 80 TB devices loaded simultaneously reduces total transfer time to the duration of a single device (~22 hours) instead of 5 × 22 hours.",
                code: `import * as cdk from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

// Snow Family has no CloudFormation/CDK support — use AwsCustomResource (SDK calls)
export class MarketplaceSnowballStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create 5 Snowball Edge import jobs (one per 80 TB device — load in parallel)
    for (let i = 1; i <= 5; i++) {
      new cr.AwsCustomResource(this, 'SnowballJob' + i, {
        onCreate: {
          service: 'Snowball',
          action: 'createJob',
          parameters: {
            JobType: 'IMPORT',
            Resources: {
              S3Resources: [{
                BucketArn: 'arn:aws:s3:::marketplace-analytics-raw',
                KeyRange: {
                  BeginMarker: 'historical/batch-' + i + '/',
                  EndMarker: 'historical/batch-' + i + '/z',
                },
              }],
            },
            Description: '400TB historical migration — batch ' + i + ' of 5',
            AddressId: 'ADID-SINGAPORE-COLOCATION',
            KmsKeyARN: 'arn:aws:kms:ap-southeast-1:234567890123:alias/marketplace-s3-key',
            SnowballType: 'EDGE_STORAGE_OPTIMIZED',
            ShippingOption: 'FASTEST',
          },
          physicalResourceId: cr.PhysicalResourceId.of('snowball-job-' + i),
        },
        policy: cr.AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            actions: ['snowball:CreateJob'],
            resources: ['*'],
          }),
        ]),
      });
    }
  }
}`,
            },
        ],
    },

    {
        id: 6,
        analogy: "Think of it like a post office that speaks every language — some sellers speak only old postal protocols (SFTP, FTP, FTPS) while the AWS world speaks only HTTP/S3. The Transfer Family is a polyglot post office that accepts parcels in any legacy protocol, translates the delivery instructions, and drops the parcel in the correct S3 mailbox — without the seller needing to learn a new delivery method.",
        icon: "📤",
        color: ACCENT.green,
        tag: "SCENARIO 6",
        title: "AWS Transfer Family",
        subtitle: "SFTP server for sellers to upload product files directly to S3",
        useCase: {
            title: "AMI PVT LTD Marketplace — Transfer Family SFTP endpoint allowing legacy seller tools to upload product assets to marketplace-products-bucket",
            story: "Several enterprise sellers on the AMI PVT LTD Marketplace use legacy ERP systems that can only upload files via SFTP — they cannot use the marketplace web app or S3 pre-signed URLs. AMI PVT LTD deploys an AWS Transfer Family server marketplace-sftp-server (SFTP protocol, VPC endpoint in marketplace-vpc, endpoint type=VPC with Elastic IP). Each seller is provisioned an SFTP user with their SSH public key stored in Transfer Family; their home directory is mapped to s3://marketplace-products-bucket/sellers/{username}/ via a scoped-down IAM role that restricts access to their own prefix. Files uploaded via SFTP land directly in S3 — no EC2 file server needed. An S3 event notification on marketplace-products-bucket triggers marketplace-product-processor Lambda to validate and index new uploads.",
            diagram: [
                { actor: "Enterprise Seller ERP system (legacy SFTP client)", icon: "🏢" },
                { arrow: "SFTP upload (port 22, SSH key authentication)" },
                { actor: "Transfer Family SFTP Server — marketplace-sftp-server (Elastic IP)", icon: "📤" },
                { arrow: "user authenticated, home directory resolved to S3 prefix" },
                { actor: "S3 marketplace-products-bucket/sellers/{username}/product-image.jpg", icon: "🪣" },
                { arrow: "S3 event notification" },
                { actor: "marketplace-product-processor Lambda (validate + index upload)", icon: "⚡" },
            ],
        },
        buildSystem: [
            "Create Transfer Family server marketplace-sftp-server: protocols=SFTP, endpointType=VPC, vpcId=marketplace-vpc, subnetIds=[public subnet 1a, 1b], securityGroupIds=[marketplace-sftp-sg], allocate Elastic IPs for static IP addresses",
            "Create Security Group marketplace-sftp-sg: allow port 22 inbound from seller IP ranges (restrict to known seller IP CIDRs); deny all other inbound; allow all outbound (Transfer Family needs to reach S3)",
            "Create IAM role marketplace-transfer-user-role with policy scoped to the user's S3 prefix: s3:PutObject, s3:GetObject, s3:ListBucket on marketplace-products-bucket with condition StringLike s3:prefix=[*/{username}/*]",
            "Create Transfer Family user for each seller: aws transfer create-user --server-id s-xxx --user-name seller-finserv-corp --home-directory /marketplace-products-bucket/sellers/seller-finserv-corp --role marketplace-transfer-user-role-arn --ssh-public-key-body 'ssh-rsa AAAA...'",
            "Configure home directory logical mappings for better isolation: set homeDirectoryType=LOGICAL and map / to s3://marketplace-products-bucket/sellers/{username}/ — the seller sees / as their root and cannot navigate to /sellers/ parent",
            "Enable Transfer Family server-side logging to CloudWatch Logs: every SFTP session (login, upload, download, logout) is logged with username, file path, and bytes transferred",
            "Configure S3 event notification on marketplace-products-bucket prefix sellers/: trigger marketplace-product-processor Lambda on s3:ObjectCreated events for any file uploaded via SFTP",
            "Test with an SFTP client: sftp -i seller-key.pem seller-finserv-corp@<Elastic-IP>; verify can PUT files to home directory; verify CANNOT access other sellers' directories",
        ],
        flow: ["Seller connects via SFTP (port 22)", "SSH key authenticated by Transfer Family", "Home directory mapped to S3 prefix", "File upload lands directly in S3", "Lambda triggered to process upload"],
        examTips: [
            "Transfer Family supports SFTP, FTPS, and FTP protocols — all deliver files directly to S3 or EFS (no EC2 file server); it is the AWS-managed file transfer service for legacy protocol interoperability",
            "Transfer Family with VPC endpoint gives you a static Elastic IP — enterprise customers and firewall rules can allowlist specific IPs; internet-facing endpoint uses dynamic IPs which change when the server restarts",
            "Home directory logical mappings restrict each user to their own S3 prefix — without logical mappings, users can navigate the entire bucket; always use logical mappings (homeDirectoryType=LOGICAL) for multi-tenant scenarios",
            "Transfer Family charges per protocol hour (server running time) + per GB uploaded — for infrequent uploads, it can be cost-efficient; for very high throughput (TB/day), consider DataSync or S3 pre-signed URLs instead",
            "Transfer Family CANNOT be used for real-time streaming or database transfers — it is file-based; for database migrations use DMS; for real-time data streams use Kinesis",
        ],
        roleJson: [
            {
                label: "AWS CLI — create Transfer Family SFTP server and seller user",
                note: "💡 Always use homeDirectoryType=LOGICAL with explicit path mappings — this gives each seller a clean view of only their own prefix, preventing accidental access to other sellers' S3 objects.",
                code: `# Create Transfer Family SFTP server (VPC endpoint with Elastic IPs)
aws transfer create-server \\
  --protocols SFTP \\
  --endpoint-type VPC \\
  --endpoint-details '{
    "VpcId": "vpc-marketplace123",
    "SubnetIds": ["subnet-public-1a", "subnet-public-1b"],
    "SecurityGroupIds": ["sg-sftp123"]
  }' \\
  --identity-provider-type SERVICE_MANAGED \\
  --logging-role arn:aws:iam::234567890123:role/TransferLoggingRole \\
  --region ap-southeast-1

# Create seller user with SSH key and logical home directory
aws transfer create-user \\
  --server-id s-xxxxxxxxxxxx \\
  --user-name seller-finserv-corp \\
  --home-directory-type LOGICAL \\
  --home-directory-mappings '[{"Entry":"/","Target":"/marketplace-products-bucket/sellers/seller-finserv-corp"}]' \\
  --role arn:aws:iam::234567890123:role/marketplace-transfer-user-role \\
  --ssh-public-key-body "ssh-rsa AAAAB3NzaC1yc2EAAA... seller@finserv-corp"`,
            },
        ],
        cdkCode: [
            {
                label: "CDK (TypeScript) — Transfer Family SFTP server with VPC endpoint and logical home directory mapping",
                note: "💡 Always use homeDirectoryType: LOGICAL with explicit path mappings — without it, each seller sees the bucket root and can navigate to other sellers' prefixes.",
                code: `import * as cdk from 'aws-cdk-lib';
import * as transfer from 'aws-cdk-lib/aws-transfer';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class MarketplaceSftpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'MarketplaceVpc', { vpcName: 'marketplace-vpc' });

    const sftpSg = new ec2.SecurityGroup(this, 'SftpSg', {
      vpc,
      securityGroupName: 'marketplace-sftp-sg',
    });
    sftpSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SFTP from seller networks');

    // SFTP server with VPC endpoint — Elastic IPs give static IPs for seller firewall rules
    const sftpServer = new transfer.CfnServer(this, 'SftpServer', {
      protocols: ['SFTP'],
      endpointType: 'VPC',
      endpointDetails: {
        vpcId: vpc.vpcId,
        subnetIds: vpc.publicSubnets.map(s => s.subnetId),
        securityGroupIds: [sftpSg.securityGroupId],
      },
      identityProviderType: 'SERVICE_MANAGED',
      loggingRole: 'arn:aws:iam::234567890123:role/TransferLoggingRole',
    });

    // IAM role — Transfer Family assumes it to write to S3 on behalf of the user
    const transferRole = new iam.Role(this, 'TransferUserRole', {
      roleName: 'marketplace-transfer-user-role',
      assumedBy: new iam.ServicePrincipal('transfer.amazonaws.com'),
    });
    transferRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject', 's3:GetObject', 's3:ListBucket'],
      resources: [
        'arn:aws:s3:::marketplace-products-bucket',
        'arn:aws:s3:::marketplace-products-bucket/*',
      ],
    }));

    // Seller user — LOGICAL home directory scopes them to their own S3 prefix
    new transfer.CfnUser(this, 'SellerFinservCorp', {
      serverId: sftpServer.attrServerId,
      userName: 'seller-finserv-corp',
      homeDirectoryType: 'LOGICAL',
      homeDirectoryMappings: [{
        entry: '/',
        target: '/marketplace-products-bucket/sellers/seller-finserv-corp',
      }],
      role: transferRole.roleArn,
      sshPublicKeys: ['ssh-rsa AAAAB3NzaC1yc2EAAA... seller@finserv-corp'],
    });
  }
}`,
            },
        ],
    },

    {
        id: 7,
        analogy: "Think of it like a dedicated private highway between two warehouses — instead of shipping boxes over a congested public road (internet), a company builds a reserved lane (Direct Connect) that goes directly to the destination warehouse's private loading dock (PrivateLink VPC endpoint). A courier service (DataSync agent) picks up new parcels on a schedule and drives them down the private highway, verifying every parcel on arrival.",
        icon: "🔄",
        color: ACCENT.pink,
        tag: "SCENARIO 7",
        title: "DataSync — NFS to EFS over Direct Connect",
        subtitle: "Replicating on-premises video files to Amazon EFS via private VIF and PrivateLink",
        useCase: {
            title: "AMI PVT LTD Marketplace — DataSync agent replicating newly created on-prem video content files to Amazon EFS over Direct Connect private VIF using a PrivateLink VPC endpoint",
            story: "AMI PVT LTD's media division writes hundreds of video files daily into an on-premises NFS file system at the Singapore co-location facility. Post-migration, the video processing application will run on EC2 with a mounted Amazon EFS file system (marketplace-media-efs). Before cutover, the team must continuously replicate newly created on-premises video files to EFS so the cloud application always has current content. The AWS Direct Connect connection (marketplace-dx-connection) is already in place. Instead of routing DataSync traffic over the public internet, the team creates a private Virtual Interface (private VIF) on the Direct Connect connection and provisions an AWS PrivateLink interface VPC endpoint for Amazon EFS inside marketplace-vpc. The DataSync agent (deployed as a VM on the on-premises network) sends all transfer traffic through the private VIF to the EFS PrivateLink endpoint — traffic never leaves the AWS private network. A DataSync task scheduled to run every 24 hours transfers only new and changed files (incremental sync), with checksum verification on every file.",
            diagram: [
                { actor: "On-premises NFS file system (video files written daily)", icon: "🖥️" },
                { arrow: "DataSync Agent reads NFS share" },
                { actor: "DataSync Agent VM (on-premises network)", icon: "🔄" },
                { arrow: "transfer over AWS Direct Connect — private VIF (no public internet)" },
                { actor: "PrivateLink Interface VPC Endpoint for Amazon EFS (marketplace-vpc)", icon: "🔒" },
                { arrow: "files written with checksum verification" },
                { actor: "Amazon EFS — marketplace-media-efs (mounted by EC2 post-migration)", icon: "🗄️" },
            ],
        },
        buildSystem: [
            "Verify the existing AWS Direct Connect connection marketplace-dx-connection is active; create a Private Virtual Interface (private VIF) on the connection pointing to a Direct Connect Gateway associated with marketplace-vpc",
            "Create a PrivateLink interface VPC endpoint for Amazon EFS in marketplace-vpc: aws ec2 create-vpc-endpoint --vpc-endpoint-type Interface --service-name com.amazonaws.ap-southeast-1.elasticfilesystem --vpc-id vpc-marketplace123 --subnet-ids <private-subnet-ids>",
            "Create the Amazon EFS file system marketplace-media-efs: encrypted at rest with KMS, throughput mode=Bursting, create mount targets in each private subnet so EC2 can mount it post-migration",
            "Deploy DataSync Agent as a VMware OVA or hypervisor VM on the on-premises network — the agent must have NFS access to the source file system and TCP outbound access to the Direct Connect private VIF",
            "Register the DataSync Agent in the AWS console using the agent's activation key: aws datasync create-agent --activation-key <key> --agent-name marketplace-media-datasync-agent",
            "Create DataSync source location: NFS type, server=<NFS-server-IP>, subdirectory=/video-content, agentArn=marketplace-media-datasync-agent",
            "Create DataSync destination location: EFS type, efsFilesystemArn=marketplace-media-efs ARN, subdirectory=/video-content, use the PrivateLink VPC endpoint DNS name to ensure traffic routes via Direct Connect",
            "Create DataSync task marketplace-video-sync: verifyMode=ONLY_FILES_TRANSFERRED, overwriteMode=ALWAYS, transferMode=CHANGED (only new/modified files), schedule=cron(0 2 * * ? *) for nightly 24-hour sync; monitor via CloudWatch Logs",
        ],
        flow: ["NFS files written on-premises", "DataSync Agent detects changes", "Transfer via Direct Connect private VIF", "PrivateLink EFS endpoint receives files", "EFS available for EC2 post-migration"],
        examTips: [
            "DataSync over Direct Connect requires a Private VIF (not Public VIF) — Private VIF routes traffic to VPC private IPs including the PrivateLink interface endpoint for EFS; Public VIF routes to AWS public service endpoints and bypasses the VPC",
            "PrivateLink interface VPC endpoint for EFS ensures DataSync traffic reaches EFS without traversing the public internet — the endpoint is an ENI in your subnet with a private IP resolved by the EFS service DNS name",
            "DataSync transferMode=CHANGED is the key setting for incremental sync — it only transfers new or modified files since the last task execution, making 24-hour scheduled runs efficient even for large NFS shares",
            "DataSync destination targets for on-premises-to-AWS migrations: S3, EFS, FSx for Windows, FSx for Lustre, FSx for OpenZFS, FSx for NetApp ONTAP — NOT EBS volumes (DataSync is file/object level, not block level)",
            "The exam pattern for this question type: on-prem NFS + Direct Connect + EFS = DataSync agent on-prem + private VIF + PrivateLink EFS endpoint + DataSync scheduled task; choosing S3 as destination is wrong when the target application uses EFS",
        ],
        roleJson: [
            {
                label: "AWS CLI — create EFS PrivateLink endpoint, register DataSync agent, and configure NFS-to-EFS task",
                note: "💡 Specify the PrivateLink VPC endpoint DNS name as the subdomain override when creating the EFS DataSync location — this forces DataSync traffic through the private endpoint and over Direct Connect instead of the internet.",
                code: `# Step 1 — Create PrivateLink interface endpoint for EFS in marketplace-vpc
aws ec2 create-vpc-endpoint \\
  --vpc-endpoint-type Interface \\
  --service-name com.amazonaws.ap-southeast-1.elasticfilesystem \\
  --vpc-id vpc-marketplace123 \\
  --subnet-ids subnet-private-1a subnet-private-1b \\
  --security-group-ids sg-datasync123 \\
  --private-dns-enabled \\
  --region ap-southeast-1

# Step 2 — Create Amazon EFS file system (destination)
aws efs create-file-system \\
  --performance-mode generalPurpose \\
  --throughput-mode bursting \\
  --encrypted \\
  --kms-key-id alias/marketplace-s3-key \\
  --tags Key=Name,Value=marketplace-media-efs \\
  --region ap-southeast-1
# Returns: FileSystemId = fs-XXXXXXXX

# Step 3 — Create EFS mount target in each private subnet
aws efs create-mount-target \\
  --file-system-id fs-XXXXXXXX \\
  --subnet-id subnet-private-1a \\
  --security-groups sg-efs123 \\
  --region ap-southeast-1

# Step 4 — Register DataSync agent (run after deploying agent VM on-premises)
aws datasync create-agent \\
  --activation-key <activation-key-from-agent-console> \\
  --agent-name marketplace-media-datasync-agent \\
  --region ap-southeast-1

# Step 5 — Create DataSync source location (on-premises NFS)
aws datasync create-location-nfs \\
  --server-hostname 192.168.1.60 \\
  --subdirectory /video-content \\
  --on-prem-config AgentArns=arn:aws:datasync:ap-southeast-1:234567890123:agent/agent-xxx \\
  --mount-options Version=NFS4_1

# Step 6 — Create DataSync destination location (EFS via PrivateLink)
aws datasync create-location-efs \\
  --efs-filesystem-arn arn:aws:elasticfilesystem:ap-southeast-1:234567890123:file-system/fs-XXXXXXXX \\
  --ec2-config SecurityGroupArns=arn:aws:ec2:ap-southeast-1:234567890123:security-group/sg-efs123,SubnetArn=arn:aws:ec2:ap-southeast-1:234567890123:subnet/subnet-private-1a \\
  --subdirectory /video-content

# Step 7 — Create scheduled DataSync task (nightly incremental sync)
aws datasync create-task \\
  --name marketplace-video-nfs-to-efs \\
  --source-location-arn arn:aws:datasync:ap-southeast-1:234567890123:location/nfs-xxx \\
  --destination-location-arn arn:aws:datasync:ap-southeast-1:234567890123:location/efs-xxx \\
  --options VerifyMode=ONLY_FILES_TRANSFERRED,OverwriteMode=ALWAYS,TransferMode=CHANGED,LogLevel=TRANSFER \\
  --schedule ScheduleExpression="cron(0 2 * * ? *)"`,
            },
        ],
        cdkCode: [
            {
                label: "CDK (TypeScript) — EFS file system, PrivateLink endpoint, DataSync NFS-to-EFS task via Direct Connect",
                note: "💡 DataSync CfnLocationEFS requires an EC2 config (subnet + security group) for the mount target — CDK uses L1 CfnLocationEFS and CfnTask since DataSync has no L2 constructs.",
                code: `import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as datasync from 'aws-cdk-lib/aws-datasync';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export class MarketplaceNfsToEfsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcName: 'marketplace-vpc' });
    const privateSubnets = vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS });

    // Security group for EFS mount targets
    const efsSg = new ec2.SecurityGroup(this, 'EfsSg', {
      vpc,
      securityGroupName: 'marketplace-efs-sg',
      description: 'EFS mount target — allow NFS from EC2 and DataSync',
    });
    efsSg.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(2049), 'NFS from VPC');

    // Amazon EFS file system — destination for migrated video files
    const mediaEfs = new efs.FileSystem(this, 'MediaEfs', {
      fileSystemName: 'marketplace-media-efs',
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup: efsSg,
      encrypted: true,
      kmsKey: kms.Key.fromLookup(this, 'S3Key', { aliasName: 'alias/marketplace-s3-key' }),
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // PrivateLink interface endpoint for EFS — routes DataSync traffic via Direct Connect
    new ec2.InterfaceVpcEndpoint(this, 'EfsEndpoint', {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.ELASTIC_FILESYSTEM,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      privateDnsEnabled: true,
    });

    // DataSync agent registered on-premises (ARN obtained after agent VM activation)
    const agentArn = 'arn:aws:datasync:ap-southeast-1:234567890123:agent/agent-xxx';

    // Source: on-premises NFS /video-content
    const nfsSource = new datasync.CfnLocationNFS(this, 'NfsSource', {
      serverHostname: '192.168.1.60',
      subdirectory: '/video-content',
      onPremConfig: { agentArns: [agentArn] },
      mountOptions: { version: 'NFS4_1' },
    });

    // Destination: EFS via PrivateLink endpoint (traffic routes over Direct Connect)
    const efsDest = new datasync.CfnLocationEFS(this, 'EfsDest', {
      efsFilesystemArn: mediaEfs.fileSystemArn,
      ec2Config: {
        securityGroupArns: [
          cdk.Stack.of(this).formatArn({ service: 'ec2', resource: 'security-group', resourceName: efsSg.securityGroupId }),
        ],
        subnetArn: cdk.Stack.of(this).formatArn({
          service: 'ec2', resource: 'subnet', resourceName: privateSubnets.subnetIds[0],
        }),
      },
      subdirectory: '/video-content',
    });

    // Scheduled DataSync task — nightly incremental sync (changed files only)
    new datasync.CfnTask(this, 'VideoSyncTask', {
      name: 'marketplace-video-nfs-to-efs',
      sourceLocationArn: nfsSource.ref,
      destinationLocationArn: efsDest.ref,
      options: {
        verifyMode: 'ONLY_FILES_TRANSFERRED',
        overwriteMode: 'ALWAYS',
        transferMode: 'CHANGED',
        logLevel: 'TRANSFER',
      },
      schedule: {
        scheduleExpression: 'cron(0 2 * * ? *)',
      },
    });
  }
}`,
            },
        ],
    },
];

export default scenarios;
