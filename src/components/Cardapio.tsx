import { useEffect, useRef, useState, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { menu, menuCount, type MenuGroup, type MenuItem } from '../content';
import { brl, FINE_POINTER } from '../lib/env';
import { useReveal } from '../lib/reveal';
import { thumb } from './Img';
import MenuSheet from './MenuSheet';

/** mesma condição do CSS que esconde o prato: no celular o toque abre a ficha */
const sheetMode = () => window.matchMedia('(max-width: 899px), (pointer: coarse) and (max-width: 1100px)').matches;

const ZOOM = 2.6;

/** "Todos" abre primeiro: o cardápio inteiro, separado por categoria */
const ALL = 'todos';
const TABS = [{ id: ALL, title: 'Todos', count: menuCount }, ...menu.map((g) => ({ id: g.id, title: g.title, count: g.items.length }))];
type Entry = { item: MenuItem; group: MenuGroup };

/**
 * Categorias em duas colunas, cada uma inteira numa coluna só: em ordem, cada
 * categoria vai para a coluna mais curta (Brigadeiros + Lançamentos | Bombons + Minis).
 */
function balance(groups: MenuGroup[]) {
  const cols: MenuGroup[][] = [[], []];
  const size = [0, 0];
  for (const g of groups) {
    const c = size[0] <= size[1] ? 0 : 1;
    cols[c].push(g);
    size[c] += g.items.length + 2; // título e subtítulo pesam como ~2 linhas
  }
  return cols;
}

/**
 * Cardápio como carta de restaurante: nome, pontilhado, preço. Ao lado, um prato
 * de porcelana fixo mostra o doce sob o cursor, com lupa ao passar sobre ele.
 * No celular, tocar num doce abre a ficha (MenuSheet) com foto grande e pedido.
 * Fotos: public/media/menu/<slug>.webp, geradas por scripts/images.mjs.
 */
export default function Cardapio() {
  const root = useRef<HTMLElement>(null);
  const [tab, setTab] = useState(ALL);
  const groups = tab === ALL ? menu : menu.filter((g) => g.id === tab);
  const cols = tab === ALL ? balance(groups) : [groups];
  // lista corrida da aba, na ordem das colunas: a ficha do celular navega por ela inteira
  const list: Entry[] = cols.flat().flatMap((g) => g.items.map((item) => ({ item, group: g })));
  const [item, setItem] = useState<MenuItem>(list[0].item);
  const plate = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState<number | null>(null);
  useReveal(root);

  const pick = (i: MenuItem, k: number) => {
    setItem(i);
    if (sheetMode()) setSheet(k);
  };
  const key = (e: RKeyboardEvent, i: MenuItem, k: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(i, k);
    }
  };

  // lupa: um círculo que segue o cursor e mostra o doce ampliado
  const lensMove = (e: RPointerEvent<HTMLDivElement>) => {
    const L = lens.current;
    const img = plate.current?.querySelector<HTMLImageElement>('.plate__img');
    if (!L || !img) return;
    const r = img.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const inside = Math.hypot(x - r.width / 2, y - r.height / 2) < r.width * 0.52;
    L.classList.toggle('is-on', inside);
    // a lente vira o cursor: o anel do cursor some para não tampar o zoom
    document.documentElement.classList.toggle('lens-on', inside);
    const size = L.offsetWidth;
    const host = L.parentElement!.getBoundingClientRect();
    L.style.transform = `translate3d(${e.clientX - host.left - size / 2}px, ${e.clientY - host.top - size / 2}px, 0)`;
    L.style.backgroundSize = `${r.width * ZOOM}px ${r.height * ZOOM}px`;
    L.style.backgroundPosition = `${size / 2 - x * ZOOM}px ${size / 2 - y * ZOOM}px`;
  };
  const lensOut = () => {
    lens.current?.classList.remove('is-on');
    document.documentElement.classList.remove('lens-on');
  };

  useEffect(() => setItem((tab === ALL ? menu : menu.filter((g) => g.id === tab))[0].items[0]), [tab]);

  // pré-carrega as miniaturas da aba, para o prato trocar sem piscar
  useEffect(() => {
    (tab === ALL ? menu : menu.filter((g) => g.id === tab)).forEach((g) =>
      g.items.forEach((i) => {
        const im = new Image();
        im.src = thumb(i.slug);
      }),
    );
  }, [tab]);

  // troca de doce: o prato gira um pouco, como se alguém o servisse
  useGSAP(
    () => {
      const el = plate.current?.querySelector('.plate__img');
      if (!el) return;
      gsap.fromTo(el, { rotate: -14, scale: 0.86, autoAlpha: 0 }, { rotate: 0, scale: 1, autoAlpha: 1, duration: 0.9, ease: 'expo.out' });
    },
    { dependencies: [item.slug], scope: plate },
  );

  // a lista nova entra em cascata
  useGSAP(
    () => {
      const rows = root.current?.querySelectorAll('.carta__row');
      if (!rows?.length) return;
      gsap.fromTo(rows, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.025 });
      ScrollTrigger.refresh();
    },
    { dependencies: [tab], scope: root },
  );

  return (
    <section className="cardapio" id="cardapio" ref={root}>
      <div className="sec-head">
        <p className="eyebrow">
          <span className="eyebrow__n">III</span> Cardápio
        </p>
        <p className="eyebrow">{menuCount} doces · valores por unidade</p>
      </div>

      <div className="cardapio__top">
        <h2 className="display cardapio__title" data-split>
          O <em>cardápio</em>
        </h2>
        <div className="tabs" role="tablist" aria-label="Categorias do cardápio" data-rise>
          {TABS.map((g) => (
            <button
              key={g.id}
              role="tab"
              aria-selected={tab === g.id}
              aria-controls="carta"
              className={`tabs__tab ${tab === g.id ? 'is-on' : ''}`}
              onClick={() => setTab(g.id)}
            >
              {g.title}
              <sup>{g.count}</sup>
            </button>
          ))}
        </div>
      </div>

      <div className="cardapio__body">
        <div className="cardapio__plate" ref={plate} aria-hidden="true">
          <div className="plate" onPointerMove={FINE_POINTER ? lensMove : undefined} onPointerLeave={lensOut}>
            <div className="plate__rim" />
            <img key={item.slug} className="plate__img" src={thumb(item.slug)} alt="" />
            <div className="plate__lens" ref={lens} style={{ backgroundImage: `url(${thumb(item.slug)})` }} />
          </div>
          <p className="plate__name">{item.name}</p>
          <p className="plate__price">
            {brl(item.price)} <small>un.</small>
          </p>
        </div>

        <div className="carta" id="carta" role="tabpanel" aria-label={tab === ALL ? 'Todos os doces' : groups[0].title}>
          <p className="carta__hint">Toque num doce para ver a foto e pedir</p>
          <div className={`carta__cols ${tab === ALL ? '' : 'carta__cols--one'}`}>
            {cols.map((col, ci) => (
              <div key={ci} className="carta__col">
            {col.map((g) => (
              <section key={g.id} className="carta__sec" aria-label={g.title}>
                <header className="carta__head">
                  <h3>
                    {g.title} <sup>{g.items.length}</sup>
                  </h3>
                  <p>
                    <em>{g.subtitle}</em>
                  </p>
                </header>
                <ul className="carta__list">
                  {g.items.map((i) => {
                    const k = list.findIndex((e) => e.item === i);
                    return (
                      <li
                        key={i.slug}
                        className={`carta__row ${item.slug === i.slug ? 'is-on' : ''}`}
                        onPointerEnter={FINE_POINTER ? () => setItem(i) : undefined}
                        onClick={() => pick(i, k)}
                        onKeyDown={(e) => key(e, i, k)}
                        tabIndex={0}
                        role="button"
                        aria-label={`${i.name}, ${brl(i.price)} a unidade`}
                      >
                        <img className="carta__thumb" src={thumb(i.slug)} alt="" loading="lazy" />
                        <span className="carta__name">
                          {i.name}
                          {i.isNew && <b className="carta__new">novo</b>}
                          {i.note && <small className="carta__note">{i.note}</small>}
                        </span>
                        <span className="carta__dots" aria-hidden="true" />
                        <span className="carta__price">{brl(i.price)}</span>
                        <span className="carta__more" aria-hidden="true">
                          +
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {sheet !== null && (
        <MenuSheet
          items={list.map((e) => e.item)}
          label={(k) => list[k].group.title}
          index={sheet}
          onIndex={(k) => {
            setSheet(k);
            setItem(list[k].item);
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </section>
  );
}
