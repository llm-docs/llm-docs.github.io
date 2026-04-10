---
title: "Emergent Capabilities and Reasoning"
description: "Understanding how complex behaviors emerge at scale — chain of thought, planning, tool use, and the debate over whether LLMs truly reason"
date: "2026-04-10"
category: "Architecture & Training"
tags: ["emergence", "reasoning", "chain-of-thought", "planning", "capabilities", "cognition"]
author: "LLM Hub Team"
---

# Emergent Capabilities and Reasoning

One of the most remarkable aspects of LLMs is that certain capabilities appear only at specific scale thresholds — they cannot be predicted by extrapolating from smaller models. These "emergent abilities" include chain-of-thought reasoning, multi-step planning, and genuine tool use.

## What Are Emergent Capabilities?

Emergent capabilities are behaviors that:
1. Are essentially absent in smaller models (< 10B parameters)
2. Appear sharply as model scale increases
3. Were not explicitly trained for

```
Capability Accuracy ▲
    │
100%│                              ┌────── Emergent (step function)
    │                            ┌─┘
 80%│                          ┌─┘
    │                        ┌─┘
 60%│                      ┌─┘
    │                    ┌─┘
 40%│  ────────────────┌─┘         ──── Smooth scaling (predictable)
    │
 20%│
    │
  0%└────┬─────┬─────┬─────┬─────┬─────► Model Size
       1B    10B   100B  1T    10T
              ↑
         Emergence threshold
```

**Important debate**: Some researchers argue emergence is an illusion caused by measuring accuracy instead of loss. When measured by loss, capabilities may scale smoothly but appear sudden on accuracy metrics.

## Key Emergent Capabilities

### 1. Chain-of-Thought Reasoning

```
Question: "Roger has 5 tennis balls. He buys 2 more cans of tennis balls. 
           Each can has 3 tennis balls. How many does he have now?"

Small model: "5 + 2 = 7" (wrong — doesn't account for 3 balls per can)

Large model with CoT: 
  "Roger starts with 5 balls.
   He buys 2 cans, each with 3 balls.
   2 × 3 = 6 new balls.
   5 + 6 = 11.
   Answer: 11"
```

**Trigger phrase**: "Let's think step by step" increases accuracy on math word problems by 10-40% for models > 60B parameters but has negligible effect on smaller models.

### 2. Multi-Hop Reasoning

```
Question: "Who was the president of the country that hosted the 2008 Olympics?"

Requires:
1. Identify country: China hosted 2008 Olympics
2. Identify president: Who leads China? → President Xi Jinping
3. Combine: Answer is Xi Jinping

Small model: Answers with "Beijing" (misses the question)
Large model: Correctly chains the reasoning
```

### 3. Code Understanding and Generation

```python
# Small model: generates syntactically incorrect or non-functional code
# Large model: generates working code with proper error handling

# User: "Write a function to find the longest common subsequence"

# Large model output (working):
def longest_common_subsequence(s1: str, s2: str) -> int:
    """Find length of LCS using dynamic programming."""
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    
    return dp[m][n]
```

### 4. Theory of Mind

```
Question: "Sally puts a marble in a basket and leaves. 
           Anne moves the marble to a box. 
           When Sally returns, where will she look for the marble?"

Small model: "In the box" (knows where the marble actually is)
Large model: "In the basket (Sally doesn't know Anne moved it)" (understands false belief)
```

### 5. In-Context Learning

```
# Without explicit training on the task format
Input: "glorft → glorfts, wug → wugs, blick → ?"
Output: "blicks" (correctly infers pluralization rule from 2 examples)
```

This capability — learning a new task from a few examples in the prompt — emerges around 10-30B parameters.

## Enhancing Reasoning at Inference Time

### Best-of-N Sampling

Generate N responses, select the best using a verifier:

```python
def best_of_n(model, prompt, n=10, verifier=None):
    """Generate N responses, pick the best."""
    candidates = []
    for _ in range(n):
        response = model.generate(prompt, temperature=0.7)
        score = verifier(response) if verifier else model.self_score(response)
        candidates.append((score, response))
    
    return max(candidates, key=lambda x: x[0])[1]
```

**Trade-off**: N× compute cost for ~5-15% accuracy gain on reasoning tasks.

### Self-Consistency

Generate multiple reasoning chains, take majority vote:

```python
def self_consistency(model, prompt, n=40):
    """Multiple CoT chains, majority vote on final answer."""
    answers = []
    for _ in range(n):
        response = model.generate(prompt + "\nLet's think step by step.")
        answer = extract_final_answer(response)
        answers.append(answer)
    
    # Majority vote
    return Counter(answers).most_common(1)[0][0]
```

On GSM8K (math benchmark), self-consistency with 40 samples improves GPT-4 accuracy by ~8%.

### Tree of Thoughts

Explore a tree of reasoning paths, backing up from dead ends:

```python
def tree_of_thoughts(model, prompt, max_depth=5, beam_width=3):
    """Systematically explore multiple reasoning paths."""
    # Level 0: generate initial thoughts
    thoughts = model.generate_thoughts(prompt, k=beam_width)
    
    for depth in range(max_depth):
        new_thoughts = []
        for thought in thoughts:
            # Evaluate current path
            score = model.evaluate_state(thought)
            if is_solution(thought):
                return thought
            
            # Expand promising states
            if score > threshold:
                new_thoughts.extend(
                    model.generate_thoughts(thought, k=beam_width)
                )
        
        # Keep top beam_width states
        thoughts = sorted(new_thoughts, key=score, reverse=True)[:beam_width]
    
    return thoughts[0]  # Return best found
```

## Reasoning Models

OpenAI's **o1/o3** and DeepSeek's **R1** represent a new paradigm: models specifically optimized for reasoning through:

1. **Process supervision**: Reward correct reasoning steps, not just correct answers
2. **Extended generation**: Models "think" for longer before answering
3. **Self-reflection**: Models check and revise their own reasoning

```
User: "Prove that √2 is irrational."

o1/R1-style model:
[Thinking for 30 seconds / generating 2000+ tokens of reasoning]
"Proof by contradiction:
Assume √2 is rational. Then √2 = a/b where a,b are coprime integers.
Squaring: 2 = a²/b², so 2b² = a².
This means a² is even, so a is even. Let a = 2k.
Then 2b² = 4k², so b² = 2k², meaning b² is even, so b is even.
But if both a and b are even, they share a factor of 2, contradicting coprime.
Therefore √2 must be irrational. □"
```

## The Reasoning Debate

**Do LLMs truly reason, or just pattern-match?**

| Position | Argument | Evidence |
|----------|----------|----------|
| **They reason** | Solve novel problems, chain logic, generalize | Performance on unseen math proofs |
| **They pattern-match** | All outputs are interpolation of training data | Fail on simple out-of-distribution tasks |
| **Pragmatic view** | The distinction may not matter for applications | Results are what matter |

## Key Takeaways

- Emergent capabilities appear suddenly at scale, particularly reasoning and code generation
- Chain-of-thought prompting is the simplest way to enhance reasoning
- Best-of-N and self-consistency trade compute for accuracy
- Reasoning models (o1, R1) optimize for deep thinking rather than fast responses
- Whether LLMs "truly reason" is philosophically interesting but practically secondary to their demonstrated capabilities

## Related Documentation

- **[Prompt Engineering](/docs/prompt-engineering)** — CoT and advanced reasoning prompts
- **[Scaling Laws](/docs/model-scaling-laws)** — How capabilities scale with model size
- **[Evaluation Metrics](/docs/evaluation-metrics-benchmarks)** — Measuring reasoning ability
