import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { brand, hero, manifesto } from '../content';
import { LITE } from '../lib/env';
import { useReveal } from '../lib/reveal';
import Img from './Img';

export default function Manifesto() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  // as duas fotos andam em velocidades diferentes: profundidade sem 3D
  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      // no celular as duas fotos estão lado a lado: deslocamento menor para não se separarem
      gsap.to(q('.casa__oval'), { yPercent: LITE ? -4 : -10, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.to(q('.casa__arch'), { yPercent: LITE ? -12 : -34, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } });
    },
    { scope: root },
  );

  return (
    <section className="casa" id="casa" ref={root}>
      <div className="sec-head">
        <p className="eyebrow">
          <span className="eyebrow__n">I</span> {manifesto.label}
        </p>
        <p className="eyebrow">{brand.region}</p>
      </div>

      <h2 className="display casa__title" data-split>
        {manifesto.title[0]}
        <br />
        <em>{manifesto.title[1]}</em>
        <br />
        {manifesto.title[2]}
      </h2>

      <div className="casa__grid">
        <figure className="casa__oval" id="foto-real" data-veil>
          <Img src="macarons" alt="Dois macarons de chocolate empilhados, o de cima mordido, mostrando o recheio de caramelo" sizes="(max-width: 899px) 70vw, 30vw" />
          <figcaption className="casa__badge">{hero.realBadge}</figcaption>
        </figure>
        <figure className="casa__arch" data-veil="0.2">
          <Img src="macarons3" alt="Macarons de pistache, um deles mordido" sizes="(max-width: 899px) 40vw, 16vw" />
        </figure>

        <div className="casa__copy">
          <p className="casa__body" data-words>
            {manifesto.body}
          </p>
          <ul className="casa__pillars">
            {manifesto.pillars.map((p, i) => (
              <li key={p.k} data-rise={i * 0.08}>
                <small>{String(i + 1).padStart(2, '0')}</small>
                <span>{p.k}</span>
                <em>{p.v}</em>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
