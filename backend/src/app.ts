import { cors } from "hono/cors";
import { config } from "@/config/config";
import { register } from "@/lib/metrics";
import { Hono, type Context } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { requestLogger } from "@/middlewares/logger";

import { authRoute } from "@/routes/auth.route";
import { creditRoute } from "@/routes/credit.route";
import { healthRoute } from "@/routes/health.route";
import { settingRoute } from "@/routes/settings.route";
import { generatePresignedUrl } from "./utils/presign";
import { subscriptionRoute } from "@/routes/subscription.route";
import { conversationRoute } from "@/routes/conversation.route";

export const app = new Hono();

app.use(secureHeaders());
app.use(requestLogger);
app.use(
  cors({
    origin: config.FRONTEND_ORIGIN,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    maxAge: 600,
    credentials: true,
  })
);
// app.use(
//   compress({
//     encoding: "gzip",
//   })
// );

app.route("/api/v1/auth", authRoute);
app.route("/api/v1/credit", creditRoute);
app.route("/api/v1/health", healthRoute);
app.route("/api/v1/settings", settingRoute);
app.route("/api/v1/subscription", subscriptionRoute);
app.route("/api/v1/conversations", conversationRoute);

app.get("/metrics", async () => {
  return new Response(await register.metrics(), {
    headers: {
      "Content-Type": register.contentType,
    },
  });
});

/**
 * this route is for generating fucking presigned url,
 */

app.post("/api/v1/generate/presigned-url", async (c: Context) => {
  const body = await c.req.json();

  const { fileName, fileType } = body;

  if (!fileName || !fileType) {
    return c.json(
      {
        success: false,
        message: "Missing file name or type",
      },
      400
    );
  }

  const { url, publicUrl, key } = await generatePresignedUrl(
    fileName,
    fileType
  );
  return c.json({
    success: true,
    message: "Presinges url generated",
    url,
    publicUrl,
    key,
  });
});
