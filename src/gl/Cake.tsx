import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LITE, REDUCED, damp } from '../lib/env';
import { onReady, signals } from '../lib/scroller';
import AdaptiveDpr from './AdaptiveDpr';
import { fragment, vertex } from './cakeShader';
import { frameAt, introRise, type Frame } from './timeline';
import { placeLayers, resetLayerWidths } from './layers';
import { noiseTexture } from './noise';

/**
 * Desenho sob demanda: o canvas só redesenha quando algo muda (scroll, mouse,
 * entrada, giro da vitrine). Parado no corte, a GPU descansa: no celular isso é
 * bateria e temperatura. `chained` diz se o quadro atual veio em sequência do
 * anterior, para o AdaptiveDpr não medir pausas como lentidão.
 */
const render = { chained: false };

/** `frame` fixa a câmera e a pose (laboratório de calibração); sem ele, o scroll manda */
export function Scene({ frame }: { frame?: (aspect: number) => Frame }) {
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const st = useRef({ cut: 0, mx: 0, my: 0, t: 0, frames: 0, timer: 0 });

  // sinais que nascem fora do canvas acordam o desenho
  useEffect(() => {
    const wake = () => invalidate();
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('pointermove', wake, { passive: true });
    const off = onReady(wake);
    const s = st.current;
    return () => {
      window.removeEventListener('scroll', wake);
      window.removeEventListener('pointermove', wake);
      window.clearTimeout(s.timer);
      off();
    };
  }, [invalidate]);
  const buf = useMemo(() => new THREE.Vector2(), []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment(LITE),
        uniforms: {
          uRes: { value: new THREE.Vector2(1, 1) },
          uTime: { value: 0 },
          uRo: { value: new THREE.Vector3() },
          uTa: { value: new THREE.Vector3() },
          uFocal: { value: 2.4 },
          uOffL: { value: new THREE.Vector3() },
          uOffR: { value: new THREE.Vector3() },
          uRotL: { value: new THREE.Vector2(1, 0) },
          uRotR: { value: new THREE.Vector2(1, 0) },
          uSeam: { value: 0 },
          uOpen: { value: 0 },
          uAlpha: { value: 1 },
          uZero: { value: 0 },
          uL: { value: new THREE.Vector3(0.6, 0.7, 0.36) },
          uNoise: { value: noiseTexture() },
        },
        depthTest: false,
        depthWrite: false,
        transparent: true,
        // o shader já entrega alfa pré-multiplicado: escreve direto no buffer
        blending: THREE.NoBlending,
      }),
    [],
  );
  useEffect(
    () => () => {
      material.uniforms.uNoise.value.dispose();
      material.dispose();
    },
    [material],
  );

  useFrame((_, delta) => {
    const s = st.current;
    const dt = Math.min(delta, 1 / 20);
    if (!REDUCED) s.t += dt;
    s.cut = damp(s.cut, signals.cut, REDUCED ? 30 : 7, dt);
    s.mx = damp(s.mx, signals.mx, 2.4, dt);
    s.my = damp(s.my, signals.my, 2.4, dt);

    const since = signals.introAt < 0 ? 0 : (performance.now() - signals.introAt) / 1000;
    const rise = REDUCED ? (signals.introAt < 0 ? 0 : 1) : introRise(since);
    const f = frame ? frame(size.width / size.height) : frameAt(s.cut, s.t, rise, s.mx, s.my, size.width / size.height);

    gl.getDrawingBufferSize(buf);
    const u = material.uniforms;
    u.uRes.value.copy(buf);
    u.uTime.value = s.t;
    u.uRo.value.set(...f.ro);
    u.uTa.value.set(...f.ta);
    u.uFocal.value = f.focal;
    u.uOffL.value.set(...f.offL);
    u.uOffR.value.set(...f.offR);
    u.uRotL.value.set(Math.cos(f.angL), Math.sin(f.angL));
    u.uRotR.value.set(Math.cos(f.angR), Math.sin(f.angR));
    u.uSeam.value = f.seam;
    u.uOpen.value = f.open;
    u.uL.value.set(...f.key);

    placeLayers(f, size.width, size.height);

    // o segundo quadro só chega depois que o programa compilou: avisa o preloader
    if (++s.frames === 2) {
      (window as unknown as { __glReady?: boolean }).__glReady = true;
      window.dispatchEvent(new Event('cake:ready'));
    }

    // contador para medir a taxa de desenho (só no dev)
    if (import.meta.env.DEV) (window as unknown as { __bf: number }).__bf = s.frames;

    // próximo quadro? só se ainda há algo andando
    const started = signals.introAt >= 0;
    const moving =
      Math.abs(signals.cut - s.cut) > 1e-4 || Math.abs(signals.mx - s.mx) > 1e-3 || Math.abs(signals.my - s.my) > 1e-3;
    const busy = !!frame || s.frames < 3 || moving || (started && rise < 1);
    // a vitrine gira sozinha; no celular, a 30 fps (o giro é lento, ninguém nota)
    const sway = started && !REDUCED && s.cut < 0.2;
    window.clearTimeout(s.timer);
    render.chained = busy || (sway && !LITE);
    if (render.chained) invalidate();
    else if (sway) s.timer = window.setTimeout(() => invalidate(), 1000 / 30 - 4);
  });

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/** o canvas só desenha enquanto o hero está na tela */
export default function Cake() {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    window.addEventListener('resize', resetLayerWidths);
    document.fonts?.ready.then(resetLayerWidths);
    return () => window.removeEventListener('resize', resetLayerWidths);
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '10% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const max = Math.min(window.devicePixelRatio || 1, LITE ? 1.25 : 1.5);

  return (
    <div className="cake" ref={host} aria-hidden="true">
      <Canvas
        frameloop={visible ? 'demand' : 'never'}
        dpr={max}
        gl={{ alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        camera={{ position: [0, 0, 1] }}
      >
        <AdaptiveDpr min={LITE ? 0.5 : 0.6} max={max} chained={() => render.chained} />
        <Scene />
      </Canvas>
    </div>
  );
}
