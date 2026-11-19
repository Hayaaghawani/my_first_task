import type { RequestHandler } from "express";
import type {
  CityOptionsQuery,
  ListingsQuery,
} from "../schemas/listings.schema";
import { ListingsService } from "../services/listings.service";

export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}
  
  // search and cities method written as arrow functions to preserve the context of this when used as a callback
  readonly search: RequestHandler = async (_request, response) => {  //request is not used, so it is prefixed with an underscore to indicate that it is intentionally unused
    const query = response.locals.validatedQuery as ListingsQuery;   //response.locals.validatedQuery is used to access the validated query parameters that were added to the response object by the validateQuery middleware. The query is then cast to the ListingsQuery type to ensure type safety.
    const result = await this.listingsService.search(query);
    response.status(200).json(result);
  };

  readonly cities: RequestHandler = async (_request, response) => {
    const query = response.locals.validatedQuery as CityOptionsQuery;
    const cities = await this.listingsService.listCities(query);
    response.status(200).json({ cities });
  };
}
