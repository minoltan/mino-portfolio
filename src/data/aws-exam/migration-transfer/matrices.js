import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Migration & Transfer matrices
 * MGN, DMS, SCT, DataSync, Snow Family, Transfer Family
 * Reference: https://digitalcloud.training/aws-migration-services/
 */

const matrices = [
    {
        id: "migration-services-comparison",
        title: "AWS Migration Services — Which Tool for Which Job",
        subtitle: "Match each migration scenario to the correct AWS service",
        color: ACCENT.primary,
        columns: ["Scenario", "Correct service", "Why NOT the alternatives", "Marketplace example"],
        rows: [
            ["Migrate an entire server (OS + apps + data) from on-premises to EC2", "AWS MGN (Application Migration Service)", "DMS = databases only; DataSync = files only; Snowball = offline bulk data; SCT = schema conversion only", "Lift-and-shift 4 Spring Boot API servers from Singapore co-location to marketplace-api-asg"],
            ["Migrate a PostgreSQL database to Aurora PostgreSQL (same engine family)", "AWS DMS (homogeneous, no SCT needed)", "SCT = schema conversion for different engines only; MGN = whole server, not just DB; DataSync = files not DB", "marketplace-orders-db (PostgreSQL 14) → marketplace-aurora-cluster (Aurora PostgreSQL 15)"],
            ["Migrate an Oracle database to Aurora PostgreSQL (different engines)", "AWS SCT (schema conversion) + AWS DMS (data migration)", "DMS alone cannot convert Oracle DDL, stored procedures, and functions to PostgreSQL syntax", "finserv-corp Oracle 19c billing DB → Aurora PostgreSQL (SCT converts schema, DMS migrates data)"],
            ["Transfer 400 TB of files from on-premises NAS to S3 (offline, fastest)", "AWS Snowball Edge Storage Optimized × 5", "DataSync over internet would take 40+ days; S3 CLI sync is unverified and slow; Snowball is faster at this scale", "Historical transaction logs and product archives from co-location NFS → S3 marketplace-analytics-raw"],
            ["Transfer 50 TB of files from on-premises NFS to S3 (online, continuous sync)", "AWS DataSync with on-premises Agent", "Snowball is offline one-time transfer; DataSync supports scheduled incremental sync; S3 CLI lacks automatic integrity verification", "Tool artifact migration from on-prem NFS to marketplace-tool-artifacts (hourly incremental sync)"],
            ["Allow legacy SFTP/FTP clients to upload files directly to S3", "AWS Transfer Family", "S3 pre-signed URLs require HTTP client; EC2 SFTP server has no HA/managed patching; DataSync is not a file server", "Enterprise seller ERP systems upload product assets via SFTP to marketplace-products-bucket"],
            ["Migrate 5 PB+ exabyte-scale data centre with no internet connectivity", "AWS Snowmobile (100 PB container truck)", "Snowball Edge max is 80 TB per device — you'd need 62+ devices; Snowmobile is a single truck with 100 PB capacity", "Hypothetical: full co-location decommission to AWS when data exceeds Snowball Edge practical limits"],
            ["Migrate files from S3 in one region to EFS in another region", "AWS DataSync (no agent needed for AWS-to-AWS)", "S3 replication is S3-to-S3 only; DataSync supports S3→EFS, EFS→EFS, S3→FSx cross-service and cross-region transfers", "Migrating marketplace-tool-artifacts (S3) to EFS share for ECS container access"],
        ],
    },
    {
        id: "migration-7rs-strategy",
        title: "The 7 R Migration Strategies",
        subtitle: "Application migration strategies from simplest to most complex — know when AMI PVT LTD would use each",
        color: ACCENT.teal,
        columns: ["Strategy", "Description", "Effort", "Cost saving", "Marketplace example"],
        rows: [
            ["Retire", "Decommission — the application is no longer needed", "None", "Maximum (eliminate cost)", "Decommission on-prem monitoring tools replaced by CloudWatch"],
            ["Retain (Revisit)", "Keep on-premises for now — too complex, compliance, or not worth migrating yet", "None", "None", "Keep legacy Oracle reporting system on-prem until compliance review completes"],
            ["Rehost (Lift & Shift)", "Move as-is to AWS without code changes — use MGN for servers", "Low", "Low initially; save on hardware OpEx", "Lift-and-shift Spring Boot API from bare-metal to EC2 using MGN (first phase)"],
            ["Relocate", "Move to cloud using container or VM image compatible services — e.g. VMware Cloud on AWS", "Low-Medium", "Low-Medium", "Move VMware-based marketplace dev servers to VMware Cloud on AWS without OS changes"],
            ["Replatform (Lift, Tinker & Shift)", "Move to AWS with minor optimisations — no code changes but use managed services", "Medium", "Medium", "Move marketplace-orders-db from EC2-hosted PostgreSQL to RDS Multi-AZ without application code changes"],
            ["Repurchase (Drop & Shop)", "Replace with a SaaS product — e.g. move CRM to Salesforce", "Medium", "Medium (eliminate EC2 for SaaS)", "Replace on-prem ticketing system with Jira Cloud or ServiceNow SaaS"],
            ["Refactor / Re-architect", "Redesign application using cloud-native services — highest business value, highest effort", "High", "Highest long-term", "Refactor marketplace API from EC2 to ECS Fargate, Spring Boot to Lambda functions (post-migration modernisation)"],
        ],
    },
    {
        id: "snow-family-comparison",
        title: "AWS Snow Family Device Comparison",
        subtitle: "Snowball Edge Storage vs Compute vs Snowmobile — when to use each",
        color: ACCENT.amber,
        columns: ["Device", "Usable storage", "Compute capability", "Best for", "Transfer time estimate", "Marketplace use case"],
        rows: [
            ["Snowball Edge Storage Optimized (80 TB)", "80 TB (HDD) + 1 TB SSD", "Limited EC2 instances (basic Lambda + S3)", "Pure bulk data transfer; no edge compute needed", "~22 hours to load 80 TB at 10 GbE", "Historical log migration: 5 devices × 80 TB = 400 TB (marketplace-analytics-raw)"],
            ["Snowball Edge Compute Optimized (28 TB)", "28 TB usable HDD + 7.68 TB NVMe SSD", "52 vCPUs, 208 GB RAM, optional NVIDIA GPU, EC2 instances", "Edge computing + data transfer; ML inference at remote sites", "~8 hours to load 28 TB at 10 GbE", "Not used at AMI PVT LTD currently — useful for ML inference at remote marketplace data collection sites"],
            ["Snowball Edge Compute Optimized with GPU", "28 TB usable HDD + 7.68 TB NVMe SSD", "Same as Compute + NVIDIA V100 GPU", "GPU workloads at disconnected sites (video analytics, ML)", "~8 hours to load 28 TB", "Future use: edge ML for product image quality scoring before upload"],
            ["AWS Snowmobile", "Up to 100 PB (10 Snowmobiles = 1 EB)", "None — storage only", "Exabyte-scale data centre decommission", "Weeks for PB-scale; limited to select AWS regions", "Hypothetical: full 5 PB data centre decommission to AWS"],
            ["AWS Snowcone (HDD)", "8 TB usable HDD", "2 vCPUs, 4 GB RAM (AWS IoT Greengrass)", "Rugged, portable edge — ships to remote/harsh environments", "~1 hour to load 8 TB", "Edge data collection for marketplace partner offices in remote locations"],
            ["AWS Snowcone SSD", "14 TB usable SSD", "2 vCPUs, 4 GB RAM", "Rugged edge with higher performance SSD storage", "~30 min to load 8 TB at SSD speeds", "Same as Snowcone HDD but for higher-speed edge write workloads"],
            ["Key exam rule: when to use Snowball", "Threshold: > 1 week upload time at current bandwidth", "N/A", "400 TB at 1 Gbps = 40 days; 80 TB at 100 Mbps = 80 days — always use Snowball in these cases", "Shipping takes 2–7 days; loading takes 1–3 days per device; total faster than internet at TB+ scale", "400 TB migration: 5 × Snowball Edge (parallel load + ship) completes in ~3 weeks vs 40 days via internet"],
        ],
    },
];

export default matrices;
