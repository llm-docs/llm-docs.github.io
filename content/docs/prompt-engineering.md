---
title: "Prompt Engineering Guide"
description: "Master the art and science of crafting effective prompts — from zero-shot to advanced reasoning patterns"
date: "2026-04-05"
updatedAt: "2026-04-10"
category: "Best Practices"
tags: ["prompting", "engineering", "techniques", "best-practices", "prompt-design", "reasoning"]
author: "LLM Hub Team"
---

# Prompt Engineering Guide

Prompt engineering is the practice of designing, optimizing, and systematizing input prompts to get reliable, high-quality results from Large Language Models. It combines an understanding of model behavior with structured communication patterns.

This guide covers everything from foundational principles to advanced reasoning techniques used by AI engineers in production systems.

## Core Principles

### 1. Be Clear and Specific

Vague prompts produce vague outputs. The more precise your instructions, the more useful the response.

| ❌ Vague | ✅ Specific |
|----------|------------|
| `Tell me about AI` | `Explain the difference between narrow AI and general AI in 3 bullet points, with one real-world example each` |
| `Write code` | `Write a Python function that takes a list of dicts and returns those sorted by a given key, with type hints and error handling` |
| `Summarize this` | `Summarize the following article in 5 bullet points, focusing on business impact and technical implications` |

### 2. Provide Context and Role

```markdown
You are a senior ML engineer with 10 years of experience building production NLP systems.
Explain the concept of attention mechanisms to a software engineer who knows Python
but has never studied deep learning. Use analogies from web development where possible.
```

### 3. Specify Output Format

```markdown
Analyze the following code for security vulnerabilities.

Format your response as:
1. **Critical Issues** (list with severity)
2. **Recommendations** (prioritized list)
3. **Fixed Code** (complete rewritten version)
4. **Explanation** (2-3 sentences per fix)

Code:
{insert_code_here}
```

### 4. Use Delimiters and Structure

```markdown
<task>Classify the sentiment of the following review</task>

<review>
The product arrived late and the packaging was damaged. 
However, the item itself works perfectly and exceeds expectations.
Mixed feelings overall.
</review>

<output_format>
Sentiment: [Positive/Negative/Mixed]
Confidence: [0-100%]
Key phrases: [list]
Reasoning: [2-3 sentences]
</output_format>
```

## Fundamental Techniques

### Zero-Shot Prompting

Ask the model to perform a task without examples.

```
Translate the following text to French: "The future of AI is collaborative."
```

**Best for**: Common tasks the model has seen during training (translation, summarization, classification).

### Few-Shot Prompting

Provide examples to establish the expected pattern.

```
Convert these movie titles to emoji representations:

Input: "The Lion King"
Output: 🦁👑

Input: "Finding Nemo"
Output: 🔍🐠

Input: "The Matrix"
Output: 💊🕶️

Input: "Interstellar"
Output:
```

**Best for**: Tasks requiring specific formatting, style transfer, or non-obvious mappings.

### Chain of Thought (CoT)

Encourage step-by-step reasoning before answering.

```
A factory produces 500 widgets per day. 12% are defective. 
Of the non-defective widgets, 80% are shipped immediately 
and the rest are stored. How many widgets are stored per week (5 days)?

Let's solve this step by step:
```

**Why it works**: Forces the model to "show its work," reducing calculation errors and logical mistakes. Research shows CoT can improve accuracy on math and reasoning tasks by 10-40%.

### Role Prompting

Assign a specific persona or expertise level.

```
You are a cybersecurity expert conducting a penetration test review.
Evaluate this authentication implementation for:
1. Common attack vectors (OWASP Top 10)
2. Cryptographic weaknesses
3. Session management flaws
4. Rate limiting adequacy

Be specific about exploit scenarios, not just general advice.
```

## Advanced Techniques

### Tree of Thoughts (ToT)

Explore multiple reasoning paths and select the best one.

```
I need to design a database schema for a multi-tenant SaaS application.

Think about this from THREE different perspectives:
1. **Performance-first**: Optimize for read-heavy workloads
2. **Security-first**: Maximum tenant isolation
3. **Cost-first**: Minimize storage and compute costs

For each perspective, outline the schema design, then recommend a balanced approach that considers all three.
```

### ReAct (Reasoning + Acting)

Combine reasoning with tool use or external actions.

```
You have access to a code execution environment.

Task: Find the bug in this Python code.

Process:
Thought: I should first understand what the code does.
Action: Run the code with sample input.
Observation: [output]
Thought: The output reveals X issue. Let me check Y.
Action: [next action]
...
Final Answer: [explanation + fix]
```

### Constitutional AI / Self-Critique

Ask the model to review and improve its own output.

```
First, write a product description for a new AI-powered notebook.

Then, review your description and identify:
- Any exaggerated claims
- Missing key information a buyer would want
- Sentences that could be clearer

Finally, write an improved version addressing all issues.
```

### Meta-Prompting

Use the model to design better prompts for itself.

```
I want to get the best possible code review from an LLM. 
What prompt should I use? Consider:
- What context the model needs
- What output format is most useful
- How to prevent common LLM mistakes in code review

Design the optimal prompt and explain your reasoning for each design choice.
```

## Prompt Templates

### Code Generation Template

```markdown
# Role
You are an expert {language} developer specializing in {specialty}.

# Task
Create a {function/class/module} that {description}.

# Requirements
- {requirement_1}
- {requirement_2}
- {requirement_3}
- Include comprehensive error handling
- Add type hints and docstrings
- Write unit tests

# Constraints
- Do NOT use {forbidden_library}
- Must be compatible with {version}
- Performance target: {time_complexity}

# Output Format
1. Implementation code
2. Usage example
3. Time/space complexity analysis
4. Edge cases handled
```

### Analysis & Research Template

```markdown
# Context
Analyze the following {type}:

{content_or_topic}

# Task
{specific_analysis_request}

# Evaluation Criteria
- Accuracy and factual correctness
- Logical consistency
- Completeness of coverage
- Practical actionability

# Output Format
- **Executive Summary** (3-5 sentences)
- **Key Findings** (bullet points, prioritized)
- **Detailed Analysis** (organized by theme)
- **Recommendations** (numbered, with rationale)
- **Uncertainties** (what's unclear or needs more data)
```

### Data Extraction Template

```markdown
Extract the following information from the text below:

Fields to extract:
- Company name
- Product name  
- Key features (list)
- Pricing information
- Release date
- Target audience

Text:
{text}

Return the result as a JSON object. Use null for fields not found in the text.
```

## Controlling Output Behavior

### Temperature and Sampling

| Temperature | Behavior | Use Case |
|-------------|----------|----------|
| 0.0–0.2 | Deterministic, always picks most likely | Code generation, data extraction, factual Q&A |
| 0.3–0.5 | Focused with slight variation | Technical writing, documentation, analysis |
| 0.6–0.8 | Creative but grounded | Brainstorming, creative writing, ideation |
| 0.9–1.0 | Highly creative, unpredictable | Poetry, fiction, exploratory thinking |

### Additional Controls

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    temperature=0.3,           # Creativity level
    top_p=0.9,                 # Nucleus sampling
    max_tokens=1000,           # Output length limit
    frequency_penalty=0.0,     # Reduce repetition (-2.0 to 2.0)
    presence_penalty=0.0,      # Encourage new topics (-2.0 to 2.0)
    stop=["\n\n\n"],           # Custom stop sequences
    response_format={"type": "json_object"}  # Structured output
)
```

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Vague instructions | Unpredictable, generic outputs | Be specific about task, format, scope |
| Contradictory requirements | Model picks one or fails both | Prioritize requirements clearly |
| Assuming unstated knowledge | Model may not know your context | Provide necessary background info |
| No output format spec | Inconsistent structure | Define exact format expected |
| Overly long prompts | Key instructions get lost | Use structure, headings, delimiters |
| Ignoring model limitations | Hallucinations, wrong answers | Ask for confidence levels; verify facts |
| Single massive prompt | Quality degrades with complexity | Break into steps; use chaining |

## Testing & Iteration Framework

1. **Baseline**: Start with the simplest prompt that could work
2. **Add constraints**: Narrow scope, specify format, add examples
3. **Test edge cases**: Try inputs that might break the prompt
4. **Measure outputs**: Define success criteria (accuracy, format compliance, usefulness)
5. **A/B test**: Run two prompt variants on the same inputs
6. **Iterate**: Refine based on systematic observation, not gut feel

### Evaluation Checklist

- [ ] Does the output consistently match the requested format?
- [ ] Are factual claims accurate (spot-check with external sources)?
- [ ] Does the output handle edge cases gracefully?
- [ ] Is the output length appropriate for the use case?
- [ ] Would a human expert consider this output useful?

## Tools & Ecosystem

| Tool | Purpose | Link |
|------|---------|------|
| **Prompt Libraries** | Curated collections of tested prompts | OpenAI Cookbook, Anthropic Examples |
| **LMQL / Guidance** | Constrained generation and prompt programming | github.com/eth-sri/lmql |
| **LangChain Prompts** | Prompt templates + versioning | python.langchain.com |
| **Promptfoo** | Prompt evaluation and benchmarking | promptfoo.dev |
| **DSPy** | Programmatic prompt optimization | github.com/stanfordnlp/dspy |
| **LangSmith** | Prompt tracing and evaluation | smith.langchain.com |

## Related Documentation

- **[RAG Systems](/docs/rag-retrieval-augmented-generation)** — Ground prompts with retrieved context
- **[Function Calling](/docs/function-calling-tool-use)** — Let models call external APIs
- **[Structured Outputs](/docs/structured-output-json-schema)** — Enforce exact output schemas
- **[Evaluation Metrics](/docs/evaluation-metrics-benchmarks)** — Measure prompt effectiveness
