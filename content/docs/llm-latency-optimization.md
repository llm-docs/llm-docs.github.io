---
title: "LLM Latency Optimization"
description: "Achieving sub-second LLM latency — speculative decoding, model parallelism, prefill optimization, and real-time serving patterns"
date: "2026-04-25"
category: "Deployment & Infrastructure"
tags: ["latency", "performance", "speculative-decoding", "serving", "optimization", "parallelism"]
author: "LLM Hub Team"
---

# LLM Latency Optimization

LLM latency directly impacts user experience, system throughput, and cost. This guide covers techniques for achieving sub-second response times, from algorithmic optimizations like speculative decoding to systems-level approaches like model parallelism and serving architecture design.

## Understanding LLM Latency

LLM inference has two distinct phases:

```
User sends prompt
    │
    ▼
┌─────────────────────┐
│   PREFILL PHASE     │  Process all prompt tokens in parallel
│   (Prompt Encoding)  │  O(n²) in prompt length due to attention
│   Duration: 50-500ms│
└────────┬────────────┘
         │  First token (TTFT)
         ▼
┌─────────────────────┐
│  DECODE PHASE       │  Generate one token at a time autoregressively
│  (Token Generation)  │  O(n) per token, sequential
│  Duration: 10-50ms  │
│  per token          │
└────────┬────────────┘
         │  Each new token
         ▼
┌─────────────────────┐
│   REPEAT DECODE     │  Until EOS or max_tokens
│  ...                │
└─────────────────────┘
```

**Key latency metrics**:

| Metric | Definition | Typical Target | User Impact |
|--------|-----------|----------------|-------------|
| **TTFT** | Time to First Token | &lt;500ms | Perceived responsiveness |
| **TPOT** | Time Per Output Token | &lt;50ms | Generation speed feel |
| **E2E Latency** | Total response time | &lt;3s for 100-token response | Overall wait time |
| **Inter-token Latency** | Time between successive tokens | &lt;30ms | Smooth streaming feel |

## Latency Breakdown and Optimization Opportunities

```
Total Latency = TTFT + (num_tokens × TPOT) + overhead

TTFT = prompt_processing + queue_wait + scheduling
TPOT = attention_compute + sampling + memory_transfer
overhead = network + serialization + tokenization
```

| Component | % of Latency | Optimization |
|-----------|-------------|--------------|
| Prefill computation | 15-25% | FlashAttention, chunked prefill |
| Decode computation | 40-60% | KV cache optimization, speculative decoding |
| Queue wait time | 5-30% | Request batching, instance scaling |
| KV cache management | 10-20% | PagedAttention, cache reuse |
| Network/serialization | 5-10% | gRPC, streaming, compression |
| Tokenization | 1-3% | Caching, parallel processing |

## Speculative Decoding

Speculative decoding uses a small draft model to propose tokens that a large target model then verifies in parallel, dramatically reducing decode latency.

### How It Works

```
Standard Decoding (1 token/step):
Step 1: Large model → "The"
Step 2: Large model → "cat"
Step 3: Large model → "sat"
Step 4: Large model → "on"
Step 5: Large model → "the"
Total: 5 large model forward passes

Speculative Decoding (γ=3, ~2.5 tokens/step):
Step 1: Small model → "The cat sat on"
        Large model verifies: ✓✓✓✓ (all accepted)
Step 2: Small model → "the mat near"
        Large model verifies: ✓✓✗ (3rd rejected, uses "by")
Step 3: Small model → "the window"
        Large model verifies: ✓✓ (both accepted)
Total: 3 large model forward passes for 9 tokens
```

### Implementation

```python
class SpeculativeDecoder:
    """Speculative decoding with a draft model and target model."""

    def __init__(self, draft_model, target_model, gamma: int = 5):
        self.draft = draft_model
        self.target = target_model
        self.gamma = gamma  # Number of tokens to speculate

    async def generate(self, prompt: str, max_tokens: int = 100) -> str:
        tokens = self._tokenize(prompt)
        generated_tokens = []

        while len(generated_tokens) < max_tokens:
            # Step 1: Draft model generates γ tokens autoregressively
            draft_tokens = []
            draft_input = tokens.copy()
            for _ in range(self.gamma):
                next_token = await self.draft.generate_next_token(draft_input)
                draft_tokens.append(next_token)
                draft_input.append(next_token)
                if next_token == self.target.eos_token_id:
                    break

            # Step 2: Target model verifies all draft tokens in one forward pass
            accept_mask = await self._verify_tokens(
                prompt_tokens=tokens,
                draft_tokens=draft_tokens,
            )

            # Step 3: Accept verified tokens
            n_accepted = sum(1 for a in accept_mask if a)
            accepted_tokens = draft_tokens[:n_accepted]
            generated_tokens.extend(accepted_tokens)
            tokens.extend(accepted_tokens)

            # If some tokens were rejected, generate one from target model
            if n_accepted < len(draft_tokens):
                next_token = await self.target.generate_next_token(tokens)
                generated_tokens.append(next_token)
                tokens.append(next_token)
            elif not accept_mask:  # All rejected
                next_token = await self.target.generate_next_token(tokens)
                generated_tokens.append(next_token)
                tokens.append(next_token)

            if tokens[-1] == self.target.eos_token_id:
                break

        return self._decode(generated_tokens)

    async def _verify_tokens(
        self,
        prompt_tokens: list[int],
        draft_tokens: list[int],
    ) -> list[bool]:
        """Verify draft tokens using the target model."""
        # Run target model on prompt + draft tokens
        target_logits = await self.target.forward(prompt_tokens + draft_tokens)

        # Sample from target distribution at each position
        accept_mask = []
        for i, draft_token in enumerate(draft_tokens):
            target_probs = softmax(target_logits[i])
            if target_probs[draft_token] > 0.5:  # Simple threshold
                accept_mask.append(True)
            else:
                accept_mask.append(False)
                break  # Stop at first rejection

        return accept_mask
```

### Speculative Decoding Performance

| Configuration | Draft Model | Target Model | γ | Speedup | Acceptance Rate |
|--------------|-------------|-------------|---|---------|-----------------|
| GPT-4o | GPT-4o-mini | GPT-4o | 4 | 2.1x | 72% |
| Claude Sonnet 4 | Claude Haiku 4 | Claude Sonnet 4 | 5 | 2.4x | 68% |
| Llama 3.1 70B | Llama 3.2 3B | Llama 3.1 70B | 5 | 2.8x | 65% |
| Qwen2.5 72B | Qwen2.5 7B | Qwen2.5 72B | 4 | 2.5x | 70% |
| Self-speculative | — | Any model | 3 | 1.5x | N/A |

**Self-speculative decoding** (no draft model needed):

```python
class SelfSpeculativeDecoder:
    """Speculative decoding using early-exit from the same model."""

    def __init__(self, model, exit_layers: list[int] = None):
        self.model = model
        # Exit at intermediate layers for drafting
        self.exit_layers = exit_layers or [int(model.num_layers * 0.5)]

    async def generate_with_early_exit(self, prompt: str, max_tokens: int = 100) -> str:
        tokens = self._tokenize(prompt)

        for _ in range(max_tokens):
            # Run draft at intermediate layer (fast)
            draft_token = await self.model.early_exit_generate(
                tokens, exit_at_layer=self.exit_layers[0]
            )

            # Verify with full model (parallel)
            verified = await self._verify_with_full_model(tokens, draft_token)

            if verified:
                tokens.append(draft_token)
            else:
                next_token = await self.model.generate_next_token(tokens)
                tokens.append(next_token)

            if tokens[-1] == self.model.eos_token_id:
                break

        return self._decode(tokens)
```

## Prefill Optimization

### FlashAttention

FlashAttention computes exact attention with IO-aware algorithms, reducing memory traffic:

```python
# FlashAttention is typically 2-4x faster than standard attention
# and uses O(1) memory instead of O(n²) for the attention matrix

# Standard attention (slow, memory-intensive):
def standard_attention(Q, K, V):
    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)
    weights = torch.softmax(scores, dim=-1)
    return torch.matmul(weights, V)

# FlashAttention (fast, memory-efficient):
from flash_attn import flash_attn_func

def flash_attention(Q, K, V):
    # Q, K, V shape: (batch, seqlen, nheads, headdim)
    return flash_attn_func(Q, K, V, causal=True)
```

### Chunked Prefill

For long prompts, split prefill into chunks to maintain streaming:

```python
class ChunkedPrefillEngine:
    """Process long prompts in chunks to avoid blocking."""

    def __init__(self, model, chunk_size: int = 2048):
        self.model = model
        self.chunk_size = chunk_size

    async def prefill(self, prompt_tokens: list[int]) -> dict:
        """Process prompt in chunks, returning partial KV cache."""
        kv_cache = None
        total_tokens = len(prompt_tokens)

        for i in range(0, total_tokens, self.chunk_size):
            chunk = prompt_tokens[i:i + self.chunk_size]
            kv_cache = await self.model.process_chunk(
                tokens=chunk,
                previous_kv_cache=kv_cache,
            )

        return {"kv_cache": kv_cache, "processed_tokens": total_tokens}
```

### Prefix Caching

Reuse KV cache for common prefixes across requests:

```python
class PrefixCacher:
    """Cache KV caches for common prompt prefixes."""

    def __init__(self, max_cache_size: int = 1000):
        self.cache: dict[str, dict] = {}  # prefix_hash → KV cache
        self.max_cache_size = max_cache_size
        self.access_order: list[str] = []

    async def get_cached_prefix(self, prompt_tokens: list[int]) -> tuple[list[int], dict]:
        """Find the longest cached prefix, return remaining tokens."""
        for prefix_len in range(len(prompt_tokens), 0, -1):
            prefix = tuple(prompt_tokens[:prefix_len])
            prefix_hash = hash(prefix)

            if prefix_hash in self.cache:
                # Update access order (LRU)
                if prefix_hash in self.access_order:
                    self.access_order.remove(prefix_hash)
                self.access_order.append(prefix_hash)

                return (
                    prompt_tokens[prefix_len:],  # Remaining tokens
                    self.cache[prefix_hash],     # Cached KV state
                )

        return prompt_tokens, None  # No cache hit

    def store_prefix(self, prefix_tokens: list[int], kv_cache: dict):
        """Store a prefix's KV cache."""
        prefix = tuple(prefix_tokens)
        prefix_hash = hash(prefix)

        # Evict LRU if cache is full
        if len(self.cache) >= self.max_cache_size:
            oldest = self.access_order.pop(0)
            del self.cache[oldest]

        self.cache[prefix_hash] = kv_cache
        self.access_order.append(prefix_hash)
```

**Prefix caching impact**:

| Scenario | Cache Hit Rate | Prefill Speedup | Overall Latency Reduction |
|----------|---------------|-----------------|--------------------------|
| System prompts (multi-tenant) | 60-80% | 3-5x | 20-30% |
| Conversation history | 40-60% | 2-3x | 15-25% |
| Code completion (same file) | 70-90% | 5-10x | 30-50% |
| RAG (same context) | 50-70% | 3-5x | 25-35% |
| Random queries | 5-15% | 1.2x | 2-5% |

## Model Parallelism

### Strategies

| Strategy | Description | Best For | Communication Overhead |
|----------|-------------|----------|----------------------|
| **Tensor Parallelism** | Split each layer across GPUs | Single-node, large models | High (every token) |
| **Pipeline Parallelism** | Different layers on different GPUs | Multi-node, very large models | Medium (per layer) |
| **Sequence Parallelism** | Split sequence across GPUs | Very long contexts | Medium |
| **Expert Parallelism** | Different experts on different GPUs (MoE) | Mixture of Experts models | Low (routing only) |

### Tensor Parallelism with vLLM

```python
from vllm import LLM, SamplingParams

# Run a large model across multiple GPUs
llm = LLM(
    model="meta-llama/Llama-3.1-70B-Instruct",
    tensor_parallel_size=4,    # Use 4 GPUs
    gpu_memory_utilization=0.95,
    max_model_len=8192,
    enforce_eager=False,        # Use CUDA graph optimization
)

sampling_params = SamplingParams(
    temperature=0.7,
    max_tokens=500,
    top_p=0.9,
)

# Batch multiple requests
prompts = [
    "Explain quantum computing in simple terms:",
    "Write a Python function to sort a list:",
    "What are the main causes of climate change?",
]

outputs = llm.generate(prompts, sampling_params)
```

## Continuous Batching

Traditional batching requires all requests to finish together. Continuous batching schedules requests independently:

```python
# vLLM's continuous batching (conceptual)
class ContinuousBatchScheduler:
    """Schedule requests as they arrive and complete independently."""

    def __init__(self, model, max_batch_tokens: int = 16384):
        self.model = model
        self.max_batch_tokens = max_batch_tokens
        self.running_requests: list[Request] = []
        self.pending_requests: list[Request] = []

    def add_request(self, request: Request):
        self.pending_requests.append(request)

    async def step(self):
        """Execute one decoding step for all active requests."""
        # Move pending requests to running if we have capacity
        self._admit_requests()

        if not self.running_requests:
            return

        # Build batch from running requests
        batch = self._build_batch()

        # Single forward pass for all requests
        next_tokens = await self.model.decode_batch(batch)

        # Update each request
        completed = []
        for request, next_token in zip(self.running_requests, next_tokens):
            request.append_token(next_token)
            if request.is_complete():
                completed.append(request)

        # Remove completed requests
        for req in completed:
            self.running_requests.remove(req)

    def _admit_requests(self):
        """Admit pending requests if we have capacity."""
        current_tokens = sum(r.num_tokens for r in self.running_requests)
        self.pending_requests.sort(key=lambda r: r.arrival_time)

        while self.pending_requests:
            request = self.pending_requests[0]
            if current_tokens + request.num_tokens <= self.max_batch_tokens:
                self.running_requests.append(self.pending_requests.pop(0))
                current_tokens += request.num_tokens
            else:
                break
```

## Serving Architecture Patterns

### Real-Time Streaming

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    """Streaming chat endpoint."""
    async def generate():
        async for token in llm.stream_generate(
            messages=request.messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        ):
            yield f"data: {json.dumps({'token': token})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering
        },
    )
```

### Latency Optimization Checklist

| Optimization | Effort | Impact | Applies To |
|-------------|--------|--------|-----------|
| FlashAttention | Low (built-in) | 2-4x prefill | All models |
| KV cache reuse | Medium | 2-10x for cached prefixes | Repeated prompts |
| Speculative decoding | Medium | 1.5-3x decode | Any model pair |
| Continuous batching | Low (use vLLM) | 2-5x throughput | Multi-request |
| Prefix caching | Medium | 2-5x prefill | System prompts, RAG |
| Quantization (FP8) | Low | 1.5-2x | Large models |
| Tensor parallelism | Medium | Linear scaling | Large models, multi-GPU |
| Chunked prefill | Low | Reduces TTFT variance | Long prompts |
| Request routing | Medium | Reduces queue time | Multi-provider |
| gRPC over HTTP | Low | 10-20% less overhead | Internal services |

## Monitoring Latency in Production

```python
class LatencyMonitor:
    """Track and alert on LLM latency metrics."""

    def __init__(self):
        self.metrics: list[dict] = []

    def record(self, request_id: str, phase: str, duration_ms: float, tokens: int = None):
        self.metrics.append({
            "request_id": request_id,
            "phase": phase,  # "prefill", "decode", "total"
            "duration_ms": duration_ms,
            "tokens": tokens,
            "timestamp": datetime.utcnow().isoformat(),
        })

    def get_percentiles(self, window_minutes: int = 5) -> dict:
        """Calculate latency percentiles for recent window."""
        cutoff = datetime.utcnow() - timedelta(minutes=window_minutes)
        recent = [m for m in self.metrics if m["timestamp"] >= cutoff.isoformat()]

        durations = sorted(m["duration_ms"] for m in recent)
        if not durations:
            return {}

        return {
            "p50": durations[int(len(durations) * 0.5)],
            "p90": durations[int(len(durations) * 0.9)],
            "p95": durations[int(len(durations) * 0.95)],
            "p99": durations[int(len(durations) * 0.99)],
            "count": len(durations),
            "mean": sum(durations) / len(durations),
        }

    def check_alerts(self) -> list[str]:
        """Check for latency anomalies."""
        alerts = []
        percentiles = self.get_percentiles()

        if percentiles.get("p95", 0) > 1000:
            alerts.append(f"High p95 latency: {percentiles['p95']:.0f}ms")

        if percentiles.get("p99", 0) > 3000:
            alerts.append(f"Very high p99 latency: {percentiles['p99']:.0f}ms")

        # Check for latency regression
        recent = self.get_percentiles(5)
        older = self.get_percentiles(30)
        if recent.get("p50", 0) > older.get("p50", 0) * 1.5:
            alerts.append(f"Latency regression: p50 increased 50%+ from 30m ago")

        return alerts
```

## Cross-References

- For speculative decoding as an optimization technique, see [Speculative Decoding Optimization](/docs/speculative-decoding-optimization)
- For quantization-based speedups, see [Inference Optimization & Quantization](/docs/inference-optimization-quantization)
- For production deployment patterns, see [Deployment Strategies for Production](/docs/deployment-strategies-production)
- For monitoring these metrics in production, see [LLM Observability & Monitoring](/docs/llm-observability-monitoring)
