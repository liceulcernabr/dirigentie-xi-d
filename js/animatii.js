/* =====================================================================
   ANIMAȚII – Dirigenția XI D
   Rulează după scriptul principal al paginii. Nu schimbă textele și nu
   umblă la funcționalități: doar adaugă mișcare. Dacă fișierul lipsește,
   pagina funcționează exact ca înainte.
   ===================================================================== */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canObserve = "IntersectionObserver" in window && !reduce;
  const ease = "cubic-bezier(.2, .8, .2, 1)";

  /* ---------- BANDA cu următoarele teme (doar date din pagină) ---------- */
  function buildTicker() {
    if (typeof DATA === "undefined" || !DATA.module) return;
    const all = [];
    DATA.module.forEach(m => m.teme.forEach(t => all.push(t)));
    const parse = s => { const [d, m, y] = s.split(".").map(Number); return new Date(y, m - 1, d); };

    // pornește de la prima notificare din hero (ține cont și de ?azi=...)
    const first = $(".notif[data-open]");
    let start = first ? all.findIndex(t => t.nr === +first.dataset.open) : -1;
    if (start < 0) {
      const z = new Date(); z.setHours(0, 0, 0, 0);
      start = all.findIndex(t => parse(t.data) >= z);
    }
    if (start < 0) return;
    const list = all.slice(start, start + 5);
    if (list.length < 2) return;

    const fmt = d => d.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" });
    const makeList = copy => {
      const ul = document.createElement("ul");
      ul.className = "ticker-list";
      if (copy) ul.setAttribute("aria-hidden", "true");
      list.forEach(t => {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ticker-item";
        b.dataset.open = t.nr;
        b.style.setProperty("--c", "var(--" + t.domeniu + ")");
        if (copy) b.tabIndex = -1;
        const d = document.createElement("span");
        d.className = "d";
        d.textContent = "📅 " + fmt(parse(t.data));
        const e = document.createElement("span");
        e.setAttribute("aria-hidden", "true");
        e.textContent = t.emoji;
        const ti = document.createElement("b");
        ti.textContent = t.titlu;
        b.append(d, e, ti);
        li.append(b);
        ul.append(li);
      });
      return ul;
    };

    const box = document.createElement("div");
    box.className = "ticker";
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", "Următoarele teme");
    const track = document.createElement("div");
    track.className = "ticker-track";
    track.append(makeList(false), makeList(true));
    box.append(track);
    const hero = $(".hero");
    if (hero) hero.after(box);

    // viteză constantă (~45 px/s), indiferent de lungimea titlurilor
    const half = track.scrollWidth / 2;
    if (half) track.style.setProperty("--t-dur", Math.max(20, half / 45) + "s");
  }

  /* ---------- apariție eșalonată la scroll ---------- */
  // Elementele de sub ecran primesc .a-hide; când intră în ecran apar pe rând.
  function staggerIn(els, step = 70, max = 420) {
    if (!canObserve) return;
    const vh = window.innerHeight;
    const todo = els.filter(el => !el.hidden && el.getBoundingClientRect().top > vh - 20);
    if (!todo.length) return;
    todo.forEach(el => el.classList.add("a-hide"));
    const io = new IntersectionObserver(entries => {
      entries.filter(en => en.isIntersecting)
        .map(en => en.target)
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1)
        .forEach((el, i) => {
          io.unobserve(el);
          const delay = Math.min(i * step, max);
          el.classList.add("a-show");
          el.style.transitionDelay = delay + "ms";
          requestAnimationFrame(() => el.classList.remove("a-hide"));
          setTimeout(() => { el.classList.remove("a-show"); el.style.transitionDelay = ""; }, delay + 650);
        });
    }, { threshold: .1, rootMargin: "0px 0px -30px 0px" });
    todo.forEach(el => io.observe(el));
  }

  /* ---------- harta anului: punctele apar de la stânga la dreapta ---------- */
  function animateDots() {
    if (!canObserve || !Element.prototype.animate) return;
    const card = $(".tl-card");
    if (!card) return;
    const io = new IntersectionObserver(entries => {
      if (!entries.some(en => en.isIntersecting)) return;
      io.disconnect();
      $$(".tl-dot", card).forEach((dot, i) => {
        dot.animate([
          { opacity: 0, transform: "translate(-50%, -50%) scale(0)" },
          { opacity: 1, transform: "translate(-50%, -50%) scale(1)" }
        ], { duration: 400, delay: 150 + i * 22, easing: "cubic-bezier(.2, .9, .3, 1.3)", fill: "backwards" });
      });
    }, { threshold: .12, rootMargin: "0px 0px -40px 0px" });
    io.observe(card);
  }

  /* ---------- progres: numărul din inel crește animat ---------- */
  function countRing() {
    const num = $("#ringNum"), card = $(".ring-card");
    if (!canObserve || !num || !card) return;
    const io = new IntersectionObserver(entries => {
      if (!entries.some(en => en.isIntersecting)) return;
      io.disconnect();
      const target = parseInt(num.textContent, 10);
      if (!(target > 0)) return;
      const t0 = performance.now(), dur = 600;
      const step = t => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        num.textContent = Math.round(e * target);
        if (p < 1) requestAnimationFrame(step); else num.textContent = target;
      };
      num.textContent = "0";
      requestAnimationFrame(step);
    }, { threshold: .12, rootMargin: "0px 0px -40px 0px" });
    io.observe(card);
  }

  /* ---------- după filtrare, cardurile rămase apar din nou ---------- */
  function refilterPop() {
    if (reduce || !Element.prototype.animate) return;
    const grid = $("#grid");
    if (!grid) return;
    let timer = null;
    const pop = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const vh = window.innerHeight;
        $$(".card", grid)
          .filter(c => !c.hidden && !c.classList.contains("a-hide"))
          .filter(c => { const r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < vh; })
          .slice(0, 12)
          .forEach((c, i) => c.animate([
            { opacity: 0, transform: "translateY(14px) scale(.98)" },
            { opacity: 1, transform: "none" }
          ], { duration: 350, delay: i * 35, easing: ease, fill: "backwards" }));
      }, 60);
    };
    const chips = $("#chips"), q = $("#q"), mod = $("#modSel"), reset = $("#resetF");
    if (chips) chips.addEventListener("click", e => { if (e.target.closest(".chip")) pop(); });
    if (q) q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(pop, 220); });
    if (mod) mod.addEventListener("change", pop);
    if (reset) reset.addEventListener("click", pop);
    $$(".views button").forEach(b => b.addEventListener("click", pop));
  }

  /* ---------- buton „înapoi sus” ---------- */
  function toTop() {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "to-top";
    b.setAttribute("aria-label", "Înapoi sus");
    b.title = "Înapoi sus";
    b.innerHTML = '<span aria-hidden="true">↑</span>';
    document.body.append(b);
    let on = false;
    const check = () => {
      const show = window.scrollY > window.innerHeight * .8;
      if (show !== on) { on = show; b.classList.toggle("on", show); }
    };
    window.addEventListener("scroll", check, { passive: true });
    check();
    b.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      const brand = $(".brand");
      if (brand) brand.focus({ preventScroll: true });
    });
  }

  /* ---------- siguranță: dacă scriptul principal nu a afișat secțiunile ---------- */
  function safetyReveal() {
    const hidden = $$(".reveal:not(.in)");
    if (!hidden.length) return;
    if (!canObserve) { hidden.forEach(el => el.classList.add("in")); return; }
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }), { threshold: .12 });
    hidden.forEach(el => io.observe(el));
  }

  function init() {
    try { buildTicker(); } catch (e) { /* banda e opțională */ }
    staggerIn($$("#grid .card"));
    staggerIn($$(".res .res-card"), 80);
    staggerIn($$("footer .wrap"));
    animateDots();
    countRing();
    refilterPop();
    toTop();
    safetyReveal();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
