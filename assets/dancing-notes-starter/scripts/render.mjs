import path from 'node:path';
import {createRequire} from 'node:module';
import {projectRoot, projectPath, publicAsset} from './paths.mjs';
const require = createRequire(import.meta.url);
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
function run(command,args){
 const r=spawnSync(command,args,{stdio:'inherit',cwd:projectRoot});
 if(r.error)throw r.error;
 if(r.status!==0)process.exit(r.status??1);
}
run(process.execPath,[projectPath('scripts/validate.mjs')]);
fs.mkdirSync(projectPath('output'),{recursive:true});
// Resolve the installed package instead of assuming a flat node_modules layout.
const cliPackage = require.resolve('@remotion/cli/package.json');
const cliMeta = JSON.parse(fs.readFileSync(cliPackage, 'utf8'));
const cliEntry = path.resolve(path.dirname(cliPackage), cliMeta.bin.remotion);
run(process.execPath,[cliEntry,'render','src/index.ts','MusicScoreVisualizer','output/silent.mp4','--muted','--concurrency=2','--codec=h264','--crf=17',...process.argv.slice(2)]);
const data=JSON.parse(fs.readFileSync(projectPath('src/score-data.json')));
const settings=JSON.parse(fs.readFileSync(projectPath('src/settings.json')));
const rate=48000,delay=Math.round(settings.introFrames/settings.fps*rate),duration=(Math.ceil(data.musicDuration*settings.fps)+settings.introFrames)/settings.fps;
run('ffmpeg',['-y','-i','output/silent.mp4','-i',publicAsset(data.audioPath, 'audioPath'),
 '-filter_complex',`[1:a]aresample=${rate},adelay=${delay}S:all=1,apad[a]`,
 '-map','0:v:0','-map','[a]','-t',String(duration),'-c:v','copy','-c:a','aac','-b:a','256k','-movflags','+faststart','output/music-score.mp4']);
console.log('Final: output/music-score.mp4. Verify audio offset and clipping before sharing.');
