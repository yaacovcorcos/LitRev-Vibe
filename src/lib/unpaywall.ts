import { RateLimiter } from "@/lib/search/rate-limiter";

export type UnpaywallRecord = {
  doi: string;
  isOpenAccess: boolean;
  bestOALink?: string;
  license?: string | null;
  oaStatus?: string | null;
  source?: string | null;
};

const limiter = new RateLimiter(200); // ~5 requests/sec

export async function fetchUnpaywallRecord(doi: string): Promise<UnpaywallRecord | null> {
  const email = process.env.UNPAYWALL_EMAIL;
  if (!email || !doi) {
    return null;
  }

  const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`;

  await limiter.wait();
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "LitRev-Vibe/0.1 (https://github.com/yaacovcorcos/LitRev-Vibe)",
    },
  });

  if (!response.ok) {
    return null;
  }

  type UnpaywallJson = {
    is_oa: boolean;
    best_oa_location?: {
      url?: string;
      license?: string | null;
      source?: string | null;
    } | null;
    oa_status?: string | null;
  };

  const json = (await response.json()) as UnpaywallJson;

  return {
    doi,
    isOpenAccess: json.is_oa ?? false,
    bestOALink: json.best_oa_location?.url ?? undefined,
    license: json.best_oa_location?.license ?? null,
    oaStatus: json.oa_status ?? null,
    source: json.best_oa_location?.source ?? null,
  } satisfies UnpaywallRecord;
}

export async function fetchUnpaywallBatch(dois: string[]): Promise<Record<string, UnpaywallRecord | null>> {
  const uniqueDois = Array.from(new Set(dois.filter(Boolean)));

  const entries = await Promise.all(
    uniqueDois.map(async (doi) => {
      try {
        const record = await fetchUnpaywallRecord(doi);
        return [doi, record] as const;
      } catch (error) {
        console.error("Failed to fetch Unpaywall record", doi, error);
        return [doi, null] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
}
