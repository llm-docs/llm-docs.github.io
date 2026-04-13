import fs from "fs";
import path from "path";

const root = process.cwd();
const docsRoot = path.join(root, "content", "docs", "library");
const today = "2026-04-10";
const author = "LLM Hub Team";

const pageTypes = [
  {
    slug: "foundations",
    titleSuffix: "Foundations",
    category: "Foundations",
    description: (domain) =>
      `Core concepts, terminology, workflows, and mental models for ${domain.objective.toLowerCase()} in modern AI systems.`,
    summaryLead: (domain) =>
      `${domain.name} is the discipline of ${domain.objective.toLowerCase()}. Teams usually touch it when they need to balance capability, reliability, cost, and operating complexity.`,
    sectionLabel: "Mental model",
    sectionIntro: (domain) =>
      `A useful starting point is to treat ${domain.name.toLowerCase()} as a system problem, not a single model toggle. The work spans data, prompts, infrastructure, evaluation, and operational feedback loops.`,
  },
  {
    slug: "architecture-patterns",
    titleSuffix: "Architecture Patterns",
    category: "Architecture",
    description: (domain) =>
      `Reference patterns, tradeoffs, and building blocks for designing ${domain.name.toLowerCase()} systems.`,
    summaryLead: (domain) =>
      `Architecture choices determine whether ${domain.name.toLowerCase()} remains maintainable as traffic, model count, and compliance requirements increase.`,
    sectionLabel: "Reference architecture",
    sectionIntro: (domain) =>
      `Strong ${domain.name.toLowerCase()} architecture usually separates orchestration, state, evaluation, and observation layers so teams can iterate without rewriting the whole stack.`,
  },
  {
    slug: "implementation-guide",
    titleSuffix: "Implementation Guide",
    category: "Implementation",
    description: (domain) =>
      `A practical step-by-step guide for implementing ${domain.name.toLowerCase()} with production constraints in mind.`,
    summaryLead: (domain) =>
      `Implementation work around ${domain.name.toLowerCase()} fails when teams skip interface design, fallback logic, and measurable acceptance criteria.`,
    sectionLabel: "Implementation path",
    sectionIntro: (domain) =>
      `The shortest route to a production-grade ${domain.name.toLowerCase()} workflow is to start with a narrow path, instrument it heavily, and then widen scope only after the baseline is stable.`,
  },
  {
    slug: "evaluation-metrics",
    titleSuffix: "Evaluation Metrics",
    category: "Evaluation",
    description: (domain) =>
      `Metrics, scorecards, and review methods for measuring ${domain.name.toLowerCase()} quality in practice.`,
    summaryLead: (domain) =>
      `You cannot improve ${domain.name.toLowerCase()} reliably without a scoring model that combines business outcomes, technical quality, and operational cost.`,
    sectionLabel: "Measurement strategy",
    sectionIntro: (domain) =>
      `Good evaluation for ${domain.name.toLowerCase()} blends offline tests, human review, production telemetry, and explicit failure taxonomies instead of relying on a single benchmark.`,
  },
  {
    slug: "production-checklist",
    titleSuffix: "Production Checklist",
    category: "Operations",
    description: (domain) =>
      `Deployment checklist, operational controls, and rollout guidance for ${domain.name.toLowerCase()} workloads.`,
    summaryLead: (domain) =>
      `A production checklist turns ${domain.name.toLowerCase()} from a promising prototype into an operational capability with clear owners, thresholds, and guardrails.`,
    sectionLabel: "Go-live checklist",
    sectionIntro: (domain) =>
      `Production readiness in ${domain.name.toLowerCase()} depends less on a perfect prompt and more on repeatable controls for rollout, rollback, support, and incident response.`,
  },
  {
    slug: "failure-modes",
    titleSuffix: "Failure Modes",
    category: "Reliability",
    description: (domain) =>
      `Common failure patterns, debugging workflows, and prevention strategies for ${domain.name.toLowerCase()}.`,
    summaryLead: (domain) =>
      `Most painful ${domain.name.toLowerCase()} incidents are predictable once teams classify the failure modes and instrument the system at the right boundaries.`,
    sectionLabel: "Failure analysis",
    sectionIntro: (domain) =>
      `Failure analysis works best when teams map symptoms to likely causes across prompts, retrieval, tools, model routing, data freshness, and serving constraints.`,
  },
  {
    slug: "cost-performance",
    titleSuffix: "Cost and Performance",
    category: "Economics",
    description: (domain) =>
      `How to trade off latency, throughput, quality, and spend when operating ${domain.name.toLowerCase()}.`,
    summaryLead: (domain) =>
      `Every ${domain.name.toLowerCase()} system sits on a quality-speed-cost frontier. The practical goal is not perfection, but an operating point your team can afford and defend.`,
    sectionLabel: "Optimization lens",
    sectionIntro: (domain) =>
      `Cost and performance tuning starts by identifying which part of the path dominates spend: tokens, retrieval, tool calls, context size, GPU memory, or human review.`,
  },
  {
    slug: "vendor-landscape",
    titleSuffix: "Vendor Landscape",
    category: "Market Intelligence",
    description: (domain) =>
      `How vendors, open-source options, and ecosystem tools compare for ${domain.name.toLowerCase()} use cases.`,
    summaryLead: (domain) =>
      `Vendor selection around ${domain.name.toLowerCase()} is usually a question of constraints: compliance, deployment model, model quality, observability, and switching cost.`,
    sectionLabel: "Market map",
    sectionIntro: (domain) =>
      `A useful vendor map separates model providers, infrastructure layers, developer tooling, and evaluation products so teams do not confuse adjacent categories.`,
  },
];

const domains = [
  {
    slug: "prompt-engineering",
    name: "Prompt Engineering",
    group: "Prompting",
    objective: "designing prompts and response contracts that are reliable under real workload variability",
    problems: ["vague instructions", "format drift", "reasoning inconsistency", "task ambiguity"],
    components: ["system instructions", "few-shot examples", "response schema", "test prompts"],
    metrics: ["task completion rate", "format adherence", "revision rate", "human preference"],
    risks: ["hidden ambiguity", "overfitting to examples", "prompt injection exposure", "brittle edge cases"],
    tags: ["prompting", "prompts", "instruction-design", "reliability"],
  },
  {
    slug: "structured-output",
    name: "Structured Output",
    group: "Application Design",
    objective: "producing machine-readable responses that downstream systems can trust",
    problems: ["schema mismatch", "missing fields", "hallucinated keys", "partial validation failures"],
    components: ["JSON schema", "validators", "repair logic", "typed interfaces"],
    metrics: ["schema pass rate", "retry frequency", "parser error rate", "downstream success rate"],
    risks: ["silent coercion", "version drift", "oversized responses", "weak fallback behavior"],
    tags: ["structured-output", "json", "schema", "tooling"],
  },
  {
    slug: "tool-use",
    name: "Tool Use",
    group: "Agents",
    objective: "connecting models to APIs, databases, and execution tools without losing control",
    problems: ["bad tool selection", "parameter errors", "unsafe side effects", "tool-call loops"],
    components: ["tool registry", "argument validation", "permission model", "execution tracing"],
    metrics: ["tool success rate", "tool precision", "fallback rate", "task completion latency"],
    risks: ["unauthorized execution", "poor tool routing", "insufficient validation", "hard-to-debug failures"],
    tags: ["tools", "function-calling", "agents", "automation"],
  },
  {
    slug: "retrieval-augmented-generation",
    name: "Retrieval-Augmented Generation",
    group: "RAG",
    objective: "grounding model output in trusted external knowledge at runtime",
    problems: ["poor recall", "stale knowledge", "irrelevant passages", "citation mismatch"],
    components: ["chunking strategy", "embedding pipeline", "retriever", "answer synthesis"],
    metrics: ["retrieval recall", "answer groundedness", "citation coverage", "time to first answer"],
    risks: ["garbage-in context", "query mismatch", "index drift", "context window waste"],
    tags: ["rag", "retrieval", "grounding", "knowledge"],
  },
  {
    slug: "vector-databases",
    name: "Vector Databases",
    group: "Retrieval",
    objective: "storing and searching embeddings efficiently for similarity and hybrid retrieval",
    problems: ["slow queries", "index quality issues", "metadata filtering gaps", "cost blowouts"],
    components: ["index type", "metadata store", "hybrid retrieval", "re-index pipeline"],
    metrics: ["query latency", "recall at k", "cost per query", "index freshness"],
    risks: ["fragmented metadata", "bad chunking", "hot shard imbalance", "unbounded storage growth"],
    tags: ["vector-database", "retrieval", "search", "embeddings"],
  },
  {
    slug: "embeddings",
    name: "Embeddings",
    group: "Retrieval",
    objective: "representing text, code, or multimodal inputs for semantic search and ranking",
    problems: ["semantic drift", "language mismatch", "weak reranking", "representation collapse"],
    components: ["embedding model", "normalization", "reranking", "index strategy"],
    metrics: ["retrieval precision", "recall at k", "ranking quality", "embedding throughput"],
    risks: ["domain mismatch", "embedding version churn", "bad truncation", "poor hard-negative coverage"],
    tags: ["embeddings", "semantic-search", "ranking", "retrieval"],
  },
  {
    slug: "fine-tuning",
    name: "Fine-Tuning",
    group: "Training",
    objective: "adapting base models to specialized tasks, formats, and behaviors",
    problems: ["data quality gaps", "overfitting", "catastrophic regressions", "weak evaluation"],
    components: ["training set", "validation split", "adapter strategy", "checkpoint review"],
    metrics: ["task accuracy", "loss trend", "regression rate", "cost per training run"],
    risks: ["bad labels", "narrow coverage", "misaligned objectives", "deployment mismatch"],
    tags: ["fine-tuning", "training", "adaptation", "specialization"],
  },
  {
    slug: "evaluation-systems",
    name: "Evaluation Systems",
    group: "Evaluation",
    objective: "measuring quality, regressions, and business impact across AI workflows",
    problems: ["unclear scorecards", "poor test coverage", "metric gaming", "slow feedback loops"],
    components: ["golden sets", "human review", "online telemetry", "regression gates"],
    metrics: ["pass rate", "severity-weighted failure score", "coverage depth", "time to detect regressions"],
    risks: ["benchmark overfitting", "judge bias", "missing edge cases", "weak incident reviews"],
    tags: ["evaluation", "testing", "quality", "benchmarks"],
  },
  {
    slug: "observability",
    name: "LLM Observability",
    group: "Operations",
    objective: "seeing what models, prompts, tools, and retrieval layers are doing in production",
    problems: ["blind failure analysis", "missing traces", "unclear costs", "hard-to-reproduce incidents"],
    components: ["request traces", "cost telemetry", "prompt versions", "feedback labels"],
    metrics: ["mean time to debug", "token spend by workflow", "trace coverage", "incident recurrence"],
    risks: ["PII leakage in logs", "siloed telemetry", "sampling blind spots", "missing version attribution"],
    tags: ["observability", "monitoring", "tracing", "operations"],
  },
  {
    slug: "model-routing",
    name: "Model Routing",
    group: "Inference",
    objective: "sending each request to the right model based on cost, latency, and capability constraints",
    problems: ["expensive over-routing", "quality regressions", "fallback storms", "policy conflicts"],
    components: ["router policy", "request classification", "fallback matrix", "quality thresholds"],
    metrics: ["route accuracy", "blended cost per request", "fallback frequency", "latency percentile"],
    risks: ["misclassification", "policy drift", "bad escalation logic", "uncontrolled provider dependence"],
    tags: ["routing", "model-selection", "cost-control", "latency"],
  },
  {
    slug: "semantic-caching",
    name: "Semantic Caching",
    group: "Performance",
    objective: "reducing latency and token spend by reusing high-confidence prior outputs",
    problems: ["cache misses", "stale responses", "embedding mismatch", "unsafe reuse"],
    components: ["cache keys", "similarity threshold", "freshness policy", "invalidation logic"],
    metrics: ["cache hit rate", "saved token spend", "latency reduction", "incorrect cache reuse rate"],
    risks: ["leaking tenant data", "overaggressive matching", "weak invalidation", "silent quality drift"],
    tags: ["caching", "latency", "cost", "performance"],
  },
  {
    slug: "guardrails",
    name: "Guardrails",
    group: "Safety",
    objective: "enforcing behavior, policy, and output constraints around AI applications",
    problems: ["unsafe responses", "policy violations", "inconsistent enforcement", "user frustration"],
    components: ["policy checks", "content filters", "stateful controls", "human escalation"],
    metrics: ["policy block rate", "false positive rate", "unsafe escape rate", "review burden"],
    risks: ["overblocking", "policy gaps", "prompt bypasses", "unclear appeal paths"],
    tags: ["guardrails", "safety", "policy", "compliance"],
  },
  {
    slug: "ai-agents",
    name: "AI Agents",
    group: "Agents",
    objective: "coordinating planning, memory, tool calls, and workflows to complete multistep tasks",
    problems: ["looping", "weak decomposition", "state corruption", "unbounded latency"],
    components: ["planner", "executor", "memory store", "review loop"],
    metrics: ["task success rate", "step efficiency", "human takeover rate", "end-to-end latency"],
    risks: ["runaway actions", "tool misuse", "memory pollution", "low determinism"],
    tags: ["agents", "automation", "planning", "tool-use"],
  },
  {
    slug: "workflow-orchestration",
    name: "Workflow Orchestration",
    group: "Applications",
    objective: "structuring AI workflows so multistep systems remain debuggable, testable, and scalable",
    problems: ["spaghetti flows", "retry storms", "handoff ambiguity", "hidden state changes"],
    components: ["workflow graph", "state machine", "retry policy", "queueing model"],
    metrics: ["workflow success rate", "retry burden", "queue delay", "handoff accuracy"],
    risks: ["implicit state", "poor branch coverage", "non-idempotent steps", "weak compensation logic"],
    tags: ["workflows", "orchestration", "state-machines", "automation"],
  },
  {
    slug: "long-context-systems",
    name: "Long-Context Systems",
    group: "Context",
    objective: "working with very large prompts and documents without losing relevance or speed",
    problems: ["context dilution", "slow decoding", "irrelevant tokens", "poor prioritization"],
    components: ["context shaping", "retrieval layer", "compression strategy", "window budgeting"],
    metrics: ["answer relevance", "context utilization", "latency by token volume", "cost per long request"],
    risks: ["stuffing everything", "forgotten key facts", "runaway costs", "window fragmentation"],
    tags: ["long-context", "context-window", "retrieval", "optimization"],
  },
  {
    slug: "multimodal-ai",
    name: "Multimodal AI",
    group: "Multimodal",
    objective: "combining text, image, audio, video, and document understanding in one workflow",
    problems: ["format inconsistency", "cross-modal ambiguity", "expensive pipelines", "weak OCR quality"],
    components: ["input normalization", "multimodal model", "preprocessing", "post-processing"],
    metrics: ["cross-modal accuracy", "OCR quality", "latency per asset", "review burden"],
    risks: ["lossy preprocessing", "modality mismatch", "oversized payloads", "bad provenance tracking"],
    tags: ["multimodal", "vision", "audio", "documents"],
  },
  {
    slug: "inference-serving",
    name: "Inference Serving",
    group: "Infrastructure",
    objective: "deploying and scaling model inference reliably across traffic and hardware conditions",
    problems: ["queueing spikes", "GPU underutilization", "cold starts", "throughput collapse"],
    components: ["serving runtime", "autoscaling", "request batching", "capacity planning"],
    metrics: ["tokens per second", "GPU utilization", "p95 latency", "cost per served token"],
    risks: ["bad batching", "insufficient quotas", "memory fragmentation", "capacity misreads"],
    tags: ["inference", "serving", "latency", "gpu"],
  },
  {
    slug: "quantization",
    name: "Quantization",
    group: "Optimization",
    objective: "reducing model memory and compute requirements while preserving useful quality",
    problems: ["quality regression", "hardware incompatibility", "benchmark mismatch", "ops confusion"],
    components: ["quantization format", "calibration data", "runtime support", "quality gates"],
    metrics: ["memory reduction", "quality delta", "throughput gain", "energy efficiency"],
    risks: ["poor calibration", "backend mismatch", "hidden accuracy loss", "bad workload fit"],
    tags: ["quantization", "optimization", "memory", "serving"],
  },
  {
    slug: "knowledge-distillation",
    name: "Knowledge Distillation",
    group: "Optimization",
    objective: "compressing capabilities from larger models into smaller and cheaper ones",
    problems: ["teacher bias", "coverage gaps", "task drift", "fragile transfer quality"],
    components: ["teacher model", "student model", "distillation dataset", "quality rubric"],
    metrics: ["student quality ratio", "size reduction", "latency improvement", "training efficiency"],
    risks: ["bad teacher outputs", "insufficient diversity", "overcompression", "hidden regression pockets"],
    tags: ["distillation", "compression", "student-models", "optimization"],
  },
  {
    slug: "synthetic-data",
    name: "Synthetic Data",
    group: "Data",
    objective: "generating structured or unstructured examples to expand coverage for AI systems",
    problems: ["low diversity", "self-reinforcing errors", "label leakage", "weak realism"],
    components: ["generation prompts", "quality filters", "deduplication", "human spot checks"],
    metrics: ["coverage gain", "label precision", "diversity score", "downstream improvement"],
    risks: ["compounded hallucinations", "style collapse", "unrepresentative samples", "evaluation contamination"],
    tags: ["synthetic-data", "data-generation", "training", "evaluation"],
  },
  {
    slug: "governance",
    name: "AI Governance",
    group: "Governance",
    objective: "defining ownership, policy, approvals, and risk management for AI programs",
    problems: ["unclear responsibility", "slow approvals", "policy gaps", "audit friction"],
    components: ["risk register", "ownership model", "approval workflow", "policy controls"],
    metrics: ["time to approve", "policy exception rate", "audit readiness", "control coverage"],
    risks: ["shadow AI", "unclear escalation", "weak documentation", "unowned exceptions"],
    tags: ["governance", "policy", "risk", "compliance"],
  },
  {
    slug: "privacy-and-security",
    name: "Privacy and Security",
    group: "Security",
    objective: "protecting user data, credentials, and system boundaries across AI workflows",
    problems: ["data leakage", "prompt injection", "credential misuse", "insufficient access control"],
    components: ["data classification", "sandboxing", "redaction layer", "access policies"],
    metrics: ["sensitive data exposure rate", "blocked attacks", "control coverage", "mean time to contain"],
    risks: ["cross-tenant leakage", "unsafe tools", "weak secrets hygiene", "missing adversarial tests"],
    tags: ["privacy", "security", "prompt-injection", "controls"],
  },
  {
    slug: "benchmarking",
    name: "LLM Benchmarking",
    group: "Evaluation",
    objective: "comparing models and systems with meaningful, reproducible evidence",
    problems: ["benchmark misuse", "leaderboard obsession", "non-representative tasks", "measurement drift"],
    components: ["benchmark suite", "task weights", "human review", "reproducibility controls"],
    metrics: ["task-weighted score", "run variance", "coverage", "decision confidence"],
    risks: ["contamination", "metric gaming", "inconsistent prompts", "weak real-world transfer"],
    tags: ["benchmarks", "evaluation", "comparison", "measurement"],
  },
  {
    slug: "model-selection",
    name: "Model Selection",
    group: "Strategy",
    objective: "choosing the right model stack for a workload instead of defaulting to the loudest release",
    problems: ["overbuying", "weak requirements", "vendor lock-in", "opaque tradeoffs"],
    components: ["use-case rubric", "scorecard", "pilot matrix", "vendor review"],
    metrics: ["fit score", "cost per successful task", "migration effort", "stakeholder confidence"],
    risks: ["headline chasing", "missing fallback options", "narrow pilots", "cost surprises"],
    tags: ["model-selection", "comparison", "procurement", "strategy"],
  },
  {
    slug: "cost-optimization",
    name: "Cost Optimization",
    group: "Economics",
    objective: "reducing AI spend without undermining user outcomes or engineering velocity",
    problems: ["token waste", "oversized contexts", "expensive model defaults", "duplicated inference"],
    components: ["budget controls", "router policy", "cache strategy", "spend reporting"],
    metrics: ["cost per request", "cost per successful outcome", "token efficiency", "savings by tactic"],
    risks: ["quality erosion", "false savings", "missing spend attribution", "bad incentive design"],
    tags: ["cost", "optimization", "efficiency", "budgeting"],
  },
];

generate();

function generate() {
  const pages = [];

  for (const domain of domains) {
    for (const pageType of pageTypes) {
      const relativePath = path.join(domain.slug, `${pageType.slug}.md`);
      const outputPath = path.join(docsRoot, relativePath);
      const content = buildDoc(domain, pageType);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, content);
      pages.push(relativePath);
    }
  }

  console.log(`Generated ${pages.length} docs pages under content/docs/library.`);
}

function buildDoc(domain, pageType) {
  const title = `${domain.name} ${pageType.titleSuffix}`;
  const description = pageType.description(domain);
  const tags = [...domain.tags, slugToTag(pageType.slug), slugToTag(domain.group)];
  const relatedLinks = buildRelatedLinks(domain);

  const body = [
    `# ${title}`,
    "",
    `${pageType.summaryLead(domain)} ${domain.name} matters because it touches ${domain.problems.slice(0, 2).join(" and ")} while still needing to meet business expectations around speed and reliability.`,
    "",
    `This page focuses on ${domain.name.toLowerCase()} through the lens of ${pageType.category.toLowerCase()}. It is written as a practical internal reference: what the domain is, what breaks first, what teams should measure, and how to keep decisions grounded in production constraints.`,
    "",
    `## ${pageType.sectionLabel}`,
    "",
    `${pageType.sectionIntro(domain)} In practice, high-performing teams make the work explicit: they document inputs, outputs, fallback paths, ownership, and how quality is reviewed over time.`,
    "",
    `For ${domain.name.toLowerCase()}, the essential moving parts are usually ${joinWithAnd(domain.components.slice(0, 3))}, with additional controls around ${domain.components[3]}. If any one of those parts is implicit, debugging becomes slower and quality becomes harder to predict.`,
    "",
    "## Core components",
    "",
    ...domain.components.map((component) => `- **${toTitleCase(component)}**: ${componentExplanation(domain, component)}`),
    "",
    "## Operating priorities",
    "",
    ...domain.problems.map((problem, index) => `${index + 1}. ${operatingPriority(domain, problem)}`),
    "",
    "## What to measure",
    "",
    `A useful scorecard for ${domain.name.toLowerCase()} should cover four layers at the same time: user outcome quality, system reliability, economic efficiency, and change management. If the team only watches one layer, regressions stay hidden until they surface in production.`,
    "",
    ...domain.metrics.map((metric) => `- **${toTitleCase(metric)}**: ${metricExplanation(domain, metric)}`),
    "",
    "## Common risks",
    "",
    ...domain.risks.map((risk) => `- **${toTitleCase(risk)}**: ${riskExplanation(domain, risk)}`),
    "",
    "## Implementation notes",
    "",
    `Start small. Choose one workflow where ${domain.name.toLowerCase()} has visible business value, define success before rollout, and instrument the path end to end. That makes it easier to compare changes in prompts, models, retrieval settings, or infrastructure without guessing what caused movement.`,
    "",
    `Document the contract for each stage. Inputs, outputs, thresholds, and ownership should all be written down. For example, if ${domain.name.toLowerCase()} depends on ${domain.components[0]} and ${domain.components[1]}, the team should know who owns those layers, what failure looks like, and when humans intervene.`,
    "",
    `Design for reversibility. Teams move faster when they can change providers, models, or heuristics without tearing apart the whole system. That usually means versioning prompts and schemas, storing comparison baselines, and keeping a narrow interface between application logic and model-specific behavior.`,
    "",
    "## Decision questions",
    "",
    ...buildDecisionQuestions(domain).map((question) => `- ${question}`),
    "",
    "## Related pages",
    "",
    ...relatedLinks.map((link) => `- ${link}`),
    "",
  ];

  return `${frontmatter({
    title,
    description,
    date: today,
    updatedAt: today,
    category: `${domain.group} / ${pageType.category}`,
    tags,
    author,
  })}\n${body.join("\n")}`;
}

function buildRelatedLinks(domain) {
  return [
    `[${domain.name} Foundations](/docs/library/${domain.slug}/foundations)`,
    `[${domain.name} Implementation Guide](/docs/library/${domain.slug}/implementation-guide)`,
    `[${domain.name} Production Checklist](/docs/library/${domain.slug}/production-checklist)`,
    `[${domain.name} Cost and Performance](/docs/library/${domain.slug}/cost-performance)`,
  ];
}

function buildDecisionQuestions(domain) {
  return [
    `Which part of ${domain.name.toLowerCase()} creates the most business value for this workflow?`,
    `Where do ${domain.problems[0]} and ${domain.problems[1]} show up today, and how are they detected?`,
    `Which metrics from the current scorecard actually predict success for users or operators?`,
    `How expensive is it to change the current design if a model, provider, or policy changes next quarter?`,
  ];
}

function componentExplanation(domain, component) {
  return `Treat ${component} as a versioned interface. In ${domain.name.toLowerCase()} work, changes here often influence quality, debugging speed, and rollout safety more than teams expect.`;
}

function operatingPriority(domain, problem) {
  return `Reduce **${problem}** by defining explicit ownership, lightweight tests, and rollback criteria. In ${domain.name.toLowerCase()}, this is often cheaper than trying to solve everything with a larger model.`;
}

function metricExplanation(domain, metric) {
  return `Track ${metric} over time, not only at launch. For ${domain.name.toLowerCase()}, trend direction often matters more than a single headline number.`;
}

function riskExplanation(domain, risk) {
  return `Review ${risk} as part of release planning and incident response. It is easier to contain when it has named owners and a playbook attached.`;
}

function slugToTag(value) {
  return value.toLowerCase().replace(/\//g, "-").replace(/\s+/g, "-");
}

function toTitleCase(value) {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function joinWithAnd(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function frontmatter(data) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((item) => `"${escapeQuotes(item)}"`).join(", ")}]`);
    } else {
      lines.push(`${key}: "${escapeQuotes(value)}"`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function escapeQuotes(value) {
  return String(value).replace(/"/g, '\\"');
}
