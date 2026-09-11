/**
 * Emergency siren for the public alert page.
 *
 * Browsers block sound until the user interacts with the page, so the siren
 * must be "armed" by a tap before it can sound automatically later.
 */

type Ctx = AudioContext & { __aivoraArmed?: boolean };

let ctx: Ctx | null = null;
let stopAt = 0;
let current: { osc: OscillatorNode; gain: GainNode } | null = null;

function getContext(): Ctx | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor() as Ctx;
  return ctx;
}

/** Call from a click/tap handler. Unlocks audio so later sirens can autoplay. */
export async function armSiren(): Promise<boolean> {
  const c = getContext();
  if (!c) return false;
  try {
    if (c.state === "suspended") await c.resume();
    // Silent blip to satisfy strict autoplay policies (iOS Safari).
    const osc = c.createOscillator();
    const gain = c.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.05);
    c.__aivoraArmed = true;
    return true;
  } catch {
    return false;
  }
}

export function isSirenArmed(): boolean {
  return Boolean(ctx?.__aivoraArmed);
}

/** Rising/falling two-tone civil-defence style siren. */
export function playSiren(seconds = 8): void {
  const c = getContext();
  if (!c || !c.__aivoraArmed) return;
  const now = c.currentTime;
  if (now < stopAt) return; // already sounding
  stopAt = now + seconds;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.connect(gain).connect(c.destination);

  const sweep = 1.4; // seconds per rise or fall
  osc.frequency.setValueAtTime(520, now);
  for (let t = 0; t < seconds; t += sweep * 2) {
    osc.frequency.linearRampToValueAtTime(1100, now + t + sweep);
    osc.frequency.linearRampToValueAtTime(520, now + t + sweep * 2);
  }

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.15);
  gain.gain.setValueAtTime(0.35, now + seconds - 0.4);
  gain.gain.linearRampToValueAtTime(0, now + seconds);

  osc.start(now);
  osc.stop(now + seconds + 0.05);
  current = { osc, gain };
  osc.onended = () => {
    if (current?.osc === osc) current = null;
  };

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([600, 250, 600, 250, 600, 250, 900]);
    } catch {
      /* vibration unsupported */
    }
  }
}

export function stopSiren(): void {
  stopAt = 0;
  if (!current) return;
  try {
    current.gain.gain.value = 0;
    current.osc.stop();
  } catch {
    /* already stopped */
  }
  current = null;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(0);
    } catch {
      /* vibration unsupported */
    }
  }
}
