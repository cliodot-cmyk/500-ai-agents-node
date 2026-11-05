import { readFileSync } from "node:fs";
import { chat } from "../chat.js";
import { flag, type Agent } from "./types.js";

export const multiAgentDebate: Agent = {
  name: "multi-agent-debate",
  description: "Run a short for/against debate and a judge's verdict.",
  usage: "multi-agent-debate --topic \"Remote work is better than office work\" --rounds 2",
  async run(flags) {
    const topic = flag(flags, "topic", "AI will create more jobs than it eliminates over the next decade");
    const rounds = Math.min(4, Math.max(1, Number(flag(flags, "rounds", "2")) || 2));
    const pro: string[] = [];
    const con: string[] = [];
    for (let round = 1; round <= rounds; round += 1) {
      const proArgument = await chat({
        system: "You argue FOR the topic. Stay under 150 words and answer the previous opposing point when one is provided.",
        user: `Topic: ${topic}\nRound: ${round}\nOpponent said: ${con.at(-1) ?? "This is the opening."}`,
        temperature: 0.6,
      });
      const conArgument = await chat({
        system: "You argue AGAINST the topic. Stay under 150 words and answer the previous point.",
        user: `Topic: ${topic}\nRound: ${round}\nOpponent said: ${proArgument}`,
        temperature: 0.6,
      });
      pro.push(proArgument);
      con.push(conArgument);
      console.log(`\nRound ${round}\nFOR: ${proArgument}\n\nAGAINST: ${conArgument}`);
    }
    const verdict = await chat({
      model: "gpt-4o",
      system: "You are an impartial debate judge. Name a winner, score each side out of 10, and write a short synthesis.",
      user: `Topic: ${topic}\n\nFOR:\n${pro.join("\n\n")}\n\nAGAINST:\n${con.join("\n\n")}`,
    });
    console.log(`\nVERDICT\n${verdict}`);
  },
};

export const piiSanitization: Agent = {
  name: "pii-sanitization",
  description: "Send text to TrustBoost and fail closed if sanitization does not succeed.",
  usage: "pii-sanitization --text \"Email me at a@b.com\"",
  async run(flags) {
    const file = flags.get("file");
    const text = file
      ? readFileSync(file, "utf8")
      : flag(flags, "text", "Hi, I'm Juan Pérez. My email is juan.perez@example.com and my phone is +1-555-123-4567.");
    const base = process.env.TRUSTBOOST_API_BASE ?? "https://api.trustboost.dev";
    const result = await sanitize(base, text, flag(flags, "context", "general"), flag(flags, "tx-hash", "TRIAL"));
    console.log(JSON.stringify(result, null, 2));
  },
};

async function sanitize(base: string, text: string, context: string, txHash: string) {
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/sanitize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        tx_hash: txHash,
        wallet_address: process.env.TRUSTBOOST_WALLET ?? "demo-agent",
        context,
      }),
    });
    if (response.status === 200) return response.json();
    if (response.status === 402) {
      return { status: "payment_required", sanitized_content: "[REDACTED — payment required to sanitize]" };
    }
    return { status: "error", sanitized_content: "[REDACTED — unexpected response]", http_status: response.status };
  } catch (error) {
    return {
      status: "error",
      sanitized_content: "[REDACTED — sanitization service unreachable]",
      error: error instanceof Error ? error.message : "request failed",
    };
  }
}
