declare module "@citation-js/core" {
  class Cite {
    constructor(data?: any);
    add(data: any): void;
    format(format: string, options?: Record<string, unknown>): string | string[];
  }

  export { Cite };
}

declare module "@citation-js/plugin-csl";
