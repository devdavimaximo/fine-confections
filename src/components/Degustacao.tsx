import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { degustacao } from '../content';
import { brl } from '../lib/env';
import { useReveal } from '../lib/reveal';
import { sendOrder } from '../lib/order';
import Img from './Img';

export default function Degustacao() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  // o número grande conta até o total de doces ao entrar na tela
  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>('.taste__n', root.current).forEach((el) => {
        const end = Number(el.dataset.n);
        const o = { v: 0 };
        gsap.to(o, {
          v: end,
          duration: 1.8,
          ease: 'power3.out',
          onUpdate: () => (el.textContent = String(Math.round(o.v)).padStart(2, '0')),
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        });
      });
      gsap.to('.degust__photo img', {
        yPercent: -8,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    },
    { scope: root },
  );

  const [casa, espaco] = degustacao.options;

  return (
    <section className="degust" id="degustacao" data-tone="dark" ref={root}>
      <div className="sec-head">
        <p className="eyebrow">
          <span className="eyebrow__n">V</span> {degustacao.label}
        </p>
        <p className="eyebrow">Mediante agendamento</p>
      </div>

      <h2 className="display degust__title" data-split>
        {degustacao.title[0]}
        <br />
        <em>{degustacao.title[1]}</em>
      </h2>

      <div className="degust__grid">
        {[casa, espaco].map((o, i) => (
          <article key={o.id} className={`taste taste--${i ? 'b' : 'a'}`} data-rise={i * 0.12}>
            <p className="eyebrow eyebrow--gold">{o.kicker}</p>
            <p className="taste__big">
              <span className="taste__n" data-n={o.n}>
                {o.n}
              </span>
              <span className="taste__unit">{o.unit}</span>
            </p>
            <p className="taste__body">{o.body}</p>
            <p className="taste__terms">{o.terms}</p>
            <div className="taste__foot">
              <p className="taste__price">{brl(o.price)}</p>
              <button className="btn btn--gold" onClick={() => sendOrder(o.message)} data-cursor="agendar">
                {o.cta}
              </button>
            </div>
          </article>
        ))}

        <figure className="degust__photo" data-veil>
          <Img src="degustacao" alt="Caixa degustação da Maison Doce aberta, com brigadeiros e bombons sortidos" sizes="(max-width: 899px) 80vw, 26vw" />
        </figure>
      </div>
    </section>
  );
}
