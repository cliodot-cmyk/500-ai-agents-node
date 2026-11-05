import { readFileSync } from "node:fs";
import { chat } from "../chat.js";
import { flag, type Agent } from "./types.js";

async function tavilySearch(query: string): Promise<Array<{ title?: string; url?: string; content?: string }>> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("Set TAVILY_API_KEY to run web-research.");
  }
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, query, max_results: 5 }),
  });
  if (!response.ok) {
    throw new Error(`Tavily search failed (${response.status}).`);
  }
  const data = (await response.json()) as { results?: Array<{ title?: string; url?: string; content?: string }> };
  return data.results ?? [];
}

export const webResearch: Agent = {
  name: "web-research",
  description: "Search the web and write a structured research report.",
  usage: "web-research --query \"latest advances in AI agents\"",
  async run(flags) {
    const query = flag(flags, "query", "latest advances in AI agents");
    const results = await tavilySearch(query);
    const evidence = results
      .map((item) => `Source: ${item.url ?? "n/a"}\nTitle: ${item.title ?? "n/a"}\nContent: ${(item.content ?? "").slice(0, 500)}`)
      .join("\n\n");
    const report = await chat({
      system: "You are a research analyst. Synthesize the search results into Summary, Key Findings, and Sources.",
      user: `Research query: ${query}\n\nSearch results:\n${evidence}`,
    });
    console.log(report);
  },
};

export const newsSummarizer: Agent = {
  name: "news-summarizer",
  description: "Fetch recent articles and write a news briefing.",
  usage: "news-summarizer --topic \"artificial intelligence\" --count 5",
  async run(flags) {
    const topic = flag(flags, "topic", "artificial intelligence");
    const count = Number(flag(flags, "count", "5")) || 5;
    const articles = await fetchNews(topic, count);
    const briefing = articles
      .slice(0, 5)
      .map((article) => `Title: ${article.title}\nSource: ${article.source}\nSummary: ${article.description}`)
      .join("\n\n");
    const summary = await chat({
      system: "You are a news analyst. Write a briefing with Top Story, Key Themes, What to Watch, and Quick Headlines.",
      user: `Topic: ${topic}\n\nArticles:\n${briefing}`,
    });
    console.log(summary);
  },
};

async function fetchNews(topic: string, count: number) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    return [
      { title: `Major development in ${topic}`, description: `Researchers announce a breakthrough in ${topic}.`, source: "Tech News" },
      { title: `${topic} industry sees rapid growth`, description: `A new report shows ${topic} adoption is up.`, source: "Business Daily" },
    ];
  }
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&language=en&pageSize=${count}&sortBy=publishedAt&apiKey=${apiKey}`;
  const response = await fetch(url);
  const data = (await response.json()) as { articles?: Array<{ title?: string; description?: string; source?: { name?: string } }> };
  return (data.articles ?? []).map((article) => ({
    title: article.title ?? "Untitled",
    description: article.description ?? "n/a",
    source: article.source?.name ?? "Unknown",
  }));
}

export const stockResearch: Agent = {
  name: "stock-research",
  description: "Pull a market quote and write an investment summary.",
  usage: "stock-research --ticker AAPL",
  async run(flags) {
    const ticker = flag(flags, "ticker").toUpperCase();
    if (!ticker) throw new Error("Pass --ticker, for example AAPL.");
    const quote = await fetchQuote(ticker);
    const analysis = await chat({
      system: "You are a financial analyst. Cover investment thesis, strengths, risks, valuation, and a Buy/Hold/Sell verdict in under 300 words.",
      user: `Analyze ${ticker}:\n${JSON.stringify(quote, null, 2)}`,
    });
    console.log(quote);
    console.log("\n" + analysis);
  },
};

async function fetchQuote(ticker: string) {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`);
  if (!response.ok) throw new Error(`Quote lookup failed for ${ticker}.`);
  const data = (await response.json()) as { chart?: { result?: Array<{ meta?: Record<string, unknown> }> } };
  const meta = data.chart?.result?.[0]?.meta ?? {};
  return {
    ticker,
    price: meta.regularMarketPrice,
    currency: meta.currency,
    exchange: meta.exchangeName,
    previousClose: meta.chartPreviousClose,
  };
}

export const competitiveAnalysis: Agent = {
  name: "competitive-analysis",
  description: "Identify competitors and write a comparison report.",
  usage: "competitive-analysis --company Notion --industry productivity",
  async run(flags) {
    const company = flag(flags, "company", "Notion");
    const industry = flag(flags, "industry", "productivity software");
    const competitors = await chat({
      system: "Name 4 direct competitors. Return a short bullet list with one sentence each.",
      user: `Company: ${company}\nIndustry: ${industry}`,
    });
    const report = await chat({
      system: "You are a strategy analyst. Write a competitive report with positioning, strengths, gaps, and recommended moves.",
      user: `Company: ${company}\nIndustry: ${industry}\nCompetitors:\n${competitors}`,
    });
    console.log(report);
  },
};

export const pdfQa: Agent = {
  name: "pdf-qa",
  description: "Answer a question from a text or PDF file.",
  usage: "pdf-qa --file ./notes.txt --question \"What is the conclusion?\"",
  async run(flags) {
    const file = flag(flags, "file");
    const question = flag(flags, "question");
    if (!file || !question) throw new Error("Pass --file and --question.");
    const text = extractText(readFileSync(file));
    const answer = await chat({
      system: "Answer only from the supplied document. Quote the relevant passage when you can. Say when the document does not contain the answer.",
      user: `Document:\n${text.slice(0, 12000)}\n\nQuestion: ${question}`,
    });
    console.log(answer);
  },
};

function extractText(bytes: Buffer): string {
  const asText = bytes.toString("utf8");
  if (!asText.startsWith("%PDF")) return asText;
  const pieces = [...asText.matchAll(/\((?:\\\)|[^)]){4,}\)/g)].map((match) =>
    match[0].slice(1, -1).replace(/\\n/g, "\n").replace(/\\\)/g, ")")
  );
  return pieces.join("\n") || "No extractable text was found in this PDF.";
}
