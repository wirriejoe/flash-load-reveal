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

  // Smooth ease-out progress to 100% (no hold/hitch)
  useEffect(() => {
    if (prefersReducedMotion) {
      setProgress(100);
      setTimeComplete(true);
      return;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      setProgress(eased * 100);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setTimeComplete(true);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [durationMs, prefersReducedMotion]);

  const revealed = timeComplete && logoLoaded;

  return (
    // Force dark theme locally: black background with white text via semantic tokens
    <main className="dark min-h-screen grid place-items-center bg-background text-foreground">
      <section className="w-full max-w-3xl px-6">
        {!revealed ? (
          <div className="flex flex-col items-center gap-8 animate-fade-in" aria-busy={!revealed}>
            <p className="font-mono tracking-widest text-xl md:text-2xl opacity-90">
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
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-none text-foreground">
              {text}
            </h1>
            {logoSrc && (
              <img
                src={logoSrc}
                alt="MFC2 brand logo"
                loading="eager"
                decoding="sync"
                fetchPriority="high"
                className="mx-auto mt-8 w-24 md:w-32 select-none"
              />
            )}
          </article>
        )}
      </section>
    </main>
  );
}
