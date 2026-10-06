# Quality Gate Review

Snapshot before review: commit `28b077e` ("v1 snapshot"), time: <ใส่เวลาจริงจาก git log>
Review commits: `576e0c5` (Finding 1), `0ab40fa` (Finding 2)

## Quality Gate Review Record

| Quality Gate area | Finding | Action taken | Evidence |
|---|---|---|---|
| Accuracy | A booking sent as `16:00+07:00` to `18:00+07:00` (= 09:00Z to 11:00Z) overlapped an existing booking but returned `201`, because v1 stored and compared the raw date strings. | Changed `date()` to require ISO 8601 with a timezone and to normalize every value to UTC with `toISOString()` before validation and storage. | Before: `201` (id `8e649d6a...`, stored with `+07:00`). After: same request returns `409`; a date without timezone (`"2026-10-20"`) returns `400`; a non-overlapping `+07:00` booking returns `201` with `...Z` values. Commit `576e0c5`. |
| Reliability | The overlap check (SELECT) and the INSERT/UPDATE were two separate statements, leaving a theoretical gap where concurrent requests could both pass the check. A 5-parallel-request test on local D1 did not reproduce a real race. | POST now uses `INSERT ... SELECT ... WHERE NOT EXISTS (...)` and PATCH uses `UPDATE ... WHERE id = ? AND NOT EXISTS (... AND id != ?)`. Both check `meta.changes === 0` and return `409`. Removed the now unused `assertNoOverlap`. | `grep` shows `NOT EXISTS` twice and no `assertNoOverlap`. Race test after fix: `201` x1, `409` x4 (no regression). PATCH own purpose: `200` (no self-conflict). PATCH onto another booking's time: `409` and data unchanged. PATCH to a free slot: `200`. Commit `0ab40fa`. |
| Reasoning / You Own It | After my first edit of `date()`, curl still showed the old behaviour. I did not assume the fix was working. | Ran `grep -n "toISOString" src/index.ts`: no output, so the file had not been changed. Re-applied the change, confirmed `grep` showed 3 matching lines, restarted `wrangler dev` and retested. | `grep` empty before, 3 lines after. Same curl: `201` before, `409` after. |

## Quality Gate checklist result (final check)

- Purpose, Reliability, Accuracy, Delivery Quality: checked against `TEST_EVIDENCE.md` (19 cases).
- Reasoning / You Own It: I can explain 400/404/409, the overlap query for create and update, and parameter binding.
- Known limitations: no authentication, no pagination, tested on local D1 only, race condition could not be reproduced locally.

Submission decision: READY
