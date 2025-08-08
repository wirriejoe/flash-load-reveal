import { useEffect, useMemo, useRef, useState } from "react";

interface LoadingRevealProps {
  text?: string;
  logoSrc?: string;
  durationMs?: number; // total duration until reveal
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const styles = `
  @keyframes glitch {
    0% {
      text-shadow: 
        2px 0 red, -2px 0 blue,
        0 0 2px hsl(0 0% 100% / 0.6),
        0 0 8px hsl(0 0% 100% / 0.5),
        0 0 20px hsl(0 0% 100% / 0.3),
        0 0 30px hsl(0 0% 100% / 0.2);
      transform: skewX(-8deg);
    }
    20% {
      text-shadow: 
        -2px 0 red, 2px 0 blue,
        0 0 2px hsl(0 0% 100% / 0.6),
        0 0 8px hsl(0 0% 100% / 0.5),
        0 0 20px hsl(0 0% 100% / 0.3),
        0 0 30px hsl(0 0% 100% / 0.2);
      transform: skewX(-3deg);
    }
    40% {
      text-shadow: 
        2px 0 red, -2px 0 blue,
        0 0 2px hsl(0 0% 100% / 0.6),
        0 0 8px hsl(0 0% 100% / 0.5),
        0 0 20px hsl(0 0% 100% / 0.3),
        0 0 30px hsl(0 0% 100% / 0.2);
      transform: skewX(-13deg);
    }
    60% {
      text-shadow: 
        -2px 0 red, 2px 0 blue,
        0 0 2px hsl(0 0% 100% / 0.6),
        0 0 8px hsl(0 0% 100% / 0.5),
        0 0 20px hsl(0 0% 100% / 0.3),
        0 0 30px hsl(0 0% 100% / 0.2);
      transform: skewX(-6deg);
    }
    80% {
      text-shadow: 
        2px 0 red, -2px 0 blue,
        0 0 2px hsl(0 0% 100% / 0.6),
        0 0 8px hsl(0 0% 100% / 0.5),
        0 0 20px hsl(0 0% 100% / 0.3),
        0 0 30px hsl(0 0% 100% / 0.2);
      transform: skewX(-8deg);
    }
    100% {
      text-shadow:
        0 0 2px hsl(0 0% 100% / 0.6),
        0 0 8px hsl(0 0% 100% / 0.5),
        0 0 20px hsl(0 0% 100% / 0.3),
        0 0 30px hsl(0 0% 100% / 0.2);
      transform: skewX(-8deg);
    }
  }
  
  .glitch-text {
    position: relative;
    color: white;
    font-weight: bold;
    display: inline-block;
  }
  
  .glitching {
    animation: glitch 1.5s cubic-bezier(.4,2.5,.7,.2) 1;
  }
  
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes dots {
    0%, 100% { content: ""; }
    25% { content: "."; }
    50% { content: ".."; }
    75% { content: "..."; }
  }
  
  @keyframes jitter {
    0% { width: 83%; }
    20% { width: 82.7%; }
    40% { width: 83.2%; }
    60% { width: 82.8%; }
    80% { width: 83.1%; }
    100% { width: 83%; }
  }
  
  @keyframes text-jitter-3d {
    0%, 100% {
      transform: skewX(-8deg) translate3d(0, 0, 0);
    }
    20% {
      transform: skewX(-8deg) translate3d(-0.5px, 0.5px, 0);
    }
    40% {
      transform: skewX(-8deg) translate3d(0.5px, -0.5px, 0);
    }
    60% {
      transform: skewX(-8deg) translate3d(-0.3px, 0.3px, 0);
    }
    80% {
      transform: skewX(-8deg) translate3d(0.3px, -0.3px, 0);
    }
  }
  
  .animate-fade-in {
    opacity: 0;
    animation: fade-in 0.8s ease-out 1s forwards;
  }
  
  .animate-dots:after {
    content: "";
    animation: dots 2s linear infinite;
  }
  
  .animate-jitter {
    animation: jitter 0.8s ease-in-out infinite;
  }
  
  .animate-text-jitter-3d {
    animation: text-jitter-3d 2s ease-in-out infinite;
    transform-style: preserve-3d;
  }
  
  .text-glow-neon-white-light {
    color: #ffffff;
    text-shadow:
      0 0 2px hsl(0 0% 100% / 0.6),
      0 0 8px hsl(0 0% 100% / 0.5),
      0 0 20px hsl(0 0% 100% / 0.3),
      0 0 30px hsl(0 0% 100% / 0.2);
  }
  
  .glow-neon-white-light {
    filter:
      drop-shadow(0 0 6px hsl(0 0% 100% / 0.4))
      drop-shadow(0 0 15px hsl(0 0% 100% / 0.25));
  }
`;

// Loading-to-reveal interaction with smooth progress and synced logo reveal
export default function LoadingReveal({
  logoSrc,
  durationMs = 6000,
}: LoadingRevealProps) {
  const [progress, setProgress] = useState(0);
  const [atLimit, setAtLimit] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(!logoSrc);
  const [glitchLogo, setGlitchLogo] = useState(false);
  const [glitchText, setGlitchText] = useState(false);
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

  // Progress approaches 82% until logo is ready, then smooth finish to 83%
  useEffect(() => {
    if (prefersReducedMotion) {
      setProgress(83);
      setAtLimit(true);
      return;
    }

    // Wait for fade-in animation to complete (1s delay + 0.8s animation)
    const fadeInDelay = setTimeout(() => {
      const start = performance.now();
      finishStartRef.current = null;

      const tick = (now: number) => {
        // If we're in the finishing phase, animate smoothly to 83
        if (finishStartRef.current !== null) {
          const finishTime = (now - finishStartRef.current) / 300; // 300ms smooth transition
          if (finishTime < 1) {
            const smoothed = easeOutCubic(finishTime);
            setProgress(82 + smoothed * 1); // Smooth from 82 to 83
            rafRef.current = requestAnimationFrame(tick);
          } else {
            setProgress(83);
            setAtLimit(true);
          }
          return;
        }

        const t = Math.min(1, (now - start) / durationMs);
        const eased = easeOutCubic(t);
        const target = Math.min(82, eased * 83);

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
    }, 1800); // 1s delay + 0.8s fade-in animation

    return () => {
      clearTimeout(fadeInDelay);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [durationMs, prefersReducedMotion, logoLoaded]);

  // Single glitch effect at 83%
  useEffect(() => {
    if (atLimit) {
      // Trigger glitch for both when hitting 83%
      setGlitchLogo(true);
      setGlitchText(true);
      
      const timeout = setTimeout(() => {
        setGlitchLogo(false);
        setGlitchText(false);
      }, 500); // 0.5 second glitch at 83%
      
      return () => clearTimeout(timeout);
    }
  }, [atLimit]);
  

  return (
    <>
      <style>{styles}</style>
      {/* Force dark theme locally: black background with white text via semantic tokens */}
      <main className="dark min-h-screen grid place-items-center bg-background text-foreground">
        <section className="w-full px-6">
          <article className="text-center animate-fade-in">
            <div className={`inline-block text-foreground text-glow-neon-white-light glow-neon-white-light glitch-text ${glitchLogo ? 'glitching' : ''}`} style={{ transform: 'skewX(-8deg)' }}>
              <div className="text-5xl md:text-7xl tracking-wider md:tracking-widest leading-none select-none" style={{ fontWeight: 900, WebkitTextStroke: '1px white' }}>
                MFC
              </div>
              <div className="flex items-start -mt-1">
                <div className="h-[8px] md:h-[10px] w-[90px] md:w-[130px] bg-foreground mt-1 ml-1" />
                <span className="text-5xl md:text-7xl tracking-tight leading-none select-none ml-1 -mt-2" style={{ fontWeight: 900, WebkitTextStroke: '1px white' }}>2</span>
              </div>
            </div>
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
            <p className={`mt-6 text-lg md:text-2xl text-foreground text-glow-neon-white-light glow-neon-white-light glitch-text ${glitchText ? 'glitching' : ''}`}>
              COMING SOON
              <span
                aria-hidden
                className="inline-block w-[3ch] ml-1 text-left font-mono after:content-[''] after:inline-block after:w-full animate-dots"
              />
            </p>
            
            {/* Loading bar below the content */}
            <div className="mt-12 w-full md:w-4/5 mx-auto">
              <p className="tracking-widest text-sm md:text-base opacity-90 mb-4">
                LOADING...
              </p>
              <div className="h-4 rounded-full border border-foreground/20 bg-foreground/10 overflow-hidden">
                <div
                  className={`h-full bg-foreground transition-all duration-300 ease-out ${atLimit ? 'animate-jitter' : ''}`} // white bar on black
                  style={{ width: atLimit ? undefined : `${progress}%` }}
                  aria-valuemin={0}
                  aria-valuemax={83}
                  aria-valuenow={Math.floor(progress)}
                  role="progressbar"
                />
              </div>
              <div className="mt-2 text-sm text-foreground/70 text-right">
                {Math.floor(progress)}%
              </div>
            </div>
          </article>
        </section>
      </main>
    </>
  );
}

