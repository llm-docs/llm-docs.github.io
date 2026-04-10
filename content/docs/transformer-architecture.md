---
title: "Transformer Architecture Deep Dive"
description: "A technical exploration of the Transformer architecture — attention mechanisms, layer design, and why it dominates modern AI"
date: "2026-04-03"
category: "Fundamentals"
tags: ["transformers", "architecture", "attention", "deep-learning", "neural-networks", "llm"]
author: "LLM Hub Team"
---

# Transformer Architecture Deep Dive

The Transformer architecture, introduced in the 2017 paper ["Attention Is All You Need"](https://arxiv.org/abs/1706.03762) by Vaswani et al., replaced recurrent and convolutional networks as the dominant architecture for sequence modeling. Every major LLM — GPT-4, Llama, Claude, Gemini — is built on Transformer foundations.

This guide provides a technical deep dive into each component.

## High-Level Architecture

```
Input Text
    │
    ▼
┌─────────────────┐
│   Tokenizer     │  → Token IDs
└────────┬────────┘
         ▼
┌─────────────────┐
│ Token Embedding │  → Dense vectors (d_model)
└────────┬────────┘
         ▼
┌─────────────────┐
│ Positional Enc. │  → Add position info
└────────┬────────┘
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Layer 1        │     │ Multi-Head Attn  │
│  ├─ Self-Attn   │────▶│ + Residual + LN  │
│  └─ FFN         │────▶│ FFN + Residual+LN│
└────────┬────────┘     └──────────────────┘
         ▼                    (repeat N×)
┌─────────────────┐     N = 12 (small) to 120+ (frontier)
│  Layer N        │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Output Linear   │  → vocab_size logits
└────────┬────────┘
         ▼
┌─────────────────┐
│   Softmax       │  → Token probabilities
└─────────────────┘
```

## Self-Attention Mechanism

Self-attention allows each token to directly attend to every other token, computing a weighted representation of the entire sequence.

### Scaled Dot-Product Attention

```python
import torch
import torch.nn as nn
import math

def scaled_dot_product_attention(Q, K, V, mask=None):
    """
    Q, K, V: tensors of shape (batch, heads, seq_len, head_dim)
    """
    d_k = Q.size(-1)
    
    # Compute attention scores
    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)
    
    # Apply mask (for causal or padding)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, float('-inf'))
    
    # Softmax normalizes over the sequence dimension
    attention_weights = torch.softmax(scores, dim=-1)
    
    # Weighted sum of values
    output = torch.matmul(attention_weights, V)
    return output, attention_weights
```

**Why scale by √d_k?** Without scaling, large dot products push softmax into regions with tiny gradients, causing the vanishing gradient problem during training.

### Multi-Head Attention

Instead of one attention function, the model runs multiple attention computations in parallel, each with different learned projections:

```python
class MultiHeadAttention(nn.Module):
    def __init__(self, d_model=768, num_heads=12):
        super().__init__()
        assert d_model % num_heads == 0
        self.num_heads = num_heads
        self.head_dim = d_model // num_heads
        
        # Learnable projection matrices
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)
    
    def forward(self, x, mask=None):
        batch_size, seq_len, _ = x.shape
        
        # Project and split into heads
        Q = self.W_q(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        K = self.W_k(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        V = self.W_v(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        
        # Apply attention to each head independently
        attn_output, _ = scaled_dot_product_attention(Q, K, V, mask)
        
        # Concatenate heads and project back
        attn_output = attn_output.transpose(1, 2).contiguous()
        attn_output = attn_output.view(batch_size, seq_len, -1)
        
        return self.W_o(attn_output)
```

**Why multiple heads?** Each head can learn different types of relationships — one head might track subject-verb agreement, another might track coreference, another might track syntactic dependencies.

### Causal (Masked) Attention

For autoregressive generation (GPT-style), tokens can only attend to previous tokens, not future ones:

```python
def causal_mask(seq_len):
    """Create a causal mask: token i can only see tokens 0..i"""
    mask = torch.tril(torch.ones(seq_len, seq_len))
    return mask.unsqueeze(0).unsqueeze(0)  # (1, 1, seq_len, seq_len)

# Example for sequence length 4:
# [[1, 0, 0, 0],    ← token 0 sees only itself
#  [1, 1, 0, 0],    ← token 1 sees 0,1
#  [1, 1, 1, 0],    ← token 2 sees 0,1,2
#  [1, 1, 1, 1]]    ← token 3 sees all
```

## Feed-Forward Network (FFN)

After attention, each position passes through an identical but independently applied feed-forward network:

```python
class FeedForward(nn.Module):
    def __init__(self, d_model=768, d_ff=3072):
        super().__init__()
        self.linear1 = nn.Linear(d_model, d_ff)   # Expand
        self.linear2 = nn.Linear(d_ff, d_model)    # Project back
        self.activation = nn.GELU()
    
    def forward(self, x):
        return self.linear2(self.activation(self.linear1(x)))
```

The expansion factor (typically 4x) gives the model capacity to transform the attended representations non-linearly.

### Gated FFN (Modern Variant)

```python
class GatedFFN(nn.Module):
    """SwiGLU gated FFN — used in Llama, PaLM"""
    def __init__(self, d_model=4096, d_ff=11008):
        super().__init__()
        self.gate = nn.Linear(d_model, d_ff)    # Gate
        self.up   = nn.Linear(d_model, d_ff)    # Value
        self.down = nn.Linear(d_ff, d_model)    # Output
        self.activation = nn.SiLU()  # Swish
    
    def forward(self, x):
        return self.down(self.activation(self.gate(x)) * self.up(x))
```

## Layer Normalization and Residual Connections

```python
# Pre-LayerNorm (modern standard)
class TransformerBlock(nn.Module):
    def __init__(self, d_model, num_heads, d_ff):
        super().__init__()
        self.attn = MultiHeadAttention(d_model, num_heads)
        self.ffn  = FeedForward(d_model, d_ff)
        self.ln1  = nn.LayerNorm(d_model)
        self.ln2  = nn.LayerNorm(d_model)
    
    def forward(self, x, mask=None):
        # Pre-LN: normalize BEFORE the sub-layer
        x = x + self.attn(self.ln1(x), mask)   # Residual + attention
        x = x + self.ffn(self.ln2(x))           # Residual + FFN
        return x
```

**Pre-LN vs Post-LN:**
- **Post-LN** (original): `LN(x + sublayer(x))` — harder to train, needs warmup
- **Pre-LN** (modern): `x + sublayer(LN(x))` — more stable, no warmup needed

**RMSNorm** (used in Llama): A simpler alternative that removes mean-centering, saving ~7-64% compute on normalization.

## Parameter Scaling

| Model | Layers | d_model | Heads | d_ff | Parameters |
|-------|--------|---------|-------|------|-----------|
| GPT-2 Small | 12 | 768 | 12 | 3072 | 124M |
| GPT-2 XL | 48 | 1600 | 25 | 6400 | 1.5B |
| Llama-3-8B | 32 | 4096 | 32 | 14336 | 8B |
| Llama-3-70B | 80 | 8192 | 64 | 28672 | 70B |
| GPT-4 (est.) | ~120 | ~16000 | ~128 | ~52000 | ~1.8T |

## Computational Complexity

For sequence length `n`, model dimension `d`, and `L` layers:

| Component | Complexity | Bottleneck |
|-----------|-----------|------------|
| Self-Attention | O(n² · d) | Quadratic in sequence length |
| FFN | O(n · d²) | Linear in sequence length |
| Total per layer | O(n² · d + n · d²) | Attention dominates for long sequences |

This quadratic attention cost is why long context windows are computationally expensive and why research into efficient attention variants (FlashAttention, linear attention) is so active.

## Modern Architectural Variants

### Mixture of Experts (MoE)

Instead of one FFN per layer, MoE uses multiple "experts" and routes each token to a subset:

```
Token → Router → Expert 1 → Output
                → Expert 2 ↗
```

**Benefits**: Higher capacity with same compute (sparse activation). **Mixtral 8x7B** activates only 2 of 8 experts per token, giving 70B-parameter quality at ~13B compute cost.

### Multi-Query & Grouped-Query Attention

- **MQA**: All heads share one K/V projection → faster inference, less memory
- **GQA**: Heads grouped into K/V sets → balance between quality and speed

**Used by**: Llama-3, Gemini, most efficient serving systems.

## Key Takeaways

- Self-attention enables O(1) path length between any two tokens (vs O(n) for RNNs)
- Multi-head attention allows the model to learn different relationship types
- Pre-LayerNorm and RMSNorm make training more stable
- Modern variants (MoE, GQA, FlashAttention) optimize for inference efficiency
- The quadratic cost of attention is the primary bottleneck for long contexts

## Related Documentation

- **[Tokenization and Embeddings](/docs/tokenization-embeddings)** — Input representation
- **[Training and Pre-training](/docs/model-training-pretraining)** — How Transformers are trained
- **[Inference Optimization](/docs/inference-optimization-quantization)** — Efficient serving
