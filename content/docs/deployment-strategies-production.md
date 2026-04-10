---
title: "Deployment Strategies for Production"
description: "Serving LLMs in production — API design, autoscaling, load balancing, monitoring, and reliability patterns for high-availability model serving"
date: "2026-04-11"
category: "Deployment & Infrastructure"
tags: ["deployment", "production", "api", "scaling", "monitoring", "reliability"]
author: "LLM Hub Team"
---

# Deployment Strategies for Production

Moving an LLM from prototype to production requires addressing challenges in latency, throughput, reliability, and cost. This guide covers the full stack of production serving.

## Deployment Options

### 1. Cloud API (Managed)

| Provider | Models | Pricing | SLA |
|----------|--------|---------|-----|
| OpenAI | GPT-4o, o1, GPT-4o mini | $/token | 99.9% |
| Anthropic | Claude Sonnet, Opus | $/token | 99.9% |
| Google | Gemini Pro, Flash | $/token | 99.9% |
| Together AI | Open-source models | $/token | 99.5% |
| Groq | Llama, Mixtral (ultra-fast) | $/token | 99.5% |

**Pros**: No infrastructure management, automatic scaling, latest models.
**Cons**: Per-token costs add up, data leaves your network, rate limits.

### 2. Self-Hosted (Cloud GPUs)

```yaml
# Example: Kubernetes deployment on cloud GPUs
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llama-3-70b
spec:
  replicas: 3
  selector:
    matchLabels:
      app: llm-server
  template:
    spec:
      containers:
      - name: vllm
        image: vllm/vllm-openai:latest
        command:
        - python3
        - -m
        - vllm.entrypoints.openai.api_server
        - --model
        - meta-llama/Llama-3.1-70B-Instruct
        - --tensor-parallel-size
        - "4"  # 4 GPUs per replica
        - --max-num-seqs
        - "256"
        resources:
          limits:
            nvidia.com/gpu: 4
        ports:
        - containerPort: 8000
```

**GPU Cost Estimates (monthly)**:
| GPU | VRAM | Cost (AWS) | Models Supported |
|-----|------|-----------|-----------------|
| A10G | 24GB | ~$800 | 7B (quantized) |
| A100 | 80GB | ~$3,500 | 70B (tensor parallel) |
| H100 | 80GB | ~$5,000 | 70B+, 405B (multi-node) |
| L40S | 48GB | ~$2,000 | 8B-13B |

### 3. Hybrid (Router)

Route requests between cloud API and self-hosted based on cost, latency, and content:

```python
class ModelRouter:
    def __init__(self):
        self.cloud_client = OpenAI()
        self.self_hosted_url = "http://internal-llm:8000"
    
    def route(self, request: str, priority: str = "balanced") -> str:
        if priority == "cost":
            return self.self_hosted_query(request)
        elif priority == "quality":
            return self.cloud_query(request, model="gpt-4o")
        else:  # balanced
            if self.self_hosted_healthy():
                return self.self_hosted_query(request)
            return self.cloud_query(request, model="gpt-4o-mini")
```

## API Design Patterns

### Streaming Responses

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio

app = FastAPI()

@app.post("/v1/chat/completions")
async def chat_completion(request: ChatRequest):
    async def generate():
        for token in model.stream_generate(request.messages):
            chunk = {
                "id": f"chatcmpl-{uuid4()}",
                "object": "chat.completion.chunk",
                "choices": [{
                    "delta": {"content": token},
                    "index": 0,
                }],
            }
            yield f"data: {json.dumps(chunk)}\n\n"
        
        # Final chunk
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

### Rate Limiting

```python
from fastapi import Request, HTTPException
import time

class RateLimiter:
    def __init__(self, requests_per_minute=60, tokens_per_minute=100000):
        self.requests = {}  # user_id → [(timestamp, tokens)]
        self.rpm = requests_per_minute
        self.tpm = tokens_per_minute
    
    async def check(self, request: Request, user_id: str, tokens: int):
        now = time.time()
        minute_ago = now - 60
        
        # Clean old entries
        if user_id in self.requests:
            self.requests[user_id] = [
                (ts, tok) for ts, tok in self.requests[user_id]
                if ts > minute_ago
            ]
        else:
            self.requests[user_id] = []
        
        # Check limits
        if len(self.requests[user_id]) >= self.rpm:
            raise HTTPException(429, "Too many requests")
        
        total_tokens = sum(t for _, t in self.requests[user_id])
        if total_tokens + tokens > self.tpm:
            raise HTTPException(429, "Token limit exceeded")
        
        self.requests[user_id].append((now, tokens))
```

## Autoscaling

### Kubernetes HPA (Horizontal Pod Autoscaler)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: llm-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: llm-server
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: queue_depth
      target:
        type: AverageValue
        averageValue: 50
```

### Scale-to-Zero (Serverless)

For infrequently used models:

| Platform | Cold Start | Max GPU | Notes |
|----------|-----------|---------|-------|
| Modal | 5-15s | H100 | GPU serverless |
| RunPod | 10-30s | A100-H100 | Serverless GPUs |
| Baseten | 5-20s | A100 | Model-focused |
| Replicate | 3-10s | Various | Easy deployment |

## Load Balancing

```python
# Round-robin with health checks
class LoadBalancer:
    def __init__(self, backends: list[str]):
        self.backends = backends
        self.current = 0
        self.health = {b: True for b in backends}
    
    def next_backend(self) -> str:
        healthy = [b for b in self.backends if self.health[b]]
        if not healthy:
            raise Exception("All backends unhealthy")
        
        backend = healthy[self.current % len(healthy)]
        self.current += 1
        return backend
    
    async def health_check(self):
        for backend in self.backends:
            try:
                await asyncio.wait_for(
                    httpx.get(f"{backend}/health"), timeout=5
                )
                self.health[backend] = True
            except:
                self.health[backend] = False
```

## Monitoring

### Key Metrics

| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| **P50 latency** | > 500ms | Check GPU utilization |
| **P99 latency** | > 5s | Check for long outputs, scale up |
| **Error rate** | > 1% | Check OOM, model crashes |
| **GPU memory** | > 90% | Scale up, reduce batch |
| **Queue depth** | > 100 | Scale replicas |
| **Token throughput** | Degraded | Check for throttling |

### Prometheus + Grafana Dashboard

```python
from prometheus_client import Counter, Histogram, start_http_server

REQUEST_COUNT = Counter("llm_requests_total", "Total LLM requests", ["model", "status"])
REQUEST_LATENCY = Histogram("llm_request_latency_seconds", "Request latency", ["model"])
TOKEN_COUNT = Counter("llm_tokens_total", "Total tokens processed", ["type"])

# In your request handler:
@REQUEST_LATENCY.labels(model="llama-3-70b").time():
    response = model.generate(prompt)

REQUEST_COUNT.labels(model="llama-3-70b", status="success").inc()
TOKEN_COUNT.labels(type="input").inc(input_tokens)
TOKEN_COUNT.labels(type="output").inc(output_tokens)
```

## Key Takeaways

- Cloud APIs are fastest to deploy; self-hosting is cheapest at scale
- Streaming responses improve perceived latency dramatically
- Always implement rate limiting to protect against abuse
- Monitor GPU memory, queue depth, and error rates
- Use a router pattern to blend cloud and self-hosted for cost optimization

## Related Documentation

- **[Inference Optimization](/docs/inference-optimization-quantization)** — Making models faster and smaller
- **[Cost Management](/docs/cost-management-optimization)** — Managing LLM spend at scale
- **[Speculative Decoding](/docs/speculative-decoding-optimization)** — Speed optimization techniques
