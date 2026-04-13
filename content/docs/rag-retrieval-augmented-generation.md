---
title: "RAG — Retrieval-Augmented Generation"
description: "Ground LLM outputs in your own data — vector databases, embedding models, chunking strategies, and production RAG architectures"
date: "2026-04-07"
category: "Best Practices"
tags: ["rag", "retrieval", "embeddings", "vector-database", "knowledge-base", "grounding"]
author: "IntuiVortex Team"
---

# RAG — Retrieval-Augmented Generation

Retrieval-Augmented Generation (RAG) grounds LLM outputs in external knowledge by retrieving relevant information before generation. It solves the core LLM problems of hallucination, outdated knowledge, and lack of domain-specific information — without fine-tuning.

## The RAG Architecture

```
User Query
    │
    ▼
┌──────────────┐
│   Embedder   │  Query → vector
└──────┬───────┘
       ▼
┌──────────────┐
│ Vector DB    │  Retrieve top-K chunks
└──────┬───────┘
       ▼
┌─────────────────────────┐
│  Prompt Assembly        │
│  ├─ System prompt       │
│  ├─ Retrieved context   │
│  └─ User query          │
└──────────┬──────────────┘
           ▼
    ┌──────────────┐
    │     LLM      │  Generate with context
    └──────┬───────┘
           ▼
    User Response
```

## Core Components

### 1. Document Chunking

Splitting documents into retrievable units is the first and most critical step.

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,        # Target chunk size in characters
    chunk_overlap=50,      # Overlap between chunks
    separators=["\n\n", "\n", ". ", " ", ""],  # Hierarchy of separators
    length_function=len,
)

chunks = text_splitter.split_text(long_document)
```

**Chunk size trade-offs**:

| Chunk Size | Retrieval Precision | Context Richness | Token Cost |
|-----------|-------------------|-----------------|------------|
| 100-200 tokens | High (precise) | Low (may miss context) | Low |
| 300-500 tokens | Good balance | Good | Medium |
| 500-1000 tokens | Lower (noisy) | High (complete context) | High |
| 1000+ tokens | Low (very noisy) | Very high | Expensive |

**Advanced chunking strategies**:

```python
# Semantic chunking: split at topic boundaries
from langchain_experimental.text_splitter import SemanticChunker

semantic_splitter = SemanticChunker(
    embeddings=embedding_model,
    breakpoint_threshold_type="percentile",  # or "standard_deviation"
    breakpoint_threshold_amount=95,
)

# Document-aware chunking: respect section boundaries
def section_aware_chunker(document: str, sections: list[tuple[str, str]]) -> list[str]:
    """Chunk while preserving section headers for context."""
    chunks = []
    for header, content in sections:
        section_chunks = text_splitter.split_text(content)
        for chunk in section_chunks:
            chunks.append(f"## {header}\n\n{chunk}")  # Prepend header
    return chunks
```

### 2. Embedding Models

```python
from sentence_transformers import SentenceTransformer

embedder = SentenceTransformer("BAAI/bge-large-en-v1.5")

# Embed documents
doc_embeddings = embedder.encode(chunks, show_progress_bar=True)

# Embed query
query_embedding = embedder.encode("What is the refund policy?")
```

| Model | Dimensions | Speed | MTEB Score | Best For |
|-------|-----------|-------|-----------|----------|
| text-embedding-3-small | 1536 | Fast (API) | 64.6 | General RAG |
| text-embedding-3-large | 3072 | Fast (API) | 67.4 | High-accuracy RAG |
| bge-large-en-v1.5 | 1024 | Medium | 64.2 | Open-source general |
| bge-m3 | 1024 | Medium | 67.0 | Multilingual RAG |
| gte-Qwen2-7B | 3584 | Slower | 72.0 | State-of-the-art |
| nomic-embed-text | 768 | Fast | 59.9 | Lightweight |

### 3. Vector Databases

```python
# FAISS (Facebook AI Similarity Search) — simplest option
import faiss
import numpy as np

dimension = doc_embeddings.shape[1]
index = faiss.IndexFlatIP(dimension)  # Inner product (cosine similarity)

# Normalize for cosine similarity
faiss.normalize_L2(doc_embeddings)
index.add(doc_embeddings.astype(np.float32))

# Search
query_vec = query_embedding.reshape(1, -1).astype(np.float32)
faiss.normalize_L2(query_vec)
scores, indices = index.search(query_vec, k=5)
```

| Database | Type | Scalability | Features | Best For |
|----------|------|-------------|----------|----------|
| **FAISS** | In-memory | 1M vectors | Fast, simple | Prototyping, small datasets |
| **Chroma** | Embedded | 10M vectors | Metadata filtering | Python apps, ease of use |
| **Pinecone** | Cloud | 100M+ | Managed, filtering | Production, teams |
| **Weaviate** | Cloud/Self-hosted | 100M+ | GraphQL, multi-modal | Complex queries |
| **Milvus** | Self-hosted/Cloud | 1B+ | Distributed, GPU | Enterprise scale |
| **pgvector** | PostgreSQL extension | 10M+ | SQL + vector search | Existing Postgres users |

### 4. Retrieval and Generation

```python
from openai import OpenAI

def rag_query(user_query: str, k: int = 5) -> str:
    # 1. Embed query
    query_embed = embedder.encode(user_query)
    
    # 2. Retrieve top chunks
    faiss.normalize_L2(query_embed.reshape(1, -1).astype(np.float32))
    scores, indices = index.search(query_embed.reshape(1, -1).astype(np.float32), k)
    
    # 3. Build context from retrieved chunks
    context = "\n\n---\n\n".join([chunks[i] for i in indices[0]])
    
    # 4. Generate with context
    client = OpenAI()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful assistant. Answer based ONLY on the provided context. If the context doesn't contain the answer, say so."},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {user_query}"}
        ],
        temperature=0.1,
    )
    return response.choices[0].message.content
```

## Advanced RAG Patterns

### Hybrid Search

Combine dense (embedding) and sparse (BM25/keyword) search:

```python
# BM25 for keyword matching
from rank_bm25 import BM25Okapi

tokenized_corpus = [chunk.lower().split() for chunk in chunks]
bm25 = BM25Okapi(tokenized_corpus)

# Hybrid scoring
def hybrid_search(query: str, top_k: int = 5, alpha: float = 0.7):
    # Dense scores (from vector DB)
    dense_scores = vector_search(query, top_k * 2)
    
    # Sparse scores (from BM25)
    query_tokens = query.lower().split()
    sparse_scores = bm25.get_scores(query_tokens)
    
    # Combined score (alpha weights dense vs sparse)
    combined = {}
    for idx in set(list(dense_scores.keys()) + list(range(len(sparse_scores)))):
        combined[idx] = alpha * dense_scores.get(idx, 0) + (1 - alpha) * sparse_scores[idx]
    
    return sorted(combined.items(), key=lambda x: x[1], reverse=True)[:top_k]
```

### Multi-Query Retrieval

Generate multiple query variations to improve recall:

```python
def multi_query_retrieval(query: str, variations: int = 3) -> list[str]:
    """Generate query variations for better recall."""
    client = OpenAI()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": f"Generate {variations} alternative versions of this search query, each focusing on a different aspect:\n\nOriginal: {query}"
        }]
    )
    queries = [query] + response.choices[0].message.content.split("\n")
    
    # Retrieve for each query and deduplicate
    all_chunks = set()
    for q in queries:
        results = vector_search(q, k=3)
        all_chunks.update(results)
    return list(all_chunks)
```

### Re-ranking

Use a cross-encoder to re-rank retrieved chunks:

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def rerank_chunks(query: str, chunks: list[str], top_k: int = 5) -> list[str]:
    # Score each chunk
    pairs = [[query, chunk] for chunk in chunks]
    scores = reranker.predict(pairs)
    
    # Sort and return top-k
    ranked = sorted(zip(chunks, scores), key=lambda x: x[1], reverse=True)
    return [chunk for chunk, score in ranked[:top_k]]
```

### Parent Document Retrieval

Retrieve small chunks but return their parent section for richer context:

```python
# Index: small chunks with parent reference
chunk_index = {
    "chunk_1": {"content": "...", "parent": "section_A_full"},
    "chunk_2": {"content": "...", "parent": "section_A_full"},
}

def parent_document_retrieval(query: str) -> list[str]:
    # Retrieve small chunks
    chunk_ids = vector_search(query, k=10)
    
    # Return parent documents
    parents = set()
    for cid in chunk_ids:
        parents.add(chunk_index[cid]["parent"])
    
    return list(parents)  # Fewer, richer context units
```

## Evaluating RAG Systems

| Metric | Measures | Tools |
|--------|---------|-------|
| **Hit Rate** | Is relevant chunk in top-K? | Custom evaluation |
| **MRR** | How high is the first relevant chunk? | Custom evaluation |
| **NDCG** | Ranking quality of retrieved chunks | rank_eval, ragas |
| **Faithfulness** | Does output follow context? | ragas, DeepEval |
| **Answer Relevance** | Does output answer the query? | ragas, LLM-as-judge |

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision

results = evaluate(
    dataset=evaluation_dataset,  # questions, contexts, answers, responses
    metrics=[faithfulness, answer_relevancy, context_precision]
)
```

## Key Takeaways

- RAG solves hallucination by grounding outputs in retrieved evidence
- Chunking strategy is the most important design decision — test multiple approaches
- Hybrid search (dense + sparse) consistently outperforms either alone
- Re-ranking adds significant quality at moderate compute cost
- Evaluate retrieval quality separately from generation quality

## Related Documentation

- **[Embeddings](/docs/tokenization-embeddings)** — How embedding models work
- **[Evaluation Metrics](/docs/evaluation-metrics-benchmarks)** — Measuring RAG quality
- **[Knowledge Distillation](/docs/knowledge-distillation)** — Compressing RAG systems
