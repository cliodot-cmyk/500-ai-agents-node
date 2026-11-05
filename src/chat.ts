import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function chat(options: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Set OPENAI_API_KEY in .env before running an agent.");
  }

  const response = await client.chat.completions.create({
    model: options.model ?? "gpt-4o-mini",
    temperature: options.temperature ?? 0,
    messages: [
      { role: "system", content: options.system },
      { role: "user", content: options.user },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

export function parseJson<T>(text: string): T {
  const fenced = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const match = fenced.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : fenced) as T;
}
