import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  continueRender,
  delayRender,
  cancelRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree, useStore} from '@react-three/fiber';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {BokehPass} from 'three/examples/jsm/postprocessing/BokehPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import rawData from './score-data.json';
import type {ScoreData} from './types';
import {STYLE, SCORE_SCALE} from './config';
import {cameraTrack} from './camera';
const data: ScoreData = rawData;
import {
  INTRO_FRAMES,
  arcPoint,
  activeRingsAt,
  groupLandings,
  performanceAt,
  type Activation,
} from './performance';

const S = SCORE_SCALE;
const violet = new THREE.Color('#bda0ff');
const amber = new THREE.Color('#ffbc6d');
const landings = {
  1: groupLandings(data.activations, 1),
  2: groupLandings(data.activations, 2),
};

// SVG is engraved from MusicXML. Rasterization happens only at GPU texture upload,
// retaining the same viewBox transform as the measured SVG notehead coordinates.
const useScoreTexture = () => {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const [handle] = useState(() => delayRender('Load engraved MusicXML SVG'));
  useEffect(() => {
    let disposed = false;
    let result: THREE.CanvasTexture | undefined;
    fetch(staticFile(data.svgPath))
      .then((r) => r.text())
      .then((svg) => {
        const image = new Image();
        const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
        if (doc.querySelector('parsererror')) throw new Error('Invalid score SVG');
        doc.documentElement.setAttribute('width', String(data.width*4));
        doc.documentElement.setAttribute('height', String(data.height*4));
        const url = URL.createObjectURL(new Blob(
          [new XMLSerializer().serializeToString(doc.documentElement)],
          {type:'image/svg+xml'},
        ));
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = data.width * 4;
          canvas.height = (data.height + 100) * 4;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#b5b0ac';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 400, data.width * 4, data.height * 4);
          ctx.fillStyle = '#121018';
          ctx.textAlign = 'center';
          ctx.font = '72px Georgia';
          ctx.fillText(data.title, canvas.width/2, 158);
          ctx.font = '38px Georgia';
          ctx.fillText(data.subtitle, canvas.width/2, 222);
          ctx.font = '30px Georgia';
          ctx.textAlign = 'right';
          ctx.fillText(data.composer, canvas.width-170, 320);
          result = new THREE.CanvasTexture(canvas);
          result.colorSpace = THREE.SRGBColorSpace;
          result.anisotropy = 16;
          result.needsUpdate = true;
          URL.revokeObjectURL(url);
          if (!disposed) setTexture(result);
          else result.dispose();
          continueRender(handle);
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          cancelRender(new Error('Score SVG failed to load'));
        };
        image.src = url;
      })
      .catch(cancelRender);
    return () => {
      disposed = true;
      result?.dispose();
    };
  }, [handle]);
  return texture;
};

const glowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const c = canvas.getContext('2d')!;
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.6)');
  g.addColorStop(0.23, 'rgba(255,255,255,0.25)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.05)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
};

const NoteRing: React.FC<{note: Activation; t: number}> = ({note, t}) => {
  const age = t - note.time;
  if (age < 0 || age > 3.6) return null;
  const sustain = note.kind === 'sustain';
  const flash = Math.exp(-age / 0.14) * (sustain ? 0.55 : 1);
  const fade = Math.max(0, 1 - age / 3.6) ** 1.15;
  const expansion = 1 + 0.23 * (1 - Math.exp(-age / 0.055));
  const color = (note.staff === 1 ? violet : amber)
    .clone()
    .multiplyScalar((1.05 + 3.6 * flash) * (note.velocity / 80));
  return (
    <group
      position={[note.x * S, 0.028, note.y * S]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={expansion}
    >
      <mesh>
        <ringGeometry args={[0.142, 0.168, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={fade * (sustain ? 0.8 : 1)}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.001]} scale={1 + 0.3 * (1 - flash)}>
        <ringGeometry args={[0.179, 0.19, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={flash * 0.42}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

const Performer: React.FC<{staff: 1 | 2; t: number; glow: THREE.Texture}> = ({
  staff,
  t,
  glow,
}) => {
  if (!landings[staff].length) return null;
  const motion = performanceAt(landings[staff], t);
  const color = staff === 1 ? violet : amber;
  const points = Array.from(
    {length: 25},
    (_, i) =>
      new THREE.Vector3(
        ...arcPoint(motion.from, motion.to, (motion.u * i) / 24),
      ),
  );
  const curve = new THREE.CatmullRomCurve3(points);
  const core = color
    .clone()
    .lerp(new THREE.Color('white'), 0.58)
    .multiplyScalar(motion.landed ? 2.8 : 1.6);
  const power = motion.landed ? 1 : 0.4;
  return (
    <group>
      {/* An actual opaque, high-luminance sphere remains legible with Bloom disabled. */}
      <group position={motion.position} visible={motion.opacity > 0}>
        <mesh
          scale={[
            1 + motion.pulse * 0.075,
            1 - motion.pulse * 0.15,
            1 + motion.pulse * 0.075,
          ]}
        >
          <sphereGeometry args={[0.083, 24, 16]} />
          <meshBasicMaterial color={core} toneMapped={false} transparent opacity={motion.opacity} />
        </mesh>
        <sprite scale={[0.34, 0.34, 1]}>
          <spriteMaterial
            map={glow}
            color={color.clone().multiplyScalar(1.25)}
            transparent
            opacity={0.17 * power * motion.opacity}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>
      {motion.trailOpacity > 0 && motion.from.scoreId !== motion.to.scoreId && (
        <mesh>
          <tubeGeometry args={[curve, 32, 0.011, 6, false]} />
          <meshBasicMaterial
            color={color.clone().multiplyScalar(2)}
            transparent
            opacity={motion.trailOpacity}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      )}
      <pointLight
        position={[motion.position[0], 1.25, motion.position[2]]}
        color={color}
        intensity={1.25 * power}
        distance={8.6}
        decay={2}
      />
      <mesh
        position={[motion.position[0], 0.012, motion.position[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[9, 7.5]} />
        <meshBasicMaterial
          map={glow}
          color={color}
          transparent
          opacity={0.16 * power}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

const Scene: React.FC<{texture: THREE.Texture}> = ({texture}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame - INTRO_FRAMES) / fps;
  const state = useThree();
  const store = useStore();
  const {camera, gl, scene, size} = state;
  const glow = useMemo(glowTexture, []);
  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    const dof = new BokehPass(scene, camera, {
      focus: 17,
      aperture: 0.0008,
      maxblur: 0.004,
    });
    composer.addPass(dof);
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.65,
      0.6,
      0.8,
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    return {composer, dof, bloom};
  }, [gl, scene, camera, size.width, size.height]);
  useLayoutEffect(() => {
    pipeline.composer.setSize(size.width, size.height);
    // Subscribe only to ThreeCanvas's render dispatch. No clock-driven animation.
    const callback = {current: () => pipeline.composer.render(0)};
    return state.internal.subscribe(callback, 1, store);
  }, [pipeline, state, size, store]);
  useLayoutEffect(() => {
    const track = cameraTrack(data.camera,t);
    const x = track.x;
    const dolly = 1 - 0.018 * Math.max(0,t) / data.musicDuration;
    const distance = STYLE.cameraDistance * dolly;
    const aimZ = track.z - .65;
    camera.position.set(x + .65 - 5.85*distance, 9.3*distance, aimZ + 13.85*distance);
    camera.up.set(.055,1,0);
    camera.lookAt(x+.65,0,aimZ);
    camera.updateMatrixWorld();
    const focusPoint = new THREE.Vector3(x, 0, track.z).applyMatrix4(
      camera.matrixWorldInverse,
    );
    (pipeline.dof.uniforms as Record<string, THREE.IUniform>).focus.value =
      -focusPoint.z;
    pipeline.bloom.strength =
      0.57 +
      0.1 *
        Math.max(
          ...data.events.map((n) =>
            t >= n.time ? Math.exp(-(t - n.time) / 0.12) : 0,
          ),
        );
  }, [t, camera, pipeline]);
  useEffect(() => {
    state.advance(frame / fps);
  }, [frame, fps, state, pipeline]);
  useEffect(
    () => () => {
      glow.dispose();
      pipeline.composer.dispose();
      pipeline.bloom.dispose();
      pipeline.dof.dispose();
    },
    [glow, pipeline],
  );
  return (
    <>
      <color attach="background" args={['#111015']} />
      {/* Restore readable paper while preserving the dark palette and emissive contrast. */}
      <ambientLight intensity={STYLE.ambient} />
      <directionalLight
        position={[10, 18, -10]}
        intensity={STYLE.directional}
        color="#d2cbdc"
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[(data.width * S) / 2, -0.006, ((data.height - 100) * S) / 2]}
      >
        <planeGeometry args={[data.width * S, (data.height + 100) * S]} />
        <meshStandardMaterial map={texture} roughness={1} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[22, -0.035, 12]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#b5b0ac" roughness={1} />
      </mesh>
      <Performer staff={1} t={t} glow={glow} />
      <Performer staff={2} t={t} glow={glow} />
      {activeRingsAt(data.activations, t).map((note) => (
        <NoteRing key={note.eventId} note={note} t={t} />
      ))}
    </>
  );
};

const ReadyVisualizer: React.FC = () => {
  const {width, height} = useVideoConfig();
  const texture = useScoreTexture();
  return (
    <AbsoluteFill style={{background: '#111015'}}>
      {texture && (
        <ThreeCanvas
          width={width}
          height={height}
          frameloop="never"
          dpr={1}
          camera={{fov: 43, near: 0.1, far: 180}}
          gl={{
            antialias: true,
            alpha: false,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: STYLE.exposure,
            preserveDrawingBuffer: true,
          }}
        >
          <Scene texture={texture} />
        </ThreeCanvas>
      )}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at 50% 52%, transparent 30%, rgba(7,5,12,.20) 76%, rgba(3,2,7,.5) 110%)',
        }}
      />
      <Sequence from={INTRO_FRAMES}>
      <Audio
        src={staticFile(data.audioPath)}
      />
      </Sequence>
    </AbsoluteFill>
  );
};

export const MusicScoreVisualizer: React.FC = () => {
  if (!data.activations.length || !data.camera.length) return (
    <AbsoluteFill style={{background:'#19171d',color:'#ddd',justifyContent:'center',alignItems:'center',fontSize:38}}>
      请先按 README 生成自己的谱面、音轨与 score-data.json
    </AbsoluteFill>
  );
  return <ReadyVisualizer />;
};
