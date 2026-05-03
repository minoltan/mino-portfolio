import { ACCENT } from "../constants";

/**
 * IAM key limits and numbers — these appear directly in SAA-C03 exam questions.
 */

const keyNumbers = [
    { num: "5,000", label: "IAM users / account", color: ACCENT.primary, note: "Use federation for large orgs — AMI PVT LTD uses SAML; no IAM users for FinServ Corp employees" },
    { num: "2", label: "Access keys / user", color: ACCENT.teal, note: "Rotate: create new → update app → deactivate old → delete old" },
    { num: "1", label: "Role / EC2 instance", color: ACCENT.amber, note: "Can swap role on running instance — no restart needed" },
    { num: "10", label: "Managed policies / entity", color: ACCENT.orange, note: "Hard limit → plan policy structure, use groups not individual attachments" },
    { num: "1 hr", label: "Default STS duration", color: ACCENT.purple, note: "Min 15 min, max 12 hr for AssumeRole — set DurationSeconds in call" },
    { num: "36 hr", label: "Root user STS max", color: ACCENT.pink, note: "GetSessionToken max duration for root user (normal roles: 12 hr max)" },
    { num: "Global", label: "IAM service scope", color: ACCENT.green, note: "IAM is global — users/roles are not region-specific" },
    { num: "Free", label: "IAM cost", color: ACCENT.slate, note: "No charge for IAM itself — only the resources it grants access to" },
];

export default keyNumbers;
