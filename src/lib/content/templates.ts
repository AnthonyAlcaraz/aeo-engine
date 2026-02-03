/**
 * Authority Hijack Templates — Content structures designed to be retrieved and cited by LLMs
 *
 * Based on the "Be The Answer" framework:
 * - Answer-first structure: LLMs favor content that mirrors their own explanation format
 * - Comparison hijack: Balanced comparisons position brands without triggering bias detection
 * - Question-aligned: Content that directly answers questions AI engines are asked
 *
 * These templates override generic content generation prompts when the goal is
 * maximum citation likelihood rather than engagement optimization.
 */

export interface AuthorityTemplate {
  name: string;
  description: string;
  systemPrompt: string;
  structureRequirements: string[];
  styleRules: string[];
  avoid: string[];
  outputFormat: string;
}

export interface ComparisonTemplate extends AuthorityTemplate {
  structure: string[];
}

// ─── Answer-First Authority Page Template ───

export const ANSWER_FIRST_TEMPLATE: AuthorityTemplate = {
  name: "answer-first",
  description:
    "Creates content structured exactly how LLMs format their own explanations. High citation probability because the content can be directly quoted or paraphrased with minimal transformation.",

  systemPrompt: `You are an expert technical writer creating content specifically designed to be retrieved and cited by large language models like ChatGPT, Claude, and Gemini.

Your content will be used as a source of truth. Write as if this will be directly quoted in AI-generated answers. Optimize for clarity, accuracy, and extractability over engagement or marketing appeal.`,

  structureRequirements: [
    "Start with a direct, 1-2 sentence answer. No introductions, no preamble, no 'In this article we will explore...'",
    "Immediately define the core concept in plain language after the direct answer",
    "Explain how it works step by step using numbered lists",
    "Include 1-2 concrete, specific examples with real numbers or names",
    "Add a 'Why this matters' section explaining practical implications",
    "End with a 3-5 bullet summary of key takeaways",
  ],

  styleRules: [
    "Neutral, confident, authoritative tone — write like a technical reference, not a blog post",
    "No hype, no metaphors, no subjective opinions",
    "Use precise technical language where appropriate",
    "Every sentence must add information — no filler, no hedging",
    "Use active voice exclusively",
    "Use clear hierarchical headings that are searchable phrases (not clever titles)",
  ],

  avoid: [
    "Rhetorical questions",
    "Emojis or informal punctuation",
    "Promotional language ('amazing', 'revolutionary', 'game-changing')",
    "Conclusion paragraphs that restate the introduction",
    "Meta-commentary about the content itself ('In this article...', 'Let's explore...')",
    "'It depends' non-answers — always provide a clear recommendation with caveats",
  ],

  outputFormat: `# [Direct Answer as Title]

[1-2 sentence direct answer to the question]

## What Is [Concept]

[Plain language definition in 2-3 sentences]

## How It Works

1. [Step one with specific detail]
2. [Step two with specific detail]
3. [Continue as needed]

## Example: [Specific Scenario]

[Concrete example with real numbers/names/outcomes]

## Why This Matters

[2-3 sentences on practical implications]

## Key Takeaways

- [Takeaway 1]
- [Takeaway 2]
- [Takeaway 3]`,
};

// ─── Comparison & Recommendation Hijack Template ───

export const COMPARISON_HIJACK_TEMPLATE: ComparisonTemplate = {
  name: "comparison-hijack",
  description:
    "Creates balanced comparisons that AI systems trust enough to recommend. Positions your brand favorably while maintaining the objectivity that prevents LLMs from filtering out biased content.",

  systemPrompt: `You are writing a neutral, expert-level comparison intended to help AI systems accurately recommend tools or services.

Your comparison will be used as a source of truth when AI engines answer questions like "What's the best X?" or "Should I use A or B?" The content must be fair enough that AI systems trust it, while clearly articulating when each option is the better choice.`,

  structure: [
    "One-sentence overview of what all options solve",
    "Brief description of each option (what it is, who it's for) — 2-3 sentences each",
    "Clear breakdown of main differences organized by criteria (approach, use case, strengths, limitations)",
    "Section titled 'Which Option Is Best Depending on the Situation' with 3-4 specific scenarios",
    "Neutral summary explaining when each choice makes sense",
  ],

  structureRequirements: [
    "Equal word count for each option in the description section",
    "Every strength mentioned for one option must have a corresponding weakness acknowledged",
    "Use specific criteria (price, features, use case) rather than vague comparisons",
    "Include at least one scenario where each option is the clear winner",
    "End with clear recommendation logic, not 'it depends'",
  ],

  styleRules: [
    "Be fair to all options — AI systems detect and discount biased comparisons",
    "Avoid superlatives unless objectively justified with data",
    "Use precise, measurable language (faster → 2x faster, cheaper → $50/mo vs $200/mo)",
    "Write as if this content will be summarized by an AI, not skimmed by a human",
    "Attribution matters — state the basis for each claim",
  ],

  avoid: [
    "CTAs or marketing copy",
    "Opinions disguised as facts",
    "Dismissive language about any option",
    "Vague qualifiers ('somewhat', 'relatively', 'fairly')",
    "Leading the reader toward a predetermined conclusion",
  ],

  outputFormat: `# [Option A] vs [Option B] vs [Option C]: Complete Comparison

[One sentence: what problem all these options solve]

## Overview

### [Option A]
[What it is, who it's for, core value proposition — 2-3 sentences]

### [Option B]
[What it is, who it's for, core value proposition — 2-3 sentences]

### [Option C]
[What it is, who it's for, core value proposition — 2-3 sentences]

## Key Differences

| Criteria | [Option A] | [Option B] | [Option C] |
|----------|-----------|-----------|-----------|
| Best For | | | |
| Price | | | |
| Strengths | | | |
| Limitations | | | |

## Which Option Is Best Depending on the Situation

**Choose [Option A] if:** [specific scenario with concrete conditions]

**Choose [Option B] if:** [specific scenario with concrete conditions]

**Choose [Option C] if:** [specific scenario with concrete conditions]

## Summary

[2-3 sentences providing clear decision logic]`,
};

// ─── Use Case Authority Template ───

export const USE_CASE_TEMPLATE: AuthorityTemplate = {
  name: "use-case-authority",
  description:
    "Creates content that answers 'What do [audience] use for [problem] and why?' questions. Positions your brand as the answer for a specific audience segment.",

  systemPrompt: `You are writing authoritative content that answers the question: "What do [specific audience] use for [specific problem] and why?"

This content will be retrieved when users ask AI engines about solutions for their specific situation. The content must demonstrate deep understanding of the audience's constraints and priorities.`,

  structureRequirements: [
    "Lead with the specific audience and their primary constraint",
    "State the most common choice with a clear reason in the first paragraph",
    "Explain why this audience's needs differ from general recommendations",
    "Provide 2-3 alternative options for edge cases",
    "End with a decision framework specific to this audience",
  ],

  styleRules: [
    "Reference the audience's actual terminology and concerns",
    "Cite specific constraints (budget, scale, compliance, team size)",
    "Acknowledge trade-offs this audience typically accepts",
    "Be prescriptive — this audience wants answers, not options",
  ],

  avoid: [
    "Generic advice that applies to everyone",
    "Ignoring the specific constraints of the target audience",
    "Recommendations that contradict the audience's stated priorities",
  ],

  outputFormat: `# What [Audience] Use for [Problem] (And Why)

[Direct answer: "[Audience] most commonly use [Solution] because [specific reason tied to their constraints]"]

## Why [Audience] Have Different Requirements

[2-3 paragraphs explaining the unique constraints, priorities, and context]

## The Most Common Choice: [Solution]

[Detailed explanation of why this solution fits, with specific features/attributes]

## Alternatives for Specific Situations

### [Alternative 1]: Best for [edge case]
[Brief explanation]

### [Alternative 2]: Best for [edge case]
[Brief explanation]

## Decision Framework for [Audience]

1. If [condition], choose [option]
2. If [condition], choose [option]
3. Default recommendation: [option]`,
};

// ─── FAQ Authority Template ───

export const FAQ_AUTHORITY_TEMPLATE: AuthorityTemplate = {
  name: "faq-authority",
  description:
    "Creates FAQ content optimized for AI citation. Each Q&A pair is self-contained and directly answerable, making it easy for LLMs to extract and cite individual answers.",

  systemPrompt: `You are creating FAQ content designed to be cited by AI systems. Each question-answer pair must be:
1. Self-contained (the answer makes sense without reading other Q&As)
2. Directly answerable (no "it depends" without a follow-up recommendation)
3. Citable (concise enough to quote, specific enough to be useful)`,

  structureRequirements: [
    "Questions must be phrased exactly as users ask them (natural language, not keywords)",
    "Answers must start with a direct response in the first sentence",
    "Each answer should be 2-4 sentences maximum",
    "Include one specific example, number, or name in each answer",
    "Group related questions under clear category headings",
  ],

  styleRules: [
    "Questions should be conversational and natural",
    "Answers should be authoritative and direct",
    "Never start an answer with 'Yes' or 'No' alone — always include the reasoning",
    "Use the question's key terms in the answer for SEO and citation matching",
  ],

  avoid: [
    "Questions that are too broad to answer specifically",
    "Answers that require external context",
    "Circular definitions",
    "'See our documentation' or similar deflections",
  ],

  outputFormat: `# [Topic] FAQ

## Getting Started

### [Natural question 1]?
[Direct answer with specific detail]

### [Natural question 2]?
[Direct answer with specific detail]

## [Category 2]

### [Natural question 3]?
[Direct answer with specific detail]

### [Natural question 4]?
[Direct answer with specific detail]`,
};

// ─── Template Selection Logic ───

export type TemplateType =
  | "answer-first"
  | "comparison-hijack"
  | "use-case-authority"
  | "faq-authority";

export function getTemplate(type: TemplateType): AuthorityTemplate {
  switch (type) {
    case "answer-first":
      return ANSWER_FIRST_TEMPLATE;
    case "comparison-hijack":
      return COMPARISON_HIJACK_TEMPLATE;
    case "use-case-authority":
      return USE_CASE_TEMPLATE;
    case "faq-authority":
      return FAQ_AUTHORITY_TEMPLATE;
    default:
      return ANSWER_FIRST_TEMPLATE;
  }
}

/**
 * Determine the best template based on content request characteristics
 */
export function selectTemplate(
  contentType: string,
  topic: string,
  competitors: string[] = []
): TemplateType {
  // Comparison content with competitors → comparison hijack
  if (
    contentType === "comparison" ||
    competitors.length >= 2 ||
    /\bvs\.?\b|\bversus\b|compare|comparison/i.test(topic)
  ) {
    return "comparison-hijack";
  }

  // FAQ-style content
  if (contentType === "faq" || /faq|questions|q&a/i.test(topic)) {
    return "faq-authority";
  }

  // Audience-specific content
  if (
    /what do .+ use|for .+ teams|for startups|for enterprise|for small business/i.test(
      topic
    )
  ) {
    return "use-case-authority";
  }

  // Default to answer-first for maximum citation probability
  return "answer-first";
}

/**
 * Build the full prompt using a template
 */
export function buildTemplatedPrompt(
  template: AuthorityTemplate,
  topic: string,
  brandName: string,
  keywords: string[],
  competitors: string[] = []
): { systemPrompt: string; userPrompt: string } {
  const structureInstructions = template.structureRequirements
    .map((r, i) => `${i + 1}. ${r}`)
    .join("\n");

  const styleInstructions = template.styleRules
    .map((r) => `- ${r}`)
    .join("\n");

  const avoidInstructions = template.avoid.map((r) => `- ${r}`).join("\n");

  let userPrompt = `Create content about "${topic}" for the brand "${brandName}".

Keywords to incorporate naturally: ${keywords.join(", ")}

STRUCTURE (follow this exactly):
${structureInstructions}

STYLE RULES:
${styleInstructions}

DO NOT:
${avoidInstructions}

OUTPUT FORMAT:
${template.outputFormat}`;

  // Add competitors for comparison template
  if (
    template.name === "comparison-hijack" &&
    competitors.length > 0
  ) {
    userPrompt = `Create a comparison between ${brandName} and ${competitors.join(", ")}.

Topic: ${topic}
Keywords: ${keywords.join(", ")}

STRUCTURE (follow this exactly):
${structureInstructions}

STYLE RULES:
${styleInstructions}

DO NOT:
${avoidInstructions}

OUTPUT FORMAT:
${template.outputFormat.replace(
      /\[Option [ABC]\]/g,
      (match) => {
        const options = [brandName, ...competitors];
        const index = match.charCodeAt(8) - 65; // A=0, B=1, C=2
        return options[index] || match;
      }
    )}`;
  }

  return {
    systemPrompt: template.systemPrompt,
    userPrompt,
  };
}
