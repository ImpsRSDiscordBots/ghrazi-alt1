// tests.js — run with: node tests.js
const R = require("./rotation.js");
const C = require("./chat.js");

let pass = 0, fail = 0;
function eq(got, want, what) {
  if (got === want) pass++;
  else { fail++; console.log(`FAIL ${what}: got ${got}, want ${want}`); }
}
const nextKey = (f, k) => f.cycle(k).find((e) => e.isNext).key;
const nextLabel = (f, k) => f.cycle(k).find((e) => e.isNext).label;

// Feed real chat lines; seconds are taken from the timestamp
function feed(f, lines) {
  for (const line of lines) {
    const m = line.match(/\[(\d+):(\d+):(\d+)\]/);
    const now = m ? ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * 1000 : 0;
    if (C.isKillStart(line)) { f.start(); continue; }
    const p = C.parse(line);
    if (p) f.onCall(p.knight, p.text, now);
  }
}

// Phase 1, real log (Vasily's own specials are not in chat for Karmina's tank)
let f = new R.Fight();
feed(f, [
  "[18:38:40] Lady Karmina Ghrazi: Just give in. Join us.",
  "[18:38:40] You can only throw this bomb up to 10 tiles away!",
  "[18:38:50] Lord Vasily Ghrazi: FALL IN LINE!",
  "[18:39:05] Lady Karmina Ghrazi: Nowhere is beyond our reach!",
  "[18:39:19] Lady Karmina Ghrazi: Your blood becomes tribute!",
]);
eq(f.active, true, "kill started");
eq(f.phase, 1, "P1");
eq(nextKey(f, R.KARMINA), "cross_cut", "after full P1 cycle: Rapid Attack (K)");
eq(nextKey(f, R.VASILY), "cross_cut", "after full P1 cycle: Rapid Attack (V)");

// Both knights in the same second count as one step
f = new R.Fight();
feed(f, ["[10:00:00] Lord Vasily Ghrazi: FALL IN LINE!", "[10:00:00] Lady Karmina Ghrazi: SUFFER UNTO ME!"]);
eq(nextKey(f, R.KARMINA), "sanguine_surge", "pair counts once");

// P1 -> P2 continues (wiki example: Cross Cut -> Mind Flail)
feed(f, ["[18:39:50] Lady Karmina Ghrazi: PRAISE THE SANGUINE", "[18:39:50] Lord Vasily Ghrazi: PRAISE THE SANGUINE!"]);
eq(f.phase, 2, "P2 from real lines");
eq(nextKey(f, R.VASILY), "mind_flail", "P2 continues after Cross Cut");

// Phase 3 (button), first call below decides who channels
f.startPhase3(false);
eq(f.knightInFront(R.VASILY), R.VASILY, "P3 before first call: own tank");
feed(f, ["[18:41:20] Lady Karmina Ghrazi: Nowhere is beyond our reach!"]);
eq(f.p3.channeling, R.VASILY, "Karmina calls -> Vasily channels");
eq(f.knightInFront(R.VASILY), R.KARMINA, "below shows the active knight");
eq(nextKey(f, R.KARMINA), "sanguine_bleed", "P3 continues P2 rotation");
const g = new R.Fight(); g.startPhase3(true);
eq(g.knightInFront(R.KARMINA), null, "at the heart: nothing shown");

// P3 -> P4 via Vasily's line, starts with Floor Bomb + Blood Tribute
feed(f, [
  "[18:42:19] The Sanguine: SKLORCH! SKLORCH!",
  "[18:42:38] Lord Vasily Ghrazi: This world will belong to the SANGUINE!",
]);
eq(f.phase, 4, "P4 from Vasily's line");
eq(nextLabel(f, R.KARMINA), "Blood Tribute + Floor Bomb", "P4 opens with blood + tiles");
eq(nextLabel(f, R.VASILY), "Floor Bomb", "P4 opens with Floor Bomb (V tank)");

// Real log through phase 4 into phase 5
feed(f, [
  "[18:43:13] You can't throw bombs that quickly.",
  "[18:43:21] Lady Karmina Ghrazi: Nowhere is beyond our reach!",
  "[18:43:35] Lady Karmina Ghrazi: Your blood becomes tribute!",
  "[18:43:50] Lord Vasily Ghrazi: FALL IN LINE!",
  "[18:44:00] Lady Karmina Ghrazi: Nowhere is beyond our reach!",
  "[18:44:10] Lady Karmina Ghrazi: We must PERSIST!",
  "[18:44:10] Lord Vasily Ghrazi: We must PERSIST!",
]);
eq(f.phase, 5, "P5 from real lines");
eq(nextLabel(f, R.KARMINA), "Blood Tribute + Floor Bomb", "P5 opens with Blood Tribute");

// Same text from both knights is told apart by the name
f = new R.Fight(); f.start(); f.setPhase(4);
feed(f, ["[10:00:00] Lord Vasily Ghrazi: YOUR BLOOD BECOMES TRIBUTE!", "[10:00:00] Lady Karmina Ghrazi: Your blood becomes tribute!"]);
eq(nextKey(f, R.KARMINA), "cross_cut", "Floor Bomb + Blood Tribute are one step");

// Combos for Karmina's tank
f = new R.Fight(); f.start(); f.nextSlot = 2;
eq(nextLabel(f, R.KARMINA), "Blood Tribute + Crimson Mark", "P1 blood + meatball");
eq(nextLabel(f, R.VASILY), "Crimson Mark", "Vasily tank: just the meatball");

// Blood Diamond replaces Blood Waves after phase 2
f = new R.Fight(); f.start(); f.setPhase(2); f.startPhase3(false); f.nextSlot = 2;
f.onCall(R.VASILY, "LET THE SANGUINE ENGULF YOU!", 0);
eq(f.nextSlot, 0, "Blood Diamond counts as Blood Waves");

// Missed lines resync
f = new R.Fight(); f.start(); f.setPhase(4);
f.onCall(R.VASILY, "BEAR THE CRIMSON MARK!", 0);
eq(f.nextSlot, 4, "resync after missed calls");

// Chat parsing
eq(C.parse("[18:11:00] SomePlayer: PRAISE THE SANGUINE"), null, "players are ignored");
eq(C.parse("[18:42:38] Lord Vasily Ghrazi: This world will belong to the SANGUINE!").knight, R.VASILY, "real format");
eq(C.parse("<col=ff0000>Lady Karmina Ghrazi</col>: Nowhere is beyond our reach!").knight, R.KARMINA, "colour tags");
eq(C.parse("[18:43:13] You can't throw bombs that quickly."), null, "game messages ignored");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
