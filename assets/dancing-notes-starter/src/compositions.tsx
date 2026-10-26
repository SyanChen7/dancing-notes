import React from 'react';
import {Composition} from 'remotion';
import {MusicScoreVisualizer} from './MusicScoreVisualizer';
import data from './score-data.json';
import {FPS, INTRO_FRAMES} from './config';
export const Root: React.FC = () => (
  <Composition id="MusicScoreVisualizer" component={MusicScoreVisualizer}
    width={1920} height={1080} fps={FPS}
    durationInFrames={Math.ceil(data.musicDuration*FPS)+INTRO_FRAMES} />
);
