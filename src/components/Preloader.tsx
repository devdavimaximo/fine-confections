import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { REDUCED } from '../lib/env';
import { markReady } from '../lib/scroller';
import { brand } from '../content';
import Monogram from './Monogram';

const WORD = brand.name.toUpperCase();

/** primeiro quadro do bolo desenhado (shader compilado) */
const glReady = () =>
  new Promise<void>((resolve) => {
    if ((window as unknown as { __glReady?: boolean }).__glReady) return resolve();
    window.addEventListener('cake:ready', () => resolve(), { once: true });
  });

/**
 * A caixa do ateliê: tampa de ganache com o monograma em creme. O oval se
 * desenha como traço de caneta enquanto o bolo compila; depois a tampa
 * se abre em duas e o bolo nasce do papel.
 */
export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const q = gsap.utils.selector(root);
    const draw = { a: 0 };
    const setA = () => root.current?.style.setProperty('--draw', `${draw.a}deg`);

    const intro = gsap.timeline();
    intro
      .to(draw, { a: 300, duration: REDUCED ? 0.01 : 2.2, ease: 'power2.inOut', onUpdate: setA }, 0.15)
      .fromTo(q('.preloader__char'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, stagger: 0.045, duration: 0.9, ease: 'expo.out' }, 0.5)
      .fromTo(q('.preloader__sub'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, 1.1);

    const minTime = new Promise((r) => setTimeout(r, REDUCED ? 300 : 2400));
    const maxTime = new Promise((r) => setTimeout(r, 9000));
    const assets = Promise.all([
      document.fonts?.ready,
      import('../gl/Cake').then(() => Promise.race([glReady(), maxTime])),
      minTime,
    ]);

    assets
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        const tl = gsap.timeline({ onComplete: () => setGone(true) });
        tl.to(draw, { a: 360, duration: REDUCED ? 0.01 : 0.6, ease: 'power2.out', onUpdate: setA })
          .to(q('.preloader__mark, .preloader__word, .preloader__sub'), { autoAlpha: 0, y: -14, duration: 0.55, ease: 'power3.in', stagger: 0.05 }, '+=0.15')
          .add(markReady, '-=0.1')
          .to(q('.preloader__lid--top'), { yPercent: -101, duration: REDUCED ? 0.01 : 1.25, ease: 'expo.inOut' }, '<')
          .to(q('.preloader__lid--bottom'), { yPercent: 101, duration: REDUCED ? 0.01 : 1.25, ease: 'expo.inOut' }, '<');
      });

    return () => {
      cancelled = true;
      intro.kill();
    };
  }, []);

  if (gone) return null;

  return (
    <div className="preloader" ref={root} role="status" aria-label={`Carregando ${brand.name}`}>
      <div className="preloader__lid preloader__lid--top" />
      <div className="preloader__lid preloader__lid--bottom" />
      <div className="preloader__center">
        <div className="preloader__mark">
          <Monogram className="preloader__mono" />
        </div>
        <p className="preloader__word" aria-hidden="true">
          {WORD.split('').map((c, i) => (
            <span key={i} className="preloader__char">
              {c === ' ' ? ' ' : c}
            </span>
          ))}
        </p>
        <p className="preloader__sub">Atelier de doces finos</p>
      </div>
    </div>
  );
}
