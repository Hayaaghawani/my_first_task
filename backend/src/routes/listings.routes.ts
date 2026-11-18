import { Router } from "express";
import { ListingsController } from "../controllers/listings.controller";
import { validateQuery } from "../middleware/validate-query";
import {
  cityOptionsQuerySchema,
  listingsQuerySchema,
} from "../schemas/listings.schema.js";

export function createListingsRouter(controller: ListingsController): Router {
  const router = Router();

  router.get(
    "/cities",
    validateQuery(cityOptionsQuerySchema),
    controller.cities,
  );
  router.get(
    "/",
    validateQuery(listingsQuerySchema),
    controller.search,
  );

  return router;
}