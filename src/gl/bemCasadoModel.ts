import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Bem-casado procedural, em unidades de cena (1 ≈ 2,5 cm; o doce tem 5 cm de diâmetro).
 *
 * Embrulho: uma folha quadrada de papel crepom, puxada por baixo do doce, franzida
 * por cima até o pescoço (onde a fita amarra) e aberta acima numa coroa de babados.
 * É uma superfície de revolução (perfil em r, y) que ganha pregas: quanto mais o
 * papel precisa encolher para chegar ao pescoço, mais fundas as pregas. A coroa
 * tem quatro pontas (os cantos da folha) e a borda ondulada do crepom esticado.
 *
 * Por dentro: duas camadas de pão de ló e o recheio, cobertas pela casquinha de
 * açúcar. O meio bem-casado é um semicírculo extrudado; o shader pinta o corte.
 */

export const CAKE_R = 0.95;
export const CAKE_H = 0.8;
/** fim do pão de ló de baixo, fim do recheio, topo */
export const CAKE_LAYERS: [number, number, number] = [0.33, 0.47, CAKE_H];

/** perfil do papel, do centro do fundo até a borda da coroa */
const PROFILE: [number, number][] = [
  [0, 0.004],
  [0.55, 0.004],
  [0.97, 0.012],
  [1.04, 0.06],
  [1.06, 0.22],
  [1.06, 0.6],
  [1.03, 0.8],
  [0.94, 0.9],
  [0.74, 0.97],
  [0.5, 1.04],
  [0.3, 1.14],
  [0.19, 1.27],
  [0.15, 1.38],
  [0.145, 1.48],
  [0.21, 1.6],
  [0.4, 1.76],
  [0.64, 1.88],
  [0.86, 1.96],
];

export type Wrap = { geo: THREE.BufferGeometry; neckY: number; neckR: number; top: (d: number) => number };

const smoothstep = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

export function wrapGeometry(lite: boolean): Wrap {
  const A = lite ? 160 : 240;
  const S = lite ? 110 : 160;
  const curve = new THREE.SplineCurve(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)));
  const pts = curve.getSpacedPoints(S);
  const tans = pts.map((_, i) => curve.getTangentAt(i / S));

  // pescoço: o ponto mais estreito lá em cima
  let neck = 0;
  pts.forEach((p, i) => {
    if (p.y > 1.2 && (neck === 0 || p.x < pts[neck].x)) neck = i;
  });

  const pos = new Float32Array((S + 1) * (A + 1) * 3);
  const uv = new Float32Array((S + 1) * (A + 1) * 2);
  for (let i = 0; i <= S; i++) {
    const p = pts[i];
    const t = tans[i];
    // normal do perfil (para fora / para cima)
    const nr = t.y;
    const ny = -t.x;
    const crown = i > neck ? (i - neck) / (S - neck) : 0;
    // quanto o papel precisa encolher aqui: dá a profundidade das pregas
    const gather = i <= neck ? smoothstep(p.y, 0.86, 1.3) * (1 - p.x / 1.06) : 0;
    let amp = 0.004 + 0.07 * Math.pow(gather, 1.1);
    if (Math.abs(i - neck) < 8) amp = THREE.MathUtils.lerp(amp, 0.03, 1 - Math.abs(i - neck) / 8);
    if (i > neck) amp = 0.035 + 0.03 * crown;
    for (let j = 0; j <= A; j++) {
      const a = (j / A) * Math.PI * 2;
      // pregas irregulares: frequência que deriva com a volta e com a altura
      const ph = a * 22 + 1.3 * Math.sin(a * 3 + i * 0.03) + 0.8 * Math.sin(a * 7 + 1.1);
      const b = Math.sin(ph);
      let f = Math.sign(b) * Math.pow(Math.abs(b), 0.7) + 0.35 * Math.sin(a * 37 + i * 0.05);
      // na base o papel está esticado: quase nenhuma prega
      if (p.y < 0.8) f *= 0.4;
      let r = p.x + nr * amp * f;
      let y = p.y + ny * amp * f;
      if (i > neck) {
        // as quatro pontas da folha saem mais longe; entre elas o papel cede
        const corner = Math.pow(Math.abs(Math.cos(2 * a + 0.4)), 3);
        r += Math.pow(crown, 1.3) * 0.38 * corner;
        y += Math.pow(crown, 1.5) * (0.14 * corner - 0.05);
        // borda do crepom esticado: ondula fino
        const edge = smoothstep(crown, 0.75, 1);
        r += edge * 0.025 * Math.sin(a * 64 + 2 * Math.sin(a * 5));
        y += edge * 0.03 * Math.sin(a * 41 + 1.7);
      }
      const k = (i * (A + 1) + j) * 3;
      pos[k] = Math.cos(a) * r;
      pos[k + 1] = y;
      pos[k + 2] = Math.sin(a) * r;
      const u = (i * (A + 1) + j) * 2;
      uv[u] = j / A;
      uv[u + 1] = i / S;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < S; i++)
    for (let j = 0; j < A; j++) {
      const a = i * (A + 1) + j;
      const b = a + A + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPaper', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // a emenda (volta 0 = volta 1) com a mesma normal dos dois lados
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i <= S; i++) {
    const a = i * (A + 1);
    const b = a + A;
    const v = new THREE.Vector3(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
    n.setXYZ(a, v.x, v.y, v.z);
    n.setXYZ(b, v.x, v.y, v.z);
  }
  g.computeBoundingSphere();

  // altura do papel no ombro, para as pontas da fita deitarem por cima
  const topPts = pts.slice(0, neck + 1).filter((p) => p.y > 0.85);
  const top = (d: number) => {
    for (let i = 0; i < topPts.length - 1; i++) {
      const a = topPts[i];
      const b = topPts[i + 1];
      if ((d <= a.x && d >= b.x) || (d >= a.x && d <= b.x)) return THREE.MathUtils.lerp(a.y, b.y, (d - a.x) / (b.x - a.x || 1));
    }
    return d > 0.6 ? 0.92 : pts[neck].y;
  };
  return { geo: g, neckY: pts[neck].y - 0.02, neckR: pts[neck].x, top };
}

/* ---------- meio bem-casado ---------- */

export function halfCakeGeometry(lite: boolean) {
  const bev = 0.05;
  const r = CAKE_R - bev;
  const shape = new THREE.Shape();
  shape.moveTo(r, 0);
  shape.absarc(0, 0, r, 0, Math.PI, false);
  shape.lineTo(r, 0);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: CAKE_H - 2 * bev,
    bevelEnabled: true,
    bevelThickness: bev,
    bevelSize: bev,
    bevelSegments: lite ? 3 : 5,
    curveSegments: lite ? 48 : 72,
  });
  // extrusão vira altura (y); o corte reto fica em z = 0, olhando para +z
  g.rotateX(-Math.PI / 2);
  g.translate(0, bev, -bev);
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

/* ---------- fita ---------- */

/** faixa de fita ao longo de uma curva; UV: u ao longo (o brilho do cetim corre por ela) */
export function stripGeometry(points: THREE.Vector3[], widths: THREE.Vector3[], width: number) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let len = 0;
  points.forEach((p, i) => {
    if (i) len += p.distanceTo(points[i - 1]);
    const w = widths[i];
    pos.push(p.x - w.x * width * 0.5, p.y - w.y * width * 0.5, p.z - w.z * width * 0.5);
    pos.push(p.x + w.x * width * 0.5, p.y + w.y * width * 0.5, p.z + w.z * width * 0.5);
    uv.push(len, 0, len, 1);
  });
  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Laço amarrado no pescoço, de frente para +z: a volta da fita, duas alças em
 * gota, o nó e duas pontas que deitam sobre o ombro do embrulho.
 */
export function ribbonGeometries(w: Wrap, width: number) {
  const out: THREE.BufferGeometry[] = [];
  const rb = w.neckR + 0.06;
  const y0 = w.neckY;

  // volta no pescoço
  {
    const pts: THREE.Vector3[] = [];
    const ws: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * rb, y0 + 0.008 * Math.sin(a * 3), Math.sin(a) * rb));
      ws.push(new THREE.Vector3(0, 1, 0));
    }
    out.push(stripGeometry(pts, ws, width));
  }

  const zf = rb + 0.025;
  // alças
  for (const side of [-1, 1]) {
    const pts: THREE.Vector3[] = [];
    const ws: THREE.Vector3[] = [];
    const N = 72;
    const L = 0.44;
    const Hh = 0.2;
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * Math.PI * 2;
      const k = (1 - Math.cos(u)) * 0.5;
      const x = side * L * k;
      const y = y0 + Hh * Math.sin(u) * (0.3 + 0.7 * k) + Math.abs(x) * 0.28;
      const z = zf + 0.07 * Math.sin(u * 0.5) - Math.abs(x) * 0.18;
      pts.push(new THREE.Vector3(x, y, z));
      // a fita torce de leve ao dar a volta
      const tw = 0.35 * Math.sin(u) * side;
      ws.push(new THREE.Vector3(Math.sin(tw) * 0.4, Math.sin(tw), Math.cos(tw)).normalize());
    }
    out.push(stripGeometry(pts, ws, width * 0.95));
  }

  // pontas: escorrem do nó e deitam sobre o ombro, abrindo para os lados
  for (const side of [-1, 1]) {
    const pts: THREE.Vector3[] = [];
    const ws: THREE.Vector3[] = [];
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const az = Math.PI / 2 + side * (0.12 + 0.42 * t);
      const d = THREE.MathUtils.lerp(rb + 0.02, 0.98, t);
      const y = Math.max(w.top(d), 0) + 0.035 + 0.02 * Math.sin(t * 7 + side);
      pts.push(new THREE.Vector3(Math.cos(az) * d, i === 0 ? y0 : y, Math.sin(az) * d));
      // largura: na direção da volta (a ponta deita com a face para cima)
      ws.push(new THREE.Vector3(-Math.sin(az), 0.25, Math.cos(az)).normalize());
    }
    out.push(stripGeometry(pts, ws, width * 0.92));
  }

  const knot = new RoundedBoxGeometry(width * 0.95, width * 1.05, 0.06, 3, 0.022);
  knot.translate(0, y0, zf + 0.01);
  out.push(knot);
  return out;
}

/* ---------- tag ---------- */

export const TAG_W = 0.66;
export const TAG_H = 0.4;

/** cartão com cantos cortados (formato de etiqueta) e furo para o cordão */
export function tagGeometry() {
  const s = new THREE.Shape();
  const w = TAG_W / 2;
  const h = TAG_H / 2;
  const c = 0.09;
  s.moveTo(-w + c, h);
  s.lineTo(w, h);
  s.lineTo(w, -h);
  s.lineTo(-w + c, -h);
  s.lineTo(-w, -h + c);
  s.lineTo(-w, h - c);
  s.lineTo(-w + c, h);
  const hole = new THREE.Path();
  hole.absarc(-w + 0.075, 0, 0.022, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, -0.006);
  return g;
}
