import { z } from "zod";

export const locatorPolicies = ["strict", "allow_pending"] as const;
export type LocatorPolicy = typeof locatorPolicies[number];

export const citationStyles = ["apa", "vancouver"] as const;
export type CitationStyle = typeof citationStyles[number];

export const exportFormats = ["docx", "markdown", "bibtex"] as const;
export type ExportFormat = typeof exportFormats[number];

const exportSettingsSchema = z
  .object({
    enabledFormats: z.array(z.enum(exportFormats)).min(1),
    defaultFormat: z.enum(exportFormats),
    includePrismaDiagram: z.boolean(),
    includeLedgerExport: z.boolean(),
  })
  .strip();

export type ExportSettings = z.infer<typeof exportSettingsSchema>;

const projectSettingsSchema = z
  .object({
    locatorPolicy: z.enum(locatorPolicies),
    citationStyle: z.enum(citationStyles),
    exports: exportSettingsSchema,
  })
  .strip();

export type ProjectSettings = z.infer<typeof projectSettingsSchema>;

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  locatorPolicy: "strict",
  citationStyle: "apa",
  exports: {
    enabledFormats: ["docx", "markdown", "bibtex"],
    defaultFormat: "markdown",
    includePrismaDiagram: true,
    includeLedgerExport: true,
  },
};

export const projectSettingsPatchSchema = z
  .object({
    locatorPolicy: z.enum(locatorPolicies).optional(),
    citationStyle: z.enum(citationStyles).optional(),
    exports: exportSettingsSchema.partial().optional(),
  })
  .strip();

export type ProjectSettingsPatch = z.infer<typeof projectSettingsPatchSchema>;

function uniqueFormats(formats: readonly ExportFormat[]): ExportFormat[] {
  return Array.from(new Set(formats));
}

function mergeExportSettings(
  base: ExportSettings,
  patch?: ProjectSettingsPatch["exports"],
): ExportSettings {
  if (!patch) {
    return { ...base, enabledFormats: [...base.enabledFormats] };
  }

  const enabledFormats = patch.enabledFormats
    ? uniqueFormats(patch.enabledFormats)
    : [...base.enabledFormats];

  const defaultFormat = patch.defaultFormat ?? base.defaultFormat;

  if (!enabledFormats.includes(defaultFormat)) {
    enabledFormats.push(defaultFormat);
  }

  return {
    enabledFormats: uniqueFormats(enabledFormats),
    defaultFormat,
    includePrismaDiagram: patch.includePrismaDiagram ?? base.includePrismaDiagram,
    includeLedgerExport: patch.includeLedgerExport ?? base.includeLedgerExport,
  };
}

export function mergeProjectSettings(
  patch: ProjectSettingsPatch | undefined,
  base: ProjectSettings = DEFAULT_PROJECT_SETTINGS,
): ProjectSettings {
  const cleanPatch = projectSettingsPatchSchema.parse(patch ?? {});

  return {
    locatorPolicy: cleanPatch.locatorPolicy ?? base.locatorPolicy,
    citationStyle: cleanPatch.citationStyle ?? base.citationStyle,
    exports: mergeExportSettings(base.exports, cleanPatch.exports),
  };
}

export function resolveProjectSettings(
  input: unknown,
  base?: ProjectSettings,
): ProjectSettings {
  if (!input || typeof input !== "object") {
    return base ? mergeProjectSettings(undefined, base) : DEFAULT_PROJECT_SETTINGS;
  }

  const parsed = projectSettingsPatchSchema.safeParse(input);
  if (!parsed.success) {
    return base ? mergeProjectSettings(undefined, base) : DEFAULT_PROJECT_SETTINGS;
  }

  return mergeProjectSettings(parsed.data, base);
}

export function normalizeProjectSettings(input: unknown): ProjectSettings {
  return resolveProjectSettings(input, DEFAULT_PROJECT_SETTINGS);
}
