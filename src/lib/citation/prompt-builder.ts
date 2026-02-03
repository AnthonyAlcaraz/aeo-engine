/**
 * Probe Prompt Builder — Expanded with Validation Patterns
 *
 * Two categories of probes:
 * 1. Standard probes: Test visibility for common query patterns
 * 2. Validation probes: Systematic patterns from "Be The Answer" framework
 *    designed to test how AI engines make recommendations
 *
 * The validation probes target the specific question structures that lead to
 * brand citations in AI responses.
 */

// ─── Standard Probe Categories ───

export type StandardProbeCategory =
  | "best-of"
  | "top-list"
  | "comparison"
  | "how-to"
  | "recommendation"
  | "alternative";

// ─── Validation Probe Categories (Be The Answer Framework) ───

export type ValidationProbeCategory =
  | "difference"        // "What's the difference between X and Y?"
  | "company-solve"     // "How do companies solve [problem]?"
  | "best-solution"     // "What's the best solution for [problem]?"
  | "use-case"          // "What [category] do [audience] use and why?"
  | "when-to-use"       // "When should I use X vs Y?"
  | "pros-cons"         // "What are the pros and cons of [X]?"
  | "beginner"          // "What [category] is best for beginners?"
  | "enterprise"        // "What [category] do enterprise companies use?"
  | "budget"            // "What's the best [category] on a budget?"
  | "specific-need";    // "What [category] is best for [specific requirement]?"

export type ProbeCategory = StandardProbeCategory | ValidationProbeCategory;

// ─── Standard Templates ───

const STANDARD_TEMPLATES: Record<StandardProbeCategory, string> = {
  "best-of":
    "What are the best {query}? Please provide a detailed list with recommendations.",
  "top-list":
    "What are the top 10 {query}? Rank them from best to worst with brief explanations.",
  comparison:
    "Compare the leading {query}. What are the pros and cons of each?",
  "how-to":
    "How do I choose the right {query}? What factors should I consider and what do you recommend?",
  recommendation:
    "I need a recommendation for {query}. What would you suggest and why?",
  alternative:
    "What are the best alternatives for {query}? Compare them in detail.",
};

// ─── Validation Templates (Be The Answer Framework) ───

const VALIDATION_TEMPLATES: Record<ValidationProbeCategory, string> = {
  difference:
    "What's the difference between {option1} and {option2}? When should I use each?",
  "company-solve":
    "How do companies solve {problem}? What tools and approaches are most common?",
  "best-solution":
    "What's the best solution for {problem}? Please provide specific recommendations.",
  "use-case":
    "What {category} do {audience} use and why? What makes it the preferred choice?",
  "when-to-use":
    "When should I use {option1} vs {option2}? Give me specific scenarios for each.",
  "pros-cons":
    "What are the pros and cons of {subject}? Give me an honest assessment.",
  beginner:
    "What {category} is best for beginners? I'm just getting started and need something easy to learn.",
  enterprise:
    "What {category} do enterprise companies use? I need something that scales and has enterprise features.",
  budget:
    "What's the best {category} on a budget? I need good value without breaking the bank.",
  "specific-need":
    "What {category} is best for {requirement}? This specific feature is critical for my use case.",
};

// Combined templates lookup
const ALL_TEMPLATES: Record<ProbeCategory, string> = {
  ...STANDARD_TEMPLATES,
  ...VALIDATION_TEMPLATES,
};

// ─── Template Variables ───

export interface ProbeTemplateVariables {
  query?: string;           // Primary query term
  option1?: string;         // First option in comparisons
  option2?: string;         // Second option in comparisons
  problem?: string;         // Problem being solved
  category?: string;        // Product/tool category
  audience?: string;        // Target audience
  subject?: string;         // Subject of analysis
  requirement?: string;     // Specific requirement
}

// ─── Main Builder Function ───

/**
 * Build a probe prompt from a category and variables.
 * Supports both simple queries (backward compatible) and structured variables.
 */
export function buildProbePrompt(
  query: string,
  category: ProbeCategory,
  variables?: ProbeTemplateVariables
): string {
  const template = ALL_TEMPLATES[category];

  if (!template) {
    // Fallback for unknown category
    return `Tell me about ${query}. What are the best options and what would you recommend?`;
  }

  // Simple case: just replace {query}
  if (!variables || Object.keys(variables).length === 0) {
    return template.replace("{query}", query);
  }

  // Full variable replacement
  let result = template;
  const vars: ProbeTemplateVariables = { query, ...variables };

  for (const [key, value] of Object.entries(vars)) {
    if (value) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
  }

  // Replace any remaining unfilled variables with the query
  result = result.replace(/\{[^}]+\}/g, query);

  return result;
}

// ─── Probe Generation Helpers ───

/**
 * Generate a full set of validation probes for a brand/category.
 * Returns probes designed to test citation likelihood across different
 * question patterns.
 */
export function generateValidationProbes(
  brandName: string,
  category: string,
  competitors: string[] = []
): Array<{ category: ProbeCategory; prompt: string; variables: ProbeTemplateVariables }> {
  const probes: Array<{ category: ProbeCategory; prompt: string; variables: ProbeTemplateVariables }> = [];

  // Standard probes with the category
  probes.push({
    category: "best-of",
    prompt: buildProbePrompt(category, "best-of"),
    variables: { query: category },
  });

  probes.push({
    category: "top-list",
    prompt: buildProbePrompt(category, "top-list"),
    variables: { query: category },
  });

  // Validation probes

  // Difference probes against competitors
  for (const competitor of competitors.slice(0, 3)) {
    probes.push({
      category: "difference",
      prompt: buildProbePrompt(category, "difference", {
        option1: brandName,
        option2: competitor,
      }),
      variables: { option1: brandName, option2: competitor, category },
    });

    probes.push({
      category: "when-to-use",
      prompt: buildProbePrompt(category, "when-to-use", {
        option1: brandName,
        option2: competitor,
      }),
      variables: { option1: brandName, option2: competitor, category },
    });
  }

  // Problem-solving probe
  probes.push({
    category: "company-solve",
    prompt: buildProbePrompt(category, "company-solve", {
      problem: `choosing the right ${category}`,
    }),
    variables: { problem: `choosing the right ${category}` },
  });

  // Audience-specific probes
  const audiences = ["startups", "small businesses", "enterprise companies", "freelancers"];
  for (const audience of audiences) {
    probes.push({
      category: "use-case",
      prompt: buildProbePrompt(category, "use-case", {
        category,
        audience,
      }),
      variables: { category, audience },
    });
  }

  // Budget and beginner probes
  probes.push({
    category: "beginner",
    prompt: buildProbePrompt(category, "beginner", { category }),
    variables: { category },
  });

  probes.push({
    category: "budget",
    prompt: buildProbePrompt(category, "budget", { category }),
    variables: { category },
  });

  probes.push({
    category: "enterprise",
    prompt: buildProbePrompt(category, "enterprise", { category }),
    variables: { category },
  });

  // Pros and cons of the brand specifically
  probes.push({
    category: "pros-cons",
    prompt: buildProbePrompt(brandName, "pros-cons", { subject: brandName }),
    variables: { subject: brandName },
  });

  return probes;
}

/**
 * Get all available probe categories with descriptions
 */
export function getProbeCategories(): Array<{
  category: ProbeCategory;
  type: "standard" | "validation";
  description: string;
  templateExample: string;
}> {
  return [
    // Standard
    {
      category: "best-of",
      type: "standard",
      description: "General 'best' recommendations",
      templateExample: "What are the best [category]?",
    },
    {
      category: "top-list",
      type: "standard",
      description: "Ranked list requests",
      templateExample: "What are the top 10 [category]?",
    },
    {
      category: "comparison",
      type: "standard",
      description: "General comparisons",
      templateExample: "Compare the leading [category]",
    },
    {
      category: "how-to",
      type: "standard",
      description: "Decision guidance",
      templateExample: "How do I choose the right [category]?",
    },
    {
      category: "recommendation",
      type: "standard",
      description: "Direct recommendation requests",
      templateExample: "I need a recommendation for [category]",
    },
    {
      category: "alternative",
      type: "standard",
      description: "Alternative searches",
      templateExample: "What are the best alternatives for [brand]?",
    },
    // Validation (Be The Answer)
    {
      category: "difference",
      type: "validation",
      description: "Direct brand comparisons",
      templateExample: "What's the difference between [A] and [B]?",
    },
    {
      category: "company-solve",
      type: "validation",
      description: "Problem-solving approaches",
      templateExample: "How do companies solve [problem]?",
    },
    {
      category: "best-solution",
      type: "validation",
      description: "Solution recommendations",
      templateExample: "What's the best solution for [problem]?",
    },
    {
      category: "use-case",
      type: "validation",
      description: "Audience-specific recommendations",
      templateExample: "What [category] do [audience] use?",
    },
    {
      category: "when-to-use",
      type: "validation",
      description: "Situational guidance",
      templateExample: "When should I use [A] vs [B]?",
    },
    {
      category: "pros-cons",
      type: "validation",
      description: "Balanced assessment requests",
      templateExample: "What are the pros and cons of [brand]?",
    },
    {
      category: "beginner",
      type: "validation",
      description: "Beginner-friendly recommendations",
      templateExample: "What [category] is best for beginners?",
    },
    {
      category: "enterprise",
      type: "validation",
      description: "Enterprise-grade recommendations",
      templateExample: "What [category] do enterprise companies use?",
    },
    {
      category: "budget",
      type: "validation",
      description: "Budget-conscious recommendations",
      templateExample: "What's the best [category] on a budget?",
    },
    {
      category: "specific-need",
      type: "validation",
      description: "Requirement-specific recommendations",
      templateExample: "What [category] is best for [requirement]?",
    },
  ];
}

/**
 * Check if a category is a validation probe (Be The Answer framework)
 */
export function isValidationProbe(category: ProbeCategory): boolean {
  return category in VALIDATION_TEMPLATES;
}
