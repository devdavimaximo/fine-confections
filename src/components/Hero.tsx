import { lazy, Suspense, useRef } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { brand, cut, hero, menuCount } from '../content';
import { LITE, REDUCED } from '../lib/env';
import { onReady, scrollToId, signals } from '../lib/scroller';
import { LAYER_KEYS, layerEls } from '../gl/layers';

// three.js fica fora do bundle inicial: o preloader aparece na hora e espera este chunk
const Cake = lazy(() => import('../gl/Cake'));

const CHAPTERS = ['Vitrine', 'Lâmina', 'Abertura', 'Por dentro'];
/** o nome em duas linhas, uma de cada lado do bolo */
const WORDS = [brand.name.split(' ')[0], brand.name.split(' ').slice(1).join(' ')];
const ROMAN = ['I', 'II', 'III', 'IV'];

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const chapter = useRef<HTMLSpanElement>(null);
  const chapterName = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);

      // entrada: as letras sobem do papel junto com o bolo
      const splits = q<HTMLElement>('.hero__word').map((el) => SplitText.create(el, { type: 'chars', charsClass: 'ch', mask: 'chars' }));
      const chars = splits.flatMap((s) => s.chars);
      gsap.set(chars, { yPercent: 110 });
      gsap.set(q('[data-intro]'), { autoAlpha: 0, y: 18 });
      const off = onReady(() => {
        gsap
          .timeline({ defaults: { ease: 'expo.out' } })
          .to(chars, { yPercent: 0, duration: REDUCED ? 0.01 : 1.7, stagger: 0.045 }, 0.35)
          .to(q('[data-intro]'), { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.08 }, 1.0);
      });

      // o corte: pino de ~3,4 telas; o progresso alimenta o shader e esta linha do tempo
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${window.innerHeight * (LITE ? 3 : 3.4)}`,
          pin: true,
          scrub: true,
          onUpdate: (self) => {
            const p = self.progress;
            signals.cut = p;
            const idx = p < 0.16 ? 0 : p < 0.34 ? 1 : p < 0.62 ? 2 : 3;
            if (chapter.current && chapter.current.dataset.i !== String(idx)) {
              chapter.current.dataset.i = String(idx);
              chapter.current.textContent = ROMAN[idx];
              if (chapterName.current) chapterName.current.textContent = CHAPTERS[idx];
            }
            if (bar.current) bar.current.style.transform = `scaleX(${p})`;
          },
        },
      });

      tl.to(q('.hero__word--a'), { xPercent: -18, autoAlpha: 0, duration: 0.15 }, 0)
        .to(q('.hero__word--b'), { xPercent: 18, autoAlpha: 0, duration: 0.15 }, 0)
        .to(q('.hero__meta, .hero__aside'), { autoAlpha: 0, y: -30, duration: 0.09 }, 0)
        // o marcador de capítulos só entra quando o corte começa (na vitrine, o nome manda)
        .fromTo(q('.hero__chapter'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05 }, 0.07)
        .fromTo(q('.hero__line'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.07 }, 0.17)
        .to(q('.hero__line'), { autoAlpha: 0, y: -30, duration: 0.06 }, 0.37)
        .fromTo(q('.hero__card'), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.44)
        .to(q('.hero__card'), { autoAlpha: 0, y: -30, duration: 0.06 }, 0.64)
        .fromTo(q('.hero__outro'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, 0.9)
        .to({}, { duration: 0.04 }, 0.96);

      return off;
    },
    { scope: root },
  );

  return (
    <section className="hero" id="topo" ref={root} aria-label={`${brand.name}, ${brand.descriptor.toLowerCase()}`}>
      <h1 className="hero__title" aria-label={`${brand.name}, ${brand.descriptor}`}>
        <span className="hero__word hero__word--a" aria-hidden="true">
          {WORDS[0]}
        </span>
        <span className="hero__word hero__word--b" aria-hidden="true">
          {WORDS[1]}
        </span>
      </h1>

      <Suspense fallback={<div className="cake" />}>
        <Cake />
      </Suspense>

      {/* o bolo é 3D: o aviso fica durante o corte inteiro e leva até a foto de verdade */}
      <button
        className="hero__note"
        data-intro
        data-cursor="ver foto"
        onClick={() => scrollToId('foto-real', 2.6, -Math.round(window.innerHeight * 0.16))}
      >
        <span className="hero__note-dot" aria-hidden="true" />
        <span>{hero.note}</span>
        <span className="hero__note-sep" aria-hidden="true">
          ·
        </span>
        <u>{hero.noteCta}</u>
        <i aria-hidden="true">↓</i>
      </button>

      <div className="hero__meta">
        <p className="eyebrow" data-intro>
          {hero.kicker}
        </p>
        <p className="hero__lede" data-intro>
          {hero.lede}
        </p>
      </div>

      <div className="hero__aside">
        <p className="eyebrow" data-intro>
          {brand.region}
        </p>
        <button className="hero__go" data-intro data-cursor="cortar" onClick={() => scrollToId('casa', 5)}>
          <span>{hero.hint}</span>
          <i aria-hidden="true" />
        </button>
      </div>

      <p className="hero__line">
        <em>{cut.line}</em>
      </p>

      <article className="hero__card" aria-label={cut.name}>
        <p className="eyebrow eyebrow--gold">{cut.tag}</p>
        <h2 className="hero__name">{cut.name}</h2>
        <p className="hero__text">{cut.text}</p>
        <p className="hero__price">{cut.priceNote}</p>
      </article>

      <div
        className="layers"
        aria-hidden="true"
        ref={(el) => {
          layerEls.root = el;
        }}
      >
        <svg className="layers__lines">
          {LAYER_KEYS.map((k) => (
            <g key={k}>
              <line
                ref={(el) => {
                  if (el) layerEls.lines[k] = el;
                }}
              />
              <circle
                ref={(el) => {
                  if (el) layerEls.dots[k] = el;
                }}
              />
            </g>
          ))}
        </svg>
        {LAYER_KEYS.map((k, i) => (
          <p
            key={k}
            className="layers__label"
            ref={(el) => {
              if (el) layerEls.labels[k] = el;
            }}
          >
            <small>{String(i + 1).padStart(2, '0')}</small>
            {cut.layers[k]}
          </p>
        ))}
      </div>

      <p className="hero__outro">
        <em>E mais</em> {menuCount} doces no cardápio.
      </p>

      <div className="hero__chapter" aria-hidden="true">
        <span className="hero__roman" ref={chapter} data-i="0">
          I
        </span>
        <span className="hero__chapter-name" ref={chapterName}>
          {CHAPTERS[0]}
        </span>
        <span className="hero__bar">
          <span ref={bar} />
        </span>
      </div>
    </section>
  );
}
