import jwt from "jsonwebtoken";
import { getCookie } from "hono/cookie";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";
import type { Context, Next } from "hono";

export const authorization = async (c: Context, next: Next) => {
  try {
    const token = getCookie(c, "token");

    if (!token) {
      return c.json(
        {
          success: false,
          message: "Unauthorized",
        },
        401,
      );
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      id: string;
      email: string;
    };

    c.set("user", decoded);

    await next();
  } catch (error) {
    logger.error(
      {
        error,
      },
      "JWT verification failed on authorization middleware",
    );
    return c.json(
      {
        success: false,
        message: "Invalid or expired token",
        error: error,
      },
      401,
    );
  }
};
