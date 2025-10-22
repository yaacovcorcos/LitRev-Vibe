import { afterEach, describe, expect, it, vi } from "vitest";

import { CrossrefAdapter } from "@/lib/search/adapters/crossref";

const adapter = new CrossrefAdapter();

describe("CrossrefAdapter", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("returns empty results when query terms are missing", async () => {
    const result = await adapter.search({ terms: "" });
    expect(result.results).toEqual([]);
    expect(result.meta.total).toBe(0);
  });

  it("fetches and maps search results from Crossref", async () => {
    const mockResponse = {
      message: {
        "total-results": 1,
        items: [
          {
            DOI: "10.1000/example",
            title: ["Example Trial"],
            author: [
              { given: "Jane", family: "Doe" },
              { given: "John", family: "Smith" },
            ],
            abstract: "<jats:p>Lorem ipsum</jats:p>",
            "container-title": ["Journal of Testing"],
            issued: { "date-parts": [[2024, 5, 1]] },
            URL: "https://doi.org/10.1000/example",
            publisher: "Testing Press",
            ISSN: ["1234-5678"],
            subject: ["Testing"],
          },
        ],
      },
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const result = await adapter.search({
      terms: "hypertension",
      page: 1,
      pageSize: 5,
      since: "2020-01-01",
      until: "2024-12-31",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [requestedUrl, requestInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const url = new URL(requestedUrl);
    expect(url.origin + url.pathname).toBe("https://api.crossref.org/works");
    expect(url.searchParams.get("query")).toBe("hypertension");
    expect(url.searchParams.get("rows")).toBe("5");
    expect(url.searchParams.get("offset")).toBe(String(5));
    expect(url.searchParams.get("filter")).toBe("from-pub-date:2020-01-01,until-pub-date:2024-12-31");
    expect(requestInit?.headers).toMatchObject({
      "User-Agent": expect.stringContaining("mailto:"),
    });

    expect(result.meta.total).toBe(1);
    expect(result.results).toHaveLength(1);
    const entry = result.results[0];
    expect(entry.externalId).toBe("10.1000/example");
    expect(entry.title).toBe("Example Trial");
    expect(entry.authors).toEqual(["Jane Doe", "John Smith"]);
    expect(entry.abstract).toBe("Lorem ipsum");
    expect(entry.journal).toBe("Journal of Testing");
    expect(entry.publishedAt).toBe("2024-05-01");
    expect(entry.url).toBe("https://doi.org/10.1000/example");
    expect(entry.metadata).toMatchObject({
      doi: "10.1000/example",
      publisher: "Testing Press",
      issn: ["1234-5678"],
      subject: ["Testing"],
    });
  });

  it("throws when Crossref responds with a non-OK status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("error", {
        status: 429,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    await expect(adapter.search({ terms: "hypertension" })).rejects.toThrow(/Crossref request failed/);
  });

  it("generates unique fallback ids when identifiers are missing", async () => {
    const mockResponse = {
      message: {
        items: [
          {},
          {},
        ],
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await adapter.search({ terms: "unknown" });
    expect(result.results).toHaveLength(2);
    expect(result.results[0].externalId).toBe("crossref:unknown:0");
    expect(result.results[1].externalId).toBe("crossref:unknown:1");
  });
});
