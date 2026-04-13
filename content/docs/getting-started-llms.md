---
title: "Getting Started with LLMs"
description: "A comprehensive introduction to Large Language Models — architecture, training, capabilities, and practical setup"
date: "2026-04-01"
updatedAt: "2026-04-10"
category: "Fundamentals"
tags: ["llm", "introduction", "basics", "ai", "transformers", "deep-learning"]
author: "IntuiVortex Team"
---

# Getting Started with Large Language Models

Large Language Models (LLMs) are artificial intelligence systems trained on vast amounts of text data to understand, generate, and manipulate human language. They have become the cornerstone of modern AI, powering everything from chatbots and code assistants to research tools and creative writing aids.

This guide covers what LLMs are, how they work under the hood, the landscape of available models, and how to get started using them in your own projects.

## What are LLMs?

LLMs are deep learning models based on the **Transformer architecture** (introduced in the 2017 paper ["Attention Is All You Need"](https://arxiv.org/abs/1706.03762)). They are characterized by several key properties:

- **Scale**: Ranging from hundreds of millions to trillions of parameters
- **Pre-training**: Learned self-supervised from massive text corpora spanning web pages, books, code, and scientific papers
- **Emergent Abilities**: Capabilities that appear unpredictably at scale — reasoning, code generation, translation — that were not explicitly trained for
- **Few-shot & Zero-shot Learning**: Ability to perform tasks from natural language instructions without task-specific fine-tuning
- **Multimodality**: Modern LLMs increasingly handle text, images, audio, video, and structured data

### A Brief History

| Era | Milestone | Significance |
|-----|-----------|-------------|
| 2017 | Transformer architecture | Replaced RNNs/CNNs as the dominant sequence model |
| 2018 | GPT, BERT | Proved pre-training + fine-tuning paradigm |
| 2019 | GPT-2 (1.5B) | Showed scaling improves coherence and task ability |
| 2020 | GPT-3 (175B), T5 | Demonstrated few-shot learning at scale |
| 2021 | InstructGPT, Codex | Alignment via RLHF; code generation |
| 2022 | ChatGPT, StableLM | Conversational AI goes mainstream |
| 2023 | GPT-4, Llama, Claude, Mistral | Multimodal models; open-source renaissance |
| 2024 | Llama 3, Claude 3, Gemini | Frontier models rival human experts |
| 2025-2026 | Reasoning models, agentic systems | Long-horizon planning, tool use, autonomy |

## How LLMs Work

### The Transformer Architecture

The Transformer replaced the sequential processing of RNNs with **self-attention**, enabling parallel computation across entire sequences. Here's the core idea:

```python
import torch
import torch.nn as nn
import math

class MultiHeadSelfAttention(nn.Module):
    """Self-attention mechanism: each token attends to all others."""
    def __init__(self, d_model: int, num_heads: int):
        super().__init__()
        assert d_model % num_heads == 0
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads
        
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)
    
    def forward(self, x: torch.Tensor, mask: torch.Tensor = None) -> torch.Tensor:
        batch_size = x.size(0)
        
        # Linear projections
        Q = self.W_q(x).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        K = self.W_k(x).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        V = self.W_v(x).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        
        # Scaled dot-product attention
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.d_k)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))
        attention = torch.softmax(scores, dim=-1)
        
        # Weighted sum of values
        output = torch.matmul(attention, V)
        output = output.transpose(1, 2).contiguous().view(batch_size, -1, self.d_model)
        return self.W_o(output)
```

### Key Components

| Component | Purpose | Details |
|-----------|---------|---------|
| **Tokenizer** | Text → subword tokens | Byte-pair encoding (BPE), SentencePiece, or tiktoken; vocabulary sizes 32K–200K tokens |
| **Embedding Layer** | Tokens → dense vectors | Learnable embedding matrices; positional encodings add sequence order information |
| **Attention Mechanism** | Contextual token mixing | Scaled dot-product attention; multi-head enables attending to different subspace features |
| **Feed-Forward Network** | Non-linear transformation | Typically 2-layer MLP with GeLU activation; ~4x hidden dimension expansion |
| **Layer Normalization** | Training stability | Pre-LN or Post-LN placement; RMSNorm is common in modern models |
| **Residual Connections** | Gradient flow | Skip connections around each sub-layer |
| **Output Head** | Token prediction | Linear layer projecting to vocabulary; softmax for probability distribution |

### Training Pipeline

1. **Pre-training**: Model learns to predict the next token (autoregressive LM) on trillions of tokens. This takes weeks on thousands of GPUs and costs millions of dollars for frontier models.
2. **Supervised Fine-tuning (SFT)**: Model is further trained on high-quality instruction-response pairs to follow human directions.
3. **Alignment (RLHF/DPO)**: Reinforcement Learning from Human Feedback or Direct Preference Optimization aligns outputs with human values — helpfulness, honesty, harmlessness.
4. **Safety Filtering**: Additional guardrails prevent harmful outputs, jailbreaks, and policy violations.

## Types of LLMs

### By Architecture

| Type | Examples | Strengths | Weaknesses |
|------|----------|-----------|------------|
| **Decoder-only** | GPT-4, Llama 3, Claude, Mistral | Autoregressive generation, versatile, dominant paradigm | Can hallucinate; unidirectional attention |
| **Encoder-only** | BERT, RoBERTa, DeBERTa | Bidirectional understanding, excellent for classification | Cannot generate text natively |
| **Encoder-Decoder** | T5, BART, Flan-T5 | Sequence-to-sequence tasks, translation | Less common now; outperformed by decoder-only at scale |
| **Mixture of Experts (MoE)** | Mixtral 8x7B, Grok, Qwen MoE | Sparse activation; high capacity with lower compute | Complex routing; harder to serve |

### By Access Model

| Type | Examples | Characteristics |
|------|----------|----------------|
| **Closed / API-only** | GPT-4o, Claude Sonnet, Gemini Pro | State-of-the-art performance; pay-per-use; limited customization |
| **Open-weight** | Llama 3.1 405B, Mistral Large, Qwen 2.5 | Downloadable weights; self-hostable; community fine-tunes |
| **Open-weight + permissive license** | Mistral, Gemma, OLMo | Commercial-friendly licenses; research-friendly |
| **Fully open** | OLMo, Pythia | Weights + training data + code; maximum transparency |

### By Size Class

| Class | Parameters | Hardware | Use Cases |
|-------|-----------|----------|-----------|
| **Tiny** | < 1B | CPU, edge devices | On-device inference, IoT, mobile |
| **Small** | 1–7B | Single consumer GPU | Personal assistants, lightweight apps |
| **Medium** | 7–70B | 1–4 GPUs | Enterprise chatbots, code assistants, RAG |
| **Large** | 70–200B | GPU cluster or high-end single GPU | Research, high-quality generation |
| **Frontier** | 200B+ | Massive clusters | State-of-the-art benchmarks, general intelligence tasks |

## Getting Started

### Prerequisites

- **Python 3.10+** installed
- **8 GB RAM** minimum (16 GB recommended)
- For local models: a GPU with **8+ GB VRAM** (NVIDIA recommended for CUDA support)

### Option 1: Quick Start with Hugging Face Transformers

```bash
# Install core libraries
pip install transformers torch accelerate

# Quick sentiment analysis
python -c "
from transformers import pipeline
classifier = pipeline('sentiment-analysis')
result = classifier('I love working with LLMs!')
print(result)  # [{'label': 'POSITIVE', 'score': 0.9998}]
"
```

### Option 2: Text Generation with Open-Source Models

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

model_name = "meta-llama/Llama-3.2-3B-Instruct"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto"  # Automatically use GPU if available
)

messages = [
    {"role": "system", "content": "You are a helpful AI assistant."},
    {"role": "user", "content": "Explain quantum computing in 3 sentences."}
]

prompt = tokenizer.apply_chat_template(messages, tokenize=False)
inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

outputs = model.generate(**inputs, max_new_tokens=150, temperature=0.7)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

### Option 3: Using API Providers

```bash
# OpenAI
pip install openai

# Anthropic
pip install anthropic

# Google
pip install google-generativeai
```

```python
# OpenAI example
from openai import OpenAI

client = OpenAI(api_key="YOUR_API_KEY")
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "What is machine learning?"}],
    temperature=0.7,
    max_tokens=500
)
print(response.choices[0].message.content)
```

### Option 4: Local Inference with Ollama (No GPU Required)

```bash
# Install Ollama: https://ollama.com
ollama run llama3.2:3b "Explain the difference between supervised and unsupervised learning"

# Try different models
ollama run mistral "Write a Python function to sort a list"
ollama run qwen2.5:7b "Summarize the key points of attention mechanisms"
```

## Popular Model Providers

| Provider | Flagship Models | Access | Notable Features |
|----------|----------------|--------|-----------------|
| **OpenAI** | GPT-4o, GPT-4o mini, o1, o3 | API, ChatGPT | Strong reasoning, tool use, multimodal |
| **Anthropic** | Claude 3.5/4 Sonnet, Opus | API, Claude.ai | Safety-focused, long context, computer use |
| **Google** | Gemini 2.0/2.5 Pro, Flash | API, AI Studio | Native multimodal, long context window |
| **Meta** | Llama 3.1/3.3, Llama 4 | Open weights | Strong open-source ecosystem |
| **Mistral AI** | Mistral Large, Mixtral | API + open weights | Efficient MoE architecture |
| **Alibaba** | Qwen 2.5, QwQ | API + open weights | Strong multilingual and code abilities |
| **DeepSeek** | DeepSeek V3, R1 | API + open weights | Competitive reasoning, open weights |

## Essential Concepts to Learn Next

Understanding LLMs goes beyond just running them. These topics will deepen your expertise:

- **[Prompt Engineering](/docs/prompt-engineering)** — Crafting effective instructions
- **[Tokenization & Embeddings](/docs/tokenization-embeddings)** — How text becomes vectors
- **[Transformer Architecture](/docs/transformer-architecture)** — Deep dive into attention mechanisms
- **[Fine-tuning & LoRA](/docs/fine-tuning-lora)** — Adapting models to your domain
- **[RAG Systems](/docs/rag-retrieval-augmented-generation)** — Grounding LLMs in your data
- **[Inference Optimization](/docs/inference-optimization-quantization)** — Running models efficiently

## Quick Reference: Key Terms

| Term | Definition |
|------|-----------|
| **Token** | A subword unit; roughly 0.75 words in English |
| **Context Window** | Maximum input + output tokens the model can process |
| **Temperature** | Controls randomness (0 = deterministic, 1 = creative) |
| **Top-p** | Nucleus sampling; filters low-probability tokens |
| **Hallucination** | Confident but incorrect or fabricated output |
| **Fine-tuning** | Further training on domain-specific data |
| **RLHF** | Reinforcement Learning from Human Feedback |
| **RAG** | Retrieval-Augmented Generation — grounding with external data |
