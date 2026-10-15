import { towerSizes } from '../content';
import { MAC_R, MAC_T } from './macaron';

export type Mode = 'degrade' | 'intercalado' | 'misto';
export type TowerConfig = { floors: number; colors: number[]; mode: Mode; flavors: number[] };

/**
 * A torre de acrílico da casa (foto do cardápio): bandejas redondas e
 * transparentes, empilhadas num eixo central; em cada uma, um anel de macarons
 * EM PÉ, apoiados na borda, enfileirados lado a lado (o eixo de cada um é
 * tangente ao anel). De fora se vê o perfil: casca, pé, recheio, pé, casca.
 *
 * A conta do cardápio fecha com espaçamento constante entre macarons e raio
 * crescendo linearmente a cada andar: r_i = (6,6 + 3,2·i)·s/2π, com s = espessura
 * + folga. Σ macarons = 2π·Σr_i/s dá 65, 88, 113, 142, 175, 210 para 5…10
 * andares (cardápio: 65, 85, 115, 145, 170, 210). Os números exatos do cardápio
 * são distribuídos em proporção ao raio.
 */

export const GAP = 0.012;
export const PITCH = MAC_T + GAP; // passo ao longo do anel
const K = PITCH / (2 * Math.PI);
export const R0 = 6.6 * K; // raio do anel de cima (centro dos macarons)
export const DR = 3.2 * K; // quanto cada andar cresce
export const SHELF_T = 0.02; // espessura da bandeja
export const TIER_DY = MAC_R * 2 + SHELF_T + 0.03; // macaron em pé + bandeja + folga
export const BASE_Y = 0.045; // topo da base

export type Slot = { x: number; y: number; z: number; ax: number; ay: number; az: number; tier: number; spin: number };

/** altura do topo da bandeja do andar i (0 = andar de cima) */
export const shelfTop = (floors: number, i: number) => BASE_Y + (floors - 1 - i) * TIER_DY;
export const tierRadius = (i: number) => R0 + i * DR;

export function layout(floors: number): Slot[] {
  const size = towerSizes.find((s) => s.floors === floors) ?? towerSizes[0];
  const radii = Array.from({ length: floors }, (_, i) => tierRadius(i));
  const sum = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((r) => Math.round((size.units * r) / sum));
  counts[floors - 1] += size.units - counts.reduce((a, b) => a + b, 0);

  const slots: Slot[] = [];
  radii.forEach((r, i) => {
    const n = counts[i];
    const y = shelfTop(floors, i) + MAC_R; // apoiado na borda
    for (let j = 0; j < n; j++) {
      // folgas de mão: nem todos exatamente no lugar
      const a = ((j + (rand(i * 97 + j) - 0.5) * 0.12) / n) * Math.PI * 2 + i * 0.37;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const rr = r + (rand(i * 31 + j * 7) - 0.5) * 0.02;
      const lean = (rand(i * 53 + j * 3) - 0.5) * 0.08; // inclina um pouco para dentro/fora
      slots.push({
        x: c * rr,
        y,
        z: s * rr,
        // eixo tangente ao anel, com leve desalinhamento
        ax: -s + c * lean,
        ay: (rand(j * 11 + i) - 0.5) * 0.05,
        az: c + s * lean,
        tier: i,
        spin: rand(i * 13 + j * 29) * Math.PI * 2,
      });
    }
  });
  return slots;
}

export const towerHeight = (floors: number) => shelfTop(floors, 0) + MAC_R * 2 + 0.02;
export const towerRadius = (floors: number) => tierRadius(floors - 1) + MAC_R + 0.06;

/** pseudoaleatório estável por índice (misto não pisca a cada render) */
export function rand(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
