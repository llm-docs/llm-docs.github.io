---
title: "LLM Memory Systems"
description: "Building persistent memory for LLM applications — short-term vs long-term memory, vector-based recall, summarization memory, and memory-augmented reasoning"
date: "2026-04-23"
category: "Advanced Technical"
tags: ["memory", "persistence", "vector-database", "summarization", "context-management", "personalization"]
author: "IntuiVortex Team"
---

# LLM Memory Systems

LLMs are inherently stateless — each request is independent of all others. Building memory systems transforms them from one-shot responders into persistent, context-aware assistants that learn and adapt over time. This guide covers memory architectures from simple context windows to sophisticated multi-layer memory systems.

## The Memory Hierarchy

Human-inspired memory layers for LLM systems:

```
┌─────────────────────────────────────────────┐
│          Sensory Memory (Immediate)         │  Current token generation
│  Duration: milliseconds                     │
├─────────────────────────────────────────────┤
│         Working Memory (Context Window)     │  Active conversation
│  Duration: single session                   │
│  Capacity: 4K - 200K tokens                 │
├─────────────────────────────────────────────┤
│        Short-Term Memory (Recent History)   │  Recent conversations
│  Duration: hours to days                    │
│  Storage: Redis / in-memory cache           │
├─────────────────────────────────────────────┤
│        Long-Term Memory (Semantic Store)    │  Facts, preferences, patterns
│  Duration: weeks to months                  │
│  Storage: Vector database                   │
├─────────────────────────────────────────────┤
│      Procedural Memory (Learned Behavior)   │  System prompts, fine-tuning
│  Duration: permanent                        │
│  Storage: Config files, model weights       │
└─────────────────────────────────────────────┘
```

## Working Memory Management

### Context Window Optimization

The most immediate form of memory is the context window itself. Effective management is critical:

```python
class ContextWindowManager:
    """Manages the conversation context within token limits."""

    def __init__(self, max_tokens: int = 128_000, reserve_tokens: int = 4096):
        self.max_tokens = max_tokens - reserve_tokens  # Reserve for response
        self.messages: list[dict] = []
        self.token_counts: list[int] = []

    def add_message(self, role: str, content: str, tokenizer) -> bool:
        """Add a message, trimming if necessary to stay within limits."""
        msg_tokens = tokenizer.count_tokens(content)

        # If single message exceeds limit, truncate it
        if msg_tokens > self.max_tokens:
            content = tokenizer.truncate(content, max_tokens=self.max_tokens)
            msg_tokens = self.max_tokens

        # Trim oldest messages until we fit
        total_tokens = sum(self.token_counts) + msg_tokens
        while total_tokens > self.max_tokens and self.messages:
            removed = self.messages.pop(0)
            removed_tokens = self.token_counts.pop(0)
            total_tokens -= removed_tokens

        self.messages.append({"role": role, "content": content})
        self.token_counts.append(msg_tokens)
        return True

    def get_context(self) -> list[dict]:
        """Return the current context for the LLM."""
        return self.messages.copy()

    def estimated_tokens(self) -> int:
        return sum(self.token_counts)

    def remaining_capacity(self) -> int:
        return self.max_tokens - self.estimated_tokens()
```

### Sliding Window vs. Summarization

Two main strategies for managing conversation history:

```python
class SlidingWindowMemory:
    """Keep the most recent N messages, drop the rest."""

    def __init__(self, window_size: int = 20):
        self.window_size = window_size
        self.messages: list[dict] = []

    def add(self, message: dict):
        self.messages.append(message)
        if len(self.messages) > self.window_size:
            self.messages = self.messages[-self.window_size:]

    def get(self) -> list[dict]:
        return self.messages


class SummarizationMemory:
    """Summarize old conversation, keep recent messages raw."""

    def __init__(self, llm, summarize_threshold: int = 15, keep_recent: int = 5):
        self.llm = llm
        self.summarize_threshold = summarize_threshold
        self.keep_recent = keep_recent
        self.messages: list[dict] = []
        self.summary: str = ""

    async def add(self, message: dict):
        self.messages.append(message)

        if len(self.messages) > self.summarize_threshold:
            # Summarize the oldest messages
            to_summarize = self.messages[:self.summarize_threshold - self.keep_recent]
            new_summary = await self._summarize(to_summarize)

            # Update summary and keep only recent messages
            if self.summary:
                self.summary = await self._merge_summaries(self.summary, new_summary)
            else:
                self.summary = new_summary

            self.messages = self.messages[self.summarize_threshold - self.keep_recent:]

    async def get(self) -> list[dict]:
        context = []
        if self.summary:
            context.append({
                "role": "system",
                "content": f"Summary of earlier conversation: {self.summary}",
            })
        context.extend(self.messages)
        return context

    async def _summarize(self, messages: list[dict]) -> str:
        prompt = f"""Summarize this conversation in 3-5 sentences, capturing key facts, decisions, and user preferences:

{messages}

Summary:"""
        response = await self.llm.generate(prompt, max_tokens=200)
        return response.text.strip()

    async def _merge_summaries(self, old_summary: str, new_summary: str) -> str:
        prompt = f"""Merge these two conversation summaries into one coherent summary:

Previous summary: {old_summary}
New summary: {new_summary}

Merged summary:"""
        response = await self.llm.generate(prompt, max_tokens=300)
        return response.text.strip()
```

## Long-Term Memory with Vector Storage

### Memory Storage and Retrieval

```python
class LongTermMemory:
    """Persistent memory store using vector embeddings for semantic retrieval."""

    def __init__(self, vector_db, embedding_fn, user_id: str):
        self.vector_db = vector_db
        self.embedding_fn = embedding_fn
        self.user_id = user_id

    async def store(self, text: str, metadata: dict = None):
        """Store a memory with semantic embedding."""
        embedding = self.embedding_fn(text)
        doc = {
            "embedding": embedding,
            "text": text,
            "metadata": {
                **(metadata or {}),
                "user_id": self.user_id,
                "timestamp": datetime.utcnow().isoformat(),
            },
        }
        await self.vector_db.insert(doc)

    async def retrieve(self, query: str, top_k: int = 5) -> list[dict]:
        """Retrieve relevant memories for the current query."""
        query_embedding = self.embedding_fn(query)
        results = await self.vector_db.search(
            embedding=query_embedding,
            top_k=top_k,
            filter={"user_id": self.user_id},
        )
        return [{"text": r["text"], "metadata": r["metadata"]} for r in results]

    async def store_conversation(self, messages: list[dict]):
        """Extract and store key facts from a conversation."""
        facts = await self._extract_facts(messages)
        for fact in facts:
            await self.store(fact, metadata={"type": "fact", "source": "conversation"})

    async def _extract_facts(self, messages: list[dict]) -> list[str]:
        """Use LLM to extract factual information from conversation."""
        prompt = f"""Extract all factual information about the user from this conversation.
Focus on: preferences, personal details, goals, constraints, and learned patterns.

Conversation:
{messages}

Return one fact per line. Only include information that would be useful to remember for future conversations.
If there are no facts, return 'None.'"""
        response = await self.llm.generate(prompt, max_tokens=500)
        facts = [line.strip() for line in response.text.strip().split("\n") if line.strip() and line.strip() != "None"]
        return facts
```

### Memory Consolidation

Like human sleep-based memory consolidation, periodically reorganize and compress memories:

```python
class MemoryConsolidator:
    """Periodically consolidate, deduplicate, and organize memories."""

    def __init__(self, vector_db, llm, embedding_fn):
        self.vector_db = vector_db
        self.llm = llm
        self.embedding_fn = embedding_fn

    async def consolidate(self, user_id: str):
        """Run memory consolidation for a user."""
        # 1. Retrieve all memories
        all_memories = await self.vector_db.get_all(user_id=user_id)

        # 2. Cluster similar memories
        clusters = await self._cluster_memories(all_memories)

        # 3. For each cluster, create a consolidated memory
        for cluster in clusters:
            if len(cluster) > 1:
                # Merge multiple similar memories into one
                consolidated = await self._merge_memories(cluster)
                # Delete the originals
                for memory in cluster:
                    await self.vector_db.delete(memory["id"])
                # Store the consolidated memory
                await self.vector_db.insert({
                    "embedding": self.embedding_fn(consolidated),
                    "text": consolidated,
                    "metadata": {"type": "consolidated", "user_id": user_id},
                })

        # 4. Delete stale/low-value memories
        await self._prune_stale_memories(user_id)

    async def _cluster_memories(self, memories: list[dict]) -> list[list[dict]]:
        """Cluster similar memories using embedding similarity."""
        from sklearn.cluster import DBSCAN
        import numpy as np

        embeddings = np.array([m["embedding"] for m in memories])
        clustering = DBSCAN(eps=0.3, min_samples=2, metric="cosine").fit(embeddings)

        clusters: dict[int, list] = {}
        for memory, label in zip(memories, clustering.labels_):
            clusters.setdefault(label, []).append(memory)

        return list(clusters.values())

    async def _merge_memories(self, cluster: list[dict]) -> str:
        """Merge a cluster of memories into a single consolidated memory."""
        texts = [m["text"] for m in cluster]
        prompt = f"""Consolidate these related memories into a single, comprehensive statement:

{chr(10).join(f"- {t}" for t in texts)}

Consolidated memory:"""
        response = await self.llm.generate(prompt, max_tokens=200)
        return response.text.strip()

    async def _prune_stale_memories(self, user_id: str, max_age_days: int = 90):
        """Remove memories that are old and haven't been accessed."""
        cutoff = (datetime.utcnow() - timedelta(days=max_age_days)).isoformat()
        stale = await self.vector_db.query(
            f"SELECT id FROM memories WHERE user_id='{user_id}' AND timestamp < '{cutoff}' AND access_count = 0"
        )
        for memory in stale:
            await self.vector_db.delete(memory["id"])
```

## Memory-Augmented Reasoning

### Retrieval-Augmented Reasoning

Integrate long-term memory directly into the reasoning process:

```python
class MemoryAugmentedAgent:
    """An agent that uses long-term memory to enhance its reasoning."""

    def __init__(self, llm, memory: LongTermMemory, max_memories: int = 5):
        self.llm = llm
        self.memory = memory
        self.max_memories = max_memories

    async def respond(self, user_message: str, conversation_history: list[dict] = None) -> str:
        """Generate a response enhanced with relevant memories."""
        # Step 1: Retrieve relevant memories
        memories = await self.memory.retrieve(user_message, top_k=self.max_memories)

        # Step 2: Construct enhanced prompt
        system_prompt = self._build_system_prompt(memories)
        messages = [
            {"role": "system", "content": system_prompt},
        ]
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_message})

        # Step 3: Generate response
        response = await self.llm.chat(messages)

        # Step 4: Store new information from this interaction
        await self.memory.store_conversation(
            [{"role": "user", "content": user_message}, {"role": "assistant", "content": response}]
        )

        return response

    def _build_system_prompt(self, memories: list[dict]) -> str:
        memory_context = ""
        if memories:
            memory_context = "\nRelevant information you know about this user:\n"
            for m in memories:
                memory_context += f"- {m['text']}\n"

        return f"""You are a personalized assistant that remembers details about the user.{memory_context}

Use these memories to provide more relevant and personalized responses. Only reference memories when they are directly relevant to the user's question.
Do not mention that you are referencing stored memories — just use the information naturally."""
```

### Episodic vs. Semantic Memory

```python
class DualMemorySystem:
    """Separate episodic (event-based) and semantic (fact-based) memory."""

    def __init__(self, episodic_db, semantic_db, embedding_fn):
        self.episodic_db = episodic_db  # Stores specific events
        self.semantic_db = semantic_db  # Stores general facts
        self.embedding_fn = embedding_fn

    async def store_experience(self, event: str, metadata: dict = None):
        """Store a specific event in episodic memory."""
        embedding = self.embedding_fn(event)
        await self.episodic_db.insert({
            "embedding": embedding,
            "text": event,
            "metadata": {"type": "episodic", **(metadata or {})},
        })

    async def store_fact(self, fact: str, confidence: float = 1.0):
        """Store a general fact in semantic memory."""
        embedding = self.embedding_fn(fact)
        await self.semantic_db.insert({
            "embedding": embedding,
            "text": fact,
            "metadata": {"type": "semantic", "confidence": confidence},
        })

    async def retrieve_context(self, query: str) -> dict:
        """Retrieve both episodic and semantic context for a query."""
        episodic = await self.episodic_db.search(self.embedding_fn(query), top_k=3)
        semantic = await self.semantic_db.search(self.embedding_fn(query), top_k=5)

        return {
            "episodes": [e["text"] for e in episodic],
            "facts": [{"text": s["text"], "confidence": s["metadata"].get("confidence", 1.0)} for s in semantic],
        }

    async def distill_facts_from_episodes(self):
        """Periodically extract general facts from episodic memories."""
        recent_episodes = await self.episodic_db.get_recent(top_k=50)
        if not recent_episodes:
            return

        episode_texts = [e["text"] for e in recent_episodes]
        prompt = f"""From these experiences, extract general facts and preferences that would be useful to remember:

{chr(10).join(f"- {t}" for t in episode_texts)}

Extract facts (one per line). Only include information that generalizes beyond the specific event:"""
        response = await self.llm.generate(prompt, max_tokens=300)
        for line in response.text.strip().split("\n"):
            if line.strip():
                await self.store_fact(line.strip(), confidence=0.8)
```

## Memory Evaluation

| Metric | Description | Target |
|--------|-------------|--------|
| **Recall Precision** | Retrieved memories are relevant to the query | >70% |
| **Recall Coverage** | Relevant memories are found among all stored | >50% |
| **Memory Freshness** | How quickly new information is stored | &lt;5 seconds |
| **Consolidation Quality** | Merged memories preserve key information | Subjective eval |
| **Personalization Score** | Responses improve with memory vs. without | >20% improvement |
| **Memory Bloat** | Redundant/duplicate memories stored | &lt;15% |

## Production Architecture

```
User Request
    │
    ▼
┌───────────────────────┐
│  Memory Retrieval     │  Query both episodic and semantic
│  ├─ Episodic (recent) │
│  └─ Semantic (facts)  │
└──────────┬────────────┘
           ▼
┌───────────────────────┐
│  Context Assembly     │  Combine memories into prompt
│  ├─ System prompt     │
│  ├─ Relevant memories │
│  └─ Conversation hist │
└──────────┬────────────┘
           ▼
    ┌──────────────┐
    │     LLM      │  Generate with memory context
    └──────┬───────┘
           ▼
┌───────────────────────┐
│  Memory Extraction    │  Extract facts from interaction
│  ├─ Store new facts   │
│  └─ Update episodes   │
└───────────────────────┘
```

```python
class ProductionMemorySystem:
    """Production-ready memory system with all components."""

    def __init__(self, config: dict):
        self.working_memory = SummarizationMemory(
            llm=config["llm"],
            summarize_threshold=config.get("summarize_threshold", 15),
            keep_recent=config.get("keep_recent", 5),
        )
        self.long_term_memory = LongTermMemory(
            vector_db=config["vector_db"],
            embedding_fn=config["embedding_fn"],
        )
        self.consolidator = MemoryConsolidator(
            vector_db=config["vector_db"],
            llm=config["llm"],
            embedding_fn=config["embedding_fn"],
        )

    async def process(self, user_id: str, message: str) -> str:
        # 1. Retrieve long-term memories
        memories = await self.long_term_memory.retrieve(message, top_k=5)

        # 2. Add to working memory
        await self.working_memory.add({"role": "user", "content": message})

        # 3. Build prompt with all memory layers
        context = await self.working_memory.get()
        context = self._inject_memories(context, memories)

        # 4. Generate response
        response = await self.llm.chat(context)

        # 5. Store new information
        await self.working_memory.add({"role": "assistant", "content": response})
        await self.long_term_memory.store_conversation(
            [{"role": "user", "content": message}, {"role": "assistant", "content": response}]
        )

        return response

    def schedule_consolidation(self, user_id: str, interval_hours: int = 24):
        """Schedule periodic memory consolidation."""
        import asyncio
        async def consolidate_loop():
            while True:
                await self.consolidator.consolidate(user_id)
                await asyncio.sleep(interval_hours * 3600)
        asyncio.create_task(consolidate_loop())

    def _inject_memories(self, context: list[dict], memories: list[dict]) -> list[dict]:
        """Inject retrieved memories into the conversation context."""
        if not memories:
            return context

        memory_text = "Relevant context:\n" + "\n".join(f"- {m['text']}" for m in memories)

        # Insert as a system message at the beginning
        system_msg = context[0] if context[0]["role"] == "system" else None
        if system_msg:
            system_msg["content"] += f"\n\n{memory_text}"
        else:
            context.insert(0, {"role": "system", "content": memory_text})

        return context
```

## Cross-References

- For agent architectures that use memory, see [AI Agent Architectures](/docs/ai-agents-architectures)
- For context window management techniques, see [Context Window Management](/docs/context-window-management)
- For vector databases used in memory storage, see [Vector Databases Comparison](/docs/vector-databases-comparison)
- For RAG-based memory retrieval, see [RAG — Retrieval-Augmented Generation](/docs/rag-retrieval-augmented-generation)
