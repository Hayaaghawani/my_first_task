import express from "express";
import type { AppConfig } from "./config/env";
import { ListingController } from "./controllers/listing.controller";
import { ListingsController } from "./controllers/listings.controller";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { createListingRouter } from "./routes/listing.routes";
import { createListingsRouter } from "./routes/listings.routes";

type AppDependencies = {
  config: AppConfig;
  listingController: ListingController;
  listingsController: ListingsController;
};

export function createApp(dependencies: AppDependencies) {
  const app = express();

  app.use((request, response, next) => {
    const origin = request.get("Origin");
    if (origin === dependencies.config.frontendOrigin) {
      response.set("Access-Control-Allow-Origin", dependencies.config.frontendOrigin);
      response.set("Vary", "Origin");
      response.set("Access-Control-Allow-Methods", "GET, OPTIONS"); //brief-light request
      response.set("Access-Control-Allow-Headers", "Content-Type");
    }

    if (request.method === "OPTIONS") {
      response.sendStatus(204);
      return;
    }
    next();
  });

  app.use("/api/listing", createListingRouter(dependencies.listingController));
  app.use("/listings", createListingsRouter(dependencies.listingsController));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
