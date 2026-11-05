import {
  codeReview,
  customerSupport,
  dataAnalysis,
  githubIssueTriager,
  resumeParser,
  sqlQuery,
  unitTestGenerator,
} from "./engineering.js";
import {
  competitiveAnalysis,
  newsSummarizer,
  pdfQa,
  stockResearch,
  webResearch,
} from "./research.js";
import { multiAgentDebate, piiSanitization } from "./safety.js";
import type { Agent } from "./types.js";
import {
  documentationWriter,
  emailDrafting,
  jobApplication,
  meetingNotes,
  recipeAgent,
  socialMedia,
  travelPlanner,
} from "./writing.js";

export const agents: Agent[] = [
  webResearch,
  codeReview,
  pdfQa,
  sqlQuery,
  emailDrafting,
  newsSummarizer,
  githubIssueTriager,
  dataAnalysis,
  resumeParser,
  meetingNotes,
  stockResearch,
  travelPlanner,
  customerSupport,
  socialMedia,
  unitTestGenerator,
  documentationWriter,
  recipeAgent,
  jobApplication,
  competitiveAnalysis,
  multiAgentDebate,
  piiSanitization,
];

export function findAgent(name: string): Agent | undefined {
  return agents.find((agent) => agent.name === name);
}
