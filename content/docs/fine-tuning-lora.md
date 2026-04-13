---
title: "Fine-tuning and LoRA/PEFT"
description: "Adapting pre-trained LLMs to specific domains — full fine-tuning, LoRA, QLoRA, and parameter-efficient methods with practical examples"
date: "2026-04-06"
category: "Best Practices"
tags: ["fine-tuning", "lora", "peft", "qlora", "adaptation", "transfer-learning"]
author: "LLM Hub Team"
---

# Fine-tuning and LoRA/PEFT

Pre-trained LLMs are remarkably capable out of the box, but domain-specific applications often require adaptation. Fine-tuning adjusts a model's weights on your data to improve performance on specific tasks or domains.

## When to Fine-tune vs. Prompt

| Criterion | Prompt Engineering | Fine-tuning |
|-----------|-------------------|-------------|
| **Data available** | No training data needed | 100–10,000+ examples |
| **Cost** | Pay per API call | Upfront training cost |
| **Latency** | Same as base model | Same or faster (smaller model possible) |
| **Quality ceiling** | Limited by base model | Can exceed base model on target task |
| **Maintenance** | Easy to update prompts | Requires retraining pipeline |
| **Data privacy** | Data sent to API | Train on-prem, data stays local |

**Rule of thumb**: Start with prompt engineering. Fine-tune when:
- Prompts can't achieve target quality consistently
- You need to reduce inference costs (fine-tune a smaller model)
- You have domain-specific language/style requirements
- Data privacy prevents API usage

## Full Fine-tuning

Training all model weights on domain-specific data:

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer

model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.2-3B")
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.2-3B")

# Prepare dataset
train_data = [
    {"input": "What is our company's refund policy?", 
     "output": "Customers can request a refund within 30 days..."},
    # ... more examples
]

# Full fine-tuning trains ALL parameters
# For a 3B model: 3 billion parameters → needs significant GPU memory
```

**Hardware requirements**:
| Model Size | GPUs Needed (A100 80GB) | Training Time (1K examples) |
|-----------|------------------------|---------------------------|
| 3B | 1 | ~2 hours |
| 8B | 2-4 | ~4 hours |
| 70B | 8-16 | ~24 hours |

## Parameter-Efficient Fine-tuning (PEFT)

Instead of updating all parameters, PEFT methods train a small number of additional parameters while freezing the base model.

### LoRA (Low-Rank Adaptation)

LoRA injects trainable low-rank matrices into attention layers:

```python
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.2-3B")

# LoRA configuration
lora_config = LoraConfig(
    r=16,                    # Rank of update matrices
    lora_alpha=32,           # Scaling factor
    lora_dropout=0.05,
    bias="none",
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],  # Where to inject
    task_type="CAUSAL_LM"
)

# The model now has only ~0.1% trainable parameters
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# "trainable params: 4,194,304 || all params: 3,212,756,992 || trainable%: 0.13%"
```

**How LoRA works**:

```
Original:    W @ x
With LoRA:   W @ x + (B @ A) @ x

Where:
  W: frozen weight matrix (d_model × d_model)
  A: trainable down-projection (r × d_model), r << d_model
  B: trainable up-projection (d_model × r)
  
For r=16, d_model=4096:
  Original: 4096 × 4096 = 16.7M params
  LoRA: 2 × (16 × 4096) = 131K params per matrix (127× fewer!)
```

### QLoRA (Quantized LoRA)

Combines LoRA with 4-bit quantization for even lower memory:

```python
from transformers import BitsAndBytesConfig
from peft import LoraConfig, prepare_model_for_kbit_training

# 4-bit quantization
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",       # Normal Float 4-bit
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,  # Double quantization
)

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.2-3B",
    quantization_config=bnb_config,
    device_map="auto"
)

model = prepare_model_for_kbit_training(model)
model = get_peft_model(model, lora_config)
```

**Memory comparison for 70B model**:

| Method | GPU Memory | Quality |
|--------|-----------|---------|
| Full fine-tuning (FP16) | ~280 GB | Best |
| LoRA (FP16) | ~140 GB | Near-full |
| QLoRA (4-bit) | ~48 GB | ~95-99% of full |

## Training Data Format

### Instruction Format (Alpaca-style)

```json
[
  {
    "instruction": "Explain the law of supply and demand",
    "input": "",
    "output": "The law of supply and demand states that..."
  },
  {
    "instruction": "Translate to Spanish",
    "input": "Good morning, how can I help you?",
    "output": "Buenos días, ¿en qué puedo ayudarle?"
  }
]
```

### Chat Format (Llama 3)

```json
[
  {
    "messages": [
      {"role": "system", "content": "You are a customer support agent."},
      {"role": "user", "content": "I need to return an item"},
      {"role": "assistant", "content": "I'd be happy to help with your return..."}
    ]
  }
]
```

## Training with Hugging Face Transformers

```python
from transformers import TrainingArguments, Trainer
from datasets import load_dataset

dataset = load_dataset("json", data_files="training_data.json")

training_args = TrainingArguments(
    output_dir="./lora-output",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,            # Higher LR for LoRA than full fine-tuning
    fp16=True,
    logging_steps=10,
    save_strategy="epoch",
    evaluation_strategy="epoch",
    optim="paged_adamw_8bit",      # Memory-efficient optimizer
    lr_scheduler_type="cosine",
    warmup_ratio=0.03,
)

trainer = Trainer(
    model=model,
    train_dataset=dataset["train"],
    eval_dataset=dataset.get("validation"),
    args=training_args,
)

trainer.train()
model.save_pretrained("./fine-tuned-model")
```

## Merging LoRA Adapters

After training, you can merge the adapter with the base model for deployment:

```python
from peft import PeftModel

base_model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.2-3B")
lora_model = PeftModel.from_pretrained(base_model, "./fine-tuned-model")

# Merge adapter weights into base model
merged = lora_model.merge_and_unload()
merged.save_pretrained("./merged-model")
```

## Common Fine-tuning Tasks

| Task | Format | Example |
|------|--------|---------|
| **Instruction following** | Instruction → Response | Q&A, summarization |
| **Style transfer** | Input → Styled output | Formal writing, brand voice |
| **Domain adaptation** | Domain text → Domain text | Legal, medical, code |
| **Tool use** | Query → Tool call + result | API calling, code execution |
| **Classification** | Text → Label | Sentiment, intent, topic |

## Best Practices

1. **Data quality > Data quantity**: 500 clean examples often beat 10,000 noisy ones
2. **Start small**: Try LoRA on a 3-8B model before scaling up
3. **Validate thoroughly**: Test on held-out data AND real-world inputs
4. **Avoid catastrophic forgetting**: Mix some general data with domain data
5. **Monitor for overfitting**: Training loss should decrease; eval loss should too
6. **Use QLoRA for large models**: 4-bit LoRA makes 70B models trainable on consumer hardware

## Key Takeaways

- LoRA reduces trainable parameters by 100-1000× with near-full fine-tuning quality
- QLoRA enables fine-tuning 70B models on a single 48GB GPU
- Fine-tune when prompting alone can't achieve your quality targets
- Data quality is the most important factor in fine-tuning success
- Always validate on real-world inputs, not just held-out test sets

## Related Documentation

- **[Model Training](/docs/model-training-pretraining)** — How pre-training works
- **[Evaluation Metrics](/docs/evaluation-metrics-benchmarks)** — Measuring fine-tuning success
- **[RAG Systems](/docs/rag-retrieval-augmented-generation)** — Alternative to fine-tuning
