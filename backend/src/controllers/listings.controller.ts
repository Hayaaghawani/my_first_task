import type { RequestHandler } from "express";
import type {
  CityOptionsQuery,
  ListingsQuery,
} from "../schemas/listings.schema.js";
import { ListingsService } from "../services/listings.service.js";

export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  readonly search: RequestHandler = async (_request, response) => {
    const query = response.locals.validatedQuery as ListingsQuery;
    const result = await this.listingsService.search(query);
    response.status(200).json(result);
  };

  readonly cities: RequestHandler = async (_request, response) => {
    const query = response.locals.validatedQuery as CityOptionsQuery;
    const cities = await this.listingsService.listCities(query);
    response.status(200).json({ cities });
  };
}
