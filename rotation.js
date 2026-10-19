// rotation.js — The Ghrazi Blood Knights rotation + fight state.
// No Alt1 calls in here, so it can be tested with plain Node (node tests.js).
//
// Sources: RuneScape Wiki "The Ghrazi Blood Knights/Strategies" (attack rotation,
// enrage table) + in-game observations by the plugin's author.

(function (root) {
  "use strict";

  const VASILY = "vasily";
  const KARMINA = "karmina";
  const other = (k) => (k === VASILY ? KARMINA : VASILY);

  // Special attacks. `calls` = the line the knight says in the chatbox.
  // Vasily's own specials only appear in chat for whoever tanks him; Karmina's
  // line in the same slot keeps the tracker in step for the other tank.
  const SPECIALS = {
    cross_cut: {
      label: "Rapid Attack",
      calls: { [VASILY]: "fall in line!", [KARMINA]: "suffer unto me!" },
    },
    blood_waves: {
      label: "Blood Waves",
      calls: { [VASILY]: "drown in blood!" },
    },
    blood_diamond: {
      label: "Blood Diamond",
      calls: { [VASILY]: "let the sanguine engulf you!" },
    },
    blood_bomb: {
      label: "Crimson Mark",
      calls: { [VASILY]: "bear the crimson mark!" },
    },
    mind_flail: {
      label: "Mind Flail",
      calls: { [VASILY]: "your mind betrays you!" },
    },
    arena_destruction: {
      label: "Floor Bomb",
      calls: { [VASILY]: "your blood becomes tribute!" },
    },
    sanguine_surge: {
      label: "Punctured Strike",
      calls: { [KARMINA]: "nowhere is beyond our reach!" },
    },
    sanguine_bleed: {
      label: "Blood Tribute",
      calls: { [KARMINA]: "your blood becomes tribute!" },
    },
  };

  // Lines that switch the phase (not part of a knight's cycle).
  // Phase 3 has no line: set it with the buttons in the app.
  const PHASE_CALLS = [
    ["praise the sanguine", 2],                       // both knights
    ["this world will belong to the sanguine!", 4],   // Vasily, heart destroyed
    ["we must persist!", 5],                          // both knights
  ];

  // Rotation per phase: a cycle of slots (the special each knight uses there).
  const P2 = [
    { vasily: "cross_cut", karmina: "cross_cut" },
    { vasily: "mind_flail", karmina: "sanguine_surge" },
    { vasily: "blood_waves", karmina: "sanguine_bleed" },
  ];
  const PHASES = {
    1: [
      { vasily: "cross_cut", karmina: "cross_cut" },
      { vasily: "blood_waves", karmina: "sanguine_surge" },
      { vasily: "blood_bomb", karmina: "sanguine_bleed" },
    ],
    2: P2,
    3: P2, // the knight that keeps fighting continues the phase-2 cycle
    4: [
      { vasily: "arena_destruction", karmina: "sanguine_bleed" },
      { vasily: "cross_cut", karmina: "cross_cut" },
      { vasily: "blood_waves", karmina: "sanguine_surge" },
      { vasily: "blood_bomb", karmina: "sanguine_bleed" },
      { vasily: "cross_cut", karmina: "cross_cut" },
      { vasily: "blood_waves", karmina: "sanguine_surge" },
    ],
    5: [
      { vasily: "arena_destruction", karmina: "sanguine_bleed" },
      { vasily: "cross_cut", karmina: "cross_cut" },
      { vasily: "blood_bomb", karmina: "sanguine_surge" },
      { vasily: "arena_destruction", karmina: "sanguine_bleed" },
      { vasily: "cross_cut", karmina: "cross_cut" },
      { vasily: "blood_waves", karmina: "sanguine_surge" },
    ],
  };
  const AUTOS = { 1: 4, 2: 4, 3: 4, 4: 4, 5: 3 };

  // Vasily specials that also land on Karmina's tank in the same slot.
  const HITS_BOTH = { blood_bomb: true, arena_destruction: true };

  // After phase 2 a Blood Waves can be replaced by a Blood Diamond.
  const sameSlot = (phase, expected, seen) =>
    expected === seen || (phase >= 3 && expected === "blood_waves" && seen === "blood_diamond");

  // Phase changes that carry the rotation over (wiki + in-game): 1→2, 2→3, 3→2
  // (heart timer ran out) and 4→5. Everything else starts at slot 1.
  const CARRIES = { "1>2": true, "2>3": true, "3>2": true, "4>5": true };

  class Fight {
    constructor() { this.reset(); }

    reset() {
      this.active = false;
      this.phase = 1;
      this.nextSlot = 0;                // index of the NEXT slot (0-based)
      this.p3 = { up: false, channeling: null };
      this.last = null;                 // { knight, slot, time }
    }

    start() { this.reset(); this.active = true; }

    setPhase(p, now) {
      if (p === this.phase) return;
      const n = PHASES[p].length;
      this.nextSlot = CARRIES[this.phase + ">" + p] ? this.nextSlot % n : 0;
      this.phase = p;
      if (p !== 3) this.p3 = { up: false, channeling: null };
    }

    // Phase 3 starts (button in the app). up = you were sent to the heart.
    startPhase3(up) {
      if (!this.active) this.start();
      this.setPhase(3);
      this.p3 = { up: !!up, channeling: null };
    }

    // Feed every recognised call. `now` = ms timestamp (for pairing calls).
    onCall(knight, text, now) {
      const t = String(text || "").trim().toLowerCase();
      for (const [call, p] of PHASE_CALLS) {
        if (t.includes(call)) {
          if (!this.active) this.start();
          this.setPhase(p);
          return "phase_" + p;
        }
      }
      for (const key of Object.keys(SPECIALS)) {
        for (const [k, call] of Object.entries(SPECIALS[key].calls)) {
          if (knight && knight !== k) continue;
          if (t !== call) continue;
          if (!this.active) this.start();
          // Phase 3 has no line of its own: the first special called below
          // shows who is still fighting, so the other one channels the heart.
          if (this.phase === 3 && !this.p3.channeling) this.p3.channeling = other(k);
          // Both knights use the special of a slot together: the second call
          // of the pair (within 4 s) must not move the tracker again.
          const slots = PHASES[this.phase];
          const prev = (this.nextSlot - 1 + slots.length) % slots.length;
          const paired = this.last && this.last.knight !== k && this.last.slot === prev &&
            now - this.last.time <= 4000 && sameSlot(this.phase, slots[prev][k], key);
          const idx = paired ? prev : this.resync(k, key);
          if (idx !== null) {
            this.nextSlot = (idx + 1) % slots.length;
            this.last = { knight: k, slot: idx, time: now };
          }
          // Floor Bomb only exists from phase 4: fallback trigger for phase 4.
          if (key === "arena_destruction" && this.phase < 4) {
            this.setPhase(4);
            this.nextSlot = 1;
            this.last = { knight: k, slot: 0, time: now };
          }
          return key;
        }
      }
      return null;
    }

    // Find the slot a seen special belongs to, searching forward from the
    // expected slot, so a missed line corrects itself.
    resync(k, key) {
      const slots = PHASES[this.phase];
      for (let i = 0; i < slots.length; i++) {
        const idx = (this.nextSlot + i) % slots.length;
        if (sameSlot(this.phase, slots[idx][k], key)) return idx;
      }
      return null;
    }

    // Knight whose rotation you see. null = nothing to show (you're at the heart).
    knightInFront(tanking) {
      if (this.phase === 3) {
        if (this.p3.up) return null;
        if (this.p3.channeling) return other(this.p3.channeling);
      }
      return tanking;
    }

    entry(k, idx) {
      const s = PHASES[this.phase][idx];
      const key = s[k];
      const ok = s[other(k)];
      const otherActive = !(this.phase === 3 && this.p3.channeling === other(k));
      const also = otherActive && ok !== key && HITS_BOTH[ok] ? ok : null;
      return {
        key,
        label: SPECIALS[key].label + (also ? " + " + SPECIALS[also].label : ""),
        isNext: idx === this.nextSlot,
      };
    }

    // The whole cycle of this phase for knight k, next step marked.
    cycle(k) {
      if (!k) return [];
      return PHASES[this.phase].map((_, i) => this.entry(k, i));
    }
  }

  const R = { VASILY, KARMINA, SPECIALS, PHASE_CALLS, PHASES, AUTOS, Fight };
  if (typeof module !== "undefined" && module.exports) module.exports = R;
  else root.GhraziRotation = R;
})(this);
