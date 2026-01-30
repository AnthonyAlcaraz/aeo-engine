export type SchemaType = "Article" | "FAQPage" | "HowTo";

export interface FAQItem {
  question: string;
  answer: string;
}

export interface HowToStep {
  name: string;
  text: string;
}

export function generateArticleSchema(
  title: string,
  description: string,
  brandName: string,
  brandDomain: string
): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    author: {
      "@type": "Organization",
      name: brandName,
      url: `https://${brandDomain}`,
    },
    publisher: {
      "@type": "Organization",
      name: brandName,
      url: `https://${brandDomain}`,
    },
    datePublished: new Date().toISOString().split("T")[0],
    dateModified: new Date().toISOString().split("T")[0],
  };

  return JSON.stringify(schema, null, 2);
}

export function generateFAQSchema(items: FAQItem[]): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return JSON.stringify(schema, null, 2);
}

export function generateHowToSchema(
  title: string,
  description: string,
  steps: HowToStep[]
): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };

  return JSON.stringify(schema, null, 2);
}

export function extractFAQFromMarkdown(markdown: string): FAQItem[] {
  const items: FAQItem[] = [];

  // Pattern 1: Q: / A: pairs
  const qaPattern = /Q:\s*(.+?)(?:\n|\r\n)A:\s*(.+?)(?=(?:\n|\r\n)Q:|\n#{1,3}\s|$)/gs;
  let match = qaPattern.exec(markdown);
  while (match !== null) {
    items.push({
      question: match[1].trim(),
      answer: match[2].trim(),
    });
    match = qaPattern.exec(markdown);
  }

  if (items.length > 0) {
    return items;
  }

  // Pattern 2: ## headings followed by paragraphs (within a FAQ section)
  const faqSectionPattern =
    /#{2,3}\s*(?:FAQ|Frequently Asked|Common Questions).*?\n([\s\S]*?)(?=\n#{1,2}\s[^#]|$)/i;
  const faqSection = faqSectionPattern.exec(markdown);

  if (faqSection) {
    const sectionContent = faqSection[1];
    const headingPattern =
      /#{2,3}\s+(.+?)(?:\?)?(?:\n|\r\n)([\s\S]*?)(?=\n#{2,3}\s|$)/g;
    let headingMatch = headingPattern.exec(sectionContent);
    while (headingMatch !== null) {
      const question = headingMatch[1].trim().replace(/\?$/, "") + "?";
      const answer = headingMatch[2].trim();
      if (answer.length > 0) {
        items.push({ question, answer });
      }
      headingMatch = headingPattern.exec(sectionContent);
    }
  }

  if (items.length > 0) {
    return items;
  }

  // Pattern 3: Any ### heading that ends with ? followed by a paragraph
  const questionHeadingPattern =
    /#{2,3}\s+(.+\?)(?:\n|\r\n)([\s\S]*?)(?=\n#{1,3}\s|$)/g;
  let qhMatch = questionHeadingPattern.exec(markdown);
  while (qhMatch !== null) {
    const answer = qhMatch[2].trim().split("\n\n")[0].trim();
    if (answer.length > 0) {
      items.push({
        question: qhMatch[1].trim(),
        answer,
      });
    }
    qhMatch = questionHeadingPattern.exec(markdown);
  }

  return items;
}

export function extractStepsFromMarkdown(markdown: string): HowToStep[] {
  const steps: HowToStep[] = [];

  // Pattern 1: ## Step N: Title / ### Step N: Title
  const stepHeadingPattern =
    /#{2,3}\s+Step\s+\d+[:.]\s*(.+?)(?:\n|\r\n)([\s\S]*?)(?=\n#{2,3}\s|$)/gi;
  let match = stepHeadingPattern.exec(markdown);
  while (match !== null) {
    steps.push({
      name: match[1].trim(),
      text: match[2].trim().split("\n\n")[0].trim(),
    });
    match = stepHeadingPattern.exec(markdown);
  }

  if (steps.length > 0) {
    return steps;
  }

  // Pattern 2: Numbered list items (1. Step text)
  const numberedListPattern = /^\d+\.\s+\*\*(.+?)\*\*[:\s-]*(.+)$/gm;
  let nlMatch = numberedListPattern.exec(markdown);
  while (nlMatch !== null) {
    steps.push({
      name: nlMatch[1].trim(),
      text: nlMatch[2].trim(),
    });
    nlMatch = numberedListPattern.exec(markdown);
  }

  if (steps.length > 0) {
    return steps;
  }

  // Pattern 3: Plain numbered list items
  const plainNumberedPattern = /^\d+\.\s+(.+)$/gm;
  let pnMatch = plainNumberedPattern.exec(markdown);
  while (pnMatch !== null) {
    const fullText = pnMatch[1].trim();
    const sentenceSplit = fullText.indexOf(". ");
    if (sentenceSplit > 0 && sentenceSplit < 80) {
      steps.push({
        name: fullText.slice(0, sentenceSplit),
        text: fullText.slice(sentenceSplit + 2),
      });
    } else {
      steps.push({
        name: fullText,
        text: fullText,
      });
    }
    pnMatch = plainNumberedPattern.exec(markdown);
  }

  return steps;
}
