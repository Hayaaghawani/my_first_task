import type { CityOptionsQuery, ListingsQuery } from "../../schemas/listings.schema.js";

type CommonQuery = Pick<ListingsQuery, "countryCore" | "category">;

function escapeSolrValue(value: string): string {
  return value.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, "\\$&");
}

function addCommonFilters(
  input: { url: URL; query: CommonQuery; nowSeconds: number },
): void {
  const { url, query, nowSeconds } = input;
  url.searchParams.append(
    "fq",
    `tag_2_reporting_name_s:${escapeSolrValue(query.category)}`,
  );
  url.searchParams.append("fq", "duplicate_i:0");
  url.searchParams.append(
    "fq",
    `record_expiration_time_i:[${nowSeconds} TO *]`,
  );
}

export class SolrQueryBuilder {
  constructor(private readonly baseUrl: string) {}

  buildListingsUrl(input: { query: ListingsQuery; nowSeconds: number }): URL {
    const { query, nowSeconds } = input;
    const url = this.createSelectUrl(query.countryCore);
    url.searchParams.set("q", "*:*");
    addCommonFilters({ url, query, nowSeconds });

    if (query.title) {
      url.searchParams.append(
        "fq",
        `title_t:"${escapeSolrValue(query.title)}"`,
      );
    }
    if (query.hasImages) url.searchParams.append("fq", "image_count_i:[1 TO *]");
    if (query.hasReels) url.searchParams.append("fq", "with_reels_i:1");
    if (query.hasVideos) url.searchParams.append("fq", "with_video_i:1");
    if (query.premium) url.searchParams.append("fq", "status_i:301");
    if (query.yearFrom !== undefined || query.yearTo !== undefined) {
      url.searchParams.append(
        "fq",
        `cp_Car_Year_value_i:[${query.yearFrom ?? "*"} TO ${query.yearTo ?? "*"}]`,
      );
    }
    if (query.priceFrom !== undefined || query.priceTo !== undefined) {
      url.searchParams.append(
        "fq",
        `price_d:[${query.priceFrom ?? "*"} TO ${query.priceTo ?? "*"}]`,
      );
      url.searchParams.append("fq", "-add_on_hide_price_i:1");
    }
    if (query.city) {
      const cityField = query.lang === "en" ? "city_name_en_s" : "city_name_s";
      url.searchParams.append(
        "fq",
        `${cityField}:"${escapeSolrValue(query.city)}"`,
      );
    }

    url.searchParams.set("sort", this.buildSort(query));
    url.searchParams.set("start", String((query.page - 1) * query.perPage));
    url.searchParams.set("rows", String(query.perPage));
    url.searchParams.set("fl", [
      "post_id",
      "title_t",
      "price_d",
      "price_currency_code_s",
      "city_name_s",
      "city_name_en_s",
      "image_uri_s",
      "image_count_i",
    ].join(","));
    url.searchParams.set("wt", "json");
    return url;
  }

  buildCitiesUrl(input: { query: CityOptionsQuery; nowSeconds: number }): URL {
    const { query, nowSeconds } = input;
    const url = this.createSelectUrl(query.countryCore);
    url.searchParams.set("q", "*:*");
    addCommonFilters({ url, query, nowSeconds });
    url.searchParams.set(
      "facet.field",
      query.lang === "en" ? "city_name_en_s" : "city_name_s",
    );
    url.searchParams.set("facet", "true");
    url.searchParams.set("facet.limit", "-1");
    url.searchParams.set("facet.mincount", "1");
    url.searchParams.set("facet.sort", "index");
    url.searchParams.set("rows", "0");
    url.searchParams.set("wt", "json");
    return url;
  }

  private createSelectUrl(countryCore: string): URL {
    const normalizedBaseUrl = this.baseUrl.endsWith("/")
      ? this.baseUrl
      : `${this.baseUrl}/`;
    return new URL(`${countryCore}/select`, normalizedBaseUrl);
  }

  private buildSort(query: ListingsQuery): string {
    return query.sortBy === "post_id"
      ? `post_id ${query.sortOrder}`
      : `record_posted_time_i ${query.sortOrder},post_id ${query.sortOrder}`;
  }
}
