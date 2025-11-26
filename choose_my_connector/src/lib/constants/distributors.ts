export const DISTRIBUTORS = [
  { slug: "avnet", label: "Avnet", csvKey: "avnetUrl" },
  { slug: "arrow", label: "Arrow", csvKey: "arrowUrl" },
  { slug: "newark", label: "Newark", csvKey: "newarkUrl" },
  { slug: "jameco-electronics", label: "Jameco Electronics", csvKey: "jamecoElectronicsUrl" },
  { slug: "mouser", label: "Mouser", csvKey: "mouserUrl" },
  { slug: "digi-key", label: "Digi-Key", csvKey: "digiKeyUrl" },
  { slug: "tti", label: "TTI", csvKey: "ttiUrl" }
] as const;

export const distributorLabels = DISTRIBUTORS.map((distributor) => distributor.label);
export const distributorSlugToLabel: Record<string, string> = Object.fromEntries(
  DISTRIBUTORS.map(({ slug, label }) => [slug, label])
);
