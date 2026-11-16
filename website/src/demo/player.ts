// "Watch Daedalus build an app": replays a recorded run (src/demo/recording.json) step by step.
// Everything shown is data from that recording; the player only decides when to reveal it.
import { appendLine, CANCELLED, Clock, formatDuration, lineDelays } from "./engine";
import { loadRecording } from "./terminal";

interface Mark extends Array<number> {}
interface Screen { id: string; title: string; html: string; marks: Mark[] }
interface Direction { id: string; name: string; seed: string; designMd: string; screens: Screen[] }
interface CodeFile { path: string; status: string; lines: string[] }
interface Brief {
  id: string; label: string; brief: string; designMd: string;
  tokens: { color: Record<string, string>; radius: Record<string, number>; space: Record<string, number>; font: Record<string, string> };
  directions: Direction[];
  code: Record<string, { stack: string; files: CodeFile[] }>;
}
interface Recording {
  briefs: Brief[];
  project: { check: { lines: { t: number; text: string }[]; durationMs: number; ok: boolean } } | null;
}
interface Shots { [k: string]: { label: string; light: string; dark: string; w: number; h: number } }

const STEPS = [
  ["Say what you want", "Pick a sample request or edit it. This is what you would type or say to Daedalus."],
  ["It learns your look", "Before drawing anything, Daedalus reads your brand notes and your colours, shapes and fonts."],
  ["Three ideas, you pick", "It draws three different directions at the same time. You keep the one you like."],
  ["Screens take shape", "The chosen design builds up on phone, tablet and desktop, with its loading, empty and error views. The code is written beside it."],
  ["It checks its own work", "Automatic checks run on the generated project. Green means safe to build on."],
  ["One idea, every device", "The same design reaches the website, the phone app and the desktop app."],
] as const;

const $ = <T extends HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function highlight(line: string): string {
  return esc(line).replace(
    /(\/\/.*$)|('[^']*'|&quot;[^&]*&quot;|`[^`]*`)|\b(import|from|export|const|function|return|interface|type|default|if|else|async|await)\b/g,
    (m, c, s, k) => (c ? `<i class="c">${m}</i>` : s ? `<i class="s">${m}</i>` : k ? `<i class="k">${m}</i>` : m),
  );
}

export function mountDemo(root: HTMLElement): void {
  const clock = new Clock();
  clock.instant = reduced();
  let rec: Recording;
  let shots: Shots = {};
  let briefIdx = 0;
  let dirId = "";
  let step = 0;
  let playing = false;
  let started = false;
  let pickResolve: (() => void) | null = null;

  const panels = [...root.querySelectorAll<HTMLElement>("[data-panel]")];
  const stepBtns = [...root.querySelectorAll<HTMLButtonElement>("[data-step]")];
  const playBtn = $<HTMLButtonElement>(root, '[data-act="play"]');
  const title = $(root, "#step-title");
  const help = $(root, "#step-help");
  const live = $(root, "#demo-live");
  const brief = $<HTMLTextAreaElement>(root, "#brief");
  const briefNote = $(root, "#brief-note");

  const cur = () => rec.briefs[briefIdx];
  const dir = () => cur().directions.find((d) => d.id === dirId) ?? cur().directions[0];

  // ---- frames: a page at its design width, scaled to fit the available space ----
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      const fit = e.target as HTMLElement;
      const w = Number(fit.dataset.w);
      const f = fit.firstElementChild as HTMLElement;
      f.style.transform = `scale(${fit.clientWidth / w})`;
    }
  });
  function frame(host: HTMLElement, w: number, h: number, label: string, cls = ""): HTMLIFrameElement {
    const fit = document.createElement("div");
    fit.className = `fit ${cls}`;
    fit.dataset.w = String(w);
    fit.style.aspectRatio = `${w} / ${h}`;
    const ifr = document.createElement("iframe");
    ifr.title = label;
    ifr.setAttribute("sandbox", "allow-same-origin");
    ifr.setAttribute("tabindex", "-1");
    ifr.style.width = `${w}px`;
    ifr.style.height = `${h}px`;
    fit.appendChild(ifr);
    host.appendChild(fit);
    ro.observe(fit);
    return ifr;
  }
  /** Streams the page into the iframe following the recorded checkpoints [ms, characters visible]. */
  async function stream(ifr: HTMLIFrameElement, s: Screen, factor: number, onProgress?: (p: number) => void) {
    const token = clock.token;
    const doc = ifr.contentDocument!;
    doc.open();
    if (clock.instant) {
      doc.write(s.html);
      doc.close();
      onProgress?.(1);
      return;
    }
    let shown = 0;
    let at = 0;
    for (const [t, len] of s.marks) {
      await clock.sleep(Math.max(0, (t - at) * factor));
      clock.alive(token);
      at = t;
      if (len > shown) {
        doc.write(s.html.slice(shown, len));
        shown = len;
        onProgress?.(shown / s.html.length);
      }
    }
    if (shown < s.html.length) doc.write(s.html.slice(shown));
    doc.close();
    onProgress?.(1);
  }
  const setState = (ifr: HTMLIFrameElement, state: string) => {
    ifr.contentDocument?.querySelectorAll<HTMLElement>("[data-state]").forEach((n) => (n.hidden = n.dataset.state !== state));
  };

  // ---- steps ----
  async function step0() {
    const text = brief.value;
    brief.value = "";
    brief.readOnly = true;
    for (let i = 0; i < text.length; i += 3) {
      brief.value = text.slice(0, i + 3);
      await clock.sleep(30);
    }
    brief.value = text;
    brief.readOnly = false;
  }

  async function step1() {
    const md = $(root, "#designmd");
    const tk = $(root, "#tokens");
    md.textContent = "";
    tk.textContent = "";
    const lines = cur().designMd.split("\n").slice(0, 34);
    const t = cur().tokens;
    const swatches: [string, string][] = Object.entries(t.color);
    const chips: string[] = [
      ...Object.entries(t.radius).map(([k, v]) => `radius ${k}: ${v}px`),
      ...Object.entries(t.font).map(([k, v]) => `${k} font: ${v}`),
    ];
    const mdTask = (async () => {
      const token = clock.token;
      for (const l of lines) {
        md.textContent += l + "\n";
        md.scrollTop = md.scrollHeight;
        await clock.sleep(55);
        clock.alive(token);
      }
    })();
    const tkTask = (async () => {
      const token = clock.token;
      for (const [name, hex] of swatches) {
        const d = document.createElement("div");
        d.className = "sw";
        d.innerHTML = `<i style="background:${esc(hex)}"></i><span>${esc(name)}<small>${esc(hex)}</small></span>`;
        tk.appendChild(d);
        await clock.sleep(110);
        clock.alive(token);
      }
      for (const c of chips) {
        const d = document.createElement("span");
        d.className = "tchip";
        d.textContent = c;
        tk.appendChild(d);
        await clock.sleep(70);
        clock.alive(token);
      }
    })();
    await Promise.all([mdTask, tkTask]);
  }

  async function step2() {
    const host = $(root, "#dirs");
    const hint = $(root, "#pick-hint");
    host.textContent = "";
    hint.hidden = true;
    const b = cur();
    const cards = b.directions.map((d) => {
      const card = document.createElement("article");
      card.className = "dir";
      card.innerHTML = `<header><i style="background:${esc(d.seed)}"></i><b>${esc(d.name)}</b><span class="status">Designing...</span></header>`;
      const ifr = frame(card, 1280, 800, `${d.name} direction, ${d.screens[0].title}`);
      const pick = document.createElement("button");
      pick.type = "button";
      pick.className = "btn";
      pick.textContent = `Choose ${d.name}`;
      pick.disabled = true;
      pick.addEventListener("click", () => {
        dirId = d.id;
        host.querySelectorAll(".dir").forEach((c) => c.classList.toggle("picked", c === card));
        pickResolve?.();
        pickResolve = null;
      });
      card.appendChild(pick);
      host.appendChild(card);
      return { d, card, ifr, pick };
    });
    await Promise.all(cards.map(async ({ d, card, ifr, pick }) => {
      await stream(ifr, d.screens[0], 1);
      $(card, ".status").textContent = "Ready";
      pick.disabled = false;
    }));
    if (dirId) {
      host.querySelectorAll(".dir").forEach((c, i) => c.classList.toggle("picked", b.directions[i].id === dirId));
      if (!clock.instant) await clock.sleep(900);
      return;
    }
    hint.hidden = false;
    live.textContent = "Three directions are ready. Choose one to continue.";
    cards[0].pick.focus({ preventScroll: true });
    if (clock.instant) return; // finished state is visible; Next continues
    await new Promise<void>((res) => (pickResolve = res));
    hint.hidden = true;
  }

  function codeFor(stack: string): CodeFile | undefined {
    return cur().code[`${dir().id}:${stack}`]?.files[0];
  }
  async function step3() {
    const dev = $(root, "#devices");
    const bar = $(root, "#state-bar");
    const tabs = $(root, ".code-tabs");
    const codeEl = $(root, "#code code");
    const pathEl = $(root, "#code-path");
    dev.textContent = "";
    bar.textContent = "";
    tabs.textContent = "";
    codeEl.textContent = "";
    const s = dir().screens[0];
    const desktop = frame(dev, 1280, 800, "Desktop layout", "f-desktop");
    const row = document.createElement("div");
    row.className = "dev-row";
    dev.appendChild(row);
    const tablet = frame(row, 768, 1024, "Tablet layout", "f-tablet");
    const phone = frame(row, 390, 844, "Phone layout", "f-phone");
    const frames = [desktop, tablet, phone];
    const phase = document.createElement("p");
    phase.className = "phase";
    dev.prepend(phase);

    const hasStates = /data-state="loading"/.test(s.html);
    const states = ["ready", "loading", "empty", "error"];
    if (hasStates) {
      for (const st of states) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip";
        btn.textContent = st[0].toUpperCase() + st.slice(1);
        btn.setAttribute("aria-pressed", String(st === "ready"));
        btn.addEventListener("click", () => {
          frames.forEach((f) => setState(f, st));
          bar.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
        });
        bar.appendChild(btn);
      }
    }

    const tabBtns: HTMLButtonElement[] = [];
    const stacks: [string, string][] = [["web-spa", "Website code"], ["mobile-rn", "Phone app code"]];
    const show = (i: number) => tabBtns.forEach((b, j) => b.setAttribute("aria-selected", String(i === j)));
    stacks.forEach(([, label], i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.role = "tab";
      b.textContent = label;
      b.addEventListener("click", () => {
        const f = codeFor(stacks[i][0]);
        if (!f) return;
        show(i);
        pathEl.textContent = f.path;
        codeEl.innerHTML = f.lines.map((l, n) => `<span class="ln">${n + 1}</span>${highlight(l)}`).join("\n");
      });
      tabs.appendChild(b);
      tabBtns.push(b);
    });

    const draw = (async () => {
      phase.textContent = "Building: layout";
      await Promise.all(frames.map((f, i) => stream(f, s, 0.55, i === 0 ? (p) => {
        phase.textContent = p < 0.45 ? "Building: layout" : p < 1 ? "Building: content" : "Content ready";
      } : undefined)));
      if (hasStates) {
        const token = clock.token;
        phase.textContent = "Building: loading, empty and error views";
        for (const [i, st] of states.slice(1).entries()) {
          frames.forEach((f) => setState(f, st));
          bar.querySelectorAll("button").forEach((x, j) => x.setAttribute("aria-pressed", String(j === i + 1)));
          await clock.sleep(1100);
          clock.alive(token);
        }
        frames.forEach((f) => setState(f, "ready"));
        bar.querySelectorAll("button").forEach((x, j) => x.setAttribute("aria-pressed", String(j === 0)));
      }
      phase.textContent = "Done: the screen and its states";
    })();

    const write = (async () => {
      const token = clock.token;
      await clock.sleep(700);
      clock.alive(token);
      for (const [i, [stack]] of stacks.entries()) {
        const f = codeFor(stack);
        if (!f) continue;
        show(i);
        pathEl.textContent = f.path;
        codeEl.textContent = "";
        const out: string[] = [];
        for (const [n, l] of f.lines.entries()) {
          out.push(`<span class="ln">${n + 1}</span>${highlight(l)}`);
          codeEl.innerHTML = out.join("\n");
          codeEl.parentElement!.scrollTop = codeEl.parentElement!.scrollHeight;
          await clock.sleep(38);
          clock.alive(token);
        }
        await clock.sleep(500);
      }
      tabBtns[0].click();
    })();
    await Promise.all([draw, write]);
  }

  // Each item turns green when the recorded output contains its pass line.
  const CHECKS: [string, RegExp][] = [
    ["Clients and themes generated for every app", /^Synced\./],
    ["Parts only touch what they may touch", /^Boundaries ok/],
    ["Only the approved toolchain is used", /^Deno-only ok/],
    ["Dependencies scanned for known problems", /\[packages\/api_ts\] deno task typecheck/],
    ["Server: 18 tests pass", /18 passed \| 0 failed/],
    ["Web app: tests pass and it builds", /built in/],
    ["Phone app: 18 tests pass", /Tests:\s+18 passed/],
    ["Everything together", /All checks passed\./],
  ];
  async function step4() {
    const list = $(root, "#checklist");
    const log = $(root, "#check-log");
    const note = $(root, "#check-note");
    list.textContent = "";
    log.textContent = "";
    const items = CHECKS.map(([label]) => {
      const li = document.createElement("li");
      li.innerHTML = `<i aria-hidden="true"></i><span>${esc(label)}</span><em>waiting</em>`;
      list.appendChild(li);
      return li;
    });
    const p = rec.project;
    if (!p) return void (note.textContent = "No recording of the check is available.");
    const lines = p.check.lines;
    const delays = lineDelays(lines, 140, 0.05);
    const done = new Set<number>();
    const token = clock.token;
    for (let i = 0; i < lines.length; i++) {
      await clock.sleep(delays[i]);
      clock.alive(token);
      appendLine(log, lines[i].text);
      CHECKS.forEach(([, re], k) => {
        if (!done.has(k) && re.test(lines[i].text)) {
          done.add(k);
          items[k].classList.add("ok");
          $(items[k], "em").textContent = "passed";
        }
      });
    }
    note.textContent = `Recorded output of a real "deno task check" on a generated project (${formatDuration(p.check.durationMs)}, ${
      p.check.ok ? "all passed" : "see the log"
    }). Waits between lines are shortened.`;
  }

  async function step5() {
    const host = $(root, "#every");
    host.textContent = "";
    root.querySelectorAll(".real").forEach((n) => n.remove());
    const s = dir().screens[0];
    const mk = (cls: string, label: string, w: number, h: number) => {
      const fig = document.createElement("figure");
      fig.className = `target-fig ${cls}`;
      const chrome = document.createElement("div");
      chrome.className = "chrome";
      chrome.innerHTML = cls === "t-phone" ? `<span class="notch"></span>` : `<i></i><i></i><i></i>`;
      fig.appendChild(chrome);
      const ifr = frame(fig, w, h, `${label} version`, "");
      const cap = document.createElement("figcaption");
      cap.textContent = label;
      fig.appendChild(cap);
      host.appendChild(fig);
      return ifr;
    };
    const a = mk("t-web", "Website or web app", 1280, 800);
    const b = mk("t-phone", "Phone app", 390, 844);
    const c = mk("t-desk", "Desktop app", 1100, 720);
    await Promise.all([a, b, c].map((f, i) => stream(f, s, 0.25 + i * 0.05)));
    $(root, "#every-note").innerHTML = "These are the recorded design shown at three sizes. The generated starter apps look like this: ";
    const row = document.createElement("div");
    row.className = "real";
    for (const [k, v] of Object.entries(shots)) {
      const f = document.createElement("figure");
      f.innerHTML = `<img class="only-light" src="${v.light}" width="${v.w}" height="${v.h}" loading="lazy" alt="${esc(v.label)}"><img class="only-dark" src="${v.dark}" width="${v.w}" height="${v.h}" loading="lazy" alt="${esc(v.label)}"><figcaption>${esc(v.label)}</figcaption>`;
      row.appendChild(f);
      void k;
    }
    $(root, "#every-note").after(row);
  }

  const runners = [step0, step1, step2, step3, step4, step5];

  // ---- control ----
  function setPlayLabel() {
    playBtn.textContent = !started ? "Start" : playing ? (clock.paused ? "Resume" : "Pause") : "Watch again";
  }
  function show(i: number) {
    step = i;
    panels.forEach((p, j) => (p.hidden = j !== i));
    stepBtns.forEach((b, j) => {
      b.toggleAttribute("aria-current", j === i);
      if (j === i) b.setAttribute("aria-current", "step");
      b.classList.toggle("done", j < i);
    });
    title.textContent = `${i + 1}. ${STEPS[i][0]}`;
    help.textContent = STEPS[i][1];
    live.textContent = `Step ${i + 1} of 6: ${STEPS[i][0]}`;
  }
  async function go(i: number) {
    clock.cancel();
    pickResolve = null;
    started = true;
    clock.paused = false;
    i = Math.max(0, Math.min(5, i));
    show(i);
    setPlayLabel();
    const token = clock.token;
    try {
      await runners[i]();
      clock.alive(token);
      if (clock.instant) return setPlayLabel();
      if (i < 5 && playing) {
        await clock.sleep(1400);
        clock.alive(token);
        return void go(i + 1);
      }
      playing = false;
      setPlayLabel();
    } catch (e) {
      if (e !== CANCELLED) throw e;
    }
  }

  playBtn.addEventListener("click", () => {
    if (!started || (!playing && step >= 5)) {
      playing = true;
      void go(0);
    } else if (!playing) {
      playing = true;
      void go(step);
    } else {
      clock.paused = !clock.paused;
      setPlayLabel();
    }
  });
  $(root, '[data-act="next"]').addEventListener("click", () => ((playing = !clock.instant), void go(step + 1)));
  $(root, '[data-act="prev"]').addEventListener("click", () => ((playing = !clock.instant), void go(step - 1)));
  $(root, '[data-act="restart"]').addEventListener("click", () => ((playing = true), void go(0)));
  $<HTMLSelectElement>(root, '[data-act="speed"]').addEventListener("change", (e) => (clock.speed = Number((e.target as HTMLSelectElement).value)));
  stepBtns.forEach((b, i) => b.addEventListener("click", () => ((playing = !clock.instant), void go(i))));
  root.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement;
    if (/^(TEXTAREA|INPUT|SELECT|BUTTON)$/.test(t.tagName)) return;
    if (e.key === " " || e.key === "k") { e.preventDefault(); playBtn.click(); }
    else if (e.key === "ArrowRight") $<HTMLButtonElement>(root, '[data-act="next"]').click();
    else if (e.key === "ArrowLeft") $<HTMLButtonElement>(root, '[data-act="prev"]').click();
    else if (e.key.toLowerCase() === "r") $<HTMLButtonElement>(root, '[data-act="restart"]').click();
  });

  // ---- samples ----
  function renderBriefs() {
    const host = $(root, "#briefs");
    host.textContent = "";
    rec.briefs.forEach((b, i) => {
      const c = document.createElement("button");
      c.type = "button";
      c.role = "radio";
      c.className = "chip";
      c.textContent = b.label;
      c.setAttribute("aria-checked", String(i === briefIdx));
      c.addEventListener("click", () => {
        briefIdx = i;
        dirId = "";
        brief.value = b.brief;
        briefNote.textContent = "";
        host.querySelectorAll("button").forEach((x, j) => x.setAttribute("aria-checked", String(j === i)));
      });
      host.appendChild(c);
    });
    brief.value = cur().brief;
    brief.addEventListener("input", () => {
      briefNote.textContent = brief.value !== cur().brief
        ? "Edited text is not sent anywhere. This replay always shows the recorded run for the sample you picked. To use your own words, run daedalus studio."
        : "";
    });
  }

  (async () => {
    rec = (await loadRecording(root.dataset.url!)) as unknown as Recording;
    try { shots = JSON.parse(root.dataset.shots ?? "{}"); } catch { shots = {}; }
    renderBriefs();
    show(0);
    setPlayLabel();
    if (clock.instant) {
      help.textContent += " Animations are off (reduced motion): each step shows its finished result. Use Next to move on.";
    }
  })();
}
