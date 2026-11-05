# 500 AI Agents — Node.js / TypeScript

A TypeScript port of the catalog and the 21 runnable examples in [ashishpatel26/500-AI-Agents-Projects](https://github.com/ashishpatel26/500-AI-Agents-Projects).

The original repository is a Python catalog. This project keeps the same use cases as data and reimplements the bundled agents with Node.js 22, TypeScript, and the OpenAI API. CrewAI and LangGraph flows are sequential model calls with the same roles. External projects linked from the catalog stay links; they are not copied here.

## Run

```bash
npm install
cp .env.example .env
npm run agent -- list
npm run agent -- catalog --industry Healthcare
npm run agent -- news-summarizer --topic "climate policy"
npm run agent -- sql-query --question "Which product has the highest revenue?"
```

`OPENAI_API_KEY` is required for model agents. `web-research` also needs `TAVILY_API_KEY`. `news-summarizer` uses sample headlines when `NEWS_API_KEY` is unset. `pii-sanitization` calls TrustBoost and returns redacted text if that service cannot be reached.

## Layout

- `catalog/` — industry and framework examples extracted from the original README tables
- `src/cli.ts` — `list`, `catalog`, and agent commands
- `src/agents` — the 21 runnable agents

## Agents

`web-research`, `code-review`, `pdf-qa`, `sql-query`, `email-drafting`, `news-summarizer`, `github-issue-triager`, `data-analysis`, `resume-parser`, `meeting-notes`, `stock-research`, `travel-planner`, `customer-support`, `social-media`, `unit-test-generator`, `documentation-writer`, `recipe`, `job-application`, `competitive-analysis`, `multi-agent-debate`, `pii-sanitization`.
