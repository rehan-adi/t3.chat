import { Hono } from "hono";
import { rateLimiter } from "@/middlewares/limiter";
import { authorization } from "@/middlewares/authorization";
import {
  cashfreeWebHook,
  initiateSubscription,
  verifySubscriptionStatus,
} from "@/controllers/subscription.controller";

export const subscriptionRoute = new Hono();

subscriptionRoute.post(
  "/init-subscription",
  authorization,
  rateLimiter({ points: 5, duration: 300 }),
  initiateSubscription
);
subscriptionRoute.post("/webhook", cashfreeWebHook);
subscriptionRoute.get(
  "/verify/:orderId",
  authorization,
  rateLimiter({ points: 15, duration: 300 }),
  verifySubscriptionStatus
);
