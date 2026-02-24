import { Hono } from "hono";
import { rateLimiter } from "@/middlewares/limiter";
import { authorization } from "@/middlewares/authorization";
import {
  moveConversation,
  getAllConversation,
  getConversationById,
  deleteConversation,
  archiveConversation,
  unarchiveConversation,
  updateConversationPin,
  renameConversationTitle,
  getArchivedConversations,
  conversationChatController,
  deleteArchivedConversation,
  deleteAllArchivedConversations,
} from "@/controllers/conversation.controller";

export const conversationRoute = new Hono();

conversationRoute.patch(
  "/move",
  authorization,
  rateLimiter({ points: 20, duration: 300 }),
  moveConversation,
);

conversationRoute.get(
  "/",
  authorization,
  rateLimiter({ points: 100, duration: 300 }),
  getAllConversation,
);
conversationRoute.get(
  "/:conversationId",
  authorization,
  rateLimiter({ points: 35, duration: 300 }),
  getConversationById,
);
conversationRoute.post(
  "/",
  authorization,
  rateLimiter({ points: 25, duration: 300 }),
  conversationChatController,
); // need to work here mainly
conversationRoute.patch(
  "/:conversationId/rename",
  authorization,
  rateLimiter({ points: 20, duration: 300 }),
  renameConversationTitle,
);
conversationRoute.delete(
  "/:conversationId",
  authorization,
  rateLimiter({ points: 20, duration: 300 }),
  deleteConversation,
);
conversationRoute.patch(
  "/:conversationId/pin",
  authorization,
  rateLimiter({ points: 20, duration: 300 }),
  updateConversationPin,
);
conversationRoute.patch(
  "/:conversationId/archive",
  authorization,
  rateLimiter({ points: 30, duration: 300 }),
  archiveConversation,
);
conversationRoute.patch(
  "/:conversationId/unarchive",
  authorization,
  rateLimiter({ points: 30, duration: 300 }),
  unarchiveConversation,
);
conversationRoute.get(
  "/archived",
  authorization,
  rateLimiter({ points: 100, duration: 300 }),
  getArchivedConversations,
);
conversationRoute.delete(
  "/:conversationId/archive",
  authorization,
  rateLimiter({ points: 10, duration: 300 }),
  deleteArchivedConversation,
);
conversationRoute.delete(
  "/archived",
  authorization,
  rateLimiter({ points: 5, duration: 300 }),
  deleteAllArchivedConversations,
);
