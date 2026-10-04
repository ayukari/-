# R1 — Global (English-language) zero-capital online income methods an AI agent can mostly execute

Research date: 2026-10-04. Scope: methods where Claude Code (cloud container, web search, GitHub API, git push, Python/Node) does most of the work and a Japan-resident individual (`ayukari`, new GitHub account, 0 followers) does signups, KYC and payouts. Horizon: 1 week, zero capital.

## Method and how much to trust it

- About 35 WebSearch queries were run. **WebFetch was blocked by the egress proxy for almost every non-GitHub domain.** That included dev.to, hackernoon, HN, lesswrong, docs.github.com, mcp-marketplace.io, automatonagency.com and others. Only github.com pages could be read in full. Most evidence below therefore comes from search-engine summaries of the cited pages, not from my own full reading of them. Before acting on any number, check it at its source.
- Evidence labels used below:
  - **[V]** Verified or primary: an official doc or company statement, a first-party public repo, or a named organisation reporting its own result.
  - **[S]** Self-reported by an individual blogger. Plausible, but no dashboard was checked.
  - **[M]** Marketing claim from a platform or vendor about its own ecosystem, or an unsourced "typical" figure. Treat as an upper bound at best.
- Scores run from 1 to 5 and answer one question: is this feasible in 1 week, with zero capital, with an AI doing the work, for a brand-new Japan-resident account? 5 means a realistic chance of the first dollar inside the week. 1 means essentially none.

## Cross-cutting findings (read these first)

1. **Public "AI agent makes money from $0" experiments almost always report $0.** Examples:
   - [V] A public GitHub repo documents a 96-hour autonomous run. It built 238 API endpoints, an MCP server, 151 SEO pages, opened 1,617 GitHub issues and 78 PRs, and earned **$0**. The GitHub account was **suspended for spam** and **9 orgs blocked** the replacement account (Pallets, rust-lang, Ory, Appwrite and others). A $200/month Claude Max plan was used up in 48 hours. The authors' conclusion was that "every path to revenue hit the same wall: proving you are a human" (KYC, CAPTCHA, OAuth). https://github.com/ouryellowbuddha-spec/make-money-30-Day-experiment
   - [V] "One Dollar Quest" built x402 paid crypto-data APIs and launched tokens: "revenue $0.00 (waiting for first external consumer)". https://github.com/perria080925-bot/one-dollar-quest
   - [S] An OpenAI Codex agent hunted OSS bounties for 3 days and earned $0. Of 46 advertised bounties, **0 were startable**: they were already solved, had competing PRs, needed hardware, or were too big. https://hackernoon.com/i-sent-an-ai-agent-to-hunt-open-source-bounties-for-three-days-it-earned-$0
   - [S] Other self-reports:
     - Claude Code ran every 2 hours for 6 days and earned $0 from 27 users.
     - Another agent reached "Day 22: 12 products, 543 npm downloads, $0".
     - "51 days, zero sales".
     - "Every door I knocked on… $0.00" as of 2026-09-21.
     - Links: https://dev.to/bshaleshka/i-gave-an-ai-agent-0-and-told-it-to-make-money-2nlj , https://dev.to/ryuno_08767f3553ab40f4f26/im-an-ai-that-was-given-0-and-told-to-make-1m-heres-day-22-3b1c , https://dev.to/michael_lands/an-ai-agents-honest-ledger-51-days-zero-sales-and-the-wall-nobody-warns-you-about-3nei , https://dev.to/ariana_vp/im-an-ai-agent-heres-every-door-i-knocked-on-trying-to-earn-my-first-real-dollar-599
   - [S] An agency gave an autonomous agent a month and a budget, aiming for $700/month. It made $0. https://automatonagency.com/insights/autonomous-agent-revenue-experiment-teardown
   - [S] A 30-day run produced articles and $0. https://dev.to/hopkins_jesse_cdb68cfa22c/my-ai-agent-experiment-the-brutal-truth-after-30-days-april-2026-update-1542
   - [M/S] Positive outliers: "$100 → $1,218 in 48 h, 42 subscribers" (Medium, not verifiable: https://medium.com/aimonks/i-gave-an-ai-agent-100-and-48-hours-to-make-money-the-results-were-terrifyingly-profitable-767dfe9a93d3), and "Agent Alpha: $37 from 4 template sales by day 7, having spent $45" (https://www.wadeswatch.com/i-gave-3-ais-100-each-and-let-them-fight-for-a-month/). Both started with $100, not $0, and neither is verified.
2. **Distribution is the bottleneck, not building.** Every verified failure had working products and no traffic. A brand-new account with 0 followers has no audience. Automated outreach (mass issues/PRs, spam posts) gets accounts banned. That is the single biggest risk to the owner's GitHub account.
3. **Named-organisation experiments with real money:**
   - [V] AI Village. 4 agents raised **$1,984 for charity in 38 days** (2025): $1,481 for Helen Keller International and $503 for Malaria Consortium. A 2026 anniversary campaign raised $510 from 17 donors. Agents "struggled mightily with email forms, file sharing". https://theaidigest.org/village/timeline , https://www.lesswrong.com/posts/iv3hX2nnXbHKefCRv/what-did-we-learn-from-the-ai-village-in-2025 , https://ai-village-agents.github.io/ai-village-charity-2026/
   - [V] Anthropic/Andon Labs Project Vend. Claude ran a physical shop and **lost a few hundred dollars** in phase 1: it was talked into discounts and free items, and it hallucinated. Phase 2 added a CRM and a "CEO" agent, and weeks with negative margin were "largely eliminated". https://anthropic.com/research/project-vend-1
   - [V] Truth Terminal "earned" over $500k only because people airdropped memecoins and a VC gifted it $50k BTC. Its creator says calling it autonomous would be "disingenuous". Not replicable and not earned income. https://www.coindesk.com/tech/2024/12/10/the-truth-terminal-ai-crypto-s-weird-future
4. **Japan-specific constraints:**
   - Stripe Japan requires a **特定商取引法 (Tokushoho) commerce-disclosure page**. Sole proprietors may write "disclosed without delay on request" for name, address and phone. https://support.stripe.com/questions/how-to-create-and-display-a-commerce-disclosure-page
   - A merchant of record (Gumroad, Lemon Squeezy, Polar, Paddle) is the legal seller to the buyer. That simplifies VAT and sales tax, but the owner should still confirm Tokushoho needs.
   - US platforms ask for a **W-8BEN**. Under the US–Japan treaty, US withholding on royalties is **0%**. https://www.taxinpangea.com/treaties/japan-united-states
   - Japanese tax: a salaried person with side income of ¥200k or less is exempt from filing an income-tax return. **A residence-tax (住民税) declaration is still required for any profit.** https://www.freee.co.jp/personal-business/guide/articles/8924/
5. **Payment rails confirmed for Japan residents:**
   - Stripe Connect (GitHub Sponsors, Polar, Algora, Agensi, Opire): Japan supported. [V] https://polar.sh/docs/merchant-of-record/supported-countries
   - Gumroad: direct bank deposit to Japan. **PayPal *checkout* is not available to Japan-based creators.** https://gumroad.com/help/article/275-paypal-connect
   - Lemon Squeezy: Japan bank payouts. https://docs.lemonsqueezy.com/help/getting-started/supported-countries
   - PayPal payouts: RapidAPI and Apify.

---

## 1. Digital products — Gumroad, Lemon Squeezy, Polar, Payhip, Ko-fi, Etsy digital

**How it works.** The AI writes a downloadable product: templates, prompt packs, Claude Code skill bundles, checklists, small code kits or ebooks. It is listed on a merchant-of-record storefront and a link is shared.

**What the owner must do.**
- Create the account, verify email, add a bank (Japan bank OK on Gumroad and Lemon Squeezy) and submit W-8BEN.
- Lemon Squeezy: store activation needs **KYC + KYB plus a product review; approval takes 2–3 business days**. https://docs.lemonsqueezy.com/help/getting-started/activate-your-store
- Polar: Stripe Connect Express onboarding (ID plus bank) before going live. https://polar.sh/docs/features/finance/accounts

**Fees and payout rails.**

| Platform | Fees | Payout and conditions |
|---|---|---|
| Gumroad | 10% + 50¢ on direct sales; 30% via Discover | Payouts weekly, $10 minimum, 7-day hold. https://gumroad.com/pricing |
| Gumroad Discover | — | Needs at least $10–100 in genuine prior sales plus a risk review, so it is not available on day 1. |
| Polar | Starter 5% + 50¢ | Stripe payout fees apply. https://polar.sh/resources/pricing |
| Lemon Squeezy | — | Operating, but Stripe is steering merchants to Stripe Managed Payments (public preview Feb 2026). New-store acceptance may tighten. https://fungies.io/lemon-squeezy-stripe-acquisition-saas-founders-2026/ |
| Payhip | 5% on the free plan | Stripe/PayPal. https://payhip.com/faq |
| Ko-fi | 5% on shop sales on the free plan | Paid instantly to PayPal or Stripe. https://latuos.com/ko-fi-fees/ |
| Etsy | One-time **$15–29 setup fee** for new shops, $0.20 per listing, 6.5% transaction fee, ~6% + $0.30 processing for Japan sellers | **Violates zero capital.** https://help.erank.com/blog/understanding-etsys-new-15-setup-fee/ , https://craftybase.com/blog/the-complete-guide-to-etsy-fees |

**Time to first dollar (new account, no audience).**
- [M/S] "Typically 2–8 weeks", versus 24–72 h for creators with 500+ followers. https://kupkaike.com/blog/how-to-sell-digital-products-on-gumroad-for-beginners
- [S] "2 months zero sales". https://proacademia.medium.com/i-almost-quit-gumroad-how-2-months-of-zero-sales-became-the-turning-point-in-my-digital-creator-645cf2fa53b7
- [S] "$60 in 2 months". https://medium.com/write-your-world/how-i-made-my-first-60-on-gumroad-in-just-2-months-9206091f6b07

**Evidence of earnings.** [S] Plenty of "$14k from ebooks" posts (https://behindrankings.com/gumroad-review/) from people who already had an audience. No verified zero-audience one-week case was found.

**Failure stories.** [S] Gumroad sellers report **automated suspensions shortly after their first sales**, "HIGH iffy fraud score" holds, and 30–90 day holds. A chargeback can freeze the account. https://latuos.com/gumroad-freeze-payouts/ , https://www.trustpilot.com/review/gumroad.com?page=2

**Rules on AI content and automation.**
- Etsy allows AI-assisted digital products, but they must be disclosed. Since 2025-06-10 the Creativity Standards cover digital downloads, and reselling templates is banned. https://www.promptlesspress.com/blog-etsy-ai-policy-2026-digital-products
- Gumroad and Lemon Squeezy review content against their AUPs. Low-effort "PLR"/AI ebooks are a common rejection or suspension trigger [S].

**Score: 3/5.** Setup is quick and fully AI-producible, and Japan rails exist. The weak point is traffic: a first sale inside 1 week with 0 followers is unlikely, though not impossible if the owner posts to an existing community. It is best paired with a free open-source repo that links to the paid product.

## 2. Open source + GitHub Sponsors / Polar / Open Collective

**How it works.** Publish useful open-source tools and add a Sponsors button. Polar can also sell paid tiers, license keys or "pay what you want".

**What the owner must do.**
- GitHub Sponsors: Japan is a supported region [V]. Enable 2FA, complete Stripe Connect (ID and bank), submit W-8BEN, then wait for **manual review: anywhere from a few hours to 2–4+ weeks**. Many community threads report weeks of "pending". https://github.com/orgs/community/discussions/200799 , https://github.blog/news-insights/company-news/github-sponsors-available-in-30-new-regions-2/
- Open Collective: funds pass through a fiscal host such as Open Source Collective, which needs an application. Payouts go via Wise or PayPal expenses with two-step approval. https://docs.opencollective.com/help/fiscal-hosts/payouts

**Evidence of earnings.**
- [V, academic] 80% of sponsored developers had 8 or fewer sponsors, median **2**, and 36% had exactly one. The average individual sponsorship is about $8/month. https://arxiv.org/pdf/2202.05751
- Japanese example of steady income from an established maintainer: [S] azu's yearly reports. https://dev.to/azu/my-github-sponsors-revenue-2022-38ab

**Time to first dollar.** Weeks to months, and only after a repo gains users.

**Failures and risks.** Promoting a repo by mass-opening issues or PRs gets the account suspended. See the [V] 30-day experiment above.

**Score: 1/5** for one week. It is still worth setting up as a long-tail, near-zero-cost add-on to whatever else is built.

## 3. Paid AI-agent skills, plugins and MCP servers

**How it works.** Package Claude Code skills (SKILL.md), plugins or MCP servers and sell them as one-off downloads, subscriptions or hosted metered access.

**Marketplaces.**
- **Agensi**: SKILL.md marketplace. Creators keep 80% of one-off sales and 70% of subscriptions. Creators are verified and paid through Stripe Connect; Japan is listed. Claims 7,500+ skills and 550+ creators [M]. https://www.agensi.io/learn/how-agensi-payouts-work-stripe-connect
- **MCPize**: 80–85% revenue share, Stripe Connect payouts monthly on the 15th. https://mcpize.com/developers/monetize-mcp-servers
- **Apify** (MCP or Actors): 80% share. See §4.
- **Smithery / Glama**: per MCPize's competitor page [M], creators earn nothing directly there.
- **Anthropic's official Claude Marketplace** (launched 2026-09-23 with 2,000+ plugins and connectors) has **no native payment**. Publishers monetize through their own paid accounts. https://www.ghacks.net/2026/09/27/anthropic-launches-claude-marketplace-with-more-than-2000-connectors-and-plugins/ , https://github.com/anthropics/claude-plugins-community

**Evidence of earnings.**
- [M] "Fewer than 5% of 12,000+ MCP servers monetized; most earn $0". https://mcp-marketplace.io/blog/state-of-mcp-monetization-2026
- [M] "Top skills earn $500–3,000/month", from a skills-platform blog. https://www.agent37.com/blog/monetize-claude-code-skills
- [M] "$8.5k/month AWS auditor MCP" and "21st.dev $10k MRR in 6 weeks". These come from marketplace vendors' own blogs, so treat them as unverified.
- [S] A dev.to post claims "real numbers" from MCPize. https://dev.to/sai_93caeceb4f6a4d9969910/i-monetized-my-mcp-server-on-mcpize-tier-structure-stripe-connect-real-numbers-4jhf (not read; blocked).
- No independent verification was found.

**Time to first dollar.** Unknown. The marketplaces are young and crowded (7,500+ skills on Agensi alone). Creator approval steps add days.

**Rules.** Agensi verifies creators and security-scans skills. Unvetted fully-AI bulk listings may be rejected.

**Score: 2/5.** This fits the AI's strengths best, since it can build a good skill or MCP server in hours. Japan payout via Stripe Connect looks possible. But demand evidence is marketing-grade and discovery is crowded. It is worth one listing as a parallel bet, not as the main bet.

## 4. Micro-SaaS, free-tier tools, API/data products (Cloudflare Workers, GitHub Pages, RapidAPI, Apify, Chrome extensions)

**Hosting rules.**
- **GitHub Pages ToS forbids** using it mainly for commercial transactions or SaaS. https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- The Cloudflare Workers and Pages free tier allows commercial use with no card required. https://www.freetiers.com/directory/cloudflare-workers
- Use Cloudflare for anything paid, and keep GitHub Pages for docs and landing pages only.

**RapidAPI (Rapid API Hub, owned by Nokia since Nov 2024).**
- Flat **25% fee from 2025-11-15**. Payouts go **only through PayPal, about 6–8 weeks** after the customer is charged. https://geekflare.com/guides/sell-apis/ , https://techcrunch.com/2024/11/13/nokia-acquires-rapid-the-api-company-once-valued-at-1b/
- An agent was **blocked by bot detection** at signup. [V] https://github.com/ouryellowbuddha-spec/make-money-30-Day-experiment
- No provider-level earnings data is public.
- **Score: 1/5.** Cash can't arrive within a week even if a sale happens.

**Apify Store (Actors: scrapers and tools, also MCP).**
- Creators get 80%, paid monthly on the 11th by bank (minimum $100) or **PayPal (minimum $20)**.
- [V, company statement] $1M paid to creators in one month, about 5x year on year. https://x.com/apify/status/2054547299485745273
- [M] "$1.4M/month across about 3,000 developers, ~$470 average". The distribution is heavily skewed, and "plenty earn nothing".
- [S] Builders report single-digit weekly runs for the first 1–2 months, with meaningful revenue by months 3–4. https://agentbyline.com/articles/apify-actor-passive-income-what-really-earns-in-2026-67lcfr , https://help.apify.com/en/articles/8684010-make-money-publishing-your-actors-on-apify-store
- Apify's Store gives built-in discovery, which a new account otherwise lacks. That makes it one of the better "agent builds, marketplace distributes" fits.
- Japan payout via PayPal or bank: likely, but confirm in the payout settings.
- **Score: 2/5** for week 1, because of the payout cycle and ramp time. Better on a 1–3 month horizon.

**Chrome extensions + ExtensionPay.**
- 5% fee.
- [M] "Developers made over $500k" in total.
- [S] One testimonial reports about $4k/year after almost a year. https://extensionpay.com/
- Chrome Web Store review takes days, and the developer registration fee is **$5 one-time**. That breaks strict zero capital, but only slightly.
- **Score: 1/5.**

## 5. Content + affiliate (blogs, Medium, Amazon Associates)

**Amazon Associates.**
- Needs **3 qualifying sales within 180 days** or the account is closed and its earnings forfeited. https://getaawp.com/blog/amazon-affiliate-program-requirements/
- Amazon.co.jp Associates needs a Japan bank account, which the owner has. https://www.kachi.jp/amazon-associates-japan-how-to-register-get-approved/
- [M] "The first 3 months typically produce zero income."

**Google.**
- The **scaled content abuse** policy (since March 2024) targets mass-produced pages "no matter how created". Reported enforcement hit sites with heavy AI content. https://www.layer3labs.io/guides/scaled-content-abuse
- The 30-day experiment's 151 SEO pages and 410 Telegraph articles produced $0 [V].

**Medium Partner Program.**
- Japan is eligible and paid via Stripe. Medium's help center lists the eligibility requirements: https://help.medium.com/hc/en-us/articles/39121627791639-Medium-Partner-Program-eligibility
- Pay is based on member reading time, which is about $0 for new accounts.

**Score: 1/5.** SEO and affiliate income has a lag of months, and AI-at-scale content is exactly what the spam policies target.

## 6. Bounties — Algora, Opire, IssueHunt, Gitcoin/Buidlbox, bug bounties

**How it works.** Fix a GitHub issue that carries a cash bounty, and get paid when the fix merges.

**Rails.**
- Algora pays via Stripe Connect to about 150 countries, 1–3 days after merge.
- Opire uses Stripe.
- IssueHunt (Japanese company) takes a 10% fee. https://oss.issuehunt.io/
- Gitcoin's bounty product moved to Buidlbox; Gitcoin now runs grants rounds (GG24, $1.8M, Oct 2025). https://gitcoin.co/blog/grants-stack-winds-down--heres-whats-changing-and-what-to-expect

**Evidence.**
- [S/M aggregate] Algora bounties are typically $50–500. Fresh bounties draw **8–158 competing PRs within hours**. One top solver on Algora's own org earned $1,375 over 17 bounties. https://dev.to/zeroknowledge0x/the-open-source-money-map-every-way-developers-are-actually-making-money-in-2026-with-real-45ba
- A live aggregator showed 155 open bounties worth $68,771 on 2026-09-30. https://bountyos.rovidev.com/en/github-bounty-board/
- [V repo] A bounty scanner found many high-value ($5,000+) tickets were "traps": bot farms, already claimed, hardware-gated, or "no community PRs". https://github.com/hennie27-stack/oss-bounty-scanner

**Failure stories.**
- [S] Codex agent, 3 days: 0 of 46 bounties startable, $0 earned (see above).
- [S] "Expected value of being the 11th PR is about $0".

**Rules.**
- Per a third-party summary (not verified against the ToS), **Algora's terms prohibit robotic access**. Automating claims or submissions on Algora is a ToS risk. https://github.com/joyelgeorge/Taskman/issues/194
- 37 surveyed projects ban AI PRs outright, and 72 allow them only with disclosure. Ghostty is zero-tolerance; tldraw auto-closes external PRs. https://www.theregister.com/2026/01/21/curl_ends_bug_bounty/

**Bug bounties.**
- curl **closed its bounty program in Jan 2026** because of AI slop. Nextcloud suspended paid bounties, and the Internet Bug Bounty paused submissions. https://www.bleepingcomputer.com/news/security/curl-ending-bug-bounty-program-after-flood-of-ai-slop-reports/ , https://www.stingrai.io/blog/ai-generated-vulnerability-report-policies-census
- In 6 years, curl's maintainers saw no AI-generated report that found a real vulnerability.

**Score: 2/5.** This is the only method where a stranger pays for code with no audience needed. It is also highly competitive and hostile to AI PRs, and it risks the owner's GitHub reputation. If tried: the human-approved, low-volume path only, small bounties, a disclosed AI-assisted PR, and a careful check of the repo's AI policy first.

## 7. Freelance and micro-tasks — Fiverr, Upwork, Prolific, MTurk

**Fiverr.**
- AI use is allowed, with disclosure if the client asks.
- 20% fee and **14-day clearance** before withdrawal; Payoneer withdrawal costs $3. https://vaultleap.com/blog/fiverr-fees-explained-2026 , https://memvers.com/blog/ai-disclosure-rules-freelance-platforms-2026
- [S] "First $20 order within two weeks" anecdotes.
- Even an order in week 1 can't be withdrawn in week 1.

**Upwork.**
- Connects cost $0.15 each. New accounts get 50 free plus 10/month.
- Fully automated proposals are prohibited and detected, with suspensions reported in 2025. https://getmany.com/blog/upwork-ai-policy

**Prolific.**
- Open to Japan residents, but most studies target the US and UK.
- The work is answering surveys as a human, so an AI cannot do it, and having it do so would be fraud. https://participant-help.prolific.com/en/articles/445007-who-can-participate-in-studies-on-prolific
- MTurk is effectively closed to Japan-resident workers.

**Score: 2/5** (Fiverr/Upwork). The owner must be the visible seller and deliverer, and money is "earned" only after clearance.

## 8. Other 2025–2026 "agent economy" rails — x402, agent-to-agent APIs, prediction-market bots

- x402 pay-per-call APIs and token creator fees: [V] One Dollar Quest made $0 because there are no external agent buyers yet.
- Prediction-market trading bots need capital, so they are out of scope.
- Crypto token launches carry regulatory and reputational risk for a Japan-resident individual. Avoid.
- **Score: 1/5.**

---

## Ranked table

| Rank | Method | Owner tasks | Japan rails | Realistic first $ (new acct) | Best evidence | AI/automation rules | Score (1-wk, $0, AI-run) |
|---|---|---|---|---|---|---|---|
| 1 | Digital product on Gumroad / Polar / Lemon Squeezy (Claude Code skill packs, templates, dev kits) + free OSS repo funnel | Signup, ID or Stripe KYC, W-8BEN, Japan bank; Tokushoho page if selling via own Stripe | Gumroad bank deposit; Polar/LS via Stripe or bank | Days to 8+ weeks; depends entirely on owner posting to a community | [S] anecdotes only; no verified zero-audience one-week case | Gumroad auto-suspensions on new accounts; Etsy needs AI disclosure and costs $15–29 | **3** |
| 2 | Paid skill/MCP on Agensi / MCPize / Apify | Creator verification, Stripe Connect | Stripe Connect (JP listed) / PayPal | Unknown; weeks | [M] only; "<5% of MCP servers monetize" | Platform security review | **2** |
| 3 | Small bounties (Algora/Opire/IssueHunt), human-approved | Stripe Connect KYC; owner reviews every PR | Stripe Connect | 1–3 days after merge, if you win | [S] 0/46 startable; 8–158 PRs per bounty | Algora reportedly bans robotic access; 37 projects ban AI PRs; ban risk | **2** |
| 4 | Fiverr/Upwork gig delivered by AI, sold by owner | Profile, ID, Payoneer/PayPal | Payoneer, PayPal | 1–3 weeks to order + 14-day clearance | [S] anecdotes | Disclosure if asked; no automated proposals | **2** |
| 5 | Apify Actors (scraper/API on a marketplace with discovery) | Account, payout settings | PayPal ($20 min) / bank | Months; paid monthly | [V] $1M/month to creators, skewed | ToS for scraping targets | **2** (better at 1–3 months) |
| 6 | GitHub Sponsors / Polar donations / Open Collective | 2FA, Stripe, W-8BEN, review (hours to weeks) | Stripe Connect (JP supported) | Weeks to months | [V] median 2 sponsors, ~$8/month | No promo spam | **1** |
| 7 | RapidAPI API listing | PayPal, bot-checked signup | PayPal only, 6–8 weeks lag | More than 6 weeks to cash | none public | Bot detection blocked agent | **1** |
| 8 | SEO/affiliate/Medium content | Associates JP, Medium | Bank / Stripe | Months | [M] first 3 months ≈ $0 | Google scaled-content abuse | **1** |
| 9 | Chrome extension + ExtensionPay | $5 dev fee (not zero) | Stripe | Weeks to months | [S] ~$4k/yr after a year | Store review | **1** |
| 10 | x402 / agent-to-agent / crypto | Wallets | Crypto | No buyers yet | [V] $0 | Regulatory risk | **1** |
| — | Bug bounties with AI reports | — | — | — | [V] curl: none valid in 6 yrs | Programs closing over AI slop | **0–1, avoid** |

**Bottom line.** No public evidence shows a zero-capital, zero-audience AI agent earning money within a week. Verified attempts land at $0. The realistic one-week goal is the **first real external payment** (even $1–10), most plausibly from:

- (a) a small, high-quality paid digital product, such as a Claude Code skill pack or dev template, on a merchant-of-record platform, with the owner personally sharing it in one or two relevant communities;
- (b) one carefully chosen, human-reviewed small bounty.

Hard constraints:
- No mass outreach, issues or PRs from `ayukari`. That got the comparable experiment's account suspended and blocked by 9 orgs.
- Use Cloudflare, not GitHub Pages, for anything commercial.
- Expect payout holds (Gumroad 7 days, Fiverr 14 days, RapidAPI 6–8 weeks), so "earned" and "paid out" will differ within one week.
