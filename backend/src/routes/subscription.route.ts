import { Hono } from "hono";
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
  initiateSubscription
);
subscriptionRoute.post("/webhook", cashfreeWebHook);
subscriptionRoute.get(
  "/verify/:orderId",
  authorization,
  verifySubscriptionStatus
);
