import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { chat, parseJson } from "../chat.js";
import { flag, type Agent } from "./types.js";

export const codeReview: Agent = {
  name: "code-review",
  description: "Review source for bugs, risk, and missing tests.",
  usage: "code-review --file ./src/cli.ts",
  async run(flags) {
    const code = flags.get("file") ? readFileSync(flags.get("file")!, "utf8") : flag(flags, "code");
    if (!code) throw new Error("Pass --file or --code.");
    const review = await chat({
      system: "You are a staff engineer. Review for correctness, security, and missing tests. Lead with findings, then a short summary. Do not rewrite the whole file.",
      user: `Language: ${flag(flags, "language", "auto")}\n\n${code.slice(0, 14000)}`,
    });
    console.log(review);
  },
};

export const unitTestGenerator: Agent = {
  name: "unit-test-generator",
  description: "Generate unit tests for a source file.",
  usage: "unit-test-generator --file ./src/catalog.ts --output ./catalog.test.ts",
  async run(flags) {
    const code = flags.get("file") ? readFileSync(flags.get("file")!, "utf8") : flag(flags, "code");
    if (!code) throw new Error("Pass --file or --code.");
    const tests = await chat({
      system: "Write Node.js test code with node:test for the public functions you can see. Do not import libraries that are not already imported by the source.",
      user: code.slice(0, 14000),
    });
    const output = flags.get("output");
    if (output) writeFileSync(output, tests);
    console.log(tests);
  },
};

export const sqlQuery: Agent = {
  name: "sql-query",
  description: "Answer a question against a SQLite database. Creates a demo database when --db is omitted.",
  usage: "sql-query --question \"Which product sold the most units?\"",
  async run(flags) {
    const question = flag(flags, "question", "Which product has the highest revenue?");
    const dbPath = flags.get("db") ?? join(tmpdir(), "agents-demo.sqlite");
    const db = new DatabaseSync(dbPath);
    if (!flags.get("db")) seedDemo(db);
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND sql IS NOT NULL").all();
    const sql = await chat({
      system: "Write one SQLite SELECT statement and nothing else. Do not modify data.",
      user: `Schema:\n${JSON.stringify(schema)}\n\nQuestion: ${question}`,
    });
    const statement = sql.replace(/```sql|```/g, "").trim();
    if (!/^select\s/i.test(statement)) throw new Error("The model did not return a SELECT statement.");
    const rows = db.prepare(statement).all();
    console.log(statement);
    console.log(JSON.stringify(rows, null, 2));
    db.close();
  },
};

function seedDemo(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT, units INTEGER, price REAL);
    DELETE FROM products;
    INSERT INTO products (name, units, price) VALUES
      ('Notebook', 120, 12.5),
      ('Pen', 400, 1.5),
      ('Lamp', 40, 28);
  `);
}

export const dataAnalysis: Agent = {
  name: "data-analysis",
  description: "Summarize a CSV and answer a question about it.",
  usage: "data-analysis --file ./sales.csv --question \"Which region grew?\"",
  async run(flags) {
    const file = flag(flags, "file");
    const question = flag(flags, "question", "Summarize the dataset.");
    const csv = file ? readFileSync(file, "utf8") : sampleCsv();
    const answer = await chat({
      system: "You analyze tabular data. Describe the columns, notable values, and answer the question. Do not invent rows that are not in the sample.",
      user: `Question: ${question}\n\nCSV:\n${csv.slice(0, 12000)}`,
    });
    console.log(answer);
  },
};

function sampleCsv() {
  return "region,month,revenue\nNorth,Jan,12000\nNorth,Feb,13200\nSouth,Jan,9000\nSouth,Feb,8700\n";
}

export const resumeParser: Agent = {
  name: "resume-parser",
  description: "Parse a resume into JSON and optionally score it against a job description.",
  usage: "resume-parser --resume ./resume.txt --job ./job.txt",
  async run(flags) {
    const resume = flags.get("resume") ? readFileSync(flags.get("resume")!, "utf8") : "";
    if (!resume) throw new Error("Pass --resume.");
    const parsed = await chat({
      system: "Extract resume JSON with name, email, skills, experience[{title,company,highlights}], education. Use empty fields when unknown.",
      user: resume.slice(0, 12000),
    });
    console.log(parsed);
    const job = flags.get("job");
    if (!job) return;
    const score = await chat({
      system: "Score resume-to-job fit from 0 to 100. List matching skills, gaps, and a one-paragraph recommendation.",
      user: `Resume JSON:\n${parsed}\n\nJob:\n${readFileSync(job, "utf8")}`,
    });
    console.log("\n" + score);
  },
};

export const customerSupport: Agent = {
  name: "customer-support",
  description: "Answer from a local knowledge-base directory, or say when a person should take over.",
  usage: "customer-support --kb ./kb --question \"How do I reset my password?\"",
  async run(flags) {
    const question = flag(flags, "question", "How do I reset my password?");
    const kbDir = flag(flags, "kb");
    const documents = kbDir ? loadKnowledge(kbDir) : defaultKnowledge();
    const terms = question.toLowerCase().split(/\W+/).filter((term) => term.length > 3);
    const ranked = documents
      .map((document) => ({
        document,
        score: terms.reduce((total, term) => total + (document.toLowerCase().includes(term) ? 1 : 0), 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.document)
      .join("\n\n");
    const answer = await chat({
      system: "You are a support agent. Answer from the knowledge base. If the issue needs account access, billing changes, or legal review, say it should be escalated.",
      user: `Knowledge:\n${ranked}\n\nQuestion: ${question}`,
    });
    console.log(answer);
  },
};

function loadKnowledge(directory: string): string[] {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".md") || name.endsWith(".txt"))
    .map((name) => readFileSync(join(directory, name), "utf8"));
}

function defaultKnowledge(): string[] {
  return [
    "Password reset: open Settings, choose Security, then Send reset email. The link expires in 30 minutes.",
    "Billing: refunds for annual plans are reviewed by a person and are not issued from chat.",
  ];
}

export const githubIssueTriager: Agent = {
  name: "github-issue-triager",
  description: "Classify a GitHub issue by severity, category, and likely owner.",
  usage: "github-issue-triager --title \"Login fails on Safari\" --body \"Steps...\"",
  async run(flags) {
    let title = flag(flags, "title");
    let body = flag(flags, "body");
    let labels: string[] = [];
    const issueUrl = flags.get("issue-url");
    if (issueUrl) {
      const fetched = await fetchIssue(issueUrl);
      title = fetched.title;
      body = fetched.body;
      labels = fetched.labels;
    }
    if (!title) throw new Error("Pass --title or --issue-url.");
    const raw = await chat({
      system: "Return JSON only with severity, category, priority_score, labels, summary, reproduction_clear, assignee_type, needs_more_info, triage_notes.",
      user: `Title: ${title}\nLabels: ${labels.join(", ")}\n\n${body}`,
    });
    console.log(JSON.stringify(parseJson(raw), null, 2));
  },
};

async function fetchIssue(url: string) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!match) throw new Error("Pass a GitHub issue URL.");
  const [, owner, repo, number] = match;
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${number}`, { headers });
  if (!response.ok) throw new Error(`GitHub issue lookup failed (${response.status}).`);
  const data = (await response.json()) as { title: string; body?: string; labels?: Array<{ name: string }> };
  return { title: data.title, body: data.body ?? "", labels: (data.labels ?? []).map((label) => label.name) };
}
