import { readFileSync, writeFileSync } from "node:fs";
import { chat, parseJson } from "../chat.js";
import { flag, type Agent } from "./types.js";

async function crew(steps: Array<{ role: string; task: string }>, input: string): Promise<string> {
  let notes = input;
  for (const step of steps) {
    notes = await chat({
      system: step.role,
      user: `${step.task}\n\nContext so far:\n${notes}`,
      temperature: 0.3,
    });
  }
  return notes;
}

export const emailDrafting: Agent = {
  name: "email-drafting",
  description: "Brief an email, then draft it.",
  usage: "email-drafting --context \"Follow up on Tuesday's demo\" --tone professional --recipient \"a potential client\"",
  async run(flags) {
    const draft = await crew(
      [
        { role: "You distill business situations into an email brief: purpose, key points, call to action, and subject line.", task: "Write the brief only." },
        { role: "You write concise business emails under 200 words, with subject, greeting, body, and closing.", task: "Draft the email from the brief." },
      ],
      `Context: ${flag(flags, "context", "Follow up on our product demo from last Tuesday.")}\nTone: ${flag(flags, "tone", "professional and friendly")}\nRecipient: ${flag(flags, "recipient", "a potential client")}`
    );
    console.log(draft);
  },
};

export const travelPlanner: Agent = {
  name: "travel-planner",
  description: "Plan an itinerary for a destination, budget, and interests.",
  usage: "travel-planner --destination Lisbon --days 4 --budget 1200 --interests food,museums",
  async run(flags) {
    const plan = await crew(
      [
        { role: "You research a destination and list neighborhoods, transit, and must-see stops.", task: "Write the research notes." },
        { role: "You turn research into a day-by-day itinerary with estimated costs.", task: "Write the itinerary." },
      ],
      `Destination: ${flag(flags, "destination", "Lisbon")}\nDays: ${flag(flags, "days", "4")}\nBudget: ${flag(flags, "budget", "1500")}\nInterests: ${flag(flags, "interests", "food, walking")}`
    );
    console.log(plan);
  },
};

export const socialMedia: Agent = {
  name: "social-media",
  description: "Turn a topic into posts for the requested platforms.",
  usage: "social-media --topic \"shipping a TypeScript agent kit\" --brand Payslate --platforms linkedin,x",
  async run(flags) {
    const posts = await chat({
      system: "You write platform-native social posts. Return one section per platform.",
      user: `Topic: ${flag(flags, "topic", "AI agents")}\nBrand: ${flag(flags, "brand", "our product")}\nPlatforms: ${flag(flags, "platforms", "linkedin,x")}`,
      temperature: 0.4,
    });
    console.log(posts);
  },
};

export const jobApplication: Agent = {
  name: "job-application",
  description: "Tailor a resume summary and cover note to a job description.",
  usage: "job-application --job ./job.txt --candidate ./resume.txt",
  async run(flags) {
    const job = flags.get("job") ? readFileSync(flags.get("job")!, "utf8") : flag(flags, "job-desc");
    const candidate = flags.get("candidate") ? readFileSync(flags.get("candidate")!, "utf8") : flag(flags, "candidate");
    if (!job || !candidate) throw new Error("Pass --job and --candidate file paths, or --job-desc text.");
    const packet = await crew(
      [
        { role: "You extract required skills and gaps from a job description and a candidate profile.", task: "Write the fit brief." },
        { role: "You write a tailored professional summary and a short cover note. Do not invent employers or degrees.", task: "Write the application packet." },
      ],
      `Job:\n${job}\n\nCandidate:\n${candidate}`
    );
    console.log(packet);
  },
};

export const recipeAgent: Agent = {
  name: "recipe",
  description: "Suggest recipes from ingredients, diet, time, and servings.",
  usage: "recipe --ingredients \"eggs, spinach, rice\" --diet vegetarian --time 30 --servings 2",
  async run(flags) {
    const raw = await chat({
      system: "Return JSON only: {\"recipes\":[{\"title\":\"\",\"minutes\":0,\"servings\":0,\"ingredients\":[],\"steps\":[]}]}",
      user: `Ingredients: ${flag(flags, "ingredients", "eggs, rice")}\nDiet: ${flag(flags, "diet", "none")}\nMax minutes: ${flag(flags, "time", "30")}\nServings: ${flag(flags, "servings", "2")}`,
    });
    const parsed = parseJson<{ recipes: Array<{ title: string; minutes: number; steps: string[] }> }>(raw);
    for (const recipe of parsed.recipes ?? []) {
      console.log(`\n${recipe.title} (${recipe.minutes} min)`);
      for (const step of recipe.steps ?? []) console.log(`- ${step}`);
    }
  },
};

export const meetingNotes: Agent = {
  name: "meeting-notes",
  description: "Turn a transcript into decisions, owners, and action items.",
  usage: "meeting-notes --file ./transcript.txt --output ./notes.md",
  async run(flags) {
    const transcript = flags.get("file")
      ? readFileSync(flags.get("file")!, "utf8")
      : flag(flags, "text");
    if (!transcript) throw new Error("Pass --file or --text.");
    const notes = await chat({
      system: "Write meeting notes with attendees if named, decisions, action items (owner and due date when stated), and open questions. Do not invent owners.",
      user: transcript,
    });
    const output = flags.get("output");
    if (output) writeFileSync(output, notes);
    console.log(notes);
  },
};

export const documentationWriter: Agent = {
  name: "documentation-writer",
  description: "Write a README section or doc comments for a source file.",
  usage: "documentation-writer --file ./src/cli.ts --format readme",
  async run(flags) {
    const code = flags.get("file") ? readFileSync(flags.get("file")!, "utf8") : flag(flags, "code");
    if (!code) throw new Error("Pass --file or --code.");
    const format = flag(flags, "format", "readme");
    const docs = await chat({
      system: format === "docstrings"
        ? "Add concise documentation comments above each exported function. Return the updated source."
        : "Write a README section: purpose, how to run, and the main functions. Use only what the source shows.",
      user: code.slice(0, 14000),
    });
    console.log(docs);
  },
};
