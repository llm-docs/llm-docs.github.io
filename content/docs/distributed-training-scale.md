---
title: "Distributed Training at Scale"
description: "Engineering systems for training 100B+ parameter models — cluster design, networking, fault tolerance, and the operational challenges of frontier model training"
date: "2026-04-18"
category: "Advanced Technical"
tags: ["distributed-training", "cluster", "networking", "fault-tolerance", "infrastructure", "engineering"]
author: "LLM Hub Team"
---

# Distributed Training at Scale

Training frontier models with hundreds of billions of parameters requires thousands of GPUs working in concert for weeks or months. This guide covers the engineering systems that make this possible.

## Cluster Architecture

### GPU Interconnect Hierarchy

```
Within a node (8 GPUs):
  NVLink: 900 GB/s between GPUs (same server)

Within a rack:
  InfiniBand: 400 Gb/s between nodes (same rack)

Across racks:
  InfiniBand/RoCE: 200-400 Gb/s (datacenter-scale)

Between datacenters:
  Dedicated fiber: 100-800 Gb/s (geo-distributed)
```

**Critical insight**: Communication bandwidth determines parallelism strategy. NVLink enables tensor parallelism; InfiniBand is needed for data parallelism across nodes.

### Typical Training Cluster

```
Frontier model training (e.g., 405B parameter model):

┌─────────────────────────────────────────────┐
│              Parameter Server               │
│         (or Fully Sharded across)            │
├─────────────────────────────────────────────┤
│  Node 0  │  Node 1  │  ...  │  Node 511    │
│  8×H100  │  8×H100  │       │  8×H100      │
│  NVLink  │  NVLink  │       │  NVLink      │
├──────────┴──────────┴───────┴──────────────┤
│        InfiniBand Fabric (400 Gb/s)         │
└─────────────────────────────────────────────┘

Total: 4,096 H100 GPUs, ~50 TB aggregate memory
Training time: ~50 days for 10T tokens
```

## Parallelism Strategy at Scale

For a 405B model, no single parallelism technique is sufficient. The standard approach combines all three:

```python
# Conceptual parallelism configuration
config = {
    "model_params": 405_000_000_000,
    
    # Data parallelism: replicate model across groups
    "data_parallelism": 64,        # 64 copies of the model
    
    # Tensor parallelism: split each layer across GPUs within a node
    "tensor_parallelism": 8,       # 8 GPUs per node (NVLink)
    
    # Pipeline parallelism: split layers across nodes
    "pipeline_parallelism": 8,     # 8 stage pipeline
    
    # Total GPUs: 64 × 8 × 8 = 4,096
}
```

### Communication Patterns

```
Data Parallelism:    All-reduce gradients across replicas (InfinitBand)
Tensor Parallelism:  All-reduce within node (NVLink, fast)
Pipeline Parallelism: Send activations/grads between stages (InfiniBand)

Communication cost:
  Data parallel:     O(P / DP) per step (P = params)
  Tensor parallel:   O(P / TP) per layer (within node)
  Pipeline parallel: O(activation_size) per stage boundary
```

## Fault Tolerance

### The Reality of Large-Scale Training

With 4,000+ GPUs running for 50 days, hardware failures are inevitable:

```
Expected failures per training run:
  GPU failures:        5-10
  Network failures:    2-5
  Storage failures:    1-2
  Power events:        0-1
  
Mean time between failures (MTBF): ~3-5 days
```

### Checkpoint Strategy

```python
# Asynchronous checkpointing to avoid training stalls
def async_checkpoint(model, optimizer, step, checkpoint_dir):
    """Save checkpoint without blocking training."""
    # 1. Copy model state to CPU
    cpu_state = {k: v.cpu() for k, v in model.state_dict().items()}
    
    # 2. Write to storage in background thread
    thread = threading.Thread(
        target=_save_checkpoint,
        args=(cpu_state, optimizer.state_dict(), step, checkpoint_dir)
    )
    thread.start()
    
    # Training continues immediately

def _save_checkpoint(model_state, opt_state, step, directory):
    """Background save (may take 5-30 minutes for large models)."""
    path = os.path.join(directory, f"checkpoint-{step}.pt")
    torch.save({
        "step": step,
        "model": model_state,
        "optimizer": opt_state,
    }, path)
```

### Automatic Recovery

```python
class TrainingManager:
    def __init__(self, model, dataloader, checkpoint_dir):
        self.model = model
        self.dataloader = dataloader
        self.checkpoint_dir = checkpoint_dir
        self.step = 0
    
    def run(self, total_steps: int):
        while self.step < total_steps:
            try:
                # Training step
                batch = next(self.dataloader)
                loss = self.model(batch)
                loss.backward()
                self.optimizer.step()
                self.step += 1
                
                # Periodic checkpoint
                if self.step % 1000 == 0:
                    async_checkpoint(self.model, self.optimizer, 
                                   self.step, self.checkpoint_dir)
                
                # Health check
                self.check_health()
                
            except Exception as e:
                logger.error(f"Training interrupted: {e}")
                self.recover_from_checkpoint()
    
    def recover_from_checkpoint(self):
        """Find latest checkpoint and resume training."""
        checkpoints = sorted(glob.glob(f"{self.checkpoint_dir}/checkpoint-*.pt"))
        if not checkpoints:
            raise RuntimeError("No checkpoint found!")
        
        latest = checkpoints[-1]
        self.step = load_checkpoint(latest, self.model, self.optimizer)
        logger.info(f"Resumed training from step {self.step}")
```

## Network Optimization

### Overlapping Communication and Computation

```python
# Bucket all-reduce with computation to hide communication latency
def overlapping_step(batch):
    """Compute forward/backward while communication happens."""
    # Start gradient all-reduce for layer N asynchronously
    handle = torch.distributed.all_reduce(
        layer_n_gradients, async_op=True
    )
    
    # Continue with forward pass for next micro-batch
    next_output = model.forward(next_batch)
    
    # Wait for all-reduce to complete
    handle.wait()
    
    # Now gradients are ready for optimizer step
    optimizer.step()
```

### Gradient Compression

```python
# 1-bit Adam: compress gradients to 1 bit each
def compress_gradients(gradients):
    """Reduce communication volume by compressing gradients."""
    # Quantize to {-1, 0, 1}
    sign = torch.sign(gradients)
    magnitude = gradients.abs().mean()
    return sign, magnitude

def decompress_gradients(sign, magnitude):
    """Reconstruct approximate gradients."""
    return sign * magnitude

# Communication savings: 32 bits → 1 bit per gradient value (32× reduction)
# Accuracy impact: &lt;1% with error compensation
```

## Monitoring and Debugging

### Loss Curve Monitoring

```python
def monitor_loss(loss_history: list[float], window: int = 100) -> dict:
    """Detect training anomalies."""
    recent = loss_history[-window:]
    
    # Check for loss spikes
    mean_loss = np.mean(recent)
    std_loss = np.std(recent)
    spike_threshold = mean_loss + 5 * std_loss
    
    spikes = sum(1 for l in recent if l > spike_threshold)
    
    # Check for divergence
    if len(loss_history) > window * 2:
        older = loss_history[-window*2:-window]
        if np.mean(recent) > np.mean(older) * 1.5:
            return {"status": "diverging", "action": "reduce_learning_rate"}
    
    # Check for NaN
    if any(np.isnan(l) for l in recent):
        return {"status": "nan_detected", "action": "recover_from_checkpoint"}
    
    return {
        "status": "healthy",
        "mean_loss": mean_loss,
        "loss_std": std_loss,
        "spikes": spikes,
    }
```

### GPU Utilization Tracking

```python
# Using nvidia-smi or DCGM
def check_gpu_health():
    """Monitor GPU status across the cluster."""
    health = {}
    for gpu_id in range(num_gpus):
        result = subprocess.run(
            ["nvidia-smi", f"--id={gpu_id}", "--query-gpu=utilization.gpu,memory.used", "--format=csv,noheader"],
            capture_output=True, text=True
        )
        util, mem = result.stdout.strip().split(", ")
        health[gpu_id] = {
            "utilization": float(util.replace("%", "")),
            "memory_used": float(mem.replace(" MiB", "")),
            "healthy": float(util.replace("%", "")) > 80,  # Should be >80% during training
        }
    return health
```

## Cost and Time Estimates

| Model Size | GPUs | Training Time | Compute Cost | Electricity |
|-----------|------|--------------|-------------|-------------|
| 7B | 64×A100 | 1 week | ~$25K | ~$5K |
| 70B | 512×A100 | 2 weeks | ~$500K | ~$50K |
| 405B | 4096×H100 | 50 days | ~$10M | ~$500K |
| 1T+ | 8192+×H100 | 3-6 months | $50M+ | $2M+ |

## Key Takeaways

- Frontier model training requires 1,000-10,000 GPUs for weeks to months
- Three-way parallelism (data + tensor + pipeline) is essential for 100B+ models
- Hardware failures are the norm, not the exception — design for automatic recovery
- Checkpoint every few thousand steps; use async checkpointing to avoid stalls
- Network bandwidth (InfiniBand) is the critical inter-node bottleneck
- Loss curve monitoring is the primary training health indicator

## Related Documentation

- **[Model Training](/docs/model-training-pretraining)** — Single-node training fundamentals
- **[Scaling Laws](/docs/model-scaling-laws)** — How much compute you need
- **[Inference Optimization](/docs/inference-optimization-quantization)** — Serving the trained model
