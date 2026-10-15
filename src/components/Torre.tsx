import { lazy, Suspense, useMemo, useRef, useState, type CSSProperties } from 'react';
import { macaronColors, macaronFlavors, torre, towerSizes } from '../content';
import { brl } from '../lib/env';
import { useReveal } from '../lib/reveal';
import { sendOrder } from '../lib/order';
import type { Mode, TowerConfig } from '../gl/towerLayout';
import Img from './Img';

const Tower = lazy(() => import('../gl/Tower'));

const MAX_COLORS = 4;
const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'degrade', label: 'Degradê', hint: 'do topo à base' },
  { id: 'intercalado', label: 'Intercalado', hint: 'andar a andar' },
  { id: 'misto', label: 'Misto', hint: 'cores sorteadas' },
];

/** número legível sobre a cor da amostra */
const ink = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.62 ? 'rgba(42, 27, 19, 0.72)' : 'rgba(255, 255, 255, 0.94)';
};

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`);

export default function Torre() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  // ponto de partida parecido com a torre da foto do cardápio: rosa que vira laranja
  const [floors, setFloors] = useState(7);
  const [colors, setColors] = useState<number[]>([2, 27, 4]);
  const [mode, setMode] = useState<Mode>('degrade');
  const [flavors, setFlavors] = useState<number[]>([19, 18, 24]);
  const [note, setNote] = useState('');

  const config: TowerConfig = useMemo(() => ({ floors, colors, mode, flavors }), [floors, colors, mode, flavors]);
  const size = towerSizes.find((s) => s.floors === floors)!;

  const toggleColor = (i: number) => {
    setNote('');
    setColors((c) => {
      if (c.includes(i)) return c.length > 1 ? c.filter((x) => x !== i) : c;
      if (c.length >= MAX_COLORS) {
        setNote(`Até ${MAX_COLORS} cores por torre. Toque numa escolhida para trocar.`);
        return c;
      }
      return [...c, i];
    });
  };
  const toggleFlavor = (i: number) => setFlavors((f) => (f.includes(i) ? f.filter((x) => x !== i) : [...f, i]));

  const message = [
    'Olá, Maison Doce! Gostaria de um orçamento de torre de macarons:',
    `• Tamanho: ${floors} andares (${size.units} macarons), ${brl(size.price)}`,
    `• Cores da cartela: nº ${list(colors.map((c) => String(c + 1)))}${colors.length > 1 ? `, ${MODES.find((m) => m.id === mode)!.label.toLowerCase()}` : ''}`,
    `• Sabores: ${flavors.length ? list(flavors.map((f) => macaronFlavors[f].name)) : 'quero sugestões'}`,
    'Data e local do evento: ',
  ].join('\n');

  return (
    <section className="torre" id="torre" ref={root}>
      <div className="sec-head">
        <p className="eyebrow">
          <span className="eyebrow__n">IV</span> {torre.label}
        </p>
        <p className="eyebrow">De 65 a 210 macarons</p>
      </div>

      {/* primeiro o macaron de verdade, depois a simulação */}
      <div className="mac">
        <figure className="mac__hero" data-veil>
          <Img src={torre.intro.hero.src} alt={torre.intro.hero.alt} sizes="(max-width: 899px) 92vw, 40vw" />
          <figcaption className="casa__badge">Foto real</figcaption>
        </figure>

        <div className="mac__copy">
          <p className="eyebrow eyebrow--gold" data-rise>
            {torre.intro.kicker}
          </p>
          <h2 className="display mac__title" data-split>
            {torre.intro.title[0]}
            <br />
            <em>{torre.intro.title[1]}</em>
          </h2>
          <p className="mac__body" data-rise>
            {torre.intro.body}
          </p>
          <ul className="mac__facts" data-rise>
            {torre.intro.facts.map((f) => (
              <li key={f.l}>
                <strong>{f.n}</strong>
                <span>{f.l}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mac__strip">
          {torre.intro.photos.map((p, i) => (
            <figure key={p.src} className={`mac__fig mac__fig--${i}`} data-veil={0.1 + i * 0.12}>
              <div className="mac__frame">
                <Img src={p.src} alt={p.alt} sizes="(max-width: 899px) 30vw, 14vw" />
              </div>
              <figcaption>{p.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>

      <p className="torre__demo" data-rise>
        <span aria-hidden="true" />
        {torre.demo}
      </p>

      <div className="torre__grid">
        <div className="torre__stage">
          <Suspense fallback={<div className="tower" />}>
            <Tower config={config} />
          </Suspense>
          <p className="torre__hint" aria-hidden="true">
            <span /> {torre.hintDrag}
          </p>
          <p className="torre__count" aria-live="polite">
            <strong>{size.units}</strong>
            <span>
              macarons
              <br />
              {floors} andares
            </span>
          </p>
        </div>

        <div className="torre__panel">
          <h2 className="display torre__title" data-split>
            {torre.title[0]}
            <br />
            <em>{torre.title[1]}</em>
          </h2>
          <p className="torre__body" data-rise>
            {torre.body}
          </p>

          <fieldset className="step" data-rise>
            <legend>
              <small>01</small> Tamanho
            </legend>
            <div className="sizes" role="radiogroup" aria-label="Número de andares">
              {towerSizes.map((s) => (
                <button
                  key={s.floors}
                  role="radio"
                  aria-checked={floors === s.floors}
                  className={`sizes__opt ${floors === s.floors ? 'is-on' : ''}`}
                  onClick={() => setFloors(s.floors)}
                >
                  <b>{s.floors}</b>
                  <span>andares</span>
                </button>
              ))}
            </div>
            <p className="step__meta">
              {size.units} macarons · <strong>{brl(size.price)}</strong> · todos os pedidos incluem a torre
            </p>
          </fieldset>

          <fieldset className="step" data-rise>
            <legend>
              <small>02</small> Cores da cartela <span className="step__aside">até {MAX_COLORS}</span>
            </legend>
            <div className="swatches">
              {macaronColors.map((hex, i) => {
                const k = colors.indexOf(i);
                return (
                  <button
                    key={hex + i}
                    className={`swatch ${k >= 0 ? 'is-on' : ''}`}
                    style={{ '--c': hex, '--t': ink(hex) } as CSSProperties}
                    onClick={() => toggleColor(i)}
                    aria-pressed={k >= 0}
                    aria-label={`Cor ${i + 1}${k >= 0 ? `, escolhida em ${k + 1}º` : ''}`}
                  >
                    <span>{i + 1}</span>
                    {k >= 0 && colors.length > 1 && <i>{k + 1}</i>}
                  </button>
                );
              })}
            </div>
            <div className="modes" role="radiogroup" aria-label="Como as cores se distribuem">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  role="radio"
                  aria-checked={mode === m.id}
                  disabled={colors.length < 2}
                  className={`modes__opt ${mode === m.id ? 'is-on' : ''}`}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                  <small>{m.hint}</small>
                </button>
              ))}
            </div>
            <p className="step__note" aria-live="polite">
              {note}
            </p>
          </fieldset>

          <fieldset className="step" data-rise>
            <legend>
              <small>03</small> Sabores <span className="step__aside">{flavors.length} escolhidos</span>
            </legend>
            <div className="flavors">
              {macaronFlavors.map((f, i) => (
                <button
                  key={f.name}
                  className={`flavor ${flavors.includes(i) ? 'is-on' : ''}`}
                  aria-pressed={flavors.includes(i)}
                  onClick={() => toggleFlavor(i)}
                  style={{ '--f': f.fill } as CSSProperties}
                >
                  <i aria-hidden="true" />
                  {f.name}
                  {f.tag && <small>{f.tag}</small>}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="order" data-rise>
            <div className="order__sum">
              <p className="eyebrow">Sua torre</p>
              <p className="order__total">{brl(size.price)}</p>
              <p className="order__line">
                {floors} andares · {size.units} macarons · {colors.length} {colors.length > 1 ? 'cores' : 'cor'} · {flavors.length}{' '}
                {flavors.length === 1 ? 'sabor' : 'sabores'}
              </p>
            </div>
            <button className="btn btn--solid" onClick={() => sendOrder(message)} data-cursor="enviar">
              Pedir esta torre
            </button>
            <p className="order__fine">Abre o WhatsApp com o pedido escrito.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
