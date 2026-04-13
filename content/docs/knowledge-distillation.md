---
title: "Knowledge Distillation for LLMs"
description: "Compressing large models into smaller ones — teacher-student training, logit matching, and practical distillation recipes"
date: "2026-04-09"
category: "Architecture & Training"
tags: ["distillation", "compression", "teacher-student", "model-size", "efficiency", "knowledge-transfer"]
author: "IntuiVortex Team"
---

# Knowledge Distillation for LLMs

Knowledge distillation transfers the capabilities of a large "teacher" model into a smaller "student" model. The student learns not just from correct answers, but from the teacher's full probability distribution over possible answers — capturing nuanced knowledge about what the teacher considers plausible.

## Why Distill?

| Scenario | Teacher | Student | Benefit |
|----------|---------|---------|---------|
| Cost reduction | GPT-4o (expensive) | Llama 3 8B (cheap) | 10-50× cheaper inference |
| Latency reduction | Cloud API (200ms+) | On-device model (20ms) | 10× faster |
| Privacy | API sends data out | Local model, data stays private | Full data control |
| Offline use | Requires internet | Runs on edge device | No connectivity needed |

## Distillation Methods

### 1. Output Logit Distillation

The student learns to match the teacher's output probability distribution:

```python
import torch
import torch.nn.functional as F

def distillation_loss(student_logits, teacher_logits, temperature=2.0, alpha=0.5):
    """
    Combined loss: hard labels + soft teacher distribution
    """
    # Soft loss: KL divergence between student and teacher distributions
    teacher_probs = F.softmax(teacher_logits / temperature, dim=-1)
    student_log_probs = F.log_softmax(student_logits / temperature, dim=-1)
    
    soft_loss = F.kl_div(student_log_probs, teacher_probs, reduction='batchmean') * (temperature ** 2)
    
    # Hard loss: cross-entropy with true labels
    hard_loss = F.cross_entropy(student_logits, true_labels)
    
    return alpha * soft_loss + (1 - alpha) * hard_loss
```

**Temperature** controls how "soft" the teacher's distribution is:
- T=1: True probability distribution
- T>1: Softer distribution, more information about relative rankings
- T→∞: Uniform distribution (no information)

### 2. Response Distillation (Text-Level)

The teacher generates responses, and the student is trained to reproduce them:

```python
# Step 1: Teacher generates responses
teacher_responses = []
for prompt in prompts:
    response = teacher_model.generate(prompt, max_tokens=200)
    teacher_responses.append(response)

# Step 2: Student is fine-tuned on (prompt, teacher_response) pairs
for prompt, response in zip(prompts, teacher_responses):
    student_loss = student_model(prompt, labels=response)
    student_loss.backward()
```

This is essentially SFT where the "gold" answers come from the teacher model instead of humans.

### 3. Layer-wise Distillation

Match intermediate hidden states, not just outputs:

```python
def intermediate_distillation(student_hidden, teacher_hidden):
    """Match hidden representations at each layer."""
    # Project student hidden to teacher dimension if different
    projected = student_projection(student_hidden)
    
    # MSE loss between hidden states
    return F.mse_loss(projected, teacher_hidden.detach())
```

## Practical Distillation Recipe

### Distilling GPT-4 → Small Open Model

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer
from openai import OpenAI
import json

# Step 1: Generate teacher responses
client = OpenAI()
dataset = load_prompts("instruction_dataset.jsonl")

teacher_outputs = []
for item in dataset:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": item["prompt"]}],
        temperature=0.7,
        max_tokens=500,
    )
    teacher_outputs.append({
        "prompt": item["prompt"],
        "response": response.choices[0].message.content,
    })

# Save for training
with open("teacher_outputs.jsonl", "w") as f:
    for item in teacher_outputs:
        f.write(json.dumps(item) + "\n")

# Step 2: Fine-tune student on teacher outputs
student_model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.2-3B")
student_tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.2-3B")

# Train student to mimic teacher (standard SFT on teacher outputs)
training_args = TrainingArguments(
    output_dir="./distilled-model",
    num_train_epochs=3,
    learning_rate=2e-5,
    per_device_train_batch_size=8,
)

trainer = Trainer(
    model=student_model,
    train_dataset=create_sft_dataset(teacher_outputs),
    args=training_args,
)
trainer.train()
```

## Self-Distillation

A model can improve itself through iterative self-distillation:

```python
# Iterative self-improvement loop
model = load_base_model()

for iteration in range(3):
    # Generate responses on training prompts
    outputs = model.generate(training_prompts, temperature=0.7, n=4)
    
    # Select best outputs (using a scoring model or heuristic)
    best_outputs = select_best(outputs)
    
    # Fine-tune on best outputs
    model = fine_tune(model, training_prompts, best_outputs)
```

## Distillation for Specific Skills

### Reasoning Distillation

Train the student on the teacher's chain-of-thought reasoning:

```
Prompt: "A store has 120 apples..."

Teacher output:
"Let me solve this step by step:
Step 1: Calculate morning sales: 120 × 0.40 = 48 apples sold
Step 2: Remaining after morning: 120 - 48 = 72 apples
Step 3: Afternoon sales: 72 × 0.25 = 18 apples sold
Step 4: Final count: 72 - 18 = 54 apples
Answer: 54 apples remain."
```

The student learns the reasoning pattern, not just the answer.

### Tool Use Distillation

```
Prompt: "What's the weather in Tokyo?"

Teacher output:
"I'll check the weather for Tokyo.
[call: get_weather(city='Tokyo', unit='celsius')]
[output: {'temp': 22, 'conditions': 'partly cloudy'}]
The current weather in Tokyo is 22°C and partly cloudy."
```

## Distillation Results

Typical capability retention after distillation:

| Teacher → Student | MMLU | GSM8K | HumanEval | Cost Reduction |
|-------------------|------|-------|-----------|---------------|
| GPT-4 → Llama 70B | 85% | 80% | 75% | 5-10× |
| GPT-4 → Llama 8B | 70% | 60% | 55% | 30-50× |
| Claude 3 → Mistral 7B | 65% | 55% | 50% | 50-100× |

**Note**: These are approximate ranges; results vary by task, data quality, and training setup.

## Key Takeaways

- Distillation compresses teacher knowledge into a cheaper, faster student model
- Response distillation (SFT on teacher outputs) is the simplest and most effective approach
- Reasoning distillation (with CoT) transfers problem-solving ability, not just facts
- Self-distillation can iteratively improve a model
- Expect 60-85% capability retention depending on size gap

## Related Documentation

- **[Fine-tuning](/docs/fine-tuning-lora)** — The mechanics of adapting pre-trained models
- **[Inference Optimization](/docs/inference-optimization-quantization)** — Alternative compression methods
- **[Scaling Laws](/docs/model-scaling-laws)** — Understanding capability vs. size trade-offs
