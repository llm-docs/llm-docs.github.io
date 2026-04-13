---
title: "Model Hub & Federation"
description: "Managing collections of models across providers — unified APIs, model routing, failover systems, and cost-optimized multi-provider setups"
date: "2026-04-21"
category: "Deployment & Infrastructure"
tags: ["model-hub", "multi-provider", "routing", "failover", "unified-api", "cost-optimization"]
author: "IntuiVortex Team"
---

# Model Hub & Federation

As organizations adopt multiple LLM providers, managing them becomes a distributed systems challenge. Model federation provides a unified interface across providers, intelligent routing to select the best model per request, automatic failover when providers go down, and cost optimization across your model portfolio.

## The Multi-Provider Reality

Most production systems now use 3+ LLM providers:

| Reason | Example |
|--------|---------|
| **Cost optimization** | Use GPT-4o for hard tasks, Claude Haiku for simple ones |
| **Risk mitigation** | Avoid single-provider dependency and outages |
| **Best-of-breed** | Use the strongest model for each specific task |
| **Compliance** | Some data must stay on specific providers or on-prem |
| **Latency** | Route to the geographically closest provider |

## Unified API Layer

### Provider Abstraction

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class LLMResponse:
    text: str
    model: str
    provider: str
    tokens_input: int
    tokens_output: int
    latency_ms: float
    cost_usd: float


class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        pass

    @abstractmethod
    async def embed(self, text: str, **kwargs) -> list[float]:
        pass


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, base_url: str = None):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    async def generate(self, prompt: str, model: str = "gpt-4o", **kwargs) -> LLMResponse:
        import time
        start = time.time()
        response = await self.client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            **kwargs,
        )
        elapsed = (time.time() - start) * 1000
        return LLMResponse(
            text=response.choices[0].message.content,
            model=model,
            provider="openai",
            tokens_input=response.usage.prompt_tokens,
            tokens_output=response.usage.completion_tokens,
            latency_ms=elapsed,
            cost_usd=self._calculate_cost(model, response.usage),
        )

    def _calculate_cost(self, model: str, usage) -> float:
        pricing = {
            "gpt-4o": (2.50, 10.00),       # per 1M input/output tokens
            "gpt-4o-mini": (0.15, 0.60),
            "o3": (10.00, 40.00),
        }
        input_price, output_price = pricing.get(model, (0, 0))
        return (usage.prompt_tokens / 1_000_000 * input_price +
                usage.completion_tokens / 1_000_000 * output_price)


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str):
        from anthropic import AsyncAnthropic
        self.client = AsyncAnthropic(api_key=api_key)

    async def generate(self, prompt: str, model: str = "claude-sonnet-4-20250514", **kwargs) -> LLMResponse:
        import time
        start = time.time()
        response = await self.client.messages.create(
            model=model,
            max_tokens=kwargs.pop("max_tokens", 4096),
            messages=[{"role": "user", "content": prompt}],
            **kwargs,
        )
        elapsed = (time.time() - start) * 1000
        return LLMResponse(
            text=response.content[0].text,
            model=model,
            provider="anthropic",
            tokens_input=response.usage.input_tokens,
            tokens_output=response.usage.output_tokens,
            latency_ms=elapsed,
            cost_usd=self._calculate_cost(model, response.usage),
        )

    def _calculate_cost(self, model: str, usage) -> float:
        pricing = {
            "claude-sonnet-4-20250514": (3.00, 15.00),
            "claude-opus-4-20250514": (15.00, 75.00),
            "claude-haiku-4-20250514": (0.80, 4.00),
        }
        input_price, output_price = pricing.get(model, (0, 0))
        return (usage.input_tokens / 1_000_000 * input_price +
                usage.output_tokens / 1_000_000 * output_price)
```

### Model Registry

```python
from typing import Optional

class ModelRegistry:
    """Central registry of all available models across providers."""

    def __init__(self):
        self.models: dict[str, dict] = {}
        self.providers: dict[str, LLMProvider] = {}

    def register_provider(self, name: str, provider: LLMProvider):
        self.providers[name] = provider

    def register_model(self, name: str, provider: str, capabilities: dict):
        """Register a model with its capabilities."""
        self.models[name] = {
            "provider": provider,
            "capabilities": capabilities,
            "status": "available",
            "requests_today": 0,
            "total_cost_usd": 0.0,
            "avg_latency_ms": 0.0,
            "error_rate": 0.0,
        }

    def get_models_by_capability(self, capability: str) -> list[str]:
        """Find all models that support a given capability."""
        return [
            name for name, info in self.models.items()
            if capability in info["capabilities"].get("supports", [])
        ]

    def get_model_info(self, name: str) -> Optional[dict]:
        return self.models.get(name)

    def update_model_stats(self, name: str, response: LLMResponse):
        """Update usage statistics after each call."""
        model = self.models.get(name)
        if not model:
            return

        model["requests_today"] += 1
        model["total_cost_usd"] += response.cost_usd

        # Running average for latency
        n = model["requests_today"]
        model["avg_latency_ms"] = (
            model["avg_latency_ms"] * (n - 1) / n + response.latency_ms / n
        )
```

## Model Routing

### Intelligent Request Routing

```python
class ModelRouter:
    """Routes requests to the best model based on multiple factors."""

    def __init__(self, registry: ModelRegistry):
        self.registry = registry
        self.rules: list[RoutingRule] = []

    def add_rule(self, rule: "RoutingRule"):
        self.rules.append(rule)

    async def route(self, request: "LLMRequest") -> str:
        """Select the best model for this request."""
        candidates = set(self.registry.models.keys())

        # Apply each rule to narrow down candidates
        for rule in self.rules:
            if rule.matches(request):
                candidates = rule.filter(candidates, request)

        if not candidates:
            return self._fallback_model()

        # Score remaining candidates and pick the best
        return max(candidates, key=lambda m: self._score_model(m, request))

    def _score_model(self, model_name: str, request: "LLMRequest") -> float:
        """Score a model for this request based on quality, cost, and latency."""
        model = self.registry.get_model_info(model_name)
        if not model:
            return -1

        score = 0.0

        # Quality score (higher is better)
        quality = model["capabilities"].get("quality_score", 0.5)
        score += quality * request.quality_weight

        # Cost score (lower is better, so we invert)
        cost_per_1k = model["capabilities"].get("cost_per_1k_input", 1.0)
        cost_score = max(0, 1 - cost_per_1k / 10)  # Normalize to 0-1
        score += cost_score * request.cost_weight

        # Latency score (lower is better, so we invert)
        avg_latency = model.get("avg_latency_ms", 500)
        latency_score = max(0, 1 - avg_latency / 5000)  # Normalize to 0-1
        score += latency_score * request.latency_weight

        # Penalty for high error rate
        score -= model.get("error_rate", 0) * 2

        return score


@dataclass
class LLMRequest:
    content: str
    task_type: str
    quality_weight: float = 0.5
    cost_weight: float = 0.3
    latency_weight: float = 0.2
    max_tokens: int = 4096
    requires_json: bool = False


class RoutingRule:
    def matches(self, request: LLMRequest) -> bool:
        raise NotImplementedError

    def filter(self, candidates: set, request: LLMRequest) -> set:
        raise NotImplementedError


class TaskTypeRule(RoutingRule):
    """Route specific task types to specialized models."""

    def __init__(self, task_type: str, preferred_models: list[str]):
        self.task_type = task_type
        self.preferred_models = set(preferred_models)

    def matches(self, request: LLMRequest) -> bool:
        return request.task_type == self.task_type

    def filter(self, candidates: set, request: LLMRequest) -> set:
        preferred = candidates & self.preferred_models
        return preferred if preferred else candidates  # Fall back to all candidates


class ComplexityRule(RoutingRule):
    """Route complex queries to stronger models, simple ones to cheaper models."""

    def __init__(self, complexity_threshold: float = 0.5):
        self.threshold = complexity_threshold

    def matches(self, request: LLMRequest) -> bool:
        return True  # Always applies

    def filter(self, candidates: set, request: LLMRequest) -> set:
        complexity = self._estimate_complexity(request.content)
        if complexity > self.threshold:
            # Filter to only "strong" models
            return {c for c in candidates
                    if self.registry.models[c]["capabilities"].get("tier") == "strong"}
        else:
            # Prefer "fast" or "cheap" models
            return {c for c in candidates
                    if self.registry.models[c]["capabilities"].get("tier") in ("fast", "cheap")}

    def _estimate_complexity(self, content: str) -> float:
        """Simple heuristic: longer text with more reasoning indicators is more complex."""
        indicators = ["analyze", "compare", "explain why", "evaluate", "design", "implement"]
        indicator_count = sum(1 for i in indicators if i in content.lower())
        length_factor = min(len(content) / 1000, 1.0)
        return (indicator_count * 0.3 + length_factor * 0.7) / 1.7
```

## Failover Systems

### Health Monitoring

```python
import asyncio
from datetime import datetime, timedelta

class ProviderHealthMonitor:
    """Continuously monitors provider health and marks them degraded when needed."""

    def __init__(self, registry: ModelRegistry):
        self.registry = registry
        self.health_status: dict[str, dict] = {}
        self.consecutive_errors: dict[str, int] = {}
        self.circuit_open: dict[str, bool] = {}
        self.last_check: dict[str, datetime] = {}
        self.check_interval = timedelta(seconds=30)

    async def start_monitoring(self):
        """Start background health checks."""
        while True:
            for provider_name in self.registry.providers:
                if datetime.utcnow() - self.last_check.get(provider_name, datetime.min) < self.check_interval:
                    continue

                healthy = await self._check_provider_health(provider_name)
                self._update_status(provider_name, healthy)
                self.last_check[provider_name] = datetime.utcnow()

            await asyncio.sleep(10)

    async def _check_provider_health(self, provider_name: str) -> bool:
        """Send a lightweight probe request to check provider health."""
        try:
            provider = self.registry.providers[provider_name]
            await provider.generate("test", model=self._get_probe_model(provider_name))
            return True
        except Exception:
            return False

    def _update_status(self, provider_name: str, healthy: bool):
        """Update health status with circuit breaker logic."""
        if healthy:
            self.consecutive_errors[provider_name] = 0
            if self.circuit_open.get(provider_name):
                # Half-open: allow one request
                self.circuit_open[provider_name] = False
        else:
            self.consecutive_errors[provider_name] = self.consecutive_errors.get(provider_name, 0) + 1

            # Open circuit after 3 consecutive errors
            if self.consecutive_errors[provider_name] >= 3:
                self.circuit_open[provider_name] = True

        status = "healthy"
        if self.circuit_open.get(provider_name):
            status = "circuit_open"
        elif self.consecutive_errors.get(provider_name, 0) > 0:
            status = "degraded"

        self.health_status[provider_name] = {
            "status": status,
            "consecutive_errors": self.consecutive_errors.get(provider_name, 0),
            "last_check": datetime.utcnow().isoformat(),
        }

    def is_available(self, provider_name: str) -> bool:
        """Check if a provider is available (not circuit-open)."""
        return not self.circuit_open.get(provider_name, False)
```

### Automatic Failover

```python
class FailoverRouter:
    """Handles automatic failover when the primary model/provider is unavailable."""

    def __init__(self, router: ModelRouter, health_monitor: ProviderHealthMonitor):
        self.router = router
        self.health = health_monitor
        self.failover_chains: dict[str, list[str]] = {}

    def set_failover_chain(self, primary: str, fallbacks: list[str]):
        """Define the failover order for a model."""
        self.failover_chains[primary] = fallbacks

    async def generate_with_failover(self, request: LLMRequest) -> LLMResponse:
        """Generate with automatic failover."""
        # Get the primary model from routing
        primary_model = await self.router.route(request)
        candidates = [primary_model]

        # Add failover chain
        if primary_model in self.failover_chains:
            candidates.extend(self.failover_chains[primary_model])

        last_error = None
        for model_name in candidates:
            provider = self.registry.models[model_name]["provider"]
            if not self.health.is_available(provider):
                continue

            try:
                provider_instance = self.registry.providers[provider]
                response = await provider_instance.generate(
                    request.content, model=model_name, max_tokens=request.max_tokens,
                )
                self.registry.update_model_stats(model_name, response)
                self.health.consecutive_errors[provider] = 0
                return response

            except Exception as e:
                last_error = e
                self.health._update_status(provider, healthy=False)
                continue

        # All models failed
        raise RuntimeError(f"All models failed. Last error: {last_error}")
```

## Cost-Optimized Multi-Provider Setup

### Budget Allocation

```python
class BudgetManager:
    """Manages cost across providers and optimizes spend."""

    def __init__(self, daily_budget_usd: float):
        self.daily_budget = daily_budget_usd
        self.provider_budgets: dict[str, float] = {}
        self.spent_today: dict[str, float] = {}

    def set_provider_budget(self, provider: str, max_daily_usd: float):
        self.provider_budgets[provider] = max_daily_usd

    def track_spend(self, provider: str, cost_usd: float):
        self.spent_today[provider] = self.spent_today.get(provider, 0) + cost_usd

    def is_within_budget(self, provider: str) -> bool:
        spent = self.spent_today.get(provider, 0)
        budget = self.provider_budgets.get(provider, float("inf"))
        return spent < budget

    def get_remaining_budget(self) -> float:
        total_spent = sum(self.spent_today.values())
        return self.daily_budget - total_spent

    def suggest_cheaper_model(self, current_model: str) -> str:
        """Suggest a cheaper alternative when budget is tight."""
        cheaper_alternatives = {
            "gpt-4o": ["gpt-4o-mini", "claude-haiku-4-20250514"],
            "claude-opus-4-20250514": ["claude-sonnet-4-20250514", "claude-haiku-4-20250514"],
            "o3": ["gpt-4o", "gpt-4o-mini"],
        }
        return cheaper_alternatives.get(current_model, [current_model])[0]
```

### Cost-Aware Routing

```python
class CostAwareRouter:
    """Routes to minimize cost while meeting quality and latency requirements."""

    def __init__(self, registry: ModelRouter, budget_manager: BudgetManager):
        self.router = registry
        self.budget = budget_manager

    async def route(self, request: LLMRequest) -> str:
        # If budget is tight, prefer cheaper models
        remaining = self.budget.get_remaining_budget()
        if remaining < self.budget.daily_budget * 0.2:  # Less than 20% remaining
            request.cost_weight = 0.6
            request.quality_weight = 0.2
            request.latency_weight = 0.2

        model = await self.router.route(request)
        provider = self.registry.models[model]["provider"]

        # Check if this provider has budget remaining
        if not self.budget.is_within_budget(provider):
            # Find cheapest available alternative
            cheaper_model = self.budget.suggest_cheaper_model(model)
            return cheaper_model

        return model
```

### Multi-Provider Cost Dashboard Data

```python
async def generate_cost_report(registry: ModelRegistry) -> dict:
    """Generate a comprehensive cost report across all providers."""
    report = {
        "providers": {},
        "total_cost_usd": 0.0,
        "total_requests": 0,
        "avg_cost_per_request": 0.0,
        "model_breakdown": {},
    }

    for model_name, info in registry.models.items():
        provider = info["provider"]
        if provider not in report["providers"]:
            report["providers"][provider] = {
                "total_cost": 0.0,
                "requests": 0,
                "models": {},
            }

        report["providers"][provider]["total_cost"] += info["total_cost_usd"]
        report["providers"][provider]["requests"] += info["requests_today"]
        report["providers"][provider]["models"][model_name] = {
            "cost": info["total_cost_usd"],
            "requests": info["requests_today"],
            "avg_latency": info["avg_latency_ms"],
            "error_rate": info["error_rate"],
        }

        report["total_cost_usd"] += info["total_cost_usd"]
        report["total_requests"] += info["requests_today"]

    report["avg_cost_per_request"] = (
        report["total_cost_usd"] / report["total_requests"]
        if report["total_requests"] > 0 else 0
    )

    return report
```

## Provider Comparison Matrix

| Feature | OpenAI | Anthropic | Google | Self-Hosted |
|---------|--------|-----------|--------|-------------|
| Best quality model | o3 | Claude Opus 4 | Gemini 2.5 | Llama 4 405B |
| Best cost model | GPT-4o Mini | Claude Haiku 4 | Gemini Flash | Qwen 2.5 72B |
| Context window | 128K | 200K | 1M | 128K |
| Structured output | Excellent | Excellent | Good | Requires prompting |
| Tool calling | Excellent | Excellent | Good | Varies by model |
| Streaming | Yes | Yes | Yes | Yes |
| Rate limits | Strict | Moderate | Moderate | Self-controlled |
| Data retention | Opt-out | Opt-out | Opt-out | Full control |
| Latency (p50) | 500-800ms | 400-700ms | 600-900ms | 200-500ms |
| Cost per 1M input | $0.15 - $10 | $0.80 - $15 | $0.10 - $5 | Infrastructure only |

## Cross-References

- For deploying models to production, see [Deployment Strategies for Production](/docs/deployment-strategies-production)
- For tracking costs and KPIs, see [LLM Metrics & KPIs](/docs/llm-metrics-kpis)
- For inference optimization techniques, see [Inference Optimization & Quantization](/docs/inference-optimization-quantization)
- For model version management, see [Model Versioning & Management](/docs/model-versioning-management)
