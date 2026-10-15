import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { macaronColors, macaronFlavors } from '../content';
import { LITE, REDUCED, damp } from '../lib/env';
import AdaptiveDpr from './AdaptiveDpr';
import { MAC_R, macaronGeometries } from './macaron';
import { PROF, fillMaterial, shellMaterial } from './macaronMaterial';
import { BASE_Y, SHELF_T, layout, rand, shelfTop, tierRadius, towerHeight, towerRadius, type TowerConfig } from './towerLayout';

const MAX = 210;
const UP = new THREE.Vector3(0, 1, 0);
const CREAM_FILL = new THREE.Color('#efe3cf');

/** cor de cada slot conforme o modo: degradê por andar, andares alternados ou sorteio */
function shellColor(cfg: TowerConfig, tier: number, floors: number, i: number, out: THREE.Color) {
  const list = cfg.colors.length ? cfg.colors : [16];
  const c = (k: number) => out.set(macaronColors[list[k]]);
  if (list.length === 1) c(0);
  else if (cfg.mode === 'intercalado') c(tier % list.length);
  else if (cfg.mode === 'misto') c(Math.floor(rand(i) * list.length));
  else {
    const t = (tier / Math.max(1, floors - 1)) * (list.length - 1);
    const a = Math.floor(t);
    const b = Math.min(list.length - 1, a + 1);
    out.set(macaronColors[list[a]]).lerp(new THREE.Color(macaronColors[list[b]]), t - a);
  }
  // fornada artesanal: cada casca sai um tico mais clara ou mais tostada
  const j = (rand(i * 3 + 1) - 0.5) * 0.07;
  out.offsetHSL((rand(i * 5 + 2) - 0.5) * 0.008, j * 0.4, j);
  return out;
}

/** torre de acrílico: base, coluna central e bandejas com a borda polida aparente */
function Stand({ floors }: { floors: number }) {
  const parts = useMemo(() => {
    const top = shelfTop(floors, 0);
    const shelves = Array.from({ length: floors }, (_, i) => {
      const r = tierRadius(i) + MAC_R + 0.07; // a bandeja passa um pouco dos macarons
      const y = shelfTop(floors, i) - SHELF_T / 2;
      return { r, y };
    });
    return { top, shelves, rb: towerRadius(floors) + 0.08 };
  }, [floors]);

  const faceMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.1,
        roughness: 0.05,
        envMapIntensity: 1.4,
        depthWrite: false,
      }),
    [],
  );
  // a borda do acrílico concentra luz e escurece: é ela que desenha as bandejas na foto
  const edgeMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        // medido na foto do cardápio: a borda aparece como um fio cinza-escuro quente
        color: '#5e5650',
        transparent: true,
        opacity: 0.85,
        roughness: 0.18,
        envMapIntensity: 1.2,
      }),
    [],
  );
  const tubeMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.16,
        roughness: 0.04,
        envMapIntensity: 1.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      faceMat.dispose();
      edgeMat.dispose();
      tubeMat.dispose();
    },
    [faceMat, edgeMat, tubeMat],
  );
  useFrame(() => {
    if (studioEnv.tex && faceMat.envMap !== studioEnv.tex) {
      for (const mm of [faceMat, edgeMat, tubeMat]) {
        mm.envMap = studioEnv.tex;
        mm.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {parts.shelves.map(({ r, y }, i) => (
        <group key={i} position={[0, y, 0]}>
          <mesh material={faceMat} receiveShadow>
            <cylinderGeometry args={[r, r, SHELF_T, 96, 1, false]} />
          </mesh>
          <mesh material={edgeMat}>
            <cylinderGeometry args={[r + 0.001, r + 0.001, SHELF_T, 96, 1, true]} />
          </mesh>
        </group>
      ))}
      <mesh material={tubeMat} position={[0, (parts.top + BASE_Y) / 2, 0]}>
        <cylinderGeometry args={[0.035, 0.035, parts.top - BASE_Y + 0.02, 32, 1, true]} />
      </mesh>
      {/* base: disco de acrílico mais grosso */}
      <mesh material={faceMat} position={[0, BASE_Y / 2, 0]} receiveShadow>
        <cylinderGeometry args={[parts.rb, parts.rb, BASE_Y, 128, 1, false]} />
      </mesh>
      <mesh material={edgeMat} position={[0, BASE_Y / 2, 0]}>
        <cylinderGeometry args={[parts.rb + 0.001, parts.rb + 0.001, BASE_Y, 128, 1, true]} />
      </mesh>
    </group>
  );
}

/** mapa do estúdio, compartilhado: o acrílico o usa direto, com reflexo mais forte */
const studioEnv: { tex: THREE.Texture | null } = { tex: null };

/**
 * Luz de estúdio das fotos da casa + ambiente para reflexos.
 * Atenção: com scene.environment, o three.js ignora material.envMapIntensity e
 * usa scene.environmentIntensity. Ambiente forte ilumina tudo por igual e achata
 * o macaron; por isso ele fica baixo aqui e a luz-chave desenha o volume.
 */
export function Studio() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.3;
    studioEnv.tex = env;
    return () => {
      env.dispose();
      pm.dispose();
      scene.environment = null;
      studioEnv.tex = null;
    };
  }, [gl, scene]);

  return (
    <>
      <hemisphereLight args={['#fffaf3', '#e2d2bd', 0.28]} />
      {/* chave alta, à frente e à esquerda, como nas fotos de produto da casa */}
      <directionalLight
        position={[-2.4, 5, 6.2]}
        intensity={2.6}
        color="#fff6ea"
        castShadow
        shadow-mapSize={[LITE ? 1024 : 2048, LITE ? 1024 : 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.015}
        shadow-camera-left={-2.6}
        shadow-camera-right={2.6}
        shadow-camera-top={5.4}
        shadow-camera-bottom={-0.6}
        shadow-camera-near={0.5}
        shadow-camera-far={18}
      />
      {/* recorte quente por trás à direita: separa as cascas e acende as bordas do acrílico */}
      <directionalLight position={[4.5, 3.5, -3.5]} intensity={0.9} color="#ffe7d2" />
    </>
  );
}

/** sombra no chão que some em círculo: o canvas é opaco e a borda dele não pode cortá-la */
const floorShadow = new THREE.ShadowMaterial({ opacity: 0.14 });
floorShadow.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vFloor;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFloor = position.xy;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vFloor;')
    .replace('#include <fog_fragment>', '#include <fog_fragment>\ngl_FragColor.a *= 1.0 - smoothstep(1.6, 3.0, length(vFloor));');
};

/** quadro em sequência do anterior? (o AdaptiveDpr não mede pausas como lentidão) */
const towerRender = { chained: true };

type Spin = { v: number; a: number; drag: boolean; idle: number };

export function TowerScene({ config, spin, view }: { config: TowerConfig; spin: RefObject<Spin>; view?: 'close' }) {
  const { camera, size, invalidate } = useThree();
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const geos = useMemo(() => macaronGeometries(LITE || PROF.includes('lowpoly')), []);
  const mats = useMemo(() => ({ shell: shellMaterial(), fill: fillMaterial() }), []);
  const shellMesh = useRef<THREE.InstancedMesh>(null);
  const fillMesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const clock = useRef(0);

  useEffect(
    () => () => {
      geos.shell.dispose();
      geos.fill.dispose();
      mats.shell.dispose();
      mats.fill.dispose();
    },
    [geos, mats],
  );

  /** estado animado de cada instância: atual, alvo e quando começa a andar */
  const st = useMemo(
    () => ({
      pos: new Float32Array(MAX * 3),
      tpos: new Float32Array(MAX * 3),
      ax: new Float32Array(MAX * 3).fill(0),
      tax: new Float32Array(MAX * 3),
      sc: new Float32Array(MAX),
      tsc: new Float32Array(MAX),
      col: new Float32Array(MAX * 3).fill(1),
      tcol: new Float32Array(MAX * 3),
      fcol: new Float32Array(MAX * 3).fill(1),
      tfcol: new Float32Array(MAX * 3),
      spin: new Float32Array(MAX),
      size: new Float32Array(MAX).fill(1),
      at: new Float32Array(MAX),
      count: 0,
      // ordem de desenho, da frente para trás (ver useFrame)
      mats: new Float32Array(MAX * 16),
      dist: new Float32Array(MAX),
      order: Array.from({ length: MAX }, (_, i) => i),
    }),
    [],
  );

  // novo pedido: recalcula os alvos e escalona a animação de cima para baixo
  useEffect(() => {
    const slots = layout(config.floors);
    const c = new THREE.Color();
    const now = clock.current;
    const prev = st.count;
    const flv = config.flavors;
    for (let i = 0; i < MAX; i++) {
      const s = slots[i];
      if (s) {
        st.tpos.set([s.x, s.y, s.z], i * 3);
        st.tax.set([s.ax, s.ay, s.az], i * 3);
        st.tsc[i] = 1;
        st.spin[i] = s.spin;
        st.size[i] = 0.975 + rand(i * 7 + 3) * 0.05;
        shellColor(config, s.tier, config.floors, i, c);
        st.tcol.set([c.r, c.g, c.b], i * 3);
        const f = flv.length ? new THREE.Color(macaronFlavors[flv[Math.floor(rand(i + 7) * flv.length)]].fill) : CREAM_FILL;
        st.tfcol.set([f.r, f.g, f.b], i * 3);
        if (i >= prev || st.sc[i] < 0.01) {
          // macaron novo desce do alto e assenta no lugar
          st.pos.set([s.x * 1.18, s.y + 2.2, s.z * 1.18], i * 3);
          st.ax.set([s.ax, s.ay, s.az], i * 3);
          st.col.set([c.r, c.g, c.b], i * 3);
          st.fcol.set([f.r, f.g, f.b], i * 3);
          st.at[i] = now + (REDUCED ? 0 : (i - prev) * 0.006 + 0.05);
        } else {
          st.at[i] = now + (REDUCED ? 0 : (s.tier + 1) * 0.045);
        }
      } else {
        st.tsc[i] = 0;
        st.at[i] = now + (REDUCED ? 0 : (MAX - i) * 0.002);
      }
    }
    st.count = slots.length;
  }, [config, st]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const qs = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const s3 = useMemo(() => new THREE.Vector3(), []);
  const col = useMemo(() => new THREE.Color(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const cam = useRef({ y: 2, d: 9, ty: 1 });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    clock.current += dt;
    const now = clock.current;
    const sm = shellMesh.current;
    const fm = fillMesh.current;
    if (!sm || !fm) return;

    // há macaron chegando, câmera reenquadrando ou alguém arrastando? então 60 fps
    let settling = false;

    for (let i = 0; i < MAX; i++) {
      if (now >= st.at[i]) {
        const k = REDUCED ? 60 : 7;
        for (let j = 0; j < 3; j++) {
          const o = i * 3 + j;
          st.pos[o] = damp(st.pos[o], st.tpos[o], k, dt);
          st.ax[o] = damp(st.ax[o], st.tax[o], k, dt);
          st.col[o] = damp(st.col[o], st.tcol[o], 5, dt);
          st.fcol[o] = damp(st.fcol[o], st.tfcol[o], 5, dt);
        }
        st.sc[i] = damp(st.sc[i], st.tsc[i], st.tsc[i] > 0 ? 9 : 12, dt);
      }
      if (!settling && (now < st.at[i] || Math.abs(st.sc[i] - st.tsc[i]) > 1e-3 || Math.abs(st.pos[i * 3 + 1] - st.tpos[i * 3 + 1]) > 1e-3))
        settling = true;
      const sc = st.sc[i] * st.size[i];
      v.set(st.pos[i * 3], st.pos[i * 3 + 1], st.pos[i * 3 + 2]);
      a.set(st.ax[i * 3], st.ax[i * 3 + 1], st.ax[i * 3 + 2]);
      if (a.lengthSq() < 1e-6) a.set(0, 1, 0);
      a.normalize();
      q.setFromUnitVectors(UP, a);
      qs.setFromAxisAngle(UP, st.spin[i]);
      q.multiply(qs);
      s3.setScalar(Math.max(sc, 0.0001));
      m.compose(v, q, s3);
      m.toArray(st.mats, i * 16);
      // distância até a câmera já com o giro da torre; invisíveis vão para o fim
      const ca = Math.cos(spin.current!.a);
      const sa = Math.sin(spin.current!.a);
      const wx = v.x * ca + v.z * sa;
      const wz = -v.x * sa + v.z * ca;
      st.dist[i] = sc < 0.01 ? 1e9 : wx * wx + (v.y - cam.current.y) ** 2 + (wz - cam.current.d) ** 2;
    }
    // da frente para trás: os macarons de trás de cada anel ficam escondidos e a
    // GPU descarta os pixels deles antes de calcular a luz (o shader é caro)
    st.order.sort((x, y) => st.dist[x] - st.dist[y]);
    const im = sm.instanceMatrix.array as Float32Array;
    const fim = fm.instanceMatrix.array as Float32Array;
    // só os visíveis vão para a GPU (a ordenação deixa os escondidos no fim)
    let live = 0;
    while (live < MAX && st.dist[st.order[live]] < 1e8) live++;
    sm.count = live;
    fm.count = live;
    for (let k = 0; k < live; k++) {
      const i = st.order[k];
      const src = st.mats.subarray(i * 16, i * 16 + 16);
      im.set(src, k * 16);
      fim.set(src, k * 16);
      sm.setColorAt(k, col.setRGB(st.col[i * 3], st.col[i * 3 + 1], st.col[i * 3 + 2]));
      fm.setColorAt(k, col.setRGB(st.fcol[i * 3], st.fcol[i * 3 + 1], st.fcol[i * 3 + 2]));
    }
    sm.instanceMatrix.needsUpdate = true;
    fm.instanceMatrix.needsUpdate = true;
    if (sm.instanceColor) sm.instanceColor.needsUpdate = true;
    if (fm.instanceColor) fm.instanceColor.needsUpdate = true;

    // giro: arrasto com inércia; parado, a torre gira devagar sozinha
    const sp = spin.current!;
    if (!sp.drag) {
      sp.idle += dt;
      const auto = REDUCED || view ? 0 : sp.idle > 1.6 ? 0.16 : 0;
      sp.v = damp(sp.v, auto, 1.6, dt);
    }
    sp.a += sp.v * dt;
    if (group.current) group.current.rotation.y = sp.a;

    // enquadramento: a câmera recua conforme a torre cresce
    const h = towerHeight(config.floors);
    const r = towerRadius(config.floors);
    const aspect = size.width / size.height;
    const t = Math.tan(((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360);
    const c = cam.current;
    if (view === 'close') {
      // laboratório: um andar de perto, na altura dos olhos
      const y = shelfTop(config.floors, config.floors - 1) + MAC_R;
      camera.position.set(0, y + 0.25, r + 1.5);
      camera.lookAt(look.set(0, y, r - 0.2));
      return;
    }
    const dist = Math.max((h * 1.08) / (2 * t), (r * 2) / (2 * t * aspect)) * (LITE ? 1.3 : 1.12) + r;
    if (Math.abs(c.d - dist) > 1e-3) settling = true;
    c.d = damp(c.d, dist, 3, dt);
    // no celular a torre sobe no quadro: embaixo ficam a dica e o contador
    c.ty = damp(c.ty, h * (LITE ? 0.4 : 0.47), 3, dt);
    c.y = damp(c.y, h * 0.6 + 0.3, 3, dt);
    camera.position.set(0, c.y, c.d);
    camera.lookAt(look.set(0, c.ty, 0));

    // próximo quadro: já, se algo está acontecendo; senão o giro lento basta a 30 fps no celular
    const busy = settling || sp.drag || Math.abs(sp.v) > 0.2;
    window.clearTimeout(timer.current);
    towerRender.chained = busy || !LITE;
    if (towerRender.chained) invalidate();
    else timer.current = window.setTimeout(() => invalidate(), 1000 / 30 - 4);
  });

  return (
    <>
      <Studio />

      <group ref={group}>
        <instancedMesh ref={shellMesh} args={[geos.shell, mats.shell, MAX]} castShadow={!PROF.includes('noshadow')} receiveShadow={!PROF.includes('noshadow')} frustumCulled={false} />
        <instancedMesh ref={fillMesh} args={[geos.fill, mats.fill, MAX]} castShadow={!PROF.includes('noshadow')} receiveShadow={!PROF.includes('noshadow')} frustumCulled={false} />
        {!PROF.includes('nostand') && <Stand floors={config.floors} />}
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow material={floorShadow}>
        <planeGeometry args={[14, 14]} />
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

/** retina dobraria o custo de cada pixel caro: teto de 1,5× e ajuste automático */
const DPR_MAX = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, LITE ? 1.25 : 1.5);

export default function Tower({ config }: { config: TowerConfig }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const spin = useRef<Spin>({ v: 0, a: 0.4, drag: false, idle: 0 });
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
    spin.current.a += dx * 0.008;
    spin.current.v = dx * 0.5;
  };
  const up = () => {
    spin.current.drag = false;
    spin.current.idle = 0;
  };

  return (
    <div className="tower" ref={host} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} data-cursor="girar">
      <Canvas
        shadows="percentage"
        frameloop={visible ? 'demand' : 'never'}
        dpr={DPR_MAX}
        camera={{ fov: 30, position: [0, 2.5, 10], near: 0.1, far: 60 }}
        // opaco, na cor do papel da seção: o navegador não precisa misturar o canvas com a
        // página a cada quadro (a torre gira sem parar; isso custava mais que o 3D)
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#f3eee7', 1);
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 0.78;
        }}
      >
        <AdaptiveDpr min={0.75} max={DPR_MAX} chained={() => towerRender.chained} />
        <TowerScene config={config} spin={spin} />
        <Waker into={wake} />
      </Canvas>
    </div>
  );
}
