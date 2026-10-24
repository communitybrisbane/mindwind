const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { spawnSync } = require('child_process');

const directory = __dirname;
const transparentExport = process.argv.includes('--transparent');
const exportDirectory = path.join(directory, 'exports');
if (transparentExport) fs.mkdirSync(exportDirectory, { recursive: true });
const source = fs.readFileSync(path.join(directory, 'mindwind-mirror-iowan.svg'), 'utf8');
const top = '    <use href="#mind" transform="translate(170.448402 434) scale(0.180218837 -0.180218837)"/>';
const bottom = '    <use href="#mind" transform="translate(170.448402 466) scale(0.180218837 0.180218837)"/>';
// Keep the reveal boundary fixed while the reflected word moves behind it.
const revealClip = '<clipPath id="wind-reveal" clipPathUnits="userSpaceOnUse"><rect x="0" y="450" width="1200" height="450"/></clipPath>';
const styles = `<style>
.mind-arrives { animation: mind-arrives .8s ease-out both; }
.wind-drops { animation: wind-drops 1.15s .8s ease-in-out both; }
@keyframes mind-arrives {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes wind-drops {
  from { transform: translateY(-310px); }
  to { transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .mind-arrives, .wind-drops { animation: none; }
}
</style>`;

const animated = source
  .replace('<title>mindwind — Iowan mirror wordmark</title>', '<title>mindwind — opening reflection</title>')
  .replace('<defs>', styles + '<defs>' + revealClip)
  .replace(top, `<g class="mind-arrives">${top}</g>`)
  .replace(bottom, `<g clip-path="url(#wind-reveal)"><g class="wind-drops">${bottom}</g></g>`);
fs.writeFileSync(path.join(directory, 'mindwind-opening.svg'), animated);

const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mindwind · Opening</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100svh;background:#f2f0eb;color:#006241;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Georgia,serif}main{width:min(100%,800px)}svg{display:block;width:100%;height:auto}button{margin:0 0 40px;border:1px solid #00624155;border-radius:999px;padding:12px 28px;background:transparent;color:inherit;font:inherit;cursor:pointer}button:hover{background:#d4e9e2}button:focus-visible{outline:2px solid #006241;outline-offset:4px}
</style><main aria-label="Mindwind ロゴの起動アニメーション">${animated}</main><button type="button">もう一度見る</button><script>const stage=document.querySelector('main');const original=stage.innerHTML;document.querySelector('button').addEventListener('click',()=>{stage.innerHTML=original;});</script></html>`;
fs.writeFileSync(path.join(directory, 'mindwind-opening-preview.html'), html);

// Render the same sequence as a GIF for reviewing outside a browser.
function interpolate(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i];
      let p = (t - a[0]) / (b[0] - a[0]);
      p = p * p * (3 - 2 * p);
      return a.slice(1).map((v, j) => v + (b[j + 1] - v) * p);
    }
  }
  return keys.at(-1).slice(1);
}

(async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'mindwind-opening-'));
  try {
    if (transparentExport) {
      fs.mkdirSync(path.join(temporary, 'rgba'));
      await sharp(Buffer.from(source)).resize(2400,1800).png().toFile(path.join(exportDirectory, 'mindwind-logo-transparent.png'));
      fs.copyFileSync(path.join(directory, 'mindwind-mirror-iowan.svg'), path.join(exportDirectory, 'mindwind-logo-transparent.svg'));
      fs.copyFileSync(path.join(directory, 'mindwind-opening.svg'), path.join(exportDirectory, 'mindwind-opening-transparent.svg'));
    }
    for (let i = 0; i < 80; i++) {
      const time = i / 20;
      const [topOpacity, topY] = interpolate([[0,0,12],[.8,1,0]], time);
      const [dropY] = interpolate([[.8,-310],[1.95,0]], time);
      const transparentFrame = source.replace('<defs>', '<defs>' + revealClip)
        .replace(top, `<g opacity="${topOpacity}" transform="translate(0 ${topY})">${top}</g>`)
        .replace(bottom, `<g clip-path="url(#wind-reveal)"><g transform="translate(0 ${dropY})">${bottom}</g></g>`);
      const frame = transparentFrame.replace('<defs>', '<rect width="1200" height="900" fill="#f2f0eb"/><defs>');
      if (transparentExport) {
        await sharp(Buffer.from(transparentFrame)).png().toFile(path.join(temporary, 'rgba', `${String(i).padStart(3,'0')}.png`));
      }
      await sharp(Buffer.from(frame)).resize(900,675).png().toFile(path.join(temporary, `${String(i).padStart(3,'0')}.png`));
    }
    const python = `from PIL import Image, ImageChops\nfrom pathlib import Path\nimport sys\nframes=[Image.open(p).convert('RGB') for p in sorted(Path(sys.argv[1]).glob('*.png'))]\nupper=frames[-1].crop((0,0,900,337))\nassert all(ImageChops.difference(f.crop((0,0,900,337)),upper).getbbox() is None for f in frames[16:]), 'Reflection leaked above its reveal boundary'\nassert ImageChops.difference(frames[40],frames[-1]).getbbox() is None, 'Logo did not settle'\npalette=frames[-1].quantize(colors=96)\nframes=[f.quantize(palette=palette) for f in frames]\nframes[0].save(sys.argv[2],save_all=True,append_images=frames[1:],duration=50,loop=0,optimize=True,disposal=2)\nprint('Created 4-second preview; verified reflection stays below the boundary and settles.')`;
    const result = spawnSync('python3', ['-c', python, temporary, path.join(directory,'mindwind-opening-preview.gif')], {encoding:'utf8'});
    if (result.status !== 0) throw new Error(result.stderr);
    console.log(result.stdout.trim());
    if (transparentExport) {
      const encode = (args) => {
        const result = spawnSync(process.env.MINDWIND_FFMPEG || 'ffmpeg', ['-hide_banner','-loglevel','error','-y',...args], {encoding:'utf8'});
        if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr);
      };
      const input = ['-framerate','20','-i',path.join(temporary,'rgba','%03d.png'),'-an'];
      encode([...input,'-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-alpha_bits','16',path.join(exportDirectory,'mindwind-opening-transparent.mov')]);
      encode([...input,'-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-crf','24','-b:v','0',path.join(exportDirectory,'mindwind-opening-transparent.webm')]);
      const apng = `from PIL import Image\nfrom pathlib import Path\nimport sys\nframes=[Image.open(p).convert('RGBA') for p in sorted(Path(sys.argv[1]).glob('*.png'))]\nassert frames[0].getchannel('A').getextrema()==(0,0)\nassert frames[-1].getchannel('A').getextrema()==(0,255)\nframes[0].save(sys.argv[2],save_all=True,append_images=frames[1:],duration=50,loop=1,disposal=0,blend=0)\nprint('Exported transparent PNG, SVG, MOV, WebM, and APNG.')`;
      const result = spawnSync('python3',['-c',apng,path.join(temporary,'rgba'),path.join(exportDirectory,'mindwind-opening-transparent.apng')],{encoding:'utf8'});
      if (result.status !== 0) throw new Error(result.stderr);
      console.log(result.stdout.trim());
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
})();
