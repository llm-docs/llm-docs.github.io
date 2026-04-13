---
title: "LLM Observability and Monitoring"
description: "Tracking LLM behavior in production — logging, tracing, evaluation pipelines, drift detection, and alerting for AI systems"
date: "2026-04-12"
category: "Deployment & Infrastructure"
tags: ["observability", "monitoring", "logging", "tracing", "evaluation", "drift"]
author: "LLM Hub Team"
---

# LLM Observability and Monitoring

Traditional monitoring tracks latency, errors, and throughput. LLM monitoring must additionally track output quality, safety, coherence, and drift — metrics that are inherently subjective and require specialized tooling.

## What to Monitor

### System Metrics (Standard)

| Metric | Why It Matters | Alert Threshold |
|--------|---------------|-----------------|
| Latency (P50, P95, P99) | User experience | P99 > 10s |
| Error rate | System health | > 1% |
| Token throughput | Capacity planning | Degradation |
| GPU memory usage | Resource health | > 90% |
| Queue depth | Demand vs supply | > 100 pending |

### LLM-Specific Metrics

| Metric | Why It Matters | How to Measure |
|--------|---------------|----------------|
| **Output quality** | Are responses useful? | Human review, LLM-as-judge |
| **Hallucination rate** | Are facts correct? | Fact-checking pipeline |
| **Toxicity rate** | Is output safe? | Toxicity classifier |
| **Response length drift** | Are responses degrading? | Statistical monitoring |
| **Prompt injection attempts** | Security threats | Pattern detection |
| **Token cost per request** | Budget tracking | Usage tracking |

## Tracing and Logging

### Structured Request Logging

```python
import json
import uuid
from datetime import datetime

def log_llm_request(
    prompt: str,
    response: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    latency_ms: float,
    user_id: str,
    metadata: dict = None,
):
    """Log a single LLM interaction."""
    log_entry = {
        "trace_id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "model": model,
        "user_id": user_id,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "latency_ms": latency_ms,
        "prompt_preview": prompt[:200],  # Don't log full prompts (PII risk)
        "response_preview": response[:200],
        "metadata": metadata or {},
    }
    
    # Write to structured log / analytics pipeline
    with open("llm-requests.jsonl", "a") as f:
        f.write(json.dumps(log_entry) + "\n")
```

### Distributed Tracing with OpenTelemetry

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider

trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer("llm-service")

@tracer.start_as_current_span("llm_completion")
def llm_completion(user_query: str) -> str:
    span = trace.get_current_span()
    span.set_attribute("query_length", len(user_query))
    span.set_attribute("model", "gpt-4o")
    
    start = time.time()
    response = call_model(user_query)
    elapsed = (time.time() - start) * 1000
    
    span.set_attribute("response_length", len(response))
    span.set_attribute("latency_ms", elapsed)
    span.set_attribute("input_tokens", count_tokens(user_query))
    span.set_attribute("output_tokens", count_tokens(response))
    
    return response
```

## Quality Evaluation Pipeline

### Automated Quality Checks

```python
from textstat import flesch_reading_ease
import openai

def evaluate_response_quality(prompt: str, response: str) -> dict:
    """Automated quality scoring."""
    scores = {}
    
    # Readability
    scores["readability"] = flesch_reading_ease(response)
    
    # Coherence (LLM-as-judge)
    judgment = openai.ChatCompletion.create(
        model="gpt-4o-mini",  # Cheap model for judging
        messages=[{
            "role": "system",
            "content": "Rate the response quality from 1-5 based on: relevance, accuracy, helpfulness."
        }, {
            "role": "user",
            "content": f"Prompt: {prompt}\nResponse: {response}"
        }]
    )
    scores["llm_judge_score"] = int(judgment.choices[0].message.content.strip())
    
    # Toxicity check
    toxicity = toxicity_classifier.predict(response)
    scores["toxicity"] = toxicity
    
    # Length appropriateness
    prompt_tokens = count_tokens(prompt)
    response_tokens = count_tokens(response)
    scores["length_ratio"] = response_tokens / max(prompt_tokens, 1)
    
    return scores
```

### Human-in-the-Loop Review

```python
# Sample low-confidence or flagged responses for human review
def flag_for_review(log_entry: dict, quality_scores: dict) -> bool:
    """Determine if a response needs human review."""
    if quality_scores.get("toxicity", 0) > 0.5:
        return True
    if quality_scores.get("llm_judge_score", 5) <= 2:
        return True
    if log_entry["output_tokens"] > 2000:  # Unusually long
        return True
    if "I don't know" in log_entry["response_preview"].lower():
        return True
    return False

# Route flagged responses to review queue
if flag_for_review(log_entry, scores):
    review_queue.add({
        "trace_id": log_entry["trace_id"],
        "prompt": log_entry["prompt_preview"],
        "response": log_entry["response_preview"],
        "scores": scores,
        "flagged_at": datetime.utcnow().isoformat(),
    })
```

## Drift Detection

### Response Distribution Drift

```python
import numpy as np
from scipy import stats

def detect_drift(
    baseline_lengths: list[int],
    current_lengths: list[int],
    window_size: int = 1000,
) -> dict:
    """Detect if response lengths have drifted."""
    baseline = np.random.choice(baseline_lengths, window_size)
    current = np.random.choice(current_lengths, window_size)
    
    # Kolmogorov-Smirnov test
    ks_statistic, p_value = stats.ks_2samp(baseline, current)
    
    return {
        "drift_detected": p_value < 0.01,
        "p_value": p_value,
        "ks_statistic": ks_statistic,
        "baseline_mean": np.mean(baseline),
        "current_mean": np.mean(current),
    }
```

### Topic/Domain Drift

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def detect_topic_drift(
    baseline_prompts: list[str],
    current_prompts: list[str],
) -> float:
    """Detect if user query topics have shifted."""
    vectorizer = TfidfVectorizer(max_features=1000)
    all_texts = baseline_prompts + current_prompts
    
    tfidf_matrix = vectorizer.fit_transform(all_texts)
    baseline_tfidf = tfidf_matrix[:len(baseline_prompts)]
    current_tfidf = tfidf_matrix[len(baseline_prompts):]
    
    # Compare mean topic distributions
    baseline_mean = baseline_tfidf.mean(axis=0)
    current_mean = current_tfidf.mean(axis=0)
    
    similarity = cosine_similarity(baseline_mean, current_mean)[0][0]
    return float(similarity)  # 1.0 = identical, < 0.8 = significant drift
```

## Observability Platforms

| Platform | Features | Best For |
|----------|---------|----------|
| **LangSmith** | Tracing, evaluation, datasets | LangChain users |
| **Arize Phoenix** | Embedding visualization, drift | Open-source, self-hosted |
| **Helicone** | Proxy, caching, analytics | Cost tracking + observability |
| **Galileo** | Quality monitoring, alerting | Enterprise |
| **WhyLabs** | Data + LLM monitoring | Statistical rigor |
| **Custom (OpenTelemetry + Grafana)** | Full control | Engineering teams |

## Alerting Rules

```yaml
# Example: Prometheus alerting rules for LLM service
groups:
  - name: llm-alerts
    rules:
      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(llm_request_latency_seconds[5m])) > 10
        for: 5m
        annotations:
          summary: "P99 latency above 10s"
      
      - alert: HighErrorRate
        expr: rate(llm_requests_total{status="error"}[5m]) / rate(llm_requests_total[5m]) > 0.05
        for: 2m
        annotations:
          summary: "Error rate above 5%"
      
      - alert: ToxicitySpike
        expr: rate(toxic_responses_total[5m]) > 0.02
        for: 5m
        annotations:
          summary: "Toxicity rate above 2%"
      
      - alert: BudgetThreshold
        expr: monthly_llm_spend > budget * 0.8
        annotations:
          summary: "80% of monthly budget consumed"
```

## Key Takeaways

- LLM observability requires both system metrics AND quality metrics
- Structured logging with trace IDs enables debugging individual requests
- Automated quality checks (LLM-as-judge, toxicity) catch issues before humans do
- Drift detection identifies when user behavior or model output changes
- Sample flagged responses for human review to maintain quality over time

## Related Documentation

- **[Cost Management](/docs/cost-management-optimization)** — Tracking spend alongside quality
- **[Evaluation Metrics](/docs/evaluation-metrics-benchmarks)** — Defining quality benchmarks
- **[Safety and Red-teaming](/docs/ai-safety-red-teaming)** — Detecting adversarial inputs
