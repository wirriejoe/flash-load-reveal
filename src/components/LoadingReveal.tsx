import { useEffect, useMemo, useRef, useState } from "react";

interface LoadingRevealProps {
  text?: string;
  logoSrc?: string;
  durationMs?: number; // total duration until reveal
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// Loading-to-reveal interaction with smooth progress and synced logo reveal
export default function LoadingReveal({
  text = "MFC2... soon.",
  logoSrc,
  durationMs = 2500,
}: LoadingRevealProps) {
  const [progress, setProgress] = useState(0);
  const [timeComplete, setTimeComplete] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(!logoSrc);
  const rafRef = useRef<number | null>(null);
  const finishStartRef = useRef<number | null>(null);
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // Preload + decode logo so text and image reveal together
  useEffect(() => {
    if (!logoSrc) return;
    const img = new Image();
    img.src = logoSrc;
    const finish = () => setLogoLoaded(true);
    if (typeof img.decode === "function") {
      img.decode().then(finish).catch(finish);
    } else {
      img.onload = finish;
      img.onerror = finish; // don't block on errors
    }
  }, [logoSrc]);

  // Progress approaches 99% until logo is ready, then smooth finish to 100%
  useEffect(() => {
    if (prefersReducedMotion) {
      setProgress(100);
      setTimeComplete(true);
      return;
    }

    const start = performance.now();
    finishStartRef.current = null;

    const tick = (now: number) => {
      // If we're in the finishing phase, animate 99 -> 100 smoothly
      if (finishStartRef.current !== null) {
        const ft = Math.min(1, (now - finishStartRef.current) / 220);
        const eased = easeOutCubic(ft);
        setProgress(99 + eased * 1);
        if (ft < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setProgress(100);
          setTimeComplete(true);
        }
        return;
      }

      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      const target = Math.min(99, eased * 100);

      const canFinish = t >= 1 && logoLoaded;
      if (canFinish) {
        finishStartRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      setProgress(target);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [durationMs, prefersReducedMotion, logoLoaded]);

  const revealed = timeComplete && logoLoaded;

  return (
    // Force dark theme locally: black background with white text via semantic tokens
    <main className="dark min-h-screen grid place-items-center bg-background text-foreground">
      <section className="w-full px-6">
        {!revealed ? (
          <div className="flex flex-col items-center gap-8 animate-fade-in" aria-busy={!revealed}>
            <p className="tracking-widest text-xl md:text-2xl opacity-90">
              LOADING...
            </p>
            <div className="w-full md:w-4/5">
              <div className="h-4 rounded-full border border-foreground/20 bg-foreground/10 overflow-hidden">
                <div
                  className="h-full bg-foreground" // white bar on black
                  style={{ width: `${progress}%` }}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.floor(progress)}
                  role="progressbar"
                />
              </div>
              <div className="mt-2 text-sm text-foreground/70 text-right">
                {Math.floor(progress)}%
              </div>
            </div>
          </div>
        ) : (
          <article className="text-center animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none text-glow-neon-green">
              <span className="inline-flex items-end -skew-x-12">
                <span className="relative inline-block">
                  <span className="inline-block mr-2">MFC</span>
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-6 -bottom-2 h-1 bg-primary rounded-full drop-shadow-[0_0_12px_hsl(var(--primary)/0.8)]"
                  />
                </span>
                <span className="-ml-1">2</span>
              </span>
            </h1>
            <p className="mt-4 text-lg md:text-2xl text-glow-neon-green">COMING SOON.</p>
            {logoSrc && (
              <img
                src={logoSrc}
                alt="MFC2 brand logo with neon glow"
                loading="eager"
                decoding="sync"
                fetchPriority="high"
                className="mx-auto mt-8 w-24 md:w-32 select-none glow-neon-green"
              />
            )}
          </article>
        )}
      </section>
    </main>
  );
}
