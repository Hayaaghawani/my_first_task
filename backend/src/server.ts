import "dotenv/config";
import { createApp } from "./app";
import { ListingCache } from "./cache/listing-cache";
import { loadConfig } from "./config/env";
import { ListingController } from "./controllers/listing.controller";
import { ListingsController } from "./controllers/listings.controller";
import { createDatabase } from "./db/database";
import { ListingService } from "./services/listing.service";
import { ListingsService } from "./services/listings.service";
import { SolrQueryBuilder } from "./services/solr/solr-query.builder";
import { SolrService } from "./services/solr/solr.service";

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
