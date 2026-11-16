import { Router } from "express";
import { ListingController } from "../controllers/listing.controller.js";
import { validateParams } from "../middleware/validate-params.js";
import { listingIdSchema } from "../schemas/listing-id.schema.js";

export function createListingRouter(controller: ListingController): Router {
  const router = Router();
  router.get("/:id", validateParams(listingIdSchema), controller.getById);
  return router;
}
