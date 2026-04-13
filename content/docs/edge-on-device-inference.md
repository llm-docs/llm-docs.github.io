---
title: "Edge and On-Device LLM Inference"
description: "Running LLMs on phones, laptops, and IoT devices — model selection, optimization frameworks, and practical deployment guides for edge computing"
date: "2026-04-13"
category: "Deployment & Infrastructure"
tags: ["edge", "on-device", "mobile", "iot", "local-inference", "optimization"]
author: "LLM Hub Team"
---

# Edge and On-Device LLM Inference

Running LLMs locally on edge devices — phones, laptops, Raspberry Pi, and embedded systems — offers complete privacy, zero latency, and no API costs. But it requires aggressive optimization.

## Hardware Landscape

| Device | RAM | Neural Accelerator | Max Practical Model |
|--------|-----|-------------------|-------------------|
| **iPhone 15/16** | 8GB | Neural Engine (16-core) | 3B (MLX, CoreML) |
| **Android (flagship)** | 12GB | Snapdragon NPU | 7B (MLC, QNN) |
| **MacBook M3** | 16-36GB | Neural Engine (16-core) | 70B (MLX, llama.cpp) |
| **Windows laptop** | 16GB | NPU (Intel/AMD) | 7B (ONNX) |
| **Raspberry Pi 5** | 8GB | None (CPU only) | 1B (llama.cpp) |
| **NVIDIA Jetson Orin** | 16-64GB | GPU (2048-core) | 13B (TensorRT) |

## Inference Frameworks

### llama.cpp (Universal)

The most widely used edge inference engine:

```bash
# Convert model to GGUF
python convert-hf-to-gguf.py meta-llama/Llama-3.2-1B \
    --outfile llama-3.2-1b.Q4_K_M.gguf \
    --outtype q4_k_m

# Run on CPU
./llama-cli \
    --model llama-3.2-1b.Q4_K_M.gguf \
    --prompt "Hello, world!" \
    --threads 8 \
    --n-predict 200

# Run on Mac with Metal acceleration
./llama-cli \
    --model llama-3.2-1b.Q4_K_M.gguf \
    --prompt "Hello!" \
    --n-gpu-layers 999  # Offload all layers to GPU
```

### MLX (Apple Silicon)

Apple's framework optimized for M-series chips:

```python
import mlx.core as mx
from mlx_lm import load, generate

model, tokenizer = load("mlx-community/Llama-3.2-3B-Instruct-4bit")

prompt = "Explain quantum computing simply."
response = generate(model, tokenizer, prompt=prompt, max_tokens=200, temp=0.7)
print(response)
```

**Why MLX?** Unified memory architecture of Apple Silicon means CPU and GPU share memory — no data transfer overhead.

### MLC LLM (Cross-Platform)

Compiles models to run on any GPU (mobile, desktop, web):

```python
from mlc_llm import MLCEngine

engine = MLCEngine(model="Llama-3.2-3B-Instruct-q4f16_1")
response = engine.chat.completions.create(
    messages=[{"role": "user", "content": "Hello!"}]
)
```

**Platforms**: iOS, Android, macOS, Linux, Windows, WebGPU (browser).

### ONNX Runtime (Windows/Android)

```python
import onnxruntime_genai as og

model = og.Model("Llama-3.2-3B-Instruct-onnx")
tokenizer = og.Tokenizer(model)

inputs = tokenizer.encode("Hello, world!")
outputs = model.generate(inputs, max_length=200)
print(tokenizer.decode(outputs[0]))
```

## Recommended Models for Edge

### Tiny Models (< 1B parameters)

| Model | Size (Q4) | Speed (CPU) | Quality | Best For |
|-------|----------|-------------|---------|----------|
| Qwen2.5-0.5B | 300MB | 50 tok/s | Basic | IoT, microcontrollers |
| Llama-3.2-1B | 600MB | 30 tok/s | Good for size | Mobile, embedded |
| Phi-3.5-mini (3.8B) | 2.2GB | 15 tok/s | Surprisingly good | Laptops, phones |

### Small Models (1-7B parameters)

| Model | Size (Q4) | Speed (M3 Mac) | Quality | Best For |
|-------|----------|---------------|---------|----------|
| Llama-3.2-3B | 2GB | 40 tok/s | Very good | General mobile use |
| Gemma-2-2B | 1.5GB | 50 tok/s | Good | Lightweight assistant |
| Mistral-7B | 4GB | 20 tok/s | Excellent | Laptops, development |
| Qwen2.5-7B | 4.5GB | 18 tok/s | Strong multilingual | Multilingual edge |

## On-Device RAG

Combine local LLM with local knowledge base:

```python
# On-device RAG pipeline
from sentence_transformers import SentenceTransformer
import faiss

# Embed documents on device (runs once)
embedder = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
doc_embeddings = embedder.encode(local_documents)

# Build local index
index = faiss.IndexFlatIP(doc_embeddings.shape[1])
index.add(doc_embeddings.astype("float32"))

# Query
def local_rag(query: str, k: int = 3) -> str:
    query_embed = embedder.encode([query])
    _, indices = index.search(query_embed.astype("float32"), k)
    
    context = "\n".join([local_documents[i] for i in indices[0]])
    prompt = f"Based on the following context:\n\n{context}\n\nAnswer: {query}"
    
    return generate(model, tokenizer, prompt=prompt, max_tokens=200)
```

## Performance Optimization for Edge

### 1. Model Selection Criteria

```python
def select_edge_model(
    device_ram: int,         # GB
    target_speed: int,       # tokens/sec
    quality_requirement: str,  # "low", "medium", "high"
) -> str:
    """Pick the best model for device constraints."""
    candidates = {
        "high": [("Mistral-7B", 4), ("Qwen2.5-7B", 4.5)],
        "medium": [("Phi-3.5-mini", 2.2), ("Llama-3.2-3B", 2)],
        "low": [("Llama-3.2-1B", 0.6), ("Qwen2.5-0.5B", 0.3)],
    }
    
    for model_name, size_gb in candidates[quality_requirement]:
        if size_gb < device_ram * 0.6:  # Leave 40% for OS + KV cache
            return model_name
    
    return "Qwen2.5-0.5B"  # Fallback to smallest
```

### 2. Memory Management

```python
# Pre-allocate KV cache to avoid allocation during generation
# llama.cpp does this automatically, but custom implementations need:

class EdgeKVCache:
    def __init__(self, max_tokens=4096, num_layers=32, num_heads=32, head_dim=128):
        # Pre-allocate: max_tokens × layers × heads × head_dim × 2 bytes (FP16)
        memory = max_tokens * num_layers * num_heads * head_dim * 2 / (1024**3)
        print(f"Pre-allocating {memory:.1f} GB for KV cache")
        
        self.k_cache = torch.zeros(max_tokens, num_layers, num_heads, head_dim, 
                                   dtype=torch.float16)
        self.v_cache = torch.zeros(max_tokens, num_layers, num_heads, head_dim, 
                                   dtype=torch.float16)
```

### 3. Battery Optimization

```python
# Throttle generation speed to save battery
def battery_aware_generation(prompt: str, battery_pct: float) -> str:
    if battery_pct < 20:
        # Low battery: use smallest model, fewer tokens
        model = load_smallest_model()
        return generate(model, prompt, max_tokens=100, temp=0.1)
    elif battery_pct < 50:
        # Medium: use standard settings
        model = load_standard_model()
        return generate(model, prompt, max_tokens=300)
    else:
        # Full battery: use best quality
        model = load_best_model()
        return generate(model, prompt, max_tokens=500, temp=0.7)
```

## Privacy Benefits of Edge Inference

```
Cloud API:                    On-Device:
User → Prompt → Internet → Server → Response → User    User → Prompt → Local Model → Response
              ↑                                               
         Data leaves device                            No data leaves device
```

**Compliance**: On-device inference naturally satisfies GDPR, HIPAA, and other data privacy regulations since data never leaves the user's device.

## Key Takeaways

- llama.cpp is the universal choice for CPU/edge inference
- MLX is best for Apple Silicon; MLC LLM for cross-platform GPU
- 1-3B models at Q4 quantization run well on modern phones
- On-device RAG enables private, offline knowledge systems
- Edge inference eliminates API costs and data privacy concerns
- Battery and memory management are critical on mobile devices

## Related Documentation

- **[Quantization](/docs/inference-optimization-quantization)** — Making models small enough for edge
- **[RAG Systems](/docs/rag-retrieval-augmented-generation)** — Adding local knowledge
- **[Deployment Strategies](/docs/deployment-strategies-production)** — When to use edge vs. cloud
