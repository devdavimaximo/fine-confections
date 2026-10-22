// Laboratório (só dev): o bolo parado num ponto do corte, com a câmera do site.
//   /lab.html?v=vitrine | lamina | aberto | macro   ou   /lab.html?p=0.5 (progresso 0..1)
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Scene } from '../gl/Cake';
import { frameAt } from '../gl/timeline';

/** conta quadros para medir fps (window.__n) */
function Counter() {
  useFrame(() => {
    const w = window as unknown as { __n?: number };
    w.__n = (w.__n ?? 0) + 1;
  });
  return null;
}

const params = new URLSearchParams(location.search);
const num = (k: string, d: number) => Number(params.get(k) ?? d);
const VIEWS: Record<string, number> = { vitrine: 0, lamina: 0.28, aberto: 0.6, macro: 0.95 };
const p = params.has('p') ? num('p', 0) : (VIEWS[params.get('v') ?? 'vitrine'] ?? 0);

createRoot(document.getElementById('root')!).render(
  <div className="lab">
    <Canvas dpr={num('dpr', 1)} gl={{ alpha: true, antialias: false, premultipliedAlpha: true }} onCreated={({ gl }) => gl.setClearColor(0, 0)}>
      <Scene frame={(a) => frameAt(p, num('t', 0), 1, 0, 0, a)} />
      <Counter />
    </Canvas>
  </div>,
);
