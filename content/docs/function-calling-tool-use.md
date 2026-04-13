---
title: "Function Calling and Tool Use"
description: "Connecting LLMs to external tools, APIs, and code execution — function calling schemas, agent frameworks, and production patterns"
date: "2026-04-07"
category: "Best Practices"
tags: ["function-calling", "tool-use", "agents", "api-integration", "code-execution", "automation"]
author: "LLM Hub Team"
---

# Function Calling and Tool Use

LLMs are powerful at reasoning and generating text, but they cannot natively access real-time data, execute code, or interact with external systems. Function calling bridges this gap by letting models request external tool execution as part of their reasoning process.

## The Function Calling Pattern

```
User Query → LLM → "I need to call get_weather(city)"
                        │
                        ▼
                   Execute function
                        │
                        ▼
              Result: "22°C, partly cloudy"
                        │
                        ▼
                   LLM → Final Response
```

## OpenAI Function Calling

```python
from openai import OpenAI
import json

client = OpenAI()

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "City name"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "Temperature unit"
                    }
                },
                "required": ["city"]
            }
        }
    }
]

# Step 1: Ask the model if it wants to call a tool
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's the weather in Tokyo?"}],
    tools=tools,
)

# Step 2: Check if model requested a function
message = response.choices[0].message
if message.tool_calls:
    for tool_call in message.tool_calls:
        if tool_call.function.name == "get_weather":
            args = json.loads(tool_call.function.arguments)
            result = get_weather(args["city"], args.get("unit", "celsius"))
            
            # Step 3: Send result back to model
            final = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "user", "content": "What's the weather in Tokyo?"},
                    message,  # Model's function call
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(result)
                    }
                ]
            )
            print(final.choices[0].message.content)
```

## Anthropic Tool Use

```python
from anthropic import Anthropic

client = Anthropic()

tools = [
    {
        "name": "get_weather",
        "description": "Get current weather for a location",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {"type": "string"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
            },
            "required": ["city"]
        }
    }
]

response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "What's the weather in Tokyo?"}]
)

# Claude returns structured tool_use content blocks
for block in response.content:
    if block.type == "tool_use":
        print(f"Tool: {block.name}, Input: {block.input}")
```

## Common Tool Categories

### 1. Data Retrieval

```python
def query_database(sql: str) -> dict:
    """Execute a read-only SQL query against the analytics database."""
    # Connection and execution logic
    return {"columns": [...], "rows": [...], "count": N}
```

### 2. Code Execution

```python
import subprocess

def execute_python(code: str) -> dict:
    """Execute Python code and return output."""
    try:
        result = subprocess.run(
            ["python", "-c", code],
            capture_output=True, text=True, timeout=30
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {"error": "Execution timed out (30s limit)"}
```

### 3. Web Search

```python
def web_search(query: str, num_results: int = 5) -> list[dict]:
    """Search the web and return top results."""
    # Using a search API (e.g., Tavily, Serper, Bing)
    return [
        {"title": result.title, "url": result.url, "snippet": result.snippet}
        for result in search_results[:num_results]
    ]
```

### 4. File Operations

```python
def read_file(path: str) -> str:
    """Read file contents from the workspace."""
    with open(path, 'r') as f:
        return f.read()

def write_file(path: str, content: str) -> dict:
    """Write content to a file."""
    with open(path, 'w') as f:
        f.write(content)
    return {"status": "success", "path": path, "bytes": len(content)}
```

## Multi-Tool Agents

For complex tasks, models can chain multiple tool calls:

```python
def multi_tool_agent(query: str, max_turns: int = 10) -> str:
    messages = [{"role": "user", "content": query}]
    
    for _ in range(max_turns):
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=all_available_tools,
        )
        
        message = response.choices[0].message
        
        if not message.tool_calls:
            return message.content  # Final answer
        
        messages.append(message)
        
        for tool_call in message.tool_calls:
            result = execute_tool(tool_call)
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(result)
            })
    
    return "Max turns reached without final answer"
```

## ReAct Pattern (Reasoning + Acting)

The model alternates between thinking and acting:

```
Thought: I need to find the user's order history first.
Action: query_database("SELECT * FROM orders WHERE user_id = 123")
Observation: Found 3 orders, most recent from 2026-04-01
Thought: The most recent order is from April 1st. Let me check its status.
Action: query_database("SELECT status FROM orders WHERE id = 456")
Observation: Status is "shipped"
Thought: Now I have all the information. I can answer the user.
Final Answer: Your most recent order (April 1st) has been shipped...
```

## Structured Output with Pydantic

```python
from pydantic import BaseModel, Field
import instructor  # Patch OpenAI client for structured output

client = instructor.patch(OpenAI())

class WeatherResponse(BaseModel):
    temperature: float = Field(description="Temperature in Celsius")
    conditions: str = Field(description="Weather conditions description")
    humidity: int = Field(description="Humidity percentage")
    recommendation: str = Field(description="What to wear/bring")

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Weather in Tokyo and what to wear"}],
    response_model=WeatherResponse,
)

print(response.temperature)     # 22.0
print(response.conditions)      # "Partly cloudy"
print(response.recommendation)  # "Light jacket recommended"
```

## Safety Considerations

| Risk | Mitigation |
|------|-----------|
| **Arbitrary code execution** | Sandbox environments (Docker, e2b, Modal) |
| **API abuse** | Rate limiting, quotas, input validation |
| **Data leakage** | Tool-level permissions, audit logging |
| **Infinite tool loops** | Max turns limit, cycle detection |
| **Injection attacks** | Sanitize tool outputs, don't trust LLM blindly |

## Key Takeaways

- Function calling lets LLMs interact with external systems in a structured way
- The model decides WHEN to call tools; your code handles the actual execution
- Multi-tool agents can solve complex, multi-step problems autonomously
- Always sandbox code execution and validate inputs/outputs
- Structured output (JSON schema, Pydantic) makes tool responses reliable

## Related Documentation

- **[Prompt Engineering](/docs/prompt-engineering)** — Designing effective prompts for tool use
- **[Agent Frameworks](/agents)** — Building autonomous agents with tool use
- **[Structured Outputs](/docs/structured-output-json-schema)** — Enforcing response schemas
