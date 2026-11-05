export interface Agent {
  name: string;
  description: string;
  usage: string;
  run: (flags: Map<string, string>) => Promise<void>;
}

export function flag(flags: Map<string, string>, name: string, fallback = ""): string {
  return flags.get(name) ?? fallback;
}
