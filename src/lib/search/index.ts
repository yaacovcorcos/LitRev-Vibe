import { CrossrefAdapter } from "@/lib/search/adapters/crossref";
import { PubMedAdapter } from "@/lib/search/adapters/pubmed";
import type { SearchAdapter } from "@/lib/search/types";

export const searchAdapters: SearchAdapter[] = [
  new PubMedAdapter(),
  new CrossrefAdapter(),
];

export type { SearchAdapter } from "@/lib/search/types";
export * from "@/lib/search/types";
