import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MODE_CONFIGS, type ModeId } from '../lib/modes';

interface DemoStep {
  word: string;
  changed: number | null;
  pts: number | null;
  target?: string;
  caption: ReactNode;
  sub: ReactNode;
}

interface DemoSectionProps {
  modeId: ModeId;
  onStart: () => void;
  onStartForever?: () => void;
}

/* DemoSection (scroll-jacked, sticky scene).
   Outer wrapper is N viewport-heights tall.
   Inner scene is sticky and shows exactly one step at a time.
   Scroll progress through the outer drives which step is active.
   Each new step re-mounts via React `key`, so the entrance
   animations replay (tile snap-in + points float). */
export function DemoSection({ modeId, onStart, onStartForever }: DemoSectionProps) {
  const cfg = MODE_CONFIGS[modeId];
  const isLadder = !!cfg.isLadder;

  // 4 scenes per mode. The last is a CTA finale.
  const STEPS: DemoStep[] = modeId === 'thisthat' ? [
    { word: 'THIS', changed: null, pts: null, target: 'THAT',
      caption: <>Each game has a starting word and a goal.</>,
      sub: <>Get from <span className="accent">THIS</span> to <span className="accent">THAT</span>.</> },
    { word: 'THIN', changed: 3, pts: null, target: 'THAT',
      caption: <>Change one letter at a time.</>,
      sub: <><span className="accent">THIS</span> → <span className="accent">THIN</span>.</> },
    { word: 'THAN', changed: 2, pts: null, target: 'THAT',
      caption: <>Every step has to be a real word.</>,
      sub: <><span className="accent">THIN</span> → <span className="accent">THAN</span>.</> },
    { word: 'THAT', changed: 2, pts: null, target: 'THAT',
      caption: <>Hit the target word to win.</>,
      sub: <>Three moves — see if you can match the best path.</> },
  ] : modeId === 'soyboy' ? [
    { word: 'SOY', changed: null, pts: null,
      caption: <>Every game starts with a different word.</>,
      sub: 'Your goal: change one letter to make a new word.' },
    { word: 'BOY', changed: 0, pts: 1,
      caption: <>Like <span className="accent">SOY</span> to <span className="accent">BOY</span>.</>,
      sub: 'The first letter earns 1 point.' },
    { word: 'BAY', changed: 1, pts: 3,
      caption: <>Middle letters score more.</>,
      sub: 'The second letter is worth 3 points.' },
    { word: 'BAT', changed: 2, pts: 2,
      caption: <>Keep climbing the ladder.</>,
      sub: 'Race the clock — 45 seconds to stack as many words as you can.' },
  ] : [
    { word: 'SOAR', changed: null, pts: null,
      caption: <>Every game starts with a different word.</>,
      sub: 'Your goal: change one letter to make a new word.' },
    { word: 'BOAR', changed: 0, pts: 1,
      caption: <>Like <span className="accent">SOAR</span> to <span className="accent">BOAR</span>.</>,
      sub: 'The first letter earns 1 point.' },
    { word: 'BEAR', changed: 1, pts: 4,
      caption: <>Inner letters score more.</>,
      sub: 'The second letter is worth 4 points.' },
    { word: 'BEAD', changed: 3, pts: 2,
      caption: <>Keep climbing the ladder.</>,
      sub: 'Race the clock — 60 seconds to stack as many words as you can.' },
  ];
  const FINALE_INDEX = STEPS.length; // one extra scene at the end
  const totalScenes = STEPS.length + 1;

  const outerRef = useRef<HTMLElement | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let ticking = false;
    const update = (): void => {
      ticking = false;
      const el = outerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const totalScroll = Math.max(1, r.height - window.innerHeight);
      const scrolled = Math.max(0, Math.min(totalScroll, -r.top));
      const idx = Math.min(totalScenes - 1, Math.floor((scrolled / totalScroll) * totalScenes));
      setStep(prev => prev === idx ? prev : idx);
    };
    const onScroll = (): void => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [totalScenes]);

  const isFinale = step >= FINALE_INDEX;
  const current = STEPS[Math.min(step, STEPS.length - 1)];

  return (
    <section
      ref={outerRef}
      className="big-demo"
      style={{ height: `${totalScenes * 100}vh` }}
      aria-label="How it works"
    >
      <div className="big-demo-sticky">
        <div className="big-demo-eyebrow">How it works</div>

        <div className="big-demo-progress" role="presentation">
          {Array.from({ length: totalScenes }).map((_, i) => (
            <span key={i} className={`big-demo-progress-dot${i === step ? ' active' : ''}`} />
          ))}
        </div>

        {!isFinale ? (
          <div key={`scene-${step}`} className="big-demo-scene">
            <div className="big-demo-tiles">
              {current.pts != null && (
                <span key={`pts-${step}`} className="big-demo-pts">+{current.pts}</span>
              )}
              {current.word.split('').map((l, i) => (
                <div
                  key={`${step}-${i}`}
                  className={`big-demo-tile${current.changed === i ? ' changed' : ''}`}
                >
                  {l}
                </div>
              ))}
            </div>
            <div className="big-demo-caption">{current.caption}</div>
            <div className="big-demo-sub">{current.sub}</div>
          </div>
        ) : (
          <div key="finale" className="big-demo-scene">
            <div className="big-demo-caption is-finale">
              Now <span className="accent">you</span> try.
            </div>
            <div className="big-demo-sub">
              {isLadder
                ? <>{cfg.wordLen}-letter words · word ladder, no clock.</>
                : <>{cfg.wordLen}-letter words · {cfg.duration} seconds on the clock.</>}
            </div>
            <button className="big-demo-finale-cta" onClick={onStart}>
              Start playing →
            </button>
            {onStartForever && !isLadder && (
              <button className="big-demo-finale-ghost" onClick={onStartForever}>
                Try forever mode (no timer)
              </button>
            )}
          </div>
        )}

        {/* Always mounted — fading via opacity prevents a layout jump
           when leaving the first scene. */}
        <div
          className="big-demo-scroll-hint"
          aria-hidden="true"
          style={{ opacity: step === 0 ? 0.55 : 0 }}
        >
          Scroll
        </div>
      </div>
    </section>
  );
}
