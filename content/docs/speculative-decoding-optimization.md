---
title: "Speculative Decoding and Generation Optimization"
description: "Speeding up LLM generation — speculative decoding, cache optimization, batched inference, and throughput maximization techniques"
date: "2026-04-10"
category: "Architecture & Training"
tags: ["speculative-decoding", "optimization", "inference", "throughput", "generation", "caching"]
author: "IntuiVortex Team"
---

# Speculative Decoding and Generation Optimization

Autoregressive generation is inherently sequential — each token depends on all previous tokens. This makes generation the bottleneck for most LLM applications. Speculative decoding and other optimization techniques can achieve 2-4× speedups without quality loss.

## The Generation Bottleneck

```
# Standard autoregressive generation
prompt → forward pass → token_1 → forward pass → token_2 → ... → token_n
          (fast)           (slow)      (slow)           (slow)       (slow)
```

Each token requires a full forward pass through the entire model. For a 70B model, this means billions of FLOPs per token.

## Speculative Decoding

Use a small "draft" model to propose multiple tokens, then verify them with the large "target" model in a single forward pass:

```
Draft model (7B):    proposes: [A, B, C, D, E]  (5 fast forward passes)
Target model (70B):  verifies: [A, B, C, D, E]  (1 forward pass for ALL tokens)
                     accepts:  [A, B, C] ✓
                     rejects:  [D, E] ✗ → resamples from D
```

```python
def speculative_decode(draft_model, target_model, prompt, 
                       num_draft_tokens=4, temperature=0.7):
    """
    Speculative decoding: draft proposes, target verifies.
    """
    generated = []
    
    while not is_complete(generated):
        # Draft model proposes k tokens
        draft_tokens = draft_model.generate(
            prompt + generated, 
            num_tokens=num_draft_tokens
        )
        
        # Target model verifies ALL draft tokens in one pass
        target_probs = target_model.get_probabilities(
            prompt + generated + draft_tokens
        )
        
        # Accept/reject each draft token
        accepted = 0
        for i, (draft_token, probs) in enumerate(zip(draft_tokens, target_probs)):
            if accept_token(draft_token, probs, temperature):
                accepted += 1
                generated.append(draft_token)
            else:
                # Sample from target distribution for rejected token
                generated.append(sample_from(probs))
                break  # Stop verifying after first rejection
        
        # Speedup: accepted tokens were "free" (no target forward pass)
        # Typical acceptance rate: 60-80% for well-matched draft models
    
    return generated
```

### Draft Model Selection

| Target Model | Good Draft Model | Acceptance Rate | Speedup |
|-------------|-----------------|----------------|---------|
| Llama 3 70B | Llama 3 8B | 70-80% | 2.5-3.0× |
| GPT-4 | GPT-4o mini | 60-75% | 2.0-2.5× |
| Llama 3 8B | Llama 3 1B | 65-75% | 2.0-2.5× |

**Key insight**: The draft model should be from the same family as the target for highest acceptance rates.

## KV Cache Optimization

The KV cache stores previously computed key and value vectors to avoid recomputation:

```python
# Without cache: recompute all previous KVs for each new token
# With cache: only compute new token's KVs

class KVCache:
    def __init__(self, max_batch_size, max_seq_len, num_heads, head_dim):
        self.k_cache = torch.zeros(max_batch_size, max_seq_len, num_heads, head_dim)
        self.v_cache = torch.zeros(max_batch_size, max_seq_len, num_heads, head_dim)
        self.seq_len = 0
    
    def update(self, k_new, v_new):
        """Add new tokens to cache."""
        self.k_cache[:, self.seq_len:self.seq_len + k_new.size(1)] = k_new
        self.v_cache[:, self.seq_len:self.seq_len + v_new.size(1)] = v_new
        self.seq_len += k_new.size(1)
        return self.k_cache[:, :self.seq_len], self.v_cache[:, :self.seq_len]
```

### PagedAttention (vLLM)

Standard KV caching wastes memory due to fragmentation. PagedAttention uses OS-style paging:

```
Logical KV cache:    [block_0, block_1, block_2, block_3, ...]
Physical blocks:     scattered in GPU memory, managed by page table
```

**Benefits**:
- Near-zero memory waste (unlike standard caching)
- Enables much higher batch sizes
- 2-4× throughput improvement

**Used by**: vLLM (the dominant serving framework).

## Batched Inference

Process multiple requests simultaneously:

```python
# Continuous batching: add/remove requests dynamically
# Unlike static batching, requests finish at different times

class ContinuousBatcher:
    def __init__(self, max_batch_size=128):
        self.requests = {}  # request_id → state
        self.max_batch_size = max_batch_size
    
    def step(self):
        """Run one forward pass for all active requests."""
        # Gather next token input for each request
        batch_inputs = [req.next_input for req in self.requests.values()]
        
        # Single forward pass for ALL requests
        outputs = model(batch_inputs)
        
        # Process outputs individually
        finished = []
        for req_id, output in zip(self.requests.keys(), outputs):
            req = self.requests[req_id]
            if req.is_complete(output):
                finished.append(req_id)
            req.append_token(output)
        
        # Remove finished requests (free their KV cache)
        for req_id in finished:
            del self.requests[req_id]
```

## Quantization for Inference

| Method | Bits | Quality | Memory | Speed |
|--------|------|---------|--------|-------|
| FP16/BF16 | 16 | Baseline | 100% | Baseline |
| INT8 (smooth quant) | 8 | ~99% | 50% | 1.5× |
| INT4 (AWQ/GPTQ) | 4 | ~95-98% | 25% | 2-3× |
| FP8 | 8 | ~99% | 50% | 1.8× (H100+) |

```python
# GPTQ 4-bit quantization
from auto_gptq import AutoGPTQForCausalLM, BaseQuantizeConfig

quantize_config = BaseQuantizeConfig(
    bits=4,
    group_size=128,
    desc_act=False,
)

model = AutoGPTQForCausalLM.from_pretrained("meta-llama/Llama-3.2-3B", quantize_config)
model.quantize(calibration_data)
model.save_quantized("./quantized-model")
```

## FlashAttention

FlashAttention computes attention in IO-aware blocks, reducing memory reads:

```python
from flash_attn import flash_attn_func

# Standard attention: O(n²) memory reads
attn = torch.softmax(Q @ K.T / sqrt(d), dim=-1) @ V

# FlashAttention: same computation, 2-4× less memory I/O
attn = flash_attn_func(Q, K, V, causal=True)
```

**Key insight**: The bottleneck is often memory bandwidth, not compute. FlashAttention reorganizes computation to minimize memory transfers.

## Production Serving Systems

| System | Key Features | Best For |
|--------|-------------|----------|
| **vLLM** | PagedAttention, continuous batching | High-throughput API serving |
| **TGI** | Token streaming, quantization | Hugging Face ecosystem |
| **TensorRT-LLM** | NVIDIA-optimized, TensorRT | Maximum NVIDIA GPU performance |
| **SGLang** | Structured generation, RadixAttention | Complex generation patterns |
| **Ollama** | Simple, local, multi-model | Desktop/local development |
| **llama.cpp** | CPU + GPU, GGUF format | Low-resource, edge deployment |

## Key Takeaways

- Speculative decoding achieves 2-4× speedup with zero quality loss
- KV cache is essential; PagedAttention eliminates memory waste
- Continuous batching maximizes GPU utilization
- INT4 quantization halves memory with minimal quality impact
- FlashAttention is the standard for efficient attention computation
- Choose your serving system based on throughput vs. latency needs

## Related Documentation

- **[Inference Optimization](/docs/inference-optimization-quantization)** — Comprehensive optimization guide
- **[Transformer Architecture](/docs/transformer-architecture)** — Understanding KV cache requirements
- **[Deployment Strategies](/docs/deployment-strategies-production)** — Serving models in production
