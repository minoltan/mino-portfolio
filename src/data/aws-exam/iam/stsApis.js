import { ACCENT } from "../constants";

/**
 * STS (Security Token Service) APIs
 * AMI PVT LTD Marketplace context applied to each real-world use case.
 */

const stsApis = [
    {
        name: "AssumeRole",
        color: ACCENT.primary,
        who: "IAM users / roles (same or cross-account)",
        useCase: "AMI PVT LTD Deployment Agent (Account A: marketplace-prod) assumes 'Marketplace-Deploy-Role' in each customer account (Account B) to provision purchased tools via CloudFormation — no shared credentials, full CloudTrail audit trail.",
    },
    {
        name: "AssumeRoleWithSAML",
        color: ACCENT.orange,
        who: "SAML federated users via corporate IdP",
        useCase: "FinServ Corp employees authenticate with Azure AD → SAML assertion is sent to STS → AssumeRoleWithSAML returns temp AWS creds → employees access their AMI PVT LTD Marketplace tools dashboard. Zero IAM users created for FinServ Corp.",
    },
    {
        name: "AssumeRoleWithWebIdentity",
        color: ACCENT.green,
        who: "OIDC / web identity (Google, Apple, Cognito)",
        useCase: "AMI PVT LTD Marketplace mobile app users sign in with Google (OIDC) → Cognito exchanges the web identity token for temp AWS creds → users access their tool subscription resources. Use Cognito in front of this for scalable mobile auth.",
    },
    {
        name: "GetSessionToken",
        color: ACCENT.purple,
        who: "IAM users or root (MFA enforcement)",
        useCase: "AMI PVT LTD engineers with 'deny-without-MFA' guardrail policies call GetSessionToken after supplying their MFA code — STS returns short-lived creds with MFA satisfied, allowing production write operations via CLI.",
    },
];

export default stsApis;
