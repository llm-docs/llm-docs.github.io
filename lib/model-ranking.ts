import type { ModelMetadata } from "@/types";

export type RankedModel = ModelMetadata & {
  slug: string;
  ranking: ModelRanking;
};

export type ModelRanking = {
  metricName: string;
  score: number;
  grade: "A*" | "A" | "B" | "C";
  eligible: boolean;
  summary: string;
  components: {
    identityPrecision: number;
    specificationDepth: number;
    workloadReach: number;
    temporalMomentum: number;
    deploymentConfidence: number;
  };
};

const METRIC_NAME = "Traceable Capability Density";

const modelSignals = [
  "gpt",
  "claude",
  "gemini",
  "gemma",
  "llama",
  "mistral",
  "qwen",
  "deepseek",
  "codex",
  "grok",
  "command",
  "haiku",
  "sonnet",
  "opus",
  "flash",
  "pro",
  "nano banana",
  "muse",
];

const genericTitlePatterns = [
  /fundamentals/i,
  /getting started/i,
  /using /i,
  /working with/i,
  /creating /i,
  /brainstorming/i,
  /analyzing /i,
  /research with/i,
  /responsible and safe/i,
  /applications of/i,
  /the next phase/i,
  /customer success/i,
  /finance teams/i,
  /marketing teams/i,
  /operations teams/i,
  /sales teams/i,
  /healthcare/i,
  /financial services/i,
];

const versionPattern = /\b(?:\d+(?:\.\d+)?|mini|nano|flash|pro|live|max|ultra|large|small)\b/i;

export function rankModels(models: (ModelMetadata & { slug: string })[]): RankedModel[] {
  return models
    .map((model) => ({
      ...model,
      ranking: scoreModel(model),
    }))
    .sort((left, right) => {
      if (right.ranking.score !== left.ranking.score) {
        return right.ranking.score - left.ranking.score;
      }

      return new Date(right.releaseDate || 0).getTime() - new Date(left.releaseDate || 0).getTime();
    });
}

function scoreModel(model: ModelMetadata & { slug: string }): ModelRanking {
  const name = `${model.name} ${model.description} ${(model.tags || []).join(" ")}`.toLowerCase();
  const hasModelSignal = modelSignals.some((signal) => name.includes(signal));
  const hasVersionSignal = versionPattern.test(model.name);
  const hasGenericPattern = genericTitlePatterns.some((pattern) => pattern.test(model.name));

  let identityPrecision = 0;
  if (hasModelSignal) identityPrecision += 10;
  if (hasVersionSignal) identityPrecision += 5;
  if (model.contextWindow) identityPrecision += 3;
  if (model.modalities && model.modalities.length > 0) identityPrecision += 2;
  if (hasGenericPattern) identityPrecision -= 10;
  if (model.status === "active") identityPrecision += 2;
  identityPrecision = clamp(identityPrecision, 0, 20);

  let specificationDepth = 0;
  if (model.contextWindow) specificationDepth += 8;
  if (model.modalities && model.modalities.length > 0) specificationDepth += 6;
  if (model.pricing) specificationDepth += 4;
  if (model.useCases && model.useCases.length > 0) specificationDepth += 4;
  if (model.tags && model.tags.length >= 2) specificationDepth += 3;
  specificationDepth = clamp(specificationDepth, 0, 25);

  const contextWindow = parseContextWindow(model.contextWindow);
  let workloadReach = 0;
  workloadReach += Math.min(8, (model.modalities || []).length * 4);
  if (contextWindow >= 1_000_000) workloadReach += 6;
  else if (contextWindow >= 200_000) workloadReach += 5;
  else if (contextWindow >= 128_000) workloadReach += 4;
  else if (contextWindow >= 32_000) workloadReach += 3;
  else if (contextWindow > 0) workloadReach += 2;
  workloadReach += Math.min(6, (model.useCases || []).length * 2);
  workloadReach = clamp(workloadReach, 0, 20);

  const temporalMomentum = scoreFreshness(model.releaseDate);
  const deploymentConfidence = scoreStatus(model.status);

  const score = identityPrecision + specificationDepth + workloadReach + temporalMomentum + deploymentConfidence;
  const grade = scoreToGrade(score);
  const eligible = !hasGenericPattern && (identityPrecision >= 10 || (model.status === "active" && specificationDepth >= 12));

  return {
    metricName: METRIC_NAME,
    score,
    grade,
    eligible,
    summary: buildSummary({
      identityPrecision,
      specificationDepth,
      workloadReach,
      temporalMomentum,
      deploymentConfidence,
      hasGenericPattern,
    }),
    components: {
      identityPrecision,
      specificationDepth,
      workloadReach,
      temporalMomentum,
      deploymentConfidence,
    },
  };
}

function buildSummary({
  identityPrecision,
  specificationDepth,
  workloadReach,
  temporalMomentum,
  deploymentConfidence,
  hasGenericPattern,
}: {
  identityPrecision: number;
  specificationDepth: number;
  workloadReach: number;
  temporalMomentum: number;
  deploymentConfidence: number;
  hasGenericPattern: boolean;
}) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (specificationDepth >= 18) strengths.push("strong specification coverage");
  if (workloadReach >= 12) strengths.push("broad workload reach");
  if (temporalMomentum >= 12) strengths.push("fresh release signal");
  if (deploymentConfidence >= 16) strengths.push("high tracking confidence");

  if (identityPrecision <= 8) weaknesses.push("weak model identity");
  if (specificationDepth <= 10) weaknesses.push("thin metadata");
  if (hasGenericPattern) weaknesses.push("article-like title");

  if (strengths.length === 0 && weaknesses.length === 0) {
    return "Balanced profile with moderate signals across the ranking factors.";
  }

  if (strengths.length > 0 && weaknesses.length === 0) {
    return `${capitalizeList(strengths)}.`;
  }

  if (strengths.length === 0 && weaknesses.length > 0) {
    return `${capitalizeList(weaknesses)} holds this entry back.`;
  }

  return `${capitalizeList(strengths)}, but ${weaknesses.join(" and ")} hold this entry back.`;
}

function scoreFreshness(releaseDate?: string) {
  if (!releaseDate) return 0;

  const value = new Date(releaseDate);
  if (Number.isNaN(value.getTime())) return 0;

  const ageInDays = Math.floor((Date.now() - value.getTime()) / 86_400_000);
  if (ageInDays <= 30) return 15;
  if (ageInDays <= 90) return 12;
  if (ageInDays <= 180) return 9;
  if (ageInDays <= 365) return 6;
  return 3;
}

function scoreStatus(status?: string) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "active") return 20;
  if (normalized === "tracked") return 16;
  if (normalized.includes("preview") || normalized.includes("beta")) return 14;
  if (normalized === "auto-detected") return 6;
  if (normalized.includes("deprecated") || normalized.includes("archived")) return 4;
  return 10;
}

function scoreToGrade(score: number): "A*" | "A" | "B" | "C" {
  if (score >= 85) return "A*";
  if (score >= 70) return "A";
  if (score >= 55) return "B";
  return "C";
}

function parseContextWindow(value?: string) {
  if (!value) return 0;

  const normalized = value.trim().toUpperCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;

  const numeric = Number.parseFloat(match[1]);
  if (normalized.includes("M")) return Math.round(numeric * 1_000_000);
  if (normalized.includes("K")) return Math.round(numeric * 1_000);
  return Math.round(numeric);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function capitalizeList(items: string[]) {
  const sentence = items.join(", ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

