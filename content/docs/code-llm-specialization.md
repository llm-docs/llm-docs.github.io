---
title: "Code LLM Specialization"
description: "Code-specific LLM techniques — code tokenization, repository-level context, code fine-tuning, program synthesis evaluation, and code-specific RAG"
date: "2026-04-24"
category: "Architecture & Training"
tags: ["code", "code-generation", "fine-tuning", "tokenization", "repository-context", "program-synthesis"]
author: "LLM Hub Team"
---

# Code LLM Specialization

Code is structurally different from natural language. It has strict syntax, hierarchical scoping, execution semantics, and dependency relationships. Code-specialized LLMs address these unique challenges through modified tokenization, training data curation, and architecture.

## Code Tokenization

### The Problem with Standard Tokenizers

Standard LLM tokenizers (BPE, SentencePiece) are trained on natural language and struggle with code:

```python
# Standard tokenizer on code:
code = "self._validate_response(data, strict=True)"
# Tokens: ['self', '._', 'validate', '_response', '(data', ',st', 'rict', '=', 'True', ')']
# Problem: breaks identifiers at arbitrary boundaries
```

### Code-Specific Tokenizers

Code tokenizers respect programming language syntax:

```python
# Code-aware tokenizer:
code = "self._validate_response(data, strict=True)"
# Tokens: ['self', '.', '_validate_response', '(', 'data', ',', ' ', 'strict', '=', 'True', ')']
# Respects: identifiers, operators, delimiters, keywords
```

### Identifier Vocabulary

Code LLMs often maintain a separate vocabulary for frequent identifiers:

```python
class CodeTokenizer:
    def __init__(self, base_tokenizer, code_corpus):
        self.base = base_tokenizer
        # Build vocabulary from frequent identifiers in code
        self.identifier_vocab = self._extract_identifiers(code_corpus)
    
    def tokenize(self, code):
        # Replace known identifiers with special tokens
        processed = code
        replacements = []
        for ident in sorted(self.identifier_vocab.keys(), key=len, reverse=True):
            if ident in processed:
                token_id = self.identifier_vocab[ident]
                special = "[ID" + str(token_id) + "]"
                processed = processed.replace(ident, special)
                replacements.append((special, ident))
        
        # Tokenize with base tokenizer
        tokens = self.base.encode(processed).ids
        return tokens
```

**Benefits**: 10-30% reduction in token count for code, better preservation of identifier semantics.

## Code Fine-tuning Data Preparation

### Data Sources

| Source | Languages | Quality | Scale |
|--------|----------|---------|-------|
| The Stack | 350+ | Raw, needs filtering | 3.1T tokens |
| GitHub (public) | All | Variable | Massive |
| StackOverflow | Multi | High (curated Q&A) | 45M posts |
| LeetCode/HumanEval | Python | Very high | Limited |
| Internal codebases | Project-specific | Highest | Organization-specific |

### Data Cleaning Pipeline

```python
from pathlib import Path

def prepare_code_dataset(
    repos,
    min_file_length=100,
    max_file_length=5000,
    languages=None,
):
    """Prepare code files for fine-tuning."""
    samples = []

    for repo_path in repos:
        for file_path in Path(repo_path).rglob("*"):
            # Filter by language
            lang_suffixes = set("." + lang for lang in (languages or []))
            if languages and file_path.suffix not in lang_suffixes:
                continue

            # Filter by size
            try:
                content = file_path.read_text()
            except (UnicodeDecodeError, PermissionError):
                continue

            if len(content) < min_file_length or len(content) > max_file_length:
                continue

            # Skip generated files
            markers = [".min.", "generated_", "__pycache__"]
            if any(marker in str(file_path) for marker in markers):
                continue

            samples.append(dict(
                text=content,
                file_path=str(file_path),
                language=file_path.suffix.lstrip("."),
            ))

    return samples
```

### Instruction Tuning for Code

```python
import random

def create_instruction_samples(samples):
    """Convert raw code into instruction-tuning format."""
    instruction_templates = [
        "Complete the following code:\n\n```python\n{prefix}\n```\n\nComplete the implementation:",
        "Write documentation for this code:\n\n```python\n{code}\n```\n\nAdd docstrings and comments:",
        "Find and fix the bug in this code:\n\n```python\n{buggy_code}\n```\n\nFixed code:",
        "Write tests for this function:\n\n```python\n{code}\n```\n\nTest suite:",
    ]

    instruction_samples = []
    for sample in samples:
        template = random.choice(instruction_templates)
        
        if "Complete the following" in template:
            lines = sample["text"].split("\n")
            cut_point = int(len(lines) * 0.7)
            prefix = "\n".join(lines[:cut_point])
            completion = "\n".join(lines[cut_point:])
            instruction = template.format(prefix=prefix)
        elif "Write documentation" in template:
            instruction = template.format(code=sample["text"])
            completion = "# Documentation for this file:\n# ..."
        else:
            continue
        
        instruction_samples.append(dict(
            instruction=instruction,
            completion=completion,
            language=sample["language"],
        ))

    return instruction_samples
```

## Repository-Level Context

Code rarely exists in isolation. Understanding a function often requires its surrounding file, module, and dependency context.

### Code Dependency Graph

```python
class CodeContextBuilder:
    def __init__(self, repo_path):
        self.repo_path = repo_path
        self.file_graph = self._build_dependency_graph()
    
    def _build_dependency_graph(self):
        """Build a graph of file dependencies based on imports."""
        graph = dict()
        for py_file in Path(self.repo_path).rglob("*.py"):
            imports = self._extract_imports(py_file)
            graph[str(py_file)] = imports
        return graph
    
    def get_context(self, file_path, depth=1):
        """Get surrounding context for a file."""
        context_files = [file_path]
        
        if depth > 0:
            direct_deps = self.file_graph.get(file_path, [])
            context_files.extend(direct_deps[:3])  # Top 3 dependencies
        
        context_text = []
        for f in context_files:
            try:
                content = Path(f).read_text()
                # Truncate long files
                if len(content) > 1000:
                    content = content[:1000] + "\n# ... (truncated)"
                context_text.append("# File: " + f + "\n" + content)
            except FileNotFoundError:
                pass
        
        return "\n\n---\n\n".join(context_text)
```

### Code RAG Pipeline

```python
class CodeAssistant:
    def __init__(self, llm, embedding_fn, indexer):
        self.llm = llm
        self.embedding_fn = embedding_fn
        self.indexer = indexer
    
    async def answer(self, query, current_file=None):
        """Answer coding questions with repository context."""
        # Step 1: Retrieve relevant code snippets
        snippets = await self._retrieve_snippets(query, top_k=5)
        
        # Step 2: Get current file context if available
        file_context = ""
        if current_file:
            file_context = self.indexer.get_context(current_file, depth=1)
        
        # Step 3: Build prompt with code context
        prompt = self._build_prompt(query, snippets, file_context)
        
        # Step 4: Generate response
        response = await self.llm.generate(prompt, max_tokens=1000)
        return response.text
    
    async def _retrieve_snippets(self, query, top_k=5):
        """Retrieve relevant code using hybrid search."""
        # Semantic search with code embeddings
        query_embedding = self.embedding_fn(query)
        semantic_results = await self.indexer.vector_db.search(query_embedding, top_k=top_k * 2)
        
        # Keyword search on function/class names
        keywords = self._extract_keywords(query)
        keyword_results = self._keyword_search(keywords, top_k=top_k * 2)
        
        # Combine and re-rank
        combined = self._hybrid_rank(semantic_results, keyword_results)
        return combined[:top_k]
```

## Program Synthesis Evaluation

Evaluating code generation requires execution-based metrics, not text similarity.

### Evaluation Metrics

| Metric | Description | Good Threshold |
|--------|-----------|---------------|
| **pass@1** | Generated code passes tests on first try | >50% (small), >80% (large) |
| **pass@10** | Fraction solved with 10 attempts | >60% (small), >85% (large) |
| **Exact Match** | Generated code matches reference exactly | Useful for simple tasks |
| **BLEU/CodeBLEU** | N-gram overlap with reference | Secondary metric |
| **Compilation Rate** | Generated code compiles without errors | >80% |
| **Runtime Errors** | Code compiles but has runtime errors | &lt;15% |
| **Efficiency Score** | Generated code has acceptable time complexity | >70% |

### Execution-Based Evaluation

```python
import subprocess
import tempfile

def evaluate_code_generation(model, benchmark, num_samples=1):
    """Evaluate code generation on a benchmark like HumanEval."""
    results = []
    
    for problem in benchmark:
        passed = 0
        for _ in range(num_samples):
            # Generate solution
            prompt = problem["prompt"]
            solution = model.generate(prompt, max_tokens=500)
            
            # Build test file
            test_code = problem["test"]
            full_code = solution.text + "\n\n" + test_code
            
            # Execute tests
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(full_code)
                f.flush()
                
                try:
                    proc = subprocess.run(
                        ["python", f.name],
                        capture_output=True,
                        text=True,
                        timeout=30,
                    )
                    if proc.returncode == 0:
                        passed += 1
                except subprocess.TimeoutExpired:
                    pass  # Infinite loop = failed
        
        results.append(passed / num_samples)
    
    # pass@k metric
    avg_pass = sum(results) / len(results)
    return {"pass_rate": avg_pass, "details": results}
```

## Code LLM Landscape (2026)

| Model | Size | Context | Strengths | Best For |
|-------|------|---------|-----------|----------|
| Qwen2.5-Coder | 0.5B - 32B | 128K | Strong multilingual, open weights | General code tasks |
| DeepSeek-Coder V2 | 16B - 236B | 128K | Competitive with frontier | Code generation |
| StarCoder2 | 3B - 15B | 16K | Trained on 100+ languages | Multi-language support |
| CodeLlama | 7B - 70B | 16K | Infilling, instruction tuning | Code completion |
| Codestral | 22B | 32K | Fast inference, strong reasoning | Code + reasoning |
| Claude Code | API | 200K | Repository understanding, agentic | Code review, refactoring |
| GPT-4o | API | 128K | Versatile, tool use | General purpose coding |

## Best Practices

1. **Use code-specific tokenizers** — 10-30% efficiency gain
2. **Include repository context** — answers improve dramatically with dependency awareness
3. **Evaluate with execution** — text similarity metrics are misleading for code
4. **Filter training data aggressively** — generated, minified, and duplicated code hurts quality
5. **Fine-tune on your codebase** — even 100 examples of your patterns help significantly
6. **Use hybrid retrieval** — semantic + keyword search for code snippets

## Related Documentation

- **[Fine-tuning & LoRA](/docs/fine-tuning-lora)** — Adapting models to your codebase
- **[RAG Systems](/docs/rag-retrieval-augmented-generation)** — Retrieving relevant code context
- **[Function Calling](/docs/function-calling-tool-use)** — Letting models execute code
- **[Prompt Engineering](/docs/prompt-engineering)** — Crafting effective coding prompts
