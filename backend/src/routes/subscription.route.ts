import { Hono } from "hono";
import { authorization } from "@/middlewares/authorization";
import {
  initiateSubscription,
  cashfreeWebHook,
} from "@/controllers/subscription.controller";

export const subscriptionRoute = new Hono();

subscriptionRoute.post(
  "/init-subscription",
  authorization,
  initiateSubscription
);
subscriptionRoute.post("/webhook", authorization, cashfreeWebHook);
