---
title: "Attention Mechanisms Variants"
description: "A deep technical survey of attention variants — from scaled dot-product to FlashAttention, linear attention, and state space alternatives"
date: "2026-04-16"
category: "Advanced Technical"
tags: ["attention", "flashattention", "linear-attention", "optimization", "research", "architecture"]
author: "IntuiVortex Team"
---

# Attention Mechanisms Variants

The attention mechanism is the computational heart of Transformer models. Since the original scaled dot-product attention, dozens of variants have been proposed to improve efficiency, expressiveness, or scalability. This guide covers the major attention mechanisms.

## Scaled Dot-Product Attention (Original)

```python
def attention(Q, K, V, mask=None):
    """Original Transformer attention."""
    d_k = Q.size(-1)
    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, float('-inf'))
    weights = torch.softmax(scores, dim=-1)
    return torch.matmul(weights, V)
```

**Complexity**: O(n² · d) for sequence length n and dimension d. The n² term comes from computing pairwise interactions between all tokens.

**Limitation**: Quadratic memory and compute for the attention matrix becomes prohibitive for long sequences.

## Multi-Query Attention (MQA)

Instead of separate K/V projections per head, all heads share one K/V:

```python
# Standard multi-head: h separate K/V projections
# MQA: 1 shared K/V projection for all heads

class MultiQueryAttention(nn.Module):
    def __init__(self, d_model, num_heads):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim = d_model // num_heads
        
        # Q: one per head (like standard)
        self.W_q = nn.Linear(d_model, d_model)
        # K, V: shared across all heads
        self.W_k = nn.Linear(d_model, self.head_dim)
        self.W_v = nn.Linear(d_model, self.head_dim)
        self.W_o = nn.Linear(d_model, d_model)
```

**Benefit**: Dramatically reduces KV cache size during inference → 2-3× faster generation.
**Trade-off**: Slight quality degradation vs. multi-head.
**Used by**: PaLM, Falcon, some Llama variants.

## Grouped-Query Attention (GQA)

Middle ground between MQA and multi-head: heads are grouped into G sets, each set shares K/V:

```python
class GroupedQueryAttention(nn.Module):
    def __init__(self, d_model, num_heads, num_groups):
        super().__init__()
        self.num_heads = num_heads
        self.num_groups = num_groups
        self.head_dim = d_model // num_heads
        
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, num_groups * self.head_dim)  # G groups
        self.W_v = nn.Linear(d_model, num_groups * self.head_dim)
        self.W_o = nn.Linear(d_model, d_model)
```

**Benefits**: 80% of MQA speed improvement with near-zero quality loss.
**Used by**: Llama 3, most modern efficient models.

## FlashAttention

FlashAttention is not a different attention function — it's an IO-aware algorithm that computes the same attention with dramatically reduced memory traffic:

```python
from flash_attn import flash_attn_func

# Same mathematical operation, different algorithm
# Standard: materialize full n×n attention matrix in HBM
# FlashAttention: compute in SRAM-friendly tiles

def flash_attn(Q, K, V, causal=True):
    """IO-aware exact attention computation."""
    # Key insight: softmax can be computed incrementally
    # Split Q, K, V into blocks that fit in SRAM
    # Process block-by-block, accumulating softmax statistics
    return flash_attn_func(Q, K, V, causal=causal)
```

**How it works**:
1. **Tiling**: Split the attention matrix into blocks that fit in fast SRAM
2. **Online softmax**: Compute softmax incrementally without materializing the full matrix
3. **Recomputation**: Recompute attention weights in the backward pass instead of storing them

**Speedup**: 2-4× over standard attention on GPU.
**Memory**: O(n) instead of O(n²) for the attention matrix.

## Linear Attention

Approximate softmax attention with a kernel that allows O(n) computation:

```python
def linear_attention(Q, K, V):
    """
    Replace softmax(QK^T) with φ(Q)φ(K)^T
    where φ is a feature map.
    
    This allows rearranging computation:
    output = φ(Q) @ (φ(K)^T @ V)  # O(n) instead of O(n²)
    """
    # Feature map (e.g., elu(x) + 1)
    Q_feat = torch.elu(Q) + 1
    K_feat = torch.elu(K) + 1
    
    # Rearranged computation
    kv = torch.einsum("nhmd,nhme->nhde", K_feat, V)  # (d × d) matrix
    numerator = torch.einsum("nhmd,nhde->nhme", Q_feat, kv)
    denominator = torch.einsum("nhmd,nhm->nhd", Q_feat, K_feat.sum(dim=1))
    
    return numerator / denominator.unsqueeze(-1)
```

**Benefit**: O(n) complexity → handles arbitrarily long sequences.
**Trade-off**: Approximate; loses the exact softmax attention computation.
**Used by**: Performer, Linear Transformer, some efficient long-context models.

## Sliding Window Attention

Each token only attends to a local window of w tokens:

```python
def sliding_window_attention(Q, K, V, window_size=4096):
    """Only compute attention within a sliding window."""
    # For token at position i, only attend to positions [i-w, i]
    # Complexity: O(n · w · d) instead of O(n² · d)
    
    n = Q.size(1)
    output = torch.zeros_like(Q)
    
    for i in range(n):
        start = max(0, i - window_size)
        scores = Q[:, i:i+1] @ K[:, start:i+1].transpose(-2, -1) / math.sqrt(d_k)
        weights = torch.softmax(scores, dim=-1)
        output[:, i:i+1] = weights @ V[:, start:i+1]
    
    return output
```

**Used by**: Longformer, BigBird, MPT.
**Benefit**: O(n · w) complexity, linear in sequence length.
**Trade-off**: Loses global context; often combined with global attention tokens.

## Cross-Attention

Used in encoder-decoder models: decoder queries attend to encoder keys/values:

```python
def cross_attention(decoder_hidden, encoder_output):
    """Decoder attends to encoder output."""
    Q = W_q(decoder_hidden)      # From decoder
    K = W_k(encoder_output)      # From encoder
    V = W_v(encoder_output)      # From encoder
    
    scores = Q @ K.transpose(-2, -1) / math.sqrt(d_k)
    weights = torch.softmax(scores, dim=-1)
    return weights @ V
```

**Used in**: Translation, summarization, any encoder-decoder architecture.

## Sparse Attention Patterns

### BigBird: Random + Window + Global

```python
def bigbird_attention(Q, K, V):
    """Combine three attention patterns."""
    # 1. Sliding window (local context)
    window_attn = sliding_window_attention(Q, K, V, window_size=512)
    
    # 2. Global tokens (CLS, [SEP], etc. attend to everything)
    global_attn = global_attention(Q, K, V, global_token_indices=[0, -1])
    
    # 3. Random tokens (long-range connectivity)
    random_attn = random_attention(Q, K, V, num_random=64)
    
    # Combine
    return window_attn + global_attn + random_attn
```

## Comparative Analysis

| Variant | Complexity | KV Cache | Quality | Best For |
|---------|-----------|----------|---------|----------|
| **Standard Multi-Head** | O(n²d) | Large | Best | Baseline |
| **MQA** | O(n²d) | Small | ~98% | Fast inference |
| **GQA** | O(n²d) | Medium | ~99% | Balanced serving |
| **FlashAttention** | O(n²d) | Large | Identical | Same quality, 2-4× faster |
| **Linear** | O(nd²) | Small | ~90-95% | Very long sequences |
| **Sliding Window** | O(nwd) | Small | ~85-95% | Local context tasks |
| **Sparse (BigBird)** | O(n·w·d) | Small | ~90-95% | Long documents |

## Emerging Attention Research

### Hyena: Sub-Quadratic Sequence Operator

```python
# Hyena replaces attention with long convolutions
# y = H * (V · σ(W · x))
# Where H is a learned implicit filter
```

### RWKV: RNN-Style with Transformer Training

```python
# RWKV combines RWKV channels:
# Time mixing (like attention) + Channel mixing (like FFN)
# But with O(n) inference like an RNN
```

## Key Takeaways

- FlashAttention is the default optimization for serving — same quality, 2-4× faster
- GQA is the standard for new models — near-zero quality loss with significant speed gains
- Linear and sliding window attention trade quality for O(n) scaling
- MQA/GQA reduce KV cache, which is the inference bottleneck for batched serving
- The attention bottleneck drives most architectural innovation in modern LLMs

## Related Documentation

- **[Transformer Architecture](/docs/transformer-architecture)** — Full Transformer design
- **[Speculative Decoding](/docs/speculative-decoding-optimization)** — Inference speedup techniques
- **[Context Window](/docs/context-window-management)** — Long-sequence challenges
