---
title: "Hallucination Detection and Mitigation"
description: "Understanding why LLMs hallucinate, how to detect fabricated information, and techniques to reduce hallucination rates in production systems"
date: "2026-04-14"
category: "Evaluation & Safety"
tags: ["hallucination", "factuality", "detection", "mitigation", "grounding", "reliability"]
author: "LLM Hub Team"
---

# Hallucination Detection and Mitigation

Hallucination is when an LLM confidently produces information that is incorrect, fabricated, or unsupported by evidence. It's the most significant barrier to using LLMs in high-stakes applications.

## Types of Hallucination

| Type | Description | Example |
|------|------------|---------|
| **Intrinsic** | Contradicts the provided context | Context says "CEO: Jane", model says "CEO: John" |
| **Extrinsic** | Adds information not in context | Context doesn't mention revenue, model invents "$5B revenue" |
| **Factual** | Contradicts real-world facts | "The Eiffel Tower is in London" |
| **Faithfulness** | Contradicts itself | "Founded in 2010... established 15 years ago" (in 2026) |

## Why LLMs Hallucinate

1. **Training objective**: Models are trained to predict plausible text, not true text
2. **No ground truth access**: Models don't "know" facts — they predict likely token sequences
3. **Pressure to respond**: Models are trained to always produce an answer, even when uncertain
4. **Amplification by temperature**: Higher temperature increases creativity but also fabrication
5. **Prompt-induced**: Leading prompts can cause the model to "play along" with false premises

```python
# Prompt-induced hallucination
prompt = "Tell me about Apple's revolutionary iPhone 17, released in 2024."
# The iPhone 17 hasn't been released. The model may still generate plausible-sounding
# details about a non-existent product because the prompt implies it exists.
```

## Detection Techniques

### 1. Self-Consistency Check

Generate multiple responses and check for contradictions:

```python
def detect_hallucination_by_consistency(model, prompt, n=5) -> dict:
    """If the model gives different answers, flag as uncertain."""
    responses = [model.generate(prompt, temperature=0.7) for _ in range(n)]
    
    # Extract key claims from each response
    claims_per_response = [extract_claims(r) for r in responses]
    
    # Check for contradictions
    contradictions = find_contradictions(claims_per_response)
    
    return {
        "hallucination_risk": "high" if contradictions else "low",
        "consistency_score": 1 - (contradictions / max_possible_contradictions),
        "contradictions": contradictions,
    }
```

### 2. NLI-Based Detection

Use Natural Language Inference to check if claims are supported by context:

```python
from transformers import pipeline

nli_model = pipeline("text-classification", model="roberta-large-mnli")

def check_claim_against_context(claim: str, context: str) -> dict:
    """Check if a claim is entailed by, neutral to, or contradicts the context."""
    result = nli_model({"text": context, "text_pair": claim})
    
    return {
        "claim": claim,
        "label": result["label"],  # ENTAILMENT, NEUTRAL, CONTRADICTION
        "confidence": result["score"],
        "supported": result["label"] == "ENTAILMENT" and result["score"] > 0.7,
        "contradicted": result["label"] == "CONTRADICTION",
    }
```

### 3. Fact-Checking Against Knowledge Base

```python
def fact_check_claims(response: str, knowledge_base: dict) -> list[dict]:
    """Check extracted claims against a knowledge base."""
    claims = extract_claims(response)
    results = []
    
    for claim in claims:
        if claim["entity"] in knowledge_base:
            kb_fact = knowledge_base[claim["entity"]]
            if kb_fact != claim["value"]:
                results.append({
                    "claim": claim,
                    "kb_fact": kb_fact,
                    "status": "contradiction",
                })
            else:
                results.append({
                    "claim": claim,
                    "status": "verified",
                })
        else:
            results.append({
                "claim": claim,
                "status": "unknown",
            })
    
    return results
```

### 4. Confidence-Based Detection

```python
def get_model_confidence(model, prompt: str) -> float:
    """Estimate model confidence from output probabilities."""
    outputs = model.generate(prompt, output_scores=True, return_dict_in_generate=True)
    scores = outputs.scores
    
    # Average the top token probability across all generated tokens
    confidences = [torch.softmax(s, dim=-1).max(dim=-1).values for s in scores]
    avg_confidence = torch.stack(confidences).mean().item()
    
    return avg_confidence

# Low confidence often correlates with hallucination risk
if get_model_confidence(model, prompt) < 0.6:
    response += "\n\n⚠️ I'm not entirely confident in this answer. Please verify."
```

## Mitigation Strategies

### 1. Retrieval-Augmented Generation (RAG)

The single most effective mitigation strategy:

```python
def grounded_response(query: str, knowledge_base) -> str:
    """Ground response in retrieved evidence."""
    context = retrieve_relevant(query, knowledge_base, k=5)
    
    prompt = f"""Based ONLY on the following context, answer the question.
If the context doesn't contain enough information, say so clearly.

Context:
{context}

Question: {query}"""
    
    return model.generate(prompt, temperature=0.1)
```

### 2. Constrained Generation

Force the model to only use provided information:

```python
prompt = """Answer based on the context provided. Use ONLY information from the context.
If you cannot answer from context alone, say "I cannot answer this from the provided information."

Context: {context}
Question: {query}
Answer:"""
```

### 3. Temperature Reduction

```python
# For factual queries, use low temperature
factual_response = model.generate(prompt, temperature=0.1, top_p=0.9)

# Reserve higher temperature for creative tasks
creative_response = model.generate(prompt, temperature=0.7, top_p=0.95)
```

### 4. Citation Requirements

```python
prompt = f"""Answer the question and cite which part of the context supports each claim.
Format: [Claim] (Source: relevant context excerpt)

Context: {context}
Question: {query}"""
```

### 5. Self-Verification

```python
def self_verify(model, prompt: str, initial_response: str) -> str:
    """Ask the model to verify its own answer."""
    verification_prompt = f"""
I previously answered: "{initial_response}"

Now, critically review this answer:
1. Are all claims supported?
2. Is anything potentially fabricated?
3. What's your confidence level?

If issues are found, provide a corrected version.
"""
    verification = model.generate(verification_prompt, temperature=0.1)
    return verification
```

## Production Hallucination Tracking

```python
class HallucinationTracker:
    def __init__(self):
        self.total_responses = 0
        self.flagged_responses = 0
        self.confirmed_hallucinations = 0
    
    def track(self, response: str, context: str, user_feedback: str = None):
        self.total_responses += 1
        
        # Automated check
        nli_result = check_claim_against_context(response, context)
        if nli_result["contradicted"]:
            self.flagged_responses += 1
        
        # User feedback
        if user_feedback == "incorrect":
            self.confirmed_hallucinations += 1
    
    @property
    def hallucination_rate(self) -> float:
        return self.confirmed_hallucinations / max(self.total_responses, 1)
```

## Key Takeaways

- Hallucination is a fundamental LLM limitation, not a bug
- RAG is the most effective mitigation strategy — ground responses in evidence
- Self-consistency and NLI-based detection catch most hallucinations
- Low temperature + constrained prompts reduce but don't eliminate fabrication
- Track hallucination rate as a key production metric
- Always flag uncertain responses to users

## Related Documentation

- **[RAG Systems](/docs/rag-retrieval-augmented-generation)** — Grounding responses in evidence
- **[Safety and Red-teaming](/docs/ai-safety-red-teaming)** — Testing for hallucination vulnerabilities
- **[Evaluation Metrics](/docs/evaluation-metrics-benchmarks)** — Measuring factuality
