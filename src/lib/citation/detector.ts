export interface CitationAnalysis {
  cited: boolean;
  citationType:
    | "direct-mention"
    | "url-link"
    | "recommendation"
    | "comparison"
    | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  position: number | null;
  competitorsMentioned: string[];
  confidence: number;
}

interface Competitor {
  name: string;
  domain: string;
}

// --- Layer 3: Sentiment keywords ---

const POSITIVE_KEYWORDS = [
  "best",
  "recommend",
  "top",
  "excellent",
  "outstanding",
  "leading",
  "superior",
  "great",
  "fantastic",
  "highly rated",
  "first choice",
  "preferred",
  "trusted",
  "reliable",
  "impressive",
];

const NEGATIVE_KEYWORDS = [
  "avoid",
  "issues",
  "problems",
  "worst",
  "poor",
  "lacking",
  "inferior",
  "disappointing",
  "unreliable",
  "overpriced",
  "outdated",
  "difficult",
  "frustrating",
  "limited",
  "mediocre",
];

// --- Helpers ---

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSurroundingText(
  text: string,
  matchIndex: number,
  matchLength: number,
  windowSize: number = 120
): string {
  const start = Math.max(0, matchIndex - windowSize);
  const end = Math.min(text.length, matchIndex + matchLength + windowSize);
  return text.slice(start, end).toLowerCase();
}

function detectSentiment(
  text: string,
  matchIndex: number,
  matchLength: number
): "positive" | "neutral" | "negative" {
  const surrounding = extractSurroundingText(text, matchIndex, matchLength);

  let positiveScore = 0;
  let negativeScore = 0;

  for (const keyword of POSITIVE_KEYWORDS) {
    if (surrounding.includes(keyword)) {
      positiveScore++;
    }
  }

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (surrounding.includes(keyword)) {
      negativeScore++;
    }
  }

  if (positiveScore > negativeScore) return "positive";
  if (negativeScore > positiveScore) return "negative";
  return "neutral";
}

function detectPosition(response: string, brandPattern: RegExp): number | null {
  // Match numbered list items like "1. ", "2) ", "1 - ", etc.
  const numberedListRegex = /^[ \t]*(\d{1,2})[.):\-]\s+(.+)/gm;
  let match: RegExpExecArray | null;

  while ((match = numberedListRegex.exec(response)) !== null) {
    const lineContent = match[2];
    if (brandPattern.test(lineContent)) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

function detectCompetitors(
  response: string,
  competitors: Competitor[]
): string[] {
  const mentioned: string[] = [];
  const lowerResponse = response.toLowerCase();

  for (const competitor of competitors) {
    const nameFound = lowerResponse.includes(competitor.name.toLowerCase());
    const domainFound = lowerResponse.includes(
      competitor.domain.toLowerCase()
    );

    if (nameFound || domainFound) {
      mentioned.push(competitor.name);
    }
  }

  return mentioned;
}

// --- Main detection ---

export function detectCitation(
  response: string,
  brandName: string,
  brandDomain: string,
  competitors: Competitor[]
): CitationAnalysis {
  const result: CitationAnalysis = {
    cited: false,
    citationType: null,
    sentiment: null,
    position: null,
    competitorsMentioned: [],
    confidence: 0,
  };

  const lowerResponse = response.toLowerCase();
  const lowerBrandName = brandName.toLowerCase();
  const lowerBrandDomain = brandDomain.toLowerCase();

  // Reusable brand pattern for position detection
  const brandPattern = new RegExp(
    `${escapeRegex(brandName)}|${escapeRegex(brandDomain)}`,
    "i"
  );

  // --- Layer 2: URL/link parsing ---
  const urlRegex = /https?:\/\/[^\s)<>]+/gi;
  const urls = response.match(urlRegex) ?? [];
  const urlMatch = urls.some((url) =>
    url.toLowerCase().includes(lowerBrandDomain)
  );

  if (urlMatch) {
    result.cited = true;
    result.citationType = "url-link";
    result.confidence = 1.0;

    const urlIndex = lowerResponse.indexOf(lowerBrandDomain);
    if (urlIndex !== -1) {
      result.sentiment = detectSentiment(
        response,
        urlIndex,
        brandDomain.length
      );
    }

    result.position = detectPosition(response, brandPattern);
    result.competitorsMentioned = detectCompetitors(response, competitors);
    return result;
  }

  // --- Layer 1: String matching ---

  // Exact brand name match (word boundary)
  const exactNameRegex = new RegExp(
    `\\b${escapeRegex(brandName)}\\b`,
    "i"
  );
  const exactNameMatch = exactNameRegex.exec(response);

  if (exactNameMatch) {
    result.cited = true;
    result.confidence = 0.9;

    // Determine citation type from context
    const surrounding = extractSurroundingText(
      response,
      exactNameMatch.index,
      brandName.length,
      200
    );

    if (
      surrounding.includes("compare") ||
      surrounding.includes("vs") ||
      surrounding.includes("versus") ||
      surrounding.includes("compared to")
    ) {
      result.citationType = "comparison";
    } else if (
      surrounding.includes("recommend") ||
      surrounding.includes("suggest") ||
      surrounding.includes("try")
    ) {
      result.citationType = "recommendation";
    } else {
      result.citationType = "direct-mention";
    }

    result.sentiment = detectSentiment(
      response,
      exactNameMatch.index,
      brandName.length
    );
    result.position = detectPosition(response, brandPattern);
    result.competitorsMentioned = detectCompetitors(response, competitors);
    return result;
  }

  // Partial / case-insensitive name match (substring, not word-bounded)
  const partialNameIndex = lowerResponse.indexOf(lowerBrandName);
  if (partialNameIndex !== -1) {
    result.cited = true;
    result.citationType = "direct-mention";
    result.confidence = 0.7;
    result.sentiment = detectSentiment(
      response,
      partialNameIndex,
      brandName.length
    );
    result.position = detectPosition(response, brandPattern);
    result.competitorsMentioned = detectCompetitors(response, competitors);
    return result;
  }

  // Domain-only match (no URL context)
  const domainIndex = lowerResponse.indexOf(lowerBrandDomain);
  if (domainIndex !== -1) {
    result.cited = true;
    result.citationType = "direct-mention";
    result.confidence = 0.5;
    result.sentiment = detectSentiment(
      response,
      domainIndex,
      brandDomain.length
    );
    result.position = detectPosition(response, brandPattern);
    result.competitorsMentioned = detectCompetitors(response, competitors);
    return result;
  }

  // No citation found — still detect competitors
  result.competitorsMentioned = detectCompetitors(response, competitors);
  return result;
}
