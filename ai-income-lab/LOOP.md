# Hourly loop protocol

A Routine wakes the Claude Code session every hour, at :10, until **2026-10-11 15:09 JST**.
Each run follows [`.claude/skills/income-loop/SKILL.md`](.claude/skills/income-loop/SKILL.md).

In short:

1. **Locate:** read `SCHEDULE.md` and find the block for the current JST hour.
2. **Observe:** collect metrics (repo stars, sales dashboards the owner shares, listing views) into `log/metrics.csv`.
3. **Act:** do the scheduled block's work. If a step needs the owner, add it to `APPROVALS.md` and move on.
4. **Evaluate:** compare against the previous hour and decide keep / change / drop. Changing the method or the plan is allowed, but it is logged with a reason and fitted into the schedule's slots.
5. **Record:** append an English entry to `log/LOG.md`, then commit and push.
6. **Stop:** after 2026-10-11 15:09 JST, write the final report and disable the Routine.
