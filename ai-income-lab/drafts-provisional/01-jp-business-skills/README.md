# Strategy 1: JP back-office Agent Skills pack

**Product:** `jp-backoffice-skills`, a free, open-source Claude Code / Agent Skills pack for Japanese freelancers and small businesses.

| Skill | What it does |
|---|---|
| `invoice-jp` | Builds and checks qualified invoices (適格請求書). Uses a tested calculator that rounds tax once per rate. |
| `keigo-email` | Writes and corrects Japanese business email with keigo. |
| `expense-ledger-jp` | Turns statements and receipts into an expense ledger CSV (経費帳) with account titles. |

**Why:** the JP skills niche is thin. The closest repo is `coji/natural-japanese`, which got about 1.9k stars in 3 months, and nobody covers back-office work.

**Revenue path:**
1. Free public repo → stars and traffic.
2. GitHub Sponsors button (needs owner action A3).
3. Later, a "pro" bundle with more skills and templates, sold through strategy 3's shop and linked from the strategy 2 book.

**Install (once public):**
```bash
git clone https://github.com/ayukari/jp-backoffice-skills ~/.claude/skills/jp-backoffice-skills
```

**Tests:** `cd scripts && python3 -m unittest`

## Backlog (worked by the hourly loop)
- [ ] `quote-jp` (見積書) and `receipt-jp` (領収書, including 収入印紙 thresholds)
- [ ] HTML/PDF invoice output template
- [ ] English README section for international discoverability
- [ ] Topics/tags: `agent-skills`, `claude-code`, `japanese`, `invoice`
- [ ] Submit to awesome lists (needs public repo + owner approval)
