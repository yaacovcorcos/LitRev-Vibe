# Search Adapters

LitRev-Vibe currently supports two literature search adapters—PubMed and Crossref—exposed through the triage workspace and background search jobs. This document captures the contract, rate limits, and notable implementation details for each adapter.

---

## Shared Contract

All adapters implement `SearchAdapter` from `src/lib/search/types.ts`:

- `id`: unique adapter identifier (e.g., `pubmed`, `crossref`).
- `label`: human-friendly name rendered in the UI.
- `search(query: SearchQuery): Promise<SearchResponse>`:
  - `SearchQuery` includes `terms`, optional paging (`page`, `pageSize`), and optional date filters (`since`, `until`).
  - `SearchResponse` returns normalized `SearchResult[]` plus metadata (`total`, `page`, `pageSize`, `tookMs`).

Adapters are registered in `src/lib/search/index.ts` and consumed by:

- `/api/projects/:id/search` (enqueue search jobs).
- `src/app/project/[id]/triage/page.tsx` (queued via React Query hook for manual triage).

All adapters must:

- Respect the upstream provider’s rate limits using the shared `RateLimiter`.
- Populate `metadata` with an identifier suitable for downstream integrity checks and ledger provenance.
- Return an empty result set (not an error) when query terms are missing.

---

## PubMed Adapter

- File: `src/lib/search/adapters/pubmed.ts`
- Endpoint: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/{esearch,esummary}.fcgi`
- Default page size: 20
- Rate limit: 1 request per 120 ms (≈8 req/sec) with optional `NCBI_API_KEY` for higher throughput.
- Metadata: DOI, PMID, volume, issue, page numbers.
- Limitations:
  - Abstracts are not returned via `esummary`—future enhancement will use `efetch`.
  - Date filtering leverages `mindate`/`maxdate` query parameters.

---

## Crossref Adapter

- File: `src/lib/search/adapters/crossref.ts`
- Endpoint: `https://api.crossref.org/works`
- Default page size: 20
- Rate limit: 1 request per 120 ms (≈8 req/sec) enforced by `RateLimiter`.
- Request parameters:
  - `query`: raw search terms.
  - `rows` / `offset`: paging controls.
  - `filter`: `from-pub-date` / `until-pub-date` when provided.
  - `select`: limits response payload to fields used downstream.
- Normalization:
  - Title, authors, journal, publication date, DOI, and URL mapped onto `SearchResult`.
  - Abstract values are sanitised (JATS/XML tags stripped).
  - Metadata includes publisher, type, ISSN/ISBN, subject headings.
- Error handling: Non-2xx responses throw `Crossref request failed: <status>`.
- Tests: `src/lib/search/adapters/crossref.test.ts` mocks fetch to verify URL construction and mapping logic.

---

## Future Enhancements

- Dynamic adapter selection in the triage UI (Milestone 2 follow-up).
- Supplemental adapters for preprint servers and clinical trial registries.
- Resilient retry/backoff strategies when providers throttle requests.
