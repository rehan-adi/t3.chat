import { randomUUID } from "crypto";
import { getConnInfo } from "hono/bun";
import { logger } from "@/utils/logger";
import type { Context, Next } from "hono";

export const requestLogger = async (c: Context, next: Next) => {
  const ip = getConnInfo(c);
  const requestId = randomUUID();

  const start = Date.now();

  c.set("requestId", requestId);
  c.set("ip", ip.remote.address);

  logger.info(
    {
      ip: ip.remote.address,
      requestId,
      path: c.req.path,
      method: c.req.method,
    },
    "Incoming request"
  );

  await next();

  const duration = Date.now() - start;

  logger.info(
    {
      ip: ip.remote.address,
      requestId,
      path: c.req.path,
      method: c.req.method,
      statusCode: c.res.status,
      duration: `${duration} ms`,
    },
    "Request completed"
  );
};
