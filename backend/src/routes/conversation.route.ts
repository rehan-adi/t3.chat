import { Hono } from "hono";
import { authorization } from "@/middlewares/authorization";
import {
  getAllConversation,
  getConversationById,
  updateConversation,
  deleteConversation,
  updateConversationPin,
  conversationChatController
} from "@/controllers/conversation.controller";

export const conversationRoute = new Hono();

conversationRoute.get("/", authorization, getAllConversation);
conversationRoute.post("/", authorization, conversationChatController); // need to work here mainly 
conversationRoute.get("/:conversationId", authorization, getConversationById);
conversationRoute.patch("/:conversationId", authorization, updateConversation);
conversationRoute.delete("/:conversationId", authorization, deleteConversation);
conversationRoute.patch("/:conversationId/pin", authorization, updateConversationPin);
