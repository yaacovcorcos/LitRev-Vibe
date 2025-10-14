export type SearchQuery = {
  terms: string;
  page?: number;
  pageSize?: number;
  since?: string;
  until?: string;
};

export type SearchResult = {
  externalId: string;
  title: string;
  abstract?: string;
  authors?: string[];
  publishedAt?: string;
  source: "pubmed" | "crossref" | string;
  url?: string;
  journal?: string;
  metadata?: Record<string, unknown>;
};

export type SearchMeta = {
  total: number;
  tookMs: number;
  page: number;
  pageSize: number;
};

export type SearchResponse = {
  results: SearchResult[];
  meta: SearchMeta;
};

export interface SearchAdapter {
  readonly id: string;
  readonly label: string;
  search(query: SearchQuery): Promise<SearchResponse>;
}
