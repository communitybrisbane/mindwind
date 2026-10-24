const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(__dirname, 'mindwind-mind-w-shadow.svg'), 'utf8');

async function build() {
  const icon = source
    .replace('width="1200" height="900" viewBox="0 0 1200 900"', 'width="1024" height="1024" viewBox="70 -168 1060 1060"')
    .replace('<defs>', '<rect x="70" y="-168" width="1060" height="1060" fill="#f1e9d6"/><defs>');
  fs.writeFileSync(path.join(root, 'app/icon.svg'), icon);
  for (const size of [192, 512]) {
    await sharp(Buffer.from(icon)).resize(size, size).png().toFile(path.join(root, `public/icon-${size}.png`));
  }
  await sharp(Buffer.from(icon)).resize(180, 180).png().toFile(path.join(root, 'app/apple-icon.png'));
}
build().catch(error => { console.error(error); process.exitCode = 1; });
