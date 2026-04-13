---
title: "Model Versioning Management"
description: "Managing model versions in production — rollback strategies, A/B testing, canary deployments, version compatibility, and lifecycle management"
date: "2026-04-23"
updatedAt: "2026-04-23"
category: "Deployment & Infrastructure"
tags: ["model-versioning", "deployment", "rollback", "ab-testing", "canary", "ml-ops", "production"]
author: "IntuiVortex Team"
---

# Model Versioning Management

Managing model versions in production is fundamentally different from traditional software versioning. Model updates can introduce subtle quality regressions, safety issues, or behavioral changes that are not caught by unit tests. This guide covers versioning strategies, deployment patterns, rollback procedures, and lifecycle management for LLMs in production environments.

## Why Model Versioning Is Hard

Unlike code, models have unique challenges:

| Challenge | Traditional Software | LLMs |
|-----------|---------------------|------|
| **Determinism** | Same input always produces same output | Stochastic outputs even at temperature=0 |
| **Testing** | Unit tests cover expected behaviors | Infinite input space; quality is subjective |
| **Regression detection** | Test failures are binary | Quality can degrade subtly without any test failing |
| **Rollback** | Redeploy previous binary | May lose learned patterns; adapter weights matter |
| **Compatibility** | API contracts define compatibility | Behavioral contracts are harder to define |
| **Dependencies** | Library versions | Provider API changes, embedding model versions, prompt templates |

## Versioning Schema

### Semantic Versioning for Models

Adopt a modified semver scheme: `MAJOR.MINOR.PATCH`

```
v2.3.1
│ │ │
│ │ └── PATCH: Prompt tweak, temperature change, same base model
│ └──── MINOR: New model version (e.g., GPT-4 -> GPT-4.1), fine-tuned adapter update
└────── MAJOR: Architecture change, fundamentally different model family
```

### Extended Metadata

```yaml
# model-registry.yaml
models:
  - version: "v2.3.1"
    name: "customer-support-agent"
    base_model: "gpt-4.1-mini"
    adapter: "support-finetune-v7-lora-64"
    prompt_template: "support-v3.2"
    system_prompt_hash: "a1b2c3d4"
    temperature: 0.3
    max_tokens: 1024
    top_p: 0.95
    created: "2026-04-20"
    created_by: "ml-team"
    status: "production"
    performance:
      accuracy: 0.94
      latency_p50_ms: 420
      latency_p95_ms: 890
      cost_per_request: 0.0012
      user_satisfaction: 4.3
    trained_on:
      dataset: "support-conversations-v15"
      dataset_hash: "e5f6g7h8"
      num_examples: 12500
      training_date: "2026-04-18"
    compatibility:
      min_api_version: "v3"
      required_embeddings: "text-embedding-3-small"
      breaking_changes: []
```

### Model Registry Implementation

```python
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from typing import Optional

class ModelStatus(Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    CANDIDATE = "candidate"    # In A/B test or canary
    PRODUCTION = "production"
    DEPRECATED = "deprecated"
    ARCHIVED = "archived"

@dataclass
class ModelVersion:
    version: str
    name: str
    base_model: str
    prompt_template_version: str
    status: ModelStatus
    created_at: str
    metrics: dict
    config: dict
    parent_version: Optional[str] = None
    notes: str = ""

class ModelRegistry:
    """Simple model registry with version tracking."""

    def __init__(self, storage_path: str = "model_registry.json"):
        self.storage_path = storage_path
        self.versions: dict[str, ModelVersion] = {}
        self._load()

    def register(self, model: ModelVersion):
        """Register a new model version."""
        if model.version in self.versions:
            raise ValueError(f"Version {model.version} already exists")
        self.versions[model.version] = model
        self._save()

    def promote(self, version: str, new_status: ModelStatus):
        """Promote a model to a new lifecycle stage."""
        if version not in self.versions:
            raise KeyError(f"Version {version} not found")
        self.versions[version].status = new_status
        self._save()

    def get_production(self) -> list[ModelVersion]:
        """Get all production models."""
        return [v for v in self.versions.values() if v.status == ModelStatus.PRODUCTION]

    def get_latest(self, name: str) -> Optional[ModelVersion]:
        """Get the latest version of a named model."""
        candidates = [v for v in self.versions.values() if v.name == name]
        if not candidates:
            return None
        return sorted(candidates, key=lambda v: v.version)[-1]

    def get_version_lineage(self, version: str) -> list[str]:
        """Get the full lineage of a model version."""
        lineage = []
        current = version
        while current:
            lineage.append(current)
            current = self.versions[current].parent_version if current in self.versions else None
        return list(reversed(lineage))

    def _save(self):
        with open(self.storage_path, "w") as f:
            json.dump({k: asdict(v) for k, v in self.versions.items()}, f, indent=2)

    def _load(self):
        import os
        if os.path.exists(self.storage_path):
            with open(self.storage_path) as f:
                data = json.load(f)
                self.versions = {k: ModelVersion(**v) for k, v in data.items()}
```

## Deployment Patterns

### Blue-Green Deployment

The safest model update pattern:

```yaml
# kubernetes blue-green deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-service-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: llm-service
      track: blue
  template:
    metadata:
      labels:
        app: llm-service
        track: blue
    spec:
      containers:
        - name: llm-service
          image: llm-service:v2.3.1
          env:
            - name: MODEL_VERSION
              value: "v2.3.1"
            - name: PROMPT_TEMPLATE
              value: "support-v3.2"
---
apiVersion: v1
kind: Service
metadata:
  name: llm-service-active
spec:
  selector:
    app: llm-service
    track: blue  # Switch to 'green' for cutover
  ports:
    - port: 80
      targetPort: 8080
```

**Cutover process:**
1. Deploy new model as "green" alongside "blue"
2. Run smoke tests against green
3. Switch service selector from blue to green
4. Monitor for 30 minutes
5. If issues, switch back (instant rollback)
6. After 24 hours, decommission blue

### Canary Deployment

Gradual rollout to limit blast radius:

```python
import random

class CanaryRouter:
    """Route traffic between model versions based on canary percentage."""

    def __init__(self):
        self.stable_version = "v2.3.1"
        self.canary_version = "v2.4.0"
        self.canary_percentage = 5  # Start with 5%

    def select_version(self, request_context: dict) -> str:
        """Select which model version to use for a request."""
        # Use request hash for consistent routing (same user always gets same version)
        request_hash = hash(frozenset(request_context.items()))
        bucket = abs(request_hash) % 100

        if bucket < self.canary_percentage:
            return self.canary_version
        return self.stable_version

    def increment_canary(self, step: int = 10):
        """Gradually increase canary traffic."""
        self.canary_percentage = min(self.canary_percentage + step, 100)
        print(f"Canary increased to {self.canary_percentage}%")

    def rollback(self):
        """Instant rollback to stable version."""
        self.canary_percentage = 0
        print(f"Rolled back to {self.stable_version}")

    def promote(self):
        """Promote canary to stable."""
        self.stable_version = self.canary_version
        self.canary_percentage = 0
        print(f"Promoted {self.stable_version} to stable")

# Usage in request handler
router = CanaryRouter()

def handle_request(user_input: str, user_id: str) -> str:
    version = router.select_version({"user_id": user_id})
    response = call_model(version, user_input)
    return response
```

### A/B Testing

```python
from collections import defaultdict
from datetime import datetime, timedelta
import statistics

class ABTest:
    """Run an A/B test between two model versions."""

    def __init__(self, name: str, variant_a: str, variant_b: str, traffic_split: float = 0.5):
        self.name = name
        self.variant_a = variant_a
        self.variant_b = variant_b
        self.traffic_split = traffic_split
        self.metrics: dict[str, list] = defaultdict(list)
        self.start_time = datetime.now()
        self.total_requests = 0

    def assign_variant(self, user_id: str) -> str:
        """Consistent assignment based on user ID."""
        if hash(user_id) % 100 < self.traffic_split * 100:
            return self.variant_a
        return self.variant_b

    def record_metrics(self, user_id: str, variant: str, latency_ms: float,
                       user_rating: float = None, task_success: bool = None,
                       tokens_used: int = None):
        """Record metrics for a request."""
        self.metrics[f"{variant}_latency"].append(latency_ms)
        self.metrics["total_requests"].append(1)
        self.total_requests += 1

        if user_rating is not None:
            self.metrics[f"{variant}_rating"].append(user_rating)
        if task_success is not None:
            self.metrics[f"{variant}_success"].append(1 if task_success else 0)
        if tokens_used is not None:
            self.metrics[f"{variant}_tokens"].append(tokens_used)

    def get_results(self) -> dict:
        """Compute A/B test results."""
        results = {
            "test_name": self.name,
            "duration": str(datetime.now() - self.start_time),
            "total_requests": self.total_requests,
            "variant_a": self.variant_a,
            "variant_b": self.variant_b,
        }

        for variant in [self.variant_a, self.variant_b]:
            latency_key = f"{variant}_latency"
            if self.metrics[latency_key]:
                results[f"{variant}_latency_p50"] = statistics.median(self.metrics[latency_key])
                results[f"{variant}_latency_p95"] = sorted(self.metrics[latency_key])[int(len(self.metrics[latency_key]) * 0.95)]

            rating_key = f"{variant}_rating"
            if self.metrics[rating_key]:
                results[f"{variant}_avg_rating"] = statistics.mean(self.metrics[rating_key])

            success_key = f"{variant}_success"
            if self.metrics[success_key]:
                results[f"{variant}_success_rate"] = sum(self.metrics[success_key]) / len(self.metrics[success_key])

            token_key = f"{variant}_tokens"
            if self.metrics[token_key]:
                results[f"{variant}_avg_tokens"] = statistics.mean(self.metrics[token_key])

        # Statistical significance (simplified t-test approximation)
        a_latencies = self.metrics.get(f"{self.variant_a}_latency", [])
        b_latencies = self.metrics.get(f"{self.variant_b}_latency", [])
        if len(a_latencies) > 30 and len(b_latencies) > 30:
            a_mean = statistics.mean(a_latencies)
            b_mean = statistics.mean(b_latencies)
            results["latency_diff_pct"] = ((b_mean - a_mean) / a_mean) * 100

        return results
```

## Rollback Strategies

### Automated Rollback Triggers

```python
from dataclasses import dataclass
from typing import Callable

@dataclass
class RollbackTrigger:
    name: str
    condition: Callable[[dict], bool]
    severity: str  # "warning", "critical"
    action: str    # "alert", "rollback"

class RollbackMonitor:
    """Monitor model performance and trigger rollbacks."""

    def __init__(self, current_version: str, previous_version: str):
        self.current_version = current_version
        self.previous_version = previous_version
        self.triggered: list[RollbackTrigger] = []

        self.triggers = [
            RollbackTrigger(
                name="error_rate_spike",
                condition=lambda m: m.get("error_rate", 0) > 0.05,
                severity="critical",
                action="rollback",
            ),
            RollbackTrigger(
                name="latency_regression",
                condition=lambda m: m.get("p95_latency_ms", 0) > m.get("baseline_p95_ms", 0) * 1.5,
                severity="critical",
                action="rollback",
            ),
            RollbackTrigger(
                name="quality_drop",
                condition=lambda m: m.get("avg_rating", 5.0) < 3.5,
                severity="critical",
                action="rollback",
            ),
            RollbackTrigger(
                name="cost_spike",
                condition=lambda m: m.get("cost_per_request", 0) > m.get("baseline_cost", 0) * 2.0,
                severity="warning",
                action="alert",
            ),
            RollbackTrigger(
                name="hallucination_rate",
                condition=lambda m: m.get("hallucination_rate", 0) > 0.02,
                severity="critical",
                action="rollback",
            ),
        ]

    def evaluate(self, metrics: dict) -> list[RollbackTrigger]:
        """Evaluate metrics against all triggers."""
        triggered = []
        for trigger in self.triggers:
            if trigger.condition(metrics):
                triggered.append(trigger)
                self.triggered.append(trigger)

        return triggered

    def should_rollback(self) -> bool:
        """Check if any critical trigger has fired."""
        return any(t.action == "rollback" for t in self.triggered)

    def execute_rollback(self) -> dict:
        """Execute the rollback procedure."""
        return {
            "action": "rollback",
            "from_version": self.current_version,
            "to_version": self.previous_version,
            "reason": [t.name for t in self.triggered if t.action == "rollback"],
            "timestamp": datetime.now().isoformat(),
        }
```

### Rollback Decision Matrix

| Symptom | Severity | Action | Recovery Time |
|---------|----------|--------|---------------|
| Error rate > 5% | Critical | Immediate rollback | < 1 minute |
| P95 latency > 1.5x baseline | Critical | Immediate rollback | < 1 minute |
| User rating drops below 3.5 | Critical | Rollback within 15 min | < 5 minutes |
| Hallucination rate > 2% | Critical | Rollback within 30 min | < 5 minutes |
| Safety violations detected | Critical | Immediate rollback + audit | < 1 minute |
| Cost per request > 2x baseline | Warning | Alert team, investigate | N/A |
| Token usage > 1.5x baseline | Warning | Investigate prompt changes | N/A |
| Minor quality regression | Warning | Schedule fix in next release | Next release cycle |

## Compatibility Management

### Prompt Template Versioning

```yaml
prompt_templates:
  support-v3.0:
    compatible_models: ["gpt-4", "gpt-4-turbo", "claude-3-sonnet"]
    incompatible_models: ["gpt-3.5-turbo"]  # Context too small
    changes_from_previous: "Added tool-use instructions"

  support-v3.1:
    compatible_models: ["gpt-4", "gpt-4-turbo", "gpt-4.1", "claude-3-sonnet", "claude-sonnet-4"]
    incompatible_models: []
    changes_from_previous: "Updated tone guidelines; added escalation criteria"

  support-v3.2:
    compatible_models: ["gpt-4.1", "gpt-4.1-mini", "claude-sonnet-4"]
    incompatible_models: ["gpt-4"]  # Deprecated
    changes_from_previous: "Added structured output requirements; JSON schema enforcement"
```

### Breaking Change Detection

```python
class CompatibilityChecker:
    """Check model-prompt-embedding compatibility."""

    def __init__(self):
        self.compatibility_matrix = {}

    def register_compatibility(self, model: str, prompt_version: str,
                               embedding_model: str, compatible: bool):
        key = (model, prompt_version, embedding_model)
        self.compatibility_matrix[key] = compatible

    def check(self, model: str, prompt_version: str, embedding_model: str) -> dict:
        """Check if a combination is compatible."""
        key = (model, prompt_version, embedding_model)
        is_compatible = self.compatibility_matrix.get(key, None)

        # Find nearest compatible alternatives if incompatible
        alternatives = []
        if is_compatible is False:
            for (m, p, e), compat in self.compatibility_matrix.items():
                if compat and (m == model or p == prompt_version):
                    alternatives.append(f"{m} + {p} + {e}")

        return {
            "compatible": is_compatible,
            "combination": f"{model} + {prompt_version} + {embedding_model}",
            "alternatives": alternatives[:5] if alternatives else [],
        }
```

## Lifecycle Management

### Model Deprecation Timeline

```
Week 0:  New version deployed as canary (5%)
Week 1:  Canary expanded to 50%, A/B test results reviewed
Week 2:  New version promoted to stable (100%)
Week 3:  Previous version marked as DEPRECATED
         - Still serving requests but no new traffic routed
         - Monitoring for any edge cases that need old version
Week 6:  Previous version marked as ARCHIVED
         - Model artifacts stored in cold storage
         - Cannot be quickly restored (requires redeployment)
Week 12: Previous version removed from cold storage
         (or retained indefinitely for compliance requirements)
```

### Version Cleanup Policy

```yaml
cleanup_policy:
  development:
    max_age_days: 30
    max_versions: 10
    action: "Delete oldest beyond limit"
  staging:
    max_age_days: 90
    max_versions: 5
    action: "Archive to cold storage"
  deprecated:
    max_age_days: 42
    action: "Archive, then remove from active registry"
  archived:
    max_age_days: 365
    action: "Remove from cold storage (unless compliance requires retention)"
  production:
    max_concurrent: 2  # Current + previous for fast rollback
    action: "Demote oldest to deprecated"
```

## Cross-References

- [Deployment Strategies for Production](/docs/deployment-strategies-production) — General deployment patterns including blue-green and canary
- [LLM Observability & Monitoring](/docs/llm-observability-monitoring) — Monitoring model quality metrics in production
- [Model Comparison Guide](/docs/model-comparison-guide) — Evaluating new model versions before deployment
- [LLM Security Best Practices](/docs/llm-security-best-practices) — Security considerations during model updates

## Checklist

- [ ] Define a versioning schema (semver-based) with metadata tracking
- [ ] Implement a model registry to track versions, configs, and metrics
- [ ] Set up blue-green deployment capability for instant rollback
- [ ] Configure canary deployments starting at 5% traffic
- [ ] Define A/B test metrics and success criteria before deploying new versions
- [ ] Implement automated rollback triggers for critical regressions
- [ ] Maintain compatibility matrix for model-prompt-embedding combinations
- [ ] Document a deprecation timeline and communicate to all stakeholders
- [ ] Keep at least one previous production version available for fast rollback
- [ ] Archive model artifacts before deletion (minimum 90-day retention)
