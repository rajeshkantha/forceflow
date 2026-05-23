import { createOpenAI, openai } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModelV1 } from "ai";

interface ModelConfig {
  provider: string;
  modelName: string;
  apiKeyEnc: string | null;
  baseUrl: string | null;
}

function decrypt(enc: string | null): string {
  return enc ? Buffer.from(enc, "base64").toString("utf8") : "";
}

export function resolveModel(config: ModelConfig): LanguageModelV1 {
  const apiKey = decrypt(config.apiKeyEnc);
  const modelName = config.modelName;

  switch (config.provider) {
    case "openai": {
      const client = createOpenAI({ apiKey });
      return client(modelName);
    }
    case "anthropic": {
      const client = createAnthropic({ apiKey });
      return client(modelName) as any;
    }
    case "openrouter": {
      const client = createOpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        headers: {
          "HTTP-Referer": "https://forceflow.app",
          "X-Title": "ForceFlow",
        },
      });
      return client(modelName);
    }
    case "custom": {
      const client = createOpenAI({
        apiKey,
        baseURL: config.baseUrl ?? "https://api.openai.com/v1",
      });
      return client(modelName);
    }
    default: {
      // Fallback to OpenAI-compatible
      const client = createOpenAI({ apiKey });
      return client(modelName);
    }
  }
}
