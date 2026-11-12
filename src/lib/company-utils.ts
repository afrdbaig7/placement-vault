/**
 * Company normalization, alias resolution, and fuzzy matching utilities.
 * Used for duplicate prevention, "Did you mean...?" suggestions, and dataset imports.
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
  amazon: ["Amazon.com", "AWS", "Amazon Development Centre", "Amazon India"],
  microsoft: ["MSFT", "Microsoft IDC", "Microsoft India", "Microsoft Corporation"],
  google: ["Alphabet", "Google India", "Google LLC"],
  tcs: ["Tata Consultancy Services", "TCS Digital", "TCS Ninja", "TCS Prime", "tcs"],
  infosys: ["Infy", "Infosys Limited", "Infosys DSE", "Infosys SP"],
  wipro: ["Wipro Technologies", "Wipro Turbo", "Wipro Elite", "Wipro Limited"],
  cognizant: ["CTS", "Cognizant Technology Solutions", "Cognizant GenC", "GenC Next"],
  accenture: ["Accenture India", "Accenture Solutions", "ASE", "FSE"],
  capgemini: ["Capgemini India", "Capgemini Technology Services"],
  adobe: ["Adobe Systems", "Adobe India"],
  atlassian: ["Atlassian India", "Atlassian Corporation"],
  cisco: ["Cisco Systems", "Cisco India"],
  "goldman-sachs": ["Goldman Sachs", "GS", "Goldman Sachs India"],
  flipkart: ["Flipkart Internet", "FK", "Flipkart India"],
  cred: ["Dreamplug Technologies", "CRED"],
  cashfree: ["Cashfree Payments", "Cashfree India"],
  bharatpe: ["Resilient Innovations", "BharatPe"],
  arcesium: ["Arcesium India", "Arcesium LLC"],
  zoho: ["Zoho Corporation", "AdventNet"],
  swiggy: ["Bundl Technologies", "Swiggy"],
  zomato: ["Zomato Limited", "Eternal"],
  paytm: ["One97 Communications", "Paytm"],
  jpmorgan: ["J.P. Morgan", "JPMorgan Chase", "JPMC", "JP Morgan"],
  morganstanley: ["Morgan Stanley", "MS"],
  salesforce: ["Salesforce.com", "SFDC", "Salesforce India"],
  oracle: ["Oracle India", "OFSS", "Oracle Corporation"],
  uber: ["Uber Technologies", "Uber India"],
  "de-shaw": ["D. E. Shaw", "DE Shaw", "D.E. Shaw & Co."],
  intuit: ["Intuit India", "Intuit Inc."],
  amdocs: ["Amdocs India", "Amdocs Development Centre"],
  airtel: ["Bharti Airtel", "Airtel Digital", "Airtel X Labs"],
};

/**
 * Canonical list of campus-relevant companies (prioritized for Indian colleges).
 */
export const CAMPUS_RELEVANT_COMPANIES = new Set([
  "tcs",
  "infosys",
  "wipro",
  "cognizant",
  "accenture",
  "capgemini",
  "amdocs",
  "airtel",
  "amazon",
  "microsoft",
  "google",
  "adobe",
  "atlassian",
  "cisco",
  "goldman-sachs",
  "flipkart",
  "cred",
  "cashfree",
  "bharatpe",
  "arcesium",
  "zoho",
  "morganstanley",
  "jpmorgan",
  "salesforce",
  "oracle",
  "uber",
  "de-shaw",
  "intuit",
  "paytm",
  "swiggy",
  "zomato",
]);

/**
 * Known mapping from dataset folder names to canonical slug & standard name.
 */
export const FOLDER_NAME_MAP: Record<string, { slug: string; name: string }> = {
  tcs: { slug: "tcs", name: "Tata Consultancy Services" },
  Infosys: { slug: "infosys", name: "Infosys" },
  Wipro: { slug: "wipro", name: "Wipro" },
  Cognizant: { slug: "cognizant", name: "Cognizant" },
  Accenture: { slug: "accenture", name: "Accenture" },
  Capgemini: { slug: "capgemini", name: "Capgemini" },
  Amdocs: { slug: "amdocs", name: "Amdocs" },
  Airtel: { slug: "airtel", name: "Airtel" },
  Amazon: { slug: "amazon", name: "Amazon" },
  Microsoft: { slug: "microsoft", name: "Microsoft" },
  Google: { slug: "google", name: "Google" },
  Adobe: { slug: "adobe", name: "Adobe" },
  Atlassian: { slug: "atlassian", name: "Atlassian" },
  Cisco: { slug: "cisco", name: "Cisco" },
  "Goldman Sachs": { slug: "goldman-sachs", name: "Goldman Sachs" },
  Flipkart: { slug: "flipkart", name: "Flipkart" },
  CRED: { slug: "cred", name: "CRED" },
  Cashfree: { slug: "cashfree", name: "Cashfree" },
  BharatPe: { slug: "bharatpe", name: "BharatPe" },
  Arcesium: { slug: "arcesium", name: "Arcesium" },
  Zoho: { slug: "zoho", name: "Zoho" },
  "Morgan Stanley": { slug: "morganstanley", name: "Morgan Stanley" },
  "J.P. Morgan": { slug: "jpmorgan", name: "J.P. Morgan" },
  Salesforce: { slug: "salesforce", name: "Salesforce" },
  Oracle: { slug: "oracle", name: "Oracle" },
  Uber: { slug: "uber", name: "Uber" },
  "DE Shaw": { slug: "de-shaw", name: "D. E. Shaw" },
  Intuit: { slug: "intuit", name: "Intuit" },
  Paytm: { slug: "paytm", name: "Paytm" },
  Swiggy: { slug: "swiggy", name: "Swiggy" },
  Zomato: { slug: "zomato", name: "Zomato" },
  "American Express": { slug: "american-express", name: "American Express" },
  "Wells Fargo": { slug: "wells-fargo", name: "Wells Fargo" },
  Apple: { slug: "apple", name: "Apple" },
  Meta: { slug: "meta", name: "Meta" },
  Netflix: { slug: "netflix", name: "Netflix" },
  NVIDIA: { slug: "nvidia", name: "NVIDIA" },
  Intel: { slug: "intel", name: "Intel" },
  Samsung: { slug: "samsung", name: "Samsung" },
  Qualcomm: { slug: "qualcomm", name: "Qualcomm" },
  PayPal: { slug: "paypal", name: "PayPal" },
  ServiceNow: { slug: "servicenow", name: "ServiceNow" },
  Twilio: { slug: "twilio", name: "Twilio" },
};

/**
 * Checks whether a company slug or name belongs to the campus-relevant set.
 */
export function isCampusRelevant(slug: string): boolean {
  return CAMPUS_RELEVANT_COMPANIES.has(slug.toLowerCase().trim());
}

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
