import { Hono } from "hono";
import { rateLimiter } from "@/middlewares/limiter";
import { requestOtp, verifyOtp, logout } from "@/controllers/auth.controller";

export const authRoute = new Hono();

authRoute.post(
  "/request-otp",
  rateLimiter({ points: 3, duration: 300 }),
  requestOtp
);
authRoute.post(
  "/verify-otp",
  rateLimiter({ points: 3, duration: 300 }),
  verifyOtp
);
authRoute.post("/logout", logout);
