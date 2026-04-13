---
title: "Reinforcement Learning for LLMs"
description: "Using RL to improve LLM behavior — PPO, GRPO, reward modeling, process vs outcome supervision, and scaling RL for alignment"
date: "2026-04-26"
category: "Advanced Technical"
tags: ["reinforcement-learning", "PPO", "GRPO", "reward-modeling", "alignment", "RLHF"]
author: "IntuiVortex Team"
---

# Reinforcement Learning for LLMs

Reinforcement Learning (RL) has become the dominant paradigm for aligning LLMs with human preferences and improving their reasoning capabilities. From RLHF to DPO to the recent GRPO breakthrough, RL techniques enable models to go beyond next-token prediction toward behavior shaped by outcome-based feedback. This guide covers the full RL landscape for LLM improvement.

## Why RL for LLMs?

Supervised fine-tuning (SFT) has fundamental limitations that RL addresses:

| Limitation | SFT | RL Approach |
|-----------|-----|-------------|
| **No outcome feedback** | Learns to mimic, not to succeed | Rewards based on whether the output is correct |
| **Distribution shift** | Trained on human data, deploys autonomously | Learns from its own outputs and their consequences |
| **No exploration** | Only sees what humans wrote | Can discover strategies humans didn't demonstrate |
| **No multi-step optimization** | Optimizes per-token probability | Optimizes the quality of the complete response |
| **Hard to specify** | Needs input-output pairs | Can use scalar rewards, preferences, or rules |

## The RL Pipeline for LLMs

```
┌─────────────────────────────────────────────────────────────┐
│                   RL Training Pipeline                       │
│                                                              │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐       │
│  │  Reward    │────▶│   Policy   │────▶│    Value   │       │
│  │  Model     │     │  (LLM)     │     │   Model    │       │
│  └────────────┘     └────────────┘     └────────────┘       │
│        ▲                   │                   │             │
│        │                   │                   │             │
│  ┌─────┴─────┐      ┌─────┴─────┐      ┌─────┴─────┐        │
│  │ Preference │      │  Response │      │  Critique │        │
│  │   Data     │      │ Generation│      │  (Value)  │        │
│  └───────────┘      └───────────┘      └───────────┘        │
│                                                              │
│  Stages:                                                     │
│  1. SFT: Supervised fine-tuning on quality data              │
│  2. Reward Modeling: Train reward model from preferences      │
│  3. RL Optimization: Optimize policy against reward model     │
│  4. Evaluation: Test on held-out benchmarks                  │
└─────────────────────────────────────────────────────────────┘
```

## PPO (Proximal Policy Optimization)

PPO is the classic RLHF algorithm used in InstructGPT and ChatGPT.

### PPO for LLMs

```python
import torch
import torch.nn.functional as F

class PPOTrainer:
    """PPO trainer for LLM alignment."""

    def __init__(
        self,
        policy_model,
        reference_model,  # SFT model for KL constraint
        reward_model,
        value_model,
        lr: float = 1e-6,
        clip_epsilon: float = 0.2,
        kl_coef: float = 0.2,
        gamma: float = 0.99,
        lam: float = 0.95,
    ):
        self.policy = policy_model
        self.reference = reference_model
        self.reward_model = reward_model
        self.value_model = value_model
        self.lr = lr
        self.clip_epsilon = clip_epsilon
        self.kl_coef = kl_coef
        self.gamma = gamma
        self.lam = lam

        self.optimizer = torch.optim.Adam(policy_model.parameters(), lr=lr)

    def compute_advantages(self, rewards: list[float], values: list[float]) -> tuple[list[float], list[float]]:
        """Compute GAE advantages."""
        advantages = []
        gae = 0.0

        for t in reversed(range(len(rewards))):
            delta = rewards[t] + self.gamma * (values[t + 1] if t + 1 < len(values) else 0) - values[t]
            gae = delta + self.gamma * self.lam * gae
            advantages.insert(0, gae)

        returns = [adv + val for adv, val in zip(advantages, values)]
        return advantages, returns

    def ppo_loss(
        self,
        log_probs: torch.Tensor,
        old_log_probs: torch.Tensor,
        advantages: torch.Tensor,
        values: torch.Tensor,
        returns: torch.Tensor,
        ref_log_probs: torch.Tensor,
    ) -> torch.Tensor:
        """Compute the PPO loss with KL penalty."""
        # Policy loss (clipped surrogate objective)
        ratio = torch.exp(log_probs - old_log_probs)
        clipped_ratio = torch.clamp(ratio, 1 - self.clip_epsilon, 1 + self.clip_epsilon)

        policy_loss = -torch.min(
            ratio * advantages,
            clipped_ratio * advantages,
        ).mean()

        # Value loss
        value_loss = F.mse_loss(values, returns)

        # KL penalty (keep policy close to reference)
        kl_div = (ref_log_probs - log_probs).mean()

        # Combined loss
        total_loss = policy_loss + 0.5 * value_loss + self.kl_coef * kl_div

        return total_loss

    def train_step(self, batch: dict) -> dict:
        """Execute one PPO training step."""
        prompts = batch["prompts"]

        # Generate responses with current policy
        with torch.no_grad():
            responses, log_probs = self.policy.generate_with_log_probs(prompts)

        # Get reward model scores
        rewards = self.reward_model.score(prompts, responses)

        # Get value estimates
        values = self.value_model.estimate(prompts, responses)

        # Get reference model log probs for KL
        with torch.no_grad():
            ref_log_probs = self.reference.log_probs(prompts, responses)

        # Compute advantages
        advantages, returns = self.compute_advantages(rewards, values)

        # Update policy
        self.optimizer.zero_grad()
        loss = self.ppo_loss(
            log_probs=log_probs,
            old_log_probs=log_probs.detach(),
            advantages=torch.tensor(advantages),
            values=torch.tensor(values),
            returns=torch.tensor(returns),
            ref_log_probs=ref_log_probs,
        )
        loss.backward()
        self.optimizer.step()

        return {
            "loss": loss.item(),
            "policy_loss": loss.item(),  # Decompose in practice
            "value_loss": 0.0,
            "kl_div": 0.0,
            "rewards_mean": sum(rewards) / len(rewards),
        }
```

### PPO Challenges

| Challenge | Description | Mitigation |
|-----------|-------------|------------|
| **High variance** | RL gradients are noisy | Large batch sizes, gradient clipping |
| **KL collapse** | Policy drifts too far from reference | Strong KL penalty, early stopping |
| **Reward hacking** | Model exploits reward model flaws | Reward model ensembles, human review |
| **Compute cost** | Requires 4 models (policy, ref, reward, value) | GRPO eliminates value model |
| **Instability** | Training can diverge easily | Careful learning rate tuning, clipping |

## GRPO (Group Relative Policy Optimization)

GRPO, popularized by DeepSeek, simplifies PPO by eliminating the value model and using group-relative advantages.

### How GRPO Works

```python
class GRPOTrainer:
    """Group Relative Policy Optimization — simpler and more efficient than PPO."""

    def __init__(
        self,
        policy_model,
        reference_model,
        reward_fn,
        lr: float = 1e-6,
        kl_coef: float = 0.04,
        epsilon: float = 0.2,
        num_generations: int = 8,
    ):
        self.policy = policy_model
        self.reference = reference_model
        self.reward_fn = reward_fn
        self.lr = lr
        self.kl_coef = kl_coef
        self.epsilon = epsilon
        self.num_generations = num_generations

        self.optimizer = torch.optim.Adam(policy_model.parameters(), lr=lr)

    def train_step(self, batch: dict) -> dict:
        """One GRPO training step."""
        prompts = batch["prompts"]

        # Generate multiple responses per prompt
        all_log_probs = []
        all_responses = []
        all_rewards = []

        for prompt in prompts:
            responses = []
            rewards = []
            log_probs = []

            for _ in range(self.num_generations):
                response, log_prob = self.policy.generate_with_log_probs(prompt)
                reward = self.reward_fn(prompt, response)
                responses.append(response)
                rewards.append(reward)
                log_probs.append(log_prob)

            # Normalize rewards within the group (key GRPO innovation)
            mean_reward = sum(rewards) / len(rewards)
            std_reward = max((sum((r - mean_reward)**2 for r in rewards) / len(rewards)) ** 0.5, 1e-8)
            advantages = [(r - mean_reward) / std_reward for r in rewards]

            all_responses.extend(responses)
            all_rewards.extend(rewards)
            all_log_probs.extend(zip(log_probs, advantages))

        # Get reference log probs for KL
        with torch.no_grad():
            ref_log_probs = [
                self.reference.log_probs(prompt, resp)
                for prompt, resp in zip(prompts * self.num_generations, all_responses)
            ]

        # Compute loss
        total_loss = 0
        for (log_prob, advantage), ref_lp in zip(all_log_probs, ref_log_probs):
            ratio = torch.exp(log_prob - log_prob.detach())
            clipped_ratio = torch.clamp(ratio, 1 - self.epsilon, 1 + self.epsilon)

            policy_loss = -torch.min(
                ratio * torch.tensor(advantage),
                clipped_ratio * torch.tensor(advantage),
            )

            kl_penalty = self.kl_coef * (ref_lp - log_prob)

            total_loss += policy_loss + kl_penalty

        total_loss = total_loss / len(all_log_probs)

        self.optimizer.zero_grad()
        total_loss.backward()
        self.optimizer.step()

        return {
            "loss": total_loss.item(),
            "mean_reward": sum(all_rewards) / len(all_rewards),
            "kl_div": sum((ref_lp - lp).item() for lp, ref_lp in zip(
                [lp for lp, _ in all_log_probs], ref_log_probs
            )) / len(all_log_probs),
        }
```

### GRPO vs PPO Comparison

| Aspect | PPO | GRPO |
|--------|-----|------|
| **Models needed** | 4 (policy, ref, reward, value) | 3 (policy, ref, reward) |
| **Value model** | Required | Not needed |
| **Advantage computation** | GAE from value model | Group-relative normalization |
| **Memory usage** | High (4 models in memory) | Lower (3 models) |
| **Stability** | Moderate (value model helps) | Good (group normalization stabilizes) |
| **Compute per step** | Higher | Lower |
| **Adoption** | Standard for RLHF | Growing rapidly (DeepSeek R1) |
| **Best for** | General preference alignment | Reasoning, math, code tasks |

## Reward Modeling

### Training a Reward Model

```python
class RewardModelTrainer:
    """Train a reward model from preference data."""

    def __init__(self, model, lr: float = 1e-6):
        self.model = model
        self.optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    def train_on_preferences(
        self,
        prompts: list[str],
        chosen_responses: list[str],
        rejected_responses: list[str],
        epochs: int = 3,
    ):
        """Train the reward model to prefer chosen over rejected responses."""
        for epoch in range(epochs):
            total_loss = 0

            for prompt, chosen, rejected in zip(prompts, chosen_responses, rejected_responses):
                # Get reward scores
                reward_chosen = self.model.score(prompt, chosen)
                reward_rejected = self.model.score(prompt, rejected)

                # Bradley-Terry loss: -log(σ(r_chosen - r_rejected))
                loss = -F.logsigmoid(reward_chosen - reward_rejected)

                self.optimizer.zero_grad()
                loss.backward()
                self.optimizer.step()

                total_loss += loss.item()

            print(f"Epoch {epoch}: avg_loss = {total_loss / len(prompts):.4f}")

    def evaluate(self, val_prompts, val_chosen, val_rejected) -> float:
        """Evaluate reward model accuracy on validation set."""
        correct = 0
        for prompt, chosen, rejected in zip(val_prompts, val_chosen, val_rejected):
            r_chosen = self.model.score(prompt, chosen)
            r_rejected = self.model.score(prompt, rejected)
            if r_chosen > r_rejected:
                correct += 1
        return correct / len(val_prompts)
```

### Rule-Based Reward Models

For tasks with verifiable answers (math, code), you can use rule-based rewards instead of a learned reward model:

```python
class RuleBasedRewardModel:
    """Reward model based on verifiable correctness."""

    def score(self, prompt: str, response: str) -> float:
        """Score a response based on verifiable correctness."""
        reward = 0.0

        # Check format
        format_score = self._check_format(response)
        reward += format_score * 0.1

        # Check correctness (for math/code)
        correctness_score = self._check_correctness(prompt, response)
        reward += correctness_score * 0.8

        # Check reasoning quality
        reasoning_score = self._check_reasoning(response)
        reward += reasoning_score * 0.1

        return reward

    def _check_format(self, response: str) -> float:
        """Check if response follows expected format."""
        # For math: should have final answer in a box
        import re
        if re.search(r'\\boxed\{.*?\}', response):
            return 1.0
        elif re.search(r'final answer.*?:', response, re.IGNORECASE):
            return 0.7
        else:
            return 0.3

    def _check_correctness(self, prompt: str, response: str) -> float:
        """Check if the answer is actually correct."""
        # Extract answer
        import re
        match = re.search(r'\\boxed\{(.+?)\}', response)
        if not match:
            match = re.search(r'final answer.*?:\s*(.+)', response, re.IGNORECASE)
        if not match:
            return 0.0

        answer = match.group(1).strip()

        # Compare with ground truth
        ground_truth = self._get_ground_truth(prompt)
        if ground_truth is None:
            return 0.5  # Can't verify

        return 1.0 if self._answers_match(answer, ground_truth) else 0.0

    def _check_reasoning(self, response: str) -> float:
        """Check if the reasoning is coherent."""
        # Heuristic: longer responses with step-by-step markers score higher
        has_steps = any(marker in response.lower() for marker in [
            "step 1", "step 2", "first", "next", "then", "therefore",
        ])
        length_score = min(len(response) / 500, 1.0)

        return (has_steps * 0.6 + length_score * 0.4)
```

## Process vs. Outcome Supervision

### Outcome Supervision (Standard)

Only evaluates the final answer:

```python
def outcome_reward(prompt: str, response: str) -> float:
    """Reward based only on the final answer correctness."""
    final_answer = extract_answer(response)
    ground_truth = get_ground_truth(prompt)
    return 1.0 if final_answer == ground_truth else 0.0
```

### Process Supervision (PRM)

Evaluates each step of the reasoning:

```python
class ProcessRewardModel:
    """Reward each step of the reasoning process."""

    def __init__(self, verifier):
        self.verifier = verifier

    def score(self, prompt: str, response: str) -> tuple[float, list[float]]:
        """Score the response with per-step rewards."""
        steps = self._extract_steps(response)
        step_rewards = []

        for i, step in enumerate(steps):
            is_correct = self.verifier.check_step(prompt, steps[:i+1])
            step_rewards.append(1.0 if is_correct else -0.5)

        # Only give full reward if the final answer is also correct
        final_correct = self._check_final_answer(prompt, response)
        if final_correct:
            step_rewards[-1] = 1.0  # Bonus for correct final answer

        total_reward = sum(step_rewards) / len(step_rewards) if step_rewards else 0.0
        return total_reward, step_rewards

    def _extract_steps(self, response: str) -> list[str]:
        """Split response into reasoning steps."""
        import re
        steps = re.split(r'Step \d+:|First,|Next,|Then,|Now,', response)
        return [s.strip() for s in steps if s.strip()]
```

### Comparison

| Aspect | Outcome Supervision | Process Supervision |
|--------|-------------------|-------------------|
| **Signal density** | Sparse (one bit per response) | Dense (one bit per step) |
| **Training efficiency** | Lower (hard to attribute credit) | Higher (clear step-level credit) |
| **Annotation cost** | Cheap (verify final answer) | Expensive (verify each step) |
| **Best for** | Tasks with clear answers | Complex reasoning tasks |
| **Risk** | Reward hacking possible | Harder to game |
| **Scalability** | Easy with automated checks | Requires step-level verifier |

## Scaling RL for Alignment

### Compute Requirements

| Method | GPUs (A100 80GB) | Training Time | Model Size | Data Size |
|--------|-----------------|--------------|------------|-----------|
| DPO (single round) | 8 | 1-2 days | 7B | 10K-100K pairs |
| PPO (full RLHF) | 64-128 | 1-2 weeks | 70B | 100K-1M pairs |
| GRPO | 32-64 | 3-5 days | 70B | 50K-500K problems |
| Iterative DPO (3 rounds) | 8 | 1 week | 7B | 30K-300K pairs |
| Online RLVR | 128+ | 2-3 weeks | 405B | Unlimited (self-generated) |

### Best Practices

| Practice | Description | Impact |
|----------|-------------|--------|
| **Start with strong SFT** | Quality base model before RL | Critical — RL amplifies SFT quality |
| **Use diverse data** | Mix of tasks, domains, difficulties | Reduces overfitting to narrow patterns |
| **Monitor KL divergence** | Don't let policy drift too far | Prevents degeneration |
| **Iterative training** | Multiple rounds of data generation + training | Better than single large pass |
| **Verify rewards** | Human review of reward model outputs | Catches reward hacking |
| **Hold-out evaluation** | Never evaluate on training prompts | True measure of generalization |
| **Temperature tuning** | Use temperature=1.0 during RL training | Proper exploration |

### Iterative RL Pipeline

```python
class IterativeRLPipeline:
    """Iteratively improve a model through multiple RL rounds."""

    def __init__(self, model, reward_fn, eval_benchmark):
        self.model = model
        self.reward_fn = reward_fn
        self.eval_benchmark = eval_benchmark

    def run(self, num_rounds: int = 5, prompts_per_round: int = 1000):
        """Run iterative RL training."""
        results = []

        for round_num in range(num_rounds):
            print(f"=== Round {round_num + 1}/{num_rounds} ===")

            # 1. Evaluate current model
            eval_score = self.eval_benchmark.evaluate(self.model)
            print(f"Current eval score: {eval_score}")
            results.append({"round": round_num, "score": eval_score})

            # 2. Generate training data
            training_data = self._generate_training_data(prompts_per_round)

            # 3. Train with GRPO
            trainer = GRPOTrainer(
                policy_model=self.model,
                reference_model=self.model,  # Previous iteration
                reward_fn=self.reward_fn,
            )
            trainer.train_on_batch(training_data)

            # 4. Save checkpoint
            self.model.save_checkpoint(f"round_{round_num}")

        return results

    def _generate_training_data(self, num_prompts: int) -> list[dict]:
        """Generate training data by sampling from current model."""
        prompts = self._sample_prompts(num_prompts)
        data = []

        for prompt in prompts:
            responses = []
            for _ in range(8):
                response = self.model.generate(prompt, temperature=1.0)
                reward = self.reward_fn(prompt, response)
                responses.append((response, reward))

            data.append({
                "prompt": prompt,
                "responses": [r for r, _ in responses],
                "rewards": [r for _, r in responses],
            })

        return data
```

## Method Selection Guide

| Goal | Recommended Method | Why |
|------|-------------------|-----|
| General chat alignment | DPO (iterative) | Simple, stable, good results |
| Maximum quality | PPO with strong reward model | Proven at scale (ChatGPT) |
| Math/reasoning improvement | GRPO with rule-based rewards | Efficient, verifiable tasks |
| Code generation | GRPO with execution-based rewards | Automated correctness checking |
| Limited compute | DPO on a 7B model | Good results with few GPUs |
| Safety alignment | PPO with safety reward model | Fine-grained control |
| Creative writing | Rejection sampling + SFT | Hard to define scalar rewards |

## Cross-References

- For the SFT foundation before RL, see [SFT, Alignment & RLHF/DPO](/docs/sft-alignment-rlhf-dpo)
- For fine-tuning techniques that precede RL, see [Fine-Tuning & LoRA](/docs/fine-tuning-lora)
- For evaluating RL-improved models, see [Evaluation Metrics & Benchmarks](/docs/evaluation-metrics-benchmarks)
- For safety considerations in aligned models, see [AI Safety & Red Teaming](/docs/ai-safety-red-teaming)
