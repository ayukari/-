# R1: Japan-specific zero-capital income channels and the rules around them

Research date: 2026-10-04. Researcher: Claude Code (subagent, block R1 of 3).

## Method and how far to trust it

- 40+ web searches in Japanese and English.
- **Direct page fetches were blocked by the container's egress proxy** for zenn.dev, info.zenn.dev, qiita.com, note.com, booth.pm, docs.github.com, gumroad.com and others. Most facts below therefore come from search-engine extracts of the cited pages, not from reading each page in full. Treat them as "secondary, needs a check on the live page before the owner acts on it".
- **One exception was read in full from the primary source:** GitHub Sponsors. The `github/docs` repo is on raw.githubusercontent.com, which was reachable, so its fees, payout timing and supported regions are quoted from GitHub's own docs and terms.
- No numbers were invented. When a figure could not be confirmed, it is marked **(unverified)**, or the cell says "not found".
- Feasibility score (1–5) answers one question: can we make a first sale within 1 week, with zero capital, with the AI doing the work? The owner `ayukari` is a new GitHub account with 0 followers and no existing audience on any platform.

---

## Summary table

| Channel | Signup cost | Seller fees | Payout minimum / timing | AI content rule | Score (1 wk) |
|---|---|---|---|---|---|
| Zenn paid book | 0 | 3.6% + 10% of remainder (keep ≈86.8%) | Cash request needs ≥¥1,000; ¥350 per transfer; monthly close | Allowed, but "human must be the main author". No auto-posting or bots. Posting rate limits. | **4** |
| Zenn badges (tips) | 0 | Same structure | Same | Same | 2 |
| Qiita | 0 | no creator monetization | n/a | n/a | 1 |
| note paid article / membership | 0 | Payment fee 5% (card/PayPay) or 15% (carrier), plus 10% platform fee (20% for 定期購読マガジン), plus ¥270 transfer fee | Monthly | AI allowed. Text used for AI training by default (opt-out available) | 2 |
| BOOTH (pixiv) digital goods | 0 | 5.6% + ¥45 per order (since 2025-10-28) | Month-end close, paid from the 20th of the next month. ¥201–4,999 needs a manual request (1st–19th of the month) | AI allowed. Mass-produced or imitative AI goods get force-hidden or banned (2025-07) | 2 |
| Gumroad (from Japan) | 0 | 10% + Stripe processing (≈13% total); 30% on Discover sales | Bank (Stripe) only. **PayPal not usable** for Japan-based sellers since 2025-09. Minimum payout reported as $10 or $100 (conflicting reports) | Allowed | 1–2 |
| Brain | 0 | 12% (payment included); ¥250 transfer fee | Request ≥¥1,000, only after 30 days | Prior review of every product (1–3 days); ID verification | 2 |
| Tips | 0 | 14% | ≥¥5,000; ¥550 transfer fee; paid ~10 days after request | not found | 1–2 |
| Coconala | 0 | 22% (27.5% for video chat) | Weekly: request by Sunday, paid Thursday. ¥160 fee if under ¥3,000. Request within 120 days. ID verification needed | AI **illustrations prohibited**. AI-written text and PDFs explicitly allowed | 2 |
| CrowdWorks / Lancers tasks | 0 | CrowdWorks tasks 20%; Lancers 16.5% | Transfer fee depends on bank | Platform allows AI; individual clients often forbid it | 3 (tiny ¥) |
| LINE Creators Market | 0 | Creator gets 35% of price | Withdraw only once ≥¥1,000; arrives ~45 days after request | AI allowed, but needs an "AI生成" label and human editing. Pure auto-generated sets may be rejected | 2 |
| Kindle (KDP JP) | 0 | 70% royalty at ¥250–1,250, otherwise 35%; KU ~¥0.5/page (unverified) | Paid ~60 days after month end; no minimum for direct deposit (EFT) | Must declare "AI-generated" content. Max 3 new titles/day | 2 |
| pixivFANBOX | 0 | 10% (12.9% for R-18) | Fee ¥200 (¥300 for ≥¥30k); no minimum | **AI-generated content prohibited in principle** (2023-07) | 1 |
| YouTube / TikTok | 0 | n/a | YPP needs 500–1,000 subs plus 3,000–4,000 watch hours or 3M–10M Shorts views | Allowed, with label | 1 |
| Chrome Web Store / Google Play / App Store | **$5 / $25 / ¥12,980 per year** | 15–30% | — | — | **excluded (not zero-capital)** |
| GitHub Sponsors | 0 | 0% on personal sponsors; up to 6% on org sponsors | **First payout is held 60 days.** Then monthly (22nd, via Stripe Connect) | n/a | 1 |

---

## 1. Zenn (Classmethod)

### Paid books

**Price and fees**
- A book can cost ¥0, or ¥200–¥5,000. Single articles cannot be sold; only books can.
- Fees: 3.6% payment fee, then 10% platform fee on the remainder. The author keeps about 86.76%. On a ¥1,000 book that is ¥868.
- Source: [Zenn 収益施策 (2024-08-22)](https://info.zenn.dev/2024-08-22-zenn-business-policy); [Zenn 特商法表記](https://zenn.dev/terms/transaction-law).

**Payout**
- Sales and badge payouts close at month end. The confirmed amount shows on the dashboard on the 1st of the next month.
- Cash withdrawal needs a balance of ¥1,000 or more. Each bank transfer costs ¥350.
- An Amazon gift card is an alternative payout.
- Source: search extracts of Zenn's docs (secondary).

**GitHub sync**
- Articles and books can be managed in a GitHub repo linked to the Zenn account. A book lives at `books/<slug>/config.yaml` plus chapter `.md` files and `cover.png`.
- `price: 0` means free; `price: 200–5000` means paid. A push to the linked branch deploys it.
- So the AI can write and push. The owner only needs to:
  1. create the Zenn account,
  2. link the GitHub repo,
  3. register payout details.
- Source: [Zenn CLI guide](https://zenn.dev/zenn/articles/zenn-cli-guide); [途中からGitHub連携](https://zenn.dev/zenn/articles/setup-zenn-github-with-export).
- Warning: one author reported that a pushed article was **not displayed for 3 days**, and that `$` signs collided with Zenn's math notation. Source: [ryu7865 第4回](https://zenn.dev/ryu7865/articles/2026-09-23-ai-agent-side-business-04).

**AI rules**
- The 2025-06-05 guideline change says AI writing is not banned, but asks authors to avoid:
  - posting without checking accuracy,
  - mass-posting for promotion, follower gain or to drive outside traffic.
- The 2026-03-10 policy says "人が主体となって情報を発信". It specifically calls out:
  - bot-operated accounts,
  - posting faster than the author can verify.
- Zenn sets per-user posting caps per period. Spam-like behaviour can lead to account freeze.
- **Implication:** the owner must actually review each book, and the AI must not auto-publish in bulk.
- Sources: [2025-06-05 改定](https://info.zenn.dev/2025-06-05-update-terms); [2026-03-10 AI方針](https://info.zenn.dev/2026-03-10-ai-contents-guideline); [ITmedia 2025-06](https://www.itmedia.co.jp/aiplus/articles/2506/05/news104.html).

**特商法**
- If the seller counts as a 販売事業者, their 特商法 display is shown on the sales page.
- Legally, the sale is a direct trade between seller and buyer, and Zenn is not a party to it.
- Source: [Zenn 特商法](https://zenn.dev/terms/transaction-law).

**Evidence of real earnings (most relevant first)**
- **ryu7865, AI-agent side-business series, part 4 (2026-09-25).** One copy sold of a ¥500 book (chapters 1–3 free). Expected take-home ¥434. This was the first sale of the series. [link](https://zenn.dev/ryu7865/articles/2026-09-23-ai-agent-side-business-04)
- **idonthaveapen (2026-07-03).** An AI wrote the book and built the publishing setup. A ¥1,500 Zenn book went on sale the same day. The human only gave instructions, reviewed, set the price, created the Zenn and GitHub accounts and said "publish". **Sales figures were not visible in the extract.** [link](https://zenn.dev/idonthaveapen/articles/ai-wrote-published-book-in-a-day)
- **WireHarbor.** A ¥1,500 "CLAUDE.md 実践設計ガイド" was published 2026-04-05. The first purchase came "a few days later". [note](https://note.com/wireharbor/n/nbbd369b7bf41)
- **sktt_panda.** A ¥500, 15-chapter book from an unknown (無名) account sold 5 copies. The author had first published 3 free series. Timeframe not captured. [link](https://zenn.dev/sktt_panda/articles/zenn-books-individual-dev-first-paid)
- **joinclass (2026-05-23).** Book revenue up to March 2026 was ¥21,403: Zenn ¥14,756 and Kindle ¥6,647. This sat next to ¥1.94M of consulting income, with AI tool costs of about ¥22,680 per month. [link](https://zenn.dev/joinclass/articles/ai-3-20260521220006-13904)
- **むらさん.** A Raspberry Pi book made ¥50,000 in its first week and reached #2 on Zenn trends. His three earlier books sold about 100 copies in their first year. He credits pre-launch promotion. [note](https://note.com/murasame_tech/n/n430c44b267d7)
- **daichi_gamedev.** A ¥3,600 Unreal Engine 5 book sold about 800 copies between 2022-02 and 2024-04, roughly ¥2M in sales. It took about 2y9m to write. [link](https://zenn.dev/daichi_gamedev/articles/zenn-write-book)
- **AI agent "company" experiment (jiritsuworks, 2026-08-21).** Sales were ¥0 at the time of writing. Its own research put the median monthly revenue of the options it considered at about ¥0–10,000. [link](https://zenn.dev/jiritsuworks/articles/ai-agent-company-experiment-01)
- **yushiyamamoto, "収益0円から始めるZenn発信OS" (started 2026-05-14).** Target is ¥10,000 per month from articles, books and badges. **Results not found in the extracts.** [link](https://zenn.dev/yushiyamamoto/articles/zenn-revenue-os-public-experiment)

**Time to first yen:** same day to a few days in the best cases. Getting cash out also needs ≥¥1,000 and a monthly close, so **cash in the bank will not arrive within the week**. Only a "sale recorded" can happen within a week.

**Score: 4.** This is the most direct path for an AI that can push to GitHub, and the audience is tech readers, which suits AI-written technical books. The risks are Zenn's AI policy and rate limits, plus the fact that a 0-follower account has no distribution.

### Badges (tipping)
- Readers send ¥300–5,000 badges on articles. Authors receive a payout (cash or Amazon gift card).
- The exact split was not confirmed. The secondary extract says it uses the same 3.6% + 10% structure.
- Score **2**: a new account will get few readers in a week.
- Source: [Zenn 収益施策](https://info.zenn.dev/2024-08-22-zenn-business-policy).

## 2. Qiita
- There is no official creator monetization: no paid articles and no tips. Ads and affiliate links are basically prohibited.
- Its only use here is as a traffic and credibility channel pointing to Zenn, BOOTH or note. Even that is limited: Qiita discourages promotional posts.
- **Score 1.**
- Source: [Qiita/Zenn/Dev.to 収益構造](https://zenn.dev/s17w09/articles/a40c3928b1f79e).

## 3. note (paid articles, memberships)

**Fees**
- Payment fee: 5% (card or PayPay), 15% (carrier billing).
- Platform fee: 10% on paid articles and memberships, 20% on 定期購読マガジン.
- Transfer fee: ¥270.
- Example: a ¥1,000 card sale pays ¥585 after the transfer fee.
- Sources: [hanapapa 2026](https://hanapapa-side-business.com/note-monetization/); [note手数料解説](https://note.com/yutori_kurashi/n/n53e9cce0d4e1).

**AI rules**
- AI writing is not prohibited.
- From 2025-08-01, all text (including paid and membership articles) is offered to AI companies as training data under the "AI学習対価還元プログラム". It is on by default; creators can opt out per account or per article.
- Source: [PR TIMES](https://prtimes.jp/main/html/rd/p/000000303.000017890.html); [help](https://www.help-note.com/hc/ja/articles/44723422427417).

**特商法**
- A creator who counts as a 販売業者 has display duties.
- Individuals may instead disclose their details on request through note's contact form.
- Source: [note help 特商法](https://www.help-note.com/hc/ja/articles/360008947533); [note 特商法表示](https://note.com/terms/specified).

**Evidence**
- **やまう, "AI副業でnoteを1週間".** 25 articles (8 paid, ¥500–3,980, including a 50%-off sale), promoted on X and Threads. Result: 184 PV, **¥0**. [link](https://note.com/yamau_vlog/n/naa9f77070a8f)
- Many note posts claim ¥50k+ per month from Claude Code side jobs. These are usually themselves paid or upsell content, with no verifiable dashboards, so **treat them as marketing, not evidence**. Examples: [claude_sidejob](https://note.com/claude_sidejob/n/n309911d64edd), [ai_biz_labo](https://note.com/ai_biz_labo/n/n0ca48fa11d46).

**Score 2.** Zero cost and an instant listing, but note discovery for a new account is near zero (the やまう experiment is the cleanest data point).

## 4. BOOTH (pixiv)

**Fees**
- Service fee is 5.6% + ¥45 per order since 2025-10-28 (it was 5.6% + ¥22).
- The warehouse fee also changed, but that only affects physical goods.
- Source: [BOOTH お知らせ 832](https://booth.pm/announcements/832); [ITmedia 2025-07](https://www.itmedia.co.jp/news/articles/2507/24/news052.html).

**Payout**
- Sales from orders completed in a calendar month are paid from the 20th of the next month (within 5 business days).
- For a balance of ¥201 to ¥4,999, the seller must press 振込申請 between the 1st and the 19th.
- One secondary source says BOOTH bears the transfer fee **(unverified)**.
- Source: [BOOTH help 売上はいつ](https://booth.pixiv.help/hc/ja/articles/230690667); [振込申請](https://booth.pixiv.help/hc/ja/articles/230690647).

**AI rules**
- In 2023-05 and again on **2025-07-18**, pixiv tightened its handling of AI goods. Two behaviours are targeted:
  - goods that closely imitate a specific work or artist,
  - mass or continuous listing of similar goods.
- Penalties: forced unpublishing of products or the whole shop, or account suspension.
- Labelling goods as AI-made is recommended.
- Source: [Impress Watch 2025-07](https://www.watch.impress.co.jp/docs/news/2032504.html); [PC Watch](https://pc.watch.impress.co.jp/docs/news/2032493.html).

**Address hiding**
- あんしんBOOTHパック gives **anonymous shipping for physical goods**.
- For the **特商法 display**, BOOTH lets a shop choose "省略" (omit). This is **not secrecy**: the seller must disclose name, address and phone without delay if a buyer asks.
- Sources: [bryog](https://bryog.com/booth-tokushoho/); [note 浦田一香](https://note.com/urataitika/n/n6c859289682f).

**What the owner must do:** create a pixiv account, open a shop, register a bank account, and choose how to handle the 特商法 display.

**Score 2.** Zero cost. Digital goods (templates, prompt packs, code) can be listed instantly. But BOOTH discovery for new shops is weak, and the AI-mass-listing ban rules out volume.

## 5. Gumroad from Japan

**Fees:** 10% + Stripe processing (about 2.9% + $0.30), roughly 13% total on direct-link sales; 30% on sales through Discover. Source: [crenavi](https://crenavi.com/platform/gumroad).

**Payout from Japan**
- Japan is a "bank payout" country, so per Gumroad policy **Japan-based sellers cannot use PayPal**. Buyers of a Japanese seller's products reportedly cannot pay with PayPal either.
- History:
  - PayPal was removed in 2024-10; bank payouts then stalled for about 3 months.
  - PayPal came back in 2025-02.
  - In 2025-09 PayPal was unavailable again for Japan. A first-hand seller then moved to PayHip.
- The minimum payout is reported as both "$10, bi-weekly" and "raised to $100" **(conflicting, unverified)**.
- Sources: [boochow blog](https://blog.boochow.com/article/gumroad-paypal-2.html), [支払い再開](https://blog.boochow.com/article/eventually-got-paid-from-gumroad.html); [cldnavi 2026](https://cldnavi.com/blog/gumroad-guide-2026/).

**Owner must:** sign up, verify identity through Stripe, and add a Japanese bank account.

**Score 1–2.** Reaches a global audience, but payouts from Japan have been unreliable, and it has no built-in Japanese audience.

## 6. Brain / Tips (Japanese information-product marketplaces)

**Brain**
- 12% fee (payment included), ¥250 transfer fee.
- Withdrawal needs ≥¥1,000 and is allowed only 30 days after the sale.
- ID verification with a photo ID is required. Each product is reviewed by staff (1–3 days) and rejected if the price is out of line with the content.
- A strong affiliate culture.
- Sources: [drama.co.jp](https://drama.co.jp/news/column/4155/); [applired](https://applired.net/brain-sale/).

**Tips**
- 14% fee. Withdrawal from ¥5,000, ¥550 per transfer (¥330 for Plus members), paid within about 10 days.
- Source: [tbs283blog](https://www.tbs283blog.com/note-tips-brain/).

**AI rule:** no explicit AI policy was found for either.

**Reputation:** both are associated with "情報商材". Selling there may hurt credibility.

**Score 2 (Brain), 1–2 (Tips).** Review and ID checks eat into the week, and Tips' ¥5,000 minimum blocks cash-out.

## 7. Coconala (skill marketplace)

**Fees and payout**
- 22% fee (27.5% for video chat).
- Weekly payout: request Monday to Sunday, paid the next Thursday (since 2025-01-27).
- Transfer fee ¥160 if under ¥3,000, free above.
- Must request within 120 days. ID verification is required.
- Sources: [coconala news 1121](https://coconala.com/news/1121); [atsoho](https://atsoho.com/blog/coconala-fee-2026-breakdown).

**AI rules**
- AI-generated **illustrations** (even as partial material) are prohibited and detected by Coconala's AI classifier.
- AI-written text articles and PDFs about AI are explicitly allowed.
- Checks happen after publishing.
- Sources: [coconala blog](https://coconala.com/blogs/6165551/784593); [jiyuni-hataraku](https://jiyuni-hataraku.com/coconala-ai/).

**Owner must:** handle buyer messages and the deadline-bound service delivery (the AI can draft). A new seller with no reviews rarely gets orders in week 1.

**Score 2.**

## 8. CrowdWorks / Lancers micro-tasks

**Fees**
- CrowdWorks: 20% on task-format jobs (tiered 20/10/5% for projects). Transfer fee depends on the bank.
- Lancers: a flat 16.5%.
- Sources: [CrowdWorks 手数料](https://crowdworks.jp/p-journal/archives/1802/); [atsoho 比較](https://atsoho.com/blog/crowdsourcing-tesuryo-hikaku-2026).

**AI policy**
- CrowdWorks' AI policy (2024-08) leaves AI use to the agreement between client and worker. It bans using workers' deliverables for training without consent.
- Many clients' job terms say "declare AI use" or "do not deliver raw AI output".
- Source: [CrowdWorks AIポリシー](https://blog.crowdworks.jp/archives/5811/).

**Caveat:** an AI operating the owner's account autonomously is a separate ToS and identity risk. Any account activity should be done by the owner in person.

**Evidence:** a note post claims ¥52,300 per month from CrowdWorks dev jobs built with Claude Code ([ai_biz_labo](https://note.com/ai_biz_labo/n/n0ca48fa11d46), unverified, promotional).

**Score 3, but only for "first tiny yen".** Tasks pay tens to hundreds of yen. It is not a scalable experiment, and payout timing pushes the cash past the week.

## 9. LINE Creators Market (stickers / emoji)

**Revenue share:** the creator gets 35% (since 2020). A ¥610 sale pays the creator about ¥213. Source: [webmobile](https://webmobile.jp/line-creators-stamp-app/); [LINE規約](https://creator.line.me/ja/terms/).

**Review:** averages about 5 days, sometimes hours. Source: [LINE公式ブログ](https://linesticker-ja.blog.jp/archives/1030612957.html).

**Payout:** withdrawal only once the balance is ≥¥1,000, arriving about 45 days after the request; a transfer fee applies. Source: [送金マニュアル](https://linecreator-manual-ja.blog.jp/archives/5733415.html).

**AI rules**
- The terms let LINE label content as AI-generated.
- Secondary sources say an "AI生成" label has been mandatory since 2025-06, and that sets made purely by automatic generation may be rejected (human editing is needed) **(secondary)**.
- Source: [makelim](https://makelim.site/ai_linestamp/).

**Evidence**
- First month ¥327; ¥500; about ¥2,000 in a week. Typical outcome.
- A secondary claim says 90%+ of creators earn ¥0.
- Outlier: an animated AI sticker set reported at ¥1.3M+ in its first month (X trending; unverified).
- Sources: [borohousebnb](https://note.com/borohousebnb/n/nb01b9ad38015); [ayayan](https://ayayan-work.com/2025/12/24/line-stamp-money/).

**Score 2.** Review takes about 5 days, and the ¥1,000 withdrawal floor means no cash inside a week.

## 10. Kindle Direct Publishing (Japanese)

**Royalty:** 70% at ¥250–1,250, otherwise 35%. Kindle Unlimited pays about ¥0.5 per page read (fluctuates; unverified).

**Payout**
- Paid about 60 days after the end of the month of sale. No minimum for direct deposit (EFT).
- Japanese residents fill in W-8BEN in the tax interview, which brings US withholding to 0%.
- Source: [KDP お支払いサイクル](https://kdp.amazon.co.jp/ja_JP/help/topic/G201748540); [最低支払い金額](https://kdp.amazon.co.jp/help?topicId=201207800).

**AI rules**
- AI-*generated* text or images must be declared. AI-*assisted* work (ideas only) need not be.
- Maximum 3 new titles per day per account.
- Source: [INTERNET Watch](https://internet.watch.impress.co.jp/docs/yajiuma/1533950.html); [prebell](https://prebell.so-net.ne.jp/news/pre_23092503.html).

**Evidence:** first month about ¥1,000 (2022), and a claim of about ¥60,000 in the first month for an AI book. The higher figures come from Kindle-course sellers (unverified). Source: [fucami](https://note.com/fucami/n/n7cab275d83bf); [stepai](https://stepai.jp/blog/ai-kindle-publishing-side-hustle-guide).

**Score 2.** A sale can be recorded within a week, but cash takes 2–3 months, and the owner must complete tax and bank setup.

## 11. pixivFANBOX
- 10% fee (12.9% for R-18 since 2025-09). Transfer fee ¥200 (¥300 for ≥¥30k), no minimum.
- **AI-generated content prohibited in principle since 2023-07-11.** Linking to AI content hosted elsewhere is also banned.
- Exceptions: content explaining generative AI, AI translation of one's own work, AI auto-coloring of one's own drawings.
- **Score 1.**
- Source: [ASCII](https://ascii.jp/elem/000/004/144/4144953/); [ITmedia 2025-06](https://www.itmedia.co.jp/news/articles/2506/09/news104.html).

## 12. YouTube / TikTok
- **YouTube YPP**
  - Fan-funding tier: 500 subscribers, plus 3,000 watch hours in 12 months or 3M Shorts views in 90 days.
  - Ad revenue: 1,000 subscribers, plus 4,000 hours or 10M Shorts views in 90 days.
  - A 2026-08 GIGAZINE report says new-entry thresholds rose to 8,000 hours or 20M Shorts views **(verify)**.
  - Source: [PC Watch](https://pc.watch.impress.co.jp/docs/news/1508606.html); [GIGAZINE 2026-08](https://gigazine.net/news/20260811-youtube-partner-program/).
- **TikTok:** creator rewards also need follower and view thresholds (not researched in detail).
- **Score 1.** Impossible within a week from zero.

## 13. App / extension stores (fees; fails the zero-capital rule)
- Chrome Web Store: $5 one-time.
- Google Play: $25 one-time.
- Apple Developer Program: ¥12,980 per year.
- Source: [nishishi](https://www.nishishi.com/blog/2021/10/appstore_fee.html); [hnavi](https://hnavi.co.jp/knowledge/blog/application_store/).
- **Excluded** under strict zero capital. Chrome's $5 is the cheapest if the owner later relaxes the rule.

## 14. GitHub Sponsors (Japan) — read from the primary source (github/docs)

**Availability:** Japan is in the supported-regions list. The recipient must reside in a supported region, and the bank account region must match the region of residence.

**Fees:** 0% on sponsorships from personal accounts. Up to 6% on sponsorships from organizations (3% card + 3% GitHub).

**Setup steps for the owner**
- Complete the profile, create tiers, add bank details through Stripe Connect, and submit tax information (W-8BEN for non-US residents).
- **2FA is required.**
- GitHub then reviews the application, which "may take a few days".

**Payout**
- **First payments are held for 60 days** after the first sponsorship begins.
- After that, Stripe Connect pays on the 22nd of each month, for any balance; a cross-border minimum may apply.
- ACH or wire payees: minimum $100.
- Source: [GitHub Sponsors Additional Terms §3.3](https://docs.github.com/en/site-policy/github-terms/github-sponsors-additional-terms) (read via the raw `github/docs` repo).

**Evidence (Japan):** azu (efcl.info) published yearly totals:

| Year | Total | Monthly range |
|---|---|---|
| 2022 | ¥1,678,163 | — |
| 2023 | ¥1,801,805 | ¥105,698–182,670 |
| 2025 | about ¥2.29M | — |

These are an established OSS maintainer's numbers, not a new account's. Sources: [2025](https://efcl.info/2025/12/31/open-source-in-2025/), [2023](https://efcl.info/2023/12/25/github-sponsors-report/).

**Score 1** for week 1: 0 followers, approval delay, and the 60-day hold. It is worth applying early as a long-tail "tip jar" linked from every repo and book.

---

## Japanese "AI side income" public experiments: real numbers only

| Who / where | What | Reported result | Notes |
|---|---|---|---|
| ryu7865 (Zenn, 2026-09) | AI-agent side business, Zenn book ¥500 | 1 sale, ¥434 take-home | Most comparable to our setup |
| idonthaveapen (Zenn, 2026-07-03) | AI wrote and published a ¥1,500 Zenn book in one day | On sale the same day; sales count not captured | Human did accounts, review, pricing |
| jiritsuworks (Zenn, 2026-08) | AI agent "runs a company" | ¥0 at publication | Its own research: median ¥0–10k per month |
| やまう (note) | 1 week, 25 note articles (8 paid) | 184 PV, ¥0 | Cleanest negative evidence |
| WireHarbor (note/Zenn, 2026-04) | ¥1,500 Claude Code guide | First sale within days | Topic: Claude Code / CLAUDE.md |
| joinclass (Zenn, 2026-05) | Books + automation | ¥21,403 book sales cumulative (Zenn ¥14,756) | Real income came from consulting |
| yushiyamamoto (Zenn, from 2026-05-14) | "収益0円から" Zenn revenue experiment, target ¥10k per month | Results not found | — |

**Pattern:** a first sale within days is achievable on Zenn with a topical AI/Claude-Code book at ¥500–1,500. note and BOOTH without an audience produced ¥0 in a week. Large "月5万〜" claims on note are mostly promotional, with no verifiable dashboards.

---

## Legal and tax notes (Japanese individual)

### 20万円 rule
- For a **salaried employee** with one employer and 年末調整 done, income tax filing is not required if total non-salary *income* (所得 = revenue minus expenses) is ¥200,000 or less a year. Source: [国税庁 No.1900](https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1900.htm).
- The rule does **not** apply to:
  - **resident tax** (住民税): a municipal 住民税申告 is still required,
  - anyone who files anyway (for example, for refunds or deductions).
- Source: [freee](https://www.freee.co.jp/personal-business/guide/articles/8924/).
- If the owner is not a salaried employee, the 20万円 rule does not apply. Filing then depends on total income versus deductions. The basic deduction (基礎控除) changed in the 2025 tax reform; confirm the current figure.

### Invoice registration
- インボイス (適格請求書発行事業者) registration is voluntary. Businesses with taxable sales of ¥10M or less in the base period are normally exempt from consumption tax.
- Not registering mainly affects B2B clients who need input-tax credits. For consumer sales on Zenn, note or BOOTH the impact is minimal.
- Registration publishes the registrant's name on the NTA site.
- Source: [freee インボイス副業](https://www.freee.co.jp/kb/kb-invoice/invoice-side-job/); [創業手帳](https://sogyotecho.jp/invoice-kojin-tourokushinai/).

### 特定商取引法 (selling digital goods online)
- Selling online counts as 通信販売. Anyone selling "業として" (with a profit motive, repeatedly and continuously) is a 販売業者, even an individual side-hustler.
- Required items include the seller's name, address and phone number.
- An individual may **omit** address and phone only if:
  - the listing states that the details will be provided without delay on request, and
  - the seller actually can provide them without delay.
- Source: [消費者庁 特商法ガイド 通信販売](https://www.no-trouble.caa.go.jp/what/mailorder/); [rule](https://www.no-trouble.caa.go.jp/what/mailorder/rule.html).
- Platform handling:
  - **Zenn:** shows the seller's 特商法 display on the sales page when the seller is a 販売事業者.
  - **note:** individuals can disclose via the contact form on request.
  - **BOOTH:** offers "省略" under the same disclose-on-request condition.

### BOOTH anonymity
- **あんしんBOOTHパック** hides the shipper's and recipient's addresses for **physical** shipments.
- For digital goods no shipping is involved. Address exposure then comes only from the 特商法 display, where "省略 + disclose on request" is the legal minimum.
- Source: [min-kobo](https://min-kobo.com/anonymous_delivery/); [bryog](https://bryog.com/booth-tokushoho/).

### Payer identity for 確定申告
- BOOTH: ピクシブ株式会社 (法人番号 2011001046319).
- Source: [bring-consulting](https://bring-consulting.co.jp/booth-tax-return/).

### US platforms (KDP, GitHub Sponsors, Gumroad via Stripe)
- These need a W-8BEN. Under the Japan–US treaty, US withholding on royalties is 0%.
- Japanese income tax still applies.

---

## Recommendation for the one-week experiment
1. **Primary:** a Zenn paid book (¥500–1,500) on a timely Claude Code / AI-agent topic, written by the AI in a GitHub repo linked to Zenn.
   - The owner reviews it, which satisfies Zenn's "human is the author" policy.
   - Pair it with 1–3 free, high-quality Zenn articles as the funnel. Do not mass-post.
2. **Secondary (same content, zero extra cost):** BOOTH digital download, or a note paid article. Expect ¥0 there without an audience.
3. **Apply in parallel (long tail):** GitHub Sponsors (2FA, Stripe, 60-day hold).
4. **Avoid:** FANBOX (AI banned), Coconala AI illustrations, app stores (fees), and YouTube or TikTok (thresholds).
5. **Week-1 success metric:** "first sale recorded on the dashboard", not "yen in the bank". Every channel found has a payout lag that extends beyond 7 days.
