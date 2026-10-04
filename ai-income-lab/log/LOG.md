# Event log

## 2026-10-04 14:55 JST · Setup
- Owner asked for: a new repo with an English log; three zero-capital money-making methods found through prior-art and GitHub skills/mods search; real execution; an hourly try-and-error loop for one week.
- Tried to create `ayukari/ai-income-lab` through the GitHub integration and got **403 Resource not accessible by integration**. Logged as approval A1. The lab is staged in `ayukari/-` under `ai-income-lab/` for now.
- Did a quick first search and built early drafts: a JP back-office skills pack with a tested invoice calculator (3/3 tests pass), plus outlines for a Zenn book and templates.

## 2026-10-04 15:09 JST · Owner changed the process
- New rule from the owner: 3 hours of prior-art research → 1 hour choosing 3 candidates → write a careful 1-week schedule → then work. Follow the schedule in principle no matter what.
- Moved the early drafts to `drafts-provisional/`, so they are not a commitment.
- Wrote `SCHEDULE.md` (Day 0 blocks R1–R3, S1, W1), `LOOP.md`, and the `income-loop` skill.
- Block R1 started.
- Started three R1 research agents in parallel: global methods, Japan channels and rules, and GitHub skills/mods prior art. Outputs go to `research/R1-*.md`.
- Created the hourly Routine `trig_016i6Qf9W6EQT2gjU7YRa9sW`. It fires at :10 every hour into this session; the first fire is 16:10 JST.
- R1 agent "GitHub skills/mods prior art" finished → `research/R1-github-prior-art.md`. Key points: both public "AI agent earns money" experiments made $0 (blocked by KYC and buyer reach, and spam got one suspended). Japanese skills have high demand and low supply (about 0.27% of agent-skills repos). Japanese back-office is nearly empty. Zenn nets about ¥868 per ¥1,000 book. Modrinth and CurseForge pay out too slowly for cash in week 1.
- R1 agent "global methods" finished → `research/R1-global-methods.md`. Key points:
  - No public case shows an AI earning money in week 1 from $0 with no audience. Distribution and KYC are the bottleneck.
  - Best fit (3/5) is a small, high-quality paid digital product that the owner shares personally.
  - Avoid AI bug-bounty reports and mass PRs or issues (account-suspension risk).
  - Payout holds mean week-1 earnings mostly won't reach the bank in week 1.
  - Note: GitHub Pages terms forbid commercial or SaaS use; the Cloudflare Workers free tier allows it.
- R1 agent "Japan channels and rules" finished → `research/R1-japan-channels.md`.
  - Only Zenn paid books show evidence of a first sale within days from a small or new account (score 4).
  - No channel pays out cash within 7 days.
  - Zenn's policy allows AI writing only if a human reviews it; bot-run accounts and mass posting are restricted.
  - BOOTH has hidden mass-produced AI goods since 2025-07. pixivFANBOX bans AI content. App stores need fees (not zero-capital).
- R1 complete (3/3 reports). Proxy blocked direct page reads, so R2 must verify key numbers via other routes (GitHub-hosted sources, multiple snippets).

## 2026-10-04 16:0x JST · Owner clarified the goal
- Owner: "It is fine not to have sales results within one week."
- Effect: week-1 revenue is no longer a selection criterion or a success metric. S1 will weight **long-term revenue potential, compounding assets, and learning** over time-to-first-sale. Slow-payout channels (GitHub Sponsors, Modrinth/CurseForge, KDP) are back in consideration.
