---
title: "Structured Outputs and JSON Schema"
description: "Enforcing exact output formats from LLMs — JSON schema validation, grammar-constrained decoding, and production data extraction patterns"
date: "2026-04-08"
category: "Best Practices"
tags: ["structured-output", "json", "schema", "data-extraction", "validation", "grammar-constrained"]
author: "LLM Hub Team"
---

# Structured Outputs and JSON Schema

LLMs naturally produce unstructured text, but many applications need reliable, parseable data. Structured output techniques ensure the model's response conforms to a specific schema, enabling downstream processing without fragile text parsing.

## Why Structured Outputs Matter

```python
# ❌ Unstructured output — fragile to parse
response = "The user has 3 orders. The most recent one was placed on April 1st, 2026 " \
           "and costs $149.99. It's currently being shipped."

# How do you extract the date? Regex? The amount? What if the format changes?

# ✅ Structured output — reliable
response = {
    "order_count": 3,
    "latest_order": {
        "date": "2026-04-01",
        "amount": 149.99,
        "status": "shipping"
    }
}
```

## Method 1: Prompt-Based JSON Output

The simplest approach — ask the model to return JSON:

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{
        "role": "user",
        "content": """Extract order information from:
        "I placed 3 orders with you. The latest one was on April 1st for $149.99 
         and the tracking shows it's shipping."
        
        Return ONLY valid JSON matching this schema:
        {
            "order_count": number,
            "latest_order": {
                "date": "YYYY-MM-DD",
                "amount": number,
                "status": "pending|processing|shipping|delivered"
            }
        }"""
    }],
    response_format={"type": "json_object"},  # OpenAI: enforces JSON
)

import json
data = json.loads(response.choices[0].message.content)
```

**Limitations**: The model can still produce invalid JSON occasionally, and schema violations are not caught at the generation level.

## Method 2: OpenAI JSON Schema Mode

OpenAI supports enforcing a specific JSON schema:

```python
schema = {
    "type": "object",
    "properties": {
        "order_count": {"type": "integer"},
        "latest_order": {
            "type": "object",
            "properties": {
                "date": {"type": "string", "format": "date"},
                "amount": {"type": "number"},
                "status": {
                    "type": "string",
                    "enum": ["pending", "processing", "shipping", "delivered"]
                }
            },
            "required": ["date", "amount", "status"]
        }
    },
    "required": ["order_count", "latest_order"]
}

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{
        "role": "user",
        "content": "Extract order info: I placed 3 orders..."
    }],
    response_format={"type": "json_schema", "json_schema": {"name": "order", "schema": schema}},
)
```

## Method 3: Instructor (Pydantic Validation)

The `instructor` library adds Pydantic validation with automatic retry on schema violations:

```python
import instructor
from pydantic import BaseModel, Field
from typing import Literal
from openai import OpenAI

client = instructor.patch(OpenAI())

class Order(BaseModel):
    date: str = Field(pattern=r"\d{4}-\d{2}-\d{2}")
    amount: float = Field(gt=0)
    status: Literal["pending", "processing", "shipping", "delivered"]

class OrderSummary(BaseModel):
    order_count: int = Field(gt=0)
    latest_order: Order

result = client.chat.completions.create(
    model="gpt-4o",
    messages=[{
        "role": "user",
        "content": "Extract: I placed 3 orders..."
    }],
    response_model=OrderSummary,
    max_retries=2,  # Auto-retry if validation fails
)

print(result.latest_order.amount)  # 149.99 (as float, not string!)
```

## Method 4: Grammar-Constrained Decoding

For open-source models, grammar-constrained decoding forces the model to ONLY generate valid JSON:

```python
from outlines import models, generate

model = models.transformers("meta-llama/Llama-3.2-3B")

schema = """
{
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "age": {"type": "integer"},
        "email": {"type": "string"}
    },
    "required": ["name", "age", "email"]
}
"""

generator = generate.json(model, schema)
result = generator("Extract from: John is 30 years old, email john@example.com")
# Guaranteed valid JSON — the decoder physically cannot produce invalid tokens
```

**How it works**: The decoder's vocabulary is filtered at each step to only allow tokens that keep the output valid according to the grammar/schema.

## Method 5: LMQL (Language Model Query Language)

```lmql
# LMQL constrains output at the token level
query "Extract person info":
    "Extract information: John is 30, john@example.com\n"
    "Name: " NAME [TYPE: str]
    "\nAge: " AGE [TYPE: int]
    "\nEmail: " EMAIL [TYPE: str]
```

## Production Data Extraction Pipeline

```python
from pydantic import BaseModel, Field, validator
from typing import Optional
import instructor

client = instructor.patch(OpenAI())

class ExtractedEntity(BaseModel):
    text: str
    label: str
    confidence: float = Field(ge=0.0, le=1.0)

class DocumentExtraction(BaseModel):
    entities: list[ExtractedEntity]
    summary: str
    language: str
    has_pii: bool
    
    @validator("entities")
    def validate_entities(cls, v):
        if len(v) > 100:
            raise ValueError("Too many entities extracted")
        return v

def extract_from_document(doc_text: str) -> DocumentExtraction:
    return client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": f"Extract all named entities, PII, and summarize:\n\n{doc_text}"
        }],
        response_model=DocumentExtraction,
        max_retries=3,
    )

# Usage
result = extract_from_document(long_contract_text)
for entity in result.entities:
    print(f"{entity.text} → {entity.label} ({entity.confidence:.2f})")
```

## Common Extraction Patterns

### Entity Extraction

```python
class Person(BaseModel):
    name: str
    title: Optional[str]
    organization: Optional[str]
    email: Optional[str]

class DocumentAnalysis(BaseModel):
    people: list[Person]
    dates: list[str]
    monetary_amounts: list[float]
    key_topics: list[str]
```

### Sentiment Analysis

```python
class SentimentAnalysis(BaseModel):
    overall: Literal["positive", "negative", "neutral"]
    confidence: float
    aspects: list[dict]  # {"aspect": str, "sentiment": str, "evidence": str}
```

### Classification

```python
class TicketClassification(BaseModel):
    category: Literal["billing", "technical", "account", "feature_request"]
    priority: Literal["low", "medium", "high", "urgent"]
    requires_human: bool
    suggested_response: str
```

## Validation in Production

Always validate model outputs even with schema enforcement:

```python
def validate_extraction(result: BaseModel) -> list[str]:
    """Additional business-logic validation beyond schema."""
    errors = []
    
    if result.has_pii and len(result.entities) == 0:
        errors.append("PII detected but no entities extracted")
    
    if len(result.summary) > 500:
        errors.append("Summary exceeds length limit")
    
    for entity in result.entities:
        if entity.confidence < 0.5:
            errors.append(f"Low confidence on entity: {entity.text}")
    
    return errors
```

## Key Takeaways

- OpenAI's `response_format` enforces JSON output at the API level
- Pydantic + Instructor adds type-safe validation with automatic retries
- Grammar-constrained decoding (Outlines, LMQL) guarantees valid output for open-source models
- Always add business-logic validation on top of schema validation
- Structured outputs enable reliable downstream processing and integration

## Related Documentation

- **[Function Calling](/docs/function-calling-tool-use)** — Combining tools with structured output
- **[Evaluation Metrics](/docs/evaluation-metrics-benchmarks)** — Measuring extraction quality
- **[Prompt Engineering](/docs/prompt-engineering)** — Designing prompts for structured output
