import "dotenv/config";
import { createApp } from "./app.js";
import { ListingCache } from "./cache/listing-cache.js";
import { loadConfig } from "./config/env.js";
import { ListingController } from "./controllers/listing.controller.js";
import { ListingsController } from "./controllers/listings.controller.js";
import { createDatabase } from "./db/database.js";
import { ListingService } from "./services/listing.service.js";
import { ListingsService } from "./services/listings.service.js";
import { SolrQueryBuilder } from "./services/solr/solr-query.builder.js";
import { SolrService } from "./services/solr/solr.service.js";

const config = loadConfig();
const database = createDatabase(config.db);
const cache = new ListingCache(config.memcached);
const solrQueryBuilder = new SolrQueryBuilder(config.solrUrl);
const solrService = new SolrService({
  queryBuilder: solrQueryBuilder,
  timeoutMs: config.solrTimeoutMs,
});

const listingsService = new ListingsService(solrService);
const listingService = new ListingService({ database, cache });
const listingsController = new ListingsController(listingsService);
const listingController = new ListingController(listingService);
const app = createApp({ config, listingController, listingsController });

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
