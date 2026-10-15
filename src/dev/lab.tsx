// Laboratório de calibração (só dev): o bombom ao lado da foto, com câmera e luz equivalentes.
//   /lab.html?v=vitrine | aberto | macro
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';

/** conta quadros para medir fps (window.__n) */
function Counter() {
  useFrame(() => {
    const w = window as unknown as { __n?: number };
    w.__n = (w.__n ?? 0) + 1;
  });
  return null;
}
import { Scene } from '../gl/Bonbon';
import { frameAt, type Frame, type V3 } from '../gl/timeline';

const v = new URLSearchParams(location.search).get('v') ?? 'vitrine';
const num = (k: string, d: number) => Number(new URLSearchParams(location.search).get(k) ?? d);

const VIEWS: Record<string, { photo: string; frame: (a: number) => Frame }> = {
  vitrine: {
    photo: 'queijobrie',
    frame: (a) => {
      const f = frameAt(0, 0, 1, 0, 0, a);
      const el = (num('el', 30) * Math.PI) / 180;
      const d = num('d', 10);
      const ta: V3 = [0, num('ty', 0.5), 0];
      const yaw = Math.PI / 4 + num('yaw', 0);
      return { ...f, ta, ro: [0, ta[1] + Math.sin(el) * d, Math.cos(el) * d], angL: yaw, angR: yaw, offL: [0, 0, 0], offR: [0, 0, 0], key: [0.74 / 1.0, 0.56, -0.38] };
    },
  },
  aberto: {
    photo: 'queijobriedentro',
    frame: (a) => {
      const f = frameAt(0.6, 0, 1, 0, 0, a);
      return { ...f, ro: [0, num('ry', 1.0), num('d', 6.2)], ta: [0, num('ty', 0.62), 0] };
    },
  },
  macro: {
    photo: 'queijobriezoom',
    frame: (a) => frameAt(0.95, 0, 1, 0, 0, a),
  },
};

const view = VIEWS[v];
createRoot(document.getElementById('root')!).render(
  <div className="lab">
    <div className="stage">
      <Canvas dpr={num('dpr', 1)} gl={{ alpha: true, antialias: false, premultipliedAlpha: true }} onCreated={({ gl }) => gl.setClearColor(0, 0)}>
        <Scene frame={view.frame} />
        <Counter />
      </Canvas>
    </div>
    <img src={`/media/${view.photo}-900.webp`} alt="" />
  </div>,
);
