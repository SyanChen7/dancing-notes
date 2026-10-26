import type {Activation} from './performance';
export type ScoreData = {
  title: string;
  subtitle: string;
  composer: string;
  svgPath: string;
  audioPath: string;
  width: number;
  height: number;
  musicDuration: number;
  events: Activation[];
  activations: Activation[];
  // Seconds before intro offset; x/y are SVG coordinates, not world coordinates.
  camera: {time: number; x: number; y: number}[];
};
