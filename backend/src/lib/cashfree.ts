import { config } from "@/config/config";
import { Cashfree, CFEnvironment } from "cashfree-pg";

export const cashfree = new Cashfree(
  CFEnvironment.SANDBOX,
  config.CASHFREE_CLIENT_ID,
  config.CASHFREE_CLIENT_SECRET
);
