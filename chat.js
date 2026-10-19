// chat.js — turns a chatbox line into (knight, call).
// Format seen in game: "[18:42:38] Lord Vasily Ghrazi: This world will belong to the SANGUINE!"
//
// Alt1 reads the chat with text recognition, so lines can come in slightly off:
// a coloured name may be missing or garbled, "!" may become "l", spaces may
// shift. Matching is therefore done on a simplified form of the text.

(function (root) {
  "use strict";
  const R = (typeof module !== "undefined" && module.exports) ? require("./rotation.js") : root.GhraziRotation;

  // Same idea as Alt1's own line matching: drop punctuation/spaces and merge
  // characters that the text recognition often mixes up.
  function simp(s) {
    return String(s).toLowerCase()
      .replace(/<[^>]*>/g, "")
      .replace(/[\s\[\]\.'"`:;,_!?()-]/g, "")
      .replace(/[|1ij]/g, "l")
      .replace(/0/g, "o");
  }

  const NAMES = { [R.VASILY]: ["vasily", "vasil"], [R.KARMINA]: ["karmina", "karmin"] };
  function knightIn(prefix) {
    for (const [k, names] of Object.entries(NAMES)) if (names.some((n) => prefix.includes(simp(n)))) return k;
    return null;
  }

  // Every line we look for: [kind, call text (as in rotation.js), knight it belongs to or null]
  const PATTERNS = [];
  for (const sp of Object.values(R.SPECIALS)) for (const [k, c] of Object.entries(sp.calls)) PATTERNS.push(["special", c, k]);
  for (const [c] of R.PHASE_CALLS) PATTERNS.push(["phase", c, null]);
  PATTERNS.push(["start", "just give in. join us.", R.KARMINA]);

  // Returns { kind, knight, call } or null.
  //  kind: "special" | "phase" | "start"
  //  knight: who said it (null if the name could not be read)
  //  call: the canonical line, ready for Fight.onCall
  function match(line) {
    if (typeof line !== "string") return null;
    // drop the timestamp first, before simp() turns its 1s into ls
    const s = simp(line.replace(/^\s*\[?[\d:\s]*\]?\s*/, ""));
    let best = null;
    for (const [kind, call, owner] of PATTERNS) {
      const c = simp(call);
      const at = s.indexOf(c);
      if (at < 0) continue;
      if (best && c.length <= best.len) continue;        // prefer the longest match
      best = { kind, call, owner, len: c.length, prefix: s.slice(0, at) };
    }
    if (!best) return null;

    let knight = knightIn(best.prefix);
    // A readable name that is not a knight = a player typing the line: ignore.
    if (!knight && best.prefix.length > 3) return null;

    // "Your blood becomes tribute!" is said by both knights. Without a name, use
    // the casing: Vasily shouts it in capitals, Karmina does not.
    if (!knight && best.call === "your blood becomes tribute!") {
      const raw = line.replace(/^[^A-Za-z]*/, "");
      knight = raw.replace(/[^A-Za-z]/g, "") === raw.replace(/[^A-Za-z]/g, "").toUpperCase() ? R.VASILY : R.KARMINA;
    }
    if (best.kind === "special" && knight && best.owner !== knight) {
      // e.g. Karmina's "your blood becomes tribute!" matched Vasily's entry first
      const alt = PATTERNS.find(([kind, c, o]) => kind === "special" && o === knight && simp(c) === simp(best.call));
      if (!alt) return null;
    }
    if (best.kind === "start" && knight && knight !== R.KARMINA) return null;
    return { kind: best.kind, knight: knight || (best.kind === "special" ? best.owner : null), call: best.call };
  }

  // Back-compat helpers used by tests
  function parse(line) {
    const m = match(line);
    return m && m.kind !== "start" ? { knight: m.knight, text: m.call } : null;
  }
  function isKillStart(line) { const m = match(line); return !!m && m.kind === "start"; }

  const C = { match, parse, isKillStart, simp };
  if (typeof module !== "undefined" && module.exports) module.exports = C;
  else root.GhraziChat = C;
})(this);
