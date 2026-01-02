import { Hono } from "hono";
import { authorization } from "@/middlewares/authorization";
import { checkCredits } from "@/controllers/credit.controller";

export const creditRoute = new Hono();

creditRoute.get("/check-credits", authorization, checkCredits);
