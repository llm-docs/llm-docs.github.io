---
title: "Inference Optimization and Quantization"
description: "Comprehensive guide to running LLMs efficiently — quantization methods, memory management, batching strategies, and throughput optimization"
date: "2026-04-11"
category: "Deployment & Infrastructure"
tags: ["quantization", "inference", "optimization", "memory", "throughput", "gguf"]
author: "IntuiVortex Team"
---

# Inference Optimization and Quantization

Running LLMs efficiently requires understanding the interplay between model size, precision, memory, and compute. This guide covers all major optimization techniques.

## The Memory Budget

For a model with `P` parameters:

| Component | Memory (FP16) | Memory (INT4) |
|-----------|--------------|---------------|
| Model weights | 2 × P bytes | 0.5 × P bytes |
| KV cache (per token) | 2 × layers × d_model × 2 bytes | Same |
| Activations | Varies by batch size | Same |

**Example for 70B model with 4K context**:

| Component | FP16 | INT4 |
|-----------|------|------|
| Weights | 140 GB | 35 GB |
| KV cache (4K tokens) | 32 GB | 32 GB |
| Activations (batch=1) | 8 GB | 8 GB |
| **Total** | **180 GB** | **75 GB** |

This is why INT4 quantization enables running 70B models on a single 48GB GPU (with some offloading).

## Quantization Methods

### Post-Training Quantization (PTQ)

Quantize after training without additional training:

```python
# GPTQ: Quantize weights to 4-bit with minimal accuracy loss
from auto_gptq import AutoGPTQForCausalLM, BaseQuantizeConfig

model = AutoGPTQForCausalLM.from_pretrained(
    "meta-llama/Llama-3.2-3B",
    quantize_config=BaseQuantizeConfig(bits=4, group_size=128)
)
model.quantize(calibration_dataset)  # 128-512 representative samples
model.save_quantized("./llama-3-gptq-4bit")
```

### AWQ (Activation-Aware Weight Quantization)

Protect important weights by keeping them at higher precision:

```python
# AWQ identifies "salient" weights that contribute most to outputs
# and keeps them at higher precision while quantizing the rest

# Usage via AutoAWQ:
from awq import AutoAWQForCausalLM

model = AutoAWQForCausalLM.from_pretrained("meta-llama/Llama-3.2-3B")
model.quantize(calibration_dataset, quant_method="awq", bits=4)
model.save_quantized("./llama-3-awq-4bit")
```

### GGUF (llama.cpp format)

The standard for CPU and edge inference:

```bash
# Convert to GGUF
python convert-hf-to-gguf.py meta-llama/Llama-3.2-3B \
    --outfile llama-3-3b.Q4_K_M.gguf \
    --outtype q4_k_m  # Quality: medium, 4-bit

# Run with llama.cpp
./llama-cli \
    --model llama-3-3b.Q4_K_M.gguf \
    --prompt "Hello, world!" \
    --n-gpu-layers 35  # Offload 35 layers to GPU (rest on CPU)
```

| GGUF Quantization | Size (7B) | Size (70B) | Quality |
|-------------------|-----------|-----------|---------|
| Q2_K | 2.6 GB | 26 GB | Noticeable degradation |
| Q3_K_M | 3.3 GB | 33 GB | Good for most tasks |
| Q4_K_M | 4.2 GB | 42 GB | Near-FP16 quality |
| Q5_K_M | 4.9 GB | 49 GB | Very close to FP16 |
| Q6_K | 5.7 GB | 57 GB | Essentially FP16 |
| Q8_0 | 7.4 GB | 74 GB | Identical to FP16 |

## Memory Optimization Techniques

### 1. KV Cache Management

```python
# Sliding window KV cache (only keep recent context in GPU memory)
class SlidingWindowKVCache:
    def __init__(self, window_size=4096):
        self.window_size = window_size
        self.k_cache = []
        self.v_cache = []
    
    def append(self, k_new, v_new):
        self.k_cache.append(k_new)
        self.v_cache.append(v_new)
        
        # Evict old entries if over window
        if len(self.k_cache) > self.window_size:
            self.k_cache = self.k_cache[-self.window_size:]
            self.v_cache = self.v_cache[-self.window_size:]
    
    def get(self):
        return torch.cat(self.k_cache, dim=1), torch.cat(self.v_cache, dim=1)
```

### 2. Offloading

Move less-used parts of the model to CPU/disk:

```python
from accelerate import infer_auto_device_map, load_checkpoint_and_dispatch

# Offload some layers to CPU
device_map = infer_auto_device_map(
    model,
    max_memory={0: "20GB", "cpu": "64GB"},  # GPU 0: 20GB, CPU: 64GB
)

model = load_checkpoint_and_dispatch(
    model,
    device_map=device_map,
    offload_folder="offload",  # Disk offload path
)
```

**Trade-off**: CPU offloading is 10-50× slower than GPU but enables running models that don't fit in GPU memory.

### 3. Tensor Parallelism

Split model across multiple GPUs:

```python
# vLLM tensor parallelism
from vllm import LLM

llm = LLM(
    model="meta-llama/Llama-3.1-70B-Instruct",
    tensor_parallel_size=4,  # Split across 4 GPUs
    gpu_memory_utilization=0.9,  # Use 90% of GPU memory
)
```

## Batching Strategies

### Static Batching

```python
# Process multiple prompts in parallel
prompts = ["Hello", "What is AI?", "Write code"]
outputs = model.generate(prompts, max_tokens=100)
```

**Problem**: All outputs wait for the longest generation to finish.

### Continuous Batching (vLLM)

```
Request 1: ████████████████ (done at t=5)
Request 2: ████████████████████ (done at t=7)
Request 3:         ████████████ (done at t=9, started after Req 1 finished)
Request 4:                 ██████████████ (done at t=12)
```

Requests are added and removed dynamically, maximizing GPU utilization.

## Throughput vs. Latency

| Optimization | Throughput | Per-Request Latency | Best For |
|-------------|-----------|-------------------|----------|
| **Large batch** | High | High (queuing) | Batch processing, offline jobs |
| **Small batch** | Low | Low | Interactive chat |
| **Speculative decoding** | High | Low | Best of both |
| **Quantization** | Higher | Lower | All scenarios |
| **Tensor parallelism** | Same | Lower (for large models) | Models that don't fit one GPU |

## Benchmarking Your Setup

```python
import time
from vllm import LLM, SamplingParams

llm = LLM(model="meta-llama/Llama-3.2-3B")
params = SamplingParams(max_tokens=100, temperature=0.7)

# Benchmark
prompts = ["Explain quantum physics"] * 100  # 100 identical prompts

start = time.time()
outputs = llm.generate(prompts, params)
elapsed = time.time() - start

print(f"Total time: {elapsed:.1f}s")
print(f"Throughput: {len(prompts) / elapsed:.1f} req/s")
print(f"Tokens/sec: {sum(len(o.outputs[0].token_ids) for o in outputs) / elapsed:.0f}")
```

## Key Takeaways

- INT4 quantization reduces memory by 4× with ~2-5% accuracy loss
- GGUF format enables CPU inference for models up to 13B
- KV cache often dominates memory for long generations
- Continuous batching dramatically improves throughput
- Always benchmark your specific workload — theoretical speedups may not materialize

## Related Documentation

- **[Speculative Decoding](/docs/speculative-decoding-optimization)** — Generation speedup techniques
- **[Deployment Strategies](/docs/deployment-strategies-production)** — Production serving
- **[Cost Management](/docs/cost-management-optimization)** — Managing LLM spend
