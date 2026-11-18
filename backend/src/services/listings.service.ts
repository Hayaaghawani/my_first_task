import type { CityOptionsQuery, ListingsQuery } from "../schemas/listings.schema";
import type {
  ListingItem,
  ListingsGateway,
} from "./listings-gateway.js";

export type ListingsResponse = {
  items: ListingItem[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
  };
};

export function getPagingMeta(input: {
  page: number;
  perPage: number;
  total: number;
}): ListingsResponse["meta"] {
  const { page, perPage, total } = input;
  const totalPages = Math.ceil(total / perPage);
  return {
    page,
    per_page: perPage,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
  };
}

export class ListingsService {
  constructor(private readonly gateway: ListingsGateway) {}

  async search(query: ListingsQuery): Promise<ListingsResponse> {
    const result = await this.gateway.search(query);
    return {
      items: result.items,
      meta: getPagingMeta({
        page: query.page,
        perPage: query.perPage,
        total: result.total,
      }),
    };
  }

  listCities(query: CityOptionsQuery): Promise<string[]> {
    return this.gateway.listCities(query);
  }
}
