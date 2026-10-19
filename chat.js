// chat.js — turns a chatbox line into (knight, text).
// Format seen in game: "[18:42:38] Lord Vasily Ghrazi: This world will belong to the SANGUINE!"
// Chat timestamps must be ON in RuneScape: they make every line unique, so a
// line that the reader sees twice is only handled once.

(function (root) {
  "use strict";
  const R = (typeof module !== "undefined" && module.exports) ? require("./rotation.js") : root.GhraziRotation;

  function strip(s) {
    return String(s)
      .replace(/<[^>]*>/g, "")              // markup
      .replace(/^\s*\[[\d:]+\]\s*/, "")      // [hh:mm:ss]
      .trim();
  }

  function knightFromName(name) {
    const n = name.toLowerCase();
    if (n.includes("vasily")) return R.VASILY;
    if (n.includes("karmina")) return R.KARMINA;
    return null;
  }

  const KNOWN = new Set();
  for (const sp of Object.values(R.SPECIALS)) for (const c of Object.values(sp.calls)) KNOWN.add(c);

  // Returns { knight, text } for a knight's known line, else null.
  function parse(line) {
    if (typeof line !== "string") return null;
    const s = strip(line);
    const m = s.match(/^([^:]{1,40}):\s*(.+)$/);
    if (!m) return null;                                  // knights' lines always have a name
    const knight = knightFromName(m[1]);
    if (!knight) return null;                             // players, game messages, the heart
    const text = m[2].trim();
    const t = text.toLowerCase();
    const known = KNOWN.has(t) || R.PHASE_CALLS.some(([c]) => t.includes(c));
    return known ? { knight, text } : null;
  }

  // Karmina's opening line when a player walks up to the knights.
  function isKillStart(line) {
    const s = strip(line);
    const m = s.match(/^([^:]{1,40}):\s*(.+)$/);
    return !!m && knightFromName(m[1]) === R.KARMINA && m[2].trim().toLowerCase() === "just give in. join us.";
  }

  const C = { parse, isKillStart, strip };
  if (typeof module !== "undefined" && module.exports) module.exports = C;
  else root.GhraziChat = C;
})(this);
