import { Router } from "express";
import { ListingController } from "../controllers/listing.controller";
import { validateParams } from "../middleware/validate-params";
import { listingIdSchema } from "../schemas/listing-id.schema";

export function createListingRouter(controller: ListingController): Router {
  const router = Router();
  router.get("/:id", validateParams(listingIdSchema), controller.getById);
  return router;
}
