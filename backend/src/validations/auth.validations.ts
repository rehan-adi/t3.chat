import { z } from "zod";

export const requestOtpSchema = z.object({
  email: z.email().toLowerCase(),
});

export const verifyOtpSchema = z.object({
  email: z.email().toLowerCase(),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only numbers"),
});
