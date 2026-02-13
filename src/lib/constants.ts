import type { EngineType } from "@/types";

export const ENGINE_COLORS: Record<EngineType, string> = {
  perplexity: "hsl(var(--engine-perplexity))",
  google_ai_overview: "hsl(var(--engine-google))",
  chatgpt: "hsl(var(--engine-chatgpt))",
  bing_copilot: "hsl(var(--engine-bing))",
  claude: "hsl(var(--engine-claude))",
};

export const ENGINE_LABELS: Record<EngineType, string> = {
  perplexity: "Perplexity",
  google_ai_overview: "AI Overview",
  chatgpt: "ChatGPT",
  bing_copilot: "Bing Copilot",
  claude: "Claude",
};

export const ALL_ENGINES: EngineType[] = [
  "perplexity",
  "google_ai_overview",
  "chatgpt",
  "bing_copilot",
  "claude",
];

export const AI_REFERRAL_SOURCES = [
  "chatgpt.com",
  "perplexity.ai",
  "claude.ai",
  "you.com",
  "phind.com",
  "copilot.microsoft.com",
];
