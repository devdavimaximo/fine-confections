import * as THREE from 'three';
import { noiseTexture } from './noise';

/**
 * Materiais do macaron. A geometria dá a forma; o relevo fino é feito no
 * fragment shader (bump procedural por derivadas de tela), sem custo de vértice:
 *   - casca: fosca, micro-ondulação e pontinhos de açúcar
 *   - pé: bolhas do merengue que subiu no forno (Worley), mais escuras no fundo
 *   - recheio: sulcos dos dois rolinhos do bico de confeitar
 * Calibrado contra fotos/macarons.jpg (perfil) e a torre do cardápio.
 *
 * Custo: 210 instâncias, pixels caros. Todo ruído vem de textura (1 leitura,
 * não 8 hashes), os poros são calculados uma vez por pixel e o detalhe menor
 * que ~2 px some (LOD), o que também evita cintilação ao girar a torre.
 * As leituras usam textureLod: com derivada implícita (texture2D) dentro de um
 * if, o compilador D3D do Windows achata o desvio e roda todos os ramos em
 * todo pixel, inclusive as 18 leituras das bolhas que o LOD deveria pular.
 */

/** diagnóstico (só dev): ?prof=nodetail,standard,noshadow */
export const PROF = import.meta.env.DEV ? (new URLSearchParams(location.search).get('prof') ?? '') : '';

const FILL_H = (0.085 * 0.42).toFixed(4);

const NOISE = /* glsl */ `
  uniform sampler2D uMacNoise;
  float mnoise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    vec2 uv = (p.xy + vec2(37.0, 239.0) * p.z) + f.xy;
    vec2 rg = textureLod(uMacNoise, (uv + 0.5) / 256.0, 0.0).yx;
    return mix(rg.x, rg.y, f.z);
  }
  vec2 mhash2(vec2 c) {
    return textureLod(uMacNoise, (c + 0.5) / 256.0, 0.0).xy;
  }
  // distância à bolha mais próxima (Worley) e o tamanho dela
  vec2 bubbles(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float d = 8.0;
    float sz = 0.0;
    for (int k = 0; k < 9; k++) {
      vec2 o = vec2(float(k - (k / 3) * 3) - 1.0, float(k / 3) - 1.0);
      vec2 h = mhash2(i + o);
      vec2 r = o + 0.15 + 0.7 * h - f;
      float dd = length(r) / (0.35 + 0.65 * h.x);
      if (dd < d) { d = dd; sz = h.y; }
    }
    return vec2(d, sz);
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

let sharedNoise: THREE.Texture | null = null;

function inject<M extends THREE.Material>(mat: M, kind: 'shell' | 'fill') {
  if (PROF.includes('nodetail')) return mat;
  sharedNoise ??= noiseTexture();
  const tex = sharedNoise;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uMacNoise = { value: tex };
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         ${kind === 'shell' ? 'attribute float aPart;' : ''}
         varying float vPart;
         varying vec3 vObj;
         varying float vSeed;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vPart = ${kind === 'shell' ? 'aPart' : '2.0'};
         vObj = position;
         #ifdef USE_INSTANCING
           vSeed = fract(instanceMatrix[3][0] * 13.1 + instanceMatrix[3][2] * 7.7 + instanceMatrix[3][1] * 3.3);
         #else
           vSeed = 0.0;
         #endif`,
      );

    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying float vPart;
         varying vec3 vObj;
         varying float vSeed;
         ${NOISE}`,
      )
      // cor e altura do relevo, calculadas juntas (cada ruído uma vez só)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         vec3 sp = vObj + vSeed * 17.0;
         // tamanho do pixel no objeto: detalhe menor que ~2 px some
         float mPx = length(fwidth(vObj));
         #define LOD(f) (1.0 - smoothstep(0.22, 0.6, mPx * (f)))
         float mH = 0.0;
         if (vPart > 1.5) {
           float t = vObj.y / ${FILL_H} + 0.5;
           float groove = cos(t * 6.2832 * 2.0);
           float n1 = mnoise(sp * 140.0) * LOD(140.0);
           diffuseColor.rgb *= (0.9 + 0.1 * (0.5 - 0.5 * groove)) * (0.97 + 0.06 * n1);
           mH = 0.0016 * groove + 0.0005 * n1;
         } else if (vPart > 0.5) {
           // poros: bolhas maiores e esparsas + bolhas finas, na superfície do cilindro
           vec2 cyl = vec2(atan(vObj.z, vObj.x) * 0.2 + vSeed, vObj.y);
           float l1 = LOD(110.0);
           float l2 = LOD(220.0);
           float cav = 0.0;
           if (l1 > 0.0) {
             vec2 b1 = bubbles(cyl * vec2(80.0, 110.0));
             cav = (1.0 - smoothstep(0.3, 0.46, b1.x)) * step(0.7, b1.y) * l1;
           }
           if (l2 > 0.0) {
             vec2 b2 = bubbles(cyl * vec2(170.0, 220.0) + 7.0);
             cav += 0.7 * (1.0 - smoothstep(0.26, 0.42, b2.x)) * step(0.62, b2.y) * l2;
           }
           cav = clamp(cav, 0.0, 1.0);
           float lump = mnoise(sp * 45.0);
           // de longe os poros viram só um tom um pouco mais escuro (média)
           diffuseColor.rgb *= 1.14 * mix(1.0, 0.62, cav) * mix(0.97, 1.0, l1) * (0.95 + 0.1 * lump);
           mH = -0.0022 * cav + 0.0014 * (lump - 0.5) * LOD(45.0);
         } else {
           float n1 = mnoise(sp * 40.0);
           float speck = smoothstep(0.82, 0.92, mnoise(sp * 420.0)) * LOD(420.0);
           diffuseColor.rgb *= 1.0 + 0.03 * (n1 - 0.5) - 0.06 * speck;
           mH = 0.00045 * (mnoise(sp * 70.0) - 0.5) * LOD(70.0) - 0.0002 * speck;
         }`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
         normal = bumpNormal(normal, mH);`,
      )
      // poros não recebem brilho
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         if (vPart > 0.5 && vPart < 1.5) roughnessFactor = 0.95;`,
      );
  };
  mat.customProgramCacheKey = () => `macaron-${kind}`;
  return mat;
}

export function shellMaterial() {
  if (PROF.includes('standard')) return inject(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62 }), 'shell');
  return inject(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      // casca de macaron é fosca: pouco reflexo branco por cima da cor (medido: o azul
      // subia 2,6× contra 1,2× do vermelho, era reflexo lavando o pigmento)
      roughness: 0.62,
      specularIntensity: 0.45,
      sheen: 0.1,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color('#ffffff'),
    }),
    'shell',
  );
}

export function fillMaterial() {
  if (PROF.includes('standard')) return inject(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), 'fill');
  // ganache/buttercream: acetinado, não verniz (material padrão basta: ninguém vê clearcoat a 2 cm)
  return inject(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.48 }), 'fill');
}
