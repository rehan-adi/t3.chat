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
  updateBillingPreference,
} from "@/controllers/settings.controller";

export const settingRoute = new Hono();

settingRoute.get(
  "/account",
  authorization,
  rateLimiter({ points: 70, duration: 300 }),
  getAccount
);
settingRoute.patch(
  "/account/billing-preferences",
  authorization,
  rateLimiter({ points: 5, duration: 300 }),
  updateBillingPreference
);
settingRoute.delete(
  "/account",
  authorization,
  rateLimiter({ points: 1, duration: 300 }),
  deleteAccount
);

settingRoute.patch(
  "/account/name",
  authorization,
  rateLimiter({ points: 10, duration: 300 }),
  updateName
);
settingRoute.patch(
  "/account/profile-picture",
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
  "/api-keys",
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
