---
title: "Supervised Fine-tuning and Alignment"
description: "Transforming pre-trained models into helpful assistants — SFT, RLHF, DPO, and constitutional AI techniques"
date: "2026-04-09"
category: "Architecture & Training"
tags: ["alignment", "rlhf", "dpo", "sft", "preference-learning", "safety"]
author: "IntuiVortex Team"
---

# Supervised Fine-tuning and Alignment

A pre-trained LLM can generate fluent text but doesn't know how to follow instructions, be helpful, or avoid harmful outputs. The alignment pipeline transforms a raw pre-trained model into a useful, safe assistant.

## The Alignment Pipeline

```
Pre-trained Model (base LM)
    │
    ▼
Supervised Fine-Tuning (SFT)
    │  Trained on instruction-response pairs
    ▼
Instruction-Following Model
    │
    ▼
Preference Alignment (RLHF / DPO)
    │  Trained on human/AI preference data
    ▼
Aligned Assistant
    │
    ▼
Safety Filters (optional additional layer)
```

## Step 1: Supervised Fine-Tuning (SFT)

SFT teaches the model to follow instructions by training on high-quality examples:

```python
# SFT training data format
sft_examples = [
    {
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Explain photosynthesis in simple terms."},
            {"role": "assistant", "content": "Photosynthesis is the process where plants..."}
        ]
    },
    # ... thousands more examples
]
```

**Data sources**:
| Source | Quality | Scale | Cost |
|--------|---------|-------|------|
| Human-written instructions | Highest | 1K-10K | Very high |
| AI-generated + human-reviewed | High | 10K-100K | High |
| AI-generated + AI-filtered | Good | 100K-1M+ | Moderate |
| Distilled from frontier models | Variable | 100K-1M | API costs |

**SFT training**:

```python
from transformers import SFTTrainer, TrainingArguments

training_args = TrainingArguments(
    output_dir="./sft-output",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    learning_rate=2e-5,       # Much lower than pre-training
    lr_scheduler_type="cosine",
    warmup_ratio=0.05,
    fp16=True,
)

trainer = SFTTrainer(
    model=model,
    train_dataset=sft_dataset,
    args=training_args,
)
trainer.train()
```

## Step 2: Preference Alignment

After SFT, the model follows instructions but may not align with human preferences. This step teaches the model what humans consider "better" responses.

### Reward Model Training

Train a separate model to score response quality:

```python
# Preference data format
preference_pairs = [
    {
        "prompt": "How do I make pasta?",
        "chosen": "Here's a step-by-step guide:\n1. Boil water...",     # Preferred
        "rejected": "Pasta is Italian. Italy is in Europe.",              # Not preferred
    }
]

# Reward model training
from transformers import AutoModelForSequenceClassification

reward_model = AutoModelForSequenceClassification.from_pretrained(
    model_name, num_labels=1  # Single score output
)

# Train to predict human preferences
for pair in preference_pairs:
    chosen_score = reward_model(pair["prompt"], pair["chosen"])
    rejected_score = reward_model(pair["prompt"], pair["rejected"])
    
    # Loss: chosen should score higher
    loss = -torch.log(torch.sigmoid(chosen_score - rejected_score))
    loss.backward()
```

### RLHF (Reinforcement Learning from Human Feedback)

```
Policy Model (SFT) → generates response → Reward Model → score
                                                    ↓
                    PPO optimization ← advantage ← value function
```

```python
# Conceptual RLHF with PPO
from trl import PPOTrainer, PPOConfig

config = PPOConfig(
    model_name="llama-3-8b-sft",
    learning_rate=1e-6,        # Very small LR
    ppo_epochs=4,
)

ppo_trainer = PPOTrainer(
    config=config,
    model=policy_model,
    ref_model=sft_model,      # Reference model (frozen SFT)
    reward_model=reward_model,
)

for batch in preference_data:
    # Generate responses
    responses = ppo_trainer.generate(batch["prompt"])
    
    # Score with reward model
    rewards = reward_model(batch["prompt"], responses)
    
    # PPO update: maximize reward while staying close to reference
    ppo_trainer.step(batch["prompt"], responses, rewards)
```

**Challenges with RLHF**:
- Computationally expensive (needs 4 model copies: policy, reference, reward, value)
- Unstable training dynamics
- Reward hacking (model learns to game the reward model)
- Requires careful hyperparameter tuning

## DPO: Direct Preference Optimization

DPO simplifies preference alignment by eliminating the separate reward model and RL loop:

```python
# DPO directly optimizes the policy model on preference pairs
from trl import DPOTrainer

dpo_config = {
    "beta": 0.1,              # Temperature for preference distribution
    "learning_rate": 5e-7,
}

dpo_trainer = DPOTrainer(
    model=model,
    ref_model=sft_model,
    args=dpo_config,
    train_dataset=preference_pairs,
)
dpo_trainer.train()
```

**DPO loss function**:

```python
def dpo_loss(chosen_log_probs, rejected_log_probs, beta=0.1):
    """
    Direct Preference Optimization loss.
    Intuitively: increase probability of chosen, decrease probability of rejected.
    """
    log_ratio = chosen_log_probs - rejected_log_probs
    loss = -torch.log(torch.sigmoid(beta * log_ratio))
    return loss.mean()
```

| Method | Components | Stability | Quality | Cost |
|--------|-----------|-----------|---------|------|
| **RLHF** | Policy + Ref + Reward + Value | Unstable | Best | Very high |
| **DPO** | Policy + Ref | Stable | Near-RLHF | Moderate |
| **ORPO** | Policy only | Most stable | Good | Low |
| **KTO** | Policy + preference labels | Stable | Good | Low |

## Constitutional AI (Claude's Approach)

Instead of human feedback, Constitutional AI uses a set of principles ("constitution") to guide alignment:

```python
# Phase 1: Self-critique
constitution = [
    "Choose the response that is most helpful and honest.",
    "Choose the response that avoids harmful or misleading content.",
    "Choose the response that best respects the user's autonomy.",
]

# Generate critiques using the model itself
critique_prompt = """
Given the following response, identify any issues based on the principle:
"{principle}"

Response: {response}

What should be improved?
"""

# Phase 2: Revise based on critiques
revised_response = model.generate(
    f"Original: {response}\nCritique: {critique}\nRevised:"
)

# Phase 3: Train on revised data (same as SFT)
```

## The "Alignment Tax"

Alignment can reduce raw model capability:

| Metric | Base Model | After SFT | After RLHF/DPO |
|--------|-----------|-----------|---------------|
| MMLU (knowledge) | 75% | 73% | 70% |
| Human preference | 40% | 70% | 85% |
| Code generation | 65% | 68% | 63% |
| Safety compliance | 30% | 60% | 90% |

The "tax" occurs because alignment restricts the model's output distribution. Research into **alignment without capability loss** is ongoing.

## Best Practices

1. **High-quality SFT data**: 10K carefully curated examples often beat 1M noisy ones
2. **Diverse prompts**: Cover many topics, styles, and difficulty levels
3. **Preference data quality**: Annotator agreement should be >70%
4. **DPO over RLHF**: For most teams, DPO gives 90% of RLHF quality at 30% of the cost
5. **Evaluate alignment separately**: Measure both capability AND safety metrics

## Key Takeaways

- SFT teaches instruction-following; preference alignment teaches human values
- RLHF is powerful but complex; DPO is the pragmatic alternative for most teams
- Constitutional AI reduces reliance on human annotation
- Alignment inevitably trades off some raw capability for safety and helpfulness
- Data quality is the dominant factor at every alignment stage

## Related Documentation

- **[Fine-tuning](/docs/fine-tuning-lora)** — Parameter-efficient adaptation methods
- **[Safety and Red-teaming](/docs/ai-safety-red-teaming)** — Testing aligned models
- **[Evaluation Metrics](/docs/evaluation-metrics-benchmarks)** — Measuring alignment quality
