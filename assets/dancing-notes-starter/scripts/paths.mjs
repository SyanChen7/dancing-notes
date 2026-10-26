import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const projectPath = (...parts) => path.join(projectRoot, ...parts);

// JSON paths are public-relative URL paths, not local filesystem paths.
export function publicAsset(value, field) {
  if (typeof value !== 'string' || !value || value.includes('\\') ||
      /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('/') ||
      /[?#%]/.test(value) || value.split('/').some(p => !p || p === '.' || p === '..') ||
      value.startsWith('public/')) {
    throw new Error(`${field}: use a public-relative path such as score/score.svg; no public/ prefix, absolute paths, URLs or backslashes.`);
  }
  const target = projectPath('public', value);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    throw new Error(`${field}: missing public/${value}. Generate/copy your own asset there; the starter does not include song assets.`);
  }
  return target;
}
