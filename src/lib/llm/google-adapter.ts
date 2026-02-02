import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  type LLMRequest,
  type LLMResponse,
  DEFAULT_MODELS,
  calculateCost,
} from "./index";

export async function queryGoogle(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY is not set. Please add it to your environment variables."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = request.model ?? DEFAULT_MODELS.google;

  // Enable Google Search grounding so Gemini retrieves live web results
  // This mirrors how real users interact with Gemini (search grounding active)
  const generativeModel = genAI.getGenerativeModel({
    model,
    generationConfig: {
      temperature: request.temperature ?? 0.7,
      maxOutputTokens: request.maxTokens,
    },
    tools: [
      {
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: "MODE_DYNAMIC",
            dynamicThreshold: 0.3,
          },
        },
      } as never,
    ],
    systemInstruction: request.systemPrompt
      ? { role: "system", parts: [{ text: request.systemPrompt }] }
      : undefined,
  });

  const start = Date.now();

  const result = await generativeModel.generateContent(request.prompt);
  const response = result.response;

  const latencyMs = Date.now() - start;

  const text = response.text();
  const usageMetadata = response.usageMetadata;
  const tokensIn = usageMetadata?.promptTokenCount ?? 0;
  const tokensOut = usageMetadata?.candidatesTokenCount ?? 0;

  return {
    text,
    tokensIn,
    tokensOut,
    latencyMs,
    cost: calculateCost(model, tokensIn, tokensOut),
    model,
    provider: "google",
  };
}
