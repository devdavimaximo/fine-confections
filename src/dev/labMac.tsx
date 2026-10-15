// Laboratório do macaron (só dev): render ao lado da foto da casa.
//   /lab-mac.html?v=perfil | pistache | torre | andar
import { useEffect, useMemo, useRef, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { macaronGeometries } from '../gl/macaron';
import { fillMaterial, shellMaterial } from '../gl/macaronMaterial';
import { Studio, TowerScene } from '../gl/Tower';
import type { TowerConfig } from '../gl/towerLayout';

const qs = new URLSearchParams(location.search);
const v = qs.get('v') ?? 'perfil';
const num = (k: string, d: number) => Number(qs.get(k) ?? d);

function Counter() {
  useFrame(() => {
    const w = window as unknown as { __n?: number };
    w.__n = (w.__n ?? 0) + 1;
  });
  return null;
}

type One = { pos: [number, number, number]; rot: [number, number, number]; shell: string; fill: string };

function Macarons({ items, cam, look }: { items: One[]; cam: [number, number, number]; look: [number, number, number] }) {
  const geos = useMemo(() => macaronGeometries(false), []);
  const mats = useMemo(
    () =>
      items.map((it) => {
        const s = shellMaterial();
        s.color.set(it.shell);
        const f = fillMaterial();
        f.color.set(it.fill);
        return { s, f };
      }),
    [items],
  );
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...cam);
    camera.lookAt(...look);
  }, [camera, cam, look]);
  return (
    <>
      {items.map((it, i) => (
        <group key={i} position={it.pos} rotation={it.rot}>
          <mesh geometry={geos.shell} material={mats[i].s} castShadow receiveShadow />
          <mesh geometry={geos.fill} material={mats[i].f} castShadow receiveShadow />
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.119, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <shadowMaterial opacity={0.2} />
      </mesh>
    </>
  );
}

const CHOC = qs.get('shell') ?? '#b07a4e';
const VIEWS: Record<string, { photo: string; scene: () => ReactElement }> = {
  perfil: {
    photo: '/fotos/macarons.jpg',
    scene: () => (
      <Macarons
        items={[{ pos: [0, 0, 0], rot: [0, 0, 0], shell: CHOC, fill: qs.get('fill') ?? '#4a2a18' }]}
        cam={[0, num('cy', 0.12), num('cd', 1.15)]}
        look={[0, num('ly', 0.0), 0]}
      />
    ),
  },
  pistache: {
    photo: '/fotos/macarons5.jpg',
    scene: () => (
      <Macarons
        items={[
          { pos: [0, 0.09, 0], rot: [0.2, 0.5, 1.45], shell: '#e9e8dc', fill: '#9bb33a' },
          { pos: [0.34, 0.15, -0.35], rot: [0.1, 0.9, 1.2], shell: '#e9e8dc', fill: '#9bb33a' },
          { pos: [-0.42, 0.02, 0.15], rot: [0.5, -0.3, 0.9], shell: '#e9e8dc', fill: '#9bb33a' },
        ]}
        cam={[0, 0.55, 1.3]}
        look={[0, 0.05, 0]}
      />
    ),
  },
};

const towerCfg: TowerConfig = { floors: num('f', 8), colors: [0, 27, 4], mode: 'degrade', flavors: [24, 25] };
const spin = { current: { v: 0, a: num('a', 0.3), drag: false, idle: 0 } };

function TowerLab({ close }: { close?: boolean }) {
  const ref = useRef(spin);
  return <TowerScene config={towerCfg} spin={ref.current} view={close ? 'close' : undefined} />;
}

const tower = v === 'torre' || v === 'andar';
const view = VIEWS[v];

createRoot(document.getElementById('root')!).render(
  <div className="lab">
    <div>
      <Canvas
        shadows="percentage"
        dpr={num('dpr', 1)}
        camera={{ fov: tower ? 30 : 26, position: [0, 0.2, 1.2], near: 0.05, far: 60 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0, 0);
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = num('exp', 0.78);
        }}
      >
        {tower ? (
          <TowerLab close={v === 'andar'} />
        ) : (
          <>
            <Studio />
            {view.scene()}
          </>
        )}
        <Counter />
      </Canvas>
    </div>
    {qs.has('noref') ? <div /> : tower ? <div className="tower-ref" /> : <img src={view.photo} alt="" />}
  </div>,
);
