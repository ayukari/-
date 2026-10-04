---
name: income-loop
description: Run one hourly iteration of the AI Income Lab experiment. Use when the hourly Routine fires or when asked to "run the income loop".
---

# income-loop

One run = one schedule block. Keep each run focused and finish with a pushed commit.

## Steps

1. **Time and block.** Run `TZ=Asia/Tokyo date`. Open `SCHEDULE.md` and find the block whose time range contains now. If a previous block was missed, note it in the log and still do the **current** block. Do not shift the schedule.
2. **Past the end?** If now is after 2026-10-11 15:09 JST, write `FINAL_REPORT.md` (what was tried, metrics, revenue, lessons, next steps), disable the hourly Routine with `update_trigger` (`enabled=false`), push, and stop.
3. **Observe.** Append one row per tracked metric to `log/metrics.csv` (`timestamp_jst,strategy,metric,value,source`). Only record numbers you actually observed. Write `n/a` if a source isn't reachable yet.
4. **Act.** Do the block's work. Prefer shipping a small finished increment over starting something large.
   - Never create accounts, accept terms, spend money, or post publicly as the owner. Put those in `APPROVALS.md`.
   - Never use spam, fake reviews, engagement manipulation, or rule-breaking automation.
   - New skills, mods, or tools may be created whenever they help (the owner approved this).
5. **Evaluate.** In two or three sentences, say what changed versus last hour and what you'll keep, change, or drop. Plan changes are allowed but must fit the schedule's slots.
6. **Record.** Append to `log/LOG.md`:
   ```markdown
   ## 2026-10-04 16:09 JST · Block R2
   - Did: ...
   - Observed: ...
   - Decision: keep / change / drop ... because ...
   - Next: ...
   ```
   Then `git add -A && git commit` and push to the lab's remote with retries.
7. **Owner-facing.** Only message the owner (a final reply line) when an approval is newly needed or a milestone is hit. Otherwise keep the reply to one line.
