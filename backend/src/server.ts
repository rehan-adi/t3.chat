import { app } from "@/app";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";

Bun.serve({
  fetch: app.fetch,
  port: config.PORT,
});

logger.info({
  message: "backend is running",
  port: config.PORT,
});
