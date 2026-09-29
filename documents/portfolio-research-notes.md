# Portfolio module — research notes & plan (Substep 6.0)
 
This is the result of the Phase 6 research pass, written in plain language.
It's the agreed plan for what the portfolio module will and won't do. Pair it
with `hisaab-phase-6-plan.md` (the earlier draft plan this refines),
`hisaab-architecture.md` (how the codebase is built), and `Phase_5_complete.md`
(the most recent work).
 
Nothing gets coded until this is approved. Substep 6.1 starts after sign-off.
 
---
 
## The short version
 
We're building a simple, sturdy way to track investments: list the things you
own, record when you buy/sell/get paid, update prices yourself whenever you
feel like it, and see what everything's worth and how much you're up or down.
 
We are **not** building the fancy stuff (year-by-year performance graphs,
fancy annual-return math, automatic stock-price fetching, tax calculations) in
this phase. Those need a real portfolio to design well, and you're not
actively investing yet. So we build the bones now, test them against a few
made-up portfolios so they're not pure guesswork, and leave room to add the
rest later when there's real money to track.
 
---
 
## Why build this now if you don't invest yet?
 
Because the basic parts don't change. Every investment tracker out there — from
a beginner's spreadsheet to paid apps like Sharesight — has the exact same
foundation: a list of holdings, a record of buys and sells, and a view of
what you've gained. That foundation will be the same whether you start
investing this year or in three years. It's safe to build blind.
 
The parts that *would* be risky to build blind — the performance graphs, the
annual-return calculation, currency blending done "properly" — are exactly the
parts we're deferring. So we're not guessing about anything that matters.
 
If you'd rather not spend the time at all right now, that's a fair call too;
the budgeting app is finished and works on its own. But if we do Phase 6, this
is the sensible shape for it.
 
---
 
## The words you'll see, in plain terms
 
- **Holding** — one thing you own. 500 shares of Meezan Bank is a holding.
  A US ETF is a holding.
- **Transaction** — one event on a holding: you bought some, sold some, or got
  a cash payout.
- **Units** — how many shares (or fund units) you own of a holding.
- **Cost basis** — how much you actually paid for what you still own. If you
  bought at different prices, it's your blended average.
- **Unrealized gain** — profit on paper. Your shares are worth more than you
  paid, but you haven't sold, so it's not real money yet.
- **Realized gain** — profit you actually locked in by selling.
- **Dividend** — cash a company pays you just for holding its shares, separate
  from the price going up.
- **Asset class** — the type of investment: individual stock, ETF, mutual
  fund, money-market fund, or "other."
---
 
## How it works, with a worked example
 
You buy 500 shares of a stock at Rs 50 each. You create a holding and record
that first buy. The app knows: 500 units, Rs 25,000 put in.
 
A month later the price jumps to Rs 75. You open the holding, tap **"update
price,"** and type 75. The app now shows:
 
- Current value: 500 × 75 = **Rs 37,500**
- Unrealized gain: 37,500 − 25,000 = **Rs 12,500** (profit on paper)
Updating the price does **not** change how much you own. You still have 500
shares; the app just knows they're worth more now.
 
Now suppose you **sell 100** shares at 75. That's a different action:
 
- You now own 400 shares.
- You bought those 100 at 50 and sold at 75, so you banked 100 × 25 =
  **Rs 2,500 of realized gain** — real money, in your pocket.
- Your remaining 400 shares carry on at their original Rs 50 cost.
Keeping "update the price" and "sell some" as separate actions is what lets the
app tell you how much you've *actually* made versus how much you're *up on
paper*. They live on the same screen for convenience — when you open a holding
you'll see both buttons — but they're recorded differently underneath.
 
**Closing a holding:** when you sell the last of your shares, you enter the
price you sold at, the app works out your final profit, your units hit zero,
and it automatically files the holding away (archives it). All the records
stay — archiving just tidies it out of your active list, exactly like archived
categories on the budgeting side.
 
---
 
## Remembering prices over time
 
Every time you update a price, the app quietly saves that price with the date
in a little history table. You won't see much from this at first — but it means
that later, when we add a "value over time" graph, it'll have real history to
draw from. If we *didn't* save these now, that history would be lost forever
and the future graph would start from nothing.
 
So: the price updates get saved from day one. The graph itself is deferred —
but the data it needs starts piling up immediately. There's no automatic
fetching of prices from the internet; you update a price whenever you choose to
check it. Completely manual, completely up to you.
 
---
 
## Currency (rupees and dollars)
 
Each holding is tagged with its currency — most will be PKR, some will be USD
(US stocks through a foreign broker). The portfolio overview shows rupee
holdings and dollar holdings totalled separately, so nothing is secretly
converted with a made-up rate. If you want a single combined rupee figure,
there's an optional box where you type today's "1 USD = X PKR" rate, and the
app blends them using that. No automatic exchange rates.
 
---
 
## What the app calculates
 
All of these are simple, well-understood numbers we'll build and test
carefully:
 
- **Units held** — your buys minus your sells.
- **Cost basis** — what you paid for what you still hold (blended average).
- **Current value** — units × the latest price you entered.
- **Unrealized gain** — current value minus cost, in rupees and percent.
- **Realized gain** — profit locked in from past sells.
- **Income** — total dividends/payouts received.
- **Total return** — everything combined: paper gains + locked-in gains +
  dividends, in rupees and percent.
- **Portfolio totals** — total put in, total current value, total gain, with
  rupee and dollar subtotals.
- **Allocation** — a pie/donut showing what share of your money sits in each
  asset class.
**Deferred** (added later, when there's a real portfolio): the year-by-year
value graph, and a single "what annual return did I earn" number (the honest
version of this is fiddly to calculate and only useful once you have several
real buys and sells to feed it).
 
**Not doing at all:** automatic price fetching, tax calculations, and the
manager-grading style of return that needs constant price bookkeeping.
 
---
 
## The data, in plain terms
 
Three tables, all private to each user (your investments are yours alone — not
shared with family like budgets can be).
 
**Holdings** — one row per thing you own:
name, optional ticker symbol, asset class, currency (PKR/USD), the latest price
you entered, when you entered it, notes, and an archived flag.
 
**Holding transactions** — one row per event on a holding:
which holding, the kind (buy / sell / dividend / fee), the date, how many units,
the price per unit, any broker fee, the total cash that moved, and notes. The
total-cash figure is the source of truth — for a buy it's what left your
pocket (units × price + fee); for a sell it's what came back.
 
**Holding prices** — one row each time you update a price:
which holding, the date, and the price. This is the history table that the
future graph will read from.
 
(The "no units, just type a total value" idea — for savings certificates and
property — is dropped for now, since you're not tracking those yet. If that
changes later, we add it back as its own mode.)
 
---
 
## Decisions, settled
 
1. **Currency:** keep it. Each holding has a currency; overview shows PKR and
   USD totals separately, with an optional manual rate to blend into one PKR
   number. No auto exchange rates.
2. **Price history:** build the saving-prices-over-time table now (the data
   collection is the part we can't undo later). The graph that uses it is
   deferred.
3. **Cost basis:** blended average. (Standard everywhere, including for PSX
   stocks.)
4. **Dividends:** recorded as just another kind of transaction, not a separate
   thing.
5. **Annual-return number:** not in this phase. When added, it'll be the
   version that grades *your* money. The data we're storing already supports it.
6. **Where it lives:** its own top-level "Portfolio" section next to "Budgets,"
   with its own layout — not buried inside a budget, because investments are
   personal, not shared.
7. **Savings certificates / property:** out for now (your call).
---
 
## What's in this phase vs. later
 
**In scope now:**
- The three tables, plus the private-to-each-user security rules.
- Add / edit / archive holdings, grouped by asset class.
- Record buys, sells, dividends, and fees on a holding; edit and delete them.
- Update a holding's price (saved to history), and sell-everything-to-close.
- All the calculations listed above.
- A portfolio overview: totals, the allocation donut, a per-holding table, and
  the rupee/dollar split with the optional blend rate.
- Empty states, a mobile pass, and a check that one user can't see another's
  portfolio.
- A stress test using 2-3 made-up portfolios (e.g. a PSX stock with a dividend
  and a partial sell, and a US ETF in dollars) so we're not shipping pure
  theory.
**Deferred until there's a real portfolio:**
- The value-over-time graph (the history table feeds it when we build it).
- The annual-return number.
- Stock splits and bonus shares (workaround if needed: record bonus shares as a
  buy at price zero).
- Importing broker statements.
- Dividend yield, best/worst performers, comparing against the KSE-100.
**Out of scope, probably for good:**
- Automatic price fetching, tax calculations, automatic currency conversion,
  and the manager-grading return method.
---
 
## Tentative build order (firms up on approval)
 
| Substep | What                                                                   |
| ------- | ---------------------------------------------------------------------- |
| 6.1     | The three tables, their types, and the private-to-each-user rules.     |
| 6.2     | Holdings list + add/edit/archive; the new top-level Portfolio section. |
| 6.3     | Recording buys/sells/dividends/fees on a holding; edit and delete.     |
| 6.4     | Updating prices (with history), and closing a holding by selling all.  |
| 6.5     | The calculations — built test-first, since getting them wrong is easy. |
| 6.6     | Portfolio overview: totals, allocation donut, per-holding table, FX.   |
| 6.7     | Stress test with made-up portfolios; mobile + empty-state pass; checks.|
| 6.8     | Update the master plan; write the Phase 6 completion notes.            |
 
Same working style as before: code walked through in chunks with decisions
explained as we go, strict test-first on the calculations, test-after on the
data-fetching hooks, no tests on plain screen wiring, one tidy commit per
substep, and you verifying each chunk before the next.
