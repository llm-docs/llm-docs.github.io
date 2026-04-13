---
title: "LLM Metrics & KPIs"
description: "Defining and tracking LLM success metrics — quality KPIs, cost KPIs, user satisfaction, throughput targets, and dashboard design"
date: "2026-04-27"
category: "Evaluation & Safety"
tags: ["metrics", "kpis", "monitoring", "quality", "cost", "dashboards", "observability"]
author: "IntuiVortex Team"
---

# LLM Metrics & KPIs

You cannot manage what you cannot measure. LLM systems require a comprehensive metrics framework spanning output quality, operational performance, cost efficiency, and user satisfaction. This guide provides a structured approach to defining, tracking, and acting on LLM KPIs.

## The LLM Metrics Framework

```
┌──────────────────────────────────────────────────────────────┐
│                    LLM Metrics Dashboard                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Quality    │  │  Operations  │  │    Cost      │        │
│  │   KPIs       │  │    KPIs      │  │    KPIs      │        │
│  │              │  │              │  │              │        │
│  │ • Accuracy   │  │ • Latency    │  │ • $/Request  │        │
│  │ • Helpfulness│  │ • Throughput │  │ • $/Token    │        │
│  │ • Safety     │  │ • Error Rate │  │ • Budget     │        │
│  │ • Hallucination│ │ • Uptime    │  │ • Utilization│        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                          │
│  │    User      │  │   Business   │                          │
│  │  Satisfaction│  │    Impact    │                          │
│  │              │  │              │                          │
│  │ • CSAT       │  │ • Task       │                          │
│  │ • NPS        │  │   Completion │                          │
│  │ • Retention  │  │ • Time Saved │                          │
│  │ • Feedback   │  │ • Revenue    │                          │
│  └──────────────┘  └──────────────┘                          │
└──────────────────────────────────────────────────────────────┘
```

## Quality KPIs

### Output Quality Metrics

| Metric | Definition | Target | How to Measure |
|--------|-----------|--------|----------------|
| **Accuracy** | Fraction of responses that are factually correct | >90% | Human evaluation, fact-checking |
| **Helpfulness** | How useful the response is for the user's goal | >4.0/5.0 | User ratings, LLM judge |
| **Relevance** | How well the response addresses the query | >85% | LLM judge, keyword matching |
| **Completeness** | Whether the response covers all aspects of the query | >80% | LLM judge with rubric |
| **Coherence** | Logical flow and consistency within the response | >90% | LLM judge, self-consistency check |
| **Conciseness** | No unnecessary verbosity | 50-200 words for simple queries | Token count analysis |

### LLM-as-a-Judge Evaluation

```python
class LLMJudgeEvaluator:
    """Use an LLM to evaluate response quality."""

    def __init__(self, judge_model, rubric: dict):
        self.judge = judge_model
        self.rubric = rubric

    async def evaluate(self, prompt: str, response: str) -> dict:
        """Evaluate a response against the rubric."""
        rubric_text = "\n".join(f"- {k}: {v}" for k, v in self.rubric.items())

        evaluation_prompt = f"""Evaluate the following response against these criteria:

Rubric:
{rubric_text}

Query: {prompt}

Response: {response}

For each criterion, provide:
1. A score from 1-5
2. A brief justification

Format your response as JSON:
{{"criterion_name": {{"score": N, "justification": "..."}}}}"""

        result = await self.judge.generate(evaluation_prompt, max_tokens=500)
        scores = self._parse_scores(result.text)

        return {
            "scores": scores,
            "overall": sum(s["score"] for s in scores.values()) / len(scores),
            "prompt": prompt,
            "response": response,
        }

    def _parse_scores(self, text: str) -> dict:
        """Parse JSON scores from the LLM response."""
        import json
        import re
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {}
```

### Safety & Alignment Metrics

| Metric | Definition | Target | Frequency |
|--------|-----------|--------|-----------|
| **Toxicity Rate** | % of responses containing toxic content | &lt;0.1% | Continuous |
| **Bias Score** | Demographic parity across groups | &lt;5% disparity | Weekly |
| **Hallucination Rate** | % of responses with unsupported claims | &lt;5% | Weekly |
| **Jailbreak Success Rate** | % of adversarial prompts that succeed | &lt;1% | Monthly |
| **Refusal Rate** | % of queries the model appropriately refuses | 95-100% for harmful queries | Continuous |
| **Over-refusal Rate** | % of benign queries incorrectly refused | &lt;2% | Weekly |

```python
class SafetyMetricsTracker:
    """Track safety metrics in real-time."""

    def __init__(self):
        self.toxicity_detector = ToxicityDetector()
        self.hallucination_detector = HallucinationDetector()
        self.bias_evaluator = BiasEvaluator()

        self.total_responses = 0
        self.toxic_responses = 0
        self.hallucinated_responses = 0

    def record_response(self, prompt: str, response: str) -> dict:
        """Record and evaluate a response for safety."""
        self.total_responses += 1

        metrics = {
            "toxic": self.toxicity_detector.detect(response),
            "hallucinated": self.hallucination_detector.detect(prompt, response),
            "refused": self._is_refusal(response),
            "over_refused": False,
        }

        if metrics["toxic"]:
            self.toxic_responses += 1
        if metrics["hallucinated"]:
            self.hallucinated_responses += 1

        # Check for over-refusal
        if metrics["refused"] and not self._should_have_refused(prompt):
            metrics["over_refused"] = True

        return metrics

    def get_current_rates(self) -> dict:
        """Get current safety metric rates."""
        return {
            "toxicity_rate": self.toxic_responses / max(self.total_responses, 1),
            "hallucination_rate": self.hallucinated_responses / max(self.total_responses, 1),
            "total_responses": self.total_responses,
        }
```

## Operational KPIs

### Performance Metrics

| Metric | Definition | Target | Alert Threshold |
|--------|-----------|--------|----------------|
| **TTFT** | Time to First Token | &lt;500ms | &gt;1000ms |
| **TPOT** | Time Per Output Token | &lt;50ms | &gt;100ms |
| **p50 Latency** | Median end-to-end latency | &lt;2s | &gt;3s |
| **p95 Latency** | 95th percentile latency | &lt;5s | &gt;8s |
| **p99 Latency** | 99th percentile latency | &lt;10s | &gt;15s |
| **Throughput** | Requests per second | Based on capacity | &lt;50% of target |
| **Error Rate** | % of requests that fail | &lt;0.1% | &gt;1% |
| **Uptime** | % of time service is available | &gt;99.9% | &lt;99.5% |

### Capacity Metrics

```python
class CapacityMetrics:
    """Track system capacity and utilization."""

    def __init__(self, max_rps: int, max_concurrent: int):
        self.max_rps = max_rps
        self.max_concurrent = max_concurrent
        self.current_rps = 0
        self.current_concurrent = 0
        self.peak_rps = 0
        self.peak_concurrent = 0

    def record_request_start(self):
        self.current_concurrent += 1
        self.current_rps += 1
        self.peak_concurrent = max(self.peak_concurrent, self.current_concurrent)
        self.peak_rps = max(self.peak_rps, self.current_rps)

    def record_request_end(self):
        self.current_concurrent -= 1

    def get_utilization(self) -> dict:
        return {
            "rps_utilization": self.current_rps / self.max_rps,
            "concurrent_utilization": self.current_concurrent / self.max_concurrent,
            "peak_rps": self.peak_rps,
            "peak_concurrent": self.peak_concurrent,
            "headroom_rps": self.max_rps - self.current_rps,
            "headroom_concurrent": self.max_concurrent - self.current_concurrent,
        }

    def is_at_capacity(self, threshold: float = 0.85) -> bool:
        """Check if we're approaching capacity limits."""
        util = self.get_utilization()
        return (
            util["rps_utilization"] > threshold or
            util["concurrent_utilization"] > threshold
        )
```

## Cost KPIs

### Cost Tracking

| Metric | Definition | Target | How to Reduce |
|--------|-----------|--------|---------------|
| **Cost per Request** | Average cost of a single LLM call | &lt;$0.01 for simple, &lt;$0.10 for complex | Model routing, caching |
| **Cost per Token** | Average cost per 1K tokens | Varies by model | Smaller models, compression |
| **Monthly LLM Spend** | Total monthly cost across all providers | Within budget | Budget allocation, quotas |
| **Cost per User** | LLM cost attributed per user | Decreasing over time | Efficiency improvements |
| **Cost per Successful Task** | Cost divided by task completion rate | Decreasing | Better prompting, fewer retries |
| **Token Utilization** | % of generated tokens used by downstream | >80% | Shorter prompts, focused responses |

### Cost Dashboard

```python
class CostDashboard:
    """Track and visualize LLM costs."""

    def __init__(self):
        self.daily_costs: dict[str, float] = {}  # date → cost
        self.model_costs: dict[str, float] = {}   # model → cost
        self.endpoint_costs: dict[str, float] = {}  # endpoint → cost

    def record_cost(self, cost: float, model: str, endpoint: str, date: str = None):
        """Record a cost entry."""
        from datetime import datetime
        date = date or datetime.utcnow().strftime("%Y-%m-%d")

        self.daily_costs[date] = self.daily_costs.get(date, 0) + cost
        self.model_costs[model] = self.model_costs.get(model, 0) + cost
        self.endpoint_costs[endpoint] = self.endpoint_costs.get(endpoint, 0) + cost

    def get_daily_summary(self, days: int = 30) -> dict:
        """Get cost summary for recent days."""
        from datetime import datetime, timedelta
        cutoff = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

        recent_costs = {
            date: cost for date, cost in self.daily_costs.items()
            if date >= cutoff
        }

        total = sum(recent_costs.values())
        avg_daily = total / max(len(recent_costs), 1)
        daily_values = sorted(recent_costs.values())
        median_daily = daily_values[len(daily_values) // 2] if daily_values else 0

        return {
            "total": total,
            "avg_daily": avg_daily,
            "median_daily": median_daily,
            "max_daily": max(recent_costs.values()) if recent_costs else 0,
            "min_daily": min(recent_costs.values()) if recent_costs else 0,
            "projected_monthly": avg_daily * 30,
        }

    def get_model_breakdown(self) -> list[dict]:
        """Get cost breakdown by model."""
        total = sum(self.model_costs.values())
        return [
            {
                "model": model,
                "cost": cost,
                "percentage": cost / total * 100 if total > 0 else 0,
            }
            for model, cost in sorted(self.model_costs.items(), key=lambda x: x[1], reverse=True)
        ]

    def get_cost_anomalies(self, threshold: float = 2.0) -> list[dict]:
        """Detect unusual cost spikes."""
        if len(self.daily_costs) < 7:
            return []

        values = list(self.daily_costs.values())
        mean_cost = sum(values) / len(values)
        std_cost = (sum((v - mean_cost) ** 2 for v in values) / len(values)) ** 0.5

        anomalies = []
        for date, cost in self.daily_costs.items():
            if std_cost > 0 and abs(cost - mean_cost) > threshold * std_cost:
                anomalies.append({
                    "date": date,
                    "cost": cost,
                    "expected": mean_cost,
                    "deviation": (cost - mean_cost) / std_cost,
                })

        return sorted(anomalies, key=lambda x: abs(x["deviation"]), reverse=True)
```

## User Satisfaction Metrics

### Tracking User Feedback

| Metric | Definition | Target | Collection Method |
|--------|-----------|--------|-------------------|
| **CSAT** | Customer Satisfaction Score (1-5) | >4.0 | Thumbs up/down, star rating |
| **NPS** | Net Promoter Score (-100 to +100) | >30 | Periodic survey |
| **Task Success Rate** | % of tasks users complete successfully | >80% | Behavioral tracking |
| **Time to Completion** | How long users take to achieve their goal | Decreasing | Session analytics |
| **Re-query Rate** | % of queries where users immediately re-query | &lt;10% | Session logs |
| **Session Length** | Average queries per session | Context-dependent | Session tracking |
| **Retention Rate** | % of users returning in subsequent weeks | >60% weekly | Cohort analysis |

### Feedback Collection

```python
class FeedbackCollector:
    """Collect and analyze user feedback."""

    def __init__(self):
        self.feedback: list[dict] = []

    def record_feedback(
        self,
        user_id: str,
        query: str,
        response: str,
        rating: int,  # 1-5
        feedback_text: str = None,
        category: str = None,
    ):
        """Record user feedback."""
        self.feedback.append({
            "user_id": user_id,
            "query": query,
            "response": response,
            "rating": rating,
            "feedback_text": feedback_text,
            "category": category,
            "timestamp": datetime.utcnow().isoformat(),
        })

    def get_csat(self, window_days: int = 7) -> dict:
        """Calculate CSAT score."""
        cutoff = (datetime.utcnow() - timedelta(days=window_days)).isoformat()
        recent = [f for f in self.feedback if f["timestamp"] >= cutoff]

        if not recent:
            return {"csat": None, "count": 0}

        ratings = [f["rating"] for f in recent]
        return {
            "csat": sum(ratings) / len(ratings),
            "count": len(ratings),
            "distribution": {
                str(i): ratings.count(i) for i in range(1, 6)
            },
        }

    def get_low_rated_queries(self, threshold: int = 2, top_k: int = 10) -> list[dict]:
        """Find the most poorly rated queries."""
        low_rated = [f for f in self.feedback if f["rating"] <= threshold]

        # Group by query pattern
        from collections import Counter
        query_counts = Counter(f["query"] for f in low_rated)

        return [
            {"query": query, "low_rating_count": count}
            for query, count in query_counts.most_common(top_k)
        ]

    def get_trending_issues(self) -> list[dict]:
        """Identify emerging issues from feedback text."""
        recent = [
            f for f in self.feedback
            if f["rating"] <= 2 and f.get("feedback_text")
        ]

        # Simple keyword-based categorization
        categories = {
            "incorrect_answer": ["wrong", "incorrect", "not right", "inaccurate"],
            "too_verbose": ["too long", "verbose", "rambling", "too much"],
            "too_brief": ["too short", "not enough", "insufficient"],
            "hallucination": ["made up", "fabricated", "doesn't exist", "not true"],
            "unsafe": ["inappropriate", "offensive", "harmful"],
        }

        issue_counts = Counter()
        for feedback in recent:
            text = feedback["feedback_text"].lower()
            for category, keywords in categories.items():
                if any(kw in text for kw in keywords):
                    issue_counts[category] += 1

        return [
            {"category": cat, "count": count}
            for cat, count in issue_counts.most_common()
        ]
```

## Dashboard Design

### Executive Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM Platform Overview                     │
│                    Last 7 days | Updated 5m ago              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Quality          Operations         Cost          Users    │
│  ───────          ──────────         ────          ─────    │
│  Accuracy: 94%    p50: 1.2s         $4,230        CSAT: 4.3│
│  Safety: 99.8%    p95: 3.8s         $0.004/req    NPS: 42  │
│  Hallucination:   Throughput:       $126K/mo      Active:  │
│    2.3%             847 rps          (proj)        12,450   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          Daily Cost Trend (last 30 days)             │    │
│  │  $600 ┤    ╭──╮                                    │    │
│  │  $500 ┤   ╱    ╲    ╭──╮                           │    │
│  │  $400 ┤  ╱      ╲  ╱    ╲   ╭──╮                   │    │
│  │  $300 ┤ ╱        ╲╱      ╲ ╱    ╲                  │    │
│  │  $200 ┤╱                   ╲╱      ╲                │    │
│  │       └─────────────────────────────────            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Top Issues        │  │ Model Breakdown  │                 │
│  │ 1. Hallucination  │  │ GPT-4o:    45%  │                 │
│  │    (23 reports)   │  │ Claude:    30%  │                 │
│  │ 2. Latency spike  │  │ Haiku:     15%  │                 │
│  │    (12 reports)   │  │ Self-host: 10%  │                 │
│  │ 3. Over-refusal   │  │              │                 │
│  │    (8 reports)    │  │              │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### Alert Configuration

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Quality drop | Accuracy drops below 85% for 1h | Critical | Page on-call, rollback |
| Latency spike | p95 > 2x baseline for 15m | High | Scale up, investigate |
| Cost anomaly | Daily cost > 2x moving average | Medium | Investigate, alert team |
| Error rate | Error rate > 1% for 5m | Critical | Page on-call, failover |
| Safety violation | Any toxic response detected | Critical | Immediate review, block model |
| User satisfaction | CSAT drops below 3.5 for 1 day | High | Review feedback, investigate |
| Capacity warning | Utilization > 85% for 30m | Medium | Scale up proactively |

## Metric Interdependencies

Understanding how metrics relate helps avoid optimization traps:

| Trade-off | Description | Resolution |
|-----------|-------------|------------|
| **Quality vs. Cost** | Better models cost more | Route by task complexity |
| **Latency vs. Quality** | Stronger models are slower | Use smaller models for simple tasks |
| **Safety vs. Helpfulness** | Over-refusal reduces helpfulness | Tune refusal thresholds carefully |
| **Conciseness vs. Completeness** | Shorter may miss details | Adapt length to query complexity |
| **Throughput vs. Latency** | More concurrent requests = slower | Scale horizontally |

## Implementation Checklist

### Phase 1: Foundation (Week 1-2)

- [ ] Instrument all LLM calls with logging
- [ ] Track basic cost metrics (tokens, $/request)
- [ ] Monitor latency (p50, p95, p99)
- [ ] Set up error rate monitoring
- [ ] Collect thumbs up/down feedback

### Phase 2: Quality (Week 3-4)

- [ ] Implement LLM-as-a-judge evaluation
- [ ] Track hallucination rate
- [ ] Measure task success rate
- [ ] Build safety metrics pipeline
- [ ] Create quality regression tests

### Phase 3: User Insights (Week 5-6)

- [ ] Calculate CSAT and NPS
- [ ] Track retention and engagement
- [ ] Analyze feedback patterns
- [ ] Build executive dashboard
- [ ] Set up alerting thresholds

### Phase 4: Optimization (Ongoing)

- [ ] Cost optimization reviews (weekly)
- [ ] Quality trend analysis (weekly)
- [ ] Capacity planning (monthly)
- [ ] Model comparison experiments
- [ ] A/B test framework for changes

## Cross-References

- For a broader evaluation framework, see [Evaluation Metrics & Benchmarks](/docs/evaluation-metrics-benchmarks)
- For monitoring and observability infrastructure, see [LLM Observability & Monitoring](/docs/llm-observability-monitoring)
- For cost optimization across providers, see [Model Hub & Federation](/docs/model-hub-federation)
- For governance and compliance tracking, see [Generative AI Governance](/docs/generative-ai-governance)
