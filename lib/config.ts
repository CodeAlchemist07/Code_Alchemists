import { z } from 'zod';

const envSchema = z.object({
  HINDSIGHT_API_KEY: z.string().optional(),
  HINDSIGHT_BASE_URL: z.string().optional(),
  HINDSIGHT_BANK_PREFIX: z.string().default('customer'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  NEXT_PUBLIC_APP_NAME: z.string().default('SupportMemory'),
});

export const env = envSchema.parse({
  HINDSIGHT_API_KEY: process.env.HINDSIGHT_API_KEY,
  HINDSIGHT_BASE_URL: process.env.HINDSIGHT_BASE_URL,
  HINDSIGHT_BANK_PREFIX: process.env.HINDSIGHT_BANK_PREFIX ?? 'customer',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? 'SupportMemory',
});

export const isHindsightConfigured = Boolean(env.HINDSIGHT_BASE_URL);
