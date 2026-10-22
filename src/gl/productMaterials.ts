import * as THREE from 'three';
import { noiseTexture } from './noise';

/**
 * Materiais do bem-casado. A geometria dá a forma; o relevo fino é feito no
 * fragment shader (bump por derivadas de tela), sem custo de vértice:
 *   - papel crepom: as rugas finas do crepe correm ao longo do papel e somem de longe
 *   - massa: pão de ló com alvéolos, recheio liso e brilhante, casquinha de açúcar
 * Ruído de textura com textureLod: dentro de desvios, a derivada implícita faz o
 * compilador D3D do Windows rodar todos os ramos em todo pixel.
 */

let sharedNoise: THREE.Texture | null = null;
const noise = () => (sharedNoise ??= noiseTexture());

const NOISE = /* glsl */ `
  uniform sampler2D uPNoise;
  float pnoise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    vec2 uv = (p.xy + vec2(37.0, 239.0) * p.z) + f.xy;
    vec2 rg = textureLod(uPNoise, (uv + 0.5) / 256.0, 0.0).yx;
    return mix(rg.x, rg.y, f.z);
  }
  vec2 phash2(vec2 c) {
    return textureLod(uPNoise, (c * vec2(1.0, 3.0) + 0.5) / 256.0, 0.0).xy;
  }
  // distância à célula mais próxima: alvéolos do pão de ló
  float pcells(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float d = 8.0;
    for (int k = 0; k < 9; k++) {
      vec2 o = vec2(float(k - (k / 3) * 3) - 1.0, float(k / 3) - 1.0);
      vec2 r = o + phash2(i + o) - f;
      d = min(d, dot(r, r));
    }
    return sqrt(d);
  }
  // bump a partir de uma altura escalar, por derivadas de tela (Mikkelsen)
  vec3 bumpNormal(vec3 n, float h) {
    vec3 dpx = dFdx(-vViewPosition);
    vec3 dpy = dFdy(-vViewPosition);
    float dhx = dFdx(h);
    float dhy = dFdy(h);
    vec3 r1 = cross(dpy, n);
    vec3 r2 = cross(n, dpx);
    float det = dot(dpx, r1);
    vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
    return normalize(abs(det) * n - grad);
  }
`;

/** posição e normal no espaço do objeto (o relevo não desliza quando a peça gira) */
function objVaryings(sh: THREE.WebGLProgramParametersWithUniforms, extraV = '', extraAssign = '') {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', `#include <common>\nvarying vec3 vObj;\nvarying vec3 vObjN;\n${extraV}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\nvObj = position;\nvObjN = normal;\n${extraAssign}`);
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vObj;\nvarying vec3 vObjN;\n${extraV.replace(/attribute[^;]*;/g, '')}\n${NOISE}`);
  sh.uniforms.uPNoise = { value: noise() };
}

/* ---------- papel crepom ---------- */

/**
 * aPaper: (volta em torno do eixo 0..1, distância ao longo do papel 0..1).
 * O crepe tem rugas paralelas finas, perpendiculares ao comprimento do papel.
 */
export function paperMaterial(color: string) {
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.82,
    sheen: 0.6,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.6),
    side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (sh) => {
    objVaryings(sh, 'attribute vec2 aPaper;\nvarying vec2 vPaper;', 'vPaper = aPaper;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float mPx = length(fwidth(vObj));
         // ~ 4 unidades de papel do fundo à borda: 1100 rugas ao longo dele
         const float CR = 1100.0;
         float lod = 1.0 - smoothstep(0.2, 0.65, mPx * CR / 4.0);
         float wob = pnoise(vec3(vPaper.x * 60.0, vPaper.y * 8.0, 2.0));
         float crepe = sin(vPaper.y * CR + wob * 5.0 + pnoise(vec3(vPaper.x * 240.0, vPaper.y * 30.0, 7.0)) * 2.0);
         crepe *= 0.6 + 0.8 * pnoise(vec3(vPaper.x * 30.0, vPaper.y * 90.0, 4.0));
         float pH = 0.0016 * crepe * lod;
         diffuseColor.rgb *= 1.0 + 0.05 * crepe * lod + 0.05 * (wob - 0.5);`,
      )
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = bumpNormal(normal, pH);');
  };
  mat.customProgramCacheKey = () => 'product-paper';
  return mat;
}

/* ---------- cetim ---------- */

export function satinMaterial(color: string, metallic = false) {
  const c = new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({
    color: c,
    roughness: metallic ? 0.34 : 0.4,
    metalness: metallic ? 0.55 : 0,
    // o cetim acende ao longo do fio: brilho anisotrópico + sheen claro nas bordas
    anisotropy: 0.75,
    sheen: 1,
    sheenRoughness: 0.3,
    sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), 0.55),
    side: THREE.DoubleSide,
  });
}

/* ---------- tag ---------- */

export function cardMaterial() {
  return new THREE.MeshPhysicalMaterial({ color: '#f6f0e4', roughness: 0.85, sheen: 0.4, sheenColor: new THREE.Color('#ffffff').multiplyScalar(0.4) });
}

/** texto em folha de ouro (hot stamping), recortado por uma máscara de canvas */
export function foilMaterial(alpha: THREE.Texture) {
  return new THREE.MeshPhysicalMaterial({
    color: '#e0bd74',
    metalness: 1,
    roughness: 0.34,
    // folha de ouro rebate a luz do estúdio mesmo de frente: sem isso some no papel
    emissive: '#a9853e',
    emissiveIntensity: 0.3,
    alphaMap: alpha,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
}

/* ---------- massa cortada ---------- */

/**
 * Meio bem-casado. No corte (face plana, normal +z no objeto): pão de ló, recheio,
 * pão de ló, com a casquinha de açúcar contornando. Fora do corte: só a casquinha.
 * uL: alturas (fim do pão de ló de baixo, fim do recheio, topo), uR: raio.
 */
export function cakeMaterial(fill: string, speck: string | undefined, layers: [number, number, number], radius: number) {
  const mat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.5, sheen: 0.3, sheenColor: new THREE.Color('#ffffff').multiplyScalar(0.3) });
  const uniforms = {
    uFill: { value: new THREE.Color(fill) },
    uSpeck: { value: new THREE.Color(speck ?? fill) },
    uSpeckAmt: { value: speck ? 1 : 0 },
    uLayers: { value: new THREE.Vector3(...layers) },
    uRad: { value: radius },
  };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (sh) => {
    objVaryings(sh);
    Object.assign(sh.uniforms, uniforms);
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform vec3 uFill;
         uniform vec3 uSpeck;
         uniform float uSpeckAmt;
         uniform vec3 uLayers;
         uniform float uRad;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float mPx = length(fwidth(vObj));
         #define LOD(f) (1.0 - smoothstep(0.22, 0.6, mPx * (f)))
         vec3 n0 = normalize(vObjN);
         float cut = smoothstep(0.85, 0.97, n0.z) * (1.0 - smoothstep(0.02, 0.05, abs(vObj.z)));
         float cH = 0.0;
         float cRough = 0.5;
         // casquinha de açúcar: branca, levemente translúcida, com marcas finas da calda
         vec3 glaze = vec3(0.95, 0.93, 0.88) * (0.96 + 0.06 * pnoise(vObj * 9.0));
         cH += 0.0016 * (pnoise(vObj * 34.0) - 0.5) * LOD(34.0);
         vec3 col = glaze;
         if (cut > 0.0) {
           float y = vObj.y + (pnoise(vec3(vObj.x * 3.0, 0.0, 1.0)) - 0.5) * 0.03;
           // distância à borda da casquinha: topo, fundo e a volta
           float rim = min(min(vObj.y, uLayers.z - vObj.y), uRad - abs(vObj.x));
           float shell = 1.0 - smoothstep(0.022, 0.032, rim);
           float fillM = smoothstep(uLayers.x - 0.006, uLayers.x + 0.006, y) * (1.0 - smoothstep(uLayers.y - 0.006, uLayers.y + 0.006, y));
           // pão de ló: dourado claro, alvéolos que escurecem; mais tostado junto da casquinha
           float pore = pcells(vObj.xy * 30.0);
           float pit = (1.0 - smoothstep(0.03, 0.22, pore)) * smoothstep(0.35, 0.7, pnoise(vObj * 9.0 + 3.0));
           vec3 sponge = mix(vec3(0.95, 0.84, 0.58), vec3(0.98, 0.9, 0.68), pnoise(vObj * 6.0));
           sponge *= 1.0 - 0.3 * pit;
           sponge = mix(sponge, vec3(0.86, 0.68, 0.4), (1.0 - smoothstep(0.03, 0.08, rim)) * 0.4);
           // recheio: liso, brilhante, com pedacinhos se o sabor tiver
           vec3 filling = uFill * (0.94 + 0.1 * pnoise(vObj * 14.0));
           float bits = uSpeckAmt * smoothstep(0.62, 0.7, pnoise(vObj * 34.0) * 0.75 + pnoise(vObj * 90.0) * 0.25);
           filling = mix(filling, uSpeck, bits);
           vec3 inner = mix(sponge, filling, fillM);
           col = mix(glaze, inner, cut * (1.0 - shell));
           cH += cut * (1.0 - shell) * ((1.0 - fillM) * (-0.004 * pit) + fillM * (0.002 + 0.002 * bits));
           cRough = mix(0.5, mix(0.85, 0.25, fillM), cut * (1.0 - shell));
         }
         diffuseColor.rgb = col;`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = cRough;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = bumpNormal(normal, cH);');
  };
  mat.customProgramCacheKey = () => 'product-cake';
  return mat;
}

/** prato de porcelana: branco, vidrado */
export function porcelainMaterial() {
  return new THREE.MeshPhysicalMaterial({ color: '#f7f4ee', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
}
