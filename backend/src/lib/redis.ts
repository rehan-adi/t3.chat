import Redis from "ioredis";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";

export const redisClient = new Redis(config.REDIS_URL);

redisClient.on("connect", () => {
  logger.info("Redis is connected");
});

redisClient.on("error", (error) => {
  logger.error({ error }, "Redis connection error");
});
