---
title: "LLM Architectures Overview"
description: "Compare decoder-only, encoder-only, encoder-decoder, and MoE architectures — understanding the design space of modern language models"
date: "2026-04-03"
category: "Fundamentals"
tags: ["architecture", "llm", "transformers", "moe", "comparison", "design"]
author: "IntuiVortex Team"
---

# LLM Architectures Overview

Not all language models are built the same. The architectural choices a model maker makes determine what the model is good at, how it can be used, and what hardware it needs. This guide surveys the major architectural families.

## The Three Main Families

### 1. Decoder-Only (Autoregressive)

**Examples**: GPT-4, Llama 3, Claude, Mistral, Gemini, Qwen

The dominant architecture for modern LLMs. Generates text one token at a time, each new token conditioned on all previous tokens.

```
System → User prompt → Model → token_1 → token_2 → token_3 → ...
  (causal: each token sees only previous tokens)
```

**Strengths**:
- Natural text generation
- Versatile (can do classification, QA, summarization via prompting)
- Scales well to very large sizes
- Unified architecture for all tasks

**Weaknesses**:
- Can hallucinate (no bidirectional context)
- Slower inference (sequential generation)
- No native understanding of full-context relationships

**Best for**: Chatbots, content generation, code generation, general-purpose assistants.

### 2. Encoder-Only (Masked Language Models)

**Examples**: BERT, RoBERTa, DeBERTa, ModernBERT

Process the entire input simultaneously with bidirectional attention. Each token can see all other tokens.

```
[CLS] The cat [MASK] on the mat [SEP]
  ↓  ↓    ↓     ↓     ↓    ↓     ↓
(full bidirectional attention between all tokens)
```

**Strengths**:
- Superior for classification, NER, sentiment analysis
- Fast (fully parallel processing)
- Better at understanding context relationships

**Weaknesses**:
- Cannot generate text natively
- Requires task-specific fine-tuning
- Less versatile than decoder-only models

**Best for**: Text classification, named entity recognition, sentiment analysis, search relevance.

### 3. Encoder-Decoder (Sequence-to-Sequence)

**Examples**: T5, BART, Flan-T5, mBART

Two-stage architecture: encoder processes input bidirectionally, decoder generates output autoregressively with cross-attention to encoder output.

```
Input → [Encoder] → context representation → [Decoder] → Output
              ↕              ↕
        (bidirectional)  (cross-attention)
```

**Strengths**:
- Natural for translation, summarization, paraphrasing
- Clean separation of understanding and generation
- Strong for tasks with input→output transformation

**Weaknesses**:
- More parameters for same capability (two networks)
- Largely superseded by decoder-only at scale
- Slower training and inference

**Best for**: Machine translation, text summarization, document rewriting.

## Mixture of Experts (MoE)

MoE is not a separate architecture but a scaling technique applicable to any family. Instead of one FFN per layer, MoE uses multiple FFNs ("experts") with a learned router:

```python
# MoE layer pseudocode
class MoELayer(nn.Module):
    def __init__(self, num_experts=8, top_k=2):
        self.experts = nn.ModuleList([FFN() for _ in range(num_experts)])
        self.router = nn.Linear(d_model, num_experts)
        self.top_k = top_k
    
    def forward(self, x):
        # Router scores for each expert
        scores = torch.softmax(self.router(x), dim=-1)
        top_k_scores, top_k_indices = scores.topk(self.top_k)
        
        # Only compute top_k experts (sparse activation)
        output = torch.zeros_like(x)
        for i in range(self.top_k):
            expert_idx = top_k_indices[i]
            output += top_k_scores[i] * self.experts[expert_idx](x)
        return output
```

**Examples**: Mixtral 8x7B, Grok-1, Qwen MoE, DBRX

| Metric | Dense 70B | MoE 8x7B (active: 2 experts) |
|--------|-----------|------------------------------|
| Total parameters | 70B | 56B (8 × 7B) |
| Active parameters | 70B | ~14B |
| Inference cost | 100% | ~20% |
| Quality | Baseline | Near-dense-70B |

## Emerging Architectures

### State Space Models (SSMs)

Models like **Mamba** and **RWKV** replace attention with state space operations, achieving linear-time sequence processing:

```
# Mamba: selective SSM
h_t = A * h_{t-1} + B * x_t    # State update
y_t = C * h_t                   # Output
```

**Advantage**: O(n) instead of O(n²) for sequence length n. **Disadvantage**: Not yet competitive with Transformers at the frontier.

### Hybrid Models

- **Jamba** (AI21): Alternates Transformer and Mamba layers
- **Griffin** (Google): Combines gated recurrent blocks with local attention
- **RWKV**: RNN-style inference with Transformer-quality training

## Architecture Selection Guide

| Task | Recommended Architecture | Example Models |
|------|------------------------|----------------|
| Chat / Generation | Decoder-only | GPT-4, Llama 3, Claude |
| Code Generation | Decoder-only | CodeLlama, StarCoder, DeepSeek-Coder |
| Text Classification | Encoder-only | BERT, DeBERTa, ModernBERT |
| Semantic Search | Encoder-only | BGE, E5, ModernBERT-embed |
| Translation | Encoder-Decoder or Decoder-only | NLLB, Gemini, GPT-4 |
| Summarization | Decoder-only | Claude, GPT-4, Llama 3 |
| Cost-effective serving | MoE Decoder | Mixtral, DBRX |

## Key Takeaways

- Decoder-only is the dominant architecture for generative tasks
- Encoder-only excels at understanding/classification tasks
- Encoder-decoder is specialized for input→output transformation
- MoE enables scaling capacity without scaling compute
- Hybrid and SSM architectures are emerging alternatives

## Related Documentation

- **[Transformer Architecture](/docs/transformer-architecture)** — Technical deep dive into attention
- **[Fine-tuning and LoRA](/docs/fine-tuning-lora)** — Adapting architectures to your domain
- **[Inference Optimization](/docs/inference-optimization-quantization)** — Serving architectures efficiently
