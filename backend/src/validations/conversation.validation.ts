import { z } from "zod";

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(20),
});
