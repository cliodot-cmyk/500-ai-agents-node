import { filterCatalog } from "./catalog.js";
import { agents, findAgent } from "./agents/index.js";

function parseFlags(argv: string[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) continue;
    const [name, inline] = token.slice(2).split("=", 2);
    if (!name) continue;
    if (inline !== undefined) {
      flags.set(name, inline);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      flags.set(name, next);
      index += 1;
    } else {
      flags.set(name, "true");
    }
  }
  return flags;
}

function printHelp() {
  console.log("Usage: npm run agent -- <command> [--flags]");
  console.log("\nCommands:");
  console.log("  list");
  console.log("  catalog [--industry Healthcare] [--framework CrewAI] [--search tutor]");
  for (const agent of agents) {
    console.log(`  ${agent.usage}`);
  }
}

const [command, ...rest] = process.argv.slice(2);
const flags = parseFlags(rest);

if (!command || command === "help" || command === "--help") {
  printHelp();
} else if (command === "list") {
  for (const agent of agents) console.log(`${agent.name}\t${agent.description}`);
} else if (command === "catalog") {
  const matches = filterCatalog(flags);
  console.log(`${matches.length} use cases`);
  for (const item of matches) {
    console.log(`- ${item.name} [${item.industry}${item.framework ? `, ${item.framework}` : ""}] ${item.sourceUrl ?? ""}`);
  }
} else {
  const agent = findAgent(command);
  if (!agent) {
    console.error(`Unknown agent "${command}". Run with no arguments to see the list.`);
    process.exitCode = 1;
  } else {
    agent.run(flags).catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
  }
}
