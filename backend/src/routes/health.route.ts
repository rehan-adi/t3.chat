import { Hono } from "hono";
import { healthCheck, readinessCheck } from "@/controllers/health.controller";

export const healthRoute = new Hono();

healthRoute.get("/", healthCheck);
healthRoute.get("/readiness", readinessCheck);
