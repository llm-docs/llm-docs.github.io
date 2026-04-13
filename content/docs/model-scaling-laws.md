---
title: "Model Scaling Laws"
description: "Understanding the mathematical relationships between model size, data, compute, and performance — Kaplan, Chinchilla, and modern scaling research"
date: "2026-04-04"
category: "Fundamentals"
tags: ["scaling-laws", "compute", "training", "research", "performance", "optimization"]
author: "LLM Hub Team"
---

# Model Scaling Laws

Scaling laws describe how LLM performance improves as we increase model size, training data, and compute budget. They provide a mathematical framework for deciding how to allocate resources when training or selecting a model.

## The Original Kaplan Scaling (2020)

OpenAI's ["Scaling Laws for Neural Language Models"](https://arxiv.org/abs/2001.08361) found that loss follows a power law with respect to compute:

```
L(C) = E + C^(-α)

Where:
  L = cross-entropy loss
  C = compute (FLOPs)
  E = irreducible loss (data entropy limit)
  α ≈ 0.048 (empirically fitted)
```

**Key finding**: Performance scales smoothly with compute across 6 orders of magnitude. No diminishing returns in sight.

### Kaplan's Recommendation

For a given compute budget, prioritize **model size** over data size:
- Scale parameters first
- Stop before you see overfitting
- Data size is secondary

## Chinchilla Scaling (2022)

DeepMind's ["Training Compute-Optimal Large Language Models"](https://arxiv.org/abs/2203.15556) challenged Kaplan's conclusions:

```
Optimal: N ∝ D

Where:
  N = model parameters
  D = training tokens
```

**Key finding**: Models are **undertrained**. Given a compute budget, you should scale parameters AND tokens proportionally.

### Practical Impact

| Model | Parameters | Training Tokens | Tokens per Parameter |
|-------|-----------|----------------|---------------------|
| GPT-3 | 175B | 300B | ~1.7× |
| Chinchilla-optimal | 70B | 1.4T | ~20× |
| Llama 3 | 8B | 1.5T | ~187× |
| Llama 3 | 70B | 15T | ~214× |

Modern models far exceed Chinchilla-optimal data, suggesting that **more data always helps**, even past the theoretical optimum.

## Modern Scaling Insights

### 1. The Test Loss vs. Downstream Task Distinction

Scaling laws originally predict **training/test loss**, not downstream task performance. Recent research shows:

- Test loss scales smoothly (predictable)
- Downstream accuracy may show **phase transitions** (sudden capability emergence)
- Different capabilities emerge at different scales

### 2. Bottlenecks and Plateaus

| Bottleneck | Description | Mitigation |
|-----------|-------------|------------|
| Data quality ceiling | More data doesn't help if it's low quality | Better filtering, curriculum learning |
| Context window limit | Long-context reasoning doesn't scale with params | Architectural changes (RoPE scaling, YaRN) |
| Reasoning gap | Pattern matching ≠ logical reasoning | CoT training, process supervision |
| Alignment tax | RLHF can reduce raw capability | DPO, RLAIF, constitutional AI |

### 3. Compute-Optimal Training Budget Calculator

```python
def compute_optimal_model_size(total_flops: float) -> dict:
    """
    Chinchilla-optimal allocation.
    total_flops: total training compute budget
    """
    # Constants from Hoffmann et al.
    # L(N,D) with optimal N ∝ D^(0.74)
    G = 5.321e-7  # FLOPs per token per parameter (approx)
    
    # For compute-optimal: N = sqrt(C / (6 * G))
    optimal_params = (total_flops / (6 * G)) ** 0.5
    optimal_tokens = total_flops / (6 * G * optimal_params)
    
    return {
        "parameters": f"{optimal_params/1e9:.1f}B",
        "tokens": f"{optimal_tokens/1e9:.1f}B",
        "tokens_per_param": f"{optimal_tokens/optimal_params:.0f}"
    }

# Example: 10^24 FLOPs budget
print(compute_optimal_model_size(1e24))
# {'parameters': '7.0B', 'tokens': '140.0B', 'tokens_per_param': '20'}
```

## Scaling in Practice

### Inference Scaling

At inference time, compute can be spent on:
- **More parameters**: Larger model (linear cost increase)
- **More generation steps**: Chain of thought, self-consistency (linear cost)
- **Multiple samples**: Best-of-N sampling, majority voting (linear cost)
- **Search**: Beam search, tree search (superlinear cost)

### Test-Time Compute Scaling

Recent work shows that **spending more compute at inference time** can dramatically improve performance:

| Method | Compute Multiplier | Accuracy Gain (math) |
|--------|-------------------|---------------------|
| Single sample | 1× | Baseline |
| Self-consistency (40 samples) | 40× | +15-20% |
| Tree of Thoughts | 10-100× | +10-25% |
| LLM-as-judge selection | 5-10× | +5-15% |

### The Pareto Frontier

For any budget, there's a Pareto frontier of cost vs. quality:

```
Quality ▲
    │
    │     • Frontier model (o3, Claude 4)
    │    /
    │   •  Good model (GPT-4o, Llama 3 405B)
    │  /
    │ •   Decent model (Llama 3 70B)
    │/
    └──────────────────► Cost
```

## Scaling Predictions

Extrapolating current trends (with appropriate caution):

| Year | Expected Frontier | Parameters | Multimodal |
|------|------------------|-----------|------------|
| 2024 | GPT-4o, Claude 3.5 | ~1-2T (est.) | Text + image |
| 2025 | GPT-5, Claude 4 | ~2-5T (est.) | Text + image + video |
| 2026 | Next generation | ~5-10T (est.) | Full multimodal |

**Caveat**: These extrapolations assume continued scaling. Architectural breakthroughs could change the curve.

## When NOT to Scale

Scaling isn't always the right answer:

| Scenario | Better Approach |
|----------|----------------|
| Domain-specific task | Fine-tune a smaller model |
| Cost-constrained deployment | Use MoE or quantized models |
| Real-time latency requirement | Distill to smaller model |
| Data privacy required | Train small on private data |
| Edge deployment | Use 1-7B models with quantization |

## Key Takeaways

- Kaplan: Scale parameters first for best loss reduction
- Chinchilla: Scale parameters and data proportionally
- Modern models exceed Chinchilla-optimal data, suggesting "more data always helps"
- Test-time compute scaling is an emerging lever for quality improvement
- Smooth scaling of loss doesn't guarantee smooth emergence of capabilities
- For most practitioners, choosing the right existing model beats training a new one

## Related Documentation

- **[Training and Pre-training](/docs/model-training-pretraining)** — The actual training process
- **[Fine-tuning and LoRA](/docs/fine-tuning-lora)** — Adapting existing models
- **[Inference Optimization](/docs/inference-optimization-quantization)** — Serving efficiently
