---
name: "Growth Marketing Evaluator Agent"
description: "Growth Marketing agent blueprint focused on score outputs against explicit rubrics so teams can compare variants, regressions, and rollout quality over time for campaign teams need faster experimentation, channel-specific copy, and clearer measurement loops without losing brand control."
category: "Evaluation"
tags: ["agents", "agent-growth-marketing-evaluator-agent", "marketing", "growth", "campaigns", "evaluation", "scoring", "testing"]
features:
  - rubric scoring
  - regression checks
  - feedback labeling
  - campaign briefs
  - channel copy
  - experiment reviews
useCases:
  - campaign briefs
  - channel copy
  - experiment reviews
  - quality gates
  - A/B review
  - release readiness
alternatives:
  - Growth Marketing Orchestrator Agent
  - Growth Marketing Planner Agent
  - CrewAI
updatedAt: "2026-04-13"
---

# Growth Marketing Evaluator Agent

Growth Marketing Evaluator Agent is a reference agent blueprint for teams dealing with campaign teams need faster experimentation, channel-specific copy, and clearer measurement loops without losing brand control. It is designed to score outputs against explicit rubrics so teams can compare variants, regressions, and rollout quality over time.

## Where It Fits

- Domain: Growth Marketing
- Core stakeholders: growth marketers, brand leads, analytics teams
- Primary tools: analytics warehouse, CMS, ad platform exports

## Operating Model

1. Intake the current request, case, or workflow state.
2. Apply evaluation logic to the available evidence and system context.
3. Produce an explicit output artifact such as a summary, decision, routing action, or next-step plan.
4. Hand off to a human, a downstream tool, or another specialist when confidence or permissions require it.

## What Good Looks Like

- Keeps outputs grounded in the most relevant internal context.
- Leaves a clear trace of why the recommendation or action was taken.
- Supports escalation instead of hiding uncertainty.

## Implementation Notes

Use this agent when the team needs campaign briefs, channel copy, experiment reviews with tighter consistency and lower manual overhead. A good production setup usually combines structured inputs, bounded tool access, and a review path for high-risk decisions.

## Suggested Metrics

- Throughput for growth marketing workflows
- Escalation rate to human operators
- Quality score from evaluation review
- Time saved per completed workflow
