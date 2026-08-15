# ADR 0001: LLM is never trusted for financial calculations

## Status

Accepted

## Context

This product is a local-first personal finance copilot. Users will ask natural-language questions such as “Can I spend INR 5,000 on headphones?” and eventually tax-related questions. Large language models are useful for intent parsing and explanation, but they are non-deterministic, can hallucinate numbers, and cannot be audited as a calculation engine.

## Decision

1. All money, tax, balances, forecasts, eligibility, and purchase decisions are computed only by deterministic application code in `packages/finance-core` (and related API orchestration).
2. The LLM may call typed tools that return pre-computed facts. It may explain those facts. It must never invent amounts or write to PostgreSQL directly.
3. Financial writes require an explicit user confirmation token after a draft is validated by the API.
4. AI is feature-flagged (`AI_ENABLED=false` by default) so finance features work with the model fully disabled.

## Consequences

- Purchase evaluation and goal forecasting remain repeatable for identical inputs.
- Audit logs can store calculation version, inputs, and outputs without relying on model transcripts.
- Chat UX is more constrained (draft → confirm) but safer on a shared home network.
- Tax answers must cite versioned rule sets, not model training knowledge.
