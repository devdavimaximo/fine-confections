// Gera os assets de public/media a partir de fotos/ (originais da Maison Doce).
//   npm run images
// - fotos de produto e de mesa → WebP em duas larguras
// - logo → monograma (máscara alfa) + favicons
// - páginas do cardápio em PNG → miniaturas redondas de cada doce
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (f) => path.join(root, 'fotos', f);
const out = (f) => path.join(root, 'public', f);

await mkdir(out('media/menu'), { recursive: true });

/* ---------- fotos ---------- */

const PHOTOS = [
  'queijobrie',
  'queijobriedentro',
  'queijobriezoom',
  'macarons',
  'marcarons2',
  'macarons3',
  'macarons4',
  'macarons5',
  'mesatarte',
  'mesatarte2',
  'mesatarte3',
  'mesatarte4',
  'mesatarte5',
  'mesatarte6',
  'macarons6',
  'degustacao',
];

for (const name of PHOTOS) {
  const slug = name.replace('marcarons', 'macarons');
  for (const [w, q] of [
    [1800, 80],
    [1300, 79],
    [900, 78],
  ]) {
    await sharp(src(`${name}.jpg`))
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: q, smartSubsample: true })
      .toFile(out(`media/${slug}-${w}.webp`));
  }
}

/* ---------- monograma ---------- */

// o PNG original é creme sobre transparente: vira máscara branca, recortada
const mono = sharp(src('logo-cliente.png') /* logo original removida: use scripts/monogram.mjs */).trim({ threshold: 1 });
await mono
  .clone()
  .resize({ height: 720 })
  .ensureAlpha()
  .linear([0, 0, 0, 1], [255, 255, 255, 0])
  .png({ compressionLevel: 9 })
  .toFile(out('media/monogram.png'));

const favicon = async (size, file) => {
  const pad = Math.round(size * 0.2);
  const glyph = await sharp(src('logo-cliente.png') /* logo original removida: use scripts/monogram.mjs */)
    .trim({ threshold: 1 })
    .resize({ height: size - pad * 2 })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: '#3a2216' } })
    .composite([{ input: glyph, gravity: 'center' }])
    .png()
    .toFile(out(file));
};
await favicon(32, 'favicon-32.png');
await favicon(180, 'apple-touch-icon.png');
await favicon(512, 'icon-512.png');

// imagem de compartilhamento: o bombom de brie, enquadrado em 1200×630
await sharp(src('queijobrie.jpg'))
  .resize({ width: 1200, height: 630, fit: 'cover', position: 'attention' })
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile(out('media/og.jpg'));

/* ---------- miniaturas do cardápio ---------- */

// grade das páginas do PDF: 2 colunas × 4 linhas, círculo r≈66 px, selo de preço
// encostado embaixo à direita. Raio 50, recuado do selo, pega o doce e deixa o selo de fora.
const GRID = { cols: [150, 408], rows: [125, 329, 534, 738] };
const R = 50;

/** [arquivo, slugs em ordem de leitura, ajustes de centro por índice] */
const PAGES = [
  [
    'menu.png',
    ['tradicional', 'beijinho', 'pacoca', 'prestigio', 'ninho-nutella', 'churros', 'brulee-maracuja', 'brulee-branquinho'],
    { 5: [420, 541] },
  ],
  [
    'menu2.png',
    ['ferrero', 'amendoas', 'limao-crocante', 'belga', 'meio-amargo', 'chocolate-branco', 'coco-queimado', 'pistache'],
    { 0: [152, 125], 1: [409, 124], 2: [152, 329], 3: [409, 329], 4: [152, 534], 5: [409, 534], 6: [152, 738], 7: [402, 744] },
  ],
  [
    'menu3.png',
    ['pralines-nozes', 'praline-nuts', 'bombom-maracuja', 'caramelo-flor-de-sal', 'bombom-pacoca', 'rum-pistache', 'doce-de-leite', 'veludo-framboesa'],
    { 0: [146, 124], 1: [409, 124], 2: [152, 328], 3: [409, 328], 4: [152, 533], 5: [406, 532], 6: [152, 738], 7: [409, 737] },
  ],
  [
    'menu4.png',
    ['cheesecake-limao', 'camafeu', 'cocadinha', 'alpino-physalis', 'brownie-branco', 'brownie-nutella', 'quindim', 'pavlova'],
    { 0: [152, 125], 1: [410, 124], 2: [152, 329], 3: [405, 325], 4: [152, 534], 5: [411, 524], 6: [152, 737], 7: [410, 737] },
  ],
  [
    'menu5.png',
    ['morango-ao-leite', 'morango-trufado', 'uva-amendoas', 'cappuccino', 'tartelette-banoffee', 'tartelette-frutas', 'tartelette-limao', 'mil-folhas'],
    { 0: [151, 125], 1: [408, 124], 2: [151, 330], 3: [408, 328], 4: [151, 534], 5: [408, 533], 6: [151, 738], 7: [409, 750] },
  ],
  [
    'menu6.png',
    ['flakes-nutella', 'caixinha-pistache', 'ovomaltine', 'brie-goiabada'],
    { 0: [133, 198], 1: [391, 198], 2: [134, 404], 3: [378, 403] },
  ],
];

const disc = Buffer.from(
  `<svg width="${R * 2}" height="${R * 2}"><circle cx="${R}" cy="${R}" r="${R}" fill="#fff"/></svg>`,
);

// Fotos melhores: coloque em fotos/cardapio/<slug>.jpg (ou .jpeg, .png, .webp) e rode
// `npm run images`. Quando existe, a foto substitui o recorte do PDF, em 1000 px,
// recortada em círculo no centro do doce. A lista de slugs está no README.
const HD_DIR = path.join(root, 'fotos', 'cardapio');
const hdFor = (slug) =>
  ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'JPEG', 'PNG']
    .map((ext) => path.join(HD_DIR, `${slug}.${ext}`))
    .find((p) => existsSync(p));

const THUMB = 400; // o PDF só tem ~100 px por doce: acima disso não ganha detalhe
const HD = 800; // doce no prato ~220 px × lupa 2,6 ≈ 570 px: 800 cobre com folga

/**
 * Foto própria → círculo pronto para o prato:
 *  1. equilibra o fundo para branco quente (fundos cinza/azulados viram papel)
 *  2. acha o doce: pixels que fogem da cor do fundo, sem sombra clara nem ruído
 *  3. enquadra um quadrado centrado nele, com o doce em ~60% do lado
 */
async function processHD(file) {
  const img = sharp(file).rotate();
  const { width: W, height: H } = await img.metadata().then((m) => (m.orientation >= 5 ? { width: m.height, height: m.width } : m));
  const SMALL = 240;
  const { data, info } = await img.clone().resize(SMALL, SMALL, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => (y * info.width + x) * 3;

  // fundo = mediana da borda (2 px em volta)
  const border = [];
  for (let x = 0; x < SMALL; x++) for (const y of [0, 1, SMALL - 2, SMALL - 1]) border.push(at(x, y));
  for (let y = 0; y < SMALL; y++) for (const x of [0, 1, SMALL - 2, SMALL - 1]) border.push(at(x, y));
  const bg = [0, 1, 2].map((c) => {
    const v = border.map((i) => data[i + c]).sort((a, b) => a - b);
    return v[v.length >> 1];
  });

  // máscara do doce: distância de cor ao fundo; sombras (mais escuras, mesma cor) contam menos
  const xs = [];
  const ys = [];
  for (let y = 0; y < SMALL; y++)
    for (let x = 0; x < SMALL; x++) {
      const i = at(x, y);
      const d = [0, 1, 2].map((c) => data[i + c] - bg[c]);
      const lum = (d[0] + d[1] + d[2]) / 3;
      const chroma = Math.hypot(d[0] - lum, d[1] - lum, d[2] - lum);
      if (chroma * 2.2 + Math.max(0, -lum) * 0.55 + Math.max(0, lum) > 40) {
        xs.push(x);
        ys.push(y);
      }
    }
  const pct = (v, p) => v.sort((a, b) => a - b)[Math.min(v.length - 1, Math.floor(v.length * p))];
  let box;
  if (xs.length < 50) box = { cx: W / 2, cy: H / 2, side: Math.min(W, H) };
  else {
    // percentis 3–97: pozinho espalhado e sombra fraca não aumentam o quadro
    const x0 = (pct(xs, 0.03) / SMALL) * W;
    const x1 = (pct(xs, 0.97) / SMALL) * W;
    const y0 = (pct(ys, 0.03) / SMALL) * H;
    const y1 = (pct(ys, 0.97) / SMALL) * H;
    box = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, side: Math.max(x1 - x0, y1 - y0) / 0.66 };
  }

  // quadrado; se passar da foto, completa com a cor do fundo
  // nunca maior que a foto: completar a borda deixa emenda visível. Se o doce pede mais
  // respiro do que a foto tem, ele ocupa um pouco mais do círculo, e tudo bem
  const side = Math.round(Math.min(box.side, W, H));
  const left = Math.round(Math.min(Math.max(box.cx - side / 2, 0), W - side));
  const top = Math.round(Math.min(Math.max(box.cy - side / 2, 0), H - side));
  const pad = { top: Math.max(0, -top), left: Math.max(0, -left), bottom: Math.max(0, top + side - H), right: Math.max(0, left + side - W) };
  const gain = bg.map((v) => Math.min(1.6, 250 / Math.max(1, v)));
  // em etapas: o sharp não aplica as operações na ordem chamada (o recorte viria antes da borda)
  const toned = await img.linear(gain, [0, 0, 0]).removeAlpha().png().toBuffer();
  const padded = await sharp(toned)
    .extend({ ...pad, extendWith: 'copy' }) // repete a borda: o fundo continua sem emenda
    .png()
    .toBuffer();
  return sharp(padded)
    .extract({ left: left + pad.left, top: top + pad.top, width: side, height: side })
    .resize(HD, HD, { kernel: 'lanczos3' });
}
const discAt = (size) => sharp(disc).resize(size, size).png().toBuffer();
const used = [];

for (const [file, slugs, fix] of PAGES) {
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const target = out(`media/menu/${slug}.webp`);
    const hd = hdFor(slug);
    if (hd) {
      used.push(slug);
      const square = await (await processHD(hd)).png().toBuffer();
      await sharp(square)
        .ensureAlpha()
        .composite([{ input: await discAt(HD), blend: 'dest-in' }])
        .webp({ quality: 80, alphaQuality: 85, effort: 6 })
        .toFile(target);
      continue;
    }
    const [fx, fy] = fix[i] ?? [GRID.cols[i % 2], GRID.rows[(i / 2) | 0]];
    const cx = fx - 3;
    const cy = fy - 2;
    await sharp(src(file))
      .extract({ left: cx - R, top: cy - R, width: R * 2, height: R * 2 })
      .resize(THUMB, THUMB, { kernel: 'lanczos3' })
      .sharpen({ sigma: 0.8 })
      .composite([{ input: await discAt(THUMB), blend: 'dest-in' }])
      .webp({ quality: 88, alphaQuality: 90 })
      .toFile(target);
  }
}

if (used.length) console.log(`fotos próprias do cardápio: ${used.length} (${used.join(', ')})`);

console.log('assets ok');
