# Quality Gate Review
Snapshot before review: commit 28b077e ("v1 snapshot")

| Quality Gate area | Finding | Action taken | Evidence |
|---|---|---|---|
| Accuracy | Booking 16:00+07:00-18:00+07:00 (= 09-11Z) overlapped an existing booking but returned 201, because v1 stored/compared raw strings. | date() now requires ISO 8601 with timezone and normalizes to UTC with toISOString(). | Before: 201 (id 8e649d6a...). After: 409; date without timezone -> 400; non-overlapping +07:00 -> 201 with ...Z output. Commit 576e0c5. |
| Reliability | Overlap check (SELECT) and INSERT/UPDATE were two separate statements, a theoretical gap for concurrent requests. A 5-parallel-request test on local did not reproduce a race. | POST uses INSERT...WHERE NOT EXISTS, PATCH uses UPDATE...WHERE NOT EXISTS (excludes own id); meta.changes === 0 -> 409. Removed unused assertNoOverlap. | grep shows NOT EXISTS x2 and no assertNoOverlap; race test after fix 201 x1 / 409 x4; PATCH own purpose 200; PATCH onto another booking 409; PATCH to free slot 200. Commit 0ab40fa. |
| Reasoning / You Own It | After my first edit of date(), curl still showed the old behaviour. I did not assume the fix worked. | Ran grep "toISOString" src/index.ts: empty, so the file had not been changed. Re-applied the fix, confirmed grep shows 3 lines, restarted and retested. | grep output empty before / 3 matching lines after; curl 201 before / 409 after. |
