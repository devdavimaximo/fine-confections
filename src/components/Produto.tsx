import { lazy, Suspense, useMemo, useRef, useState, type CSSProperties } from 'react';
import { produto, produtoFlavors, produtoPapers, produtoRibbons } from '../content';
import { brl } from '../lib/env';
import { useReveal } from '../lib/reveal';
import { sendOrder } from '../lib/order';
import type { Focus, ProductConfig } from '../gl/BemCasado';

const BemCasado = lazy(() => import('../gl/BemCasado'));

/**
 * Produto-assinatura configurável: um produto só, variações de aparência.
 * Tudo o que muda de ateliê para ateliê está em `produto*` (content.ts).
 */
export default function Produto() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  const [paper, setPaper] = useState(produto.initial.paper);
  const [ribbon, setRibbon] = useState(produto.initial.ribbon);
  const [flavor, setFlavor] = useState(produto.initial.flavor);
  const [names, setNames] = useState('');
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState(produto.guests.initial);
  // a câmera acompanha a escolha: embrulho para papel, fita e tag; corte para o sabor
  const [focus, setFocus] = useState<Focus>('wrap');

  const config: ProductConfig = useMemo(() => ({ paper, ribbon, flavor, names, date }), [paper, ribbon, flavor, names, date]);
  const g = produto.guests;
  const pct = ((guests - g.min) / (g.max - g.min)) * 100;
  const total = produto.price != null ? produto.price * guests : null;

  const message = [
    `Olá, Maison Doce! Gostaria de um orçamento de ${produto.label.toLowerCase()}:`,
    `• ${guests} unidades`,
    `• Papel ${produtoPapers[paper].name.toLowerCase()}, fita ${produtoRibbons[ribbon].name.toLowerCase()}`,
    `• Recheio: ${produtoFlavors[flavor].name.toLowerCase()}`,
    names.trim() ? `• Tag: "${names.trim()}"${date.trim() ? ` · ${date.trim()}` : ''}` : '• Sem tag personalizada',
    'Data do evento: ',
  ].join('\n');

  return (
    <section className="produto" id="bem-casado" ref={root}>
      <div className="sec-head">
        <p className="eyebrow">
          <span className="eyebrow__n">IV</span> {produto.label}
        </p>
        <p className="eyebrow">{produto.eyebrow}</p>
      </div>

      <p className="produto__demo" data-rise>
        <span aria-hidden="true" />
        {produto.demo}
      </p>

      <div className="produto__grid">
        <div className="produto__stage">
          <Suspense fallback={<div className="product3d" />}>
            <BemCasado config={config} focus={focus} />
          </Suspense>
          <p className="produto__hint" aria-hidden="true">
            <span /> {produto.hintDrag}
          </p>
          <button className="produto__focus" onClick={() => setFocus((f) => (f === 'cut' ? 'wrap' : 'cut'))} aria-pressed={focus === 'cut'} data-cursor="ver">
            {focus === 'cut' ? 'Ver o embrulho' : 'Ver por dentro'}
          </button>
        </div>

        <div className="produto__panel">
          <h2 className="display produto__title" data-split>
            {produto.title[0]}
            <br />
            <em>{produto.title[1]}</em>
          </h2>
          <p className="produto__body" data-rise>
            {produto.body}
          </p>

          <fieldset className="step" data-rise>
            <legend>
              <small>01</small> Embrulho
            </legend>
            <div className="finish">
              <p className="finish__k">
                Papel crepom <em>{produtoPapers[paper].name}</em>
              </p>
              <div className="tints" role="radiogroup" aria-label="Cor do papel">
                {produtoPapers.map((p, i) => (
                  <button
                    key={p.name}
                    role="radio"
                    aria-checked={paper === i}
                    aria-label={p.name}
                    title={p.name}
                    className={`tint ${paper === i ? 'is-on' : ''}`}
                    style={{ '--c': p.hex } as CSSProperties}
                    onClick={() => {
                      setPaper(i);
                      setFocus('wrap');
                    }}
                  />
                ))}
              </div>
              <p className="finish__k">
                Fita de cetim <em>{produtoRibbons[ribbon].name}</em>
              </p>
              <div className="tints" role="radiogroup" aria-label="Cor da fita">
                {produtoRibbons.map((r, i) => (
                  <button
                    key={r.name}
                    role="radio"
                    aria-checked={ribbon === i}
                    aria-label={r.name}
                    title={r.name}
                    className={`tint tint--satin ${ribbon === i ? 'is-on' : ''}`}
                    style={{ '--c': r.hex } as CSSProperties}
                    onClick={() => {
                      setRibbon(i);
                      setFocus('wrap');
                    }}
                  />
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset className="step" data-rise>
            <legend>
              <small>02</small> Recheio
            </legend>
            <div className="chips" role="radiogroup" aria-label="Sabor do recheio">
              {produtoFlavors.map((f, i) => (
                <button
                  key={f.name}
                  role="radio"
                  aria-checked={flavor === i}
                  className={`flavor ${flavor === i ? 'is-on' : ''}`}
                  style={{ '--f': f.fill } as CSSProperties}
                  onClick={() => {
                    setFlavor(i);
                    setFocus('cut');
                  }}
                >
                  <i aria-hidden="true" />
                  {f.name}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="step" data-rise>
            <legend>
              <small>03</small> Tag com os nomes
            </legend>
            <label className="engrave">
              <span>Nomes</span>
              <input
                type="text"
                value={names}
                maxLength={produto.tag.max}
                placeholder={produto.tag.namesPlaceholder}
                onChange={(e) => setNames(e.target.value)}
                onFocus={() => setFocus('wrap')}
              />
              <small>
                {names.length}/{produto.tag.max}
              </small>
            </label>
            <label className="engrave">
              <span>Data</span>
              <input type="text" value={date} maxLength={16} placeholder={produto.tag.datePlaceholder} onChange={(e) => setDate(e.target.value)} onFocus={() => setFocus('wrap')} />
            </label>
          </fieldset>

          <fieldset className="step" data-rise>
            <legend>
              <small>04</small> Quantidade
            </legend>
            <div className="ctrl">
              <label className="ctrl__label" htmlFor="bc-guests">
                Convidados <output>{guests}</output>
              </label>
              <input
                id="bc-guests"
                className="range"
                type="range"
                min={g.min}
                max={g.max}
                step={g.step}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                style={{ '--p': `${pct}%` } as CSSProperties}
                data-cursor="arrastar"
              />
              <div className="ctrl__scale" aria-hidden="true">
                <span>{g.min}</span>
                <span>{g.max}</span>
              </div>
            </div>
          </fieldset>

          <div className="order" data-rise>
            <div className="order__sum">
              <p className="eyebrow">Seus {produto.label.toLowerCase()}</p>
              <p className="order__total">{total != null ? brl(total) : 'Sob consulta'}</p>
              <p className="order__line">
                {guests} unidades{produto.price != null ? ` · ${brl(produto.price)} cada` : ''} · {produtoFlavors[flavor].name.toLowerCase()}
              </p>
              <p className="order__line">
                Papel {produtoPapers[paper].name.toLowerCase()}, fita {produtoRibbons[ribbon].name.toLowerCase()}
                {names.trim() ? `, tag "${names.trim()}"` : ''}
              </p>
            </div>
            <button className="btn btn--solid" onClick={() => sendOrder(message)} data-cursor="enviar">
              Pedir orçamento
            </button>
            <p className="order__fine">Abre o WhatsApp com o pedido escrito.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
