import { z } from 'zod';

const optionalInteger = ({ min, max }) => z.string()
  .refine((value) => value === '' || /^[1-9]\d*$/.test(value), 'Enter a positive whole number.')
  .refine((value) => value === '' || Number.isSafeInteger(Number(value)), 'This number is too large.')
  .refine((value) => value === '' || Number(value) >= min, `Enter a value of at least ${min}.`)
  .refine((value) => value === '' || max === undefined || Number(value) <= max,
    max === undefined ? 'Invalid number.' : `Enter a value no greater than ${max}.`);

export const listingsInputSchema = z.object({
  country: z.string().trim().min(1, 'Country is required.'),
  category: z.string().regex(/^[A-Za-z0-9_-]+$/, 'Category has an invalid format.'),
  page: z.string().regex(/^[1-9]\d*$/, 'Page must be a positive whole number.')
    .refine((value) => Number.isSafeInteger(Number(value)), 'Page is too large.'),
  perPage: z.string().regex(/^[1-9]\d*$/, 'Page size must be a positive whole number.')
    .refine((value) => Number(value) <= 50, 'Page size cannot exceed 50.'),
  lang: z.enum(['ar', 'en']),
  sortBy: z.enum(['record_posted_time_i', 'post_id']),
  sortOrder: z.enum(['asc', 'desc']),
  title: z.string().max(200, 'Title cannot exceed 200 characters.'),
  city: z.string().max(120, 'City cannot exceed 120 characters.'),
  yearFrom: optionalInteger({ min: 1900, max: 2100 }),
  yearTo: optionalInteger({ min: 1900, max: 2100 }),
  priceFrom: optionalInteger({ min: 1 }),
  priceTo: optionalInteger({ min: 1 }),
  hasImages: z.enum(['true', 'false', '1', '0']),
  hasReels: z.enum(['true', 'false', '1', '0']),
  hasVideos: z.enum(['true', 'false', '1', '0']),
  premium: z.enum(['true', 'false', '1', '0']),
}).superRefine((value, ctx) => {
  for (const [from, to, field] of [
    ['yearFrom', 'yearTo', 'year_from'],
    ['priceFrom', 'priceTo', 'price_from'],
  ]) {
    if (value[from] && value[to] && Number(value[from]) > Number(value[to])) {
      ctx.addIssue({ code: 'custom', path: [field], message: `${field} must not exceed its upper bound.` });
    }
  }
});

export const listingIdSchema = z.string()
  .regex(/^[1-9]\d*$/, 'Invalid ID')
  .refine((value) => Number.isSafeInteger(Number(value)), 'Invalid ID');

export function validateListingsInput(input) {
  const result = listingsInputSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  const issue = result.error.issues[0];
  return { success: false, field: issue.path[0], message: issue.message };
}
