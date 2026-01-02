import { Hono } from "hono";
import { authorization } from "@/middlewares/authorization";
import {
  getApiKey,
  getAccount,
  updateName,
  createApiKey,
  deleteApiKey,
  deleteAccount,
  getChatHistory,
  getCustomization,
  deleteChatHistory,
  updateCustomization,
  updateProfilePicture,
} from "@/controllers/settings.controller";

export const settingRoute = new Hono();

settingRoute.get("/account", authorization, getAccount);
settingRoute.delete("/account/delete", authorization, deleteAccount);

settingRoute.patch("/update-name", authorization, updateName);
settingRoute.patch("/update-pfp", authorization, updateProfilePicture);

settingRoute.get("/customization", authorization, getCustomization);
settingRoute.patch("/customization", authorization, updateCustomization);

settingRoute.get("/api-keys", authorization, getApiKey);
settingRoute.post("/create-key", authorization, createApiKey);
settingRoute.delete("/api-keys/delete", authorization, deleteApiKey);

settingRoute.get("/chat-history", authorization, getChatHistory);
settingRoute.delete("/chat-history/delete", authorization, deleteChatHistory);
