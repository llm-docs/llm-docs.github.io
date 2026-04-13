---
title: "Prompt Chaining and Workflow Patterns"
description: "Building complex LLM applications with multi-step workflows — chaining, routing, aggregation, human-in-the-loop, and production workflow design"
date: "2026-04-16"
category: "Best Practices"
tags: ["chaining", "workflows", "pipelines", "orchestration", "patterns", "automation"]
author: "IntuiVortex Team"
---

# Prompt Chaining and Workflow Patterns

Single prompt → single response is rarely sufficient for complex applications. Production LLM systems chain multiple model calls, combine them with code execution, and route based on intermediate results.

## Core Patterns

### 1. Sequential Chaining

Output of one step becomes input of the next:

```python
def analyze_document(doc_text: str) -> dict:
    """Multi-step document analysis."""
    
    # Step 1: Extract key sections
    sections = llm_generate(f"Extract the main sections of this document:\n\n{doc_text}")
    
    # Step 2: Summarize each section
    summaries = []
    for section in sections.split("\n"):
        summary = llm_generate(f"Summarize in 2 sentences: {section}")
        summaries.append(summary)
    
    # Step 3: Identify action items
    actions = llm_generate(
        f"Extract all action items and deadlines from this document:\n\n{doc_text}"
    )
    
    # Step 4: Combine results
    return {
        "sections": sections,
        "summaries": summaries,
        "action_items": actions,
        "full_summary": "\n".join(summaries),
    }
```

**When to use**: Each step builds on the previous; steps are logically sequential.

### 2. Parallel Execution

Run independent prompts simultaneously:

```python
import asyncio

async def comprehensive_analysis(doc_text: str) -> dict:
    """Run multiple analyses in parallel."""
    
    # All three analyses run concurrently
    summary, entities, sentiment = await asyncio.gather(
        llm_async_generate(f"Summarize this document:\n{doc_text}"),
        llm_async_generate(f"Extract all named entities:\n{doc_text}"),
        llm_async_generate(f"Analyze the sentiment of each paragraph:\n{doc_text}"),
    )
    
    return {
        "summary": summary,
        "entities": entities,
        "sentiment": sentiment,
    }
```

**When to use**: Steps are independent and can run concurrently. Reduces latency by the factor of parallelism.

### 3. Conditional Routing

Route based on the output of a classifier step:

```python
def handle_support_ticket(ticket_text: str) -> str:
    """Route support tickets to the right handler."""
    
    # Step 1: Classify the ticket
    category = llm_generate(f"""
    Classify this support ticket into one of: billing, technical, account, feature_request.
    Return ONLY the category name.
    
    Ticket: {ticket_text}
    Category:""").strip().lower()
    
    # Step 2: Route based on category
    handlers = {
        "billing": handle_billing,
        "technical": handle_technical,
        "account": handle_account,
        "feature_request": handle_feature_request,
    }
    
    handler = handlers.get(category, handle_general)
    return handler(ticket_text)
```

### 4. Voting / Ensemble

Multiple models or prompts vote on the best answer:

```python
def ensemble_answer(question: str, n_votes: int = 5) -> str:
    """Get multiple answers and take majority vote."""
    answers = []
    for _ in range(n_votes):
        answer = llm_generate(question, temperature=0.8)
        answers.append(extract_final_answer(answer))
    
    # Majority vote
    from collections import Counter
    vote_counts = Counter(answers)
    return vote_counts.most_common(1)[0][0]
```

### 5. Self-Correction Loop

Model reviews and corrects its own output:

```python
def self_correcting_generation(prompt: str, max_iterations: int = 3) -> str:
    """Generate, review, correct."""
    
    # Initial generation
    output = llm_generate(prompt)
    
    for _ in range(max_iterations):
        # Self-review
        review = llm_generate(f"""
        Review the following output for errors, inconsistencies, or improvements:
        
        Output: {output}
        
        List specific issues found, or say 'No issues found' if it's good.""")
        
        if "no issues found" in review.lower():
            break
        
        # Correct based on review
        output = llm_generate(f"""
        Improve the following output based on these issues:
        
        Issues: {review}
        
        Original output: {output}
        
        Provide the improved version.""")
    
    return output
```

## Production Workflow Frameworks

### LangGraph (State Machine Approach)

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class WorkflowState(TypedDict):
    query: str
    retrieved_docs: list[str]
    draft: str
    reviewed: str
    final: str

# Define nodes (steps)
def retrieve(state: WorkflowState) -> WorkflowState:
    docs = search_vector_db(state["query"])
    state["retrieved_docs"] = docs
    return state

def draft_response(state: WorkflowState) -> WorkflowState:
    draft = llm_generate(f"Answer based on context:\n{state['retrieved_docs']}\n\n{state['query']}")
    state["draft"] = draft
    return state

def review(state: WorkflowState) -> WorkflowState:
    review = llm_generate(f"Review for accuracy:\n{state['draft']}")
    state["reviewed"] = review
    return state

def finalize(state: WorkflowState) -> WorkflowState:
    final = llm_generate(f"Finalize based on review:\n{state['reviewed']}")
    state["final"] = final
    return state

# Build graph
workflow = StateGraph(WorkflowState)
workflow.add_node("retrieve", retrieve)
workflow.add_node("draft", draft_response)
workflow.add_node("review", review)
workflow.add_node("finalize", finalize)

workflow.add_edge("retrieve", "draft")
workflow.add_edge("draft", "review")
workflow.add_edge("review", "finalize")
workflow.add_edge("finalize", END)

workflow.set_entry_point("retrieve")

# Compile and run
app = workflow.compile()
result = app.invoke({"query": "What is our refund policy?"})
```

### DSPy (Declarative Pipeline Optimization)

```python
import dspy

# Declare modules
retrieve = dspy.Retrieve(k=5)
generate_answer = dspy.ChainOfThought("context, question -> answer")
verify_answer = dspy.ChainOfThought("context, question, answer -> is_correct")

# Compose pipeline
class RAGPipeline(dspy.Module):
    def __init__(self):
        super().__init__()
        self.retrieve = retrieve
        self.generate = generate_answer
        self.verify = verify_answer
    
    def forward(self, question):
        context = self.retrieve(question).passages
        answer = self.generate(context=context, question=question)
        verification = self.verify(context=context, question=question, answer=answer)
        
        if not verification.is_correct:
            # Try again with different context
            context = self.retrieve(question, k=10).passages
            answer = self.generate(context=context, question=question)
        
        return answer

# Compile with training data
pipeline = RAGPipeline()
pipeline.compile(trainset=training_examples)
```

## Error Handling in Workflows

```python
class WorkflowError(Exception):
    """Custom error for workflow failures."""
    pass

def robust_workflow(prompt: str, max_retries: int = 2) -> dict:
    """Workflow with retry and fallback."""
    
    for attempt in range(max_retries + 1):
        try:
            # Step 1: Classify
            category = classify_request(prompt)
            
            # Step 2: Generate (may fail)
            response = generate_response(prompt, category)
            
            # Step 3: Validate
            if not validate_response(response):
                raise WorkflowError("Response validation failed")
            
            return {"status": "success", "response": response}
        
        except WorkflowError as e:
            if attempt == max_retries:
                # Fallback: use a simpler approach
                return {
                    "status": "fallback",
                    "response": generate_simple_response(prompt),
                    "error": str(e),
                }
            # Retry
            continue
```

## Key Takeaways

- Chain multiple LLM calls for complex tasks; single prompts rarely suffice
- Parallel execution reduces latency for independent steps
- Conditional routing enables intelligent workflow branching
- Self-correction loops improve output quality at the cost of additional calls
- LangGraph and DSPy are the leading workflow frameworks for LLM applications
- Always implement retries and fallbacks for production reliability

## Related Documentation

- **[Function Calling](/docs/function-calling-tool-use)** — Combining tool calls with workflows
- **[Prompt Engineering](/docs/prompt-engineering)** — Designing effective individual prompts
- **[Observability](/docs/llm-observability-monitoring)** — Monitoring multi-step workflows
