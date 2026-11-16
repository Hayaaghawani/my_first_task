import { z } from "zod";

export const listingIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "Listing ID must be a positive whole number.")
  .transform(Number)
  .refine(Number.isSafeInteger, "Listing ID is too large.");

export type ListingId = z.output<typeof listingIdSchema>;
