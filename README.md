# Sizzle &amp; Serve — a sunset food-truck kitchen

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/krococoro/best-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/krococoro/best-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

A complete, original cooking game that runs offline in a desktop browser from its own
static files — no library, no network request, no build step.

You run a sunset food truck for one 90-second shift. Order tickets roll in on the
order board, each with its own countdown. Build each dish on the assembly plate from
the six ingredient bins on the counter (click a bin or press 1–6), then serve it with
Enter or the SERVE button before its ticket clock runs out. Serving a dish scores
100 points plus a bonus for the seconds still on its ticket, times a combo multiplier
for serves in a row. A ticket that expires costs a life; three lives a shift.

Five original dishes (Sunset Burger, Garden Melt, Green Plate, Sunny Stack, Golden
Double), a sizzling grill, a chef at the pass, a sunset window, and synthesised
WebAudio sound effects — no audio files. Title, pause and game-over screens, best
score kept between visits.

Play it: `python3 -m http.server 8080 --directory game`, then open http://localhost:8080. MIT licensed.
