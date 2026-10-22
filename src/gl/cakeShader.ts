import { H, R } from './timeline';

/**
 * Entremet de Framboesa e Pistache, todo em SDF (raymarching num quad de tela).
 *   - cilindro de borda macia com cobertura veludo rosé: matte, pontilhado do
 *     spray de chocolate, brilho rasante na silhueta em vez de reflexo
 *   - no topo, um arranjo fora do centro: três framboesas com drupelas, folha de
 *     ouro amassada (lâminas finas, nível zero de um ruído) e lascas de pistache
 *   - o corte: base crocante, pão de ló de pistache com alvéolos, geleia de
 *     framboesa brilhante com sementes e mousse de chocolate branco envolvendo
 *     os recheios até a borda, como num entremet de vitrine
 *   - chão transparente: só sombra e contato vão para o alfa, o papel é o DOM
 * Luz-chave vem do timeline (uL): atrás-direita na vitrine, frontal no corte.
 *
 * Compilação: no Windows o WebGL passa pelo compilador D3D, que inlina cada
 * chamada e desenrola cada laço que conseguir. Por isso todos os laços começam
 * em ZERO (uniform), o ruído vem de textura, map() percorre as duas metades num
 * laço e sombra/AO usam mapLite (sem relevo nem decoração detalhada).
 */

export const vertex = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const fragment = (lite: boolean) => /* glsl */ `
  precision highp float;

  #define STEPS ${lite ? 96 : 140}
  #define SHADOW_STEPS ${lite ? 16 : 28}
  #define R ${R.toFixed(4)}
  #define H ${H.toFixed(4)}
  #define RND 0.03
  #define SHELL 0.026
  #define PI 3.14159265

  uniform vec2 uRes;
  uniform float uTime;
  uniform vec3 uRo;
  uniform vec3 uTa;
  uniform float uFocal;
  uniform vec3 uOffL;
  uniform vec3 uOffR;
  uniform vec2 uRotL; // cos, sin do ângulo da metade esquerda
  uniform vec2 uRotR;
  uniform float uSeam;
  uniform float uOpen;
  uniform float uAlpha;
  uniform vec3 uL;
  uniform int uZero;
  uniform sampler2D uNoise;
  #define ZERO uZero

  /* ---------- ruído ---------- */

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  // ruído de valor por textura (truque do iq): 2 leituras em vez de 8 hashes.
  // textureLod: sem derivadas implícitas dentro dos laços dinâmicos.
  float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    vec2 uv = (p.xy + vec2(37.0, 239.0) * p.z) + f.xy;
    vec2 rg = textureLod(uNoise, (uv + 0.5) / 256.0, 0.0).yx;
    return mix(rg.x, rg.y, f.z);
  }
  float fbm(vec3 p) {
    float s = 0.0, a = 0.5;
    for (int i = ZERO; i < 3; i++) { s += a * noise(p); p = p * 2.07 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
    return s;
  }
  vec2 hash2(vec2 c) {
    return textureLod(uNoise, (c * vec2(1.0, 3.0) + 0.5) / 256.0, 0.0).xy;
  }
  // células no plano do corte: alvéolos do pão de ló, sementes da geleia
  float cells(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float d = 8.0;
    for (int k = ZERO; k < 9; k++) {
      vec2 o = vec2(float(k - (k / 3) * 3) - 1.0, float(k / 3) - 1.0);
      vec2 r = o + hash2(i + o) - f;
      d = min(d, dot(r, r));
    }
    return sqrt(d);
  }
  float hash1(float x) { return fract(sin(x * 12.9898) * 43758.5453); }

  /* ---------- forma ---------- */

  // cilindro de borda arredondada; base afundada RND abaixo do papel: a aresta
  // de baixo fica seca, rente ao chão, e a de cima tem a curva macia da mousse
  float cake(vec3 q) {
    vec2 d = vec2(length(q.xz) - (R - RND), abs(q.y - 0.5 * (H - RND)) - 0.5 * (H - RND));
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - RND;
  }

  // as camadas, de baixo para cima (alturas absolutas, H = 1,12):
  //   crocante 0–0,085 · pão de ló 0,085–0,30 · geleia 0,30–0,37 · mousse 0,37–0,60
  //   pão de ló 0,60–0,80 · geleia 0,80–0,86 · mousse até a cobertura
  // as divisas ondulam um pouco: montado à mão, não fatiado por máquina
  float band(float y, float a, float b) {
    return smoothstep(a - 0.0025, a + 0.0025, y) - smoothstep(b - 0.0025, b + 0.0025, y);
  }
  void layers(vec3 q, float di, out float sponge, out float jam, out float crunch) {
    float y = q.y + (noise(vec3(q.z * 2.4, q.x * 2.4, 7.3)) - 0.5) * 0.022;
    // recheios recuados da borda: a mousse desce pelos lados e envolve tudo
    float inset = smoothstep(SHELL + 0.04, SHELL + 0.05, di);
    crunch = 1.0 - smoothstep(0.0825, 0.0875, y);
    sponge = (band(y, 0.085, 0.3) + band(y, 0.6, 0.8)) * inset;
    jam = (band(y, 0.3, 0.37) + band(y, 0.8, 0.86)) * inset;
  }

  // miolo do pão de ló: alvéolos miúdos de tamanhos diferentes e, raros, uns furinhos maiores
  float crumb(vec3 q) {
    float pits = (1.0 - smoothstep(0.02, 0.3, cells(q.zy * 78.0))) * (0.45 + 0.55 * noise(q * 45.0 + 4.0));
    float holes = smoothstep(0.74, 0.8, noise(q * vec3(70.0, 90.0, 70.0) + 2.0));
    return max(pits, holes);
  }

  // relevo do corte: mousse lisa com o rastro da faca, alvéolos do pão de ló,
  // geleia lisa e saliente, lascas da base
  float cutDisp(vec3 q) {
    float di = -cake(q);
    float sponge, jam, crunch;
    layers(q, di, sponge, jam, crunch);
    float coat = 1.0 - smoothstep(SHELL, SHELL + 0.012, di);
    float cream = clamp(1.0 - sponge - jam - crunch, 0.0, 1.0) * (1.0 - coat);
    // a luz do corte chega rasante: qualquer dobra larga vira sombra, então a mousse é quase plana
    float creamD = (noise(q * 7.0) - 0.5) * 0.0018 + (noise(vec3(q.y * 30.0, q.z * 3.0, 2.0)) - 0.5) * 0.0007;
    float spongeD = 0.0;
    if (sponge > 0.001) spongeD = -0.002 * crumb(q) + (noise(q * 40.0) - 0.5) * 0.003 - 0.002;
    float jamD = 0.0025 + (noise(q * 12.0) - 0.5) * 0.0008;
    float crunchD = crunch > 0.001 ? (fbm(q * 26.0) - 0.5) * 0.016 + (noise(q * 70.0) - 0.5) * 0.005 : 0.0;
    return uOpen * (cream * creamD + sponge * spongeD + jam * jamD + crunch * (1.0 - coat) * crunchD);
  }

  /* ---------- decoração do topo (só na metade esquerda, longe da faca) ---------- */

  const vec3 DECO = vec3(-0.34, H, 0.16);

  // framboesa: gota quase esférica coberta de drupelas em fileiras desencontradas
  float berry(vec3 p, vec3 c, float sz, float spin) {
    vec3 u = p - c;
    float b = (length(u / vec3(1.0, 1.12, 1.0)) - sz) * 0.9;
    if (b > 0.015) return b;
    vec3 n = normalize(u);
    float e = acos(clamp(n.y, -1.0, 1.0)) / PI * 7.0;
    float a = (atan(n.z, n.x) + spin) / (2.0 * PI) * 11.0 + 0.5 * mod(floor(e), 2.0);
    float g = sqrt(max(sin(fract(e) * PI) * sin(fract(a) * PI), 0.0));
    return b - (g - 0.55) * sz * 0.17;
  }

  // folha de ouro: lâminas finas, enrugadas por ruído, recortadas em disco de borda
  // irregular e inclinadas ao acaso entre as frutas, como ouro amassado à mão
  float gold(vec3 q) {
    vec3 c = (q - DECO - vec3(0.0, 0.0, 0.02)) / 0.8;
    float bound = (length(c / vec3(0.3, 0.2, 0.28)) - 1.0) * 0.2 * 0.8;
    if (bound > 0.03) return bound;
    float d = 1e3;
    for (int i = ZERO; i < 8; i++) {
      float fi = float(i) * 1.618 + 4.0;
      vec3 h = vec3(hash1(fi * 3.1), hash1(fi * 5.7), hash1(fi * 9.3));
      vec3 ctr = vec3((h.x - 0.5) * 0.36, 0.03 + h.y * 0.1, (h.z - 0.5) * 0.34);
      float az = hash1(fi * 1.7) * 6.2832;
      float tilt = 0.45 + hash1(fi * 2.9) * 0.8;
      vec3 nrm = vec3(cos(az) * sin(tilt), cos(tilt), sin(az) * sin(tilt));
      vec3 u = c - ctr;
      float k = dot(u, nrm);
      vec3 pu = u - nrm * k;
      float rr = 0.055 + 0.045 * hash1(fi * 4.3);
      float crump = (noise(u * 28.0 + fi) - 0.5) * 0.03 + (noise(u * 70.0 + fi) - 0.5) * 0.008;
      float sheet = abs(k + crump) - 0.0021;
      float edge = length(pu) - rr * (0.75 + 0.5 * noise(pu * 22.0 + fi));
      d = min(d, max(sheet, edge));
    }
    return d * 0.8;
  }

  float sdRoundBox(vec3 p, vec3 b, float r) {
    vec3 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
  }

  // ids: 3 ouro · 4 framboesa · 5 pistache
  vec2 decor(vec3 q) {
    float bd = length(q - DECO - vec3(0.0, 0.05, 0.0)) - 0.3;
    if (bd > 0.02) return vec2(bd, 4.0);
    vec2 r = vec2(berry(q, DECO + vec3(0.0, 0.066, 0.0), 0.07, 0.0), 4.0);
    r.x = min(r.x, berry(q, DECO + vec3(0.12, 0.06, -0.075), 0.064, 1.3));
    r.x = min(r.x, berry(q, DECO + vec3(-0.1, 0.055, -0.1), 0.058, 2.6));
    r.x = min(r.x, berry(q, DECO + vec3(0.04, 0.05, 0.12), 0.052, 4.1));
    float g = gold(q);
    if (g < r.x) r = vec2(g, 3.0);
    // lascas de pistache espalhadas em volta do arranjo
    for (int i = ZERO; i < 8; i++) {
      float fi = float(i);
      float ang = fi * 2.399 + 0.6;
      float rad = 0.17 + 0.08 * hash1(fi * 7.1);
      vec3 u = q - DECO - vec3(cos(ang) * rad, 0.006, sin(ang) * rad * 0.9);
      float sp = hash1(fi * 3.7) * 3.0;
      u.xz = mat2(cos(sp), -sin(sp), sin(sp), cos(sp)) * u.xz;
      float s = 0.011 + 0.006 * hash1(fi * 5.3);
      float pd = sdRoundBox(u, vec3(s, s * 0.55, s * 0.8), 0.004) + (noise(u * 140.0 + fi) - 0.5) * 0.002;
      if (pd < r.x) r = vec2(pd, 5.0);
    }
    return r;
  }

  vec3 toLocal(vec3 p, vec3 off, vec2 cs) {
    vec3 w = p - off;
    return vec3(w.x * cs.x - w.z * cs.y, w.y, w.x * cs.y + w.z * cs.x);
  }

  // side −1 = metade esquerda (x < 0), +1 = direita
  // ids: 1 cobertura · 2 corte · 3 ouro · 4 framboesa · 5 pistache
  vec2 piece(vec3 q, float side) {
    float body = cake(q);
    // alisada à mão: ondulação larga quase invisível (o veludo em si é cor, não relevo)
    if (body < 0.02) body += (noise(q * 4.0) - 0.5) * 0.0018;
    float disp = (uOpen > 0.001 && abs(q.x) < 0.05 && body < 0.05) ? cutDisp(q) : 0.0;
    float cutT = uOpen > 0.0005 ? -side * q.x - disp : -1e3;
    float solid = max(body, cutT);
    vec2 r = vec2(solid, cutT > body ? 2.0 : 1.0);
    if (side < 0.0) {
      vec2 dd = decor(q);
      if (dd.x < r.x) r = dd;
    }
    return r;
  }

  vec2 map(vec3 p) {
    vec2 r = vec2(1e9, 0.0);
    for (int i = ZERO; i < 2; i++) {
      bool left = i == 0;
      vec3 q = toLocal(p, left ? uOffL : uOffR, left ? uRotL : uRotR);
      vec2 h = piece(q, left ? -1.0 : 1.0);
      h.y += left ? 0.0 : 10.0;
      if (h.x < r.x) r = h;
    }
    r.x = max(r.x, -p.y); // nasce do papel: o que está abaixo do chão não existe
    return r;
  }

  // versão sem relevo para sombra, AO, contato e espessura: mesma silhueta, fração do código
  vec2 mapLite(vec3 p) {
    vec2 r = vec2(1e9, 0.0);
    for (int i = ZERO; i < 2; i++) {
      bool left = i == 0;
      float side = left ? -1.0 : 1.0;
      vec3 q = toLocal(p, left ? uOffL : uOffR, left ? uRotL : uRotR);
      float body = cake(q);
      float cutT = uOpen > 0.0005 ? -side * q.x : -1e3;
      vec2 h = vec2(max(body, cutT), cutT > body ? 2.0 : 1.0);
      if (left) {
        float dd = (length((q - DECO - vec3(0.01, 0.045, -0.01)) / vec3(0.19, 0.075, 0.18)) - 1.0) * 0.075;
        if (dd < h.x) h = vec2(dd, 4.0);
      }
      h.y += left ? 0.0 : 10.0;
      if (h.x < r.x) r = h;
    }
    r.x = max(r.x, -p.y);
    return r;
  }

  vec3 calcNormal(vec3 p) {
    vec3 n = vec3(0.0);
    for (int i = ZERO; i < 4; i++) {
      vec3 e = 0.5773 * (2.0 * vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.0);
      n += e * map(p + 0.0011 * e).x;
    }
    return normalize(n);
  }

  // penumbra larga: a luz do estúdio é uma softbox grande
  float softShadow(vec3 ro, vec3 rd) {
    float res = 1.0, t = 0.015, ph = 1e10;
    for (int i = ZERO; i < SHADOW_STEPS; i++) {
      float h = mapLite(ro + rd * t).x;
      float y = h * h / (2.0 * ph);
      float d = sqrt(max(h * h - y * y, 0.0));
      res = min(res, 5.0 * d / max(0.0, t - y));
      ph = h;
      t += clamp(h, 0.02, 0.24);
      if (res < 0.002 || t > 3.6) break;
    }
    res = clamp(res, 0.0, 1.0);
    return res * res * (3.0 - 2.0 * res);
  }

  float calcAO(vec3 p, vec3 n) {
    float occ = 0.0, sca = 1.0;
    for (int i = ZERO; i < 5; i++) {
      float h = 0.012 + 0.07 * float(i);
      occ += (h - mapLite(p + n * h).x) * sca;
      sca *= 0.8;
    }
    return clamp(1.0 - 2.2 * occ, 0.0, 1.0);
  }

  /* ---------- luz ---------- */

  const vec3 KEY = vec3(1.0, 0.965, 0.92) * 1.75;
  // estúdio branco: o ambiente é claro e quente (papel e paredes rebatem)
  const vec3 AMB = vec3(0.24, 0.18, 0.13);

  vec3 env(vec3 r) {
    // cicloramas brancas: topo e lados claros, horizonte um pouco mais escuro, chão claro
    float up = smoothstep(-0.25, 0.8, r.y);
    vec3 c = mix(vec3(0.55, 0.5, 0.47), vec3(1.15, 1.12, 1.08), up);
    c *= 0.62 + 0.38 * smoothstep(0.0, 0.32, abs(r.y - 0.08));
    c += vec3(3.4, 3.2, 3.0) * pow(max(dot(r, uL), 0.0), 18.0);
    c += vec3(1.1) * pow(max(dot(r, normalize(vec3(-uL.x, 0.5, 0.7))), 0.0), 28.0);
    return c;
  }

  float ggx(float nh, float ndl, float ndv, float rough) {
    float a = rough * rough;
    float a2 = a * a;
    float d = nh * nh * (a2 - 1.0) + 1.0;
    float D = a2 / (PI * d * d);
    float k = (rough + 1.0) * (rough + 1.0) / 8.0;
    float G = (ndl / (ndl * (1.0 - k) + k)) * (ndv / (ndv * (1.0 - k) + k));
    return D * G / max(4.0 * ndl * ndv, 1e-3);
  }

  // difuso com "wrap" por canal: o vermelho atravessa mais, o terminador esquenta
  vec3 wrapDiffuse(float ndl, vec3 w) {
    return clamp((vec3(ndl) + w) / (1.0 + w), 0.0, 1.0);
  }

  vec3 shade(vec3 p, vec3 n, vec3 rd, float id, float sh) {
    bool right = id > 9.5;
    float m = id - (right ? 10.0 : 0.0);
    vec3 q = right ? toLocal(p, uOffR, uRotR) : toLocal(p, uOffL, uRotL);

    vec3 V = -rd;
    // softbox a ~3,2 unidades do centro: a direção e a intensidade variam pela face
    vec3 lp = vec3(0.0, H * 0.5, 0.0) + 0.5 * (uOffL + uOffR) + uL * 3.2;
    vec3 L = normalize(lp - p);
    float fall = 10.24 / dot(lp - p, lp - p);
    vec3 Hh = normalize(L + V);
    float ndl = dot(n, L);
    float ndlc = max(ndl, 0.0);
    float ndv = max(dot(n, V), 1e-3);
    float nh = max(dot(n, Hh), 0.0);
    // o relevo do corte é raso: AO forte ali vira mancha cinza
    float ao = mix(calcAO(p, n), 1.0, m > 1.5 && m < 2.5 ? 0.7 : 0.0);
    float fre = pow(1.0 - ndv, 5.0);
    vec3 r = reflect(rd, n);
    sh *= fall;
    vec3 amb = AMB * (0.55 + 0.45 * n.y) * ao + vec3(0.1, 0.085, 0.07) * clamp(0.5 - 0.5 * n.y, 0.0, 1.0) * ao;
    vec3 col;
    // brilho especular das softboxes, usado pela fruta e pela geleia
    float lobe = pow(max(dot(r, L), 0.0), 34.0) * 3.0 + pow(max(dot(r, normalize(vec3(-L.x, 0.5, 0.7))), 0.0), 50.0) * 0.8;

    if (m > 4.5) {
      // pistache: verde vivo por dentro, pele arroxeada aqui e ali
      vec3 alb = mix(vec3(0.36, 0.5, 0.1), vec3(0.5, 0.32, 0.22), smoothstep(0.6, 0.75, noise(q * 90.0)));
      col = alb * (KEY * wrapDiffuse(ndl, vec3(0.3, 0.35, 0.15)) * sh + amb * 1.3);
      col += KEY * ggx(nh, max(ndlc, 0.02), ndv, 0.45) * ndlc * sh * 0.08;
    } else if (m > 3.5) {
      // framboesa: vermelho fundo, translúcida, cada drupela com seu ponto de luz
      vec3 alb = vec3(0.5, 0.022, 0.055) * (0.85 + 0.3 * noise(q * 70.0));
      vec3 dif = wrapDiffuse(ndl, vec3(0.65, 0.12, 0.2));
      col = alb * (KEY * dif * mix(1.0, sh, 0.8) + amb * 1.2);
      float back = pow(max(dot(V, -L), 0.0), 2.0);
      col += vec3(0.55, 0.03, 0.06) * KEY * (0.08 + 0.3 * back) * 0.4 * ao;
      col += KEY * ggx(nh, max(ndlc, 0.02), ndv, 0.24) * ndlc * sh * 0.45 + vec3(1.0, 0.92, 0.88) * lobe * (0.04 + 0.4 * fre) * ao;
    } else if (m > 2.5) {
      // ouro: metal, reflete o estúdio; dobras internas escurecem pela AO
      vec3 F0 = vec3(1.0, 0.72, 0.2);
      vec3 F = F0 + (1.0 - F0) * fre;
      float up = smoothstep(-0.2, 0.9, r.y);
      vec3 envG = mix(vec3(0.2, 0.14, 0.07), vec3(1.25, 1.15, 0.95), up)
        + vec3(4.0, 3.7, 3.2) * pow(max(dot(r, L), 0.0), 10.0)
        + vec3(1.6) * pow(max(dot(r, normalize(vec3(-L.x, 0.6, 0.6))), 0.0), 14.0);
      col = F * envG * (0.2 + 0.8 * ao);
      col += F * KEY * ggx(nh, max(ndlc, 0.02), ndv, 0.2) * ndlc * sh * 1.6;
      col *= 0.85 + 0.3 * noise(q * 160.0);
    } else if (m > 1.5) {
      // o corte
      float di = -cake(q);
      float sponge, jam, crunch;
      layers(q, di, sponge, jam, crunch);
      float isShell = 1.0 - smoothstep(SHELL - 0.003, SHELL + 0.003, di);
      sponge *= 1.0 - isShell;
      jam *= 1.0 - isShell;
      crunch *= 1.0 - isShell;
      float cream = clamp(1.0 - sponge - jam - crunch - isShell, 0.0, 1.0);

      // mousse de chocolate branco: marfim, aerada; bolhinhas de ar raras e miúdas
      vec3 mousse = vec3(0.86, 0.78, 0.62) * (0.95 + 0.08 * fbm(q * 14.0));
      if (cream > 0.001) mousse *= 1.0 - 0.22 * (1.0 - smoothstep(0.015, 0.05, cells(q.zy * 70.0 + 9.0))) * smoothstep(0.55, 0.7, noise(q * 12.0));
      // a geleia tinge a mousse só num fio, logo acima de cada camada
      float tint = (1.0 - smoothstep(0.0, 0.016, q.y - 0.37)) * step(0.37, q.y) + (1.0 - smoothstep(0.0, 0.016, q.y - 0.86)) * step(0.86, q.y);
      mousse = mix(mousse, vec3(0.9, 0.6, 0.6), tint * 0.3 * smoothstep(SHELL + 0.04, SHELL + 0.05, di));

      // pão de ló de pistache: verde-oliva claro, miolo que escurece nos alvéolos,
      // e as faces de cima e de baixo um pouco mais tostadas
      vec3 spongeC = mix(vec3(0.5, 0.56, 0.22), vec3(0.64, 0.67, 0.31), fbm(q * 9.0));
      if (sponge > 0.001) {
        spongeC *= 1.0 - 0.3 * crumb(q);
        spongeC *= 0.92 + 0.12 * noise(q * 120.0);
        float yy = q.y < 0.45 ? q.y : q.y - 0.515;
        float edgeB = max(1.0 - smoothstep(0.0, 0.012, yy - 0.085), 1.0 - smoothstep(0.0, 0.012, 0.3 - yy));
        spongeC = mix(spongeC, vec3(0.5, 0.4, 0.16), edgeB * 0.45);
      }

      // geleia de framboesa: rubi, mais clara e translúcida junto das bordas, sementinhas escuras
      float seed = jam > 0.001 ? (1.0 - smoothstep(0.05, 0.09, cells(q.zy * 64.0 + 3.1))) * step(0.45, noise(q * 30.0)) : 0.0;
      vec3 jamC = mix(vec3(0.46, 0.025, 0.06), vec3(0.36, 0.015, 0.04), noise(q * 10.0));
      jamC = mix(jamC, vec3(0.13, 0.025, 0.02), seed * 0.7);

      // crocante: praliné dourado com lascas de pistache
      vec3 crunchC = mix(vec3(0.7, 0.5, 0.24), vec3(0.45, 0.52, 0.16), smoothstep(0.62, 0.72, noise(q * 70.0)));
      crunchC *= 0.75 + 0.4 * fbm(q * 45.0);

      vec3 coatCut = vec3(0.84, 0.5, 0.5);
      vec3 alb = cream * mousse + sponge * spongeC + jam * jamC + crunch * crunchC + isShell * coatCut;
      vec3 dif = wrapDiffuse(ndl, vec3(0.25, 0.16, 0.1));
      col = alb * (KEY * dif * sh * 0.92 + amb * 1.15);
      // mousse acetinada: lóbulo largo, sem espelho
      col += cream * (KEY * ggx(nh, max(ndlc, 0.02), ndv, 0.36) * ndlc * sh * 0.12 + env(r) * (0.02 + 0.25 * fre) * 0.3);
      // geleia é gelatina: verniz nítido + reflexo das softboxes + brilho interno vermelho
      col += jam * (1.0 - seed) * (KEY * ggx(nh, max(ndlc, 0.02), ndv, 0.12) * ndlc * sh * 0.55 + vec3(1.0, 0.92, 0.85) * lobe * (0.06 + 0.6 * fre) * 2.2);
      col += jam * vec3(0.5, 0.03, 0.05) * (0.3 * ndlc * sh + 0.04);
    } else {
      // cobertura veludo rosé: pontilhado do spray, sem reflexo, brilho rasante na borda
      vec3 alb = vec3(0.74, 0.39, 0.41) * (0.96 + 0.06 * noise(q * 9.0));
      alb *= 0.93 + 0.1 * noise(q * 420.0);
      vec3 dif = wrapDiffuse(ndl, vec3(0.3, 0.2, 0.18));
      // na penumbra o rosa fica rosa: rebatimento mais forte e um pouco mais frio que o do papel
      col = alb * (KEY * dif * mix(vec3(1.0), vec3(sh), vec3(0.85, 0.92, 1.0)) + amb * 1.25 + vec3(0.1, 0.1, 0.12) * ao);
      float sheen = pow(1.0 - ndv, 2.2);
      col += vec3(1.0, 0.82, 0.8) * sheen * (KEY * clamp((ndl + 0.3) / 1.3, 0.0, 1.0) * sh * 0.3 + amb * 0.9) * ao;
      col += alb * vec3(1.0, 0.5, 0.4) * KEY * pow(max(dot(V, -L), 0.0), 2.5) * 0.06;
      col += KEY * ggx(nh, max(ndlc, 0.02), ndv, 0.6) * ndlc * sh * 0.05;

      // a lâmina: fio de ouro que atravessa o topo de trás para a frente e desce pela face
      if (uSeam > 0.0 && uOpen < 0.25) {
        float len = 2.0 * R + H;
        float s = uSeam * len;
        float onTop = step(H - 0.035, q.y);
        float pos = onTop > 0.5 ? q.z + R : (q.z > 0.0 ? 2.0 * R + H - q.y : 1e3);
        float w = 1.0 - smoothstep(0.0018, 0.007, abs(q.x));
        float on = 1.0 - smoothstep(s - 0.02, s + 0.01, pos);
        float k = 1.0 - uOpen * 4.0;
        col += vec3(1.0, 0.72, 0.3) * w * on * 2.4 * k;
        vec3 tip = s < 2.0 * R ? vec3(0.0, H, -R + s) : vec3(0.0, H - (s - 2.0 * R), R);
        float dS = length(q - tip);
        col += vec3(1.0, 0.84, 0.52) * exp(-dS * 40.0) * 3.0 * k * (1.0 - step(0.995, uSeam));
      }
    }
    return col;
  }

  // ombro suave: linear até 0,8, comprime só o brilho
  vec3 tone(vec3 c) {
    vec3 k = 0.8 + 0.2 * (1.0 - exp(-(c - 0.8) / 0.2));
    c = mix(c, k, step(0.8, c));
    // como o sensor da câmera: perto do branco os canais se encontram e o tom desbota
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return mix(c, vec3(l) * vec3(1.0, 0.96, 0.86), smoothstep(0.55, 0.95, l) * 0.45);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec3 fw = normalize(uTa - uRo);
    vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(rt, fw);
    vec3 rd = normalize(uv.x * rt + uv.y * up + uFocal * fw);
    vec3 ro = uRo;

    // esfera envolvente das duas metades
    vec3 bc = 0.5 * (uOffL + uOffR) + vec3(0.0, H * 0.5, 0.0);
    float br = 1.36 + 0.5 * length(uOffR - uOffL);
    vec3 oc = ro - bc;
    float bb = dot(oc, rd);
    float disc = bb * bb - dot(oc, oc) + br * br;

    float tHit = -1.0;
    float id = 0.0;
    float dmin = 1e9, tmin = 0.0;
    float pix = 1.6 / (uRes.y * uFocal);

    if (disc > 0.0) {
      float sq = sqrt(disc);
      float t = max(0.0, -bb - sq);
      float tEnd = -bb + sq;
      for (int i = ZERO; i < STEPS; i++) {
        vec2 h = map(ro + rd * t);
        float k = h.x / t;
        if (k < dmin) { dmin = k; tmin = t; }
        if (h.x < 0.0004 * t) { tHit = t; id = h.y; break; }
        // as membranas do ouro são finas: passo mais curto perto delas
        t += h.x * (h.x < 0.02 ? 0.7 : 0.92);
        if (t > tEnd) break;
      }
    }

    // cobertura do objeto: 1 no acerto, parcial na silhueta (anti-aliasing analítico)
    float cov = 0.0;
    float tS = tHit;
    if (tHit > 0.0) {
      cov = 1.0;
    } else if (dmin < pix * 1.2 && tmin > 0.0 && (ro.y + rd.y * tmin) > 0.02) {
      cov = 1.0 - smoothstep(0.0, pix * 1.2, dmin);
      tS = tmin;
      id = map(ro + rd * tmin).y;
    }

    float tf = rd.y < 0.0 ? -ro.y / rd.y : -1.0;
    vec3 pf = ro + rd * max(tf, 0.0);
    float far = length(pf.xz - bc.xz);
    bool floorOn = tf > 0.0 && cov < 1.0 && far < 5.0;

    vec3 po = ro + rd * max(tS, 0.0);
    vec3 n = cov > 0.0 ? calcNormal(po) : vec3(0.0, 1.0, 0.0);

    // uma só sombra por pixel: do objeto se ele domina o pixel, senão do chão
    bool objShadow = cov > 0.5 || !floorOn;
    float lift = mod(id, 10.0) > 1.5 && mod(id, 10.0) < 2.5 ? 0.03 : 0.006;
    float sh = 1.0;
    if (cov > 0.0 || floorOn) sh = softShadow(objShadow ? po + n * lift : pf + vec3(0.0, 0.002, 0.0), uL);

    vec4 outc = vec4(0.0);
    if (floorOn) {
      float dd = mapLite(pf + vec3(0.0, 0.01, 0.0)).x;
      float contact = 1.0 - smoothstep(0.0, 0.14, dd);
      float fs = objShadow ? 1.0 : sh;
      // sombra densa junto do bolo, mais clara longe dele
      float a = (1.0 - fs) * mix(0.6, 0.3, smoothstep(0.6, 2.6, far)) + contact * contact * contact * 0.32;
      a *= 1.0 - smoothstep(3.0, 5.0, far);
      outc = vec4(vec3(0.33, 0.29, 0.27) * a, a);
    }

    if (cov > 0.0) {
      vec3 col = shade(po, n, rd, id, sh);
      col = pow(tone(col * 0.92), vec3(1.0 / 2.2));
      outc = vec4(col * cov, cov) + outc * (1.0 - cov);
    }

    // pontilhado contra faixas no gradiente
    outc.rgb += (hash(vec3(gl_FragCoord.xy, uTime)) - 0.5) / 255.0 * outc.a;
    gl_FragColor = outc * uAlpha;
  }
`;
