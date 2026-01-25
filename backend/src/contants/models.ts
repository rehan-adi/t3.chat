export type Model = {
  id: string;
  name: string;
  provider: "openrouter" | "openai";
  isPaid: boolean;
  enabled: boolean;
};

export const MODELS: Model[] = [
  {
    id: "openai/gpt-5",
    name: "OpenAI: GPT-5",
    provider: "openrouter",
    isPaid: true,
    enabled: true,
  },
  {
    id: "anthropic/claude-opus-4.5",
    name: "Anthropic: Claude Opus 4.5",
    provider: "openrouter",
    isPaid: true,
    enabled: true,
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Anthropic: Claude Sonnet 4.5",
    provider: "openrouter",
    isPaid: true,
    enabled: true,
  },
  {
    id: "x-ai/grok-4.1-fast:free",
    name: "xAI: Grok 4.1 Fast",
    provider: "openrouter",
    isPaid: false,
    enabled: true,
  },
  {
    id: "xiaomi/mimo-v2-flash:free",
    name: "Xiaomi: MiMo V2 Flash",
    provider: "openrouter",
    isPaid: false,
    enabled: false,
  },
  {
    id: "liquid/lfm-2.5-1.2b-thinking:free",
    name: "LiquidAI: LFM2.5-1.2B-Thinking (free)",
    provider: "openrouter",
    isPaid: false,
    enabled: true,
  },
];
