export type ProbeCategory =
  | "best-of"
  | "top-list"
  | "comparison"
  | "how-to"
  | "recommendation"
  | "alternative";

const TEMPLATES: Record<ProbeCategory, string> = {
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

export function buildProbePrompt(
  query: string,
  category: ProbeCategory
): string {
  const template = TEMPLATES[category];
  return template.replace("{query}", query);
}
