---
title: "LLM Networking and API Design"
description: "Designing robust APIs for LLM services — request/response schemas, streaming, error handling, versioning, and gateway patterns"
date: "2026-04-15"
category: "Evaluation & Safety"
tags: ["api-design", "networking", "streaming", "error-handling", "gateway", "microservices"]
author: "LLM Hub Team"
---

# LLM Networking and API Design

Building production LLM services requires thoughtful API design to handle streaming responses, token-based billing, rate limiting, model versioning, and graceful degradation.

## OpenAI-Compatible API Design

The OpenAI chat completions format has become the de facto standard. Designing your service to be compatible with it enables drop-in model substitution:

```python
from pydantic import BaseModel, Field
from typing import Literal, Optional

# Request schema
class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant", "tool"]
    content: str
    tool_calls: Optional[list] = None
    tool_call_id: Optional[str] = None

class ChatCompletionRequest(BaseModel):
    model: str = "llama-3-70b"
    messages: list[ChatMessage]
    temperature: float = Field(default=0.7, ge=0, le=2)
    top_p: float = Field(default=1.0, ge=0, le=1)
    max_tokens: Optional[int] = None
    stream: bool = False
    stop: Optional[list[str]] = None
    tools: Optional[list[dict]] = None
    response_format: Optional[dict] = None

# Response schema
class ChatCompletionChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: Literal["stop", "length", "tool_calls", "content_filter"]

class Usage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

class ChatCompletionResponse(BaseModel):
    id: str
    object: Literal["chat.completion"] = "chat.completion"
    created: int
    model: str
    choices: list[ChatCompletionChoice]
    usage: Usage
```

## Streaming Implementation

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import json
import uuid
import time

app = FastAPI()

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    if request.stream:
        return StreamingResponse(
            stream_completion(request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            }
        )
    else:
        return await non_streaming_completion(request)

async def stream_completion(request: ChatCompletionRequest):
    """Generate tokens one at a time and stream them."""
    completion_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    created = int(time.time())
    total_tokens = 0
    
    # Send initial chunk
    yield format_stream_chunk(completion_id, created, request.model, "", index=0)
    
    # Stream tokens
    for token in model.generate_stream(
        messages=request.messages,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
    ):
        total_tokens += 1
        yield format_stream_chunk(
            completion_id, created, request.model, token, index=0
        )
    
    # Send final [DONE] marker
    yield "data: [DONE]\n\n"

def format_stream_chunk(completion_id: str, created: int, model: str, 
                        content: str, index: int = 0) -> str:
    """Format a single SSE chunk."""
    chunk = {
        "id": completion_id,
        "object": "chat.completion.chunk",
        "created": created,
        "model": model,
        "choices": [{
            "index": index,
            "delta": {"content": content} if content else {},
            "finish_reason": None,
        }],
    }
    return f"data: {json.dumps(chunk)}\n\n"
```

## Error Handling

```python
from fastapi import HTTPException
from enum import Enum

class ErrorCode(str, Enum):
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    CONTEXT_LENGTH_EXCEEDED = "context_length_exceeded"
    INVALID_REQUEST = "invalid_request_error"
    MODEL_NOT_FOUND = "model_not_found"
    INSUFFICIENT_QUOTA = "insufficient_quota"
    SERVER_ERROR = "api_error"

class APIError(BaseModel):
    error: dict

def handle_llm_error(error: Exception) -> APIError:
    """Map LLM errors to HTTP responses."""
    if isinstance(error, ContextLengthExceeded):
        raise HTTPException(
            status_code=400,
            detail=APIError(error={
                "type": ErrorCode.CONTEXT_LENGTH_EXCEEDED,
                "message": f"Context length exceeded. Max tokens: {error.max_tokens}",
                "param": "max_tokens",
                "code": ErrorCode.CONTEXT_LENGTH_EXCEEDED,
            }).model_dump()
        )
    elif isinstance(error, RateLimitExceeded):
        raise HTTPException(
            status_code=429,
            detail=APIError(error={
                "type": ErrorCode.RATE_LIMIT_EXCEEDED,
                "message": "Rate limit exceeded. Please retry.",
                "param": None,
                "code": ErrorCode.RATE_LIMIT_EXCEEDED,
            }).model_dump(),
            headers={"Retry-After": str(error.retry_after_seconds)},
        )
    elif isinstance(error, ModelNotFound):
        raise HTTPException(
            status_code=404,
            detail=APIError(error={
                "type": ErrorCode.MODEL_NOT_FOUND,
                "message": f"Model '{error.model_name}' not found",
                "param": "model",
                "code": ErrorCode.MODEL_NOT_FOUND,
            }).model_dump()
        )
    else:
        raise HTTPException(
            status_code=500,
            detail=APIError(error={
                "type": ErrorCode.SERVER_ERROR,
                "message": "Internal server error",
                "param": None,
                "code": ErrorCode.SERVER_ERROR,
            }).model_dump()
        )
```

## Rate Limiting

```python
from fastapi import Request
import time
from collections import defaultdict

class TokenBucketRateLimiter:
    """Token bucket algorithm for smooth rate limiting."""
    
    def __init__(self, rate: int, capacity: int):
        self.rate = rate           # Tokens per second
        self.capacity = capacity   # Max burst
        self.buckets: dict[str, dict] = defaultdict(
            lambda: {"tokens": capacity, "last_refill": time.time()}
        )
    
    def consume(self, user_id: str, tokens: int = 1) -> bool:
        bucket = self.buckets[user_id]
        now = time.time()
        
        # Refill tokens
        elapsed = now - bucket["last_refill"]
        bucket["tokens"] = min(
            bucket["capacity"],
            bucket["tokens"] + elapsed * self.rate
        )
        bucket["last_refill"] = now
        
        # Try to consume
        if bucket["tokens"] >= tokens:
            bucket["tokens"] -= tokens
            return True
        return False

# Usage
limiter = TokenBucketRateLimiter(rate=10, capacity=60)  # 10 req/s, 60 burst

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    user_id = request.headers.get("X-User-ID", request.client.host)
    
    if not limiter.consume(user_id):
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded"},
            headers={"Retry-After": "1"},
        )
    
    return await call_next(request)
```

## Model Router Gateway

```python
class ModelGateway:
    """Route requests to appropriate models based on requirements."""
    
    def __init__(self):
        self.models = {
            "fast": {"endpoint": "http://llama-3-8b:8000", "cost_per_1k": 0.0001},
            "balanced": {"endpoint": "http://llama-3-70b:8000", "cost_per_1k": 0.0005},
            "quality": {"endpoint": "http://claude-sonnet:8000", "cost_per_1k": 0.003},
        }
    
    def select_model(self, request: ChatCompletionRequest) -> str:
        """Choose model based on request characteristics."""
        # Simple requests → fast model
        if request.max_tokens and request.max_tokens < 200:
            return "fast"
        
        # Explicit model override
        if request.model in self.models:
            return request.model
        
        # Default to balanced
        return "balanced"
    
    async def route_request(self, request: ChatCompletionRequest) -> dict:
        """Forward request to selected model."""
        model_key = self.select_model(request)
        model = self.models[model_key]
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{model['endpoint']}/v1/chat/completions",
                json=request.model_dump(),
                timeout=60,
            )
            return response.json()
```

## Key Takeaways

- OpenAI-compatible API format is the industry standard
- Streaming improves perceived latency significantly
- Use token bucket rate limiting for smooth request handling
- Design comprehensive error responses with machine-readable codes
- A model router gateway enables cost/quality trade-offs per request
- Always set appropriate timeouts (LLM generation can take 30-120s)

## Related Documentation

- **[Deployment Strategies](/docs/deployment-strategies-production)** — Production serving infrastructure
- **[Cost Management](/docs/cost-management-optimization)** — Model routing for cost optimization
- **[Structured Outputs](/docs/structured-output-json-schema)** — Response format enforcement
