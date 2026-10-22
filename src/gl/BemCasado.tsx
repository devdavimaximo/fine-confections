import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { brand, produtoFlavors, produtoPapers, produtoRibbons } from '../content';
import { LITE, REDUCED, damp } from '../lib/env';
import AdaptiveDpr from './AdaptiveDpr';
import { CAKE_LAYERS, CAKE_R, TAG_H, TAG_W, halfCakeGeometry, ribbonGeometries, tagGeometry, wrapGeometry } from './bemCasadoModel';
import { cakeMaterial, cardMaterial, foilMaterial, paperMaterial, satinMaterial } from './productMaterials';

/**
 * O produto-assinatura em cena: dois bem-casados embrulhados (o da frente com a
 * tag dos noivos) e um aberto ao meio mostrando o recheio. Tudo vem das listas de
 * content.ts (papel, fita, sabor): trocar o ateliê é trocar as listas.
 */

export type ProductConfig = { paper: number; ribbon: number; flavor: number; names: string; date: string };
export type Focus = 'wrap' | 'cut';

/** quadro em sequência do anterior? (o AdaptiveDpr não mede pausas como lentidão) */
const render = { chained: true };

/* ---------- estúdio ---------- */

/**
 * Luz de foto de produto + ambiente para reflexos (cetim, ouro, recheio).
 * Com scene.environment, o three.js usa scene.environmentIntensity (não o do material):
 * ambiente forte achata tudo, por isso fica baixo e a luz-chave desenha o volume.
 */
function Studio() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.42;
    return () => {
      env.dispose();
      pm.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);

  return (
    <>
      <hemisphereLight args={['#fffaf3', '#e2d2bd', 0.55]} />
      {/* chave alta, à frente e à esquerda */}
      <directionalLight
        position={[-5.5, 9, 7]}
        intensity={2.4}
        color="#fff6ea"
        castShadow
        shadow-mapSize={[LITE ? 1024 : 2048, LITE ? 1024 : 2048]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-near={1}
        shadow-camera-far={30}
      />
      {/* recorte quente por trás à direita: acende as bordas do crepom e o cetim */}
      <directionalLight position={[7, 5, -6]} intensity={0.9} color="#ffe7d2" />
    </>
  );
}

/** sombra no chão que some em círculo: o canvas é opaco e a borda dele não pode cortá-la */
const floorShadow = new THREE.ShadowMaterial({ opacity: 0.16 });
floorShadow.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vFloor;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFloor = position.xy;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vFloor;')
    .replace('#include <fog_fragment>', '#include <fog_fragment>\ngl_FragColor.a *= 1.0 - smoothstep(3.2, 6.0, length(vFloor));');
};

/* ---------- tag ---------- */

/** nomes e data desenhados num canvas: vira a máscara da folha de ouro */
function drawTag(canvas: HTMLCanvasElement, names: string, date: string) {
  const W = 1024;
  const H = Math.round((W * TAG_H * 0.72) / (TAG_W * 0.74));
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  const main = names.trim() || brand.name;
  let size = H * 0.42;
  const font = (s: number) => `italic 400 ${s}px "Cormorant Garamond", Garamond, serif`;
  ctx.font = font(size);
  while (ctx.measureText(main).width > W * 0.94 && size > 20) {
    size *= 0.94;
    ctx.font = font(size);
  }
  ctx.fillText(main, W / 2, H * 0.55);
  const sub = (date.trim() || (names.trim() ? '' : brand.descriptor)).toUpperCase();
  if (sub) {
    const small = Math.min(H * 0.12, 46);
    ctx.font = `400 ${small}px Jost, Futura, sans-serif`;
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${small * 0.3}px`;
    ctx.fillText(sub, W / 2 + small * 0.15, H * 0.55 + small * 2.2);
  }
  // filete fino acima, como num carimbo de ateliê
  ctx.fillRect(W * 0.46, H * 0.55 - size * 0.92, W * 0.08, Math.max(3, H * 0.01));
}

function Tag({ names, date, satin, neckY, rb }: { names: string; date: string; satin: THREE.Material; neckY: number; rb: number }) {
  const geo = useMemo(() => tagGeometry(), []);
  const card = useMemo(() => cardMaterial(), []);
  const canvas = useMemo(() => document.createElement('canvas'), []);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.anisotropy = 4;
    return t;
  }, [canvas]);
  const foil = useMemo(() => foilMaterial(tex), [tex]);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let alive = true;
    const draw = () => {
      if (!alive) return;
      drawTag(canvas, names, date);
      tex.needsUpdate = true;
      invalidate();
    };
    draw();
    // a fonte do site pode chegar depois do primeiro desenho
    document.fonts?.load('italic 400 80px "Cormorant Garamond"').then(draw, () => {});
    return () => {
      alive = false;
    };
  }, [canvas, tex, names, date, invalidate]);

  // a tag pende do nó por um cordão, apoiada na lateral do embrulho
  const pos = new THREE.Vector3(0.05, 0.48, 1.14);
  const hole = new THREE.Vector3(pos.x + (-TAG_W / 2 + 0.075) * 1.25, pos.y, pos.z + 0.012);
  const cord = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, neckY, rb + 0.03),
      new THREE.Vector3(-0.08, 1.05, 0.62),
      new THREE.Vector3(-0.2, 0.9, 1.06),
      new THREE.Vector3(hole.x - 0.01, hole.y + 0.06, hole.z + 0.02),
      hole,
    ]);
    return new THREE.TubeGeometry(c, 64, 0.008, 6, false);
  }, [neckY, rb, hole.x, hole.y, hole.z]);
  useEffect(
    () => () => {
      geo.dispose();
      card.dispose();
      tex.dispose();
      foil.dispose();
      cord.dispose();
    },
    [geo, card, tex, foil, cord],
  );

  return (
    <>
      <group position={pos} rotation={[-0.07, 0, 0.03]} scale={1.25}>
        <mesh geometry={geo} material={card} castShadow receiveShadow />
        <mesh material={foil} position={[0.035, 0, 0.0075]}>
          <planeGeometry args={[TAG_W * 0.74, TAG_H * 0.72]} />
        </mesh>
      </group>
      <mesh geometry={cord} material={satin} castShadow />
    </>
  );
}

/* ---------- peças ---------- */

const RIBBON_W = 0.16;

function Wrapped({ paper, satin, tag }: { paper: THREE.Material; satin: THREE.Material; tag?: { names: string; date: string } }) {
  const wrap = useMemo(() => wrapGeometry(LITE), []);
  const ribbon = useMemo(() => ribbonGeometries(wrap, RIBBON_W), [wrap]);
  return (
    <group>
      <mesh geometry={wrap.geo} material={paper} castShadow receiveShadow />
      {ribbon.map((g, i) => (
        <mesh key={i} geometry={g} material={satin} castShadow receiveShadow />
      ))}
      {tag && <Tag names={tag.names} date={tag.date} satin={satin} neckY={wrap.neckY} rb={wrap.neckR + 0.06} />}
    </group>
  );
}

/** onde fica cada peça; o meio bem-casado abre como um livro, com o corte para a câmera */
const LAYOUT = {
  hero: { p: [-0.6, 0, 0.45], r: 0 },
  back: { p: [-2.25, 0, -1.25], r: 1.9 },
  back2: { p: [0.55, 0, -1.75], r: -1.1 },
  cutA: { p: [0.8, 0, 1.15], r: 0.3 },
  cutB: { p: [2.55, 0, 0.45], r: -0.85 },
} as const;
/** alvo e distância da câmera em cada foco (a distância cresce em telas estreitas) */
const FOCUS: Record<Focus, { t: [number, number, number]; w: number; h: number }> = {
  wrap: { t: [0.05, 0.75, -0.2], w: 6.6, h: 2.6 },
  cut: { t: [1.78, 0.42, 0.8], w: 4.0, h: 1.6 },
};

type Spin = { v: number; a: number; drag: boolean; idle: number };
const REST = 0.1;

export function ProductScene({ config, focus, spin }: { config: ProductConfig; focus: Focus; spin: RefObject<Spin> }) {
  const { camera, size, invalidate } = useThree();

  const paperHex = produtoPapers[config.paper].hex;
  const paper = useMemo(() => paperMaterial(paperHex), [paperHex]);
  const rb = produtoRibbons[config.ribbon];
  const satin = useMemo(() => satinMaterial(rb.hex, 'metallic' in rb && !!rb.metallic), [rb]);
  const fl = produtoFlavors[config.flavor];
  const cake = useMemo(() => cakeMaterial(fl.fill, fl.speck, CAKE_LAYERS, CAKE_R), [fl]);
  const half = useMemo(() => halfCakeGeometry(LITE), []);
  useEffect(() => () => paper.dispose(), [paper]);
  useEffect(() => () => satin.dispose(), [satin]);
  useEffect(() => () => cake.dispose(), [cake]);

  // qualquer mudança no pedido acorda o desenho
  useEffect(() => invalidate(), [config, focus, invalidate]);

  const group = useRef<THREE.Group>(null);
  const st = useRef({ t: new THREE.Vector3(...FOCUS[focus].t), d: 12, init: false });
  const look = useMemo(() => new THREE.Vector3(), []);
  const goal = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const s = st.current;
    let busy = false;

    // giro: arrasto com inércia; solto, volta devagar para a pose de vitrine
    const sp = spin.current!;
    if (!sp.drag) {
      sp.idle += dt;
      sp.v = damp(sp.v, 0, 3, dt);
      if (sp.idle > 1.4) sp.a = damp(sp.a, REST, 1.4, dt);
    }
    sp.a += sp.v * dt;
    if (group.current) group.current.rotation.y = sp.a;
    if (sp.drag || Math.abs(sp.v) > 1e-3 || Math.abs(sp.a - REST) > 1e-3) busy = true;

    // foco: o arranjo todo, ou de perto o recheio; o alvo gira junto com o arranjo
    const f = FOCUS[focus];
    goal.set(...f.t).applyAxisAngle(new THREE.Vector3(0, 1, 0), sp.a);
    const aspect = size.width / size.height;
    const tn = Math.tan(((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360);
    const dist = Math.max(f.h / (2 * tn), f.w / (2 * tn * aspect)) * (LITE ? 1.08 : 1.12);
    const k = REDUCED || !s.init ? 60 : 2.6;
    s.init = true;
    if (s.t.distanceTo(goal) > 1e-3 || Math.abs(s.d - dist) > 1e-3) busy = true;
    s.t.x = damp(s.t.x, goal.x, k, dt);
    s.t.y = damp(s.t.y, goal.y, k, dt);
    s.t.z = damp(s.t.z, goal.z, k, dt);
    s.d = damp(s.d, dist, k, dt);
    const el = focus === 'cut' ? 0.3 : 0.4; // de perto, mais baixo: o corte de frente
    camera.position.set(s.t.x, s.t.y + Math.sin(el) * s.d, s.t.z + Math.cos(el) * s.d);
    camera.lookAt(look.copy(s.t));

    render.chained = busy;
    if (busy) invalidate();
  });

  const place = (k: keyof typeof LAYOUT) => ({ position: LAYOUT[k].p as unknown as [number, number, number], rotation: [0, LAYOUT[k].r, 0] as [number, number, number] });

  return (
    <>
      <Studio />
      <group ref={group}>
        <group {...place('hero')}>
          <Wrapped paper={paper} satin={satin} tag={{ names: config.names, date: config.date }} />
        </group>
        <group {...place('back')}>
          <Wrapped paper={paper} satin={satin} />
        </group>
        <group {...place('back2')}>
          <Wrapped paper={paper} satin={satin} />
        </group>
        <mesh geometry={half} material={cake} {...place('cutA')} castShadow receiveShadow />
        <mesh geometry={half} material={cake} {...place('cutB')} castShadow receiveShadow />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0005, 0]} receiveShadow material={floorShadow}>
        <planeGeometry args={[20, 20]} />
      </mesh>
    </>
  );
}

/** expõe o invalidate do canvas para os eventos de ponteiro do DOM */
function Waker({ into }: { into: RefObject<() => void> }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    into.current = () => invalidate();
  }, [into, invalidate]);
  return null;
}

const DPR_MAX = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, LITE ? 1.5 : 1.75);

export default function BemCasado({ config, focus }: { config: ProductConfig; focus: Focus }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const spin = useRef<Spin>({ v: 0, a: REST, drag: false, idle: 9 });
  const last = useRef(0);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '20% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const wake = useRef<() => void>(() => {});
  const down = (e: RPointerEvent) => {
    wake.current();
    spin.current.drag = true;
    spin.current.idle = 0;
    last.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: RPointerEvent) => {
    if (!spin.current.drag) return;
    const dx = e.clientX - last.current;
    last.current = e.clientX;
    spin.current.a += dx * 0.006;
    spin.current.v = dx * 0.4;
    wake.current();
  };
  const up = () => {
    spin.current.drag = false;
    spin.current.idle = 0;
    wake.current();
  };

  return (
    <div className="product3d" ref={host} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} data-cursor="girar">
      <Canvas
        shadows="percentage"
        frameloop={visible ? 'demand' : 'never'}
        dpr={DPR_MAX}
        camera={{ fov: 26, position: [0, 3, 12], near: 0.1, far: 60 }}
        // opaco, na cor do papel da seção: o navegador não precisa misturar o canvas com a página
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#f3eee7', 1);
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 0.8;
        }}
      >
        <AdaptiveDpr min={0.75} max={DPR_MAX} chained={() => render.chained} />
        <ProductScene config={config} focus={focus} spin={spin} />
        <Waker into={wake} />
      </Canvas>
    </div>
  );
}
