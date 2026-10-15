import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { degustacao, type MenuItem } from '../content';
import { brl, REDUCED } from '../lib/env';
import { sendOrder } from '../lib/order';
import { scroller, scrollToId } from '../lib/scroller';
import { thumb } from './Img';

const tasting = degustacao.options[0];

/**
 * Ficha do doce no celular: sobe de baixo como uma gaveta, mostra o doce num
 * prato grande, preço por unidade e o pedido já escrito. Desliza para o lado
 * para o doce vizinho da mesma categoria; desliza para baixo (ou toca fora) para
 * fechar. Enquanto aberta, a página não rola por trás.
 */
export default function MenuSheet({
  items,
  label,
  index,
  onIndex,
  onClose,
}: {
  /** a lista da aba aberta (em "Todos", os 44 doces) */
  items: MenuItem[];
  /** categoria do doce na posição k */
  label: (k: number) => string;
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const dir = useRef(0);
  const [closing, setClosing] = useState(false);
  const item = items[index];
  const n = items.length;

  // trava a página e devolve o foco a quem abriu
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    document.documentElement.classList.add('sheet-open');
    scroller.lenis?.stop();
    closeBtn.current?.focus({ preventScroll: true });
    return () => {
      document.documentElement.classList.remove('sheet-open');
      scroller.lenis?.start();
      back?.focus?.({ preventScroll: true });
    };
  }, []);

  // entrada
  useLayoutEffect(() => {
    const d = REDUCED ? 0.01 : 1;
    gsap.fromTo(root.current!.querySelector('.msheet__veil'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 * d });
    gsap.fromTo(panel.current, { yPercent: 100 }, { yPercent: 0, duration: 0.8 * d, ease: 'expo.out' });
  }, []);

  // troca de doce: o prato chega do lado do gesto e gira um pouco
  useLayoutEffect(() => {
    const el = panel.current?.querySelector('.msheet__dish');
    const tx = panel.current?.querySelectorAll('[data-swap]');
    if (!el || REDUCED) return;
    gsap.fromTo(el, { xPercent: dir.current * 40, rotate: dir.current * 12, autoAlpha: 0 }, { xPercent: 0, rotate: 0, autoAlpha: 1, duration: 0.7, ease: 'expo.out' });
    if (tx) gsap.fromTo(tx, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.04 });
  }, [item.slug]);

  // vizinhos já carregados: a troca não pisca
  useEffect(() => {
    [index - 1, index + 1].forEach((k) => {
      const it = items[(k + n) % n];
      const im = new Image();
      im.src = thumb(it.slug);
    });
  }, [index, items, n]);

  const close = () => {
    if (closing) return;
    setClosing(true);
    const d = REDUCED ? 0.01 : 1;
    gsap.to(root.current!.querySelector('.msheet__veil'), { autoAlpha: 0, duration: 0.4 * d });
    gsap.to(panel.current, { yPercent: 100, duration: 0.5 * d, ease: 'power3.in', onComplete: onClose });
  };

  const go = (step: number) => {
    dir.current = step;
    onIndex((index + step + n) % n);
  };

  // teclado: Esc fecha, setas trocam
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  // gestos: lado troca de doce, para baixo fecha
  const drag = useRef<{ x: number; y: number; axis: '' | 'x' | 'y'; id: number } | null>(null);
  const down = (e: RPointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    drag.current = { x: e.clientX, y: e.clientY, axis: '', id: e.pointerId };
  };
  const move = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.axis && Math.hypot(dx, dy) > 8) {
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      (e.currentTarget as HTMLElement).setPointerCapture?.(d.id);
    }
    if (d.axis === 'y' && dy > 0) gsap.set(panel.current, { y: dy });
    if (d.axis === 'x') gsap.set(panel.current!.querySelector('.msheet__dish'), { x: dx * 0.6, rotate: dx * 0.02 });
  };
  const up = (e: RPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.axis === 'y') {
      if (dy > 110) {
        gsap.set(panel.current, { y: 0, yPercent: (dy / panel.current!.offsetHeight) * 100 });
        close();
      } else gsap.to(panel.current, { y: 0, duration: 0.5, ease: 'expo.out' });
    }
    if (d.axis === 'x') {
      gsap.set(panel.current!.querySelector('.msheet__dish'), { x: 0, rotate: 0 });
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    }
  };

  const message = `Olá, Maison Doce! Tenho interesse no ${item.name} (${brl(item.price)} a unidade) para o meu evento.\nData, local e número de convidados: `;

  const toTasting = () => {
    close();
    window.setTimeout(() => scrollToId('degustacao', 1.6), 520);
  };

  return createPortal(
    <div className="msheet" ref={root} role="dialog" aria-modal="true" aria-labelledby="msheet-name">
      <div className="msheet__veil" onClick={close} />
      <div className="msheet__panel" ref={panel} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className="msheet__grab" aria-hidden="true" />

        <div className="msheet__top">
          <p className="eyebrow">
            {label(index)} <span className="msheet__count">{String(index + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
          </p>
          <button className="msheet__close" ref={closeBtn} onClick={close} aria-label="Fechar">
            <i />
            <i />
          </button>
        </div>

        <div className="msheet__stage">
          <button className="msheet__nav msheet__nav--prev" onClick={() => go(-1)} aria-label="Doce anterior">
            ‹
          </button>
          <div className="msheet__dish">
            <div className="plate plate--sheet">
              <div className="plate__rim" />
              <img key={item.slug} className="plate__img" src={thumb(item.slug)} alt={item.name} draggable={false} />
            </div>
          </div>
          <button className="msheet__nav msheet__nav--next" onClick={() => go(1)} aria-label="Próximo doce">
            ›
          </button>
        </div>

        <div className="msheet__info" aria-live="polite">
          <p className="msheet__tags" data-swap>
            {item.isNew && <b className="carta__new">novo</b>}
            {item.note && <span className="msheet__note">{item.note}</span>}
          </p>
          <h3 className="msheet__name" id="msheet-name" data-swap>
            {item.name}
          </h3>
          <p className="msheet__price" data-swap>
            {brl(item.price)} <small>a unidade</small>
          </p>
        </div>

        <div className="msheet__actions">
          <button className="btn btn--solid msheet__cta" onClick={() => sendOrder(message)}>
            Quero este doce no meu evento
          </button>
          <p className="msheet__fine">Abre o WhatsApp com o pedido escrito.</p>
          <button className="msheet__taste" onClick={toTasting}>
            <span>Quer provar antes?</span> Caixa degustação com {tasting.n} doces · {brl(tasting.price)} →
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
