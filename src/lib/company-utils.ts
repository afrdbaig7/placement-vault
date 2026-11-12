/**
 * Company normalization and fuzzy matching utilities.
 * Used for duplicate prevention and "Did you mean...?" suggestions.
 */

const STRIP_SUFFIXES = [
  /\b(private\s+limited|pvt\.?\s*ltd\.?|limited|ltd\.?|llc|inc\.?|corporation|corp\.?|co\.?)\b/gi,
  /\b(technologies|technology|tech|solutions|services|systems|consultancy|consulting|global|india|international)\b/gi,
];

/**
 * Normalizes a company name for duplicate detection.
 * "Tata Consultancy Services Ltd." -> "tata"
 * "Amazon India Pvt Ltd" -> "amazon"
 * "Google LLC" -> "google"
 */
export function normalizeCompanyName(raw: string): string {
  let s = raw.toLowerCase().trim();
  for (const re of STRIP_SUFFIXES) {
    s = s.replace(re, " ");
  }
  // Remove non-alphanumeric except spaces
  s = s.replace(/[^a-z0-9\s]/g, " ");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s || raw.toLowerCase().trim();
}

/**
 * Common abbreviations and aliases for Indian campus recruiters.
 */
export const KNOWN_COMPANY_ALIASES: Record<string, string[]> = {
  amazon: ["Amazon.com", "AWS", "Amazon Development Centre"],
  microsoft: ["MSFT", "Microsoft IDC", "Microsoft India"],
  google: ["Alphabet", "Google India"],
  tcs: ["Tata Consultancy Services", "TCS Digital", "TCS Ninja", "TCS Prime"],
  infosys: ["Infy", "Infosys Limited", "Infosys DSE", "Infosys SP"],
  wipro: ["Wipro Technologies", "Wipro Turbo", "Wipro Elite"],
  cognizant: ["CTS", "Cognizant Technology Solutions", "Cognizant GenC", "GenC Next"],
  accenture: ["Accenture India", "Accenture Solutions", "ASE", "FSE"],
  capgemini: ["Capgemini India", "Capgemini Technology Services"],
  adobe: ["Adobe Systems", "Adobe India"],
  atlassian: ["Atlassian India"],
  cisco: ["Cisco Systems", "Cisco India"],
  "goldman-sachs": ["Goldman Sachs", "GS"],
  flipkart: ["Flipkart Internet", "FK"],
  cred: ["Dreamplug Technologies", "CRED"],
  cashfree: ["Cashfree Payments"],
  bharatpe: ["Resilient Innovations", "BharatPe"],
  arcesium: ["Arcesium India"],
  zoho: ["Zoho Corporation", "AdventNet"],
  swiggy: ["Bundl Technologies", "Swiggy"],
  zomato: ["Zomato Limited"],
  paytm: ["One97 Communications", "Paytm"],
  jpmorgan: ["JPMorgan Chase", "JPMC"],
  morganstanley: ["Morgan Stanley"],
  salesforce: ["Salesforce.com", "SFDC"],
  oracle: ["Oracle India", "OFSS"],
  uber: ["Uber Technologies", "Uber India"],
  "de-shaw": ["D. E. Shaw", "DE Shaw"],
};

/**
 * Trigram-based similarity between two strings (0.0 to 1.0).
 */
export function stringSimilarity(a: string, b: string): number {
  const normA = a.toLowerCase().trim();
  const normB = b.toLowerCase().trim();
  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const trigrams = (str: string) => {
    const padded = `  ${str} `;
    const set = new Set<string>();
    for (let i = 0; i < padded.length - 2; i++) {
      set.add(padded.slice(i, i + 3));
    }
    return set;
  };

  const setA = trigrams(normA);
  const setB = trigrams(normB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
