// Monograma demonstrativo "SA" (Seu Atelier) (substitui a logo original do cliente).
import sharp from 'sharp';

const svg = (color, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720">
  ${bg ? `<rect width="600" height="720" fill="${bg}"/>` : ''}
  <ellipse cx="300" cy="360" rx="270" ry="335" fill="none" stroke="${color}" stroke-width="10"/>
  <text x="300" y="440" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="260" fill="${color}">SA</text>
</svg>`;

await sharp(Buffer.from(svg('#fff'))).png({ compressionLevel: 9 }).toFile('public/media/monogram.png');

const favicon = async (size, file) => {
  const glyph = await sharp(Buffer.from(svg('#F3EEE7'))).resize({ height: Math.round(size * 0.8) }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: '#3a2216' } })
    .composite([{ input: glyph, gravity: 'center' }])
    .png()
    .toFile(`public/${file}`);
};
await favicon(32, 'favicon-32.png');
await favicon(180, 'apple-touch-icon.png');
await favicon(512, 'icon-512.png');
