# AI Log
| # | Prompt (summary) | What I used | What I verified myself |
|---|---|---|---|
| 1 | Plan for the lab test and rubric checklist | Order of work, rubric checklist | Compared with exam_brief and rubric |
| 2 | Hono + D1 API, schema, overlap query | schema.sql, src/index.ts v1 | Read the code, ran curl for each endpoint |
| 3 | Debug setup problems (files in wrong folder, zsh parse errors, server not running) | Commands to move files and restart | Checked pwd, ls and curl output |
| 4 | Fix timezone/overlap bug | date() with ISO regex + toISOString | grep to confirm the edit, before/after curl |
| 5 | Atomic overlap check | INSERT/UPDATE ... WHERE NOT EXISTS | grep, race test, PATCH tests |
| 6 | test.sh for curl evidence | test.sh (19 cases) | Checked every status code against expected |

Note: the race test did not show a real race locally; I recorded it as a theoretical risk.
