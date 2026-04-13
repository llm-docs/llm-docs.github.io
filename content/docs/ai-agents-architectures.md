---
title: "AI Agent Architectures"
description: "Designing and building agent systems — ReAct, Plan-and-Execute, tool-augmented agents, multi-agent systems, memory architectures, and production patterns"
date: "2026-04-20"
category: "Architecture & Training"
tags: ["agents", "react", "multi-agent", "tool-use", "planning", "architecture"]
author: "LLM Hub Team"
---

# AI Agent Architectures

AI agents extend LLMs beyond single-turn generation into systems that can reason, plan, use tools, and execute multi-step tasks autonomously. This guide covers the major agent architectures, when to use each, and production-ready patterns for building reliable agent systems.

## What Makes an Agent?

An agent is an LLM system with these core capabilities:

| Capability | Description | Simple vs Agent |
|-----------|-------------|-----------------|
| **Perception** | Understands user intent and context | Both |
| **Reasoning** | Thinks through problems step by step | Both |
| **Planning** | Breaks goals into sub-tasks | Agent only |
| **Tool Use** | Calls external APIs, runs code, searches | Agent only |
| **Memory** | Retains information across interactions | Agent only |
| **Self-Correction** | Evaluates and revises its own outputs | Agent only |

## ReAct Architecture

ReAct (Reasoning + Acting) interleaves thought traces with action execution, enabling the agent to reason about what to do next based on tool outputs.

```
User: "What's the weather in Tokyo and should I pack an umbrella?"

Thought: I need to check the weather in Tokyo first.
Action: weather_api
Action Input: {"city": "Tokyo"}
Observation: {"temperature": 22, "condition": "rainy", "precipitation": "80%"}
Thought: It's rainy with 80% precipitation. I should recommend an umbrella.
Final Answer: It's 22°C and rainy in Tokyo with 80% chance of precipitation. Yes, definitely pack an umbrella!
```

### ReAct Implementation

```python
from typing import Optional
from pydantic import BaseModel

class AgentStep(BaseModel):
    thought: str
    action: Optional[str] = None
    action_input: Optional[dict] = None
    observation: Optional[str] = None
    final_answer: Optional[str] = None

class ReActAgent:
    def __init__(self, llm, tools: dict[str, callable], max_steps: int = 10):
        self.llm = llm
        self.tools = tools
        self.max_steps = max_steps
        self.history: list[AgentStep] = []

    SYSTEM_PROMPT = """You are a helpful assistant that solves problems step by step.
Use the following format:

Thought: Think about what to do next
Action: tool_name (one of: {tools})
Action Input: JSON input for the tool
Observation: result from the tool
... (repeat Thought/Action/Action Input/Observation as needed)
Thought: I now have enough information
Final Answer: the complete answer

Available tools:
{tool_descriptions}"""

    async def run(self, user_input: str) -> str:
        """Execute the ReAct loop."""
        self.history = []

        for step_num in range(self.max_steps):
            # Generate next step
            step = await self._generate_step(user_input)
            self.history.append(step)

            if step.final_answer:
                return step.final_answer

            if step.action:
                # Execute the tool
                tool_fn = self.tools[step.action]
                observation = await tool_fn(step.action_input)
                step.observation = str(observation)
            else:
                # No action and no final answer — force a conclusion
                step.final_answer = "I was unable to find a complete answer."
                return step.final_answer

        return f"I reached the maximum number of steps ({self.max_steps}) without completing the task."

    async def _generate_step(self, user_input: str) -> AgentStep:
        """Parse the LLM output into a structured step."""
        prompt = self._build_prompt(user_input)
        response = await self.llm.generate(prompt)

        # Parse the response into structured fields
        import re
        thought = re.search(r"Thought:\s*(.*?)(?:\n|$)", response)
        action = re.search(r"Action:\s*(.*?)(?:\n|$)", response)
        action_input = re.search(r"Action Input:\s*(.*?)(?:\n|$)", response)
        final_answer = re.search(r"Final Answer:\s*(.*)", response, re.DOTALL)

        return AgentStep(
            thought=thought.group(1) if thought else "",
            action=action.group(1).strip() if action else None,
            action_input=_safe_json_loads(action_input.group(1)) if action_input else None,
            final_answer=final_answer.group(1).strip() if final_answer else None,
        )

    def _build_prompt(self, user_input: str) -> str:
        """Build the full prompt with history."""
        tool_names = ", ".join(self.tools.keys())
        tool_descs = "\n".join(f"- {name}: {tool.__doc__}" for name, tool in self.tools.items())

        prompt = self.SYSTEM_PROMPT.format(
            tools=tool_names,
            tool_descriptions=tool_descs,
        )

        # Add history
        for step in self.history:
            prompt += f"\nThought: {step.thought}"
            if step.action:
                prompt += f"\nAction: {step.action}"
                prompt += f"\nAction Input: {step.action_input}"
            if step.observation:
                prompt += f"\nObservation: {step.observation}"
            if step.final_answer:
                prompt += f"\nFinal Answer: {step.final_answer}"

        prompt += f"\n\nUser: {user_input}\n"
        return prompt
```

## Plan-and-Execute Architecture

Unlike ReAct which decides one step at a time, Plan-and-Execute first creates a full plan, then executes each step. This is better for complex tasks where the overall structure is predictable.

```
User: "Create a report comparing the top 5 cloud providers for ML workloads"

=== PLAN PHASE ===
Plan:
1. Search for ML benchmark results on AWS, GCP, Azure, Oracle Cloud, and Lambda Labs
2. Compare pricing for common GPU instances (A100, H100)
3. Compare managed ML service features (SageMaker, Vertex AI, Azure ML)
4. Evaluate ecosystem (datasets, pre-trained models, community)
5. Synthesize findings into a comparison report

=== EXECUTION PHASE ===
Execute Step 1: [Search and retrieve benchmark data]
Execute Step 2: [Query pricing APIs for each provider]
Execute Step 3: [Gather feature comparison data]
Execute Step 4: [Research ecosystem factors]
Execute Step 5: [Generate final report]
```

### Implementation

```python
class PlanAndExecuteAgent:
    def __init__(self, planner_llm, executor_llm, tools: dict):
        self.planner = planner_llm
        self.executor = executor_llm
        self.tools = tools

    async def run(self, task: str, max_steps: int = 10) -> str:
        # Phase 1: Create plan
        plan = await self._create_plan(task, max_steps)

        # Phase 2: Execute plan with adaptive re-planning
        results = []
        for i, step in enumerate(plan.steps):
            result = await self._execute_step(step, task, results)
            results.append(result)

            # Optional: re-plan if the current step reveals the plan is wrong
            if i < len(plan.steps) - 1:
                replan = await self._check_replan(task, plan, results)
                if replan.needs_replan:
                    plan = await self._create_plan(task, max_steps, context=results)

        # Phase 3: Synthesize
        return await self._synthesize(task, results)

    async def _create_plan(self, task: str, max_steps: int, context: list = None) -> dict:
        context_str = f"\nPrevious work: {context}" if context else ""
        prompt = f"""Create a step-by-step plan to accomplish this task.

Task: {task}
{context_str}

Return a JSON list of steps, each with:
- "step_number": integer
- "description": what to do
- "tool": which tool to use (or "final_synthesis")
- "depends_on": list of step numbers this depends on

Maximum {max_steps} steps."""
        response = await self.planner.generate(prompt)
        return _safe_json_loads(response)

    async def _execute_step(self, step: dict, task: str, previous_results: list) -> str:
        tool = self.tools.get(step["tool"])
        if tool:
            return await tool({"task": task, "step": step, "context": previous_results})
        return await self.executor.generate(
            f"Execute this step: {step['description']}\nContext: {previous_results}"
        )

    async def _check_replan(self, task: str, plan: dict, results: list) -> dict:
        prompt = f"""Given the original task and results so far, does the remaining plan need to change?

Task: {task}
Completed steps results: {results}
Remaining plan steps: {plan.steps[len(results):]}

Return JSON: {{"needs_replan": true/false, "reason": "..."}}"""
        response = await self.planner.generate(prompt)
        return _safe_json_loads(response)
```

## Tool-Augmented Agents

### Tool Design Patterns

```python
from abc import ABC, abstractmethod
from pydantic import BaseModel, Field

class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: dict  # JSON Schema
    returns: str  # Description of return value


class BaseTool(ABC):
    @property
    @abstractmethod
    def definition(self) -> ToolDefinition:
        pass

    @abstractmethod
    async def execute(self, **kwargs) -> str:
        pass


class SearchTool(BaseTool):
    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="web_search",
            description="Search the web for current information on any topic",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                    "num_results": {"type": "integer", "description": "Number of results to return", "default": 5},
                },
                "required": ["query"],
            },
            returns="List of search results with title, URL, and snippet",
        )

    async def execute(self, query: str, num_results: int = 5) -> str:
        results = await search_engine.query(query, num_results=num_results)
        return "\n".join(f"[{r.title}]({r.url}): {r.snippet}" for r in results)


class CodeExecutionTool(BaseTool):
    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="execute_code",
            description="Execute Python code in a sandboxed environment",
            parameters={
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Python code to execute"},
                    "timeout": {"type": "integer", "description": "Timeout in seconds", "default": 30},
                },
                "required": ["code"],
            },
            returns="stdout, stderr, and return value",
        )

    async def execute(self, code: str, timeout: int = 30) -> str:
        result = await sandbox.execute(code, timeout=timeout)
        return f"stdout: {result.stdout}\nstderr: {result.stderr}\nreturn: {result.return_value}"
```

### Structured Tool Calling (Function Calling API)

```python
# Modern LLMs support structured tool calling
tools_schema = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name or coordinates",
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "Temperature unit",
                    },
                },
                "required": ["location"],
            },
        },
    }
]

response = await llm.chat(
    messages=[{"role": "user", "content": "What's the weather in Tokyo?"}],
    tools=tools_schema,
    tool_choice="auto",
)

# LLM returns structured tool call
if response.choices[0].message.tool_calls:
    tool_call = response.choices[0].message.tool_calls[0]
    args = json.loads(tool_call.function.arguments)
    result = await get_weather(**args)

    # Feed result back to continue the conversation
    final_response = await llm.chat(
        messages=[
            {"role": "user", "content": "What's the weather in Tokyo?"},
            response.choices[0].message,
            {
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": str(result),
            },
        ],
    )
```

## Multi-Agent Systems

### Supervisor Pattern

One agent coordinates the work of specialist agents:

```
                    ┌──────────────┐
                    │  Supervisor  │
                    │   (Router)   │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
    ┌──────────────┐ ┌────────────┐ ┌────────────┐
    │  Researcher  │ │   Coder    │ │   Writer   │
    └──────────────┘ └────────────┘ └────────────┘
```

```python
class SupervisorAgent:
    def __init__(self, llm, specialists: dict[str, callable]):
        self.llm = llm
        self.specialists = specialists

    async def run(self, task: str) -> str:
        # Step 1: Supervisor decides which specialist handles the task
        routing = await self._route(task)

        # Step 2: Delegate to specialist
        specialist = self.specialists[routing["agent"]]
        result = await specialist(task)

        # Step 3: Supervisor reviews and decides if more work is needed
        review = await self._review(task, result)

        if review["satisfactory"]:
            return result
        else:
            # Route to a different specialist for refinement
            refiner = self.specialists[review["next_agent"]]
            return await refiner(f"Improve this result: {result}\nOriginal task: {task}")

    async def _route(self, task: str) -> dict:
        agent_names = ", ".join(self.specialists.keys())
        prompt = f"""Which specialist should handle this task?

Task: {task}

Available agents: {agent_names}

Return JSON: {{"agent": "agent_name", "reason": "..."}}"""
        response = await self.llm.generate(prompt)
        return _safe_json_loads(response)
```

### Collaborative Debate Pattern

Multiple agents with different roles debate to reach a better answer:

```python
class DebateAgent:
    """An agent that takes a position and argues it."""

    def __init__(self, llm, role: str):
        self.llm = llm
        self.role = role

    async def argue(self, topic: str, position: str, opposing_argument: str = None) -> str:
        prompt = f"""You are a {self.role}. Argue this position.

Topic: {topic}
Your position: {position}
{f"Opposing argument to address: {opposing_argument}" if opposing_argument else ""}

Provide a well-reasoned argument (200-300 words)."""
        return await self.llm.generate(prompt)


class DebateModerator:
    def __init__(self, llm, debater_a: DebateAgent, debater_b: DebateAgent):
        self.llm = llm
        self.debater_a = debater_a
        self.debater_b = debater_b

    async def debate(self, topic: str, rounds: int = 3) -> str:
        """Run a multi-round debate and synthesize the conclusion."""
        position_a = f"Argue in favor of: {topic}"
        position_b = f"Argue against: {topic}"

        argument_a = await self.debater_a.argue(topic, position_a)
        argument_b = await self.debater_b.argue(topic, position_b)

        for _ in range(rounds - 1):
            # Each debater responds to the other's latest argument
            argument_a = await self.debater_a.argue(topic, position_a, opposing_argument=argument_b)
            argument_b = await self.debater_b.argue(topic, position_b, opposing_argument=argument_a)

        # Synthesize the best points from both sides
        return await self._synthesize(topic, argument_a, argument_b)
```

### Swarm Pattern (Independent Parallel Agents)

```python
import asyncio

async def swarm_solve(task: str, agents: list, n: int = 3) -> str:
    """Run N agents in parallel and aggregate their answers."""
    async def agent_work(agent, idx: int):
        return await agent.generate(f"{task}\n\nYou are agent #{idx}. Provide your independent solution.")

    # Run all agents in parallel
    tasks = [agent_work(agent, i) for i, agent in enumerate(agents[:n])]
    results = await asyncio.gather(*tasks)

    # Aggregate with a voting/synthesis agent
    synthesis_prompt = f"""These {n} agents independently solved the same task. Synthesize the best answer.

Task: {task}

Agent responses:
{chr(10).join(f"Agent {i}: {r}" for i, r in enumerate(results))}

Provide the final synthesized answer, taking the best parts from each response."""
    return await synthesis_agent.generate(synthesis_prompt)
```

## Memory Architectures

### Memory Layers

| Layer | Purpose | Storage | Timescale |
|-------|---------|---------|-----------|
| **Working Memory** | Current conversation context | Context window | Single session |
| **Short-Term Memory** | Recent interactions | In-memory buffer / Redis | Hours to days |
| **Long-Term Memory** | Persistent facts about user | Vector database | Weeks to months |
| **Procedural Memory** | Learned behaviors and preferences | Config files / fine-tune | Permanent |

### Implementation

```python
class AgentMemory:
    def __init__(self, vector_db, redis_client):
        self.vector_db = vector_db  # Long-term memory
        self.redis = redis_client    # Short-term memory
        self.context_window: list[dict] = []  # Working memory
        self.max_context_tokens = 8000

    def add_to_working_memory(self, message: dict):
        """Add a message to the current context window."""
        self.context_window.append(message)
        # Trim to stay within context limits
        self.context_window = trim_to_token_limit(self.context_window, self.max_context_tokens)

    async def store_short_term(self, key: str, value: str, ttl: int = 3600):
        """Store in short-term memory with expiration."""
        await self.redis.set(f"memory:st:{key}", value, ex=ttl)

    async def retrieve_short_term(self, key: str) -> str | None:
        value = await self.redis.get(f"memory:st:{key}")
        return value.decode() if value else None

    async def store_long_term(self, text: str, metadata: dict = None):
        """Store in long-term memory as a vector."""
        embedding = await embedding_fn(text)
        await self.vector_db.add({
            "embedding": embedding,
            "text": text,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow().isoformat(),
        })

    async def retrieve_long_term(self, query: str, top_k: int = 5) -> list[dict]:
        """Retrieve relevant long-term memories."""
        embedding = await embedding_fn(query)
        results = await self.vector_db.search(embedding, top_k=top_k)
        return [{"text": r["text"], "metadata": r["metadata"]} for r in results]

    async def summarize_and_compress(self):
        """Summarize old conversation and store key facts."""
        if len(self.context_window) > 20:
            old_messages = self.context_window[:-10]
            summary = await llm.generate(f"Summarize this conversation, extracting key facts: {old_messages}")

            # Store summary in long-term memory
            await self.store_long_term(summary.text, metadata={"type": "conversation_summary"})

            # Extract individual facts
            facts = await extract_facts(old_messages)
            for fact in facts:
                await self.store_long_term(fact, metadata={"type": "user_fact"})

            # Keep only recent messages in working memory
            self.context_window = self.context_window[-10:]
```

## Choosing the Right Architecture

| Scenario | Recommended Pattern | Why |
|----------|-------------------|-----|
| Simple Q&A with tool use | ReAct | Minimal overhead, good for 1-3 step tasks |
| Complex multi-step workflows | Plan-and-Execute | Predictable structure, easy to debug |
| Tasks requiring domain expertise | Supervisor + Specialists | Separation of concerns |
| Creative or exploratory tasks | Debate / Swarm | Multiple perspectives improve quality |
| Persistent personalized assistants | ReAct + Memory | Need context across sessions |
| High-throughput independent tasks | Swarm (parallel) | Maximize throughput |
| Safety-critical decisions | Supervisor + Verification | Extra validation layer |

## Production Considerations

### Guardrails for Agents

```python
class AgentGuardrails:
    def __init__(self):
        self.allowed_tools = set()
        self.max_steps = 10
        self.cost_limit_usd = 0.50
        self.blocked_actions = ["delete_all_data", "drop_database"]

    def validate_action(self, action: str, tool: str) -> bool:
        if tool not in self.allowed_tools:
            return False
        if action in self.blocked_actions:
            return False
        return True

    def check_budget(self, current_cost: float) -> bool:
        return current_cost < self.cost_limit_usd
```

### Observability

Track these metrics for agent systems (see [LLM Observability & Monitoring](/docs/llm-observability-monitoring)):

| Metric | Why It Matters | Alert Threshold |
|--------|---------------|-----------------|
| Steps per task | Complex tasks cost more | >15 steps |
| Tool call failure rate | Tools are fragile | >10% |
| Re-plan frequency | Plan quality indicator | >30% |
| Cost per task | Budget control | >$0.50 |
| Hallucination rate | Quality indicator | >5% |
| Task completion rate | Overall effectiveness | &lt;80% |

## Cross-References

- For tool use fundamentals, see [Function Calling & Tool Use](/docs/function-calling-tool-use)
- For prompt engineering techniques used in agents, see [Prompt Engineering](/docs/prompt-engineering)
- For building persistent memory, see [LLM Memory Systems](/docs/llm-memory-systems)
- For monitoring agent behavior in production, see [LLM Observability & Monitoring](/docs/llm-observability-monitoring)
