import { deploymentModels } from "@/data/deployment-models";
import { hardwareProfiles } from "@/data/hardware-profiles";
import type {
  BackendId,
  DeploymentEstimate,
  DeploymentModelProfile,
  DeploymentWorkloadId,
  HardwareProfile,
  QuantizationId,
  QuantizationProfile,
} from "@/types";

export const quantizationProfiles: QuantizationProfile[] = [
  { id: "fp16", label: "FP16", bytesPerParam: 2, overheadFactor: 1, speedFactor: 0.82 },
  { id: "bf16", label: "BF16", bytesPerParam: 2, overheadFactor: 1, speedFactor: 0.84 },
  { id: "int8", label: "INT8", bytesPerParam: 1, overheadFactor: 1.06, speedFactor: 1 },
  { id: "q8", label: "Q8", bytesPerParam: 1, overheadFactor: 1.12, speedFactor: 1.02 },
  { id: "q6", label: "Q6", bytesPerParam: 0.75, overheadFactor: 1.18, speedFactor: 1.1 },
  { id: "q5", label: "Q5", bytesPerParam: 0.625, overheadFactor: 1.22, speedFactor: 1.18 },
  { id: "q4", label: "Q4", bytesPerParam: 0.5, overheadFactor: 1.26, speedFactor: 1.26 },
];

export const backendLabels: Record<BackendId, string> = {
  ollama: "Ollama",
  "llama.cpp": "llama.cpp",
  vllm: "vLLM",
  mlx: "MLX",
  "lm-studio": "LM Studio",
  exllama: "ExLlama",
};

export const workloadLabels: Record<DeploymentWorkloadId, string> = {
  chat: "Chat",
  rag: "RAG",
  coding: "Coding",
  "long-context": "Long context",
  vision: "Vision",
};

const backendOverheadFactor: Record<BackendId, number> = {
  ollama: 0.14,
  "llama.cpp": 0.12,
  vllm: 0.18,
  mlx: 0.1,
  "lm-studio": 0.15,
  exllama: 0.1,
};

const backendSpeedFactor: Record<BackendId, number> = {
  ollama: 0.95,
  "llama.cpp": 1,
  vllm: 1.14,
  mlx: 0.98,
  "lm-studio": 0.88,
  exllama: 1.18,
};

const backendNotes: Record<BackendId, string> = {
  ollama: "Good default for simple local deployments and GGUF workflows. Easy to use, but not the leanest serving stack.",
  "llama.cpp": "Flexible local runtime with strong GGUF support, CPU offloading, and transparent memory tradeoffs.",
  vllm: "Best fit for server-style inference and concurrency. It shines on accelerator-heavy setups with more headroom.",
  mlx: "Best fit for Apple Silicon. Unified memory helps, but macOS machines still need careful model and context choices.",
  "lm-studio": "Useful for desktop experimentation and testing, usually with a bit more overhead than a tuned runtime.",
  exllama: "Fast NVIDIA-oriented path for supported quantized checkpoints when raw local throughput matters.",
};

export function getDeploymentModelByName(name: string, provider?: string) {
  const normalized = normalizeKey(name);
  return (
    deploymentModels.find((model) => {
      const names = [model.name, ...(model.aliases || [])].map(normalizeKey);
      const providerMatch = provider ? normalizeKey(model.provider) === normalizeKey(provider) : true;
      return providerMatch && names.includes(normalized);
    }) ?? null
  );
}

export function getQuantizationProfile(id: QuantizationId) {
  return quantizationProfiles.find((item) => item.id === id) ?? quantizationProfiles[0];
}

export function estimateWeightMemoryGB(model: DeploymentModelProfile, quantization: QuantizationId) {
  const quant = getQuantizationProfile(quantization);
  const bytes = model.paramsB * 1_000_000_000 * quant.bytesPerParam * quant.overheadFactor;
  return bytes / 1024 ** 3;
}

export function estimateKvCacheGB(
  model: DeploymentModelProfile,
  contextTokens: number,
  concurrency: number,
  backend: BackendId,
) {
  const headDim = model.hiddenSize / model.numAttentionHeads;
  const cacheBytesPerValue = backend === "vllm" ? 1.5 : 2;
  const bytes =
    model.layers *
    contextTokens *
    Math.max(concurrency, 1) *
    model.numKvHeads *
    headDim *
    2 *
    cacheBytesPerValue;

  return bytes / 1024 ** 3;
}

export function estimateDeployment({
  model,
  hardware,
  quantization,
  contextTokens,
  concurrency,
  backend,
  workload,
}: {
  model: DeploymentModelProfile;
  hardware: HardwareProfile;
  quantization: QuantizationId;
  contextTokens: number;
  concurrency: number;
  backend: BackendId;
  workload: DeploymentWorkloadId;
}): DeploymentEstimate {
  const weightMemoryGB = round2(estimateWeightMemoryGB(model, quantization));
  const kvCacheGB = round2(estimateKvCacheGB(model, contextTokens, concurrency, backend));
  const runtimeOverheadGB = round2(Math.max(1, weightMemoryGB * backendOverheadFactor[backend]));
  const totalRequiredGB = round2(weightMemoryGB + kvCacheGB + runtimeOverheadGB);
  const availableAcceleratorMemoryGB = round2(getAvailableAcceleratorBudgetGB(hardware));
  const availableSystemMemoryGB = round2(getAvailableSystemBudgetGB(hardware));
  const offloadGB = round2(Math.max(0, totalRequiredGB - availableAcceleratorMemoryGB));
  const needsOffload = hardware.type !== "cpu" && offloadGB > 0.5;

  let fitTier: DeploymentEstimate["fitTier"] = "no";
  if (hardware.type === "cpu") {
    if (totalRequiredGB <= availableSystemMemoryGB * 0.8) fitTier = "comfortable";
    else if (totalRequiredGB <= availableSystemMemoryGB * 0.94) fitTier = "yes";
    else if (totalRequiredGB <= availableSystemMemoryGB * 1.05) fitTier = "barely";
  } else {
    if (totalRequiredGB <= availableAcceleratorMemoryGB * 0.82) fitTier = "comfortable";
    else if (totalRequiredGB <= availableAcceleratorMemoryGB * 0.96) fitTier = "yes";
    else if (
      totalRequiredGB <= availableAcceleratorMemoryGB * 1.08 &&
      availableSystemMemoryGB >= Math.max(offloadGB * 1.25, 8)
    ) {
      fitTier = "barely";
    }
  }

  const estimatedTokensPerSecond = estimateThroughput({
    model,
    hardware,
    quantization,
    contextTokens,
    concurrency,
    backend,
  });

  const performanceTier: DeploymentEstimate["performanceTier"] =
    estimatedTokensPerSecond >= 30 ? "high" : estimatedTokensPerSecond >= 10 ? "medium" : "low";
  const estimatedTokensPerSecondRange = `${Math.max(1, Math.floor(estimatedTokensPerSecond * 0.75))}-${Math.max(2, Math.ceil(estimatedTokensPerSecond * 1.25))} tok/s`;

  return {
    fitTier,
    fits: fitTier !== "no",
    needsOffload,
    weightMemoryGB,
    kvCacheGB,
    runtimeOverheadGB,
    totalRequiredGB,
    offloadGB,
    availableAcceleratorMemoryGB,
    availableSystemMemoryGB,
    estimatedTokensPerSecond,
    estimatedTokensPerSecondRange,
    performanceTier,
    recommendation: buildRecommendation({
      fitTier,
      hardware,
      quantization,
      contextTokens,
      workload,
      offloadGB,
    }),
    backendNote: backendNotes[backend],
    workloadNote: buildWorkloadNote(model, workload),
    assumptions: [
      "Weight memory is estimated from parameter count and quantization-specific overhead.",
      "KV cache assumes the selected context length and concurrency on one active model replica.",
      "A headroom margin is baked into the fit tier instead of promising exact allocator behavior.",
    ],
  };
}

export function getQuantizationTable(model: DeploymentModelProfile) {
  return model.quantizations.map((quantization) => ({
    quantization,
    label: getQuantizationProfile(quantization).label,
    weightMemoryGB: round2(estimateWeightMemoryGB(model, quantization)),
  }));
}

export function getRecommendedModelsForHardware(hardware: HardwareProfile) {
  const backend = getPreferredBackend(hardware);

  return deploymentModels
    .map((model) => ({
      model,
      estimate: estimateDeployment({
        model,
        hardware,
        quantization: "q4",
        contextTokens: 8192,
        concurrency: 1,
        backend,
        workload: "chat",
      }),
    }))
    .sort((left, right) => {
      const fitScore = getFitScore(right.estimate.fitTier) - getFitScore(left.estimate.fitTier);
      if (fitScore !== 0) {
        return fitScore;
      }

      return left.model.paramsB - right.model.paramsB;
    });
}

export function getRecommendedHardwareForModel(model: DeploymentModelProfile) {
  return hardwareProfiles
    .map((hardware) => ({
      hardware,
      estimate: estimateDeployment({
        model,
        hardware,
        quantization: "q4",
        contextTokens: 8192,
        concurrency: 1,
        backend: getPreferredBackend(hardware),
        workload: "chat",
      }),
    }))
    .sort((left, right) => getFitScore(right.estimate.fitTier) - getFitScore(left.estimate.fitTier));
}

export function getAlternativeModelSuggestions({
  currentModel,
  hardware,
  quantization,
  contextTokens,
  concurrency,
  backend,
  workload,
}: {
  currentModel: DeploymentModelProfile;
  hardware: HardwareProfile;
  quantization: QuantizationId;
  contextTokens: number;
  concurrency: number;
  backend: BackendId;
  workload: DeploymentWorkloadId;
}) {
  return deploymentModels
    .filter((model) => model.id !== currentModel.id)
    .map((model) => ({
      model,
      estimate: estimateDeployment({
        model,
        hardware,
        quantization,
        contextTokens,
        concurrency,
        backend,
        workload,
      }),
    }))
    .filter(({ estimate }) => estimate.fitTier !== "no")
    .sort((left, right) => {
      const fitGap = getFitScore(right.estimate.fitTier) - getFitScore(left.estimate.fitTier);
      if (fitGap !== 0) {
        return fitGap;
      }

      return left.model.paramsB - right.model.paramsB;
    })
    .slice(0, 3);
}

export function getPreferredBackend(hardware: HardwareProfile): BackendId {
  if (hardware.type === "unified-memory") {
    return hardware.backendSupport.includes("mlx") ? "mlx" : hardware.backendSupport[0];
  }

  if (hardware.class === "server" && hardware.backendSupport.includes("vllm")) {
    return "vllm";
  }

  if (hardware.backendSupport.includes("ollama")) {
    return "ollama";
  }

  return hardware.backendSupport[0];
}

function getAvailableAcceleratorBudgetGB(hardware: HardwareProfile) {
  if (hardware.type === "discrete-gpu") {
    return (hardware.vramGB || 0) * 0.9;
  }

  if (hardware.type === "unified-memory") {
    return (hardware.unifiedMemoryGB || hardware.systemRamGB) * 0.72;
  }

  return hardware.systemRamGB * 0.58;
}

function getAvailableSystemBudgetGB(hardware: HardwareProfile) {
  if (hardware.type === "unified-memory") {
    return hardware.systemRamGB * 0.72;
  }

  return hardware.systemRamGB * 0.78;
}

function estimateThroughput({
  model,
  hardware,
  quantization,
  contextTokens,
  concurrency,
  backend,
}: {
  model: DeploymentModelProfile;
  hardware: HardwareProfile;
  quantization: QuantizationId;
  contextTokens: number;
  concurrency: number;
  backend: BackendId;
}) {
  const quant = getQuantizationProfile(quantization);
  const hardwareTypeFactor =
    hardware.type === "discrete-gpu" ? 1 : hardware.type === "unified-memory" ? 0.55 : 0.18;
  const contextPenalty = 1 + Math.max(contextTokens - 4096, 0) / 32768 * 0.4;
  const concurrencyPenalty = Math.sqrt(Math.max(concurrency, 1));

  const raw =
    (hardware.bandwidthGBps / Math.max(model.paramsB, 1)) *
    quant.speedFactor *
    backendSpeedFactor[backend] *
    hardwareTypeFactor;

  return round2(Math.max(1, Math.min(120, raw / contextPenalty / concurrencyPenalty)));
}

function buildRecommendation({
  fitTier,
  hardware,
  quantization,
  contextTokens,
  workload,
  offloadGB,
}: {
  fitTier: DeploymentEstimate["fitTier"];
  hardware: HardwareProfile;
  quantization: QuantizationId;
  contextTokens: number;
  workload: DeploymentWorkloadId;
  offloadGB: number;
}) {
  if (fitTier === "comfortable") {
    return `This setup should run comfortably with ${quantization.toUpperCase()} at roughly ${contextTokens.toLocaleString()} tokens of context for ${workloadLabels[workload].toLowerCase()} workloads.`;
  }

  if (fitTier === "yes") {
    return `This should fit, but headroom is limited. Keep background concurrency low and avoid stretching context further without re-checking the estimate.`;
  }

  if (fitTier === "barely") {
    if (hardware.type === "cpu") {
      return "This is technically possible, but expect slow inference and little safety margin.";
    }

    return `This is a tight fit. Expect CPU offload or memory pressure of roughly ${round2(offloadGB)} GB, and consider a lighter quant or shorter context.`;
  }

  return "This is unlikely to be practical on the selected machine. Move to a smaller model, a lighter quantization, or more capable hardware.";
}

function buildWorkloadNote(model: DeploymentModelProfile, workload: DeploymentWorkloadId) {
  if (workload === "vision" && !model.modalities.includes("image")) {
    return "The selected workload expects vision support, but this model profile is text-only.";
  }

  if (workload === "coding" && !model.useCases.some((useCase) => normalizeKey(useCase).includes("coding"))) {
    return "This model can still be used for coding, but it is not primarily profiled as a coding-first model.";
  }

  if (workload === "long-context" && model.contextMax < 32768) {
    return "This model is not a strong long-context choice, even before hardware limits are considered.";
  }

  return undefined;
}

function getFitScore(fitTier: DeploymentEstimate["fitTier"]) {
  return {
    no: 0,
    barely: 1,
    yes: 2,
    comfortable: 3,
  }[fitTier];
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
