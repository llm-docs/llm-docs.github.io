---
title: "LLM Fine-Tuning Data Preparation"
description: "How to prepare high-quality fine-tuning datasets — data collection, formatting, cleaning, augmentation, and quality validation pipelines"
date: "2026-04-20"
updatedAt: "2026-04-20"
category: "Architecture & Training"
tags: ["fine-tuning", "data-preparation", "datasets", "data-quality", "sft", "training-data"]
author: "LLM Hub Team"
---

# LLM Fine-Tuning Data Preparation

The quality of your fine-tuning data is the single most important factor in fine-tuning success. No amount of hyperparameter tuning can compensate for noisy, inconsistent, or mislabeled training examples. This guide covers the complete pipeline for preparing production-grade fine-tuning datasets: from data collection through quality validation.

## The Data Preparation Pipeline

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   COLLECT    │──>│    CLEAN     │──>│    FORMAT    │──>│   AUGMENT    │──>│   VALIDATE   │
│              │   │              │   │              │   │              │   │              │
│ - Scrape     │   │ - Deduplicate│   │ - Chat format│   │ - Paraphrase │   │ - Statistics │
│ - Extract    │   │ - Filter     │   │ - JSONL      │   │ - Back-trans │   │ - Spot check │
│ - Generate   │   │ - Normalize  │   │ - Tokenize   │   │ - Synonyms   │   │ - Diversity  │
│ - Synthesize │   │ - De-PII     │   │ - Validate   │   │ - Difficulty │   │ - Auto-score │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

## Step 1: Data Collection

### Sources of Fine-Tuning Data

| Source | Volume | Quality | Effort | Best For |
|--------|--------|---------|--------|----------|
| **Existing logs** | High | Medium | Low | Customer support, search queries |
| **Expert-written examples** | Medium | Very High | Very High | Domain-specific tasks |
| **Synthetic generation** | Unlimited | Variable | Medium | Coverage expansion, edge cases |
| **Public datasets** | High | Variable | Low | General capability boost |
| **Crowdsourced annotation** | High | Medium-High | High | Classification, labeling tasks |
| **Model-generated (distillation)** | High | Medium | Low-Medium | Teaching reasoning patterns |

### Collecting from Production Logs

```python
import json
from datetime import datetime, timedelta
from typing import Optional

def extract_conversations_from_logs(
    log_source: str,
    start_date: datetime,
    end_date: datetime,
    min_rating: Optional[float] = None,
    max_input_length: int = 4096,
    max_output_length: int = 2048,
) -> list[dict]:
    """Extract high-quality conversations from production logs."""
    conversations = []

    with open(log_source) as f:
        for line in f:
            entry = json.loads(line)
            timestamp = datetime.fromisoformat(entry["timestamp"])

            if not (start_date <= timestamp <= end_date):
                continue

            # Filter by user rating if available
            if min_rating and entry.get("user_rating", 0) < min_rating:
                continue

            # Filter by length
            if len(entry["prompt"]) > max_input_length:
                continue
            if len(entry["response"]) > max_output_length:
                continue

            # Skip empty or error responses
            if not entry.get("response") or entry.get("error"):
                continue

            conversations.append({
                "prompt": entry["prompt"],
                "response": entry["response"],
                "timestamp": entry["timestamp"],
                "rating": entry.get("user_rating"),
                "category": entry.get("category", "unknown"),
                "model": entry.get("model", "unknown"),
            })

    print(f"Extracted {len(conversations)} conversations from logs")
    return conversations
```

### Synthetic Data Generation

When real data is scarce, generate training examples using a stronger model:

```python
from openai import OpenAI

def generate_synthetic_examples(
    client: OpenAI,
    task_description: str,
    domain_knowledge: str,
    n_examples: int = 100,
    model: str = "gpt-4.1",
) -> list[dict]:
    """Generate synthetic fine-tuning examples using a frontier model."""
    system_prompt = f"""You are a data generation engine. Create diverse, realistic examples for the following task.

Task: {task_description}
Domain context: {domain_knowledge}

For each example, generate:
1. A realistic user input (varied in style, length, and complexity)
2. A high-quality response that demonstrates ideal behavior
3. A difficulty rating (1-5)
4. The skill category this tests

Requirements:
- Cover edge cases and ambiguous inputs
- Vary input length from single sentences to multi-paragraph
- Include inputs with typos, informal language, and mixed languages
- Ensure responses are accurate, well-structured, and appropriately detailed"""

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system_prompt},
                  {"role": "user", "content": f"Generate {n_examples} diverse examples as JSON array."}],
        temperature=0.8,
        response_format={"type": "json_object"},
    )

    import json
    data = json.loads(response.choices[0].message.content)
    return data.get("examples", [])

# Example usage
client = OpenAI()
examples = generate_synthetic_examples(
    client,
    task_description="Classify customer support tickets by category and priority",
    domain_knowledge="E-commerce platform selling electronics. Categories: billing, shipping, product defect, account, general inquiry. Priority: low, medium, high, urgent.",
    n_examples=200,
)
```

## Step 2: Data Cleaning

### Deduplication

```python
import hashlib
from collections import Counter

def deduplicate_dataset(
    examples: list[dict],
    method: str = "exact",  # "exact", "fuzzy", "semantic"
    input_key: str = "prompt",
) -> list[dict]:
    """Remove duplicate examples from the dataset."""
    if method == "exact":
        seen = set()
        unique = []
        for ex in examples:
            h = hashlib.md5(ex[input_key].strip().lower().encode()).hexdigest()
            if h not in seen:
                seen.add(h)
                unique.append(ex)
        print(f"Exact dedup: {len(examples)} -> {len(unique)} ({len(examples)-len(unique)} removed)")
        return unique

    elif method == "fuzzy":
        # MinHash-based fuzzy deduplication
        from datasketch import MinHash, MinHashLSH
        lsh = MinHashLSH(threshold=0.85, num_perm=128)

        unique = []
        for i, ex in enumerate(examples):
            m = MinHash(num_perm=128)
            for word in ex[input_key].split():
                m.update(word.encode())
            if not lsh.query(m):
                lsh.insert(f"ex_{i}", m)
                unique.append(ex)

        print(f"Fuzzy dedup: {len(examples)} -> {len(unique)} ({len(examples)-len(unique)} removed)")
        return unique

    return examples
```

### Quality Filtering

```python
def filter_by_quality(
    examples: list[dict],
    min_response_length: int = 20,
    max_response_length: int = 4096,
    min_input_length: int = 5,
    remove_patterns: list[str] = None,
) -> list[dict]:
    """Filter out low-quality or problematic examples."""
    if remove_patterns is None:
        remove_patterns = [
            "I don't know", "I cannot", "I'm not sure",
            "As an AI", "As a language model",
            "I apologize", "Unfortunately",
        ]

    filtered = []
    reasons = Counter()

    for ex in examples:
        response = ex.get("response", "")
        prompt = ex.get("prompt", "")

        # Length checks
        if len(response) < min_response_length:
            reasons["response_too_short"] += 1
            continue
        if len(response) > max_response_length:
            reasons["response_too_long"] += 1
            continue
        if len(prompt) < min_input_length:
            reasons["input_too_short"] += 1
            continue

        # Refusal/hedging patterns
        for pattern in remove_patterns:
            if pattern.lower() in response.lower():
                reasons[f"contains_{pattern[:10]}"] += 1
                break
        else:
            filtered.append(ex)

    print(f"Quality filtering: {len(examples)} -> {len(filtered)}")
    print(f"Removal reasons: {dict(reasons)}")
    return filtered
```

### PII Removal

```python
import re

def remove_pii(text: str) -> str:
    """Remove personally identifiable information from text."""
    replacements = {
        r'\b[\w\.-]+@[\w\.-]+\.\w+': '[EMAIL]',
        r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b': '[PHONE]',
        r'\b\d{3}-\d{2}-\d{4}\b': '[SSN]',
        r'\b\d{16}\b': '[CREDIT_CARD]',
        r'\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b': '[CREDIT_CARD]',
        r'\b\d{1,5}\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b': '[ADDRESS]',
    }

    cleaned = text
    for pattern, replacement in replacements.items():
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)

    return cleaned

def clean_dataset_pii(examples: list[dict], fields: list[str] = None) -> list[dict]:
    """Remove PII from all examples."""
    if fields is None:
        fields = ["prompt", "response"]

    cleaned_count = 0
    for ex in examples:
        for field in fields:
            if field in ex:
                original = ex[field]
                ex[field] = remove_pii(original)
                if ex[field] != original:
                    cleaned_count += 1

    print(f"PII cleaned: {cleaned_count} fields modified")
    return examples
```

## Step 3: Data Formatting

### ChatML Format (Standard)

Most modern fine-tuning frameworks use the chat format:

```jsonl
{"messages": [{"role": "system", "content": "You are a helpful customer support assistant for TechMart, an electronics retailer. Be concise, friendly, and accurate."}, {"role": "user", "content": "My order #TM-48291 hasn't arrived yet. It's been 2 weeks."}, {"role": "assistant", "content": "I'd be happy to help you track your order. Let me look up order #TM-48291 for you.\n\nI can see your order shipped on March 15th via USPS Priority Mail. The tracking number is 9400123456789012345678. It appears to be delayed at the regional distribution center.\n\nHere's what I can do:\n1. I've filed a trace request with USPS — they typically respond within 3-5 business days\n2. If it doesn't arrive by March 30th, we'll send a replacement at no charge\n3. I've also applied a 15% discount to your next order for the inconvenience\n\nWould you like me to send the tracking link to your email?"}]}
{"messages": [{"role": "system", "content": "You are a helpful customer support assistant for TechMart, an electronics retailer. Be concise, friendly, and accurate."}, {"role": "user", "content": "What's the return policy for headphones?"}, {"role": "assistant", "content": "At TechMart, you can return most electronics within 30 days of delivery for a full refund. For headphones specifically:\n\n- **Unopened**: Full refund, no questions asked\n- **Opened**: Full refund within 30 days if in original condition\n- **Defective**: Full refund or exchange at any time within the 1-year warranty period\n\nTo start a return, you can:\n1. Visit techmart.com/returns and enter your order number\n2. Reply to this message with your order number\n3. Call us at 1-800-TECHMART\n\nWe'll provide a prepaid shipping label and process your refund within 3-5 business days of receiving the item."}]}
```

### Formatting with Python

```python
def format_as_chatml(
    prompt: str,
    response: str,
    system_prompt: str = "You are a helpful assistant.",
) -> dict:
    """Format a single example in ChatML format."""
    return {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": response},
        ]
    }

def convert_to_jsonl(examples: list[dict], output_path: str, system_prompt: str):
    """Convert a list of prompt/response pairs to JSONL for fine-tuning."""
    import json

    with open(output_path, "w") as f:
        for ex in examples:
            formatted = format_as_chatml(
                prompt=ex["prompt"],
                response=ex["response"],
                system_prompt=system_prompt,
            )
            f.write(json.dumps(formatted) + "\n")

    print(f"Wrote {len(examples)} examples to {output_path}")
```

### Multi-Turn Conversations

For models that support multi-turn training:

```jsonl
{"messages": [{"role": "user", "content": "How do I reset my password?"}, {"role": "assistant", "content": "To reset your password, go to the login page and click 'Forgot Password'. Enter your email and we'll send a reset link."}, {"role": "user", "content": "I didn't receive the email. Can you check?"}, {"role": "assistant", "content": "I'd be happy to help. What email address is associated with your account?"}, {"role": "user", "content": "user@example.com"}, {"role": "assistant", "content": "I found your account. I've just resent the password reset link to user@example.com. Please check your spam folder — it sometimes ends up there. The link expires in 1 hour."}]}
```

## Step 4: Data Augmentation

### Paraphrasing for Diversity

```python
def paraphrase_batch(
    client: OpenAI,
    examples: list[dict],
    model: str = "gpt-4.1-mini",
) -> list[dict]:
    """Generate paraphrased versions of existing examples."""
    augmented = []

    for ex in examples:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "Rewrite the following user query in 3 different ways while preserving the exact same intent. Vary the formality, length, and phrasing. Return only the rewritten queries as a JSON array."},
                {"role": "user", "content": ex["prompt"]},
            ],
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        import json
        paraphrases = json.loads(response.choices[0].message.content).get("queries", [])

        for paraphrase in paraphrases[:3]:
            augmented.append({
                "prompt": paraphrase,
                "response": ex["response"],
                "source": "paraphrased",
                "original_prompt": ex["prompt"],
            })

    print(f"Augmented {len(examples)} examples into {len(augmented)} via paraphrasing")
    return augmented
```

### Difficulty Scaling

```python
def create_difficulty_variants(
    client: OpenAI,
    example: dict,
    levels: list[str] = None,
) -> list[dict]:
    """Create easier and harder versions of an example."""
    if levels is None:
        levels = ["simpler", "more complex", "ambiguous", "multi-intent"]

    variants = []
    for level in levels:
        prompt = f"Rewrite this user query to be {level}. Only output the rewritten query.\n\nOriginal: {example['prompt']}"

        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
        )

        variants.append({
            "prompt": response.choices[0].message.content.strip(),
            "response": example["response"],
            "difficulty_variant": level,
            "source": "difficulty_scaled",
        })

    return variants
```

## Step 5: Quality Validation

### Statistical Analysis

```python
import pandas as pd
import matplotlib.pyplot as plt

def analyze_dataset_stats(examples: list[dict]) -> dict:
    """Generate comprehensive statistics about the training dataset."""
    input_lengths = [len(ex.get("prompt", "")) for ex in examples]
    output_lengths = [len(ex.get("response", "")) for ex in examples]
    response_lengths = [len(ex.get("response", "").split()) for ex in examples]

    # Category distribution (if available)
    categories = Counter(ex.get("category", "unknown") for ex in examples)

    # Uniqueness
    unique_inputs = len(set(ex.get("prompt", "") for ex in examples))
    uniqueness_ratio = unique_inputs / len(examples) if examples else 0

    stats = {
        "num_examples": len(examples),
        "input_length": {
            "mean": sum(input_lengths) / len(input_lengths),
            "median": sorted(input_lengths)[len(input_lengths) // 2],
            "min": min(input_lengths),
            "max": max(input_lengths),
            "p95": sorted(input_lengths)[int(len(input_lengths) * 0.95)],
        },
        "output_length": {
            "mean": sum(output_lengths) / len(output_lengths),
            "median": sorted(output_lengths)[len(output_lengths) // 2],
            "min": min(output_lengths),
            "max": max(output_lengths),
        },
        "response_word_count": {
            "mean": sum(response_lengths) / len(response_lengths),
            "median": sorted(response_lengths)[len(response_lengths) // 2],
        },
        "unique_input_ratio": round(uniqueness_ratio, 3),
        "category_distribution": dict(categories.most_common(20)),
    }

    return stats

def validate_dataset_quality(examples: list[dict]) -> dict:
    """Run a full quality validation and return a report."""
    stats = analyze_dataset_stats(examples)

    report = {
        "stats": stats,
        "warnings": [],
        "errors": [],
    }

    # Quality checks
    if stats["unique_input_ratio"] < 0.90:
        report["warnings"].append(f"Low input uniqueness: {stats['unique_input_ratio']:.1%}. Consider more aggressive deduplication.")

    if stats["input_length"]["mean"] > 2000:
        report["warnings"].append(f"Average input length is high ({stats['input_length']['mean']:.0f}). Model may not learn short-query behavior.")

    if stats["output_length"]["mean"] > 1500:
        report["warnings"].append(f"Average output length is very long ({stats['output_length']['mean']:.0f}). Consider whether all responses need to be this long.")

    if stats["num_examples"] < 100:
        report["warnings"].append(f"Dataset is small ({stats['num_examples']} examples). May overfit. Consider 500+ examples.")

    if stats["num_examples"] > 50000:
        report["warnings"].append(f"Dataset is very large ({stats['num_examples']} examples). Diminishing returns likely beyond 10K.")

    # Check for class imbalance
    if stats["category_distribution"]:
        cat_counts = list(stats["category_distribution"].values())
        if max(cat_counts) > 10 * min(cat_counts):
            report["warnings"].append(f"Severe class imbalance: {max(cat_counts)} vs {min(cat_counts)}. Consider rebalancing.")

    return report
```

### Human Spot-Checking

```python
def generate_review_sample(
    examples: list[dict],
    sample_size: int = 50,
    output_path: str = "review_sample.html",
):
    """Generate an HTML file for human review of random examples."""
    import random
    from datetime import datetime

    sample = random.sample(examples, min(sample_size, len(examples)))

    html_parts = [
        f"<h1>Fine-Tuning Data Review Sample</h1>",
        f"<p>Generated: {datetime.now()}</p>",
        f"<p>Total examples: {len(examples)}, Sample size: {len(sample)}</p>",
        "<hr>",
    ]

    for i, ex in enumerate(sample):
        html_parts.append(f"""
        <div style="border: 1px solid #ccc; padding: 15px; margin: 10px 0; border-radius: 8px;">
            <h3>Example {i + 1}</h3>
            <p><strong>Input:</strong></p>
            <pre style="background: #f5f5f5; padding: 10px; white-space: pre-wrap;">{ex.get('prompt', '')}</pre>
            <p><strong>Expected Output:</strong></p>
            <pre style="background: #f0f8ff; padding: 10px; white-space: pre-wrap;">{ex.get('response', '')}</pre>
            <p>
                Quality: <select><option value="">-- Select --</option>
                <option value="5">Excellent</option>
                <option value="4">Good</option>
                <option value="3">Acceptable</option>
                <option value="2">Poor</option>
                <option value="1">Unusable</option>
                </select>
                &nbsp;&nbsp;
                Flag: <input type="checkbox">
                &nbsp;&nbsp;
                Notes: <input type="text" style="width: 300px;">
            </p>
        </div>
        """)

    with open(output_path, "w") as f:
        f.write("<html><head><title>Dataset Review</title></head><body>")
        f.write("".join(html_parts))
        f.write("</body></html>")

    print(f"Review sample saved to {output_path}")
```

## Dataset Size Recommendations

| Task Type | Minimum Examples | Recommended | Diminishing Returns |
|-----------|-----------------|-------------|-------------------|
| **Style adaptation** | 50-100 | 200-500 | ~1,000 |
| **Format learning** (JSON, structured output) | 100-200 | 500-1,000 | ~3,000 |
| **Domain knowledge injection** | 500-1,000 | 2,000-5,000 | ~10,000 |
| **Complex reasoning patterns** | 1,000-2,000 | 5,000-10,000 | ~20,000 |
| **Behavior alignment** (safety, tone) | 200-500 | 1,000-3,000 | ~5,000 |

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| **Noisy labels** | Model produces incorrect outputs on simple inputs | Re-review and clean training data |
| **Template overfitting** | Model outputs rigid, templated responses | Add more diverse phrasings; paraphrase augmentation |
| **Distribution shift** | Good on training-like inputs, poor on novel inputs | Ensure training data covers production distribution |
| **Catastrophic forgetting** | Model loses general capabilities after fine-tuning | Mix in general-purpose examples; use LoRA instead of full fine-tuning |
| **Data leakage** | Unrealistically high training accuracy | Strict train/test split by conversation, not by example |
| **Length bias** | Model always produces long/short responses | Ensure output length distribution matches production needs |

## Cross-References

- [Fine-Tuning with LoRA/QLoRA](/docs/fine-tuning-lora) — Efficient fine-tuning techniques once your data is ready
- [Training Data Curation](/docs/training-data-curation) — Principles for curating pretraining datasets
- [SFT Alignment & RLHF/DPO](/docs/sft-alignment-rlhf-dpo) — Advanced alignment techniques beyond SFT
- [Model Comparison Guide](/docs/model-comparison-guide) — Evaluate whether fine-tuning is the right approach vs. using a different model

## Checklist

- [ ] Collect examples from realistic production scenarios (not just ideal cases)
- [ ] Deduplicate using fuzzy matching (not just exact string matching)
- [ ] Remove all PII and sensitive data
- [ ] Filter out low-quality, refused, or hedging responses
- [ ] Format in ChatML with a consistent system prompt
- [ ] Augment with paraphrases for input diversity
- [ ] Verify class balance across categories
- [ ] Generate statistical report and review all warnings
- [ ] Human-review at least 50 random examples before training
- [ ] Split train/validation by conversation (not by individual example)
