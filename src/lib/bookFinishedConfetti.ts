import confetti from "canvas-confetti";

const warmColors = [
  "#7d8b6f",
  "#5f6b54",
  "#8b6914",
  "#c4a574",
  "#e8dfd0",
  "#fffdf8",
  "#d4a574",
];

/** Coriandoli “festosi” in palette calda (tema KeepOn). */
export function burstBookFinishedConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const count = 220;
  const defaults = {
    origin: { y: 0.68 },
    colors: warmColors,
  };

  const fire = (ratio: number, opts: Omit<NonNullable<Parameters<typeof confetti>[0]>, "particleCount">) => {
    void confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * ratio),
    });
  };

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.85 });
  fire(0.1, { spread: 120, startVelocity: 28, decay: 0.93, scalar: 1.15 });
  fire(0.1, { spread: 125, startVelocity: 42 });

  window.setTimeout(() => {
    void confetti({
      ...defaults,
      particleCount: 80,
      spread: 360,
      startVelocity: 28,
      ticks: 50,
      scalar: 0.95,
      shapes: ["circle"],
    });
  }, 180);
}
