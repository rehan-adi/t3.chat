import type { Context, Next } from "hono";
import { redisClient } from "@/lib/redis";
import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";

type BlockOptions = {
  points?: number;
  duration?: number;
  blockDuration?: number;
  keyPrefix?: string;
};

export const rateLimiter = ({ 
  points = 3,
  duration = 600,
  blockDuration = 600,
  keyPrefix = "ratelimit",
}: BlockOptions = {}) => {
  const limiter = new RateLimiterRedis({
    storeClient: redisClient,
    points,
    duration,
    blockDuration,
    keyPrefix,
  });

  return async (c: Context, next: Next) => {
    const key =
      c.req.header("x-forwarded-for") ||
      c.req.header("cf-connecting-ip") ||
      c.req.header("host") ||
      "unknown-ip";

    try {
      await limiter.consume(key);
      await next();
    } catch (_err: unknown) {
      const err = _err as RateLimiterRes;

      return c.json(
        {
          success: false,
          message: "Too many requests. Please wait and try again.",
          retryAfter: err.msBeforeNext / 1000,
        },
        429
      );
    }
  };
};
