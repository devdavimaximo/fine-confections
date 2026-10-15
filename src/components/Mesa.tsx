import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { mesa } from '../content';
import { LITE } from '../lib/env';
import { useReveal } from '../lib/reveal';
import Img from './Img';

/** formatos das molduras, em rodízio: arco (como o post da casa), retângulo, oval do monograma */
const SHAPES = ['arch', 'rect', 'oval', 'rect', 'arch', 'rect'] as const;

export default function Mesa() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  useGSAP(
    () => {
      // mesma coreografia no desktop e no celular: a seção fixa e as fotos passam com o scroll
      const q = gsap.utils.selector(root);
      const track = q<HTMLElement>('.mesa__track')[0];
      const pin = q<HTMLElement>('.mesa__pin')[0];
      const dist = () => track.scrollWidth - window.innerWidth;

      const move = gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: () => `+=${dist()}`,
          pin: true,
          scrub: LITE ? 0.4 : 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // cada foto desliza dentro da moldura enquanto a trilha passa
      q<HTMLElement>('.mesa__fig img').forEach((img) => {
        gsap.fromTo(
          img,
          { xPercent: -7 },
          {
            xPercent: 7,
            ease: 'none',
            scrollTrigger: { trigger: img.parentElement, containerAnimation: move, start: 'left right', end: 'right left', scrub: true },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <section className="mesa" id="mesa" data-tone="dark" ref={root}>
      <div className="mesa__intro">
        <div className="sec-head">
          <p className="eyebrow">
            <span className="eyebrow__n">II</span> {mesa.label}
          </p>
          <p className="eyebrow">Casamentos · Formaturas · Eventos</p>
        </div>
        <h2 className="display mesa__title" data-split>
          Eleve o nível
          <br />
          <em>do seu evento.</em>
        </h2>
        <p className="mesa__body" data-rise>
          {mesa.body}
        </p>
      </div>

      <div className="mesa__pin">
        <div className="mesa__track">
          {mesa.photos.map((p, i) => (
            <figure key={p.src} className={`mesa__fig mesa__fig--${SHAPES[i]} mesa__fig--${i}`}>
              <div className="mesa__frame">
                <Img src={p.src} alt={p.alt} sizes="(max-width: 899px) 78vw, 34vw" />
              </div>
              <figcaption>
                <small>{String(i + 1).padStart(2, '0')}</small>
                {p.caption}
              </figcaption>
            </figure>
          ))}
          <ul className="mesa__facts">
            {mesa.facts.map((f) => (
              <li key={f.l}>
                <strong>{f.n}</strong>
                <span>{f.l}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
