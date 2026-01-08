import { Hono } from "hono";
import { rateLimiter } from "@/middlewares/limiter";
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

settingRoute.get(
  "/account",
  authorization,
  rateLimiter({ points: 70, duration: 300 }),
  getAccount
);
settingRoute.delete(
  "/account/delete",
  authorization,
  rateLimiter({ points: 1, duration: 300 }),
  deleteAccount
);

settingRoute.patch(
  "/update-name",
  authorization,
  rateLimiter({ points: 10, duration: 300 }),
  updateName
);
settingRoute.patch(
  "/update-pfp",
  authorization,
  rateLimiter({ points: 3, duration: 300 }),
  updateProfilePicture
);

settingRoute.get(
  "/customization",
  authorization,
  rateLimiter({ points: 50, duration: 300 }),
  getCustomization
);
settingRoute.patch(
  "/customization",
  authorization,
  rateLimiter({ points: 10, duration: 300 }),
  updateCustomization
);

settingRoute.get(
  "/api-keys",
  authorization,
  rateLimiter({ points: 50, duration: 300 }),
  getApiKey
);
settingRoute.post(
  "/create-key",
  authorization,
  rateLimiter({ points: 5, duration: 300 }),
  createApiKey
);
settingRoute.delete(
  "/api-keys/delete",
  authorization,
  rateLimiter({ points: 5, duration: 300 }),
  deleteApiKey
);

settingRoute.get(
  "/chat-history",
  authorization,
  rateLimiter({ points: 50, duration: 300 }),
  getChatHistory
);
settingRoute.delete(
  "/chat-history/delete",
  authorization,
  rateLimiter({ points: 15, duration: 300 }),
  deleteChatHistory
);
