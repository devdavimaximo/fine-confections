import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** normais suaves sem costura: funde os vértices duplicados da emenda antes de calcular */
function smoothNormals(g: THREE.BufferGeometry) {
  if (g.attributes.uv) g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const merged = mergeVertices(g, 1e-5);
  merged.computeVertexNormals();
  return merged;
}

/**
 * Um macaron procedural, eixo em Y, centro no meio do recheio, diâmetro 0,42.
 * Proporções medidas na foto de perfil da casa (fotos/macarons.jpg), em frações
 * do diâmetro: domo 0,165 · pé 0,075 · recheio 0,085 · pé · domo (total ≈ 0,57).
 *   - as duas cascas são domos iguais, com a borda saindo um pouco sobre o pé
 *   - o "pied" (o babado que nasce no forno) abre em direção à casca, irregular
 *   - o recheio confeitado forma dois rolinhos que estufam até a borda
 *   - o contorno não é um círculo perfeito: varia um pouco em volta do eixo
 * Cascas e pés são uma geometria só; o atributo aPart (0 casca, 1 pé) diz ao
 * material onde aplicar poros. O recheio é outra geometria (cor do sabor).
 */

export const MAC_R = 0.21;
const D = MAC_R * 2;
const H_DOME = 0.165 * D;
const H_FOOT = 0.075 * D;
const H_FILL = 0.085 * D;
/** espessura total (eixo): usada pelo layout da torre */
export const MAC_T = 2 * (H_DOME + H_FOOT) + H_FILL;

const Y_FOOT0 = H_FILL / 2; // onde o pé encontra o recheio
const Y_SHELL = Y_FOOT0 + H_FOOT; // onde o pé encontra a casca

/** ruído barato e determinístico em volta do eixo */
const wob = (a: number, k: number) =>
  0.5 * Math.sin(a * 3 + k) + 0.3 * Math.sin(a * 5 + 1.3 * k) + 0.2 * Math.sin(a * 11 + 2.1 * k);

/** contorno levemente irregular: o mesmo para casca, pé e recheio (montados juntos) */
const outline = (a: number) => 1 + 0.011 * wob(a, 0.7);

function lathe(profile: [number, number][], segs: number, flip: boolean) {
  const pts = profile.map(([x, y]) => new THREE.Vector2(x, flip ? -y : y));
  if (flip) pts.reverse();
  const g = new THREE.LatheGeometry(pts, segs);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const k = outline(Math.atan2(z, x));
    p.setXYZ(i, x * k, p.getY(i), z * k);
  }
  return smoothNormals(g);
}

/** domo: superelipse (parede curta, ombro redondo, topo quase plano) */
function shellProfile(): [number, number][] {
  const pts: [number, number][] = [
    [0, Y_SHELL],
    [MAC_R * 0.95, Y_SHELL],
    [MAC_R * 0.985, Y_SHELL + 0.0015],
    [MAC_R, Y_SHELL + 0.006],
  ];
  const base = Y_SHELL + 0.006;
  const h = H_DOME - 0.006;
  const N = 16;
  for (let i = 1; i <= N; i++) {
    const t = (i / N) * (Math.PI / 2);
    // max(0, ·): em π/2 o cosseno sai −6e−17 e a potência fracionária vira NaN
    const x = MAC_R * Math.pow(Math.max(0, Math.cos(t)), 2 / 3.2);
    const y = base + h * Math.pow(Math.max(0, Math.sin(t)), 2 / 2.2);
    pts.push([Math.max(x, 0), y]);
  }
  pts[pts.length - 1][0] = 0;
  return pts;
}

/** pé: abre em direção à casca, com babados e bolhas irregulares */
function foot(flip: boolean, segs: number, seed: number) {
  const rows = 7;
  const g = new THREE.CylinderGeometry(1, 1, H_FOOT, segs, rows, true);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const yy = p.getY(i);
    const t = Math.min(1, Math.max(0, yy / H_FOOT + 0.5)); // 0 no recheio, 1 na casca
    const a = Math.atan2(z, x);
    const ruffle =
      0.55 * Math.sin(a * 37 + seed + t * 6) * Math.sin(a * 13 + 2 * seed) +
      0.3 * Math.sin(a * 71 + 3 * seed - t * 9) +
      0.15 * Math.sin(a * 113 + seed * 5);
    const lift = 0.45 + 0.55 * Math.sin(Math.PI * t); // babado em todo o pé, maior no meio
    const r = MAC_R * (0.905 + 0.05 * Math.pow(t, 1.4) + 0.03 * ruffle * lift) * outline(a);
    const y = Y_FOOT0 + t * H_FOOT;
    p.setXYZ(i, Math.cos(a) * r, flip ? -y : y, Math.sin(a) * r);
  }
  if (flip) {
    // espelhar inverte as faces: troca a ordem dos índices
    const idx = g.index!;
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, b);
    }
  }
  return smoothNormals(g);
}

/** marca a peça sem desfazer o índice: vértices compartilhados = 1/3 do custo */
function part(g: THREE.BufferGeometry, v: number) {
  g.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(v), 1));
  return g;
}

export function macaronGeometries(lite = false) {
  // 210 instâncias, desenhadas duas vezes (cor + sombra): cada vértice conta
  const segs = lite ? 44 : 56;
  const top = lathe(shellProfile(), segs, false);
  const bottom = lathe(shellProfile(), segs, true);
  const shell = mergeGeometries([
    part(top, 0),
    part(bottom, 0),
    part(foot(false, lite ? 64 : 88, 0), 1),
    part(foot(true, lite ? 64 : 88, 2.3), 1),
  ])!;
  shell.computeBoundingSphere();

  // recheio: dois rolinhos de manga de confeiteiro, estufando até a borda
  const FILL_IN = 0.004;
  const fill = new THREE.CylinderGeometry(1, 1, H_FILL + FILL_IN * 2, segs, 9, false);
  const p = fill.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const y = p.getY(i);
    const r0 = Math.hypot(x, z);
    if (r0 < 1e-4) continue;
    const a = Math.atan2(z, x);
    const t = Math.min(1, Math.max(0, y / H_FILL + 0.5));
    const rolls = 0.5 - 0.5 * Math.cos(t * Math.PI * 4); // dois rolinhos
    const inFoot = Math.abs(y) > H_FILL / 2 ? 0.97 : 1; // a parte escondida fica por dentro do pé
    const r = inFoot * MAC_R * (0.91 + 0.05 * rolls + 0.006 * Math.sin(a * 9 + t * 5)) * outline(a) * r0;
    p.setXYZ(i, (x / r0) * r, y, (z / r0) * r);
  }
  return { shell, fill: smoothNormals(fill) };
}
