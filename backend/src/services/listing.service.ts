import type { Pool, RowDataPacket } from "mysql2/promise";
import type { ListingId } from "../schemas/listing-id.schema.js";
import { CUSTOM_PARAMS, BASIC_LISTING } from "../queries/listing.js";
import { ListingCache } from "../cache/listing-cache.js";
import { AppError, ErrorCode } from "../errors/app-error.js";

const LISTING_CACHE_TTL_SECONDS = 3600;

type BasicListingRow = RowDataPacket & {
  id: number;
  title: string;
  description: string | null;
  price_amount: number | null;
  price_currency: string | null;
  has_price: number | boolean;
  city_id: number | null;
  city_name: string | null;
  neighborhood_id: number | null;
  neighborhood_name: string | null;
};

type CustomParamRow = RowDataPacket & {
  field_name: string;
  option_label_ar: string | null;
  option_label_en: string | null;
  value_1_integer: number | null;
  value_1_double: number | null;
  value_string: string | null;
  value_text: string | null;
  value_date_1: string | Date | null;
  unit: string | null;
};

export type ListingDetails = {
  id: number;
  title: string;
  description: string | null;
  price: {
    amount: number | null;
    currency: string | null;
    has_price: boolean;
  };
  city: { id: number | null; name: string | null };
  neighborhood: { id: number | null; name: string | null };
  custom_params: Array<{
    field_name: string;
    value: unknown;
    option_label_ar: string | null;
    option_label_en: string | null;
    unit: string | null;
  }>;
};

function pickValue(row: CustomParamRow): unknown {
  if (row.value_1_integer !== null) return row.value_1_integer;
  if (row.value_1_double !== null) return row.value_1_double;
  if (row.value_string !== null) return row.value_string;
  if (row.value_text !== null) return row.value_text;
  if (row.value_date_1 !== null) return row.value_date_1;
  return null;
}

function toCustomParam(row: CustomParamRow): ListingDetails["custom_params"][number] {
  return {
    field_name: row.field_name,
    value: pickValue(row),
    option_label_ar: row.option_label_ar,
    option_label_en: row.option_label_en,
    unit: row.unit,
  };
}

function toListing(
  row: BasicListingRow,
  customParams: ListingDetails["custom_params"],
): ListingDetails {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: {
      amount: row.price_amount,
      currency: row.price_currency,
      has_price: Boolean(row.has_price),
    },
    city: { id: row.city_id, name: row.city_name },
    neighborhood: { id: row.neighborhood_id, name: row.neighborhood_name },
    custom_params: customParams,
  };
}

export class ListingService {
  private readonly database: Pool;
  private readonly cache: ListingCache;

  constructor(dependencies: { database: Pool; cache: ListingCache }) {
    this.database = dependencies.database;
    this.cache = dependencies.cache;
  }

  async getById(id: ListingId): Promise<ListingDetails | null> {
    try {
      const cacheKey = `listing:${id}`;
      const cachedListing = await this.cache.get<ListingDetails>(cacheKey);
      if (cachedListing !== null) return cachedListing;

      const [listingRows] = await this.database.query<BasicListingRow[]>(BASIC_LISTING, [id]);
      const listingRow = listingRows[0];
      if (listingRow === undefined) return null;

      const [customRows] = await this.database.query<CustomParamRow[]>(CUSTOM_PARAMS, [id]);
      const listing = toListing(listingRow, customRows.map(toCustomParam));
      await this.cache.set({
        key: cacheKey,
        value: listing,
        ttlSeconds: LISTING_CACHE_TTL_SECONDS,
      });
      return listing;
    } catch (cause) {
      if (cause instanceof AppError) throw cause;
      throw new AppError({
        status: 500,
        code: ErrorCode.INTERNAL,
        publicMessage: "We couldn't load this listing right now. Please try again.",
        cause,
      });
    }
  }
}
