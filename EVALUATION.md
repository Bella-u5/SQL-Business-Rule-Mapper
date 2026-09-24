# Synthetic evaluation — v0.2

Run `npm run evaluate`. Twenty independently authored synthetic SELECT queries exercise the extractor. The check compares **the number of extracted rule rows** to an expected count and, for CTE/window examples, the presence of a limitation warning. Current result: **20/20 scenarios pass**. This is a narrow structural completeness check, not field-level accuracy, semantic correctness, user adoption, or time saved.

The 20 cases cover: one or two fields, explicit aliases, commas inside functions and strings, one or two WHEN branches, simple CASE expression, CASE without ELSE, multiple CASE fields, WHERE, one or two JOINs, GROUP BY/HAVING, ORDER BY, comments, quoted SQL keywords, multiline CASE, CTE warnings and window-function warnings. Five additional unit assertions check branch values, source positions, JOIN detection and the absence of invented meanings. A mocked model service integration test checks that suggestions stay pending and unknown IDs are dropped.

## Next validation before a resume metric

1. Hand-label each expected field, condition, result and source span for the synthetic set; measure exact match and branch recall, not just row counts.
2. Add unsupported realistic SQL cases (nested CASE, nested SELECT, multiple dialects) and record coverage and abstention separately.
3. With an approved model endpoint, compare suggestions against a human-written glossary and log incorrect semantics and human corrections.
4. Ask target users to complete a rules document using their own permitted nonconfidential SQL. Measure completion time, correction rate and usefulness against their existing process.

No model has been connected to this deliverable and no human-user study has been run. The integration test uses a local mock, so it validates the transport and review boundary, not model quality.
