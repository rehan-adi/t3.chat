import { Hono } from "hono";
import { getAllModels } from "@/controllers/model.controller";

export const modelRoute = new Hono();

modelRoute.get("/", getAllModels);
