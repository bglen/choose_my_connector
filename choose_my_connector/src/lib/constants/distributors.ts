export const DISTRIBUTORS = [
  { slug: "avnet", label: "Avnet", csvKey: "avnetUrl", partSearchUrl: "https://www.avnet.com/shop/us/search?k=" },
  { slug: "arrow", label: "Arrow", csvKey: "arrowUrl", partSearchUrl: "https://www.arrow.com/en/products/search?q=" },
  { slug: "newark", label: "Newark", csvKey: "newarkUrl", partSearchUrl: "https://www.newark.com/search?st=" },
  {
    slug: "jameco-electronics",
    label: "Jameco Electronics",
    csvKey: "jamecoElectronicsUrl",
    partSearchUrl: "https://www.jameco.com/z/"
  },
  { slug: "mouser", label: "Mouser", csvKey: "mouserUrl", partSearchUrl: "https://www.mouser.com/c/?q=" },
  { slug: "digi-key", label: "Digi-Key", csvKey: "digiKeyUrl", partSearchUrl: "https://www.digikey.com/en/products/result?keywords=" },
  { slug: "tti", label: "TTI", csvKey: "ttiUrl", partSearchUrl: "https://www.tti.com/content/ttiinc/en/search.html?search=" }
] as const;

export const distributorLabels = DISTRIBUTORS.map((distributor) => distributor.label);
export const distributorSlugToLabel: Record<string, string> = Object.fromEntries(
  DISTRIBUTORS.map(({ slug, label }) => [slug, label])
);
export const distributorLabelToSlug: Record<string, string> = Object.fromEntries(
  DISTRIBUTORS.map(({ slug, label }) => [label.toLowerCase(), slug])
);

export function buildDistributorPurchaseUrl(distributor: string, partNumber: string | null | undefined) {
  if (!distributor || !partNumber) return null;

  const normalized = distributor.trim().toLowerCase();
  const match = DISTRIBUTORS.find(
    ({ slug, label }) => slug === normalized || label.toLowerCase() === normalized
  );

  if (!match?.partSearchUrl) return null;

  return `${match.partSearchUrl}${encodeURIComponent(partNumber)}`;
}
