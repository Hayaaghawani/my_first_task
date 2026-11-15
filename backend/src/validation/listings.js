const { z } = require('zod');
const countries = require('../config/countries');

const positiveInteger = (maximum = Number.MAX_SAFE_INTEGER) => z
  .string()
  .regex(/^[1-9]\d*$/, 'must be a positive integer')
  .transform(Number)
  .refine(Number.isSafeInteger, 'must be a safe integer')
  .refine((value) => value <= maximum, `must be no greater than ${maximum}`);

const optionalPositiveInteger = (maximum, minimum = 1) => {
  let schema = z.string()
    .regex(/^[1-9]\d*$/, 'must be a positive integer')
    .transform(Number)
    .refine(Number.isSafeInteger, 'must be a safe integer')
    .refine((value) => value >= minimum, `must be at least ${minimum}`);
  if (maximum !== undefined) {
    schema = schema.refine((value) => value <= maximum, `must be no greater than ${maximum}`);
  }
  return schema.optional();
};

const country = z.string()
  .trim()
  .toLowerCase()
  .refine((value) => Object.hasOwn(countries, value), 'country is not supported');
const category = z.string().regex(/^[A-Za-z0-9_-]+$/, 'category must contain only letters, numbers, underscores, or hyphens');
const language = z.enum(['ar', 'en']).default('ar');
const toggle = z.enum(['true', 'false', '1', '0'])
  .default('false')
  .transform((value) => value === 'true' || value === '1');
const optionalYear = optionalPositiveInteger(2100, 1900);
const optionalPrice = optionalPositiveInteger(undefined, 1);
const listingIdSchema = z.string()
  .regex(/^[1-9]\d*$/, 'id must be a positive integer')
  .transform(Number)
  .refine(Number.isSafeInteger, 'id must be a safe integer');

const sharedQueryShape = {
  country,
  category,
  lang: language,
};

const cityOptionsSchema = z.object(sharedQueryShape).transform((value) => ({
  ...value,
  countryCore: countries[value.country],
}));

const listingsQuerySchema = z.object({
  ...sharedQueryShape,
  page: positiveInteger().default('1').transform(Number),
  per_page: positiveInteger(50).default('20').transform(Number),
  sort_by: z.enum(['record_posted_time_i', 'post_id']).default('record_posted_time_i'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  title: z.string().max(200, 'title must be no longer than 200 characters').default('').transform((value) => value.trim()),
  has_images: toggle,
  has_reels: toggle,
  has_videos: toggle,
  premium: toggle,
  year_from: optionalYear,
  year_to: optionalYear,
  price_from: optionalPrice,
  price_to: optionalPrice,
  city: z.string().max(120, 'city must be no longer than 120 characters').default('').transform((value) => value.trim()),
}).superRefine((value, ctx) => {
  if (!Number.isSafeInteger((value.page - 1) * value.per_page)) {
    ctx.addIssue({ code: 'custom', path: ['page'], message: 'page is too large' });
  }
  for (const [fromKey, toKey, fromName, toName] of [
    ['year_from', 'year_to', 'year_from', 'year_to'],
    ['price_from', 'price_to', 'price_from', 'price_to'],
  ]) {
    if (value[fromKey] !== undefined && value[toKey] !== undefined && value[fromKey] > value[toKey]) {
      ctx.addIssue({ code: 'custom', path: [fromName], message: `${fromName} must be less than or equal to ${toName}` });
    }
  }
}).transform((value) => ({
  country: value.country,
  countryCore: countries[value.country],
  category: value.category,
  page: value.page,
  perPage: value.per_page,
  lang: value.lang,
  sortBy: value.sort_by,
  sortOrder: value.sort_order,
  title: value.title,
  hasImages: value.has_images,
  hasReels: value.has_reels,
  hasVideos: value.has_videos,
  premium: value.premium,
  yearFrom: value.year_from,
  yearTo: value.year_to,
  priceFrom: value.price_from,
  priceTo: value.price_to,
  city: value.city,
}));

function validationResult(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return { value: result.data };

  const issue = result.error.issues[0];
  const field = issue.path[0] || 'query';
  let message = issue.message;
  if (issue.code === 'invalid_type') {
    message = input[field] === undefined
      ? `${field} is required`
      : `${field} must be a single value of the expected type`;
  }
  return { error: { field, message } };
}

function validateListingsQuery(query) {
  return validationResult(listingsQuerySchema, query);
}

function validateCityOptionsQuery(query) {
  return validationResult(cityOptionsSchema, query);
}

module.exports = {
  cityOptionsSchema,
  listingIdSchema,
  listingsQuerySchema,
  validateCityOptionsQuery,
  validateListingsQuery,
};
