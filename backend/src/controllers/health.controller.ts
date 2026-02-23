import type { Context } from "hono";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";
import { redisClient } from "@/lib/redis";

enum STATUS {
  UP = "UP",
  DOWN = "DOWN",
}

export const healthCheck = (c: Context) => {
  return c.json(
    {
      success: true,
      message: "Server is up and running",
      uptime: process.uptime(),
    },
    200,
  );
};

export const readinessCheck = async (c: Context) => {
  const status: {
    database: STATUS;
    redis_cache: STATUS;
  } = {
    database: STATUS.UP,
    redis_cache: STATUS.UP,
  };

  try {
    try {
      await prisma.$connect();
    } catch (error) {
      status.database = STATUS.DOWN;
      logger.error({ error }, "Database health check failed");
    }

    try {
      await redisClient.ping();
    } catch (error) {
      status.redis_cache = STATUS.DOWN;
      logger.error({ error }, "Redis health check failed");
    }

    const isReady =
      status.database === STATUS.UP && status.redis_cache === STATUS.UP;

    return c.json(
      {
        success: isReady,
        status,
      },
      isReady ? 200 : 503,
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "readinessCheck controller failed",
    );
    return c.json(
      {
        success: false,
        message: "Internal server error",
        error: config.NODE_ENV === "development" ? error : undefined,
      },
      500,
    );
  }
};
