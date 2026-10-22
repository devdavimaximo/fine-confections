import { B, H } from './timeline';

/**
 * Bombom de Queijo Brie com Goiabada, todo em SDF (raymarching num quad de tela).
 * Calibrado contra as fotos da casa (fotos/queijobrie*.jpg, números em
 * scripts/.ref-colors.txt):
 *   - casca fina de chocolate branco, cor de manteiga, acetinada, com
 *     subsurface: terminador quente e bordas que acendem contra a luz
 *   - corte com creme dourado e granulado (grumos, migalhas, poros) e goiabada
 *     em gota, quase preta no fundo, úmida, com veios de creme no alto
 *   - folha de ouro: lâminas finas amassadas (nível zero de um ruído), não um bloco
 *   - chão transparente: só sombra e contato vão para o alfa, o papel é o DOM
 * Luz-chave vem do timeline (uL): atrás-direita na vitrine, frontal no corte.
 *
 * Compilação: no Windows o WebGL passa pelo compilador D3D, que inlina cada
 * chamada e desenrola cada laço que conseguir. Por isso todos os laços começam
 * em ZERO (uniform), o ruído vem de textura, map() percorre as duas metades num
 * laço e sombra/AO/translucidez usam mapLite (sem relevo).
 */

export const vertex = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const fragment = (lite: boolean) => /* glsl */ `
  precision highp float;

  #define STEPS ${lite ? 96 : 140}
  #define SHADOW_STEPS ${lite ? 16 : 28}
  #define B ${B.toFixed(4)}
  #define H ${H.toFixed(4)}
  #define RND 0.058
  #define SHELL 0.036
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
  // células no plano do corte: poros e migalhas do creme
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

  /* ---------- forma ---------- */

  // pirâmide exata de base 1 (Inigo Quilez)
  float sdPyramid(vec3 p, float h) {
    float m2 = h * h + 0.25;
    p.xz = abs(p.xz);
    p.xz = (p.z > p.x) ? p.zx : p.xz;
    p.xz -= 0.5;
    vec3 q = vec3(p.z, h * p.y - 0.5 * p.x, h * p.x + 0.5 * p.y);
    float s = max(-q.x, 0.0);
    float t = clamp((q.y - 0.5 * p.z) / (m2 + 0.25), 0.0, 1.0);
    float a = m2 * (q.x + s) * (q.x + s) + q.y * q.y;
    float b = m2 * (q.x + 0.5 * t) * (q.x + 0.5 * t) + (q.y - m2 * t) * (q.y - m2 * t);
    float d2 = min(q.y, -q.x * m2 - q.y * 0.5) > 0.0 ? 0.0 : min(a, b);
    return sqrt((d2 + q.z * q.z) / m2) * sign(max(q.z, -p.y));
  }

  float pyr(vec3 q) {
    const float s = 2.0 * (B - RND);
    // base afundada RND abaixo do papel: a aresta de baixo fica seca, rente ao chão
    return sdPyramid((q + vec3(0.0, RND, 0.0)) / s, H / s) * s - RND;
  }

  // goiabada: gota que afina para o alto e se inclina um pouco, borda irregular
  float guava(vec3 q) {
    vec3 c = q - vec3(0.0, H * 0.5, 0.03);
    c.z += 0.18 * c.y;
    float taper = 1.0 + 1.1 * max(c.y, 0.0);
    vec3 r = vec3(B * 0.4, H * 0.34, B * 0.44);
    vec3 s = vec3(c.x * taper, c.y, c.z * taper);
    float e = (length(s / r) - 1.0) * r.x / taper;
    float g = max(e, pyr(q) + 0.06);
    return g + (noise(q * 5.0 + 3.1) - 0.5) * 0.045 + (noise(q * 16.0) - 0.5) * 0.014;
  }

  // veios de creme dentro da goiabada, no alto da gota (o brie entra na fruta)
  float marble(vec3 q) {
    vec3 w = q * vec3(5.0, 13.0, 13.0) + vec3(0.0, 0.0, 2.3);
    w += (noise(w * 0.7 + 5.0) - 0.5) * 1.6;
    float m = smoothstep(0.76, 0.82, noise(w));
    return m * smoothstep(H * 0.62, H * 0.74, q.y);
  }

  // relevo do corte: creme granulado com poros, goiabada lisa e um pouco saliente
  float cutDisp(vec3 q) {
    float di = -pyr(q);
    float g = guava(q);
    float creamM = smoothstep(SHELL, SHELL + 0.02, di) * smoothstep(-0.005, 0.02, g);
    float guavaM = 1.0 - smoothstep(-0.045, 0.0, g);
    // creme: ondas largas e macias (é um creme, não um bolo); farelo só na base e junto da casca
    float soft = fbm(q * 6.0) - 0.5;
    float crumbZone = max(1.0 - smoothstep(0.04, H * 0.18, q.y), 1.0 - smoothstep(SHELL, SHELL + 0.05, di));
    float crumbs = (fbm(q * 22.0) - 0.5) * crumbZone;
    float creamD = soft * 0.018 + (noise(q * 14.0) - 0.5) * 0.004 + crumbs * 0.01;
    // goiabada levemente afundada no creme, com fibras na direção da inclinação
    float fib = noise(vec3(q.y * 7.0 + q.z * 2.0, q.z * 34.0 - q.y * 9.0, q.x * 6.0)) - 0.5;
    // goiabada: pedaço firme e saliente, fibroso, com facetas onde a faca puxou
    // fibras na diagonal da gota (a fruta foi cozida em pedaços e prensada)
    vec3 fq = vec3(q.x * 6.0, q.y * 5.0 + q.z * 9.0, q.z * 20.0 - q.y * 14.0);
    float ridge = 1.0 - abs(noise(fq + 1.7) * 2.0 - 1.0);
    float guavaD = 0.01 + (noise(q * 4.0) - 0.5) * 0.02 + fib * 0.008 + ridge * 0.01 + (noise(q * 36.0) - 0.5) * 0.004 + marble(q) * 0.01;
    return uOpen * (creamM * creamD + guavaM * guavaD);
  }

  float hash1(float x) { return fract(sin(x * 12.9898) * 43758.5453); }

  // folha de ouro: tufo de flocos. Cada floco é uma lâmina fina, enrugada por ruído,
  // recortada num disco de borda irregular e inclinada ao acaso, como ouro amassado à mão
  float gold(vec3 q, float side) {
    vec3 c = (q - vec3(side * 0.03 * uOpen, H - 0.012, 0.0)) / 0.8;
    float bound = (length(c / vec3(0.2, 0.14, 0.19)) - 1.0) * 0.14 * 0.8;
    if (bound > 0.03) return bound;
    float d = (length(c / vec3(0.06, 0.034, 0.056)) - 1.0) * 0.034;
    for (int i = ZERO; i < 9; i++) {
      float fi = float(i) * 1.618 + side * 0.37 + 3.0;
      vec3 h = vec3(hash1(fi * 3.1), hash1(fi * 5.7), hash1(fi * 9.3));
      vec3 ctr = vec3((h.x - 0.5) * 0.17, 0.012 + h.y * 0.07, (h.z - 0.5) * 0.15);
      float az = hash1(fi * 1.7) * 6.2832;
      float tilt = 0.2 + hash1(fi * 2.9) * 0.75;
      vec3 nrm = vec3(cos(az) * sin(tilt), cos(tilt), sin(az) * sin(tilt));
      vec3 u = c - ctr;
      float k = dot(u, nrm);
      vec3 pu = u - nrm * k;
      float rr = 0.05 + 0.04 * hash1(fi * 4.3);
      float crump = (noise(u * 28.0 + fi) - 0.5) * 0.032 + (noise(u * 70.0 + fi) - 0.5) * 0.009;
      float sheet = abs(k + crump) - 0.0021;
      float edge = length(pu) - rr * (0.75 + 0.5 * noise(pu * 22.0 + fi));
      d = min(d, max(sheet, edge));
    }
    return d * 0.8;
  }

  vec3 toLocal(vec3 p, vec3 off, vec2 cs) {
    vec3 w = p - off;
    return vec3(w.x * cs.x - w.z * cs.y, w.y, w.x * cs.y + w.z * cs.x);
  }

  // side −1 = metade esquerda (x < 0), +1 = direita
  // ids: 1 casca · 2 corte · 3 ouro · 4 creme exposto no ápice
  vec2 piece(vec3 q, float side) {
    float body = max(pyr(q), q.y - (H - 0.05));
    // faces moldadas à mão: ondulação quase invisível que quebra o "plano de CG"
    if (body < 0.02) body += (noise(q * 3.5) - 0.5) * 0.004 + (noise(q * 55.0) - 0.5) * 0.0011;
    float disp = (uOpen > 0.001 && abs(q.x) < 0.05 && body < 0.05) ? cutDisp(q) : 0.0;
    float cutT = uOpen > 0.0005 ? -side * q.x - disp : -1e3;
    float solid = max(body, cutT);
    vec2 r = vec2(solid, cutT > body ? 2.0 : 1.0);
    vec3 tip = q - vec3(0.0, H, 0.0);
    if (dot(tip, tip) < 0.08) {
      // ponta de creme que aparece sob o ouro
      float cr = max((length((tip + vec3(0.0, 0.045, 0.0)) / vec3(1.0, 0.7, 1.0)) - 0.062) * 0.7, uOpen > 0.0005 ? -side * q.x : -1e3);
      if (cr < r.x) r = vec2(cr, 4.0);
      float gd = gold(q, side);
      if (gd < r.x) r = vec2(gd, 3.0);
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
      float body = pyr(q);
      float cutT = uOpen > 0.0005 ? -side * q.x : -1e3;
      vec2 h = vec2(max(body, cutT), cutT > body ? 2.0 : 1.0);
      vec3 c = q - vec3(side * 0.03 * uOpen, H - 0.005, 0.0);
      float gd = (length(c / vec3(0.11, 0.05, 0.1)) - 1.0) * 0.05;
      if (gd < h.x) h = vec2(gd, 3.0);
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

  // calibrado: face iluminada da vitrine ≈ rgb(242,209,143) com ndl ≈ 0,5
  const vec3 KEY = vec3(1.0, 0.965, 0.92) * 1.75;
  // estúdio branco: o ambiente é claro e quente (papel e paredes rebatem)
  // penumbra da foto é ocre quente rgb(109,80,45): o rebatimento tem pouco azul
  const vec3 AMB = vec3(0.24, 0.18, 0.12);

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

  // difuso com "wrap" por canal: o vermelho atravessa mais o chocolate, o terminador esquenta
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

    if (m > 3.5) {
      // creme no ápice, sob o ouro
      vec3 alb = vec3(0.92, 0.74, 0.42);
      col = alb * (KEY * wrapDiffuse(ndl, vec3(0.5, 0.35, 0.2)) * mix(1.0, sh, 0.5) + amb * 1.6);
    } else if (m > 2.5) {
      // ouro: metal, reflete o estúdio; dobras internas escurecem pela AO
      vec3 F0 = vec3(1.0, 0.72, 0.2);
      vec3 F = F0 + (1.0 - F0) * fre;
      float rough = 0.2;
      float up = smoothstep(-0.2, 0.9, r.y);
      vec3 envG = mix(vec3(0.2, 0.14, 0.07), vec3(1.25, 1.15, 0.95), up)
        + vec3(4.0, 3.7, 3.2) * pow(max(dot(r, L), 0.0), 10.0)
        + vec3(1.6) * pow(max(dot(r, normalize(vec3(-L.x, 0.6, 0.6))), 0.0), 14.0);
      col = F * envG * (0.2 + 0.8 * ao);
      col += F * KEY * ggx(nh, max(ndlc, 0.02), ndv, rough) * ndlc * sh * 1.6;
      col *= 0.85 + 0.3 * noise(q * 160.0);
    } else if (m > 1.5) {
      // o corte
      float di = -pyr(q);
      float g = guava(q);
      float mar = marble(q);
      float isShell = 1.0 - smoothstep(SHELL - 0.004, SHELL + 0.004, di);
      float isGuava = (1.0 - smoothstep(-0.003, 0.003, g)) * (1.0 - isShell) * (1.0 - mar * 0.9);

      // creme: dourado, granulado; poros escuros, migalhas claras
      // creme de brie: manteiga pálida, mais amarela onde afunda, quase branca nas pontas
      // marfim pálido que amarela perto da fruta e no fundo das ondas
      float lump = fbm(q * 6.0);
      vec3 cream = mix(vec3(0.84, 0.55, 0.2), vec3(0.92, 0.7, 0.34), smoothstep(0.32, 0.68, lump));
      cream = mix(cream, vec3(0.86, 0.52, 0.16), (1.0 - smoothstep(0.0, 0.12, g)) * 0.4);
      cream *= 0.95 + 0.08 * noise(q * 40.0);
      // perto do ápice o corte é quase só chocolate: mais amarelo e liso
      cream = mix(cream, vec3(0.92, 0.64, 0.27), smoothstep(H * 0.72, H * 0.9, q.y) * 0.6);
      // a fruta tinge o creme só num fio
      cream = mix(cream, vec3(0.78, 0.32, 0.09), (1.0 - smoothstep(0.0, 0.028, g)) * 0.5 * (1.0 - isShell));
      vec3 shellCut = vec3(0.95, 0.75, 0.4);

      // goiabada: vermelho profundo sem cinza; mais clara e alaranjada onde é fina
      float thick = clamp(-g / 0.1, 0.0, 1.0);
      float fib = noise(vec3(q.y * 7.0 + q.z * 2.0, q.z * 34.0 - q.y * 9.0, q.x * 6.0));
      vec3 gv = mix(vec3(0.36, 0.035, 0.008), vec3(0.11, 0.0015, 0.001), smoothstep(0.0, 0.45, thick));
      gv *= 0.8 + 0.4 * fib;

      vec3 alb = mix(mix(cream, gv, isGuava), shellCut, isShell);
      vec3 dif = wrapDiffuse(ndl, vec3(0.25, 0.16, 0.08));
      col = alb * (KEY * dif * sh * 0.92 + amb * 1.15);
      // creme é fosco com um brilho úmido aqui e ali
      // creme úmido: brilho acetinado largo em quase tudo, mais vivo onde está mais liso
      float wet = smoothstep(0.4, 0.7, noise(q * 9.0 + 4.0)) * (1.0 - isGuava) * (1.0 - isShell);
      col += (1.0 - isGuava) * (1.0 - isShell) * (KEY * ggx(nh, max(ndlc, 0.02), ndv, mix(0.42, 0.26, wet)) * ndlc * sh * 0.11 * (1.0 + wet) + env(r) * (0.02 + 0.25 * fre) * 0.3);
      // goiabada é gelatina: verniz nítido + reflexo do estúdio + brilho interno vermelho
      // só os lóbulos das softboxes refletem: o resto do estúdio não vela o vermelho
      float lobe = pow(max(dot(r, L), 0.0), 34.0) * 3.0 + pow(max(dot(r, normalize(vec3(-L.x, 0.5, 0.7))), 0.0), 50.0) * 0.8;
      col += isGuava * (KEY * ggx(nh, max(ndlc, 0.02), ndv, 0.12) * ndlc * sh * 0.55 + vec3(1.0, 0.92, 0.85) * lobe * (0.06 + 0.6 * fre) * 2.2);
      col += isGuava * vec3(0.5, 0.06, 0.02) * (1.0 - thick) * (0.3 * ndlc * sh + 0.04);
    } else {
      // casca de chocolate branco: manteiga, acetinada, subsurface quente
      vec3 alb = vec3(0.93, 0.72, 0.37) * (0.95 + 0.07 * noise(q * 9.0)) * (0.965 + 0.06 * noise(q * 64.0));
      alb = mix(alb, alb * vec3(1.06, 1.04, 0.98), smoothstep(0.7, 0.85, noise(q * 160.0)) * 0.5);
      vec3 dif = wrapDiffuse(ndl, vec3(0.42, 0.26, 0.1));
      col = alb * (KEY * dif * mix(vec3(1.0), vec3(sh), vec3(0.85, 0.92, 1.0)) + amb);
      // translucidez: onde a casca é fina, a luz de trás atravessa amarelada
      float th = clamp(-mapLite(p - n * 0.06).x / 0.06, 0.0, 1.0);
      float back = pow(max(dot(V, -L), 0.0), 2.5);
      col += alb * vec3(1.0, 0.62, 0.22) * KEY * (1.0 - th) * (0.12 + 0.55 * back) * 0.35;
      // acetinado: lóbulo largo de especular + um fio de brilho na borda
      col += KEY * ggx(nh, max(ndlc, 0.02), ndv, 0.42) * ndlc * sh * (0.04 + 0.5 * fre) * 0.9;
      col += env(r) * (0.035 + 0.3 * fre) * ao * 0.35;

      // a lâmina: fio de ouro que desce pela face antes do corte
      if (uSeam > 0.0 && uOpen < 0.25) {
        float yS = H * (1.0 - uSeam);
        float w = 1.0 - smoothstep(0.0018, 0.007, abs(q.x));
        float on = smoothstep(yS - 0.01, yS + 0.02, q.y) * step(0.0, q.z);
        float k = 1.0 - uOpen * 4.0;
        col += vec3(1.0, 0.72, 0.3) * w * on * 2.4 * k;
        float tipZ = B * (1.0 - yS / H);
        float dS = length(q - vec3(0.0, yS, tipZ));
        col += vec3(1.0, 0.84, 0.52) * exp(-dS * 40.0) * 3.0 * k * (1.0 - step(0.995, uSeam));
      }
    }
    return col;
  }

  // ombro suave: linear até 0,8 (casa com as medidas das fotos), comprime só o brilho
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

    // esfera envolvente das duas metades (cantos da base a ≈1,2 do centro)
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
      id = mapLite(ro + rd * tmin).y;
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
      // sombra densa como na foto (núcleo ≈ 18% do papel), mais clara longe do bombom
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
