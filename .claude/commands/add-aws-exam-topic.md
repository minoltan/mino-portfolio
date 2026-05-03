---
description: Add a new AWS exam topic (scenarios + matrices) to the portfolio's AWS Exam Prep page. Provide the topic ID and topic name as arguments.
argument-hint: <topic-id> "<topic-name>"
---

Add a new AWS exam topic to the AMI PVT LTD Marketplace portfolio site.

**Arguments:** $ARGUMENTS
_(Expected format: `<topic-id> "<topic-name>"` — e.g. `10 "RDS & Aurora"`)_

---

## Project context

This is a React + MUI portfolio at `src/`. The AWS Exam Prep page lives at `src/pages/awsExam.js` and renders topic cards from `src/data/profile.json`. Each topic with a scenario map has its data in `src/data/aws-exam/<folder>/`.

**AMI PVT LTD Marketplace** — multi-tenant SaaS in `ap-southeast-1`:
- Spring Boot Java on EC2 (`marketplace-api-asg`, min=2/max=10/desired=3)
- Node.js Lambda (`marketplace-order-processor`)
- Account IDs: marketplace-prod = `234567890123`, customer = `987654321098`, management = `123456789012`
- Key resources: `marketplace-vpc` (10.0.0.0/16), `marketplace-alb`, `marketplace-nlb`, `marketplace-ecs-cluster`, ECR repo `marketplace/api`, DynamoDB `Products`/`Orders`/`Subscriptions`, S3 `marketplace-products-bucket`/`marketplace-tool-artifacts`/`marketplace-staging-bucket`, SQS `order-events-queue`, SNS `marketplace-notifications`

**ACCENT colors** (from `../constants`): `ACCENT.primary`, `ACCENT.teal`, `ACCENT.orange`, `ACCENT.amber`, `ACCENT.pink`, `ACCENT.green`, `ACCENT.purple`, `ACCENT.red`

---

## Steps to complete

### 1. Determine the folder name

Pick a short kebab-case folder name that matches the topic (e.g. `rds-aurora`, `cloudwatch`, `sqs-sns`, `api-gateway`, `waf-security`). Check `src/data/aws-exam/` for existing folders so there's no collision.

### 2. Create `src/data/aws-exam/<folder>/scenarios.js`

Write **6 scenarios**, each grounded in AMI PVT LTD Marketplace. Every scenario object follows this exact shape:

```js
import { ACCENT } from "../constants";

const scenarios = [
  {
    id: 1,
    icon: "emoji",
    color: ACCENT.xxx,
    tag: "SCENARIO 1",
    title: "Short title",
    subtitle: "One-line subtitle",
    useCase: {
      title: "AMI PVT LTD Marketplace — <describe the real scenario>",
      story: "Paragraph describing the situation at AMI PVT LTD. Name real resources (marketplace-*, account IDs, tech stack).",
      diagram: [
        { actor: "ActorName", icon: "emoji" },
        { arrow: "action label" },
        { actor: "NextActor", icon: "emoji" },
      ],
    },
    buildSystem: [
      "Concrete CLI or console step 1",
      "Step 2 — name real resource names",
      // 6–8 steps total
    ],
    flow: ["Stage1", "Stage2", "Stage3", "Stage4"],   // 4–6 short labels
    examTips: [
      "Exam-focused tip 1",
      "Tip 2",
      // 3–5 tips
    ],
    roleJson: [
      {
        label: "AWS CLI or JSON block label",
        note: "💡 One-line tip",
        code: `aws cli command or JSON policy`,
      },
    ],
  },
  // ... scenarios 2–6
];

export default scenarios;
```

Use a different `ACCENT` color for each scenario. All 6 scenarios must reference actual AMI PVT LTD resource names.

### 3. Create `src/data/aws-exam/<folder>/matrices.js`

Write **3 matrices** (reference/cheat-sheet tables). Each matrix:

```js
import { ACCENT } from "../constants";

const matrices = [
  {
    id: "kebab-id",
    title: "Table Title",
    subtitle: "One-line description of what this table shows",
    color: ACCENT.xxx,
    columns: ["Col1", "Col2", "Col3"],
    rows: [
      ["val", "val", "val"],
      // 7–12 rows
    ],
  },
  // ... matrices 2–3
];

export default matrices;
```

Good matrix patterns: comparison table (e.g. service A vs B vs C), key numbers/limits, decision guide (when to use what).

### 4. Update `src/data/profile.json`

Find the `aws_exam.saa_c03.topics` array. Add the new topic **after the last existing topic** (check the highest `id` currently in the array). Use this shape:

```json
{
  "id": <topic-id from $ARGUMENTS>,
  "title": "<topic-name from $ARGUMENTS>",
  "description": "One or two sentences describing what this topic covers for SAA-C03.",
  "key_topics": [
    "Key concept 1",
    "Key concept 2",
    // 10–14 items
  ],
  "blog_link": null
}
```

### 5. Update `src/pages/awsExam.js`

**a) Add imports** near the existing topic imports at the top of the file:

```js
import <folderCamel>Scenarios from "../data/aws-exam/<folder>/scenarios";
import <folderCamel>Matrices from "../data/aws-exam/<folder>/matrices";
```

**b) Add the topic ID** to `TOPIC_SCENARIO_IDS`:
```js
const TOPIC_SCENARIO_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, <new-id>]);
```

**c) Add a new case** in `renderTopicScenarioMap` before `return <IamScenariosSection hideHeader />;`:

```js
if (topicId === <new-id>) {
    return (
        <IamScenariosSection
            hideHeader
            title="<topic-name>"
            scenarios={<folderCamel>Scenarios}
            matrices={<folderCamel>Matrices}
            showStudyTabs={false}
        />
    );
}
```

### 6. Run build and verify

```bash
npm run build
```

Confirm the build passes with no errors. Report the new bundle size.

### 7. Commit

Stage only the new/modified files and commit with a message following the pattern:
```
New: AWS Exam Topic <id> — <topic-name> added
```

---

After completing all steps, summarise: topic ID, folder name, number of scenarios and matrices created, and the build size.
