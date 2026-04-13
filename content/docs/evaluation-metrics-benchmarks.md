---
title: "Evaluation Metrics and Benchmarks"
description: "How to measure LLM capability — from academic benchmarks (MMLU, GSM8K, HumanEval) to practical evaluation pipelines for production systems"
date: "2026-04-13"
category: "Evaluation & Safety"
tags: ["evaluation", "benchmarks", "metrics", "testing", "quality", "comparison"]
author: "LLM Hub Team"
---

# Evaluation Metrics and Benchmarks

Evaluating LLMs is fundamentally different from evaluating traditional software. Outputs are open-ended, correctness is often subjective, and capabilities span dozens of domains. This guide covers both academic benchmarks and practical evaluation strategies.

## Academic Benchmarks

### Knowledge and Understanding

| Benchmark | Task | Format | What It Measures |
|-----------|------|--------|-----------------|
| **MMLU** | 57 subjects (STEM, humanities, etc.) | Multiple choice | Broad knowledge |
| **MMLU-Pro** | Harder MMLU with reasoning | Multiple choice + reasoning | Deep understanding |
| **HellaSwag** | Sentence completion | Multiple choice | Commonsense reasoning |
| **ARC** | Science questions | Multiple choice | Scientific reasoning |
| **TruthfulQA** | Factual accuracy | Multiple choice + generation | Resistance to misconceptions |

### Reasoning and Math

| Benchmark | Task | What It Measures |
|-----------|------|-----------------|
| **GSM8K** | Grade school math word problems | Multi-step arithmetic |
| **MATH** | Competition-level math | Advanced mathematical reasoning |
| **AIME** | American Invitational Math Exam | Olympiad-level problem solving |
| **GPQA** | Graduate-level science questions | Expert-level reasoning |

### Code Generation

| Benchmark | Task | Metric |
|-----------|------|--------|
| **HumanEval** | 164 Python functions | Pass@1 (does the code pass tests?) |
| **MBPP** | 974 Python tasks | Pass@1 |
| **HumanEval+** | Extended HumanEval | Pass@1, Pass@10 |
| **LiveCodeBench** | Recent competition problems | Pass@1 on unseen problems |
| **SWE-bench** | Real GitHub issues | % resolved autonomously |

### Instruction Following

| Benchmark | Task | What It Measures |
|-----------|------|-----------------|
| **IFEval** | Followable instructions | Instruction-following accuracy |
| **AlpacaEval** | Pairwise comparison | Overall helpfulness |
| **Arena Hard** | Challenging prompts | Capability on hard tasks |

## Typical Model Scores

Approximate scores for reference:

| Model | MMLU | GSM8K | HumanEval | TruthfulQA |
|-------|------|-------|-----------|------------|
| **GPT-4o** | 88% | 95% | 90% | 75% |
| **Claude Sonnet 4** | 90% | 96% | 92% | 80% |
| **Llama 3.1 405B** | 85% | 90% | 85% | 70% |
| **Llama 3.1 70B** | 79% | 83% | 75% | 65% |
| **Llama 3.2 3B** | 62% | 55% | 45% | 50% |
| **Mistral Large** | 80% | 80% | 72% | 63% |
| **DeepSeek V3** | 85% | 92% | 86% | 72% |

**Note**: Scores change frequently with new model releases. Always check official benchmark reports.

## Running Benchmarks Yourself

### Using lm-evaluation-harness

```bash
# Install
pip install lm-eval

# Evaluate a Hugging Face model
lm_eval --model hf \
    --model_args pretrained=meta-llama/Llama-3.2-3B \
    --tasks mmlu,gsm8k,hellaswag \
    --device cuda:0 \
    --batch_size 8 \
    --output_results

# Evaluate via OpenAI-compatible API
lm_eval --model openai \
    --model_args model=meta-llama/Llama-3.2-3B,base_url=http://localhost:8000/v1 \
    --tasks mmlu \
    --num_fewshot 5
```

### Custom Evaluation Pipeline

```python
import json
from openai import OpenAI

client = OpenAI()

def evaluate_model(model_name: str, benchmark_data: list[dict]) -> dict:
    """Run a custom benchmark on a model."""
    results = []
    
    for item in benchmark_data:
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": item["prompt"]}],
            temperature=0,  # Deterministic for evaluation
        )
        
        answer = response.choices[0].message.content.strip()
        is_correct = check_answer(answer, item["expected"])
        
        results.append({
            "prompt": item["prompt"],
            "expected": item["expected"],
            "actual": answer,
            "correct": is_correct,
        })
    
    accuracy = sum(1 for r in results if r["correct"]) / len(results)
    return {
        "model": model_name,
        "accuracy": accuracy,
        "total": len(results),
        "correct": sum(1 for r in results if r["correct"]),
        "details": results,
    }
```

## Production Evaluation

Academic benchmarks measure general capability, but production systems need task-specific evaluation.

### Task-Specific Evaluation

```python
# Define YOUR evaluation criteria
def evaluate_customer_support(model_name: str) -> dict:
    """Evaluate on your actual support tickets."""
    tickets = load_support_tickets()
    
    metrics = {
        "accuracy": [],      # Does it give the right answer?
        "tone": [],           # Is it appropriately professional?
        "completeness": [],   # Does it address all issues raised?
        "safety": [],         # Does it avoid harmful commitments?
    }
    
    for ticket in tickets:
        response = generate_response(model_name, ticket)
        
        # Human or LLM-as-judge scoring
        scores = score_response(response, ticket["rubric"])
        metrics["accuracy"].append(scores["accuracy"])
        metrics["tone"].append(scores["tone"])
        metrics["completeness"].append(scores["completeness"])
        metrics["safety"].append(scores["safety"])
    
    return {metric: sum(scores)/len(scores) for metric, scores in metrics.items()}
```

### LLM-as-a-Judge

```python
def llm_judge(prompt: str, response: str, rubric: str) -> dict:
    """Use GPT-4o as an evaluator."""
    judgment = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "system",
            "content": f"""You are an expert evaluator. Score the response based on this rubric:
{rubric}

Return ONLY a JSON: {{"score": 1-5, "reasoning": "brief explanation"}}"""
        }, {
            "role": "user",
            "content": f"Prompt: {prompt}\nResponse: {response}"
        }],
        response_format={"type": "json_object"},
    )
    
    return json.loads(judgment.choices[0].message.content)
```

### A/B Testing Models

```python
def ab_test_model_comparison(
    model_a: str,
    model_b: str,
    test_prompts: list[str],
    judge_model: str = "gpt-4o",
) -> dict:
    """Compare two models on a test set."""
    wins_a, wins_b, ties = 0, 0, 0
    
    for prompt in test_prompts:
        response_a = call_model(model_a, prompt)
        response_b = call_model(model_b, prompt)
        
        judgment = llm_judge_compare(prompt, response_a, response_b, judge_model)
        
        if judgment == "A":
            wins_a += 1
        elif judgment == "B":
            wins_b += 1
        else:
            ties += 1
    
    total = len(test_prompts)
    return {
        "model_a": model_a,
        "model_b": model_b,
        "a_win_rate": f"{wins_a/total:.1%}",
        "b_win_rate": f"{wins_b/total:.1%}",
        "tie_rate": f"{ties/total:.1%}",
    }
```

## Evaluation Best Practices

1. **Test on YOUR data**: Academic benchmarks are gameable; use your own evaluation set
2. **Use chain-of-thought**: Some models need CoT prompting to show their true capability
3. **Temperature matters**: Use temperature=0 for evaluation consistency
4. **Multiple runs**: Average over 3-5 runs to reduce variance
5. **Human spot-checks**: Automated metrics miss nuance; always have humans review samples
6. **Monitor degradation**: Re-run evaluation when models are updated

## Key Takeaways

- MMLU measures knowledge, GSM8K measures reasoning, HumanEval measures coding
- Academic benchmarks don't always correlate with production performance
- Build your own evaluation set from real user queries
- LLM-as-a-judge is convenient but has its own biases
- Always evaluate at temperature=0 for consistency
- A/B test models on your actual workload before committing

## Related Documentation

- **[Prompt Engineering](/docs/prompt-engineering)** — Optimizing prompts before evaluation
- **[Observability](/docs/llm-observability-monitoring)** — Continuous evaluation in production
- **[Safety and Red-teaming](/docs/ai-safety-red-teaming)** — Evaluating safety properties
