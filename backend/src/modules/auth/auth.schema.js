import { z } from "zod";

const normalizedEmail = z.string().trim().toLowerCase().email();

export const signupSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
  email: normalizedEmail,
});

export const verifyOtpSchema = z.object({
  email: normalizedEmail,
  otp: z.string().trim().regex(/^\d{6}$/),
});

export const resetPasswordSchema = z.object({
  email: normalizedEmail,
  otp: z.string().trim().regex(/^\d{6}$/),
  password: z.string().min(8).max(128),
});
