/* eslint-disable camelcase */
import { RateLimiter } from "@/lib/search/rate-limiter";
import type { SearchAdapter, SearchQuery, SearchResponse, SearchResult } from "@/lib/search/types";

const PUBMED_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const DEFAULT_PAGE_SIZE = 20;
const MIN_INTERVAL_MS = 120; // ~8 requests per second

const limiter = new RateLimiter(MIN_INTERVAL_MS);

function buildSearchUrl(query: SearchQuery, apiKey?: string) {
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = query.page ?? 0;
  const params = new URLSearchParams({
    db: "pubmed",
    term: query.terms,
    retmode: "json",
    retmax: String(pageSize),
    retstart: String(page * pageSize),
    sort: "relevance",
  });

  if (query.since) {
    params.set("mindate", query.since);
  }

  if (query.until) {
    params.set("maxdate", query.until);
  }

  if (apiKey) {
    params.set("api_key", apiKey);
  }

  return `${PUBMED_BASE}/esearch.fcgi?${params.toString()}`;
}

function buildSummaryUrl(ids: string[], apiKey?: string) {
  const params = new URLSearchParams({
    db: "pubmed",
    retmode: "json",
    id: ids.join(","),
  });

  if (apiKey) {
    params.set("api_key", apiKey);
  }

  return `${PUBMED_BASE}/esummary.fcgi?${params.toString()}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  await limiter.wait();
  const response = await fetch(url, {
    headers: {
      "User-Agent": "LitRev-Vibe/0.1 (https://github.com/yaacovcorcos/LitRev-Vibe)",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`PubMed request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function mapSummaryToResults(summary: any): SearchResult[] {
  const docs = summary?.result ?? {};
  const ids: string[] = summary?.result?.uids ?? [];

  return ids.map((id) => {
    const doc = docs[id] ?? {};
    const authors: string[] = Array.isArray(doc.authors)
      ? doc.authors.map((author: any) => author.name).filter(Boolean)
      : [];

    const articleIds: any[] = Array.isArray(doc.articleids) ? doc.articleids : [];
    const doiEntry = articleIds.find((item) => item.idtype === "doi");
    const urlEntry = articleIds.find((item) => item.idtype === "url");

    return {
      externalId: id,
      source: "pubmed",
      title: doc.title ?? "",
      // PubMed esummary does not reliably include abstracts; fetch via efetch in the future
      abstract: undefined,
      authors,
      journal: doc.fulljournalname ?? doc.source ?? undefined,
      publishedAt: doc.pubdate ?? undefined,
      url: urlEntry?.value ?? (doiEntry ? `https://doi.org/${doiEntry.value}` : undefined),
      metadata: {
        doi: doiEntry?.value,
        pmid: id,
        volume: doc.volume,
        issue: doc.issue,
        pages: doc.pages,
      },
    } satisfies SearchResult;
  });
}

export class PubMedAdapter implements SearchAdapter {
  readonly id = "pubmed";
  readonly label = "PubMed";

  constructor(private readonly apiKey = process.env.NCBI_API_KEY) {}

  async search(query: SearchQuery): Promise<SearchResponse> {
    if (!query.terms || query.terms.trim().length === 0) {
      return {
        results: [],
        meta: { total: 0, tookMs: 0, page: query.page ?? 0, pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE },
      };
    }

    const start = Date.now();
    const searchUrl = buildSearchUrl(query, this.apiKey);

    type SearchJson = {
      esearchresult: {
        count: string;
        idlist: string[];
      };
    };

    const searchJson = await fetchJson<SearchJson>(searchUrl);
    const idlist = searchJson.esearchresult?.idlist ?? [];

    if (idlist.length === 0) {
      return {
        results: [],
        meta: {
          total: Number(searchJson.esearchresult?.count ?? 0),
          tookMs: Date.now() - start,
          page: query.page ?? 0,
          pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
        },
      };
    }

    const summaryUrl = buildSummaryUrl(idlist, this.apiKey);
    const summaryJson = await fetchJson<any>(summaryUrl);
    const results = mapSummaryToResults(summaryJson);

    return {
      results,
      meta: {
        total: Number(searchJson.esearchresult?.count ?? results.length),
        tookMs: Date.now() - start,
        page: query.page ?? 0,
        pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
      },
    };
  }
}
