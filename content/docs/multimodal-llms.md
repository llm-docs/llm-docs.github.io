---
title: "Multi-Modal LLMs"
description: "Models that process text, images, audio, and video — architecture patterns, training approaches, and capabilities of vision-language and multi-modal systems"
date: "2026-04-10"
category: "Architecture & Training"
tags: ["multimodal", "vision", "image", "audio", "video", "vlm"]
author: "LLM Hub Team"
---

# Multi-Modal LLMs

Multi-modal LLMs extend language models to process and reason across multiple data types — images, audio, video, and structured data — in addition to text. These models power visual question answering, image captioning, document understanding, and more.

## Architecture Patterns

### 1. Vision-Language Models (VLMs)

The most common multi-modal architecture:

```
Image → [Vision Encoder] → Image embeddings ─┐
                                              ├→ [Projector] → Token embeddings → [LLM] → Text
Text  → [Tokenizer] → Text tokens ──────────┘
```

**Key insight**: The LLM remains the core "reasoning engine." Visual information is converted to the same embedding space as text tokens, allowing the LLM to process both seamlessly.

### 2. Vision Encoders

| Encoder | Type | Parameters | Used By |
|---------|------|-----------|---------|
| CLIP ViT-L/14 | Vision Transformer | 307M | LLaVA, many VLMs |
| SigLIP | Vision Transformer | Various | Google VLMs |
| DINOv2 | Vision Transformer | 1.1B | Meta VLMs |
| NaViT | Flexible ViT | Various | Efficient processing |

### 3. The Projector

The projector maps visual features to the LLM's embedding space:

```python
class SimpleProjector(nn.Module):
    """Linear projector: vision features → LLM embedding space."""
    def __init__(self, vision_dim=1024, llm_dim=4096):
        super().__init__()
        self.linear = nn.Linear(vision_dim, llm_dim)
    
    def forward(self, vision_features):
        return self.linear(vision_features)

class MLPProjector(nn.Module):
    """2-layer MLP projector (more expressive)."""
    def __init__(self, vision_dim=1024, llm_dim=4096):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(vision_dim, llm_dim),
            nn.GELU(),
            nn.Linear(llm_dim, llm_dim),
        )
    
    def forward(self, vision_features):
        return self.net(vision_features)
```

## Major Multi-Modal Models

### LLaVA (Large Language-and-Vision Assistant)

The pioneering open-source VLM:

```
Training pipeline:
1. Pre-train projector on image-caption pairs (align vision ↔ text)
2. Fine-tune entire model on instruction-following data with images
```

**Capabilities**: Visual question answering, detailed image description, chart/graph understanding.

### GPT-4V / GPT-4o

OpenAI's proprietary multi-modal models:

- **GPT-4V**: Text + image understanding
- **GPT-4o**: Text + image + audio (native multi-modal, not stitched)

### Gemini

Google's native multi-modal model:

- Processes text, images, audio, and video natively
- 1M+ token context window includes visual tokens
- Strong at video understanding and temporal reasoning

### Claude 3/4 with Computer Use

- Visual understanding with very high resolution
- Can interact with screen elements (click, type, scroll)
- Suitable for UI automation and document processing

## Training Multi-Modal Models

### Stage 1: Feature Alignment

```python
# Train ONLY the projector to align vision and text spaces
for image, caption in image_caption_dataset:
    # Get image features from frozen vision encoder
    image_features = vision_encoder(image)  # frozen
    
    # Project to LLM embedding space
    projected = projector(image_features)
    
    # Train projector to predict caption text embeddings
    text_embeddings = text_encoder(caption)  # frozen
    loss = mse_loss(projected, text_embeddings.detach())
    
    loss.backward()  # Only updates projector
```

### Stage 2: Visual Instruction Tuning

```python
# Fine-tune the full model (LLM + projector) on VQA data
for image, question, answer in vqa_dataset:
    # Encode image to visual tokens
    visual_tokens = projector(vision_encoder(image))
    
    # Build prompt with visual tokens
    prompt = f"<image>\nUser: {question}\nAssistant:"
    text_tokens = tokenizer(prompt)
    
    # Combine visual + text tokens
    combined = torch.cat([visual_tokens, text_tokens], dim=1)
    
    # Standard language modeling loss
    loss = model(combined, labels=answer)
    loss.backward()
```

## Multi-Modal Capabilities

### Visual Question Answering

```
User: [image of a kitchen] "What appliances can you see?"
Model: "I can see the following appliances:
- Refrigerator (stainless steel, top-left)
- Microwave (built-in, above the stove)
- Dishwasher (under counter, right side)
- Oven/stove combo (center)"
```

### Document Understanding

```
User: [image of an invoice] "What's the total amount and due date?"
Model: "Based on the invoice:
- Total amount: $2,847.50
- Due date: May 15, 2026
- Vendor: Acme Corporation"
```

### Chart and Graph Analysis

```
User: [bar chart of quarterly revenue] "Which quarter had the highest growth?"
Model: "Q3 2025 showed the highest growth at approximately 23% quarter-over-quarter..."
```

### Code Generation from UI Screenshots

```
User: [screenshot of a login page] "Create the HTML/CSS for this"
Model: "<form class='login-form'>
  <div class='input-group'>
    <label for='email'>Email</label>
    <input type='email' id='email' placeholder='you@example.com' />
  </div>
  ..."
```

## Technical Challenges

### Token Budget

Visual content consumes many tokens:

| Content Type | Approximate Token Equivalent |
|-------------|---------------------------|
| Single image (standard res) | 500-2000 tokens |
| High-resolution image | 2000-5000 tokens |
| 1 minute of video (1fps) | 6000-18000 tokens |
| 1 minute of audio | 3000-8000 tokens |

A 128K context window can hold roughly 25-60 standard images.

### Resolution Handling

```python
# Dynamic resolution processing
def process_image(image, max_tokens=1000):
    """Resize image to fit within token budget."""
    # Each patch → N tokens
    # Target: total tokens ≤ max_tokens
    target_patches = max_tokens // tokens_per_patch
    
    # Calculate optimal grid
    height, width = image.shape[:2]
    scale = (target_patches * patch_size ** 2 / (height * width)) ** 0.5
    new_height, new_width = int(height * scale), int(width * scale)
    
    return resize(image, (new_height, new_width))
```

### Cross-Modal Reasoning

The hardest challenge is genuine reasoning across modalities, not just parallel processing:

```
❌ Parallel: "The image shows X. The text says Y."
✅ Cross-modal: "The graph in the image contradicts the claim in the text because..."
```

## Key Takeaways

- Multi-modal models extend LLMs by converting non-text data to the token embedding space
- The projector is the critical bridge between modality encoders and the LLM
- Training is typically two-stage: alignment then instruction tuning
- Visual content consumes significant token budget
- True cross-modal reasoning remains an active research area

## Related Documentation

- **[Transformer Architecture](/docs/transformer-architecture)** — Core model architecture
- **[Context Window](/docs/context-window-management)** — Managing token budgets
- **[Function Calling](/docs/function-calling-tool-use)** — Combining multi-modal input with tool use
