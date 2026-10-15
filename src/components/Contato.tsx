import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { brand, contato } from '../content';
import { useReveal } from '../lib/reveal';
import { sendOrder, whatsappHref } from '../lib/order';
import { scrollToId } from '../lib/scroller';
import Monogram from './Monogram';

export default function Contato() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  // o monograma gigante sobe devagar por trás do texto
  useGSAP(
    () => {
      gsap.fromTo(
        '.contato__mono',
        { yPercent: 18, rotate: -4 },
        { yPercent: -6, rotate: 0, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom bottom', scrub: true } },
      );
    },
    { scope: root },
  );


  return (
    <footer className="contato" id="contato" data-tone="dark" ref={root}>
      <Monogram className="contato__mono" />

      <div className="sec-head">
        <p className="eyebrow">
          <span className="eyebrow__n">VIII</span> {contato.label}
        </p>
        <p className="eyebrow">{brand.space}</p>
      </div>

      <h2 className="display contato__title" data-split>
        {contato.title[0]}
        <br />
        <em>{contato.title[1]}</em>
      </h2>
      <p className="contato__body" data-rise>
        {contato.body}
      </p>

      <div className="contato__ctas" data-rise="0.1">
        <button className="btn btn--gold btn--lg" onClick={() => sendOrder(contato.message)} data-cursor="conversar">
          Conversar no WhatsApp
        </button>
        <a className="btn btn--line btn--lg" href={whatsappHref()} target="_blank" rel="noreferrer" data-cursor="abrir">
          {brand.whatsappDisplay}
        </a>
      </div>

      <div className="contato__cols">
        <div>
          <p className="eyebrow">Espaço de degustação</p>
          <p>
            {brand.space}
            <br />
            visitas mediante agendamento
          </p>
        </div>
        <div>
          <p className="eyebrow">Entregas</p>
          <p>
            Na cidade
            <br />e região
          </p>
        </div>
        <div>
          <p className="eyebrow">Atendimento</p>
          <p>
            <a href={whatsappHref()} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <br />
            <a href={brand.instagramUrl} target="_blank" rel="noreferrer">
              Instagram
            </a>
          </p>
        </div>
      </div>

      <div className="contato__base">
        <p>
          Site de demonstração, proposta não oficial · marca, fotos e cardápio pertencem a {brand.name}
        </p>
        <button onClick={() => scrollToId('topo', 2.6)} data-cursor="subir">
          Voltar ao topo ↑
        </button>
      </div>
    </footer>
  );
}
