import fs from "fs";
import path from "path";

const root = process.cwd();
const agentsDir = path.join(root, "content", "agents");
const docsDir = path.join(root, "content", "docs", "agents");
const today = "2026-04-13";
const author = "LLM Hub Team";

const domains = [
  {
    slug: "support-ops",
    label: "Support Operations",
    problem:
      "high ticket volume, inconsistent routing, and slow escalation paths across chat, email, and in-product support",
    outcomes: ["ticket triage", "knowledge-grounded replies", "escalation summaries"],
    stakeholders: ["support leads", "CX operations", "QA reviewers"],
    tags: ["support", "customer-service", "triage"],
    tools: ["help desk API", "knowledge base search", "CRM lookup"],
  },
  {
    slug: "sales-enablement",
    label: "Sales Enablement",
    problem:
      "fragmented deal context, inconsistent follow-up quality, and too much rep time spent gathering account intelligence",
    outcomes: ["account research", "proposal drafting", "next-step recommendations"],
    stakeholders: ["AEs", "sales ops", "revops analysts"],
    tags: ["sales", "go-to-market", "pipeline"],
    tools: ["CRM", "call transcripts", "account intelligence"],
  },
  {
    slug: "growth-marketing",
    label: "Growth Marketing",
    problem:
      "campaign teams need faster experimentation, channel-specific copy, and clearer measurement loops without losing brand control",
    outcomes: ["campaign briefs", "channel copy", "experiment reviews"],
    stakeholders: ["growth marketers", "brand leads", "analytics teams"],
    tags: ["marketing", "growth", "campaigns"],
    tools: ["analytics warehouse", "CMS", "ad platform exports"],
  },
  {
    slug: "data-platform",
    label: "Data Platform",
    problem:
      "analysts and engineers need better query generation, pipeline debugging, and dataset explanation across changing schemas",
    outcomes: ["query planning", "pipeline diagnostics", "dataset annotations"],
    stakeholders: ["data engineers", "analytics teams", "platform owners"],
    tags: ["data", "analytics", "pipelines"],
    tools: ["SQL warehouse", "dbt metadata", "incident logs"],
  },
  {
    slug: "security-operations",
    label: "Security Operations",
    problem:
      "security teams must classify alerts, enrich incidents, and reduce analyst fatigue without introducing unsafe automation",
    outcomes: ["alert enrichment", "incident timelines", "response recommendations"],
    stakeholders: ["SOC analysts", "security engineers", "incident commanders"],
    tags: ["security", "soc", "incident-response"],
    tools: ["SIEM", "case management", "threat intel"],
  },
  {
    slug: "finance-operations",
    label: "Finance Operations",
    problem:
      "finance teams need faster reconciliation, exception review, and policy-aware reporting for recurring operational workflows",
    outcomes: ["variance analysis", "close checklists", "policy summaries"],
    stakeholders: ["finance ops", "controllers", "audit partners"],
    tags: ["finance", "operations", "reconciliation"],
    tools: ["ERP", "spreadsheet models", "approval systems"],
  },
  {
    slug: "legal-compliance",
    label: "Legal Compliance",
    problem:
      "legal teams need structured review support for contracts, obligations, and policy mapping under strict approval controls",
    outcomes: ["clause extraction", "risk summaries", "approval packets"],
    stakeholders: ["legal ops", "compliance managers", "counsel"],
    tags: ["legal", "compliance", "risk"],
    tools: ["document repository", "policy library", "contract redlines"],
  },
  {
    slug: "healthcare-ops",
    label: "Healthcare Operations",
    problem:
      "care and operations teams need workflow assistance around intake, documentation, and coordination while preserving safety review",
    outcomes: ["intake summaries", "handoff notes", "care coordination drafts"],
    stakeholders: ["care teams", "operations managers", "clinical reviewers"],
    tags: ["healthcare", "operations", "coordination"],
    tools: ["scheduling system", "document store", "workflow inbox"],
  },
  {
    slug: "developer-productivity",
    label: "Developer Productivity",
    problem:
      "engineering teams want reliable help with issue triage, runbook guidance, and change review without obscuring system ownership",
    outcomes: ["bug triage", "runbook drafts", "change summaries"],
    stakeholders: ["platform teams", "service owners", "developer experience leads"],
    tags: ["engineering", "developer-tools", "productivity"],
    tools: ["issue tracker", "runbooks", "CI logs"],
  },
  {
    slug: "research-intelligence",
    label: "Research Intelligence",
    problem:
      "research and strategy teams need synthesis across large source sets with explicit provenance, tradeoffs, and update tracking",
    outcomes: ["briefing memos", "source comparison", "trend monitoring"],
    stakeholders: ["research teams", "strategy leads", "executives"],
    tags: ["research", "analysis", "monitoring"],
    tools: ["document corpus", "search index", "source tracker"],
  },
];

const patterns = [
  {
    slug: "planner-agent",
    label: "Planner Agent",
    category: "Planning",
    focus:
      "break ambiguous work into explicit stages, dependencies, and success checks before any downstream execution happens",
    features: ["task decomposition", "dependency mapping", "checkpoint generation"],
    useCases: ["front-door intake", "project scoping", "handoff planning"],
    tags: ["planning", "decomposition", "workflow-design"],
  },
  {
    slug: "router-agent",
    label: "Router Agent",
    category: "Routing",
    focus:
      "classify incoming work and send it to the right queue, specialist, toolchain, or escalation path with minimal latency",
    features: ["intent classification", "priority scoring", "escalation routing"],
    useCases: ["queue assignment", "request dispatch", "specialist handoff"],
    tags: ["routing", "classification", "orchestration"],
  },
  {
    slug: "researcher-agent",
    label: "Researcher Agent",
    category: "Research",
    focus:
      "gather source material, compare evidence, and produce traceable summaries instead of unsupported synthesis",
    features: ["source gathering", "evidence comparison", "citation capture"],
    useCases: ["brief creation", "market scans", "vendor evaluation"],
    tags: ["research", "evidence", "synthesis"],
  },
  {
    slug: "retrieval-agent",
    label: "Retrieval Agent",
    category: "Retrieval",
    focus:
      "find the right internal knowledge quickly and package it into grounded context for downstream responses or actions",
    features: ["query rewriting", "retrieval ranking", "context packaging"],
    useCases: ["RAG support", "knowledge grounding", "policy lookup"],
    tags: ["retrieval", "rag", "knowledge"],
  },
  {
    slug: "reviewer-agent",
    label: "Reviewer Agent",
    category: "Review",
    focus:
      "inspect drafts, tool outputs, or decisions for gaps, policy issues, and missing evidence before work moves forward",
    features: ["quality review", "policy checks", "revision guidance"],
    useCases: ["approval support", "draft critique", "risk review"],
    tags: ["review", "quality", "governance"],
  },
  {
    slug: "executor-agent",
    label: "Executor Agent",
    category: "Execution",
    focus:
      "take well-bounded actions across tools and systems once a plan, permission model, and fallback path are already defined",
    features: ["tool invocation", "state updates", "step confirmation"],
    useCases: ["workflow automation", "system actions", "operational follow-through"],
    tags: ["execution", "tools", "automation"],
  },
  {
    slug: "monitor-agent",
    label: "Monitor Agent",
    category: "Observability",
    focus:
      "watch workflows over time, detect drift or failures, and surface the smallest useful signal to operators quickly",
    features: ["signal detection", "drift alerts", "status digests"],
    useCases: ["workflow health", "SLA tracking", "quality monitoring"],
    tags: ["monitoring", "observability", "alerts"],
  },
  {
    slug: "memory-agent",
    label: "Memory Agent",
    category: "Memory",
    focus:
      "maintain durable task state, summarize interaction history, and preserve only the context worth carrying forward",
    features: ["state summarization", "memory updates", "context compaction"],
    useCases: ["session continuity", "case tracking", "long-running workflows"],
    tags: ["memory", "state", "context-management"],
  },
  {
    slug: "evaluator-agent",
    label: "Evaluator Agent",
    category: "Evaluation",
    focus:
      "score outputs against explicit rubrics so teams can compare variants, regressions, and rollout quality over time",
    features: ["rubric scoring", "regression checks", "feedback labeling"],
    useCases: ["quality gates", "A/B review", "release readiness"],
    tags: ["evaluation", "scoring", "testing"],
  },
  {
    slug: "orchestrator-agent",
    label: "Orchestrator Agent",
    category: "Orchestration",
    focus:
      "coordinate multiple specialists, route shared state, and decide when a workflow should continue, pause, or escalate",
    features: ["state coordination", "multi-step control", "fallback branching"],
    useCases: ["multi-agent systems", "workflow control", "complex process management"],
    tags: ["orchestration", "multi-agent", "coordination"],
  },
];

fs.mkdirSync(agentsDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });

let generatedAgents = 0;
let generatedDocs = 0;

for (const domain of domains) {
  for (let index = 0; index < patterns.length; index += 1) {
    const pattern = patterns[index];
    const slug = `${domain.slug}-${pattern.slug}`;
    const agentName = `${domain.label} ${pattern.label}`;
    const tags = unique([
      "agents",
      `agent-${slug}`,
      ...domain.tags,
      ...pattern.tags,
    ]);
    const alternatives = buildAlternatives(domain, index);
    const features = unique([...pattern.features, ...domain.outcomes]);
    const useCases = unique([...domain.outcomes, ...pattern.useCases]);
    const tools = domain.tools.join(", ");
    const stakeholders = domain.stakeholders.join(", ");

    fs.writeFileSync(
      path.join(agentsDir, `${slug}.md`),
      `---
name: "${agentName}"
description: "${escapeYaml(
        `${domain.label} agent blueprint focused on ${pattern.focus.replace(/\.$/, "")} for ${domain.problem}.`,
      )}"
category: "${pattern.category}"
tags: [${tags.map((tag) => `"${tag}"`).join(", ")}]
features:
${features.map((item) => `  - ${escapeYaml(item)}`).join("\n")}
useCases:
${useCases.map((item) => `  - ${escapeYaml(item)}`).join("\n")}
alternatives:
${alternatives.map((item) => `  - ${escapeYaml(item)}`).join("\n")}
updatedAt: "${today}"
---

# ${agentName}

${agentName} is a reference agent blueprint for teams dealing with ${domain.problem}. It is designed to ${pattern.focus}.

## Where It Fits

- Domain: ${domain.label}
- Core stakeholders: ${stakeholders}
- Primary tools: ${tools}

## Operating Model

1. Intake the current request, case, or workflow state.
2. Apply ${pattern.category.toLowerCase()} logic to the available evidence and system context.
3. Produce an explicit output artifact such as a summary, decision, routing action, or next-step plan.
4. Hand off to a human, a downstream tool, or another specialist when confidence or permissions require it.

## What Good Looks Like

- Keeps outputs grounded in the most relevant internal context.
- Leaves a clear trace of why the recommendation or action was taken.
- Supports escalation instead of hiding uncertainty.

## Implementation Notes

Use this agent when the team needs ${domain.outcomes.join(", ")} with tighter consistency and lower manual overhead. A good production setup usually combines structured inputs, bounded tool access, and a review path for high-risk decisions.

## Suggested Metrics

- Throughput for ${domain.label.toLowerCase()} workflows
- Escalation rate to human operators
- Quality score from ${pattern.category.toLowerCase()} review
- Time saved per completed workflow
`,
      "utf8",
    );
    generatedAgents += 1;

    fs.writeFileSync(
      path.join(docsDir, `${slug}.md`),
      `---
title: "${agentName} Implementation Guide"
description: "${escapeYaml(
        `Architecture, workflow design, metrics, and rollout guidance for a ${agentName.toLowerCase()} in production.`,
      )}"
date: "${today}"
updatedAt: "${today}"
category: "Agent Blueprints"
tags: [${tags.map((tag) => `"${tag}"`).join(", ")}]
author: "${author}"
---

# ${agentName} Implementation Guide

${agentName} works best when teams need ${domain.outcomes.join(", ")} while preserving explicit controls around quality, escalation, and auditability.

## System Boundary

This blueprint assumes the agent operates inside a ${domain.label.toLowerCase()} workflow and can access ${tools}. It should not silently make irreversible decisions without a review or approval path.

## Recommended Architecture

### 1. Inputs

- Structured request payload from the upstream system
- Recent workflow history or case context
- Retrieved internal knowledge relevant to the request

### 2. Core Loop

- Normalize the request into a predictable schema
- Apply ${pattern.category.toLowerCase()} logic using the strongest available evidence
- Produce a typed output artifact for the next workflow step
- Attach a confidence note and a recommended escalation path

### 3. Outputs

- Primary artifact: ${domain.outcomes[0]}
- Secondary artifact: ${domain.outcomes[1]}
- Tertiary artifact: ${domain.outcomes[2]}

## Prompt And Tooling Guidance

Keep the agent contract narrow. Ask for the minimum output needed by downstream systems, require evidence-backed reasoning, and separate free-form explanation from fields that automation depends on. Good tool access for this blueprint usually includes ${tools}.

## Failure Modes

- Missing context causes weak or overconfident decisions
- Retrieved evidence is stale or only partially relevant
- The agent tries to resolve ambiguity that should trigger escalation
- Metrics optimize speed without protecting decision quality

## Rollout Checklist

- Define success metrics before broad deployment
- Add a review queue for low-confidence or high-risk outputs
- Log input versions, tool calls, and final decisions
- Compare agent throughput and quality against the current manual baseline

## Related Agent Pattern

This guide is paired with [${agentName}](/agents/${slug}). Use the blueprint page for the high-level role definition and this document for implementation details.
`,
      "utf8",
    );
    generatedDocs += 1;
  }
}

console.log(`Generated ${generatedAgents} agents in content/agents.`);
console.log(`Generated ${generatedDocs} docs in content/docs/agents.`);

function unique(values) {
  return [...new Set(values)];
}

function buildAlternatives(domain, index) {
  const next = patterns[(index + 1) % patterns.length];
  const third = patterns[(index + 2) % patterns.length];
  return [
    `${domain.label} ${next.label}`,
    `${domain.label} ${third.label}`,
    "CrewAI",
  ];
}

function escapeYaml(value) {
  return String(value).replace(/"/g, '\\"');
}
