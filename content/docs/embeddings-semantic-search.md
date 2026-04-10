---
title: "Embeddings & Semantic Search"
description: "Building production semantic search systems — embedding model selection, indexing strategies, query processing, relevance tuning, and hybrid search"
date: "2026-04-18"
category: "Best Practices"
tags: ["embeddings", "semantic-search", "vector-database", "retrieval", "ranking", "search"]
author: "LLM Hub Team"
---

# Embeddings & Semantic Search

Semantic search transforms text queries into dense vector representations, enabling retrieval based on meaning rather than keyword matching. This guide covers building production-grade semantic search systems from embedding model selection through relevance tuning and hybrid search architectures.

## Why Semantic Search Matters

Traditional keyword search (BM25, TF-IDF) fails on:

- **Synonymy**: "heart attack" vs "myocardial infarction" — different words, same meaning
- **Polysemy**: "bank" — is it a financial institution or a river edge?
- **Intent mismatch**: "cheap flights" vs "book flights" — keyword overlap but different intent
- **Cross-lingual retrieval**: Query in English, find documents in Spanish

Semantic search addresses these by mapping text into a shared vector space where proximity reflects semantic similarity. For a deeper look at how embeddings work, see [Tokenization & Embeddings](/docs/tokenization-embeddings).

## Embedding Model Selection

### Model Landscape (2026)

| Model | Dimensions | Max Tokens | Speed | MTEB Score | Best For |
|-------|-----------|------------|-------|------------|----------|
| text-embedding-3-large (OpenAI) | 3072 | 8191 | Fast | 64.6 | General-purpose, production |
| text-embedding-3-small (OpenAI) | 1536 | 8191 | Fast | 62.3 | Cost-sensitive production |
| nomic-embed-text-v2 | 768 | 8192 | Fast | 65.1 | Open-source, multilingual |
| bge-m3 | 1024 | 8192 | Medium | 66.4 | Multilingual, dense retrieval |
| jina-embeddings-v3 | 1024 | 8192 | Fast | 64.0 | Long documents, 8K context |
| e5-mistral-7b | 4096 | 8192 | Slow | 69.2 | Highest accuracy, self-hosted |
| gte-Qwen2-7B | 3584 | 131072 | Slow | 70.1 | State-of-the-art, self-hosted |

### Selection Criteria

```python
def select_embedding_model(requirements: dict) -> str:
    """Choose an embedding model based on requirements."""
    candidates = {
        "nomic-embed-text-v2": {
            "dims": 768, "open_source": True, "mteb": 65.1,
            "cost_per_1k": 0.0, "supports_multilingual": True,
        },
        "text-embedding-3-small": {
            "dims": 1536, "open_source": False, "mteb": 62.3,
            "cost_per_1k": 0.02, "supports_multilingual": False,
        },
        "bge-m3": {
            "dims": 1024, "open_source": True, "mteb": 66.4,
            "cost_per_1k": 0.0, "supports_multilingual": True,
        },
        "text-embedding-3-large": {
            "dims": 3072, "open_source": False, "mteb": 64.6,
            "cost_per_1k": 0.13, "supports_multilingual": False,
        },
    }

    if requirements.get("open_source_only"):
        candidates = {k: v for k, v in candidates.items() if v["open_source"]}

    if requirements.get("min_mteb"):
        candidates = {k: v for k, v in candidates.items()
                      if v["mteb"] >= requirements["min_mteb"]}

    if requirements.get("max_cost_per_1k"):
        candidates = {k: v for k, v in candidates.items()
                      if v["cost_per_1k"] <= requirements["max_cost_per_1k"]}

    return max(candidates, key=lambda k: candidates[k]["mteb"])
```

### Dimensionality Reduction

Higher dimensions are not always better. You can reduce embedding dimensions at query time:

```python
import numpy as np
from sklearn.decomposition import PCA

# Train PCA on a representative sample of embeddings
training_embeddings = np.array([...])  # N x 3072 matrix
pca = PCA(n_components=256)
pca.fit(training_embeddings)

# Reduce new embeddings
query_embedding = get_embedding(query)  # 3072-dim
reduced = pca.transform([query_embedding])  # 256-dim
# Query against already-reduced index
```

**Dimension trade-offs**:

| Dimensions | Storage (1M vectors) | Recall@10 | Query Latency (p99) |
|-----------|---------------------|-----------|-------------------|
| 128 | 512 MB (FP16) | 87.2% | 2ms |
| 256 | 1 GB (FP16) | 91.5% | 3ms |
| 512 | 2 GB (FP16) | 94.1% | 5ms |
| 768 | 3 GB (FP16) | 95.3% | 7ms |
| 1536 | 6 GB (FP16) | 96.1% | 12ms |
| 3072 | 12 GB (FP16) | 96.4% | 22ms |

## Indexing Strategies

### Vector Index Types

Different index types offer different speed/accuracy trade-offs:

```python
# HNSW — best overall accuracy, higher memory
import hnswlib
index = hnswlib.Index(space='cosine', dim=768)
index.init_index(max_elements=1_000_000, ef_construction=200, M=16)
index.add_items(embeddings, ids=doc_ids)
index.set_ef(50)  # Query-time parameter: higher = more accurate, slower

# IVF — best for billion-scale indexes
import faiss
quantizer = faiss.IndexFlatIP(768)
index = faiss.IndexIVFFlat(quantizer, 768, nlist=4096, faiss.METRIC_INNER_PRODUCT)
index.train(training_embeddings)
index.add(embeddings)
index.nprobe = 16  # Search 16 cells: higher = more accurate, slower
```

**Index comparison**:

| Index Type | Build Speed | Memory Usage | Recall@10 | Best Scale |
|-----------|------------|--------------|-----------|------------|
| Flat (brute-force) | Instant | N/A | 100% | &lt;100K vectors |
| HNSW | Slow (minutes) | High (4-8x) | 98-99% | 100K - 10M |
| IVF + Flat | Medium | Low (1-2x) | 95-97% | 1M - 1B |
| IVF + PQ | Fast | Very low (0.5x) | 90-93% | 100M - 1B+ |
| DiskANN | Slow | Disk-based | 96-98% | 10M - 1B |

### Batch Indexing Pipeline

```python
import asyncio
from typing import AsyncIterator

async def build_search_index(
    documents: list[dict],
    embedding_fn,
    vector_db,
    batch_size: int = 100,
    max_concurrent: int = 10,
) -> dict:
    """Build a search index from raw documents."""
    semaphore = asyncio.Semaphore(max_concurrent)
    results = []

    async def process_batch(batch: list[dict]) -> list[dict]:
        async with semaphore:
            texts = [doc["content"] for doc in batch]
            embeddings = await embedding_fn(texts)
            return [
                {"id": doc["id"], "embedding": emb, "metadata": doc.get("metadata", {})}
                for doc, emb in zip(batch, embeddings)
            ]

    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        batch_results = await process_batch(batch)
        results.extend(batch_results)

    # Bulk insert into vector database
    await vector_db.upsert(results)

    return {
        "indexed_count": len(results),
        "embedding_dim": len(results[0]["embedding"]),
        "index_id": vector_db.index_id,
    }
```

### Incremental Index Updates

Production indexes need to stay fresh without full rebuilds:

```python
class IncrementalIndexer:
    def __init__(self, vector_db, embedding_fn, batch_size=100):
        self.vector_db = vector_db
        self.embedding_fn = embedding_fn
        self.batch_size = batch_size

    def sync(self, new_docs: list[dict], deleted_ids: list[str] = None):
        """Incrementally update the index."""
        # Delete removed documents
        if deleted_ids:
            self.vector_db.delete(ids=deleted_ids)

        # Embed and insert new documents
        for i in range(0, len(new_docs), self.batch_size):
            batch = new_docs[i:i + self.batch_size]
            texts = [doc["content"] for doc in batch]
            embeddings = self.embedding_fn(texts)

            records = [
                {"id": doc["id"], "embedding": emb, "metadata": doc.get("metadata", {})}
                for doc, emb in zip(batch, embeddings)
            ]
            self.vector_db.upsert(records)
```

## Query Processing

### Query Transformation Techniques

Raw user queries often benefit from transformation before embedding:

```python
class QueryProcessor:
    def __init__(self, embedding_fn, llm_client):
        self.embedding_fn = embedding_fn
        self.llm = llm_client

    def hyde(self, query: str) -> str:
        """Hypothetical Document Embeddings — generate a hypothetical answer, then embed it."""
        prompt = f"Write a short paragraph that answers this question: {query}"
        hypothetical = self.llm.generate(prompt, max_tokens=150)
        return hypothetical.text

    def query_expansion(self, query: str) -> list[str]:
        """Expand a query into multiple variants."""
        prompt = f"""Generate 3 alternative versions of this search query that might find different relevant documents:
        Query: {query}
        Return only the 3 queries, one per line."""
        response = self.llm.generate(prompt, max_tokens=100)
        return [query] + response.text.strip().split("\n")

    def step_back(self, query: str) -> str:
        """Step-back prompting — ask a broader question to find higher-level context."""
        prompt = f"What is a more general, high-level question that encompasses: '{query}'?"
        return self.llm.generate(prompt, max_tokens=50).text

    def process(self, query: str, strategy: str = "hyde") -> list[float]:
        """Process query with the chosen strategy and return embedding."""
        if strategy == "hyde":
            text_to_embed = self.hyde(query)
        elif strategy == "expansion":
            # Embed all variants and average
            variants = self.query_expansion(query)
            embeddings = [self.embedding_fn(v) for v in variants]
            return [sum(x) / len(x) for x in zip(*embeddings)]
        elif strategy == "step_back":
            text_to_embed = self.step_back(query)
        else:
            text_to_embed = query

        return self.embedding_fn(text_to_embed)
```

### Multi-Stage Retrieval Pipeline

```
User Query
    │
    ▼
┌──────────────────┐
│ Query Rewriting  │  Fix typos, expand acronyms
└──────┬───────────┘
       ▼
┌──────────────────┐
│ Keyword Search   │  BM25, top-100 (fast, broad)
└──────┬───────────┘
       ▼
┌──────────────────┐
│ Semantic Search  │  Vector similarity, top-50
└──────┬───────────┘
       ▼
┌──────────────────┐
│  Cross-Encoder   │  Re-rank, top-10 (accurate, slow)
└──────┬───────────┘
       ▼
┌──────────────────┐
│  LLM Generation  │  Generate answer from top results
└──────────────────┘
```

```python
def multi_stage_retrieve(query: str, top_k: int = 10) -> list[dict]:
    # Stage 1: Broad keyword retrieval
    bm25_results = bm25_search(query, top_k=100)

    # Stage 2: Semantic similarity
    query_embedding = embedding_fn(query)
    semantic_results = vector_db.search(query_embedding, top_k=50)

    # Merge and deduplicate
    merged = reciprocal_rank_fusion([bm25_results, semantic_results], top_k=20)

    # Stage 3: Cross-encoder re-ranking
    pairs = [(query, doc["text"]) for doc in merged]
    scores = cross_encoder.predict(pairs)

    # Sort by cross-encoder score and return top-k
    ranked = sorted(zip(merged, scores), key=lambda x: x[1], reverse=True)
    return [doc for doc, score in ranked[:top_k]]
```

## Relevance Tuning

### Reciprocal Rank Fusion (RRF)

Combining results from multiple retrieval methods:

```python
def reciprocal_rank_fusion(results: list[list[dict]], k: int = 60, top_k: int = 10) -> list[dict]:
    """Combine multiple ranked lists using RRF."""
    rrf_scores: dict[str, float] = {}

    for result_list in results:
        for rank, doc in enumerate(result_list):
            doc_id = doc["id"]
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + 1 / (k + rank + 1)

    # Sort by RRF score descending
    scored_docs = {doc["id"]: doc for result_list in results for doc in result_list}
    sorted_docs = sorted(scored_docs.values(), key=lambda d: rrf_scores.get(d["id"], 0), reverse=True)
    return sorted_docs[:top_k]
```

### Cross-Encoder Re-Ranking

Cross-encoders are more accurate than bi-encoders for re-ranking:

```python
from sentence_transformers import CrossEncoder

# Load a cross-encoder model
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def rerank_results(query: str, documents: list[dict], top_k: int = 10) -> list[dict]:
    """Re-rank documents using a cross-encoder."""
    pairs = [(query, doc["content"]) for doc in documents]
    scores = reranker.predict(pairs, batch_size=32, show_progress_bar=False)

    for doc, score in zip(documents, scores):
        doc["rerank_score"] = float(score)

    return sorted(documents, key=lambda x: x["rerank_score"], reverse=True)[:top_k]
```

**Re-ranker comparison**:

| Model | Speed (docs/sec) | NDCG@10 | Size | Best For |
|-------|----------------|---------|------|----------|
| ms-marco-MiniLM-L-6-v2 | 5000+ | 39.7 | 80MB | Fast production re-ranking |
| ms-marco-MiniLM-L-12-v2 | 2500+ | 40.9 | 120MB | Balanced speed/accuracy |
| bge-reranker-large | 800+ | 44.3 | 1.1GB | Highest accuracy |
| bge-reranker-v2-m3 | 1000+ | 45.1 | 570MB | Multilingual re-ranking |
| rankllm (GPT-4) | 5-10 | 48.2 | N/A | LLM-based re-ranking |

### Metadata Filtering

Combining semantic search with structured filters:

```python
# Pre-filtering (filter before vector search — faster)
results = vector_db.search(
    query_embedding=embedding,
    top_k=10,
    filter={"document_type": "manual", "date": {"$gte": "2025-01-01"}},
)

# Post-filtering (filter after — useful for complex filters)
results = vector_db.search(query_embedding=embedding, top_k=50)
filtered = [r for r in results if r["metadata"]["department"] == "engineering"]

# Hybrid: pre-filter coarse, post-filter fine
results = vector_db.search(
    query_embedding=embedding,
    top_k=100,
    filter={"category": {"$in": ["engineering", "architecture"]}},
)
final = [r for r in results if r["metadata"]["tags"] and "critical" in r["metadata"]["tags"]]
```

## Hybrid Search Approaches

### BM25 + Semantic Hybrid

The most common hybrid approach combines keyword and semantic search:

```python
def hybrid_search(
    query: str,
    bm25_index,
    vector_db,
    alpha: float = 0.5,
    top_k: int = 10,
) -> list[dict]:
    """Hybrid search combining BM25 and semantic similarity.

    alpha=0.5: equal weight
    alpha=0.0: pure BM25
    alpha=1.0: pure semantic
    """
    # Get BM25 scores
    bm25_results = bm25_index.search(query, top_k=top_k * 3)
    bm25_scores = normalize_scores([r["score"] for r in bm25_results])

    # Get semantic similarity scores
    query_emb = embedding_fn(query)
    semantic_results = vector_db.search(query_emb, top_k=top_k * 3)
    semantic_scores = normalize_scores([r["score"] for r in semantic_results])

    # Combine with weighted score
    all_docs = {}
    for result, score in zip(bm25_results, bm25_scores):
        all_docs[result["id"]] = {"doc": result, "bm25": score, "semantic": 0.0}
    for result, score in zip(semantic_results, semantic_scores):
        if result["id"] in all_docs:
            all_docs[result["id"]]["semantic"] = score
        else:
            all_docs[result["id"]] = {"doc": result, "bm25": 0.0, "semantic": score}

    # Score = alpha * semantic + (1-alpha) * bm25
    combined = sorted(
        all_docs.values(),
        key=lambda x: alpha * x["semantic"] + (1 - alpha) * x["bm25"],
        reverse=True,
    )

    return [item["doc"] for item in combined[:top_k]]
```

### Tuning the Alpha Parameter

```python
def find_optimal_alpha(
    queries: list[str],
    relevance_judgments: list[list[str]],  # List of relevant doc IDs per query
) -> float:
    """Grid search for the optimal BM25/semantic blend weight."""
    best_alpha = 0.5
    best_ndcg = 0.0

    for alpha in [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]:
        ndcg_scores = []
        for query, relevant_docs in zip(queries, relevance_judgments):
            results = hybrid_search(query, alpha=alpha, top_k=10)
            result_ids = [r["id"] for r in results]
            ndcg = compute_ndcg(result_ids, relevant_docs)
            ndcg_scores.append(ndcg)

        avg_ndcg = sum(ndcg_scores) / len(ndcg_scores)
        if avg_ndcg > best_ndcg:
            best_ndcg = avg_ndcg
            best_alpha = alpha

    return best_alpha, best_ndcg
```

**Typical alpha values by domain**:

| Domain | Optimal Alpha | Why |
|--------|--------------|-----|
| Legal documents | 0.3 | Precise terminology benefits from keyword matching |
| Customer support | 0.6 | Natural language queries benefit from semantics |
| Code search | 0.4 | Variable names and APIs need exact matching |
| Creative writing | 0.8 | Conceptual similarity matters most |
| Medical literature | 0.5 | Balance between medical terminology and concepts |

## Production Considerations

### Embedding Caching

```python
import hashlib
import json
from diskcache import Cache

class CachedEmbedder:
    def __init__(self, embedder, cache_dir: str = "/tmp/embedding_cache"):
        self.embedder = embedder
        self.cache = Cache(cache_dir)

    def __call__(self, texts: list[str]) -> list[list[float]]:
        results = []
        uncached = []
        uncached_indices = []

        for i, text in enumerate(texts):
            cache_key = hashlib.md5(text.encode()).hexdigest()
            if cache_key in self.cache:
                results.append(self.cache[cache_key])
            else:
                uncached.append(text)
                uncached_indices.append(i)

        if uncached:
            new_embeddings = self.embedder(uncached)
            for idx, text, emb in zip(uncached_indices, uncached, new_embeddings):
                cache_key = hashlib.md5(text.encode()).hexdigest()
                self.cache[cache_key] = emb
                results.insert(idx, emb)

        return results
```

### Monitoring Search Quality

Track these metrics in production (see [LLM Metrics & KPIs](/docs/llm-metrics-kpis) for a broader framework):

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Recall@K | >90% @ K=20 | Annotated query/doc pairs |
| MRR | >0.7 | First relevant doc rank |
| NDCG@10 | >0.6 | Graded relevance judgments |
| Query latency (p95) | &lt;200ms | APM metrics |
| Zero-result rate | &lt;5% | Log analysis |
| Click-through rate | >40% | User interaction tracking |

### Common Pitfalls

1. **Not normalizing embeddings**: Always L2-normalize before cosine similarity
2. **Ignoring query length**: Very short queries perform poorly; consider expansion
3. **Single embedding model**: Different domains may need different models
4. **No fallback**: Always have a keyword search fallback when semantic search fails
5. **Stale indexes**: Implement incremental updates for fresh content
6. **Dimension mismatch**: Embedding models and indexes must use the same dimension count

## Cross-References

- For RAG-specific embedding usage, see [RAG — Retrieval-Augmented Generation](/docs/rag-retrieval-augmented-generation)
- For vector database comparisons, see [Vector Databases Comparison](/docs/vector-databases-comparison)
- For tokenization fundamentals, see [Tokenization & Embeddings](/docs/tokenization-embeddings)
- For tracking search quality in production, see [LLM Metrics & KPIs](/docs/llm-metrics-kpis)
