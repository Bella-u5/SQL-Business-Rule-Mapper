# SQL Business Rule Mapper

A public, synthetic-data prototype inspired by the enterprise workflow of turning SQL logic into reviewable business rules. Independently built from scratch. No Deloitte or client SQL, schema, prompts, data or internal code are used.

## Run

Node.js 20+; no dependencies or build step. Run `npm start`, then open http://localhost:4173. Run `npm test` for extractor and model-interface checks. Run `npm run evaluate` for the 20-case synthetic scenario set; see [EVALUATION.md](EVALUATION.md).

## Workflow

Load one of three synthetic SQL examples or paste public SQL. Parse fields and clauses. Click a source line to select the original SQL fragment. Edit business meanings, manually confirm each row, and export CSV with review status.

## Optional model suggestions

Set server environment variables `LLM_BASE_URL` (API root ending in `/v1`), `LLM_API_KEY`, and `LLM_MODEL` for an OpenAI-compatible `/chat/completions` service. Credentials stay server-side. Without these variables, parsing, review and export still work. Model suggestions are always marked pending. Before public deployment with a paid key, add authentication and rate limits. Never submit confidential SQL to an external model without permission.

## Validation and limits

Automated tests cover CASE branches, source positions, JOIN, quoted commas, non-invention, and the pending-review boundary for a mocked model response. This conservative extractor does not fully parse SQL dialects, CTE chains, nested SELECTs, window expressions, or complex nested CASE. Manual checking remains necessary. No claim is made about time saved, adoption, model accuracy or production use.

**User:** analyst or project member preparing field mappings and business rule documentation. **Product choice:** deterministic structure extraction, cautious optional model suggestions, explicit human confirmation. **Future pilot metrics:** branch coverage, unsupported-query rate, incorrect semantic suggestion rate, human correction rate, and time to a reviewed table.
