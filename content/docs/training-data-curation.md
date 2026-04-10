---
title: "Training Data and Curation"
description: "How LLMs are trained on massive datasets — data sources, cleaning pipelines, deduplication, and the evolution of training corpora"
date: "2026-04-04"
category: "Fundamentals"
tags: ["training-data", "curation", "datasets", "preprocessing", "deduplication", "data-quality"]
author: "LLM Hub Team"
---

# Training Data and Curation

The performance of an LLM is determined not just by its architecture and parameter count, but fundamentally by the **quality, diversity, and scale** of its training data. This guide explores how training datasets are assembled, cleaned, and curated.

## The Data Pipeline

```
Raw Sources
    │
    ├── Web Crawls (Common Crawl, etc.)
    ├── Books (Project Gutenberg, licensed)
    ├── Code (GitHub, StackExchange)
    ├── Academic Papers (arXiv, PubMed)
    └── Curated Content (Wikipedia, etc.)
         │
         ▼
    Filtering & Cleaning
    │
    ├── Language Identification
    ├── Quality Scoring
    ├── PII Removal
    ├── Deduplication
    └── Toxicity Filtering
         │
         ▼
    Tokenization
    │
         ▼
    Training
```

## Major Data Sources

### Web Crawls

| Dataset | Size | Description |
|---------|------|-------------|
| Common Crawl | 250B+ tokens | Monthly web crawls; raw, noisy |
| C4 (Colossal Clean Crawled) | 156B tokens | Cleaned Common Crawl (T5 training) |
| RefinedWeb | 600B+ tokens | High-quality filtered Common Crawl (Falcon) |
| FineWeb | 15T+ tokens | Aggregated and deduplicated web corpus |
| DCLM | 2.8T tokens | Domain-classified and filtered |

### Code

| Dataset | Languages | Tokens |
|---------|----------|--------|
| The Stack | 350+ | 3.1T |
| StarCoderData | 100+ | 0.5T |
| CodeParrot | Python | 180B |
| SlimPajama | Multi | 627B (code subset) |

### Books and Long-form

| Dataset | Books | Notes |
|---------|-------|-------|
| Books3 | ~200K | Controversial provenance |
| Project Gutenberg | 70K+ | Public domain |
| OpenWebText2 | — | Reddit-upvoted links |

### Multilingual

| Dataset | Languages | Notes |
|---------|----------|-------|
| mC4 | 101 | Multilingual C4 |
| Wikipedia dumps | 300+ | Varies in quality |
| CulturaX | 167 | Cleaned multilingual |

## Data Cleaning Pipeline

### 1. Language Identification

```python
from fasttext import load_model

model = load_model("lid.176.bin")

def filter_by_language(text, target_lang="en", threshold=0.8):
    predictions = model.predict(text.replace("\n", " "), k=1)
    lang, confidence = predictions[0][0], predictions[1][0]
    return lang == f"__label__{target_lang}" and confidence > threshold
```

### 2. Quality Filtering

Heuristics-based quality scoring:

```python
def quality_score(text: str) -> float:
    score = 0.0
    
    # Penalize very short texts
    if len(text) < 100:
        score -= 2.0
    
    # Penalize high punctuation density
    punct_ratio = text.count(".") / max(len(text.split()), 1)
    if punct_ratio > 0.3:
        score -= 1.0
    
    # Reward proper sentence endings
    if text.strip().endswith(('.', '!', '?')):
        score += 0.5
    
    # Penalize boilerplate patterns
    boilerplate = ["click here", "subscribe now", "cookie policy"]
    for phrase in boilerplate:
        if phrase in text.lower():
            score -= 0.5
    
    # Reward vocabulary diversity
    words = text.split()
    if len(words) > 0:
        vocab_richness = len(set(words)) / len(words)
        score += vocab_richness
    
    return score
```

Model-based quality scoring uses a small classifier trained on high-quality seed data (Wikipedia, books) to score each document.

### 3. Deduplication

Duplicates in training data cause models to memorize rather than learn, and inflate evaluation scores.

```python
# Exact deduplication with hashing
import hashlib

def deduplicate_documents(documents: list[str]) -> list[str]:
    seen = set()
    unique = []
    for doc in documents:
        doc_hash = hashlib.sha256(doc.encode()).hexdigest()
        if doc_hash not in seen:
            seen.add(doc_hash)
            unique.append(doc)
    return unique

# Fuzzy deduplication with MinHash + LSH (for near-duplicates)
from datasketch import MinHash, MinHashLSH

# More scalable: Bloom filters + n-gram hashing
# Used by: RefinedWeb, FineWeb, DCLM
```

### 4. PII and Sensitive Data Removal

```python
import re

def remove_pii(text: str) -> str:
    # Email addresses
    text = re.sub(r'[\w.+-]+@[\w-]+\.[\w.-]+', '[EMAIL]', text)
    # Phone numbers (US format)
    text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]', text)
    # SSNs
    text = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]', text)
    # IP addresses
    text = re.sub(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', '[IP]', text)
    return text
```

## Training Data Composition

Typical composition for a strong general-purpose model:

| Category | Percentage | Purpose |
|----------|-----------|---------|
| Web text | 50–70% | General knowledge, language patterns |
| Code | 5–15% | Logical reasoning, structured thinking |
| Books | 5–10% | Long-form coherence, narrative |
| Academic/Scientific | 5–10% | Technical knowledge, factual accuracy |
| Conversational | 3–8% | Dialogue ability, instruction following |
| Multilingual | 5–15% | Cross-lingual ability |

## The Scaling Law for Data

Research has established **scaling laws** that relate model performance to data size:

```
Loss(N, D) = E + A/N^α + B/D^β

Where:
  N = model parameters
  D = training tokens
  E, A, B, α, β = fitted constants
```

Key insight from Chinchilla (2022): **model size and training data should scale proportionally**. A 70B model needs ~1.4T tokens for optimal training, not the ~300B used for GPT-3 (175B).

### Modern Training Recommendations

| Model Size | Recommended Training Tokens |
|-----------|---------------------------|
| 1B | 20B |
| 7B | 140B |
| 13B | 260B |
| 70B | 1.4T |
| 400B+ | 8T+ |

## Data Contamination and Benchmark Leakage

When training data contains examples of benchmark test questions, evaluation scores become inflated. Modern datasets address this with:

1. **N-gram overlap filtering** against known benchmarks
2. **Deduplication** at the document and near-duplicate level
3. **Benchmark-aware evaluation** reporting both contaminated and decontaminated scores

## Open Training Datasets

For researchers and teams who want transparency:

| Dataset | Size | License | Notes |
|---------|------|---------|-------|
| Dolma | 3T | ODC-BY | AI2's open corpus |
| FineWeb | 15T | MIT-like | Hugging Face curated |
| FineWeb-Edu | 1.3T | MIT-like | Educational subset |
| RefinedWeb | 600B | Open | Falcon's data |
| DCLM | 2.8T | Various | Domain-classified |
| OLMo Corpus | 3T | Apache 2.0 | Fully open training data |

## Key Takeaways

- Training data quality matters as much as model architecture
- Deduplication and filtering are critical for preventing memorization
- The Chinchilla scaling law recommends proportional scaling of parameters and data
- Benchmark contamination is a real problem addressed through careful filtering
- Open datasets (Dolma, FineWeb, OLMo corpus) enable reproducible research

## Related Documentation

- **[Model Training and Pre-training](/docs/model-training-pretraining)** — The training process itself
- **[Tokenization and Embeddings](/docs/tokenization-embeddings)** — How data is converted to model input
- **[Evaluation Metrics](/docs/evaluation-metrics-benchmarks)** — How we measure whether data quality matters
