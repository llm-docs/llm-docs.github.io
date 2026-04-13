---
title: "Model Training and Pre-training"
description: "The complete LLM training pipeline — data preparation, distributed training, optimization techniques, and checkpoint management"
date: "2026-04-08"
category: "Architecture & Training"
tags: ["training", "pre-training", "distributed", "optimization", "checkpoints", "deep-learning"]
author: "LLM Hub Team"
---

# Model Training and Pre-training

Training a large language model from scratch is one of the most computationally intensive endeavors in modern computing. This guide walks through the complete training pipeline.

## The Training Objective

LLMs are trained with **autoregressive language modeling**: predict the next token given all previous tokens.

```python
import torch
import torch.nn.functional as F

def cross_entropy_loss(logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
    """
    logits: (batch, seq_len, vocab_size) — model's raw predictions
    targets: (batch, seq_len) — true token IDs
    
    The model sees tokens 0..n-1 and predicts tokens 1..n
    """
    # Shift: logits predict next token
    logits = logits[:, :-1, :].contiguous()      # (batch, seq_len-1, vocab)
    targets = targets[:, 1:].contiguous()         # (batch, seq_len-1)
    
    # Flatten for loss computation
    logits_flat = logits.view(-1, logits.size(-1))
    targets_flat = targets.view(-1)
    
    return F.cross_entropy(logits_flat, targets_flat)
```

## Distributed Training Strategies

Training a 70B model requires distributing computation across many GPUs. Three parallelism strategies are combined:

### 1. Data Parallelism

Same model replicated across GPUs, each processes different data batch:

```
GPU 0: [batch_0] → model → loss_0 ─┐
GPU 1: [batch_1] → model → loss_1 ─┼→ all-reduce → average gradient → update
GPU 2: [batch_2] → model → loss_2 ─┘
```

**DDP (Distributed Data Parallel)**: Standard PyTorch approach. Simple but each GPU holds a full model copy.

### 2. Tensor Parallelism

Split individual layers across GPUs:

```
GPU 0: computes first half of matrix multiplication
GPU 1: computes second half
→ all-reduce to combine results
```

**Used by**: Megatron-LM, DeepSpeed. Essential when a single layer doesn't fit in one GPU's memory.

### 3. Pipeline Parallelism

Split model layers across GPUs in a pipeline:

```
GPU 0: Layers 1-20 → GPU 1: Layers 21-40 → GPU 2: Layers 41-60 → GPU 3: Layers 61-80
```

**Challenge**: Pipeline bubbles (some GPUs idle while waiting for data). Mitigated with micro-batching.

### 4. Fully Sharded Data Parallel (FSDP)

Combines data and tensor parallelism: model weights are sharded across GPUs and gathered on-demand:

```python
from torch.distributed.fsdp import FullyShardedDataParallel as FSDP

model = FSDP(
    model,
    auto_wrap_policy=transformer_auto_wrap_policy,
    mixed_precision=MixedPrecision(
        param_dtype=torch.float16,
        reduce_dtype=torch.float16,
    ),
)
```

## Mixed Precision Training

### FP16 / BF16 Training

```python
# Automatic Mixed Precision (AMP)
scaler = torch.cuda.amp.GradScaler()

for batch in dataloader:
    with torch.cuda.amp.autocast():
        outputs = model(batch["input_ids"])
        loss = cross_entropy_loss(outputs.logits, batch["labels"])
    
    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
    optimizer.zero_grad()
```

| Precision | Memory | Speed | Stability |
|-----------|--------|-------|-----------|
| FP32 | 100% | Baseline | Most stable |
| FP16 | 50% | 2-3× faster | Can overflow/underflow |
| BF16 | 50% | 2-3× faster | More stable than FP16 |
| FP8 | 25% | 3-4× faster | Emerging, requires H100+ |

**Modern standard**: BF16 for training (wider dynamic range than FP16).

## Optimizer Choices

### AdamW (Standard)

```python
optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=3e-4,
    betas=(0.9, 0.95),
    weight_decay=0.1,
    eps=1e-8,
)
```

### Memory-Efficient Optimizers

| Optimizer | Memory vs Adam | Notes |
|-----------|---------------|-------|
| **AdamW** | 100% | Standard choice |
| **Adafactor** | ~50% | No second-moment storage; used in T5 |
| **Sophia** | ~75% | Hessian-based; claims 2× faster convergence |
| **Lion** | 100% | Simpler update rule; emerging alternative |

## Learning Rate Scheduling

```python
from transformers import get_cosine_schedule_with_warmup

scheduler = get_cosine_schedule_with_warmup(
    optimizer,
    num_warmup_steps=2000,       # Linear ramp-up
    num_training_steps=100000,   # Total steps
    num_cycles=0.5,              # Half cosine
)

# Schedule shape:
# LR: 0 ──────────► peak ────────► minimum
#     ↑ warmup     ↑ cosine decay
#     2000 steps   98000 steps
```

**Why warmup?** Early training steps have large, noisy gradients. Gradually increasing LR prevents divergence.

## Checkpoint Management

```python
import os

def save_checkpoint(model, optimizer, scheduler, step, save_dir):
    """Save training state for resumption."""
    checkpoint = {
        "step": step,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "scheduler_state_dict": scheduler.state_dict(),
    }
    path = os.path.join(save_dir, f"checkpoint-step-{step}.pt")
    torch.distributed.barrier()  # Wait for all GPUs
    torch.save(checkpoint, path)

def load_checkpoint(path, model, optimizer, scheduler):
    """Resume training from checkpoint."""
    checkpoint = torch.load(path, map_location="cpu")
    model.load_state_dict(checkpoint["model_state_dict"])
    optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
    scheduler.load_state_dict(checkpoint["scheduler_state_dict"])
    return checkpoint["step"]
```

## Training Monitoring

Key metrics to track:

| Metric | What It Tells You | Action if Abnormal |
|--------|------------------|-------------------|
| **Training loss** | Model learning rate | Not decreasing → check LR, data |
| **Gradient norm** | Update magnitude | Exploding → reduce LR, add clipping |
| **Parameter norm** | Model weight scale | Growing unbounded → check regularization |
| **Throughput** | Tokens/sec | Dropping → check for memory leaks |
| **Loss spikes** | Training instability | Common, should recover; if not → check data |

## Training Infrastructure

| Model Size | GPUs | GPU Type | Training Time | Estimated Cost |
|-----------|------|----------|--------------|---------------|
| 1B | 8-16 | A100 80GB | 1-2 days | $5K-10K |
| 7B | 32-64 | A100 80GB | 1-2 weeks | $50K-100K |
| 70B | 256-512 | A100/H100 | 2-4 weeks | $500K-2M |
| 400B+ | 2000+ | H100 | 1-3 months | $10M+ |

## Key Takeaways

- Autoregressive next-token prediction is the standard training objective
- Distributed training combines data, tensor, and pipeline parallelism
- BF16 mixed precision is the modern standard for stability
- Learning rate warmup prevents early training instability
- Checkpoint every few thousand steps to recover from failures
- Training costs scale superlinearly with model size

## Related Documentation

- **[Scaling Laws](/docs/model-scaling-laws)** — How much data and compute you need
- **[Training Data](/docs/training-data-curation)** — What data to train on
- **[Fine-tuning](/docs/fine-tuning-lora)** — Adapting pre-trained models
