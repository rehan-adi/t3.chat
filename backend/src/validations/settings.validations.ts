import { z } from "zod";

export const updateNameSchema = z.object({
  name: z.string().min(2).max(10),
});

export const createApiKeySchema = z.object({
  key: z
    .string()
    .trim()
    .startsWith("sk-or-or-v1-", "Invalid OpenRouter API key format"),
});
