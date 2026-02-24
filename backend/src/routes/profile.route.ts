import { Hono } from "hono";
import { rateLimiter } from "@/middlewares/limiter";
import { authorization } from "@/middlewares/authorization";
import {
  createProfile,
  deleteProfile,
  updateProfileName,
  changeActiveProfile,
} from "@/controllers/profile.controller";

export const profileRoute = new Hono();

profileRoute.post(
  "/",
  authorization,
  rateLimiter({ points: 3, duration: 300 }),
  createProfile,
);
profileRoute.patch(
  "/:profileId/active",
  authorization,
  rateLimiter({ points: 50, duration: 300 }),
  changeActiveProfile,
);
profileRoute.put(
  "/:profileId",
  authorization,
  rateLimiter({ points: 5, duration: 300 }),
  updateProfileName,
);
profileRoute.delete(
  "/:profileId",
  authorization,
  rateLimiter({ points: 5, duration: 300 }),
  deleteProfile,
);
