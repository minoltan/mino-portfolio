import { ACCENT } from "../constants";

/**
 * AMI PVT LTD — Marketplace Platform Security in the Cloud scenarios
 *
 * Services: Amazon Cognito, AWS Directory Service, AWS KMS,
 *           AWS CloudHSM, AWS WAF & Shield, AWS Secrets Manager
 * Reference: https://digitalcloud.training/aws-iam/
 *            https://digitalcloud.training/amazon-cognito/
 *            https://digitalcloud.training/aws-directory-services/
 *            https://digitalcloud.training/aws-kms/
 *            https://digitalcloud.training/aws-cloudhsm/
 *            https://digitalcloud.training/aws-waf-shield/
 */

const scenarios = [
    {
        id: 1,
        analogy: "Think of it like a hotel guest registration desk — every guest (user) checks in at the front desk (Cognito User Pool), shows their passport (username + password or social login), gets a key card (JWT token), and then uses that key card to open their room and access hotel services. The key card works for 1 hour; after that, they use a refresh token to get a new key card without re-showing their passport.",
        icon: "🔑",
        color: ACCENT.primary,
        tag: "SCENARIO 1",
        title: "Amazon Cognito User Pools",
        subtitle: "Buyer authentication and JWT token issuance for the marketplace",
        useCase: {
            title: "AMI PVT LTD Marketplace — Cognito User Pool authenticating buyers and issuing JWTs for API Gateway",
            story: "AMI PVT LTD creates marketplace-buyer-pool (Cognito User Pool) to handle buyer registration, sign-in, and authentication for the marketplace web app. When a buyer logs in, Cognito validates credentials, enforces MFA (TOTP via authenticator app for accounts with payment methods), and returns three tokens: ID token (buyer profile claims), Access token (API authorisation scopes), and Refresh token (24-hour TTL for silent re-authentication). The marketplace-api-gw REST API uses a Cognito User Pool Authorizer — API Gateway validates the JWT signature against Cognito's JWKS endpoint automatically, with a 300-second authorizer cache. Social identity federation is configured so buyers can sign in with Google or Facebook accounts, which Cognito maps to a user pool account. Hosted UI provides a pre-built sign-in page at https://marketplace.auth.ap-southeast-1.amazoncognito.com.",
            diagram: [
                { actor: "Buyer — browser / mobile app", icon: "🌐" },
                { arrow: "sign-in request (username+password or Google OAuth)" },
                { actor: "marketplace-buyer-pool (Cognito User Pool)", icon: "🔑" },
                { arrow: "returns ID token + Access token + Refresh token (JWT)" },
                { actor: "Buyer app sends Access token in Authorization header", icon: "🌐" },
                { arrow: "API Gateway validates JWT via Cognito Authorizer (cached 300s)" },
                { actor: "marketplace-api-gw → Lambda functions (authenticated)", icon: "🚪" },
            ],
        },
        buildSystem: [
            "Create Cognito User Pool marketplace-buyer-pool: password policy min 12 chars + uppercase + number + symbol; enable self-service sign-up with email verification; set email as username attribute",
            "Configure MFA: set MFAConfiguration=OPTIONAL; enable TOTP (software token) as the MFA method; buyers with payment methods saved are prompted to enrol during next login via a post-authentication Lambda trigger",
            "Configure App Client marketplace-web-app-client: generate client secret=false (SPA cannot keep secrets); enable ALLOW_USER_SRP_AUTH and ALLOW_REFRESH_TOKEN_AUTH; set access token validity=1 hour, refresh token validity=30 days",
            "Set up Google identity provider federation: register OAuth2 credentials in Google Cloud Console; create Google IdP in Cognito with client ID/secret; map Google email claim to Cognito email attribute",
            "Enable Cognito Hosted UI with custom domain marketplace.auth.ap-southeast-1.amazoncognito.com; configure callback URLs to https://marketplace.ami.com/callback and sign-out URLs",
            "Create Cognito User Pool Authorizer on marketplace-api-gw: tokenSource=Authorization header, authorizerUri=<User Pool ARN>, identityValidationExpression=Bearer .*, resultTtlInSeconds=300",
            "Add Lambda Pre-Sign-Up trigger to validate email domains for enterprise customers (only allow @allowed-domain.com); add Post-Confirmation trigger to create a DynamoDB buyer profile entry",
            "Enable advanced security features: compromise credentials detection (Cognito checks passwords against known breach databases), adaptive authentication (block sign-ins from unfamiliar locations/devices)",
        ],
        flow: ["Buyer submits credentials", "Cognito validates + MFA", "JWT tokens issued", "App sends Access token to API", "API Gateway validates JWT (cache 300s)"],
        examTips: [
            "Cognito User Pool = identity management (authentication, sign-up, MFA, tokens) — it is the directory/IdP; Cognito Identity Pool = credential vending (exchanges any token for temporary AWS credentials via STS)",
            "JWTs from Cognito contain three tokens: ID token (user attributes — for your app), Access token (OAuth scopes — for authorising APIs), Refresh token (get new ID/Access tokens without re-authentication)",
            "Cognito Hosted UI provides a pre-built sign-in/sign-up page — you redirect users to it and receive tokens back at your callback URL; use it to avoid building a custom auth UI",
            "App Client Secret should be disabled for browser/mobile apps (SPAs and mobile cannot securely store secrets); enable secrets only for server-side apps (Spring Boot) that can protect the secret",
            "Cognito supports Lambda triggers at every lifecycle point: Pre-Sign-Up (validate input), Post-Confirmation (create profile), Pre-Token-Generation (add custom claims to JWT), Post-Authentication (audit logging)",
        ],
        roleJson: [
            {
                label: "AWS CLI — create Cognito User Pool with MFA and app client",
                note: "💡 Set resultTtlInSeconds=300 on the Cognito Authorizer in API Gateway — without caching, every API request triggers a Cognito token validation call, adding 50–150ms latency to every request.",
                code: `# Create User Pool
aws cognito-idp create-user-pool \\
  --pool-name marketplace-buyer-pool \\
  --policies '{"PasswordPolicy":{"MinimumLength":12,"RequireUppercase":true,"RequireNumbers":true,"RequireSymbols":true}}' \\
  --mfa-configuration OPTIONAL \\
  --username-attributes email \\
  --auto-verified-attributes email \\
  --region ap-southeast-1

# Create App Client (no secret for SPA)
aws cognito-idp create-user-pool-client \\
  --user-pool-id ap-southeast-1_XXXXXXXX \\
  --client-name marketplace-web-app-client \\
  --no-generate-secret \\
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \\
  --access-token-validity 60 \\
  --refresh-token-validity 43200 \\
  --token-validity-units '{"AccessToken":"minutes","RefreshToken":"minutes"}'`,
            },
        ],
    },

    {
        id: 2,
        analogy: "Think of it like a VIP airport lounge — the airline (Cognito User Pool) verifies you have a valid boarding pass (JWT), then the lounge reception (Cognito Identity Pool) checks what class you're flying (your user group) and hands you a lounge day pass (temporary AWS credentials) that lets you access the premium services (AWS resources) appropriate for your ticket class.",
        icon: "🎫",
        color: ACCENT.teal,
        tag: "SCENARIO 2",
        title: "Amazon Cognito Identity Pools",
        subtitle: "Temporary AWS credentials for authenticated buyers and unauthenticated guest browsing",
        useCase: {
            title: "AMI PVT LTD Marketplace — Cognito Identity Pool vending AWS credentials for direct S3 product image uploads and guest browsing",
            story: "AMI PVT LTD uses a Cognito Identity Pool marketplace-identity-pool for two scenarios: (1) Authenticated upload — after a seller logs in via marketplace-buyer-pool, the web app exchanges the Cognito ID token for temporary STS credentials (15-minute TTL) scoped to s3:PutObject on marketplace-products-bucket/uploads/{sub}/* where {sub} is the Cognito user's unique identifier; sellers upload product images directly from the browser to S3 without routing through the Spring Boot API. (2) Guest browsing — unauthenticated guests receive read-only STS credentials scoped to s3:GetObject on marketplace-products-bucket/public/* allowing them to browse product thumbnails without signing in. The identity pool uses IAM roles: marketplace-authenticated-role and marketplace-guest-role, with role selection based on whether the user presents a valid Cognito JWT.",
            diagram: [
                { actor: "Seller — authenticated (Cognito ID token from marketplace-buyer-pool)", icon: "🛒" },
                { arrow: "exchange ID token for temporary STS credentials" },
                { actor: "Cognito Identity Pool — marketplace-identity-pool", icon: "🎫" },
                { arrow: "calls STS AssumeRoleWithWebIdentity → returns temp credentials (15 min)" },
                { actor: "marketplace-authenticated-role (s3:PutObject scoped to seller prefix)", icon: "🔐" },
                { arrow: "seller uploads directly to S3 with temp credentials" },
                { actor: "S3 marketplace-products-bucket/uploads/{sub}/product-image.jpg", icon: "🪣" },
            ],
        },
        buildSystem: [
            "Create Cognito Identity Pool marketplace-identity-pool: enable unauthenticated access=true (guest browsing); set Cognito User Pool as the authenticated provider with marketplace-buyer-pool ID and web app client ID",
            "Create IAM role marketplace-authenticated-role: trust policy allows cognito-identity.amazonaws.com to AssumeRoleWithWebIdentity with Condition StringEquals cognito-identity.amazonaws.com:aud = identity-pool-id; attach seller upload policy",
            "Create seller upload policy: allow s3:PutObject and s3:GetObject on arn:aws:s3:::marketplace-products-bucket/uploads/${cognito-identity.amazonaws.com:sub}/* — the ${cognito-identity.amazonaws.com:sub} policy variable scopes each seller to their own prefix",
            "Create IAM role marketplace-guest-role: trust policy same as authenticated but for unauthenticated identities; attach read-only policy: s3:GetObject on marketplace-products-bucket/public/* only",
            "Configure the Identity Pool to use Enhanced (Simplified) flow: Cognito handles the STS call automatically — the app calls GetCredentialsForIdentity with the ID token; Cognito returns credentials without the app making an STS call directly",
            "Implement in the seller web app (JavaScript): use AWS Amplify or the AWS SDK Cognito Identity Pool provider; after login, get credentials from the pool and instantiate an S3 client — no backend needed for uploads",
            "Set S3 CORS policy on marketplace-products-bucket to allow PUT requests from https://marketplace.ami.com origin — required for browser-based direct-to-S3 uploads",
            "Enable S3 Server-Side Encryption by default (SSE-S3) on marketplace-products-bucket; uploaded objects inherit encryption automatically without requiring sellers to pass encryption headers",
        ],
        flow: ["User authenticates via User Pool", "App sends ID token to Identity Pool", "Identity Pool calls STS AssumeRole", "Temporary credentials returned (15 min)", "App uses credentials for direct S3 upload"],
        examTips: [
            "Cognito Identity Pools vend temporary AWS credentials (STS) — they are NOT an authentication service; they rely on an external IdP (Cognito User Pool, Google, Facebook, SAML) for authentication",
            "The ${cognito-identity.amazonaws.com:sub} IAM policy variable is the key to per-user S3 prefix isolation — it resolves to the authenticated user's unique Cognito identity ID, preventing one seller from accessing another's files",
            "Enhanced (Simplified) flow vs Basic flow: Enhanced flow has Cognito call STS internally and return credentials directly — the app only calls GetCredentialsForIdentity; Basic flow requires the app to call STS directly with a token from GetOpenIdToken",
            "Unauthenticated identities require explicit enablement on the Identity Pool and a dedicated IAM role — the guest role should have minimal permissions; unauthenticated users still get a unique Cognito identity ID",
            "Identity Pool + User Pool together = Cognito's complete auth stack; User Pool authenticates, Identity Pool authorises AWS resource access — they are often used together but can be used independently",
        ],
        roleJson: [
            {
                label: "IAM policy — authenticated seller role with per-user S3 prefix isolation",
                note: "💡 Always use the \${cognito-identity.amazonaws.com:sub} policy variable to scope S3 access to the authenticated user's own prefix — without it, any authenticated seller can overwrite other sellers' files.",
                code: `// IAM Policy for marketplace-authenticated-role
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SellerOwnPrefixUpload",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::marketplace-products-bucket/uploads/\${cognito-identity.amazonaws.com:sub}/*"
    },
    {
      "Sid": "PublicProductRead",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::marketplace-products-bucket/public/*"
    }
  ]
}

// Trust Policy for marketplace-authenticated-role
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "cognito-identity.amazonaws.com"},
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {"cognito-identity.amazonaws.com:aud": "ap-southeast-1:IDENTITY-POOL-ID"},
      "ForAnyValue:StringLike": {"cognito-identity.amazonaws.com:amr": "authenticated"}
    }
  }]
}`,
            },
        ],
    },

    {
        id: 3,
        analogy: "Think of it like a master locksmith who makes personalised keys for your entire building — AWS KMS is the locksmith who holds the master key-making machine (HSM), creates and manages keys on your behalf, and ensures every lock (S3 bucket, RDS database, DynamoDB table) uses a key that only you authorise, with a complete log of every time someone used any key.",
        icon: "🔐",
        color: ACCENT.amber,
        tag: "SCENARIO 3",
        title: "AWS Key Management Service (KMS)",
        subtitle: "Envelope encryption for S3, RDS, and DynamoDB across the marketplace",
        useCase: {
            title: "AMI PVT LTD Marketplace — KMS CMKs encrypting all data at rest across S3, RDS, DynamoDB, and Secrets Manager",
            story: "AMI PVT LTD implements a multi-key KMS strategy for the marketplace platform. Four Customer Managed Keys (CMKs) are created: marketplace-s3-key (encrypts marketplace-products-bucket and marketplace-tool-artifacts), marketplace-rds-key (encrypts marketplace-orders-db and marketplace-aurora-cluster), marketplace-dynamo-key (encrypts DynamoDB Products, Orders, and Subscriptions tables), and marketplace-secrets-key (encrypts all Secrets Manager secrets). Each CMK has a key policy granting usage only to the specific IAM roles that need it — marketplace-api-asg EC2 role has kms:Decrypt on marketplace-s3-key but NOT on marketplace-rds-key (the RDS service handles that). Key rotation is enabled annually on all CMKs. Cross-account access is granted so the marketplace-analytics account can decrypt exported DynamoDB data using marketplace-dynamo-key.",
            diagram: [
                { actor: "Spring Boot API / Lambda (encrypt/decrypt request)", icon: "🏢" },
                { arrow: "GenerateDataKey call to KMS" },
                { actor: "AWS KMS — marketplace-s3-key CMK (HSM-backed)", icon: "🔐" },
                { arrow: "returns plaintext DEK + encrypted DEK (envelope encryption)" },
                { actor: "Application encrypts data with plaintext DEK, stores encrypted DEK alongside data", icon: "💾" },
                { arrow: "encrypted data written to" },
                { actor: "S3 / RDS / DynamoDB (data encrypted at rest)", icon: "🪣" },
            ],
        },
        buildSystem: [
            "Create CMK marketplace-s3-key: aws kms create-key --description 'Marketplace S3 encryption' --key-usage ENCRYPT_DECRYPT --origin AWS_KMS; create alias aws kms create-alias --alias-name alias/marketplace-s3-key",
            "Create CMK marketplace-rds-key, marketplace-dynamo-key, marketplace-secrets-key with the same pattern; use separate keys per service so a breach of one service's key does not expose all data",
            "Configure key policy on marketplace-s3-key: key administrators = marketplace-security-admin IAM role; key users = marketplace-api-ec2-role and AWSServiceRoleForS3 (for SSE-KMS); deny all other principals",
            "Enable automatic annual key rotation: aws kms enable-key-rotation --key-id alias/marketplace-s3-key; rotation generates a new key material version but the key ID/alias stays the same — old versions retained for decryption",
            "Configure S3 bucket default encryption: aws s3api put-bucket-encryption --bucket marketplace-products-bucket with SSEAlgorithm=aws:kms and KMSMasterKeyID=alias/marketplace-s3-key",
            "Grant cross-account access to marketplace-dynamo-key: add marketplace-analytics account (ACCOUNT_ID) as a key user in the key policy; analytics account IAM roles can then use the key to decrypt exported DynamoDB data",
            "Enable KMS VPC endpoint marketplace-kms-endpoint in marketplace-vpc private subnets — EC2 and Lambda in private subnets call KMS without traversing the internet; required for compliance environments",
            "Set up CloudTrail logging for all KMS API calls: all GenerateDataKey, Decrypt, and Encrypt calls are automatically recorded in CloudTrail — audit who decrypted what data and when",
        ],
        flow: ["Application requests data key (GenerateDataKey)", "KMS returns plaintext + encrypted DEK", "App encrypts data with plaintext DEK", "Encrypted DEK stored with data", "On decrypt: KMS decrypts DEK → app decrypts data"],
        examTips: [
            "Envelope encryption: AWS services (S3, RDS, DynamoDB) use a Data Encryption Key (DEK) to encrypt data; the CMK encrypts the DEK — the CMK itself never leaves KMS hardware",
            "SSE-S3 (AES-256): AWS manages both the key and encryption — you have no control over the key; SSE-KMS: you control the CMK (key policies, rotation, auditing); SSE-C: you provide the key per request",
            "Automatic key rotation (annual) rotates the key MATERIAL but keeps the same key ID, alias, and ARN — existing encrypted data is NOT re-encrypted; old key material is retained for decryption",
            "KMS key policies are resource-based policies on the CMK — unlike IAM policies, a principal must be allowed BOTH in the key policy AND an IAM policy to use the key; the key policy alone is not sufficient",
            "Multi-Region Keys allow encrypting data in one region and decrypting it in another without cross-region KMS calls — useful for DR scenarios where data is replicated cross-region (e.g. Aurora Global Database)",
        ],
        roleJson: [
            {
                label: "AWS CLI — create CMK, set key policy, and configure S3 default encryption",
                note: "💡 Create separate CMKs per service (S3, RDS, DynamoDB) — this limits the blast radius if a key is accidentally disabled or a key policy is misconfigured, affecting only one service.",
                code: `# Create KMS CMK for S3 encryption
aws kms create-key \\
  --description "Marketplace S3 bucket encryption key" \\
  --key-usage ENCRYPT_DECRYPT \\
  --origin AWS_KMS \\
  --tags TagKey=Service,TagValue=S3 TagKey=Environment,TagValue=prod

# Create human-readable alias
aws kms create-alias \\
  --alias-name alias/marketplace-s3-key \\
  --target-key-id <KEY-ID>

# Enable automatic annual rotation
aws kms enable-key-rotation \\
  --key-id alias/marketplace-s3-key

# Set S3 bucket default encryption with KMS CMK
aws s3api put-bucket-encryption \\
  --bucket marketplace-products-bucket \\
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "alias/marketplace-s3-key"
      },
      "BucketKeyEnabled": true
    }]
  }'`,
            },
        ],
    },

    {
        id: 4,
        analogy: "Think of it like a casino's chip vault — a regular bank safe (KMS) is managed by the bank and shared among many customers; a dedicated vault room in your own basement (CloudHSM) is hardware you fully control, no one else has keys to, and the casino regulator requires for handling high-value chips. The tradeoff is you're responsible for the vault room's security and availability.",
        icon: "🏦",
        color: ACCENT.orange,
        tag: "SCENARIO 4",
        title: "AWS CloudHSM",
        subtitle: "Dedicated FIPS 140-2 Level 3 HSM for enterprise compliance requirements",
        useCase: {
            title: "AMI PVT LTD Marketplace — CloudHSM cluster for enterprise customers requiring FIPS 140-2 Level 3 key storage",
            story: "A financial services enterprise customer (finserv-corp, account 987654321098) subscribes to the AMI PVT LTD Marketplace but requires FIPS 140-2 Level 3 validated hardware for all cryptographic operations — a requirement KMS (FIPS 140-2 Level 2) does not satisfy. AMI PVT LTD provisions a CloudHSM cluster marketplace-hsm-cluster (2 HSM instances across ap-southeast-1a and ap-southeast-1b) inside marketplace-vpc private subnets. The Spring Boot API uses the AWS CloudHSM JCE (Java Cryptography Extension) provider to offload RSA key generation and TLS private key storage to the HSM. The HSM is used only for this enterprise customer's transaction signing — regular marketplace S3/RDS encryption continues to use KMS CMKs.",
            diagram: [
                { actor: "Enterprise Spring Boot API (TLS + RSA signing operations)", icon: "🏢" },
                { arrow: "JCE provider calls CloudHSM client daemon" },
                { actor: "CloudHSM Client Daemon (on EC2 instances)", icon: "💻" },
                { arrow: "encrypted channel (mutual TLS) to HSM cluster" },
                { actor: "marketplace-hsm-cluster (HSM-1: AZ-a, HSM-2: AZ-b)", icon: "🏦" },
                { arrow: "FIPS 140-2 Level 3 hardware operations — keys never leave HSM" },
                { actor: "RSA private key (non-extractable) / signed response returned to API", icon: "🔐" },
            ],
        },
        buildSystem: [
            "Create CloudHSM cluster marketplace-hsm-cluster in marketplace-vpc private subnets: aws cloudhsmv2 create-cluster --hsm-type hsm1.medium --subnet-ids subnet-private-1a subnet-private-1b",
            "Create two HSM instances for HA: aws cloudhsmv2 create-hsm --cluster-id cluster-xxxx --availability-zone ap-southeast-1a (repeat for 1b) — minimum two HSMs across two AZs for production",
            "Initialise the cluster: download the cluster CSR, sign it with your CA to verify cluster ownership, upload the signed certificate — this establishes the root of trust for the HSM cluster",
            "Configure Security Group marketplace-hsm-sg: allow port 2223–2225 inbound from marketplace-api-sg (CloudHSM client daemon ports); deny all other inbound traffic",
            "Install CloudHSM client package on marketplace-api-asg EC2 instances via SSM Run Command; configure the client with the cluster's IP addresses; the client daemon handles key caching and failover between HSMs",
            "Create a Crypto User (CU) for the Spring Boot application in the HSM using the cloudhsm_mgmt_util — the CU credentials are used by the JCE provider; store them in Secrets Manager marketplace-hsm-credentials",
            "Configure the Spring Boot API to use the CloudHSM JCE provider: add the dependency to pom.xml, set Security.addProvider(new com.cavium.provider.CaviumProvider()) at startup, use 'Cavium' as the JCE provider name in KeyStore.getInstance('Cavium')",
            "Test HSM functionality: generate an RSA 2048-bit key pair in the HSM, perform a test signing operation, verify the signature — confirm the private key is flagged as non-extractable (cannot be exported from the HSM)",
        ],
        flow: ["App requests crypto operation via JCE", "CloudHSM client daemon routes to HSM", "HSM performs operation in hardware", "Keys never leave HSM boundary", "Result returned to application"],
        examTips: [
            "CloudHSM is a dedicated hardware HSM in YOUR VPC — only you have access to the keys; AWS cannot access or recover keys; if you lose the HSM credentials, keys are unrecoverable",
            "KMS is FIPS 140-2 Level 2 (software-validated keys with hardware-based RNGs); CloudHSM is FIPS 140-2 Level 3 (physical tamper protection, mandatory identity-based authentication) — use CloudHSM when compliance explicitly requires Level 3",
            "CloudHSM can be used as a custom key store for KMS — create a KMS CMK backed by CloudHSM key material; your app still uses the KMS API but key operations run inside your CloudHSM",
            "CloudHSM is NOT managed like KMS — you are responsible for HSM initialisation, user management, HA configuration, patching, and cluster sizing; AWS only manages the physical hardware",
            "CloudHSM charges per HSM instance-hour (currently ~$1.45/hour per instance) — a 2-HSM HA cluster costs ~$2.90/hour (~$2,100/month), significantly more than KMS ($0.03 per 10,000 API calls)",
        ],
        roleJson: [
            {
                label: "AWS CLI — create CloudHSM cluster and add HSM instances",
                note: "💡 Always deploy at least 2 HSM instances across 2 AZs — a single HSM is a single point of failure; CloudHSM synchronises keys across HSMs automatically.",
                code: `# Create CloudHSM cluster
aws cloudhsmv2 create-cluster \\
  --hsm-type hsm1.medium \\
  --subnet-ids subnet-private-1a subnet-private-1b \\
  --region ap-southeast-1

# Add first HSM instance (AZ-a)
aws cloudhsmv2 create-hsm \\
  --cluster-id cluster-xxxxxxxxxxxx \\
  --availability-zone ap-southeast-1a

# Add second HSM instance (AZ-b) for HA
aws cloudhsmv2 create-hsm \\
  --cluster-id cluster-xxxxxxxxxxxx \\
  --availability-zone ap-southeast-1b

# Check cluster state (wait for INITIALIZED)
aws cloudhsmv2 describe-clusters \\
  --filters clusterIds=cluster-xxxxxxxxxxxx \\
  --query 'Clusters[0].State'

# Describe HSM instances
aws cloudhsmv2 describe-clusters \\
  --filters clusterIds=cluster-xxxxxxxxxxxx \\
  --query 'Clusters[0].Hsms[*].{AZ:AvailabilityZone,State:State,IP:EniIp}'`,
            },
        ],
    },

    {
        id: 5,
        analogy: "Think of it like a multi-layer security checkpoint at an airport — the outer perimeter (Shield) stops car bombs before anyone reaches the terminal; the metal detector at the entrance (WAF) checks every individual passenger for prohibited items; specific items are flagged by name (managed rule groups); and VIP lanes (rate limiting) ensure one person can't cause a traffic jam for everyone else.",
        icon: "🛡️",
        color: ACCENT.purple,
        tag: "SCENARIO 5",
        title: "AWS WAF & Shield",
        subtitle: "Layer 7 web filtering and DDoS protection for the marketplace ALB and API Gateway",
        useCase: {
            title: "AMI PVT LTD Marketplace — WAF Web ACL on marketplace-alb blocking SQL injection, bot traffic, and rate-limiting per IP",
            story: "AMI PVT LTD attaches a WAF Web ACL marketplace-web-acl to marketplace-alb after a security audit identifies SQL injection attempts in product search queries and credential stuffing attacks on the buyer sign-in endpoint. The Web ACL has four rule groups in priority order: (1) AWS-AWSManagedRulesCommonRuleSet (priority 1) — blocks OWASP Top 10 patterns including SQLi and XSS; (2) AWS-AWSManagedRulesBotControlRuleSet (priority 2) — blocks known bots and scrapers; (3) marketplace-rate-limit-rule (priority 3) — rate-limits any single IP to 2,000 requests per 5 minutes to prevent brute force; (4) marketplace-geo-block-rule (priority 4) — blocks traffic from countries where AMI PVT LTD has no business (optional, compliance). Shield Advanced is enabled on marketplace-alb and marketplace-nlb for DDoS response team (DRT) access and cost protection during volumetric attacks.",
            diagram: [
                { actor: "Internet traffic (legitimate buyers + attackers + bots)", icon: "🌐" },
                { arrow: "HTTPS requests to marketplace-alb" },
                { actor: "AWS Shield Advanced (L3/L4 volumetric DDoS protection — always-on)", icon: "🛡️" },
                { arrow: "legitimate traffic passes through to WAF" },
                { actor: "WAF Web ACL marketplace-web-acl (L7 rules)", icon: "🔍" },
                { arrow: "ALLOW / BLOCK / COUNT per rule evaluation" },
                { actor: "marketplace-alb → EC2 ASG (only clean traffic)", icon: "🏢" },
            ],
        },
        buildSystem: [
            "Create WAF Web ACL marketplace-web-acl in ap-southeast-1 scope=REGIONAL (for ALB/API Gateway); set defaultAction=ALLOW (block rules are additive, not opt-in)",
            "Add AWS Managed Rule Group AWSManagedRulesCommonRuleSet: priority=1, overrideAction=None (use the rule group's default actions — Block for matching requests); covers SQLi, XSS, CSRF, command injection",
            "Add AWS Managed Rule Group AWSManagedRulesBotControlRuleSet: priority=2; set scope-down statement to only apply to the sign-in endpoint /api/auth/* to avoid false positives on legitimate API calls",
            "Create rate-limit rule marketplace-rate-limit: priority=3, rateBasedStatement with limit=2000 per 5 minutes, aggregateKeyType=IP; action=BLOCK; add custom response header X-Rate-Limit-Exceeded: true for client-side handling",
            "Associate the Web ACL with marketplace-alb: aws wafv2 associate-web-acl --web-acl-arn <ACL_ARN> --resource-arn <ALB_ARN>; also associate with marketplace-api-gw ARN for API-level protection",
            "Enable WAF logging: deliver full request/response logs to S3 marketplace-tool-artifacts/waf-logs/ and Kinesis Firehose for real-time analysis; use Athena to query blocked requests by rule, IP, and URI",
            "Enable Shield Advanced on marketplace-alb and marketplace-nlb: aws shield create-protection --name marketplace-alb-protection --resource-arn <ALB_ARN>; subscribe to Shield Advanced at the account level first",
            "Configure Shield Response Team (DRT) access: create IAM role AWSShieldDRTAccessPolicy; the DRT can view WAF rules and create WAF rules on your behalf during an active DDoS attack",
        ],
        flow: ["Request hits Shield (L3/L4 scrubbing)", "WAF evaluates L7 rules in priority order", "First matching rule's action applied", "ALLOW → ALB target group", "BLOCK → 403 returned to client"],
        examTips: [
            "WAF protects at Layer 7 (HTTP/HTTPS) — it inspects request headers, body, URI, and query strings; it does NOT protect against Layer 3/4 volumetric DDoS attacks — Shield handles those",
            "WAF can be associated with: CloudFront (GLOBAL scope), ALB, API Gateway, AppSync, Cognito User Pool (REGIONAL scope) — it CANNOT be directly attached to EC2, NLB, or RDS",
            "Shield Standard is free and automatic for all AWS accounts — protects against common L3/L4 attacks; Shield Advanced ($3,000/month + DRT access) adds L7 protection with WAF integration and cost protection",
            "WAF rules are evaluated in priority order (lower number = higher priority) — the first matching rule's action is applied; subsequent rules are NOT evaluated; set more specific rules at lower priority numbers",
            "Managed Rule Groups (AWS and AWS Marketplace) are maintained by AWS or vendors — they update automatically when new threat signatures are added without any action required from you",
        ],
        roleJson: [
            {
                label: "AWS CLI — create WAF Web ACL with managed rules and rate limiting",
                note: "💡 Always start WAF rules in COUNT mode (not BLOCK) when first deploying — this lets you review what would be blocked in WAF logs before switching to BLOCK mode, preventing false positives in production.",
                code: `# Create WAF Web ACL (REGIONAL scope for ALB)
aws wafv2 create-web-acl \\
  --name marketplace-web-acl \\
  --scope REGIONAL \\
  --default-action Allow={} \\
  --rules '[
    {
      "Name": "AWSManagedRulesCommonRuleSet",
      "Priority": 1,
      "OverrideAction": {"None": {}},
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "VisibilityConfig": {"SampledRequestsEnabled": true, "CloudWatchMetricsEnabled": true, "MetricName": "CommonRuleSet"}
    },
    {
      "Name": "RateLimitPerIP",
      "Priority": 3,
      "Action": {"Block": {}},
      "Statement": {
        "RateBasedStatement": {"Limit": 2000, "AggregateKeyType": "IP"}
      },
      "VisibilityConfig": {"SampledRequestsEnabled": true, "CloudWatchMetricsEnabled": true, "MetricName": "RateLimit"}
    }
  ]' \\
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=marketplace-web-acl \\
  --region ap-southeast-1

# Associate Web ACL with ALB
aws wafv2 associate-web-acl \\
  --web-acl-arn arn:aws:wafv2:ap-southeast-1:234567890123:regional/webacl/marketplace-web-acl/xxx \\
  --resource-arn arn:aws:elasticloadbalancing:ap-southeast-1:234567890123:loadbalancer/app/marketplace-alb/xxx`,
            },
        ],
    },

    {
        id: 6,
        analogy: "Think of it like hiring a corporate private detective agency instead of an individual guard — AWS Directory Service integrates your company's existing employee directory (Active Directory) with AWS so employees use the same corporate username and password they use every morning to log into their laptop, automatically getting the right AWS permissions based on their job title, without any separate AWS account or password to manage.",
        icon: "🏛️",
        color: ACCENT.green,
        tag: "SCENARIO 6",
        title: "AWS Directory Service",
        subtitle: "Integrating enterprise Active Directory with the marketplace for SSO access",
        useCase: {
            title: "AMI PVT LTD Marketplace — AWS Managed Microsoft AD enabling enterprise customer employees to access marketplace tools via AD credentials",
            story: "Enterprise subscriber finserv-corp (account 987654321098) has 500 employees in an on-premises Active Directory (finserv.local). Rather than creating 500 IAM users for marketplace tool access, AMI PVT LTD provisions AWS Managed Microsoft AD marketplace-managed-ad in marketplace-vpc (domain: marketplace.ami.internal). A trust relationship is established between marketplace-managed-ad and finserv.local so finserv employees can authenticate with their corporate AD credentials and receive temporary AWS credentials via IAM Identity Center (SSO). An AD Connector marketplace-ad-connector is used in the customer account to proxy authentication requests to finserv's on-premises AD without storing directory data in AWS — suitable for customers who cannot allow their directory data in the cloud.",
            diagram: [
                { actor: "finserv-corp employee (corporate laptop, finserv.local credentials)", icon: "👤" },
                { arrow: "authenticates via IAM Identity Center (SSO)" },
                { actor: "IAM Identity Center → trust → marketplace-managed-ad (marketplace.ami.internal)", icon: "🏛️" },
                { arrow: "forest trust → finserv.local on-premises AD (via Direct Connect)" },
                { actor: "finserv.local AD validates credentials", icon: "🔑" },
                { arrow: "STS vends temporary credentials for AWS console/CLI access" },
                { actor: "finserv employee accesses AWS Console / marketplace tools (time-limited)", icon: "✅" },
            ],
        },
        buildSystem: [
            "Create AWS Managed Microsoft AD marketplace-managed-ad: aws ds create-microsoft-ad --name marketplace.ami.internal --short-name MARKETPLACEAMI --password <admin-pass> --vpc-settings SubnetIds=[subnet-1a,subnet-1b] — provisions two domain controllers for HA",
            "Establish a forest trust between marketplace-managed-ad and finserv.local: download the trust cert from the managed AD, configure the trust in the on-premises AD console, then run aws ds create-trust with the finserv domain details",
            "Configure AWS Direct Connect or Site-to-Site VPN connectivity between marketplace-vpc and finserv on-premises network — required for the trust relationship to function (AD traffic must reach the on-premises domain controllers)",
            "Enable IAM Identity Center (SSO) in the management account; configure it to use marketplace-managed-ad as the identity source; IAM Identity Center reads AD users and groups automatically",
            "Create Permission Sets in IAM Identity Center: MarketplaceReadOnly (read access to subscribed tools) and MarketplaceAdmin (full tool management); assign finserv AD groups to these permission sets for the customer account",
            "For customers who cannot use Managed AD: create AD Connector marketplace-ad-connector in the customer VPC: aws ds create-connector with the on-premises AD IP addresses and service account credentials — the connector proxies auth to on-premises AD without replicating the directory",
            "Configure RDS marketplace-orders-db to use Windows Authentication: join the RDS instance to the managed AD domain; database administrators log in with their AD credentials via Kerberos — no separate RDS password needed",
            "Set up RADIUS MFA integration with marketplace-managed-ad: configure a RADIUS server (e.g. Duo Security) as the MFA provider; all AD authentication prompts for a second factor before granting AWS access",
        ],
        flow: ["Employee uses corporate AD credentials", "IAM Identity Center authenticates via forest trust", "On-premises AD validates", "STS vends time-limited credentials", "Employee accesses marketplace tools"],
        examTips: [
            "AWS Managed Microsoft AD: full Microsoft AD in AWS (2 DCs in 2 AZs); supports trusts with on-premises AD; can join EC2 instances to the domain; best for 5,000+ users or when you need full AD features",
            "AD Connector: proxy only — authentication requests are forwarded to your on-premises AD; no directory data is stored in AWS; best for customers who must keep their directory on-premises for compliance",
            "Simple AD: AWS-managed Samba-based AD; compatible with basic AD features; does NOT support trusts with on-premises AD or Managed AD; best for small deployments (<5,000 users) with no on-premises integration needed",
            "IAM Identity Center (formerly AWS SSO) is the recommended way to manage human access to multiple AWS accounts — it integrates with Managed AD, external IdPs (Okta, Azure AD), and the built-in identity store",
            "Forest trusts in AWS Managed AD allow users in an external AD domain to access AWS resources — a one-way trust allows on-premises users to authenticate to AWS; a two-way trust allows both directions",
        ],
        roleJson: [
            {
                label: "AWS CLI — create Managed Microsoft AD and AD Connector",
                note: "💡 Use AD Connector when your compliance requirements prohibit replicating directory data to AWS; use Managed AD when you need AWS-hosted domain services (e.g. joining EC2 to domain, RDS Windows Auth).",
                code: `# Create AWS Managed Microsoft AD
aws ds create-microsoft-ad \\
  --name marketplace.ami.internal \\
  --short-name MARKETPLACEAMI \\
  --password "AdminPass@2026!" \\
  --vpc-settings '{
    "VpcId": "vpc-marketplace123",
    "SubnetIds": ["subnet-private-1a", "subnet-private-1b"]
  }' \\
  --edition Standard \\
  --region ap-southeast-1

# Create AD Connector (proxy to on-premises AD — no data stored in AWS)
aws ds create-connector \\
  --name finserv.local \\
  --password "ConnectorPass@2026!" \\
  --vpc-settings '{
    "VpcId": "vpc-customer987",
    "SubnetIds": ["subnet-cust-1a", "subnet-cust-1b"]
  }' \\
  --connect-settings '{
    "CustomerDnsIps": ["10.0.1.10", "10.0.1.11"],
    "CustomerUserName": "marketplace-connector-svc",
    "SubnetIds": ["subnet-cust-1a", "subnet-cust-1b"],
    "VpcId": "vpc-customer987"
  }' \\
  --region ap-southeast-1`,
            },
        ],
    },
];

export default scenarios;
