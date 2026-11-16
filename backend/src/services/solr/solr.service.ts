import { AppError, ErrorCode } from "../../errors/app-error.js";
import type { CityOptionsQuery, ListingsQuery } from "../../schemas/listings.schema.js";
import type {
  ListingItem,
  ListingSearchResult,
  ListingsGateway,
} from "../listings-gateway.js";
import { SolrQueryBuilder } from "./solr-query.builder.js";

type SolrRecord = Record<string, unknown>;
type SolrFieldValue = string | number | null | readonly (string | number | null)[];
type SolrListingDocument = {
  post_id?: SolrFieldValue;
  title_t?: SolrFieldValue;
  price_d?: SolrFieldValue;
  price_currency_code_s?: SolrFieldValue;
  city_name_s?: SolrFieldValue;
  city_name_en_s?: SolrFieldValue;
  image_uri_s?: SolrFieldValue;
  image_count_i?: SolrFieldValue;
};

const IMAGE_PREVIEW_BASE_URL = "https://arbokv2-images.sooqdev1.com/previews/640x480";

function isRecord(value: unknown): value is SolrRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstValue(value: SolrFieldValue | undefined): string | number | null {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" || typeof first === "number" ? first : null;
}

function stringValue(value: SolrFieldValue | undefined): string {
  const first = firstValue(value);
  return first === null ? "" : String(first);
}

function mapImagePath(value: SolrFieldValue | undefined): string {
  const imageUri = stringValue(value);
  return imageUri
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

function mapListingDocument(
  document: SolrListingDocument,
  language: ListingsQuery["lang"],
): ListingItem {
  const id = firstValue(document.post_id);
  if (id === null) {
    throw new AppError({
      status: 502,
      code: ErrorCode.SOLR_ERROR,
      publicMessage: "The search service returned an invalid listing.",
    });
  }

  const imagePath = mapImagePath(document.image_uri_s);
  const cityValue = language === "en"
    ? document.city_name_en_s
    : document.city_name_s;
  const imageCount = firstValue(document.image_count_i);

  return {
    id,
    title: stringValue(document.title_t),
    price: firstValue(document.price_d),
    currency: stringValue(document.price_currency_code_s),
    city: stringValue(cityValue),
    image: imagePath ? `${IMAGE_PREVIEW_BASE_URL}/${imagePath}.webp` : "",
    image_count: imageCount ?? 0,
  };
}

function asListingDocument(value: unknown): SolrListingDocument {
  if (!isRecord(value)) {
    throw new AppError({
      status: 502,
      code: ErrorCode.SOLR_ERROR,
      publicMessage: "The search service returned an invalid response.",
    });
  }
  return value as SolrListingDocument;
}

function asSolrFailure(error: unknown): AppError {
  if (error instanceof Error && error.name === "TimeoutError") {
    return new AppError({
      status: 504,
      code: ErrorCode.SOLR_TIMEOUT,
      publicMessage: "The search service took too long to respond. Please try again.",
      cause: error,
    });
  }

  return new AppError({
    status: 503,
    code: ErrorCode.SOLR_UNAVAILABLE,
    publicMessage: "The search service is temporarily unavailable. Please try again.",
    cause: error,
  });
}

export class SolrService implements ListingsGateway {
  private readonly queryBuilder: SolrQueryBuilder;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: {
    queryBuilder: SolrQueryBuilder;
    timeoutMs: number;
    fetchImpl?: typeof fetch;
  }) {
    this.queryBuilder = options.queryBuilder;
    this.timeoutMs = options.timeoutMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async search(query: ListingsQuery): Promise<ListingSearchResult> {
    const url = this.queryBuilder.buildListingsUrl({
      query,
      nowSeconds: Math.floor(Date.now() / 1000),
    });
    const body = await this.requestJson(url);
    const response = body.response;

    if (
      !isRecord(response)
      || !Number.isSafeInteger(response.numFound)
      || !Array.isArray(response.docs)
    ) {
      throw this.invalidSolrResponse("The search service returned an invalid response.");
    }

    return {
      total: response.numFound as number,
      items: response.docs.map((document) =>
        mapListingDocument(asListingDocument(document), query.lang)),
    };
  }

  async listCities(query: CityOptionsQuery): Promise<string[]> {
    const url = this.queryBuilder.buildCitiesUrl({
      query,
      nowSeconds: Math.floor(Date.now() / 1000),
    });
    const body = await this.requestJson(url);
    const facetCounts = body.facet_counts;
    const facetField = query.lang === "en" ? "city_name_en_s" : "city_name_s";
    const facetFields = isRecord(facetCounts) ? facetCounts.facet_fields : undefined;
    const values = isRecord(facetFields) ? facetFields[facetField] : undefined;

    if (!Array.isArray(values) || values.length % 2 !== 0) {
      throw this.invalidSolrResponse("The city list service returned an invalid response.");
    }

    return [...new Set(values.filter(
      (value, index): value is string => index % 2 === 0 && typeof value === "string",
    ))].sort((left, right) => left.localeCompare(right, query.lang));
  }

  private async requestJson(url: URL): Promise<SolrRecord> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw asSolrFailure(error);
    }

    if (!response.ok) {
      throw new AppError({
        status: 502,
        code: ErrorCode.SOLR_ERROR,
        publicMessage: "The search service returned an error. Please try again.",
        cause: new Error(`Solr returned HTTP ${response.status}`),
      });
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      throw this.invalidSolrResponse("The search service returned an invalid response.", error);
    }

    if (!isRecord(body)) {
      throw this.invalidSolrResponse("The search service returned an invalid response.");
    }
    return body;
  }

  private invalidSolrResponse(message: string, cause?: unknown): AppError {
    return new AppError({
      status: 502,
      code: ErrorCode.SOLR_ERROR,
      publicMessage: message,
      ...(cause === undefined ? {} : { cause }),
    });
  }
}
