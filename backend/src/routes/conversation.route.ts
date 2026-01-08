import { Hono } from "hono";
import { rateLimiter } from "@/middlewares/limiter";
import { authorization } from "@/middlewares/authorization";
import {
  getAllConversation,
  getConversationById,
  updateConversation,
  deleteConversation,
  updateConversationPin,
  conversationChatController,
} from "@/controllers/conversation.controller";

export const conversationRoute = new Hono();

conversationRoute.get(
  "/",
  authorization,
  rateLimiter({ points: 100, duration: 300 }),
  getAllConversation
);
conversationRoute.get(
  "/:conversationId",
  authorization,
  rateLimiter({ points: 35, duration: 300 }),
  getConversationById
);
conversationRoute.post(
  "/",
  authorization,
  rateLimiter({ points: 25, duration: 300 }),
  conversationChatController
); // need to work here mainly
conversationRoute.patch(
  "/:conversationId",
  authorization,
  rateLimiter({ points: 20, duration: 300 }),
  updateConversation
);
conversationRoute.delete(
  "/:conversationId",
  authorization,
  rateLimiter({ points: 20, duration: 300 }),
  deleteConversation
);
conversationRoute.patch(
  "/:conversationId/pin",
  authorization,
  rateLimiter({ points: 20, duration: 300 }),
  updateConversationPin
);
