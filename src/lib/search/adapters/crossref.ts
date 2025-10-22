import { RateLimiter } from "@/lib/search/rate-limiter";
import type { SearchAdapter, SearchQuery, SearchResponse, SearchResult } from "@/lib/search/types";

const CROSSREF_BASE = "https://api.crossref.org/works";
const DEFAULT_PAGE_SIZE = 20;
const MIN_INTERVAL_MS = 120; // ~8 req/sec

const limiter = new RateLimiter(MIN_INTERVAL_MS);

export class CrossrefAdapter implements SearchAdapter {
  readonly id = "crossref";
  readonly label = "Crossref";

  async search(query: SearchQuery): Promise<SearchResponse> {
    if (!query.terms || query.terms.trim().length === 0) {
      return {
        results: [],
        meta: {
          total: 0,
          tookMs: 0,
          page: query.page ?? 0,
          pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
        },
      };
    }

    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const page = query.page ?? 0;

    const url = buildSearchUrl(query, pageSize, page);
    const startedAt = Date.now();
    const json = await fetchJson(url);
    const items = Array.isArray(json?.message?.items) ? json.message.items : [];
    const total = typeof json?.message?.["total-results"] === "number" ? json.message["total-results"] : items.length;

    const results = items.map((item, index) => mapCrossrefItemToResult(item, index, page, pageSize));

    return {
      results,
      meta: {
        total,
        tookMs: Date.now() - startedAt,
        page,
        pageSize,
      },
    };
  }
}

type CrossrefItem = {
  DOI?: string;
  title?: string[];
  author?: Array<{ given?: string; family?: string }>;
  abstract?: string;
  "container-title"?: string[];
  issued?: { "date-parts"?: Array<Array<number>> };
  created?: { "date-time"?: string };
  URL?: string;
  type?: string;
  publisher?: string;
  ISSN?: string[];
  ISBN?: string[];
  subject?: string[];
};

type CrossrefResponse = {
  message?: {
    "total-results"?: number;
    items?: CrossrefItem[];
  };
};

function buildSearchUrl(query: SearchQuery, pageSize: number, page: number) {
  const params = new URLSearchParams({
    query: query.terms,
    rows: String(pageSize),
  });

  if (page > 0) {
    params.set("offset", String(page * pageSize));
  }

  const filters: string[] = [];

  if (query.since) {
    filters.push(`from-pub-date:${query.since}`);
  }

  if (query.until) {
    filters.push(`until-pub-date:${query.until}`);
  }

  if (filters.length > 0) {
    params.set("filter", filters.join(","));
  }

  params.set("select", [
    "DOI",
    "title",
    "author",
    "abstract",
    "container-title",
    "issued",
    "created",
    "URL",
    "type",
    "publisher",
    "ISSN",
    "ISBN",
    "subject",
  ].join(","));

  return `${CROSSREF_BASE}?${params.toString()}`;
}

const CROSSREF_CONTACT_EMAIL = process.env.CROSSREF_CONTACT_EMAIL?.trim() || "support@litrev-vibe.invalid";
const CROSSREF_USER_AGENT = `LitRev-Vibe/0.1 (https://github.com/yaacovcorcos/LitRev-Vibe; mailto:${CROSSREF_CONTACT_EMAIL})`;

async function fetchJson(url: string): Promise<CrossrefResponse> {
  await limiter.wait();

  const response = await fetch(url, {
    headers: {
      "User-Agent": CROSSREF_USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Crossref request failed: ${response.status}`);
  }

  return (await response.json()) as CrossrefResponse;
}

function mapCrossrefItemToResult(item: CrossrefItem, index: number, page: number, pageSize: number): SearchResult {
  const doi = item.DOI ?? "";
  const title = Array.isArray(item.title) && item.title.length > 0 ? item.title[0]?.trim() ?? "" : "";
  const authors = Array.isArray(item.author)
    ? item.author
        .map((author) => {
          const given = author?.given?.trim() ?? "";
          const family = author?.family?.trim() ?? "";
          return [given, family].filter(Boolean).join(" ").trim();
        })
        .filter((name) => name.length > 0)
    : [];

  const journal =
    Array.isArray(item["container-title"]) && item["container-title"].length > 0
      ? item["container-title"][0]?.trim()
      : undefined;

  const publishedAt = extractPublishedDate(item);
  const abstractText = sanitizeAbstract(item.abstract);

  const globalIndex = page * pageSize + index;
  const externalId =
    doi ||
    item.URL ||
    (title ? `crossref:${title.toLowerCase()}` : undefined) ||
    `crossref:unknown:${globalIndex}`;

  return {
    externalId,
    title,
    abstract: abstractText ?? undefined,
    authors,
    journal,
    publishedAt,
    source: "crossref",
    url: item.URL ?? (doi ? `https://doi.org/${doi}` : undefined),
    metadata: {
      doi,
      type: item.type,
      publisher: item.publisher,
      issn: item.ISSN,
      isbn: item.ISBN,
      subject: item.subject,
    },
  };
}

function extractPublishedDate(item: CrossrefItem): string | undefined {
  const dateParts = item.issued?.["date-parts"];
  if (Array.isArray(dateParts) && dateParts.length > 0 && Array.isArray(dateParts[0])) {
    const [year, month, day] = dateParts[0];
    const normalizedMonth = month?.toString().padStart(2, "0");
    const normalizedDay = day?.toString().padStart(2, "0");

    if (year && month && day) {
      return `${year}-${normalizedMonth}-${normalizedDay}`;
    }

    if (year && month) {
      return `${year}-${normalizedMonth}`;
    }

    if (year) {
      return `${year}`;
    }
  }

  const dateTime = item.created?.["date-time"];
  if (dateTime) {
    return dateTime.split("T")[0];
  }

  return undefined;
}

function sanitizeAbstract(abstract?: string) {
  if (!abstract || typeof abstract !== "string") {
    return null;
  }

  const text = abstract
    .replace(/<\/?jats:[^>]+>/g, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > 0 ? text : null;
}
