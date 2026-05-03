import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Block & File Storage comparison matrices
 *
 * Source study topic: Amazon EBS and Amazon EFS (SAA-C03),
 * grounded in the AMI PVT LTD multi-tenant SaaS marketplace running in ap-southeast-1.
 */

const matrices = [
    {
        id: "ebs-volume-types",
        title: "EBS Volume Types",
        subtitle: "gp2, gp3, io1, io2, io2 Block Express, st1, sc1 — for the AMI PVT LTD marketplace",
        color: ACCENT.primary,
        columns: ["Type", "Max IOPS", "Max Throughput", "Use Case"],
        rows: [
            [
                "gp2 (General Purpose SSD)",
                "16,000 (at 5,334+ GiB; 3 IOPS/GiB below that)",
                "250 MB/s",
                "Legacy root volumes; replaced by gp3 for marketplace-api-asg because IOPS tied to size",
            ],
            [
                "gp3 (General Purpose SSD)",
                "16,000 (provisionable independently of size)",
                "1,000 MB/s",
                "marketplace-api-asg root volumes — 16,000 IOPS, 1,000 MB/s on 100 GiB; best price-performance for most workloads",
            ],
            [
                "io1 (Provisioned IOPS SSD)",
                "64,000 (Nitro instances)",
                "1,000 MB/s",
                "Databases requiring consistent low latency; older generation — prefer io2 for new deployments",
            ],
            [
                "io2 (Provisioned IOPS SSD)",
                "64,000 (Nitro instances)",
                "1,000 MB/s",
                "Mission-critical databases at marketplace; 99.999% durability (vs 99.8–99.9% for gp2/gp3/io1)",
            ],
            [
                "io2 Block Express",
                "256,000",
                "4,000 MB/s",
                "MCP Report Generator — latency-sensitive sequential database writes; sub-millisecond latency; R5b/X2idn/Im4gn instances required",
            ],
            [
                "st1 (Throughput-Optimised HDD)",
                "500 (max 500 IOPS)",
                "500 MB/s",
                "marketplace nightly report archives — large sequential reads/writes at low cost; cannot be boot volume",
            ],
            [
                "sc1 (Cold HDD)",
                "250 (max 250 IOPS)",
                "250 MB/s",
                "Lowest-cost storage for infrequently accessed marketplace log archives; cannot be boot volume",
            ],
        ],
    },
    {
        id: "ebs-vs-efs-vs-instance-store",
        title: "EBS vs EFS vs Instance Store",
        subtitle: "Storage comparison for AMI PVT LTD marketplace workloads",
        color: ACCENT.teal,
        columns: ["Feature", "EBS", "EFS", "Instance Store"],
        rows: [
            [
                "Attachment",
                "Single EC2 instance (io1/io2 multi-attach up to 16 Nitro instances, read-write)",
                "Thousands of EC2 instances simultaneously across multiple AZs",
                "Fixed to the host server; cannot detach or re-attach",
            ],
            [
                "Persistence",
                "Persistent — survives instance stop/terminate (if DeleteOnTermination=false)",
                "Persistent — independent lifecycle from EC2 instances; survives all instance actions",
                "Ephemeral — data lost on stop, terminate, or hardware failure; marketplace cache must rebuild from DynamoDB",
            ],
            [
                "Multi-AZ",
                "Single AZ only — marketplace-api-asg snapshots required for cross-AZ data",
                "Multi-AZ by default (Standard tier spans 3 AZs); EFS One Zone is single-AZ",
                "Single host only — no replication; not fault tolerant",
            ],
            [
                "Protocol",
                "Block device (ext4, xfs, NTFS) — treated as a local disk",
                "NFS v4.1 — mounted as a network filesystem over port 2049",
                "Block device (NVMe) — highest throughput local disk on i3/i3en instances",
            ],
            [
                "Encryption",
                "AWS-managed or CMK (marketplace-ebs-key); encrypted in transit between EC2 and EBS",
                "AWS-managed or CMK; in-transit encryption via TLS with amazon-efs-utils --tls mount option",
                "Not encrypted by default — use OS-level encryption (LUKS) for marketplace-cache data at rest",
            ],
            [
                "Performance",
                "Up to 256,000 IOPS (io2 Block Express) — predictable, provisionable SLA",
                "General Purpose: low latency per op; Max I/O: high aggregate throughput for thousands of clients",
                "Sub-millisecond latency, hundreds of thousands of IOPS — fastest local storage available on EC2",
            ],
            [
                "Cost model",
                "Per GB/month + per IOPS/month (for provisioned); gp3 baseline IOPS included in storage price",
                "Per GB/month stored; EFS Standard more expensive than EBS per GiB; EFS IA reduces cost for cold data",
                "Included in EC2 instance price — no separate storage charge",
            ],
            [
                "Typical marketplace use case",
                "gp3 root volumes for marketplace-api-asg; io2 for MCP Report Generator database; st1 for nightly archives",
                "marketplace-reports-efs shared /reports directory for report generator EC2s across ap-southeast-1a and 1b",
                "i3.2xlarge NVMe for marketplace in-memory catalogue cache; ephemeral recommendation scores",
            ],
        ],
    },
    {
        id: "ebs-key-numbers",
        title: "EBS Key Numbers",
        subtitle: "Exam-critical limits, defaults, and behaviours for the SAA-C03",
        color: ACCENT.amber,
        columns: ["Item", "Value", "Exam Note"],
        rows: [
            [
                "Max volume size",
                "64 TiB (for io2 Block Express, gp2, gp3, io1, io2, st1, sc1)",
                "Any EBS volume type supports up to 64 TiB; use with instances that support large volumes (Nitro-based)",
            ],
            [
                "Max IOPS per volume",
                "256,000 (io2 Block Express); 64,000 (io1/io2 on Nitro); 16,000 (gp2/gp3)",
                "io2 Block Express is the only volume type supporting 256,000 IOPS; requires R5b, X2idn, or Im4gn instance",
            ],
            [
                "Max throughput per volume",
                "4,000 MB/s (io2 Block Express); 1,000 MB/s (gp3, io1, io2); 500 MB/s (st1); 250 MB/s (sc1, gp2)",
                "gp3 allows 1,000 MB/s throughput even at small sizes — key advantage over gp2's 250 MB/s cap",
            ],
            [
                "Snapshot incremental behaviour",
                "First snapshot: full copy of used blocks to S3; subsequent: only changed blocks",
                "Deleting a snapshot only removes blocks not needed by any other snapshot — safe to delete intermediate snapshots",
            ],
            [
                "Snapshot storage location",
                "AWS-managed S3 (not visible in your S3 bucket list); regionally durable across 3+ AZs",
                "Snapshots are NOT stored in marketplace-tool-artifacts S3 bucket — they are in AWS-internal S3",
            ],
            [
                "DLM retention range",
                "1 to 1,000 snapshots per schedule, or 1 day to 100 years for age-based retention",
                "marketplace-api-asg DLM policy retains 7 snapshots; older snapshots are automatically deleted by DLM",
            ],
            [
                "EBS-Optimized throughput",
                "Depends on instance type — up to 19 Gbps (c5n.18xlarge); t3.medium ~695 Mbps",
                "EBS-Optimized provides dedicated bandwidth between EC2 and EBS; enabled by default on most current-gen instances",
            ],
            [
                "Multi-Attach limit",
                "Up to 16 Nitro-based EC2 instances simultaneously (io1/io2 only)",
                "Multi-Attach does not use standard file system clustering — each instance manages its own I/O; use cluster-aware FS (GFS2)",
            ],
            [
                "Volume modification (ModifyVolume)",
                "Type, size, IOPS, and throughput can be changed on a live volume with no downtime",
                "After modification, a volume enters the 'optimizing' state; it is fully usable but may take hours to finish optimizing",
            ],
        ],
    },
];

export default matrices;
