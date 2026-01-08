import { Hono } from "hono";
import { rateLimiter } from "@/middlewares/limiter";
import { authorization } from "@/middlewares/authorization";
import { checkCredits } from "@/controllers/credit.controller";

export const creditRoute = new Hono();

creditRoute.get(
  "/check-credits",
  authorization,
  rateLimiter({ points: 100, duration: 300 }),
  checkCredits
);
