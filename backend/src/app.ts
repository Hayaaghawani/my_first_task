import express from "express";
import type { AppConfig } from "./config/env.js";
import { ListingController } from "./controllers/listing.controller.js";
import { ListingsController } from "./controllers/listings.controller.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { createListingRouter } from "./routes/listing.routes.js";
import { createListingsRouter } from "./routes/listings.routes.js";

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
      response.set("Access-Control-Allow-Methods", "GET, OPTIONS");
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
