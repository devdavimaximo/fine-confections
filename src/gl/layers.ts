import { clamp } from '../lib/env';
import { ANCHORS, H, R, project, toWorld, type Frame } from './timeline';

export type LayerKey = keyof typeof ANCHORS;
/** de cima para baixo, na ordem em que aparecem */
export const LAYER_KEYS: LayerKey[] = ['gold', 'coat', 'cream', 'jam', 'sponge', 'crunch'];

/** de que lado da face cada legenda fica (a cobertura e a base são a borda esquerda do corte) */
const SIDE: Record<LayerKey, 'l' | 'r'> = { gold: 'r', coat: 'l', cream: 'r', sponge: 'r', jam: 'r', crunch: 'l' };

/** no celular a face ocupa a largura: legendas entram por cima dela, com deslocamento curto */
const NARROW: Record<LayerKey, [number, number]> = {
  gold: [34, -24],
  coat: [24, 0],
  cream: [30, -6],
  jam: [30, -10],
  sponge: [30, 10],
  crunch: [24, 30],
};

/** elementos do DOM das legendas; o Hero registra, o loop do WebGL escreve */
export const layerEls: {
  root: HTMLElement | null;
  labels: Partial<Record<LayerKey, HTMLElement>>;
  lines: Partial<Record<LayerKey, SVGLineElement>>;
  dots: Partial<Record<LayerKey, SVGCircleElement>>;
} = { root: null, labels: {}, lines: {}, dots: {} };

const widths: Partial<Record<LayerKey, number>> = {};

/** chamado a cada quadro do canvas: posiciona legendas sobre as camadas */
export function placeLayers(f: Frame, w: number, h: number) {
  const root = layerEls.root;
  if (!root) return;
  const show = clamp((f.macro - 0.45) / 0.4);
  root.style.opacity = String(show);
  if (show <= 0) return;

  // silhueta da face do corte na tela: os quatro cantos do retângulo
  const pts = [
    [0, H, R],
    [0, H, -R],
    [0, 0, R],
    [0, 0, -R],
  ].map((q) => project(f, toWorld(q as [number, number, number], f.offL, f.angL), w, h));
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const narrow = w < 700;

  LAYER_KEYS.forEach((key, i) => {
    const label = layerEls.labels[key];
    const line = layerEls.lines[key];
    const dot = layerEls.dots[key];
    if (!label) return;
    const lw = (widths[key] ??= label.offsetWidth) + 12;
    const p = project(f, toWorld(ANCHORS[key], f.offL, f.angL), w, h);

    let side = SIDE[key];
    let lx: number;
    let ly: number;
    if (narrow) {
      side = 'r';
      lx = clamp(p.x + NARROW[key][0], 12, w - 12 - lw);
      ly = clamp(p.y + NARROW[key][1], 90, h - 60);
    } else {
      lx = side === 'l' ? clamp(minX - 48, lw + 16, w) : clamp(maxX + 48, 0, w - lw - 16);
      ly = clamp(p.y + (key === 'gold' ? -10 : 0), 100, h - 40);
    }

    // seis legendas: entram em sequência curta para a última fechar antes do fim do macro
    const local = clamp((f.macro - 0.55 - i * 0.045) / 0.18);
    label.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`;
    label.style.opacity = String(local);
    label.dataset.side = side;
    if (line) {
      // a linha nasce no ponto e cresce até a legenda
      line.setAttribute('x1', p.x.toFixed(1));
      line.setAttribute('y1', p.y.toFixed(1));
      line.setAttribute('x2', (p.x + (lx - p.x) * local).toFixed(1));
      line.setAttribute('y2', (p.y + (ly - p.y) * local).toFixed(1));
    }
    if (dot) {
      dot.setAttribute('cx', p.x.toFixed(1));
      dot.setAttribute('cy', p.y.toFixed(1));
      dot.setAttribute('r', (3.2 * local).toFixed(2));
    }
  });
}

/** fontes trocadas ou resize: mede de novo a largura das legendas */
export const resetLayerWidths = () => LAYER_KEYS.forEach((k) => delete widths[k]);
