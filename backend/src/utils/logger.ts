import pino from "pino";
import { config } from "@/config/config";

const isDev = config.NODE_ENV !== "production";

export const logger = pino({
  level: Bun.env.LOG_LEVEL || "info",
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
        },
      }
    : undefined,
});
