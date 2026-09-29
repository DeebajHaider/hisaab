# Portfolio module — research notes & plan (Substep 6.0)
 
The result of the Phase 6 research pass, written in plain language, and the
agreed plan for what the portfolio module will and won't do. Pair it with
`hisaab-phase-6-plan.md` (the earlier draft this refines),
`hisaab-architecture.md` (how the codebase is built), and `Phase_5_complete.md`
(the most recent work).
 
This is the contract. Substep 6.1 has been approved to start.
 
---
 
## The short version
 
We're building a simple, sturdy way to track investments. You group what you
own by asset class (stocks, gold, property, etc.). For each thing you own, you
record two numbers: what you put in, and what it's worth now. The app shows
your profit or loss per holding and overall, lets you update values whenever
you feel like checking, and draws a simple graph of how each holding has done
over time.
 
We are deliberately **not** building, in this phase: detailed share-by-share
trade tracking, a whole-portfolio value-over-time graph, a single
"annual return" percentage, automatic price fetching, or tax calculations.
Those either need a real portfolio to design well or are extra weight you
don't need yet.
 
---
 
## Why build this now if you don't invest yet?
 
Because the basic parts don't change. Every investment tracker — from a
beginner's spreadsheet to paid apps — has the same foundation: a list of what
you own, what you put in, and what it's worth. That's the same whether you
start investing this year or in three. It's safe to build blind. The risky-to-
guess parts (performance graphs, annual-return math, proper currency blending)
are exactly the parts we're deferring. To avoid shipping pure theory, we'll
test the bones against a few made-up portfolios.
 
If you'd rather not spend the sessions at all right now, that's a fair call —
the budgeting app is finished and stands on its own. But if Phase 6 happens,
this is the sensible shape.
 
---
 
## The model, drawn from a real investor's sheet
 
The shape comes from how an actual investor tracks his holdings (a sample sheet
he shared). Every row is just: asset class, name, original investment, current
value, and the profit/loss between them in rupees and percent. He tracks even
his stocks this way — no share counts, no individual trade log. Just "what I
put in" versus "what it's worth now." That simplicity is the whole point, and
it covers everything: gold, property, retirement funds, foreign currency,
stocks, and ETFs alike.
 
The richer share-by-share style (tracking units, logging each buy and sell,
working out the profit on a partial sale) is **deferred**. It only matters once
you're actively trading individual stocks, and it can be added later as an
optional mode for just the holdings that need it. Nothing's lost by waiting.
 
---
 
## The words you'll see, in plain terms
 
- **Portfolio** — your container for everything you own. Private to you (not
  shared with family, the way a budget can be). You can have more than one.
- **Asset class** — the type of investment, used to group holdings: Stocks,
  ETF, Mutual Fund, Commodity (gold), Property, Retirement Fund, Forex, Cash,
  Other. We provide these ready-made, and you can add your own.
- **Holding** — one specific thing you own: "1 Tola Gold", "HUBCO shares", a
  plot of land, a US ETF.
- **Original investment** — what you put in.
- **Current value** — what it's worth now. You update this whenever you check.
- **Profit / loss (P/L)** — the gap between the two, shown in rupees and percent.
---
 
## How it works, with a worked example
 
You buy one tola of gold for Rs 501,000. You create a holding called
"1 Tola Gold" under the **Commodity** asset class, with original investment
501,000 and current value 501,000.
 
Months later the gold rate dips. You check it, open the holding, and update the
current value to 467,000. The app now shows a loss of Rs 34,000 (−6.79%),
flagged red. A stock works identically: "HUBCO", you put in Rs 2,123.66, it's
now worth Rs 2,209.70, so a gain of Rs 86.04 (+4.05%), flagged green. No share
counts anywhere — just the two numbers and the gap between them.
 
**Removing or closing a holding:** when you sell or no longer hold something,
you update its final value, then archive it. Archiving tucks it out of your
active list but keeps every record — exactly like archived categories on the
budgeting side.
 
---
 
## How it's structured (and why it echoes budgets)
 
It mirrors the budget → categories → items structure you already built, with
one key difference: it's private to you, not shared.
 
- A **portfolio** is the container (like a budget, but no members, no sharing).
- **Asset classes** group your holdings (like categories inside a budget).
  Ready-made ones are seeded into every new portfolio; you can add your own.
- **Holdings** sit inside an asset class (like items/transactions inside a
  category).
Reusing this shape means most of the screens and patterns carry over from the
budgeting side.
 
---
 
## Remembering values over time
 
Each time you update a holding's value, the app quietly saves that value with
its date. This feeds the **per-holding progression graph** — pick a holding,
see a line of how its value has moved over time. That graph **is** in scope
this phase, because it's the easy one: it just plots the saved points.
 
The harder graphs stay deferred: your whole portfolio's combined value over
time, and a single "what annual return did I earn" number. Those need real
history and trickier math, and are best designed against a real portfolio.
 
---
 
## Currency (rupees and dollars)
 
Each holding is tagged with its currency — most PKR, some USD (and the sample
even had a forex holding in AED). The overview totals each currency separately,
so nothing is secretly converted with a made-up rate. If you want one combined
rupee figure, there's an optional box to type today's "1 USD = X PKR" rate, and
the app blends using that. No automatic exchange rates.
 
---
 
## What the app calculates
 
All simple, well-understood numbers, built and tested carefully:
 
- **Per holding:** profit/loss in rupees and percent; current value; original
  investment.
- **Portfolio totals:** total put in, total current value, total profit, with
  separate subtotals per currency.
- **Allocation:** a donut showing what share of your money sits in each asset
  class.
- **Per-holding progression:** the value-over-time line for a single holding.
**Deferred:** share-level tracking (units, buys/sells, realized-vs-paper
profit, dividends), whole-portfolio value-over-time, the annual-return number.
 
**Not doing at all:** automatic price fetching, tax calculations, automatic
currency conversion.
 
---
 
## The data, in plain terms
 
Four tables, all private to each user.
 
- **Portfolios** — your container(s). Just a name.
- **Asset classes** — the groups inside a portfolio. Name, plus an archived
  flag. Ready-made ones seeded automatically; you can add your own.
- **Holdings** — the things you own. Name, optional ticker symbol, which asset
  class, currency, original investment, current value, when the value was last
  updated, notes, and an archived flag.
- **Value history** — one row each time you update a holding's value: which
  holding, the date, and the value. This is what the progression graph reads.
---
 
## Decisions, settled
 
1. **Shape:** simple value-tracked — what you put in vs what it's worth.
   Share-level detail deferred until you actively trade.
2. **Structure:** a portfolio container with asset classes as extensible
   groups (ready-made plus your own). Mirrors budgets, but private.
3. **Currency:** kept; separate PKR/USD totals with an optional manual blend
   rate. No auto exchange rates.
4. **Profit:** simply current value minus original investment, in rupees and
   percent. No realized-vs-paper split in the simple shape.
5. **Graphs:** per-holding progression is in scope; whole-portfolio-over-time
   and the annual-return number are deferred.
6. **Multiple portfolios:** allowed (you create them, like budgets). Starting
   with one is fine.
7. **Privacy:** portfolios are yours alone — no sharing, no members.
---
 
## What's in this phase vs. later
 
**In scope now:**
- The four tables and the private-to-each-user security rules.
- Portfolio create/edit/delete; asset-class add/edit/archive (ready-made + custom).
- Holdings: add/edit/archive, grouped by asset class.
- Update a holding's value (saved to history); close/archive a holding.
- The calculations above.
- A portfolio overview: totals, allocation donut, per-holding table, and the
  currency split with optional blend rate.
- The per-holding progression graph.
- Empty states, a mobile pass, and a check that one user can't see another's
  portfolio.
- A stress test using 2-3 made-up portfolios (e.g. a gold holding at a loss, a
  retirement fund up big, a US ETF in dollars).
**Deferred until there's a real portfolio:**
- Share-level tracking (units, buys/sells, realized vs paper profit, dividends).
- Whole-portfolio value-over-time graph.
- The annual-return number.
- Importing broker statements.
- Best/worst performers, comparing against the KSE-100.
**Out of scope, probably for good:**
- Automatic price fetching, tax calculations, automatic currency conversion.
---
 
## Build order (the simple shape)
 
| Substep | What                                                                       |
| ------- | -------------------------------------------------------------------------- |
| 6.1     | The four tables, their types, and the private-to-you security rules.       |
| 6.2     | The top-level Portfolio section; portfolio + asset-class management.       |
| 6.3     | Holdings: add / edit / archive, grouped by asset class.                    |
| 6.4     | Update a holding's value (saved to history); profit per holding; close.    |
| 6.5     | The calculations — built test-first, since getting them wrong is easy.     |
| 6.6     | Portfolio overview: totals, allocation donut, per-holding table, currency. |
| 6.7     | Per-holding progression graph.                                             |
| 6.8     | Stress test with made-up portfolios; mobile + empty states; isolation check.|
| 6.9     | Update the master plan; write the Phase 6 completion notes.                |
 
Same working style as before: code walked through in chunks with decisions
explained as we go, strict test-first on the calculations, test-after on the
data-fetching hooks, no tests on plain screen wiring, one tidy commit per
substep, and you verifying each chunk before the next.
