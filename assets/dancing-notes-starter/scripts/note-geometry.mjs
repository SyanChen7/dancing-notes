import path from 'node:path';
import fs from 'node:fs';
import {openBrowser} from '@remotion/renderer';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw new Error('Usage: node scripts/note-geometry.mjs score.svg geometry.json');
const svg=fs.readFileSync(input,'utf8');
const browser = await openBrowser('chrome');
try {
  const page = await browser.newPage({
    context: undefined,
    logLevel: 'error',
    indent: false,
    pageIndex: 0,
    onBrowserLog: () => {},
  });
  await page.evaluate((source) => {
    document.body.innerHTML = source;
  }, svg);
  const geometry = await page.evaluate(() => {
    const root = document.querySelector('svg');
    const inverse = root.getScreenCTM().inverse();
    const notes = {};
    for (const group of document.querySelectorAll('g.note')) {
      const head = group.querySelector('.notehead');
      if (!head) continue;
      const box = head.getBBox();
      const p = new DOMPoint(
        box.x + box.width / 2,
        box.y + box.height / 2,
      ).matrixTransform(inverse.multiply(head.getScreenCTM()));
      notes[group.id] = {x: p.x, y: p.y};
    }
    return {
      width: root.viewBox.baseVal.width,
      height: root.viewBox.baseVal.height,
      notes,
    };
  });

  fs.mkdirSync(path.dirname(path.resolve(output)), {recursive: true});
  fs.writeFileSync(output,JSON.stringify(geometry,null,2));
  console.log('notes',Object.keys(geometry.notes).length,'size',geometry.width,geometry.height);
} finally {await browser.close({silent:true});}
