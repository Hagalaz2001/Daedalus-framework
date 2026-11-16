// Tiny replay engine shared by the build demo and the terminal replay.
// A Clock turns recorded milliseconds into real waiting, honouring pause, speed and cancellation.

export const CANCELLED = Symbol("cancelled");

export class Clock {
  speed = 1;
  paused = false;
  /** Reduced motion: every wait resolves at once, so each step shows its finished state. */
  instant = false;
  private run = 0;

  /** Invalidates every pending sleep of the current run. */
  cancel(): void {
    this.run++;
  }

  sleep(ms: number): Promise<void> {
    if (this.instant || ms <= 0) return Promise.resolve();
    const mine = this.run;
    return new Promise((resolve, reject) => {
      let left = ms;
      let last = performance.now();
      const tick = (now: number) => {
        if (mine !== this.run) return reject(CANCELLED);
        const dt = now - last;
        last = now;
        if (!this.paused) left -= dt * this.speed;
        if (left <= 0) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /** Throws CANCELLED when the run was cancelled, even if the wait was skipped (instant mode). */
  alive(token: number): void {
    if (token !== this.run) throw CANCELLED;
  }

  get token(): number {
    return this.run;
  }
}

export interface Line {
  t: number;
  text: string;
}

/** Delay before showing `line`, compressed so a multi-minute run replays in seconds while keeping its rhythm. */
export function lineDelays(lines: Line[], cap: number, scale: number): number[] {
  return lines.map((l, i) => {
    const gap = i === 0 ? 0 : l.t - lines[i - 1].t;
    return Math.min(cap, Math.max(10, gap * scale));
  });
}

const GOOD = /(✓|\bok\b|passed|success|Checked|Finished|Done|up to date)/i;
const BAD = /(error|failed|✗|✘)/i;
const DIM = /^(>|Task\b|\s*\$)/;

/** Writes one terminal line into `host`, coloured by what it says. */
export function appendLine(host: HTMLElement, text: string): void {
  const div = document.createElement("div");
  div.className = BAD.test(text) ? "tl bad" : GOOD.test(text) ? "tl good" : DIM.test(text) ? "tl dim" : "tl";
  div.textContent = text.length ? text : " ";
  host.appendChild(div);
  host.scrollTop = host.scrollHeight;
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`;
}
