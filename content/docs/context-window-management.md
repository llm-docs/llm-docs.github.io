---
title: "Context Window and Long-Context Understanding"
description: "How context windows work, techniques for extending them, and strategies for managing long documents with LLMs"
date: "2026-04-05"
category: "Fundamentals"
tags: ["context-window", "long-context", "attention", "rope", "memory", "retrieval"]
author: "IntuiVortex Team"
---

# Context Window and Long-Context Understanding

The context window is the maximum number of tokens (input + output) an LLM can process in a single forward pass. It's one of the most important practical constraints when working with LLMs.

## Context Window Evolution

| Model | Context Window | Year |
|-------|---------------|------|
| GPT-2 | 1,024 | 2019 |
| GPT-3 | 2,048 → 4,096 | 2020 |
| Claude 2 | 100,000 | 2023 |
| GPT-4 Turbo | 128,000 | 2023 |
| Claude 3 | 200,000 | 2024 |
| Gemini 1.5 Pro | 1,000,000 | 2024 |
| Claude 3.5/4 | 200,000 | 2024-2025 |
| GPT-4o | 128,000 | 2024 |
| Llama 3.1 | 128,000 | 2024 |
| Qwen 2.5 | 128,000 | 2024 |

## How Context Windows Work

### The Attention Mechanism's Role

Self-attention computes pairwise interactions between all tokens:

```python
# Attention complexity: O(n²) for sequence length n
# Each token computes attention scores with every other token

# For 128K context:
# Attention matrix = 128,000 × 128,000 = 16.4 billion entries
# At float16: 32.8 GB just for the attention matrix
```

### Memory Breakdown for Long Context

For a 70B model with 128K context:

| Component | Memory |
|-----------|--------|
| Model weights (FP16) | 140 GB |
| KV cache (128K tokens) | 40-80 GB |
| Activations | 20-40 GB |
| **Total** | **200-260 GB** |

This is why long-context inference requires multiple high-memory GPUs.

## Extending Context Beyond Training Length

Most models are trained on 4K-8K context but support much longer windows at inference time through **position extrapolation**.

### Linear RoPE Scaling

```python
# RoPE encodes position as rotation angles
# At inference time, scale the angles to extend range

def rope_scaling(positions, dim, base=10000, scaling_factor=8.0):
    """Scale RoPE frequencies to support longer sequences."""
    inv_freq = 1.0 / (base ** (torch.arange(0, dim, 2).float() / dim))
    # Apply scaling factor to extend range
    inv_freq = inv_freq / scaling_factor
    return torch.outer(positions, inv_freq)
```

### YaRN (Yet another RoPE extensioN)

Combines RoPE scaling with attention temperature adjustment:

```python
# YaRN: scale positions AND adjust attention temperature
# Supports 128× extrapolation with minimal quality loss

def yarn_attention(Q, K, V, scaling_factor, temperature):
    scaled_positions = torch.arange(seq_len) / scaling_factor
    # Apply scaled RoPE
    Q = apply_rope(Q, scaled_positions)
    K = apply_rope(K, scaled_positions)
    # Adjust temperature for scaled attention
    scores = torch.matmul(Q, K.T) / (temperature * scaling_factor)
    return torch.softmax(scores, dim=-1) @ V
```

### NTK-Aware Scaling

Interpolates between training and target position encodings:

```python
# NTK-aware: dynamically adjust base frequency
def ntk_aware_rope(context_length, trained_length, base=10000):
    scaling = context_length / trained_length
    # NTK-aware adjustment (less aggressive than linear)
    new_base = base * (scaling ** (dim / (dim - 2))) ** (2 / dim)
    return new_base
```

## The "Lost in the Middle" Problem

Research shows that LLMs are less accurate when key information appears in the middle of long contexts:

```
Beginning of context  ◄──── Strong recall ────►  End of context
                              │
                          Weaker recall
                        (middle section)
```

**Mitigation strategies:**
1. **RAG retrieval**: Put most relevant chunks first and last
2. **Summarize-then-answer**: Compress middle sections
3. **Windowed attention**: Process context in overlapping windows

## Practical Context Management

### Estimating Context Usage

```python
import tiktoken

enc = tiktoken.encoding_for_model("gpt-4o")

def estimate_context_usage(messages: list[dict], max_tokens: int = 128000) -> dict:
    total = 0
    for msg in messages:
        total += len(enc.encode(str(msg)))
    
    return {
        "tokens_used": total,
        "tokens_remaining": max_tokens - total,
        "percentage_used": f"{(total/max_tokens)*100:.1f}%",
        "approx_words": total // 1.3  # Rough conversion
    }
```

### Truncation Strategies

When context exceeds limits:

| Strategy | Description | Best For |
|----------|-------------|----------|
| **First-N** | Keep beginning, drop end | Documents where key info is early |
| **Last-N** | Keep end, drop beginning | Conversations (recent context matters most) |
| **Sliding Window** | Keep most recent N tokens | Streaming conversations |
| **Summarize Old** | Compress older content | Long documents |
| **Selective Retrieval** | Embed + retrieve relevant chunks | Knowledge bases (RAG) |

```python
def sliding_window_context(messages: list[dict], 
                           max_tokens: int, 
                           keep_system: bool = True) -> list[dict]:
    """Keep most recent messages that fit in context."""
    import tiktoken
    enc = tiktoken.encoding_for_model("gpt-4o")
    
    # Always keep system message
    system_msg = messages[0] if messages[0]["role"] == "system" else None
    remaining = messages[1:] if system_msg else messages[:]
    
    # Count system message tokens
    used = len(enc.encode(str(system_msg))) if system_msg else 0
    
    # Add messages from most recent until we hit limit
    result = []
    for msg in reversed(remaining):
        msg_tokens = len(enc.encode(str(msg)))
        if used + msg_tokens > max_tokens:
            break
        result.append(msg)
        used += msg_tokens
    result.reverse()
    
    if system_msg:
        result = [system_msg] + result
    return result
```

## Long-Context Benchmarks

| Benchmark | Task | Measures |
|-----------|------|----------|
| **Needle in a Haystack** | Find specific fact in long text | Retrieval accuracy |
| **RULER** | Multiple long-context tasks | Comprehensive |
| **LongBench** | 6 task categories | Cross-model comparison |
| **InfiniteBench** | Up to 2M tokens | Extreme context |

## Key Takeaways

- Context windows have grown from 4K to 1M+ tokens in 5 years
- The O(n²) attention complexity makes long context expensive
- Position extrapolation (RoPE scaling) extends context beyond training length
- "Lost in the middle" effect means information placement matters
- RAG is often more practical than raw long-context for large knowledge bases

## Related Documentation

- **[Transformer Architecture](/docs/transformer-architecture)** — How attention works under the hood
- **[RAG Systems](/docs/rag-retrieval-augmented-generation)** — Retrieval-based context management
- **[Inference Optimization](/docs/inference-optimization-quantization)** — Memory management for long contexts
