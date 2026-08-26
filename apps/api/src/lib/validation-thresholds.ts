import { z } from "zod";

const thresholdsSchema = z.object({
  duplicateBorrowerThreshold: z.number().int().positive().default(5),
  interestRateMax: z.number().default(40),
  interestRateMin: z.number().default(0),
  staleDaysThreshold: z.number().int().positive().default(90),
});

export type ValidationThresholds = z.infer<typeof thresholdsSchema>;

export const loadThresholds = (raw?: unknown): ValidationThresholds => {
  if (raw === undefined || raw === null) {
    return thresholdsSchema.parse({});
  }
  return thresholdsSchema.parse(raw);
};

export const defaultThresholds: ValidationThresholds = thresholdsSchema.parse(
  {}
);
