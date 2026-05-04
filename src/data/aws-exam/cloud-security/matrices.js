import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Security in the Cloud matrices
 * Cognito, Directory Service, KMS, CloudHSM, WAF & Shield
 * Reference: https://digitalcloud.training/amazon-cognito/
 *            https://digitalcloud.training/aws-directory-services/
 *            https://digitalcloud.training/aws-kms/
 *            https://digitalcloud.training/aws-cloudhsm/
 *            https://digitalcloud.training/aws-waf-shield/
 */

const matrices = [
    {
        id: "cognito-identity-comparison",
        title: "Cognito User Pools vs Identity Pools vs IAM Identity Center",
        subtitle: "Three different identity services — know which one to use for each scenario",
        color: ACCENT.primary,
        columns: ["Feature", "Cognito User Pool", "Cognito Identity Pool", "IAM Identity Center (SSO)"],
        rows: [
            ["Primary function", "User authentication — sign-up, sign-in, MFA, tokens", "Credential vending — exchange any token for temporary AWS credentials", "Human workforce SSO — one login for multiple AWS accounts and applications"],
            ["Who uses it", "End users (buyers, sellers, external customers)", "Apps needing AWS resource access (S3, DynamoDB) on behalf of end users", "Employees, contractors, internal teams needing AWS Console/CLI access"],
            ["Output", "JWT tokens (ID, Access, Refresh)", "Temporary AWS credentials via STS AssumeRoleWithWebIdentity", "Temporary AWS credentials + access to assigned accounts via browser SSO"],
            ["Supports social login (Google, Facebook)", "✅ Yes — built-in social IdP federation", "✅ Yes — any OIDC/SAML token can be exchanged", "✅ Yes — via external IdP configuration"],
            ["Supports on-prem AD / SAML", "✅ Yes — SAML 2.0 IdP federation to User Pool", "✅ Yes — accepts SAML tokens for credential exchange", "✅ Yes — native AD Connector / Managed AD integration"],
            ["Unauthenticated (guest) access", "❌ No — must sign in", "✅ Yes — unauthenticated identities get minimal AWS credentials", "❌ No — requires authentication"],
            ["Multi-account AWS access", "❌ No — single application scope", "❌ No — scoped to IAM roles per pool configuration", "✅ Yes — designed for multi-account access with Permission Sets"],
            ["Marketplace use case", "marketplace-buyer-pool: buyer sign-in, MFA, JWT for API Gateway", "marketplace-identity-pool: seller direct S3 upload, guest product browsing", "Management of marketplace-prod/customer/analytics account access for AMI PVT LTD employees"],
            ["Lambda triggers", "✅ Yes — 12 lifecycle hooks (Pre-SignUp, Post-Confirm, Pre-Token, etc.)", "❌ No — no trigger hooks", "❌ No — no trigger hooks"],
            ["Cost", "Free tier + $0.0055/MAU beyond 50,000 MAU", "Free for <50,000 monthly active identities", "Free for basic; paid for Advanced features"],
        ],
    },
    {
        id: "encryption-services-comparison",
        title: "AWS Encryption Services Comparison",
        subtitle: "KMS vs CloudHSM vs S3 encryption options vs Secrets Manager",
        color: ACCENT.teal,
        columns: ["Service / Option", "Who manages the key?", "FIPS level", "Best for", "Marketplace use", "Key exam distinction"],
        rows: [
            ["SSE-S3 (AES-256)", "AWS manages key AND encryption", "FIPS 140-2 Level 2", "Lowest-friction S3 encryption when key control is not required", "Acceptable for non-sensitive S3 objects (public thumbnails)", "You have NO control over the key; AWS rotates it transparently"],
            ["SSE-KMS (CMK)", "You create/manage the CMK in KMS; KMS manages HSMs", "FIPS 140-2 Level 2", "Encryption with audit trail, key policy, and rotation control", "marketplace-products-bucket, marketplace-tool-artifacts (SSE-KMS with CMKs)", "Adds KMS API call cost + latency; S3 Bucket Keys reduce KMS API calls by 99%"],
            ["SSE-C (Customer-Provided Key)", "YOU provide the key per request", "N/A (your key, your hardware)", "Customers with own key management infrastructure", "Not used at AMI PVT LTD (too complex for marketplace)", "Key is NOT stored in AWS; lost key = permanently inaccessible data"],
            ["AWS KMS CMK", "You control the CMK; KMS manages underlying HSMs", "FIPS 140-2 Level 2", "Centralised key management for S3, RDS, DynamoDB, EBS, Secrets Manager", "marketplace-s3-key, marketplace-rds-key, marketplace-dynamo-key", "Key policy + IAM policy BOTH required; key rotation is annual and automatic"],
            ["AWS KMS Custom Key Store (CloudHSM-backed)", "You control both CMK and CloudHSM", "FIPS 140-2 Level 3", "CMK-level API convenience + Level 3 HSM compliance", "Not yet used; option for future finserv-corp requirements", "CloudHSM cluster must be initialised and active before creating custom key store"],
            ["AWS CloudHSM", "YOU fully control — AWS has ZERO access", "FIPS 140-2 Level 3", "Applications needing Level 3 compliance (PCI-DSS, eIDAS)", "marketplace-hsm-cluster for finserv-corp transaction signing", "No key recovery if credentials lost; you manage HA, patching, user management"],
            ["AWS Secrets Manager", "KMS CMK encrypts secret; you manage the CMK", "Same as KMS CMK (Level 2)", "Secrets with automatic rotation (DB passwords, API keys)", "marketplace-orders-db password, Stripe API key, Redis auth token", "Native rotation Lambda for RDS, Redshift, DocumentDB; costs $0.40/secret/month"],
            ["AWS Systems Manager Parameter Store (SecureString)", "KMS CMK encrypts parameter; you manage the CMK", "Same as KMS CMK (Level 2)", "Configuration values and secrets without rotation (or with manual rotation)", "/marketplace/prod/* config hierarchy (DB endpoint, feature flags)", "Standard tier is free; cheaper than Secrets Manager for non-rotating config"],
            ["KMS Multi-Region Keys (MRK)", "You control a primary CMK in one region; AWS replicates key material to replica keys in other regions", "FIPS 140-2 Level 2 (same as standard CMK)", "Cross-region DR where data encrypted in region A must be decryptable in region B using the SAME key material without cross-region KMS calls — e.g. Aurora Global Database, DynamoDB Global Tables", "marketplace-tool-artifacts CRR to ap-south-1: primary MRK in ap-southeast-1, replica MRK in ap-south-1 — same key material satisfies 'same key in both regions' compliance requirement", "⚠️ S3 LIMITATION: S3 treats MRKs as single-region keys — S3 still calls the local regional KMS endpoint and does NOT skip the KMS call using shared key material; the benefit for S3 is only that objects encrypted with the primary CAN be decrypted with the replica (same key ID prefix mrk-xxx); use MRK for S3+CRR only when policy requires same key material in both regions"],
        ],
    },
    {
        id: "waf-shield-protection-guide",
        title: "WAF & Shield Protection Tiers",
        subtitle: "Layer-by-layer DDoS and web attack protection for the marketplace",
        color: ACCENT.amber,
        columns: ["Layer", "Threat", "AWS protection service", "Marketplace resource protected", "Key configuration"],
        rows: [
            ["L3 (Network)", "UDP/TCP flood, ICMP flood, volumetric DDoS (Gbps scale)", "Shield Standard (free, automatic)", "marketplace-alb, marketplace-nlb, marketplace-vpc, CloudFront", "Automatic — no configuration needed; always active for all AWS accounts"],
            ["L4 (Transport)", "SYN flood, ACK flood, amplification attacks (NTP, DNS)", "Shield Standard + Advanced", "marketplace-alb (TCP 443), marketplace-nlb (TCP 8443)", "Shield Advanced adds real-time visibility, DRT access, and cost protection"],
            ["L7 (Application)", "SQL injection, XSS, CSRF, command injection, path traversal", "AWS WAF — AWSManagedRulesCommonRuleSet", "marketplace-alb, marketplace-api-gw (all endpoints)", "Priority 1 rule; OWASP Top 10 protection; update automatically"],
            ["L7 (Bots)", "Credential stuffing, scraping, account takeover bots", "AWS WAF — AWSManagedRulesBotControlRuleSet", "marketplace-api-gw /api/auth/*, /api/products/*", "Scope-down to specific paths to reduce false positives; verify-mode first"],
            ["L7 (Rate limiting)", "Brute force login, API abuse, volumetric application attacks", "AWS WAF — Rate-Based Rule", "marketplace-api-gw /api/auth/login (100 req/5min per IP)", "Use IP-based aggregation; combine with CAPTCHA challenge for borderline IPs"],
            ["L7 (Geo blocking)", "Compliance — restrict access to specific countries", "AWS WAF — Geo Match Rule", "marketplace-alb (all traffic)", "Block countries not in AMI PVT LTD's business regions; whitelist-approach safer"],
            ["L7 (Custom rules)", "Business-specific threats (known malicious IPs, bad user agents)", "AWS WAF — IP Set + Regex Rules", "marketplace-api-gw all methods", "Maintain IP blocklist in an IP Set; update programmatically via WAF API from threat intel feeds"],
            ["Origin protection", "Bypass WAF/CloudFront and hit ALB directly with attacker IP", "Security Group on ALB — allow ONLY from CloudFront IP ranges", "marketplace-alb inbound rules", "Use AWS-managed prefix list for CloudFront IPs; automatically updated when CloudFront adds new IPs"],
            ["DDoS cost protection", "AWS service charges spike during volumetric attack absorbing traffic", "Shield Advanced — DDoS cost protection", "marketplace-alb, marketplace-api-gw", "Shield Advanced reimburses scaling costs incurred due to DDoS attacks when enrolled"],
        ],
    },
];

export default matrices;
