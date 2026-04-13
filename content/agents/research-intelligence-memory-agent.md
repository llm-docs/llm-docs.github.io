---
name: "Research Intelligence Memory Agent"
description: "Research Intelligence agent blueprint focused on maintain durable task state, summarize interaction history, and preserve only the context worth carrying forward for research and strategy teams need synthesis across large source sets with explicit provenance, tradeoffs, and update tracking."
category: "Memory"
tags: ["agents", "agent-research-intelligence-memory-agent", "research", "analysis", "monitoring", "memory", "state", "context-management"]
features:
  - state summarization
  - memory updates
  - context compaction
  - briefing memos
  - source comparison
  - trend monitoring
useCases:
  - briefing memos
  - source comparison
  - trend monitoring
  - session continuity
  - case tracking
  - long-running workflows
alternatives:
  - Research Intelligence Evaluator Agent
  - Research Intelligence Orchestrator Agent
  - CrewAI
updatedAt: "2026-04-13"
---

# Research Intelligence Memory Agent

Research Intelligence Memory Agent is a reference agent blueprint for teams dealing with research and strategy teams need synthesis across large source sets with explicit provenance, tradeoffs, and update tracking. It is designed to maintain durable task state, summarize interaction history, and preserve only the context worth carrying forward.

## Where It Fits

- Domain: Research Intelligence
- Core stakeholders: research teams, strategy leads, executives
- Primary tools: document corpus, search index, source tracker

## Operating Model

1. Intake the current request, case, or workflow state.
2. Apply memory logic to the available evidence and system context.
3. Produce an explicit output artifact such as a summary, decision, routing action, or next-step plan.
4. Hand off to a human, a downstream tool, or another specialist when confidence or permissions require it.

## What Good Looks Like

- Keeps outputs grounded in the most relevant internal context.
- Leaves a clear trace of why the recommendation or action was taken.
- Supports escalation instead of hiding uncertainty.

## Implementation Notes

Use this agent when the team needs briefing memos, source comparison, trend monitoring with tighter consistency and lower manual overhead. A good production setup usually combines structured inputs, bounded tool access, and a review path for high-risk decisions.

## Suggested Metrics

- Throughput for research intelligence workflows
- Escalation rate to human operators
- Quality score from memory review
- Time saved per completed workflow
