import type { CityOptionsQuery, ListingsQuery } from "../schemas/listings.schema.js";

export type ListingItem = {
  id: number | string;
  title: string;
  price: number | string | null;
  currency: string;
  city: string;
  image: string;
  image_count: number | string;
};

export type ListingSearchResult = {
  total: number;
  items: ListingItem[];
};

export interface ListingsGateway {
  search(query: ListingsQuery): Promise<ListingSearchResult>;
  listCities(query: CityOptionsQuery): Promise<string[]>;
}
