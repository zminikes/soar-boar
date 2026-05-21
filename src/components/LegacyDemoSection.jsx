import { useInView } from '../game/useInView';
import { MascotIcon } from './MascotIcon';

export function LegacyDemoSection({ modeId, onStart }) {
  const SOARBOAR_STEPS = [
    { word: 'SOAR', changed: null, pts: null,
      caption: <>Start with a word like <em>SOAR</em>.</> },
    { word: 'BOAR', changed: 0, pts: 1,
      caption: <>Swap one letter — meet <em>BOAR</em>.</> },
    { word: 'BEAR', changed: 1, pts: 4,
      caption: <>Inner letters score bigger. <em>BEAR</em> earns 4.</> },
    { word: 'BEAD', changed: 3, pts: 2,
      caption: <>Keep going. Every new word adds a rung.</> },
  ];
  const SOYBOY_STEPS = [
    { word: 'SOY', changed: null, pts: null,
      caption: <>Start with a tiny word like <em>SOY</em>.</> },
    { word: 'BOY', changed: 0, pts: 1,
      caption: <>Swap one letter — meet <em>BOY</em>.</> },
    { word: 'BAY', changed: 1, pts: 3,
      caption: <>The middle letter is the prize. <em>BAY</em> scores 3.</> },
    { word: 'BAT', changed: 2, pts: 2,
      caption: <>Keep going. Every new word adds a rung.</> },
  ];
  const steps = modeId === 'soyboy' ? SOYBOY_STEPS : SOARBOAR_STEPS;

  // Per-step inView + alternating mascot side for visual rhythm.
  // Hook count is stable (steps.length is always 4) so calling useInView
  // in a map is safe here despite the rules-of-hooks pattern.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const sceneHooks = steps.map(() => useInView(0.35));
  const [finaleRef, finaleVisible] = useInView(0.4);

  return (
    <section className="demo-section" aria-label="How it works">
      <h3 className="demo-title">How it <em>works</em></h3>

      <div className="demo-steps">
        {steps.map((step, i) => {
          const [ref, visible] = sceneHooks[i];
          const side = i % 2 === 0 ? 'right' : 'left';
          return (
            <div key={i} ref={ref} className={`demo-step${visible ? ' visible' : ''}`}>
              <div className="demo-tile-row">
                {step.pts != null && <div className="demo-pts">+{step.pts}</div>}
                {step.word.split('').map((l, j) => (
                  <div key={j} className={`demo-tile${step.changed === j ? ' changed' : ''}`}>
                    {l}
                  </div>
                ))}
                {step.changed != null && (
                  <MascotIcon
                    size={64}
                    modeId={modeId}
                    className={`demo-mascot ${side}`}
                  />
                )}
              </div>
              <div className="demo-caption">{step.caption}</div>
            </div>
          );
        })}
      </div>

      <div
        ref={finaleRef}
        className={`demo-finale${finaleVisible ? ' visible' : ''}`}
        onClick={onStart}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStart(); } }}
        style={{ cursor: 'pointer' }}
      >
        Now <span className="demo-finale-arrow">↑</span> your turn
      </div>
    </section>
  );
}
