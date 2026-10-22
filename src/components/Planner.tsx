import { useEffect, useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import { brand, planner } from '../content';
import { brl, clamp, damp, REDUCED } from '../lib/env';
import { useReveal } from '../lib/reveal';
import { sendOrder } from '../lib/order';

const fmt = (n: number) => n.toLocaleString('pt-BR');

/** taxa de montagem pela faixa de unidades da tabela; fora das faixas, sob consulta */
function assemblyFee(units: number) {
  const band = planner.assembly.find((b) => units >= b.from && units <= b.to);
  return band?.price ?? null;
}

/** média de investimento da casa, interpolada entre os pontos da tabela */
function estimate(guests: number) {
  const r = planner.references;
  if (guests < r[0].guests || guests > r[r.length - 1].guests) return null;
  for (let i = 0; i < r.length - 1; i++) {
    const a = r[i];
    const b = r[i + 1];
    if (guests >= a.guests && guests <= b.guests) {
      const t = (guests - a.guests) / (b.guests - a.guests);
      return Math.round((a.price + (b.price - a.price) * t) / 50) * 50;
    }
  }
  return null;
}

const TONES = ['#5b3a1e', '#e9dcb9', '#9fb35a', '#c9a256', '#7d1f1c', '#cf9a63', '#3a2216', '#f1e6cf'];

/** caixa vista de cima: cada bombom é dez doces */
function DotField({ units }: { units: number }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const target = useRef(units);
  target.current = units;

  useEffect(() => {
    const c = cv.current!;
    const ctx = c.getContext('2d')!;
    const MAXD = 340;
    const scale = new Float32Array(MAXD);
    const tones = Array.from({ length: MAXD }, (_, i) => TONES[Math.floor(Math.abs(Math.sin(i * 91.7) * 1e4) % TONES.length)]);
    let raf = 0;
    let visible = false;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const w = c.clientWidth;
      const h = c.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (c.width !== Math.round(w * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cols = w < 520 ? 20 : 32;
      const cell = w / cols;
      const n = Math.round(target.current / 10);
      for (let i = 0; i < MAXD; i++) {
        const want = i < n ? 1 : 0;
        scale[i] = REDUCED ? want : damp(scale[i], want, 9 - Math.min(6, Math.abs(i - n) * 0.08), dt);
        const s = scale[i];
        const x = (i % cols) * cell + cell / 2;
        const y = Math.floor(i / cols) * cell + cell / 2;
        if (y > h + cell) break;
        // forminha de papel
        ctx.beginPath();
        ctx.arc(x, y, cell * 0.44, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(42,27,19,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (s < 0.02) continue;
        const r = cell * 0.34 * clamp(s, 0, 1.2);
        const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.55)');
        g.addColorStop(0.35, tones[i]);
        g.addColorStop(1, tones[i]);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
      if (visible) raf = requestAnimationFrame(draw);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    });
    io.observe(c);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas className="dots" ref={cv} aria-hidden="true" />;
}

export default function Planner() {
  const root = useRef<HTMLElement>(null);
  const [guests, setGuests] = useState(planner.guests.initial);
  const [per, setPer] = useState(planner.perGuest.initial);
  const [waiter, setWaiter] = useState(false);
  const unitsEl = useRef<HTMLSpanElement>(null);
  useReveal(root);

  const units = guests * per;
  const fee = assemblyFee(units);
  const est = estimate(guests);
  const ref = planner.references.reduce((a, b) => (Math.abs(b.guests - guests) < Math.abs(a.guests - guests) ? b : a));

  // o número de doces rola até o novo valor em vez de saltar
  const shown = useRef({ v: units });
  useEffect(() => {
    const t = gsap.to(shown.current, {
      v: units,
      duration: REDUCED ? 0 : 0.7,
      ease: 'power3.out',
      onUpdate: () => {
        if (unitsEl.current) unitsEl.current.textContent = fmt(Math.round(shown.current.v));
      },
    });
    return () => void t.kill();
  }, [units]);

  const pct = ((guests - planner.guests.min) / (planner.guests.max - planner.guests.min)) * 100;

  const message = [
    `Olá, ${brand.name}! Estou planejando a mesa de doces finos:`,
    `• ${guests} convidados, cerca de ${fmt(units)} doces (${per} por pessoa)`,
    waiter ? '• Gostaria do serviço de copeiro durante o evento' : '',
    'Data e local do evento: ',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <section className="planner" id="planeje" ref={root}>
      <div className="sec-head">
        <p className="eyebrow">
          <span className="eyebrow__n">VI</span> {planner.label}
        </p>
        <p className="eyebrow">Dados da casa</p>
      </div>

      <div className="planner__grid">
        <div className="planner__copy">
          <h2 className="display planner__title" data-split>
            {planner.title[0]}
            <br />
            <em>{planner.title[1]}</em>
          </h2>
          <p className="planner__body" data-rise>
            {planner.body}
          </p>

          <div className="ctrl" data-rise>
            <label className="ctrl__label" htmlFor="guests">
              Convidados <output>{guests}</output>
            </label>
            <input
              id="guests"
              className="range"
              type="range"
              min={planner.guests.min}
              max={planner.guests.max}
              step={planner.guests.step}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              style={{ '--p': `${pct}%` } as CSSProperties}
              data-cursor="arrastar"
            />
            <div className="ctrl__scale" aria-hidden="true">
              <span>{planner.guests.min}</span>
              <span>{planner.guests.max}</span>
            </div>
          </div>

          <div className="ctrl" data-rise>
            <p className="ctrl__label">Doces por pessoa</p>
            <div className="seg" role="radiogroup" aria-label="Doces por pessoa">
              {[6, 7, 8].map((n) => (
                <button key={n} role="radio" aria-checked={per === n} className={`seg__opt ${per === n ? 'is-on' : ''}`} onClick={() => setPer(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="planner__out">
          <p className="planner__units">
            <span ref={unitsEl}>{fmt(units)}</span>
            <small>doces finos</small>
          </p>
          <DotField units={units} />
          <p className="planner__legend">cada círculo, dez doces</p>

          <dl className="sheet">
            <div>
              <dt>Média de investimento</dt>
              <dd>{est ? `≈ ${brl(est)}` : 'sob consulta'}</dd>
            </div>
            <div>
              <dt>Taxa de montagem</dt>
              <dd>{fee ? brl(fee) : 'sob consulta'}</dd>
            </div>
            <div>
              <dt>
                <label className="check">
                  <input type="checkbox" checked={waiter} onChange={(e) => setWaiter(e.target.checked)} />
                  <span aria-hidden="true" />
                  Copeiro durante o evento
                </label>
              </dt>
              <dd>{waiter ? brl(planner.waiter) : '—'}</dd>
            </div>
          </dl>

          <table className="refs">
            <caption>Média de investimento em mesa de doces finos</caption>
            <thead>
              <tr>
                <th scope="col">Convidados</th>
                <th scope="col">Doces</th>
                <th scope="col">Investimento</th>
              </tr>
            </thead>
            <tbody>
              {planner.references.map((r) => (
                <tr key={r.guests} className={r === ref ? 'is-near' : ''}>
                  <td>{r.guests}</td>
                  <td>{fmt(r.units)} un</td>
                  <td>{brl(r.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="planner__caveat">{planner.caveat}</p>
          <button className="btn btn--solid" onClick={() => sendOrder(message)} data-cursor="enviar">
            Pedir orçamento
          </button>
        </div>
      </div>
    </section>
  );
}
