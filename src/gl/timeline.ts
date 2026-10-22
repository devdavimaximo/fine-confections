import { clamp, easeInOut, easeOut, lerp, smooth, span } from '../lib/env';

/**
 * O corte do entremet, em quatro tempos de scroll:
 *   0.00–0.20  o bolo para de balançar e se apresenta
 *   0.16–0.34  a lâmina: um fio de ouro cruza o topo e desce pela face
 *   0.34–0.60  as metades se abrem como um livro
 *   0.62–0.90  a câmera entra no corte e as camadas ganham nome
 * Tudo aqui é espelhado em cakeShader.ts (mesmas constantes, mesma rotação),
 * para que as legendas do DOM caiam exatamente sobre as camadas do shader.
 */

export const R = 0.9; // raio
export const H = 1.12; // altura: um entremet alto, H/2R ≈ 0,62

export type V3 = [number, number, number];

export type Frame = {
  ro: V3;
  ta: V3;
  focal: number;
  offL: V3;
  offR: V3;
  angL: number;
  angR: number;
  seam: number;
  open: number;
  macro: number;
  /** direção da luz-chave (para a luz): atrás-direita na vitrine, frontal no corte */
  key: V3;
};

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const mix = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3): V3 => scale(a, 1 / Math.hypot(a[0], a[1], a[2]));
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** local → mundo (mesma convenção do shader, que aplica a inversa) */
export function toWorld(q: V3, off: V3, a: number): V3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [off[0] + q[0] * c + q[2] * s, off[1] + q[1], off[2] - q[0] * s + q[2] * c];
}

// como na foto: metades a ~50°, corte na diagonal e faces externas à mostra
const OPEN_ANGLE = (50 * Math.PI) / 180;

export function frameAt(p: number, time: number, rise: number, mx: number, my: number, aspect: number): Frame {
  const settle = smooth(span(p, 0, 0.2));
  const seam = easeInOut(span(p, 0.16, 0.34));
  const open = easeInOut(span(p, 0.34, 0.6));
  const macro = easeInOut(span(p, 0.62, 0.9));

  // vitrine: o arranjo do topo à frente-esquerda, balanço lento; no corte, a faca de frente
  const idle = Math.PI / 4 + Math.sin(time * 0.23) * 0.34 + mx * 0.3;
  const yaw = lerp(idle, 0.42, settle) * (1 - open);

  const sink = -(1 - rise) * H * 1.06;
  const spread = Math.pow(open, 0.75);
  // afastadas o bastante para as quinas de trás não se cruzarem ao girar
  const offL: V3 = [-0.86 * spread, sink, 0.1 * open];
  const offR: V3 = [0.86 * spread, sink, -0.1 * open];
  // no macro a metade direita sai de quadro e deixa a face esquerda sozinha
  offR[0] += easeInOut(span(p, 0.6, 0.82)) * 1.5;
  const angL = yaw - OPEN_ANGLE * open;
  const angR = yaw + OPEN_ANGLE * open;

  // retrato pede câmera mais longe para caber o bolo inteiro
  const far = aspect < 1 ? Math.pow(1 / aspect, 0.8) : 1;

  // paisagem: o bolo fica entre "Maison" e "Doce", sem esconder nenhuma letra
  const pan = aspect < 1 ? 0 : 0.46;
  // em retrato o nome fica empilhado no topo: o bolo desce no quadro
  const ta0: V3 = [pan, aspect < 1 ? 1.0 : 0.56, 0];
  // câmera ~30° acima, como foto de vitrine: vê o topo com o arranjo e a sombra longa
  const ro0: V3 = add(ta0, scale([0, 0.5, 0.866], 9.2 * far));
  const ro1: V3 = [0.3, 1.6, 5.9 * far];
  const ta1: V3 = [0, aspect < 1 ? 1.0 : 0.78, 0];
  // aberto, as metades ocupam ~3,8 de largura: em retrato a câmera recua mais
  const farOpen = aspect < 1 ? Math.pow(1 / aspect, 1.35) : 1;
  const ro2: V3 = [0, 1.95 + (farOpen - 1) * 0.6, 6.5 * farOpen];
  const ta2: V3 = [0, 0.5, -0.05];

  // macro: de frente para o corte da metade esquerda, um pouco de lado
  const face = toWorld([0, H * 0.5, 0], offL, angL);
  const nrm: V3 = [Math.cos(angL), 0, -Math.sin(angL)];
  const side = norm(cross(nrm, [0, 1, 0]));
  // distância para caber a face inteira com o arranjo do topo; em retrato manda a largura (2R)
  // paisagem: recuada o bastante para as legendas da direita não chegarem no marcador de capítulo
  const dist = aspect < 1 ? 5.4 / aspect : 5.9;
  // de lado (≈18°), como a foto de detalhe: a face externa da metade aparece à esquerda
  // paisagem: a base para em ~86% da altura, deixando o rodapé para a frase final
  const lift = aspect < 1 ? 0 : 0.097;
  const ro3 = add(add(add(face, scale(nrm, dist)), scale(side, aspect < 1 ? 0.5 : 1.5)), [0, 0.62 - lift, 0]);
  const ta3 = add(add(face, [0, 0.24 - lift, 0]), aspect < 1 ? [0, 0, 0] : scale(side, 0.1));

  let ro = mix(ro0, ro1, settle);
  let ta = mix(ta0, ta1, settle);
  ro = mix(ro, ro2, open);
  ta = mix(ta, ta2, open);
  ro = mix(ro, ro3, macro);
  ta = mix(ta, ta3, macro);

  // paralaxe do ponteiro, mais contida no macro
  const par = 1 - macro * 0.6;
  ro = add(ro, [mx * 0.3 * par, -my * 0.14 * par, 0]);

  // luz: na vitrine vem da direita, um pouco à frente (o veludo pega luz e a sombra corre
  // para a esquerda); para o corte gira para a frente-esquerda e acende o recheio
  const turn = smooth(span(p, 0.12, 0.5));
  const key = norm(mix(norm([0.74, 0.62, 0.22]), norm([-0.3, 0.74, 0.6]), turn));

  return { ro, ta, focal: lerp(2.35, 2.6, macro), offL, offR, angL, angR, seam, open, macro, key };
}

/** pontos das camadas, no espaço local da metade esquerda (face do corte em x = 0) */
export const ANCHORS = {
  gold: [-0.3, H + 0.1, 0.16] as V3,
  coat: [0, 0.5, R - 0.013] as V3,
  cream: [0, 0.97, 0.12] as V3,
  // a faixa do meio da face fica sem legenda à direita: ali mora o marcador de capítulo
  jam: [0, 0.335, -0.2] as V3,
  sponge: [0, 0.19, -0.42] as V3,
  crunch: [0, 0.045, 0.5] as V3,
};

/** projeta um ponto do mundo para pixels CSS, igual ao rd do shader */
export function project(f: Frame, w: V3, width: number, height: number) {
  const fw = norm(sub(f.ta, f.ro));
  const rt = norm(cross(fw, [0, 1, 0]));
  const up = cross(rt, fw);
  const v = sub(w, f.ro);
  const z = dot(v, fw);
  const x = (f.focal * dot(v, rt)) / z;
  const y = (f.focal * dot(v, up)) / z;
  return { x: width / 2 + x * height, y: height / 2 - y * height, z };
}

export const introRise = (t: number) => easeOut(clamp((t - 0.15) / 2.2));
