import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface UseCase {
  name: string;
  industry: string;
  description: string;
  framework: string | null;
  sourceUrl: string | null;
  kind: "industry-example" | "framework-example";
}

const catalogPath = join(dirname(fileURLToPath(import.meta.url)), "../catalog/use-cases.json");

export function loadCatalog(): UseCase[] {
  return JSON.parse(readFileSync(catalogPath, "utf8")) as UseCase[];
}

export function filterCatalog(flags: Map<string, string>): UseCase[] {
  const industry = flags.get("industry")?.toLowerCase();
  const framework = flags.get("framework")?.toLowerCase();
  const search = flags.get("search")?.toLowerCase();

  return loadCatalog().filter((item) => {
    if (industry && item.industry.toLowerCase() !== industry) return false;
    if (framework && (item.framework ?? "").toLowerCase() !== framework) return false;
    if (search) {
      const haystack = `${item.name} ${item.description} ${item.industry}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}
