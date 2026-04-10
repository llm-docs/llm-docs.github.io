---
title: "LLM Testing & Debugging"
description: "Systematic approaches to testing and debugging LLM applications — unit testing prompts, integration testing chains, regression testing model updates, and production debugging"
date: "2026-04-19"
category: "Advanced Technical"
tags: ["testing", "debugging", "quality-assurance", "regression", "evaluations", "production"]
author: "LLM Hub Team"
---

# LLM Testing & Debugging

Testing LLM applications requires a fundamentally different approach than traditional software testing. Outputs are non-deterministic, quality is subjective, and bugs often manifest as subtle quality regressions rather than crashes. This guide provides systematic methodologies for testing and debugging LLM applications across the entire development lifecycle.

## The Testing Challenge

Traditional software testing assumes:
- Deterministic outputs given the same inputs
- Binary pass/fail criteria
- Clear specifications

LLM applications violate all three assumptions. Outputs vary between runs, quality exists on a spectrum, and "correct" behavior is often ambiguous. This requires a testing pyramid adapted for LLM systems:

```
        ┌─────────────┐
        │  E2E Tests  │  Full pipeline, golden datasets
        ├─────────────┤
        │ Integration │  Multi-step chains, tool use
        ├─────────────┤
        │  Unit Tests │  Individual prompts, parsers
        ├─────────────┤
        │ Eval Suites │  Quality benchmarks, regression
        └─────────────┘
```

## Unit Testing Prompts

### Testing Prompt Structure

```python
import pytest

def test_system_prompt_includes_role():
    """Verify the system prompt establishes the correct role."""
    from myapp.prompts import SYSTEM_PROMPT

    assert "You are a helpful coding assistant" in SYSTEM_PROMPT
    assert "Do not provide medical advice" in SYSTEM_PROMPT
    assert "Respond in JSON format" in SYSTEM_PROMPT


def test_prompt_template_renders_correctly():
    """Test that the prompt template fills in variables properly."""
    from myapp.prompts import render_answer_prompt

    prompt = render_answer_prompt(
        context="Python is a programming language.",
        question="What is Python?",
    )

    assert "Python is a programming language." in prompt
    assert "What is Python?" in prompt
    assert "{{context}}" not in prompt  # No unfilled template variables
    assert "{{question}}" not in prompt
```

### Testing Output Parsers

```python
def test_json_response_parser():
    """Test the parser handles valid JSON responses."""
    from myapp.parsers import parse_json_response

    # Valid JSON
    result = parse_json_response('{"answer": "yes", "confidence": 0.95}')
    assert result["answer"] == "yes"
    assert result["confidence"] == pytest.approx(0.95)

    # JSON with markdown code block
    result = parse_json_response('```json\n{"answer": "yes"}\n```')
    assert result["answer"] == "yes"

    # JSON with surrounding text
    result = parse_json_response('Here is the answer:\n{"answer": "yes"}\nHope this helps!')
    assert result["answer"] == "yes"


def test_json_parser_handles_errors():
    """Test the parser handles malformed responses gracefully."""
    from myapp.parsers import parse_json_response, ParseError

    with pytest.raises(ParseError, match="Could not extract JSON"):
        parse_json_response("This is not JSON at all")

    with pytest.raises(ParseError, match="Missing required field"):
        parse_json_response('{"answer": "yes"}')  # missing "confidence"
```

### Testing with Mocked LLM Responses

```python
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_answer_chain_with_mock_llm():
    """Test the full answer chain without calling the actual LLM."""
    mock_response = '{"answer": "Paris is the capital of France", "sources": ["encyclopedia"]}'

    with patch("myapp.llm_client.generate", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = mock_response

        result = await answer_question("What is the capital of France?")

        assert result["answer"] == "Paris is the capital of France"
        assert "encyclopedia" in result["sources"]
        mock_llm.assert_called_once()
```

## Integration Testing Chains

### Testing Multi-Step Workflows

```python
import pytest

class TestRAGChain:
    """Integration tests for the full RAG pipeline."""

    @pytest.fixture
    def rag_chain(self):
        return RAGChain(
            retriever=TestRetriever(),
            llm=MockLLM(),
            prompt_template=DEFAULT_PROMPT,
        )

    async def test_retrieval_then_generation(self, rag_chain):
        """Test the full chain with known inputs."""
        result = await rag_chain.query("How do I reset my password?")

        # Verify retrieval happened
        assert len(result.sources) > 0
        assert any("password reset" in s.title for s in result.sources)

        # Verify generation quality
        assert "password" in result.answer.lower()
        assert len(result.answer) > 50  # Not a trivial response

    async def test_handles_no_results(self, rag_chain):
        """Test behavior when retrieval returns nothing."""
        result = await rag_chain.query("XYZNONEXISTENTQUERY123")

        assert result.answer == "I could not find information about that topic."
        assert result.sources == []
        assert result.fallback_used is True

    async def test_hallucination_detection(self, rag_chain):
        """Test that the chain flags unsupported answers."""
        result = await rag_chain.query("What is the meaning of life?")

        # This query should trigger the hallucination detector
        assert result.confidence < 0.5 or result.hallucination_warning is True
```

### Testing Tool-Using Agents

```python
class TestAgentTools:
    """Test agent tool calling with controlled inputs."""

    @pytest.fixture
    def agent(self):
        return Agent(
            llm=MockLLM(responses=[
                '{"action": "search", "query": "weather in London"}',
                '{"action": "final_answer", "answer": "It is 15°C in London"}',
            ]),
            tools=[WeatherTool(), SearchTool()],
        )

    async def test_tool_selection(self, agent):
        """Test that the agent selects the correct tool."""
        result = await agent.run("What is the weather in London?")

        # Verify the agent called the search tool first
        first_action = agent.history[0]
        assert first_action["action"] == "search"

        # Verify the final answer uses tool results
        assert "15°C" in result.answer
        assert len(agent.history) == 2  # search + final_answer

    async def test_tool_error_handling(self, agent):
        """Test agent behavior when a tool fails."""
        # Simulate a tool error
        agent.tools["weather"].raise_error = True

        result = await agent.run("What is the weather in London?")

        # Agent should retry with a different approach or report the error
        assert result.error is not None or result.fallback_response is not None
```

## Regression Testing Model Updates

### Golden Dataset Testing

```python
class GoldenTestSuite:
    """Maintain a set of input/output pairs that should not regress."""

    def __init__(self, test_file: str = "golden_tests.jsonl"):
        self.tests = self._load(test_file)

    def _load(self, path: str) -> list[dict]:
        import json
        tests = []
        with open(path) as f:
            for line in f:
                tests.append(json.loads(line))
        return tests

    def run(self, model_fn) -> dict:
        """Run all golden tests and report pass/fail."""
        results = []
        for test in self.tests:
            output = model_fn(test["input"])
            passed = self._evaluate(output, test)
            results.append({
                "id": test["id"],
                "passed": passed,
                "input": test["input"],
                "expected": test.get("expected_output"),
                "actual": output,
            })

        pass_rate = sum(1 for r in results if r["passed"]) / len(results)
        return {
            "total": len(results),
            "passed": sum(1 for r in results if r["passed"]),
            "failed": sum(1 for r in results if not r["passed"]),
            "pass_rate": pass_rate,
            "results": results,
        }

    def _evaluate(self, output: str, test: dict) -> bool:
        """Evaluate output against golden test criteria."""
        if "exact_match" in test:
            return output.strip() == test["exact_match"].strip()
        if "contains" in test:
            return all(term in output for term in test["contains"])
        if "llm_judge" in test:
            # Use an LLM judge for quality assessment
            return llm_judge(output, test["llm_judge"]["criteria"]) >= test["llm_judge"]["min_score"]
        return False
```

### Comparing Model Versions

```python
def compare_model_versions(
    model_a,
    model_b,
    test_cases: list[str],
    eval_fn,
) -> dict:
    """Compare two model versions across a test suite."""
    results_a = [eval_fn(model_a(q), q) for q in test_cases]
    results_b = [eval_fn(model_b(q), q) for q in test_cases]

    comparison = {
        "model_a_avg": sum(results_a) / len(results_a),
        "model_b_avg": sum(results_b) / len(results_b),
        "improvement": sum(results_b) / len(results_b) - sum(results_a) / len(results_a),
        "better_on": sum(1 for a, b in zip(results_a, results_b) if b > a),
        "worse_on": sum(1 for a, b in zip(results_a, results_b) if b < a),
        "same_on": sum(1 for a, b in zip(results_a, results_b) if b == a),
        "details": [
            {"query": q, "score_a": a, "score_b": b, "delta": b - a}
            for q, a, b in zip(test_cases, results_a, results_b)
        ],
    }

    return comparison
```

**Regression testing checklist**:

| Test Type | What to Check | Frequency |
|-----------|-------------|-----------|
| Golden dataset | Pre-defined input/output pairs | Every model change |
| Quality regression | Aggregate quality metrics | Every deployment |
| Safety regression | Safety test suite pass rate | Every model change |
| Latency regression | Response time p50/p95/p99 | Every deployment |
| Cost regression | Token usage per query | Weekly |
| Bias regression | Demographic parity tests | Monthly |

## Debugging Production Issues

### Systematic Debugging Framework

```
User reports a problem
         │
         ▼
┌─────────────────────────┐
│ 1. REPRODUCE            │  Can you trigger it consistently?
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│ 2. ISOLATE              │  Which component is failing?
│  - Prompt?              │
│  - Retrieval?           │
│  - Generation?          │
│  - Parsing?             │
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│ 3. MINIMIZE             │  Find the smallest failing case
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│ 4. HYPOTHESIZE          │  What change would fix it?
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│ 5. VERIFY               │  Test the fix on the minimal case
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│ 6. REGRESSION TEST      │  Add to golden dataset
└─────────────────────────┘
```

### Debug Logging for LLM Calls

```python
import logging
import json
from functools import wraps

logger = logging.getLogger("llm.debug")

def debug_llm_call(func):
    """Decorator that logs LLM inputs and outputs for debugging."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        call_id = generate_call_id()
        prompt = kwargs.get("prompt") or args[0] if args else None

        logger.info(f"[{call_id}] LLM call starting")
        logger.debug(f"[{call_id}] Prompt: {prompt[:500]}...")
        logger.debug(f"[{call_id}] Parameters: temperature={kwargs.get('temperature', 'default')}")

        try:
            import time
            start = time.time()
            result = func(*args, **kwargs)
            elapsed = time.time() - start

            logger.info(f"[{call_id}] LLM call completed in {elapsed:.2f}s")
            logger.debug(f"[{call_id]}] Response: {result[:500]}...")
            logger.debug(f"[{call_id}] Tokens used: {result.usage.total_tokens}")

            return result

        except Exception as e:
            logger.error(f"[{call_id}] LLM call failed: {e}")
            raise

    return wrapper
```

### Debugging Hallucinations

```python
def debug_hallucination(query: str, response: str, sources: list[dict]) -> dict:
    """Analyze whether a response is grounded in the provided sources."""
    analysis = {
        "query": query,
        "response": response,
        "hallucination_risk": "low",
        "unsupported_claims": [],
        "supported_claims": [],
        "source_coverage": 0.0,
    }

    # Extract claims from the response
    claims = extract_claims(response)

    for claim in claims:
        supported_by = []
        for source in sources:
            if claim in source["content"]:
                supported_by.append(source["id"])

        if supported_by:
            analysis["supported_claims"].append({
                "claim": claim,
                "sources": supported_by,
            })
        else:
            analysis["unsupported_claims"].append(claim)

    # Calculate risk level
    total_claims = len(claims)
    unsupported = len(analysis["unsupported_claims"])

    if total_claims > 0:
        analysis["source_coverage"] = 1 - (unsupported / total_claims)

    if analysis["source_coverage"] < 0.5:
        analysis["hallucination_risk"] = "high"
    elif analysis["source_coverage"] < 0.8:
        analysis["hallucination_risk"] = "medium"

    return analysis
```

### Debugging Retrieval Failures

```python
def debug_retrieval(query: str, results: list[dict], threshold: float = 0.3) -> dict:
    """Diagnose why retrieval may have failed to find relevant documents."""
    analysis = {
        "query": query,
        "num_results": len(results),
        "max_similarity": max((r["score"] for r in results), default=0.0),
        "min_similarity": min((r["score"] for r in results), default=0.0),
        "avg_similarity": sum(r["score"] for r in results) / len(results) if results else 0.0,
        "possible_issues": [],
    }

    if analysis["max_similarity"] < threshold:
        analysis["possible_issues"].append(
            "All results have low similarity — query may be out of domain"
        )

    if analysis["avg_similarity"] < 0.1:
        analysis["possible_issues"].append(
            "Very low average similarity — embedding model may not match domain"
        )

    score_range = analysis["max_similarity"] - analysis["min_similarity"]
    if score_range < 0.05:
        analysis["possible_issues"].append(
            "Scores are too uniform — index may need re-normalization"
        )

    if len(results) == 0:
        analysis["possible_issues"].append(
            "Zero results — index may be empty or query embedding failed"
        )

    # Check for query issues
    if len(query.split()) < 2:
        analysis["possible_issues"].append(
            "Very short query — consider query expansion"
        )

    return analysis
```

### Production Issue Checklist

When debugging a production LLM issue, check these systematically:

| Check | Command / Approach |
|-------|-------------------|
| Model API status | `curl https://api.openai.com/v1/models` |
| Token usage spike | Query APM for `llm.tokens.total` metric |
| Latency regression | Compare p95 latency to 7-day baseline |
| Error rate spike | Check `llm.errors.rate` in monitoring |
| Prompt changes | `git diff HEAD~10..HEAD -- prompts/` |
| Index freshness | Compare index timestamp to latest document |
| Embedding drift | Re-embed sample queries, compare to cached |
| Rate limiting | Check `429` response count in logs |

## Automated Testing Pipeline

```yaml
# .github/workflows/llm-tests.yml
name: LLM Tests

on: [pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pytest tests/unit/ --tb=short

  golden-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pytest tests/golden/ -v
        env:
          OPENAI_API_KEY: ${{ secrets.TEST_API_KEY }}

  quality-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run quality eval
        run: python scripts/run_eval_suite.py
        env:
          OPENAI_API_KEY: ${{ secrets.TEST_API_KEY }}
      - name: Check for regression
        run: python scripts/check_regression.py
        # Fail if quality drops by more than 2%

  safety-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pytest tests/safety/ -v
        # Must pass 100% — no regressions on safety
```

## Cross-References

- For a broader evaluation framework, see [Evaluation Metrics & Benchmarks](/docs/evaluation-metrics-benchmarks)
- For prompt engineering fundamentals, see [Prompt Engineering](/docs/prompt-engineering)
- For detecting hallucinations systematically, see [Hallucination Detection & Mitigation](/docs/hallucination-detection-mitigation)
- For tracking quality in production, see [LLM Metrics & KPIs](/docs/llm-metrics-kpis)
