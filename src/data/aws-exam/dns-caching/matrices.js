import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform DNS, Caching & Performance comparison matrices
 * marketplace-prod account: 234567890123
 * customer-account: 987654321098
 * management account: 123456789012
 */

const matrices = [
    {
        id: "route53-routing-policies",
        title: "Route 53 Routing Policies",
        subtitle: "When and how each routing policy works — applied to api.marketplace.ami.com and marketplace.ami.com",
        color: ACCENT.primary,
        columns: ["Policy", "When to use", "Key behavior"],
        rows: [
            [
                "Simple",
                "Single resource with no health check needed; return one or multiple values",
                "Returns all values in random order; cannot associate a health check; if multiple values are specified, Route 53 returns all and the client picks one randomly. Suitable for a single marketplace-alb with no failover requirement.",
            ],
            [
                "Weighted",
                "Blue/green DNS rollout; A/B testing; gradual traffic migration between versions",
                "Weight 0 removes traffic without deleting the record. Weights are relative — 10 and 90 mean 10% and 90%. Used at AMI PVT LTD to shift 10% of traffic to marketplace-alb-v2 during v2 rollout. Health checks optional but recommended.",
            ],
            [
                "Latency",
                "Multi-region deployments where requests should go to the lowest-latency region",
                "Route 53 measures latency from the client's resolver to each AWS region and returns the record with the lowest latency. Used for api.marketplace.ami.com to route SEA customers to ap-southeast-1 and India customers to ap-south-1.",
            ],
            [
                "Failover",
                "Active-passive HA — primary resource with automatic failover to secondary",
                "PRIMARY record has a health check; SECONDARY record is served only when primary is unhealthy. Used for marketplace.ami.com: primary=marketplace-alb, secondary=marketplace-failover-bucket static page.",
            ],
            [
                "Geolocation",
                "Route based on the physical location of the client (country or continent)",
                "Unlike latency, geolocation routes by geography not network speed. Use for compliance (data residency), language-based content, or restricted regional access. A default record must exist to catch locations not explicitly mapped.",
            ],
            [
                "Geoproximity",
                "Route traffic based on geographic location with bias to expand/shrink routing radius",
                "Requires Route 53 Traffic Flow (paid feature). Bias values (+1 to +99) expand the region's coverage; negative bias shrinks it. Useful for gradually shifting a geographic boundary between ap-southeast-1 and ap-south-1.",
            ],
            [
                "Multi-value answer",
                "Return multiple healthy records (up to 8) to act as a basic DNS-level load balancer",
                "Similar to Simple routing but each record can have an associated health check. Only healthy records are returned. Not a replacement for an ALB — intended for simple client-side load balancing across multiple IP addresses.",
            ],
            [
                "IP-based",
                "Route based on the client IP CIDR range (e.g. route corporate network to a specific endpoint)",
                "Define CIDR blocks and map them to endpoints. AMI PVT LTD could route traffic from 10.0.0.0/8 (on-premise VPN) to an internal marketplace-alb listener, and all other traffic to the public ALB.",
            ],
        ],
    },
    {
        id: "cloudfront-vs-globalaccelerator-vs-route53",
        title: "CloudFront vs Global Accelerator vs Route 53",
        subtitle: "Choosing the right performance and availability layer for the AMI PVT LTD marketplace",
        color: ACCENT.teal,
        columns: ["Feature", "CloudFront", "Global Accelerator", "Route 53"],
        rows: [
            [
                "Primary purpose",
                "Content caching and edge delivery — reduces origin load and latency for static/cacheable content",
                "Network-layer acceleration — routes TCP/UDP traffic over AWS backbone from the nearest edge PoP to the origin",
                "DNS resolution — translates domain names to IP addresses and applies routing policies",
            ],
            [
                "Caching",
                "Yes — caches objects at 400+ edge locations globally; TTL configurable per cache behavior; used for marketplace-products-bucket images",
                "No caching — all requests are proxied to the origin endpoint; suited for non-cacheable API and real-time traffic",
                "No caching — DNS responses are cached by resolvers based on TTL; Route 53 itself is not a caching layer",
            ],
            [
                "Protocols supported",
                "HTTP/HTTPS, WebSocket; Layer 7 only; supports HTTP/2 and HTTP/3 (QUIC)",
                "TCP and UDP; Layer 4; no HTTP-specific features; suitable for non-HTTP workloads (gaming, IoT, VoIP)",
                "DNS (UDP/TCP port 53); not a network-layer proxy; health checks support HTTP/HTTPS/TCP",
            ],
            [
                "Static IPs",
                "No static IPs — CloudFront uses a large and changing pool of edge IPs; not suitable for IP allowlisting",
                "Yes — two static Anycast IPs per accelerator; enterprise customers allowlist these IPs in their firewalls; IPs never change",
                "No static IPs for the service itself; Alias records point to resource DNS names; useful for static IP resources behind Global Accelerator",
            ],
            [
                "DDoS protection",
                "AWS Shield Standard included; CloudFront absorbs volumetric attacks at the edge; WAF can be attached for L7 protection",
                "AWS Shield Standard included; Anycast network inherently absorbs some volumetric attacks near the source",
                "Route 53 is highly available and distributed; Shuffle Sharding and Anycast striping protect individual hosted zones",
            ],
            [
                "Health checks & failover",
                "Origin group with primary and failover origins; failover on 4xx/5xx from primary origin",
                "Endpoint health checks with sub-30-second failover; traffic dial allows gradual shifting between endpoint groups",
                "Health checks with configurable thresholds; integrates with failover, latency, and multi-value routing policies",
            ],
            [
                "Pricing model",
                "Per-request and per-GB data transfer out; price class can limit to specific regions to reduce cost",
                "Fixed hourly charge per accelerator + per-GB data transfer premium over standard internet pricing",
                "Per hosted zone/month + per million queries; health checks charged per check/month",
            ],
            [
                "AMI PVT LTD use case",
                "marketplace-cdn: cache product images from marketplace-products-bucket; pass-through for /api/* to marketplace-alb; signed URLs for premium docs",
                "marketplace-global-accelerator: EU/US enterprise customers get static IPs, low-latency backbone routing to ap-southeast-1 marketplace-alb with automatic failover to ap-south-1",
                "api.marketplace.ami.com: latency routing + failover; internal.marketplace.local: private hosted zone for microservice DNS in marketplace-vpc",
            ],
        ],
    },
    {
        id: "cloudfront-key-numbers",
        title: "CloudFront Key Numbers & Behaviors",
        subtitle: "Exam-critical limits and configuration details for marketplace-cdn",
        color: ACCENT.amber,
        columns: ["Item", "Value / behavior", "Exam note"],
        rows: [
            [
                "Default TTL",
                "86,400 seconds (24 hours)",
                "Applied when the origin response does not include Cache-Control or Expires headers. For marketplace-products-bucket images with no cache header, CloudFront caches for 24 hours by default.",
            ],
            [
                "Maximum TTL",
                "31,536,000 seconds (1 year)",
                "The longest period CloudFront will cache an object regardless of origin headers. Use versioned object keys (image-v2.jpg) with a long max TTL to maximize cache hit rate for immutable assets.",
            ],
            [
                "Minimum TTL",
                "0 seconds",
                "Setting min TTL=0 and max TTL=0 effectively disables caching but CloudFront still forwards conditional GET requests (If-None-Match). To truly bypass caching use Cache-Control: no-store on the origin response.",
            ],
            [
                "Cache behaviors (path patterns)",
                "Up to 25 cache behaviors per distribution (default); evaluated in order of specificity",
                "The default cache behavior (*) always matches last. More specific patterns (/images/thumbnails/*) take precedence over less specific (/images/*). marketplace-cdn has behaviors for /images/*, /api/*, and the default (*).",
            ],
            [
                "Origins per distribution",
                "Up to 25 origins per distribution (default)",
                "marketplace-cdn uses 2 origins: marketplace-products-bucket (S3) and marketplace-alb (ALB). Multiple behaviors point to different origins in the same distribution — no need for separate distributions per origin.",
            ],
            [
                "Geo restriction",
                "Allowlist or blocklist by country",
                "CloudFront geo restriction blocks requests from specified countries at the edge before they reach the origin. For compliance, AMI PVT LTD could block certain countries from downloading marketplace tools entirely using a blocklist.",
            ],
            [
                "Signed URL vs Signed Cookie",
                "Signed URL: one URL per file; Signed Cookie: one cookie for many files",
                "Use signed URLs for individual purchased tool ZIPs (one per order). Use signed cookies for enterprise documentation suites where a subscriber needs access to all PDFs under docs/{suite-id}/* — one cookie covers the entire path.",
            ],
            [
                "Price classes",
                "All edge locations (default); Price Class 200 (US/EU/Asia); Price Class 100 (US/EU only)",
                "Price Class 100 excludes more expensive regions (South America, Oceania, Middle East) and reduces cost. For marketplace-cdn serving primarily SEA and Europe, Price Class 200 may be sufficient at lower cost than All.",
            ],
            [
                "Invalidation cost",
                "First 1,000 paths/month free; $0.005 per path after",
                "A wildcard path like /images/* counts as one path regardless of how many objects it matches — much cheaper than individual file invalidations. AMI PVT LTD uses /images/{tool-id}/* for targeted invalidation after product updates.",
            ],
            [
                "Lambda@Edge vs CloudFront Functions",
                "Lambda@Edge: up to 5s timeout, Node.js/Python, all 4 event types; CloudFront Functions: sub-millisecond, JavaScript only, viewer events only",
                "Use CloudFront Functions for lightweight URL rewrites and header manipulation at viewer-request/viewer-response. Use Lambda@Edge for complex logic like JWT validation at origin-request before forwarding to marketplace-alb.",
            ],
        ],
    },
];

export default matrices;
