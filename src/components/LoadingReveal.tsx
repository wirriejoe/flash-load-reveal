import { useEffect, useMemo, useRef, useState } from "react";

interface LoadingRevealProps {
  text?: string;
  logoSrc?: string;
  durationMs?: number; // total duration until reveal
}

// A premium loading-to-reveal interaction:
// - Progress fills to ~92%, pauses, then completes
// - Quick flash transition reveals final content
// - Respects reduced motion preferences
export default function LoadingReveal({
  text = "MFC2... soon.",
  logoSrc,
  durationMs = 2500,
}: LoadingRevealProps) {
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const rafRef = useRef<number | null>(null);

  const prefersReducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      // Skip the animation for users preferring reduced motion
      setProgress(100);
      setRevealed(true);
      return;
    }

    const start = performance.now();
    const phase1 = durationMs * 0.64; // to ~92%
    const hold = durationMs * 0.22;   // pause near end
    const phase2 = durationMs * 0.14; // finish + flash
    const target1 = 92;

    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed < phase1) {
        setProgress(Math.min(target1, (elapsed / phase1) * target1));
        rafRef.current = requestAnimationFrame(tick);
      } else if (elapsed < phase1 + hold) {
        setProgress(target1);
        rafRef.current = requestAnimationFrame(tick);
      } else if (elapsed < phase1 + hold + phase2) {
        const t = (elapsed - phase1 - hold) / phase2;
        setProgress(Math.min(100, target1 + t * (100 - target1)));
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setProgress(100);
        setFlashing(true);
        setTimeout(() => {
          setRevealed(true);
          setFlashing(false);
        }, 360);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [durationMs, prefersReducedMotion]);

  return (
    <main className="min-h-screen grid place-items-center">
      <section className="w-full max-w-3xl px-6">
        {!revealed ? (
          <div className="flex flex-col items-center gap-8 animate-fade-in" aria-busy={!revealed}>
            <p className="font-mono tracking-widest text-xl md:text-2xl opacity-80">
              LOADING...
            </p>
            <div className="w-full md:w-4/5">
              <div className="h-4 rounded-full border border-border bg-card overflow-hidden">
                <div
                  className="h-full bg-accent transition-[width] duration-100 ease-out animate-progress-glow"
                  style={{ width: `${progress}%` }}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.floor(progress)}
                  role="progressbar"
                />
              </div>
              <div className="mt-2 text-sm text-muted-foreground text-right">
                {Math.floor(progress)}%
              </div>
            </div>
          </div>
        ) : (
          <article className="text-center animate-fade-in">
            {/* Signature subtle flash overlay */}
            {flashing && (
              <div className="fixed inset-0 pointer-events-none bg-foreground/30 animate-flash" />
            )}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-none">
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'var(--gradient-primary)' }}>
                {text}
              </span>
            </h1>
            {logoSrc && (
              <img
                src={logoSrc}
                alt="MFC2 brand logo"
                loading="lazy"
                className="mx-auto mt-8 w-24 md:w-32 select-none"
              />
            )}
          </article>
        )}
      </section>
    </main>
  );
}
