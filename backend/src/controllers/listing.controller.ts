import type { RequestHandler } from "express";
import { AppError, ErrorCode } from "../errors/app-error.js";
import type { ListingId } from "../schemas/listing-id.schema.js";
import { ListingService } from "../services/listing.service.js";

export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  readonly getById: RequestHandler = async (_request, response) => {
    const id = response.locals.validatedParams as ListingId;
    const listing = await this.listingService.getById(id);
    if (listing === null) {
      throw new AppError({
        status: 404,
        code: ErrorCode.LISTING_NOT_FOUND,
        publicMessage: "We couldn’t find a listing with that ID.",
      });
    }

    response.status(200).json(listing);
  };
}
