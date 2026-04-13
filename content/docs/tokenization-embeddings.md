---
title: "Tokenization and Embeddings"
description: "Understanding how LLMs convert text into numerical representations — tokenization algorithms, embedding spaces, and vocabulary design"
date: "2026-04-02"
category: "Fundamentals"
tags: ["tokenization", "embeddings", "basics", "nlp", "representation", "vocabulary"]
author: "LLM Hub Team"
---

# Tokenization and Embeddings

Before an LLM can process text, it must be converted from raw characters into numerical vectors. This two-step process — **tokenization** followed by **embedding** — is foundational to how all modern language models work.

## Tokenization

Tokenization splits text into smaller units called tokens. Modern LLMs use **subword tokenization**, which balances vocabulary size with the ability to represent any word, including unknown ones.

### Why Subword Tokenization?

| Approach | Example: "unhappiness" | Vocabulary Size | OOV Problem |
|----------|----------------------|-----------------|-------------|
| Character-level | u-n-h-a-p-p-i-n-e-s-s (11 tokens) | ~100 | None |
| Word-level | unhappiness (1 token) | 500K+ | Unknown words fail |
| **Subword** | un-happi-ness (3 tokens) | 30K–200K | Rare |

### Common Tokenization Algorithms

#### Byte-Pair Encoding (BPE)

BPE starts with individual characters and iteratively merges the most frequent adjacent pairs.

```python
# Simplified BPE intuition
text = "low lower lowest"
# Step 1: character-level: l-o-w l-o-w-e-r l-o-w-e-s-t
# Step 2: merge most frequent pair: lo-w lo-w-e-r lo-w-e-s-t
# Step 3: continue: low low-er low-est
```

**Used by**: GPT series, RoBERTa, Llama

#### WordPiece

Similar to BPE but merges based on likelihood rather than frequency.

**Used by**: BERT, ViT, most Google models

#### SentencePiece

Treats input as raw bytes and can train on any language without pre-tokenization. Supports both BPE and unigram language models.

**Used by**: T5, Llama (v2+), most modern multilingual models

### Practical Tokenization

```python
from transformers import AutoTokenizer

# Load a tokenizer
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.2-3B")

# Tokenize text
text = "Tokenization is fundamental to NLP."
tokens = tokenizer.tokenize(text)
token_ids = tokenizer.encode(text)

print(f"Tokens: {tokens}")
# ['Token', 'ization', ' is', ' fundamental', ' to', ' N', 'LP', '.']

print(f"Token IDs: {token_ids}")
# [12345, 67890, 456, 78901, 234, 56, 789, 12]

print(f"Token count: {len(token_ids)}")
# 8
```

### Understanding Token Counts

```python
# OpenAI's tiktoken for counting
import tiktoken

enc = tiktoken.encoding_for_model("gpt-4o")
text = "LLMs process text through tokens."

tokens = enc.encode(text)
print(f"Characters: {len(text)}, Tokens: {len(tokens)}")
# Characters: 32, Tokens: 7

# Rule of thumb: ~1 token ≈ 4 characters ≈ 0.75 words (English)
```

### Vocabulary Size Trade-offs

| Vocabulary Size | Pros | Cons |
|----------------|------|------|
| Small (10K–30K) | Faster tokenization, smaller model | More tokens per text, longer sequences |
| Medium (30K–100K) | Balanced for most languages | Good trade-off |
| Large (100K–200K+) | Fewer tokens per text, better for multilingual | Larger embedding matrix, more memory |

## Embeddings

After tokenization, each token ID is mapped to a dense vector through an **embedding lookup**.

### The Embedding Layer

```python
import torch
import torch.nn as nn

vocab_size = 50257      # GPT-2 vocabulary size
embedding_dim = 768     # GPT-2 hidden dimension

embedding = nn.Embedding(vocab_size, embedding_dim)

# Token IDs for "Hello world"
token_ids = torch.tensor([15496, 995])

# Lookup embeddings
vectors = embedding(token_ids)
print(vectors.shape)  # torch.Size([2, 768])
```

### Properties of Learned Embeddings

Embeddings capture semantic relationships through their geometry:

```python
# Conceptual example (not actual model output)
king  - man   + woman ≈ queen
paris - france + germany ≈ berlin
code  - python  + javascript ≈ web_dev
```

These relationships emerge because words appearing in similar contexts get mapped to nearby points in the embedding space.

### Positional Encodings

Since Transformers have no inherent notion of word order, **positional encodings** are added to token embeddings:

```python
import torch
import math

def sinusoidal_positional_encoding(seq_length, d_model):
    """Generate sinusoidal positional encodings (original Transformer)."""
    position = torch.arange(0, seq_length).unsqueeze(1)
    div_term = torch.exp(torch.arange(0, d_model, 2) * 
                        -(math.log(10000.0) / d_model))
    
    pe = torch.zeros(seq_length, d_model)
    pe[:, 0::2] = torch.sin(position * div_term)
    pe[:, 1::2] = torch.cos(position * div_term)
    return pe

# Modern models often use learned positional embeddings instead
learned_pos = nn.Embedding(max_seq_length, d_model)
```

| Positional Encoding | Description | Used By |
|--------------------|-------------|---------|
| **Sinusoidal** | Fixed sine/cosine patterns | Original Transformer |
| **Learned** | Trained position embeddings | GPT, BERT, Llama |
| **RoPE** | Rotary Position Embedding | Llama, PaLM, most modern models |
| **ALiBi** | Attention with Linear Biases | MPT, some efficient models |

### RoPE (Rotary Position Embedding)

RoPE encodes position through rotation matrices, enabling better length extrapolation:

```python
# RoPE intuition: position is encoded as rotation angle
# token at position 0: [cos(0), sin(0)] = [1, 0]
# token at position 1: [cos(θ), sin(θ)]
# token at position 2: [cos(2θ), sin(2θ)]
# This allows the model to generalize to longer sequences
```

## Standalone Embedding Models

Beyond LLM token embeddings, specialized embedding models encode entire texts into fixed-size vectors for semantic search:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

texts = [
    "Large language models process text through tokens",
    "Neural networks learn representations from data",
    "The weather today is quite pleasant"
]

embeddings = model.encode(texts)
print(f"Embedding shape: {embeddings.shape}")  # (3, 384)

# Compute similarity
from sklearn.metrics.pairwise import cosine_similarity
sim = cosine_similarity([embeddings[0]], [embeddings[1]])
print(f"Similarity (related topics): {sim[0][0]:.3f}")  # ~0.65
sim = cosine_similarity([embeddings[0]], [embeddings[2]])
print(f"Similarity (unrelated): {sim[0][0]:.3f}")       # ~0.15
```

### Popular Embedding Models

| Model | Dimensions | Speed | Best For |
|-------|-----------|-------|----------|
| text-embedding-3-small (OpenAI) | 1536 | Fast (API) | General purpose |
| text-embedding-3-large (OpenAI) | 3072 | Fast (API) | High accuracy |
| all-MiniLM-L6-v2 | 384 | Very fast | Local semantic search |
| bge-large-en-v1.5 | 1024 | Medium | Retrieval for RAG |
| nomic-embed-text | 768 | Fast | Open-source alternative |
| GTE-Qwen2-7B-instruct | 3584 | Slower | Instruction-aware embedding |

## Key Takeaways

- **Tokenization** breaks text into subword units; the choice of algorithm affects how the model handles rare words and multilingual text
- **Embeddings** map tokens to dense vectors where semantic similarity corresponds to geometric proximity
- **Positional encodings** inject sequence order information; RoPE is the modern standard
- **Standalone embedding models** are essential for semantic search and RAG pipelines
- Token counts directly impact cost, latency, and context window usage — always measure tokens, not characters

## Related Documentation

- **[Getting Started with LLMs](/docs/getting-started-llms)** — Introduction to language models
- **[Transformer Architecture](/docs/transformer-architecture)** — How attention processes embeddings
- **[RAG Systems](/docs/rag-retrieval-augmented-generation)** — Using embeddings for retrieval
