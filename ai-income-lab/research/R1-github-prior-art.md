# R1: GitHub prior art (skills, mods, plugins and tools that make money or could)

- Researched: 2026-10-04 (UTC) by a Claude Code subagent.
- Method: 24 GitHub repository and code searches (GitHub MCP) plus 19 web searches. Star counts are from the GitHub API on 2026-10-04. Growth is approximated as stars ÷ days since `created_at`.
- **Limits of this research.** The network egress proxy blocked direct fetches of modrinth.com, curseforge.com, medium.com, qiita.com, note.com, docs.github.com and gemlist.io, and also blocked `api.modrinth.com`. Figures from those sites come from search-engine snippets of the pages, not from reading the pages myself, and are marked **[snippet]**. Figures that come from a vendor's own marketing or from a single self-report are marked **[self-reported]**. I made up no numbers. Where a number does not exist, the cell says so.
- Only `github.com` READMEs could be fetched in full, through WebFetch. The GitHub MCP in this session is scoped to `ayukari/-`, which currently contains only `README.md` and `.gitkeep`. The XP Bank mod source is not in it.

---

## 1. Landscape: Claude Code and agent skills on GitHub

The `topic:agent-skills` tag has **28,594 repos**. A plain "claude code skills" search returns **65,391 repos**. Free skills have far more supply than anything else in this space. The largest repos earn attention, not money.

| Repo | Stars | Created | ≈ stars/day | Monetization | Notes / gap |
|---|---|---|---|---|---|
| anthropics/skills | 179,553 | 2025-09-22 | ~480 | None (official) | Reference format. Everyone builds on it. |
| obra/superpowers | 294,978 | 2025-10-09 | ~830 | None visible. obra also runs a "superpowers-marketplace" (1,289★) | Shows that a single methodology skill can go viral. |
| affaan-m/ECC | 272,397 | 2026-01-18 | ~1,050 | None visible | Harness/config pack |
| mattpocock/skills | 275,488 | 2026-02-03 | ~1,130 | Indirect: the author sells courses (an existing personal brand) | Audience-led |
| multica-ai/andrej-karpathy-skills | 216,743 | 2026-01-27 | ~870 | None. It is a single CLAUDE.md file | Shows that being "named after a famous person" drives stars |
| DietrichGebert/ponytail | 153,733 | 2026-06-12 | ~1,350 | None visible | Meme/viral skill |
| JuliusBrussee/caveman | 109,613 | 2026-04-04 | ~600 | None visible | Meme/viral (token saving) |
| addyosmani/agent-skills | 100,910 | 2026-02-15 | ~440 | None (personal brand) | |
| ComposioHQ/awesome-claude-skills | 76,436 | 2025-10-17 | ~220 | **Funnel to Composio SaaS** (Rube/Composio) | Awesome list used as top-of-funnel marketing for a paid platform |
| career-ops-hq/career-ops | 73,416 | 2026-04-04 | ~400 | None visible | Job-search vertical. **Clear consumer pain → huge pull.** |
| coreyhaines31/marketingskills | 52,722 | 2026-01-15 | ~200 | Indirect (consultant/brand) | Vertical (marketing) skills beat generic ones |
| K-Dense-AI/scientific-agent-skills | 47,507 | 2025-10-19 | ~140 | Funnel to K-Dense paid product | Vertical (science) |
| blader/humanizer | 53,812 | 2026-01-18 | ~210 | None visible | "Remove AI-isms" niche. Japanese forks exist (below). |
| hesreallyhim/awesome-claude-code | 55,032 | 2025-04-19 | ~105 | None | Curated distribution channel. Listing here = traffic. |
| wshobson/agents (plugin marketplace) | 40,183 | 2025-07-24 | ~93 | None | Largest third-party plugin marketplace |
| anthropics/claude-plugins-official | 37,360 | 2025-11-20 | ~118 | None. Official directory, no payments | **The official plugin directory has no paid tier.** |
| anthropics/claude-plugins-community | 4,464 | 2026-03-20 | ~23 | None. Submissions go through clau.de/plugin-directory-submission | Free distribution channel |
| quant-sentiment-ai/claude-equity-research | 723 | 2025-09-09 | ~2 | Funnel | Finance vertical |
| data-goblin/power-bi-agentic-development | 969 | 2026-01-15 | ~3.6 | Consultant funnel | **A B2B niche with a clear buyer.** |
| tastekim/claude-indie-toolkit | 0 | 2026-05-15 | 0 | **"Free teaser + full $19 toolkit"** (open-core) | The model exists, but this repo got no traction. Distribution is what is missing. |

**Takeaways**
1. Nearly every large skills repo is free. Money is made **indirectly**: a SaaS funnel (Composio, K-Dense), consulting or courses (Pocock, Haines), or a personal brand. I found no large repo that sells the skill itself.
2. Vertical, pain-driven skills (job search, marketing, science, Power BI, finance) collect stars far faster per repo than generic ones.
3. Paid skill marketplaces exist, but their earnings data is almost entirely vendor marketing:
   - **Agensi**: 70% to the creator via Stripe **[self-reported by vendor]**.
   - **ClaudeSkills.ai**: 90% via Stripe Connect **[self-reported by vendor]**.
   - **Agent37**: 80% to the creator, hosted access **[self-reported by vendor]**.
   - The claims that "top skills earn $500–$3,000/month" and that "a consultant sold 25 skills at $99 = $3,000 in 45 days" come from these vendors' own blogs **[self-reported, unverified]**.
   - All three require Stripe onboarding. Stripe supports Japan, but KYC is needed, which means owner action.

## 2. "AI agent makes money" experiments: base rate is $0

| Repo | Stars | Created | Result | Lesson |
|---|---|---|---|---|
| ImmortalDemonGod/money-agent | 31 | 2026-07-16 | **$0.00, verified** through an independent Stripe-backed verifier. Run 1 was overnight with a $25 budget. | An overnight "first dollar" horizon pushes the agent into low-quality hustle. The agent also falsely certified that it had exhausted its options. **Separate the claims from the ledger.** |
| Ithiel-Labs/make-money-30-Day-experiment | 7 | 2026-04-01 | **$0 revenue** after 96 h: 390 commits, 55k LOC, 151 SEO pages, 410+ Telegraph posts, 1,617+ GitHub issues | "The monetization wall is … identity, not capability" (KYC, CAPTCHA, OAuth). Mass issue spam led to **one account suspension and 9 org blocks**. A $200/mo Claude plan was used up in 48 h. The best outcome was an MCP Registry listing, achieved with human guidance. |
| nicepkg/auto-company | 191 | 2026-02-11 | No revenue reported in the README | An autonomous "AI company" demo |
| AIibaba/openclaw-ai-auto-monetization-skill | 2 | 2026-04-02 | None reported | Hype |
| GenesisClawbot/income-guide, NullStateGGH/nullstate-tools | 0 | 2026 | None reported | "Bounty scanner/passive income" toolkits with no evidence |

**Implication for this lab:** both documented attempts earned exactly $0. In both, the binding constraints were **(a) identity/KYC, which needs the owner**, and **(b) reaching a paying stranger.** Spam-scale distribution actively harms the account. A one-week plan should therefore:
- use payment rails the owner has already verified,
- focus on one channel with existing buyer traffic,
- and log revenue only from a source outside the agent's control.

## 3. MCP monetization tools

| Repo / program | Stars | Created | Model | Notes |
|---|---|---|---|---|
| xpack-ai/XPack-MCP-Marketplace | 173 | 2025-07-09 | Open-source "sell your MCP" storefront | Needs hosting and payment setup. Not zero-capital in practice. |
| apify/actor-mcp-servers | 21 | 2025-06-11 | MCP servers monetized as Apify Actors | **The Apify Store has real buyer traffic** (see below). |
| mcpize/cli + learnwithsumit tutorial | 3 / 9 | 2025-11 / 2026-03 | Deploy and monetize MCP servers | Early stage, no traction data |
| lonniev/excalibur-mcp | 3 | 2026-02-24 | Lightning micropayments ("Tollbooth") | Crypto rails |
| hedera-agent-commerce-kit/hack | 5 | 2026-08-07 | One-decorator API/MCP paywall | Crypto rails |
| Lulu-The-Narwhal/lulu-ads | 3 | 2026-07-14 | Sponsored slots inside MCP responses | Ads |

**Apify Store** is the most concrete program here:
- 80% revenue share to the developer. The pay-per-event model pays (0.8 × revenue) − platform costs. Only revenue from paid-plan users counts.
- Monthly payout over a $20 minimum on PayPal or $100 on bank transfer **[snippet: docs.apify.com / use-apify.com]**.
- Apify's published developer payouts are reported as about $563k/month (Sept 2025) and $1.5M/month (Aug 2026) **[snippet, single source, not verified against Apify]**.
- Zero capital, because Apify hosts the Actor. But reaching first revenue needs paid-plan users to find the Actor, and payouts are monthly.

## 4. Japanese-language niche: demand outruns supply

| Repo | Stars | Created | ≈ stars/day | Monetization |
|---|---|---|---|---|
| coji/natural-japanese (business Japanese writing/lint skill) | 1,857 | 2026-07-12 | ~22 | None |
| **nanaism/yomiyasu** (AI-Japanese → natural Japanese) | **1,342** | **2026-09-30** | **~335 (4 days old)** | None |
| taishi-i/awesome-japanese-nlp-resources | 1,016 | 2022-06-08 | — | None |
| tsubotax/melta-ui (AI-ready design system) | 201 | 2026-03-01 | ~0.9 | None |
| gonta223/humanizer-ja | 151 | 2026-01-27 | ~0.6 | None |
| piguo45/single-file-wbs (WBS/Gantt, Claude-maintained) | 127 | 2026-06-09 | ~1.1 | None |
| nwiizo/oi-owarasero | 124 | 2026-08-25 | ~3 | None |
| gonta223/japanese-corporate-pptx-skill | 18 | 2026-07-23 | ~0.2 | None |
| ficilcom/otame4-work-skills (JP job hunting/career change) | 4 | 2026-08-28 | — | Company funnel |
| Many "日本語 skills" collections (harupan119, hasez, yutut-app, IwatsukaYura, nonbiri-bookstore …) | 0 | 2026 | 0 | None |

- `topic:agent-skills japanese` returns only **76 repos**, against 28,594 for `topic:agent-skills`, i.e. about 0.27%.
- `topic:claude-code topic:japanese` returns **172 repos**.
- **Demand signal:** two Japanese writing skills reached 1.3k–1.9k stars, one of them within 4 days. The "fix AI-sounding Japanese" theme is clearly hot.
- **Supply gap:** apart from writing style, almost every Japanese skill collection has 0 stars. Distribution (Zenn, Qiita, X), not code, decides which ones win.

**Japanese back-office (SaaS/accounting/tax): near-empty for skills**

| Repo | Stars | Created | Notes |
|---|---|---|---|
| freee/freee-mcp (official) | 503 | 2025-01-29 | Official MCP exists. Skills on top of it are almost absent. |
| kintone/mcp-server (official) | 57 | 2025-07-09 | Same pattern |
| digital-go-jp/administrative-procedures-mcp (Digital Agency) | 76 | 2026-03-20 | Government open data |
| ajtgjmdjp/edinet-mcp, estat-mcp, tdnet-disclosure-mcp | 18 / 10 / 5 | 2026-02 | One author covers JP finance data |
| Izyuusya/japan-data-mcp (stats, corporate numbers, real estate, invoice registry) | 11 | 2026-02-26 | |
| msr2903/mercari-jp-mcp, mrslbt/rakuten-mcp | 15 / 5 | 2025–26 | JP e-commerce data |
| Kokai-Data/japan-business-data (gBizINFO, J-Grants, NTA, EDINET, e-Gov) | 2 | 2026-05-12 | Funnel |
| michielinksee/bantou (bookkeeping agent for freee) | 2 | 2026-05-11 | Consultancy funnel |
| **確定申告 (tax-return) skills:** nwiizo/kakutei-shinkoku-workspace, SUPi5460/mf-kakuteishinkoku-skill, lucky77lucky01250-sudo/mf-cloud-import-skill | **0 each** | 2026 | Only 3 repos found. Japan's filing season (Feb–Mar) is 4–5 months away. |

Japanese sale channels for skills and guides, with real data points:
- **Zenn paid books** take a 3.6% card fee, then a 10% platform fee, then a ¥350 fee per withdrawal. A ¥1,000 book nets ¥868 **[snippet: Zenn's own policy page, quoted by ohina.work]**.
- One author handed out free Claude Code hooks for 3 months and **sold 12 copies across 6 paid Zenn books, for a cumulative balance of ¥10,071** **[snippet of Qiita post by yurukusa, self-reported]**.
- Another author sold **5 copies of a ¥500 Zenn book** from an unknown account **[snippet, self-reported]**.
- A ¥1,500 Zenn book on "CLAUDE.md design" reported its first sale **[snippet, note.com/wireharbor]**.
- note and BOOTH are commonly cited at ¥300–3,000 per skill or guide **[snippet, how-to articles]**.
- **Realistic first-week order of magnitude: ¥0 to a few thousand yen**, and it depends on existing followers.

## 5. Game mods: CurseForge and Modrinth reward programs

The owner already has Forge 1.20.1 experience (XP Bank mod). Both programs pay by usage and need no capital, but **neither pays out cash within one week.**

| | CurseForge Rewards Program | Modrinth Creator Monetization |
|---|---|---|
| Revenue pool | About 70% of revenue goes to creators **[snippet, gemlist]** | 75% of site and app ad revenue to creators, 25% to Modrinth. Half of Modrinth+ subscriptions also go to creators **[snippet: modrinth.com/legal/cmp-info, news]** |
| Unit | Points. **1 point = $0.05 USD** (official ToS/FAQ) **[snippet]** | Each page view and in-app download counts as a "point". The pool is split **daily** **[snippet]** |
| Per-1k-download rate | **Not published.** It is relative to the whole platform's monthly downloads. One old author blog estimated about 1 point per 1,000 downloads, i.e. about $0.05/1k **[snippet, outdated, unverified]**. Downloads through modpacks count once per mod, which helps small library and QoL mods. | **Not published.** One Reddit creator said Modrinth was about 1/6 of their downloads but about 1/3 of their earnings **[snippet, anecdotal]**. Third-party dashboards (modrinth.citrus-mc.com, modrinth-statistics.tobinio.dev) track platform revenue but could not be reached from here. |
| Eligibility | Individual, 18+, must opt in. A project has to pass a **popularity threshold** before it earns points **[snippet: support.curseforge.com ToS/FAQ]**. Japan is not explicitly listed or excluded in the snippets I saw. Tremendous covers 200+ countries and Payoneer is also offered. **Treat Japan as likely eligible and verify in the author console.** | Open to creators. International PayPal/Venmo goes through Tremendous (about 3.84% fee, no FX fee). There are bank transfer options in 29 countries, USDC for hard-to-reach countries, and gift cards with no minimum **[snippet: Modrinth news "More Ways to Withdraw"]**. A W-8BEN is needed as withdrawals approach **$600/year** (a non-US resident like the owner files W-8BEN) **[snippet]**. |
| Payout threshold | Cash redemption from **100 points ($5)**. PayPal deposits of $5/$50/$250/$500, or Amazon gift cards in some countries **[snippet: CF support]** | No minimum for gift cards. Other methods vary. |
| Timing | Points are allocated **monthly** | Earnings are released **60 days after month end** **[snippet]** |
| First revenue in 1 week? | Points could accrue within the month if the mod passes the popularity threshold. Cash is unlikely within a week. | Revenue accrues daily from day 1 and shows on the dashboard, but **cash only after about 60+ days.** |

Other mod notes:
- CurseForge has passed **100 billion Minecraft mod downloads** **[snippet, gurugamer/sportskeeda]**.
- On GitHub, `topic:minecraft-mod forge 1.20.1` returns only **150 repos**. Most mods live on CF/Modrinth without public source, so the GitHub supply count understates real competition.
- There is an "AI player for modded MC" repo, Boyan253/minemind (8★, Forge 1.20.1), but I found **no repos marketing "Claude-generated" mods.** That leaves room for an "AI builds a mod a day" build-in-public angle.

## 6. Other plugin ecosystems

| Ecosystem | Monetization reality | Notes |
|---|---|---|
| Obsidian plugins | Donations only. The `fundingUrl` in the manifest shows a Donate button. Ranges like "$500–3,000/mo" appear only in SEO listicles **[unverified]**. | Japanese-specific Obsidian plugins are tiny (largest: japanese-novel-ruby, 17★). The niche is open but low-revenue. |
| VS Code extensions | Marketplace has **no paid extensions**. A sponsor button exists (since VS Code 1.68). A DEV.to post claims "$6,800/month from niche extensions" **[self-reported, single post]**. | The license-key-outside-the-marketplace pattern exists. |
| GitHub Sponsors | Japan **is** a supported region (103 regions) **[snippet: GitHub blog/docs]**. Paid through Stripe Connect. **The first payout comes 60 days after the first sponsorship.** After that, payouts are monthly, cross-border, with a $100 threshold **[snippet: GitHub Sponsors Additional Terms]**. | Cannot produce cash within a week. It could produce a *sponsorship event* within a week. |
| n8n templates | n8n is not a marketplace. Its Creator Hub is free, with an affiliate program. Selling templates elsewhere (e.g. Gumroad) is allowed under n8n's ToS **[snippet: n8n community]**. Price points of $29–$299 are often quoted **[how-to blogs, unverified]**. | GitHub supply is huge: enescingoz/awesome-n8n-templates has 25,722★ (2025-05-08), and wassupjay/n8n-free-templates has 6,218★. Marvomatic/n8n-templates (1,542★) is an example of a **free + premium** split. Japanese n8n templates: none of note. |

---

## 7. Gaps and opportunities (scored 1–5)

Scoring:
- **ZC** = zero capital
- **1W** = realistic first *revenue event* within 1 week. This means a sale, an accrued reward or a sponsorship. It does not need to be cash in the bank.
- **AI** = Claude does most of the work without the owner
- **Demand** = evidence of buyers or attention
- **Total** = sum, max 20

Every option needs the owner to do one-time KYC on the payout rail.

| # | Opportunity | Evidence of gap | ZC | 1W | AI | Demand | Total | Main risk |
|---|---|---|---|---|---|---|---|---|
| 1 | **Paid Japanese guide/skill pack on Zenn Books or note** (e.g. "Claude Code × 日本語業務" or "AI臭を消す日本語スキル 実践"), with free skills on GitHub as the funnel | Japanese writing skills reached 1.3k–1.9k★ fast. Paid Japanese Claude Code books have documented small sales (12 sales / ¥10k over 3 mo). Zenn handles payment. | 5 | 3 | 4 | 4 | **16** | Needs an existing audience. First-week sales likely ¥0–¥3,000. |
| 2 | **Japanese back-office skill pack on official MCPs** (freee / MoneyForward / kintone: journal entries, invoice-registry check, 確定申告 prep) as free repo + paid Zenn/BOOTH guide | Official MCPs exist (freee 503★, kintone 57★), but the skill layer is ~0★ and only 3 tax-return repos exist. A clear B2B buyer. | 5 | 2 | 4 | 3 | **14** | Filing season is Feb–Mar. Trust and accuracy liability around tax. |
| 3 | **Minecraft Forge/NeoForge 1.20.1 small QoL/library mods** published on **both** CurseForge and Modrinth with rewards enabled (reuse XP Bank experience) | 100B+ CF downloads. Modpack inclusion multiplies downloads. Few AI-built mods are public. | 5 | 2 | 4 | 3 | **14** | The CF popularity threshold. Modrinth cash comes after 60+ days. Per-download rates are tiny and unpublished. Needs the owner's account and in-game testing. |
| 4 | **Apify Actor** (e.g. a Japanese data scraper or MCP: e-Stat, EDINET, invoice registry, Mercari price lookup) with pay-per-event pricing | Apify pays 80%, and the Store has existing buyer traffic. JP data MCPs on GitHub sit at 5–20★. | 5 | 2 | 5 | 3 | **15** | Only paid-plan users count. Monthly payout ($20 PayPal minimum). Site ToS and scraping legality. |
| 5 | **"Humanize AI Japanese" skill as freemium**: free on GitHub, pro rules or a corpus via BOOTH/Zenn | blader/humanizer has 53.8k★. JP forks humanizer-ja (151★) and yomiyasu (1.3k★ in 4 days) show demand. | 5 | 3 | 5 | 4 | **17** | Crowded fast. Differentiation (business genres, keigo, evaluation data) needed. |
| 6 | Sell skills on English paid marketplaces (Agensi / ClaudeSkills.ai / Agent37) | Marketplaces exist. Earnings data is vendor-reported only. | 5 | 2 | 5 | 2 | **14** | Unknown real buyer traffic. Stripe KYC. |
| 7 | GitHub Sponsors / FUNDING.yml on free repos | Japan supported | 5 | 1 | 5 | 2 | **13** | First payout 60 days later. Sponsors follow audience, not code. |
| 8 | Japanese n8n template pack (free + premium) | n8n templates on GitHub have huge supply but almost no Japanese versions | 5 | 2 | 4 | 2 | **13** | Little evidence of Japanese buyers |
| 9 | Obsidian / VS Code Japanese-specific plugins with donate links | Japanese Obsidian plugins are tiny (≤17★) | 5 | 1 | 4 | 1 | **11** | Donations only. Review queue for the Obsidian store. |
| 10 | Fully autonomous "AI company" / mass SEO / issue spam | Two documented $0 outcomes. Account suspension. | 4 | 1 | 5 | 1 | **11** (avoid) | Platform bans, reputational harm |

### Recommendation for blocks R2/R3 to verify
- **Best fit for "zero capital + AI does the work + some chance in one week":** #5 and #1, run as one funnel. Ship a differentiated free Japanese skill on GitHub, then announce it on Zenn/Qiita with a paid Zenn book or BOOTH item. The owner does the Zenn/BOOTH payout setup once.
- **Run in parallel as the "slow-burn accrual" track:** #3 (mods on CF and Modrinth, using the owner's Forge experience). Accrual can start this week. Cash cannot.
- **Avoid** #10. Do not use mass outreach or issue spam (see Ithiel-Labs).
- **Ledger rule** (from money-agent): count revenue only from platform dashboards or payout records the agent cannot edit.

## Sources
- GitHub repository data: GitHub Search API via MCP, queried 2026-10-04. Repos are cited inline by `owner/name`.
- money-agent README: https://github.com/ImmortalDemonGod/money-agent
- Ithiel-Labs experiment: https://github.com/Ithiel-Labs/make-money-30-Day-experiment
- auto-company: https://github.com/nicepkg/auto-company
- CurseForge Rewards ToS: https://support.curseforge.com/support/solutions/articles/9000197898-rewards-program-terms-of-service [snippet]
- CurseForge Reward FAQ: https://support.curseforge.com/support/solutions/articles/9000197902-reward-program-faq [snippet]
- CurseForge Tremendous payouts: https://blog.curseforge.com/introducing-tremendous-a-game-changing-payout-solution-for-curseforge-authors/ [snippet]
- gemlist CurseForge explainer: https://www.gemlist.io/blog/how-much-does-curseforge-pay-mod-creators [snippet, third party]
- Modrinth Rewards Program info: https://modrinth.com/legal/cmp-info [snippet]
- Modrinth withdrawals overhaul: https://modrinth.com/news/article/creator-withdrawals-overhaul/ [snippet]
- Modrinth "Quintupling creator revenue": https://modrinth.com/news/article/becoming-sustainable/ [snippet]
- CurseForge 100B downloads: https://www.sportskeeda.com/minecraft/minecraft-mods-reach-100-billion-downloads-curseforge-marking-huge-milestone [snippet]
- Apify monetization: https://docs.apify.com/actors/publishing/monetize/pay-per-event and https://use-apify.com/docs/apify-for-developers/monetize-actors [snippet]
- GitHub Sponsors terms: https://docs.github.com/en/site-policy/github-terms/github-sponsors-additional-terms [snippet]
- GitHub Sponsors regions: https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors [snippet]
- Paid skills marketplaces: https://www.agensi.io/learn/how-to-monetize-skill-md-skills-developer-guide-2026 , https://claudeskills.ai/ , https://www.agent37.com/blog/claude-skills-marketplace-buy-sell-discover-skills [vendor, self-reported]
- Zenn fees: https://ohina.work/post/zenn_sales/ and https://info.zenn.dev/2024-08-22-zenn-business-policy [snippet]
- Zenn sales anecdotes: https://qiita.com/yurukusa/items/bdce346006bd34f6a2ce , https://qiita.com/sakutto-panda/items/62a973b2ddce6da4437f , https://note.com/wireharbor/n/nbbd369b7bf41 [snippet, self-reported]
- n8n paid templates policy: https://community.n8n.io/t/ok-to-create-paid-n8n-templates-bundle-library/170798 [snippet]
- VS Code extensions claim: https://dev.to/hopkins_jesse_cdb68cfa22c/how-i-make-6800month-selling-niche-vs-code-extensions-eji [self-reported]
- Obsidian funding: https://forum.obsidian.md/t/being-able-to-pay-plugin-developers/78177/2 [snippet]
