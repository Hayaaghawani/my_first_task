import { z } from "zod";
import { COUNTRY_CORES, type CountryCode } from "../config/countries.js";

function isCountryCode(value: string): value is CountryCode {
  return Object.hasOwn(COUNTRY_CORES, value);
}

const countrySchema = z
  .string({ error: "Country is required." })
  .trim()
  .toLowerCase()
  .refine(isCountryCode, "This country is not supported.");

const categorySchema = z
  .string({ error: "Category is required." })
  .regex(/^[A-Za-z0-9_-]+$/, "Category may contain letters, numbers, underscores, and hyphens.");

const languageSchema = z.enum(["ar", "en"], {
  error: "Language must be Arabic (ar) or English (en).",
}).default("ar");

function positiveInteger(maximum?: number, minimum = 1) {
  let schema = z
    .string()
    .regex(/^[1-9]\d*$/, "Enter a positive whole number.")
    .transform(Number)
    .refine(Number.isSafeInteger, "The number is too large.")
    .refine((value) => value >= minimum, `Enter a value of at least ${minimum}.`);

  if (maximum !== undefined) {
    schema = schema.refine(
      (value) => value <= maximum,
      `Enter a value no greater than ${maximum}.`,
    );
  }

  return schema;
}

const optionalYear = positiveInteger(2100, 1900).optional();
const optionalPrice = positiveInteger().optional();
const toggleSchema = z
  .enum(["true", "false", "1", "0"], {
    error: "Choose true, false, 1, or 0.",
  })
  .default("false")
  .transform((value) => value === "true" || value === "1");

const commonQueryShape = {
  country: countrySchema,
  category: categorySchema,
  lang: languageSchema,
};

const cityOptionsInputSchema = z.object(commonQueryShape);

export const cityOptionsQuerySchema = cityOptionsInputSchema.transform((query) => ({
  ...query,
  countryCore: COUNTRY_CORES[query.country],
}));

const listingsInputSchema = z
  .object({
    ...commonQueryShape,
    page: z.string().default("1").pipe(positiveInteger()),
    per_page: z.string().default("20").pipe(positiveInteger(50)),
    sort_by: z
      .enum(["record_posted_time_i", "post_id"], {
        error: "Choose a supported sort field.",
      })
      .default("record_posted_time_i"),
    sort_order: z.enum(["asc", "desc"], {
      error: "Sort order must be ascending (asc) or descending (desc).",
    }).default("desc"),
    title: z.string().max(200, "Title must be 200 characters or fewer.")
      .default("").transform((value) => value.trim()),
    has_images: toggleSchema,
    has_reels: toggleSchema,
    has_videos: toggleSchema,
    premium: toggleSchema,
    year_from: optionalYear,
    year_to: optionalYear,
    price_from: optionalPrice,
    price_to: optionalPrice,
    city: z.string().max(120, "City must be 120 characters or fewer.")
      .default("").transform((value) => value.trim()),
  })
  .superRefine((query, context) => {
    if (!Number.isSafeInteger((query.page - 1) * query.per_page)) {
      context.addIssue({
        code: "custom",
        path: ["page"],
        message: "Choose a smaller page number.",
      });
    }

    for (const [fromField, toField, label] of [
      ["year_from", "year_to", "year range"],
      ["price_from", "price_to", "price range"],
    ] as const) {
      const from = query[fromField];
      const to = query[toField];
      if (from !== undefined && to !== undefined && from > to) {
        context.addIssue({
          code: "custom",
          path: [fromField],
          message: `The start of the ${label} must not exceed its end.`,
        });
      }
    }
  });

export const listingsQuerySchema = listingsInputSchema.transform((query) => ({
  country: query.country,
  countryCore: COUNTRY_CORES[query.country],
  category: query.category,
  page: query.page,
  perPage: query.per_page,
  lang: query.lang,
  sortBy: query.sort_by,
  sortOrder: query.sort_order,
  title: query.title,
  hasImages: query.has_images,
  hasReels: query.has_reels,
  hasVideos: query.has_videos,
  premium: query.premium,
  yearFrom: query.year_from,
  yearTo: query.year_to,
  priceFrom: query.price_from,
  priceTo: query.price_to,
  city: query.city,
}));

export type CityOptionsQuery = z.output<typeof cityOptionsQuerySchema>;
export type ListingsQuery = z.output<typeof listingsQuerySchema>;
