---
title: "Prompt Engineering Guide"
description: "Master the art and science of crafting effective prompts for LLMs"
date: "2026-04-05"
category: "Best Practices"
tags: ["prompting", "engineering", "techniques", "best-practices"]
author: "LLM Hub Team"
---

# Prompt Engineering Guide

Prompt engineering is the practice of designing and optimizing input prompts to get the best results from Large Language Models.

## Core Principles

### 1. Be Clear and Specific

❌ Bad: `Tell me about AI`
✅ Good: `Explain the differences between narrow AI and general AI in 3 bullet points`

### 2. Provide Context

```markdown
You are an expert Python developer. Write a function that:
- Takes a list of dictionaries as input
- Filters based on a key-value pair
- Returns sorted results
Include type hints and docstrings.
```

### 3. Use System Prompts

Set the behavior and role of the AI:

```
You are a helpful coding assistant with expertise in web development.
Always provide explanations alongside your code.
Format code blocks with language identifiers.
```

## Advanced Techniques

### Few-Shot Prompting

Provide examples to guide the model:

```
Convert these titles to proper case:

Input: "the great gatsby"
Output: "The Great Gatsby"

Input: "war and peace"
Output: "War and Peace"

Input: "to kill a mockingbird"
Output:
```

### Chain of Thought

Encourage step-by-step reasoning:

```
A store has 120 apples. They sell 40% in the morning, 
then 25% of the remaining in the afternoon. 
How many apples are left?

Let's solve this step by step:
```

### Role Prompting

Assign specific roles for better results:

```
You are a senior code reviewer with 20 years of experience.
Review this code for:
1. Security vulnerabilities
2. Performance issues
3. Best practices
4. Readability

Provide specific, actionable feedback.
```

## Prompt Templates

### Code Generation

```markdown
# Role
You are an expert {language} developer

# Task
Create a {function/class/script} that {description}

# Requirements
- {requirement_1}
- {requirement_2}
- Include error handling
- Add comments explaining complex logic

# Output Format
Provide the code with brief explanation
```

### Analysis

```markdown
# Context
Analyze the following {type}:

{content}

# Task
{specific_analysis_request}

# Format
- Key findings (bullet points)
- Recommendations (prioritized)
- Supporting evidence
```

## Common Patterns

| Pattern | Use Case | Example |
|---------|----------|---------|
| Zero-shot | Simple tasks | "Translate to French: Hello" |
| Few-shot | Format control | Examples + query |
| Chain of Thought | Reasoning | "Think step by step" |
| ReAct | Agents | Think → Act → Observe |

## Testing & Iteration

1. **Start simple** - Begin with basic prompt
2. **Add constraints** - Refine with specifics
3. **Test variations** - Try different formulations
4. **Evaluate outputs** - Compare results
5. **Iterate** - Continuously improve

## Anti-Patterns to Avoid

❌ Vague instructions
❌ Overly complex prompts
❌ Contradictory requirements
❌ Assuming model capabilities
❌ No output format specification

## Tools & Resources

- **Prompt Libraries**: Collections of tested prompts
- **Prompt Validators**: Check prompt structure
- **A/B Testing**: Compare prompt variations
- **Monitoring**: Track prompt performance
