import type { SearchAdapter, SearchQuery, SearchResponse } from "@/lib/search/types";

export class CrossrefAdapter implements SearchAdapter {
  readonly id = "crossref";
  readonly label = "Crossref";

  async search(query: SearchQuery): Promise<SearchResponse> {
    console.warn("Crossref adapter not implemented yet", query);
    return {
      results: [],
      meta: {
        total: 0,
        tookMs: 0,
        page: query.page ?? 0,
        pageSize: query.pageSize ?? 20,
      },
    };
  }
}
