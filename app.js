// app.js — Alt1 glue + UI. Reads the RuneScape chatbox, feeds rotation.js,
// and shows the rotation of the knight you tank with the current step marked.
(function () {
  "use strict";
  const R = window.GhraziRotation;
  const C = window.GhraziChat;
  const $ = (id) => document.getElementById(id);

  // ---- settings (per viewer, browser storage may be unavailable) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("ghrazi." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("ghrazi." + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };
  const settings = { tanking: store.get("tanking", R.KARMINA) };

  const fight = new R.Fight();

  // ---- handling one chat line (from Alt1 or the test box) ------------------
  const seen = [];                       // recent lines, so a re-read line counts once
  function handleLine(raw) {
    const line = String(raw || "").trim();
    if (!line) return;
    if (seen.includes(line)) return;
    seen.push(line); if (seen.length > 80) seen.shift();

    if (C.isKillStart(line)) { fight.start(); render(); return; }
    const p = C.parse(line);
    if (!p) return;
    if (fight.onCall(p.knight, p.text, Date.now())) render();
  }

  // ---- UI -------------------------------------------------------------------
  const NAMES = { vasily: "Lord Vasily", karmina: "Lady Karmina" };

  function render() {
    $("phase").textContent = fight.active ? "Phase " + fight.phase : "Waiting for the fight";
    document.querySelectorAll("[data-tank]").forEach((b) => b.classList.toggle("on", b.dataset.tank === settings.tanking));
    document.querySelectorAll("[data-phase]").forEach((b) => b.classList.toggle("on", fight.active && +b.dataset.phase === fight.phase));
    $("p3").hidden = !(fight.active && fight.phase === 3);

    const list = $("rotation");
    list.innerHTML = "";
    if (!fight.active) return;

    const k = fight.knightInFront(settings.tanking);
    if (!k) { $("who").textContent = "At the Sanguine heart"; return; }
    $("who").textContent = (fight.phase === 3 && fight.p3.channeling ? "Below, fighting " : "Tanking ") + NAMES[k];

    for (const e of fight.cycle(k)) {
      const li = document.createElement("li");
      li.className = e.isNext ? "next" : "";
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = e.label;
      li.appendChild(name);
      list.appendChild(li);
    }
  }

  function wire() {
    document.querySelectorAll("[data-tank]").forEach((b) => b.addEventListener("click", () => {
      settings.tanking = b.dataset.tank; store.set("tanking", settings.tanking); render();
    }));
    document.querySelectorAll("[data-phase]").forEach((b) => b.addEventListener("click", () => {
      const p = +b.dataset.phase;
      if (!fight.active) fight.start();
      if (p === 3) fight.startPhase3(false); else fight.setPhase(p);
      render();
    }));
    $("up").addEventListener("click", () => { fight.startPhase3(true); render(); });
    $("below").addEventListener("click", () => { fight.startPhase3(false); render(); });
    $("reset").addEventListener("click", () => { fight.reset(); render(); });
    $("testsend").addEventListener("click", () => {
      $("testinput").value.split("\n").forEach(handleLine);
      $("testinput").value = "";
    });
  }

  // ---- Alt1: read the chatbox every game tick --------------------------------
  function status(text, bad) { const s = $("status"); s.textContent = text; s.classList.toggle("bad", !!bad); }

  function startAlt1() {
    if (!window.alt1) {
      status("Not running in Alt1: use the test box below, or open this page via the Alt1 link.", true);
      return;
    }
    if (window.A1lib && A1lib.identifyApp) A1lib.identifyApp("appconfig.json");
    if (!alt1.permissionPixel) { status("Alt1 needs the 'view screen' permission for this app (app settings).", true); return; }

    const Reader = window.Chatbox && (window.Chatbox.default || window.Chatbox);
    if (typeof Reader !== "function") {
      status("Alt1 library did not load: " + (window.__alt1LibError || "chatbox") + " (check your internet / see README).", true);
      return;
    }

    const reader = new Reader();
    let found = false;
    setInterval(() => {
      try {
        if (!found) {
          found = !!reader.find();
          status(found ? "Reading chatbox" : "Looking for the chatbox… (timestamps on, chat visible)", !found);
          if (!found) return;
        }
        const lines = reader.read();
        if (lines === null) { found = false; return; }   // chatbox moved or hidden
        for (const l of lines || []) handleLine(l.text);
      } catch (e) {
        status("Reader error: " + e.message, true);
      }
    }, 600);
  }

  wire();
  render();
  startAlt1();
})();
