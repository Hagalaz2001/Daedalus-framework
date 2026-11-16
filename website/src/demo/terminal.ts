// Animated terminal replay of the recorded `daedalus new` run (or the recorded check). Starts when scrolled into view.
import { appendLine, CANCELLED, Clock, formatDuration, lineDelays } from "./engine";

interface Recorded {
  project: {
    command: string;
    create: { lines: { t: number; text: string }[]; durationMs: number };
    checkCommand: string;
    check: { lines: { t: number; text: string }[]; durationMs: number };
  } | null;
}

let cached: Promise<Recorded> | null = null;
export const loadRecording = (url: string): Promise<Recorded> => (cached ??= fetch(url).then((r) => r.json()));

export function mountTerminal(root: HTMLElement): void {
  const which = (root.dataset.source ?? "create") as "create" | "check";
  const body = root.querySelector<HTMLElement>(".term-body")!;
  const play = root.querySelector<HTMLButtonElement>("[data-play]")!;
  const restart = root.querySelector<HTMLButtonElement>("[data-restart]")!;
  const speed = root.querySelector<HTMLSelectElement>("[data-speed]")!;
  const note = root.querySelector<HTMLElement>("[data-note]")!;
  const clock = new Clock();
  clock.instant = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lines: { t: number; text: string }[] = [];
  let command = "";
  let started = false;
  let finished = false;

  async function run() {
    clock.cancel();
    const token = clock.token;
    body.textContent = "";
    finished = false;
    appendLine(body, `$ ${command}`);
    const delays = lineDelays(lines, which === "create" ? 220 : 160, 0.06);
    try {
      for (let i = 0; i < lines.length; i++) {
        await clock.sleep(delays[i]);
        clock.alive(token);
        appendLine(body, lines[i].text);
      }
      finished = true;
      play.textContent = "Replay";
      play.setAttribute("aria-label", "Replay the terminal");
    } catch (e) {
      if (e !== CANCELLED) throw e;
    }
  }

  play.addEventListener("click", () => {
    if (finished) return void run();
    clock.paused = !clock.paused;
    play.textContent = clock.paused ? "Play" : "Pause";
    play.setAttribute("aria-label", clock.paused ? "Play the terminal" : "Pause the terminal");
  });
  restart.addEventListener("click", () => {
    clock.paused = false;
    play.textContent = "Pause";
    void run();
  });
  speed.addEventListener("change", () => (clock.speed = Number(speed.value)));

  async function start() {
    if (started) return;
    started = true;
    const rec = await loadRecording(root.dataset.url!);
    if (!rec.project) {
      body.textContent = "No recording available.";
      return;
    }
    const p = rec.project;
    lines = which === "create" ? p.create.lines : p.check.lines;
    command = which === "create" ? p.command : p.checkCommand;
    const real = formatDuration(which === "create" ? p.create.durationMs : p.check.durationMs);
    note.textContent = `Recorded output of a real run (${real}); waits between lines are shortened.`;
    play.textContent = "Pause";
    await run();
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        io.disconnect();
        void start();
      }
    }, { rootMargin: "0px 0px -20% 0px" });
    io.observe(root);
  } else void start();
}
