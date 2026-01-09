import client from "prom-client";

export const register = new client.Registry();

client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of api requests",
  labelNames: ["method", "path", "status"],
  buckets: [50, 100, 200, 500, 1000, 2000],
});

register.registerMetric(httpRequestDuration);
