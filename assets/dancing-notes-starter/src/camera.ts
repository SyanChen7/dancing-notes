import {SCORE_SCALE} from './config';
import type {ScoreData} from './types';

// Cubic Hermite interpolation follows explicit score-space camera keys.
// A new piece MUST supply a path that keeps both hands visible; system changes
// are not assumed to occur during a rest.
export const cameraTrack = (keys: ScoreData['camera'], t: number) => {
  if (!keys.length) throw new Error('Missing camera keys');
  if (keys.length === 1) return {x:keys[0].x*SCORE_SCALE,z:keys[0].y*SCORE_SCALE};
  let i=0; while(i+1<keys.length && keys[i+1].time<=t)i++;
  i=Math.min(i,keys.length-2);
  const a=keys[i],b=keys[i+1],h=b.time-a.time;
  const p=Math.max(0,Math.min(1,(t-a.time)/h));
  const component=(axis:'x'|'y')=>{
    const slope=(j:number)=>(keys[j+1][axis]-keys[j][axis])/(keys[j+1].time-keys[j].time);
    const tangent=(j:number)=>{
      if(j===0)return slope(0);
      if(j===keys.length-1)return slope(j-1);
      const l=slope(j-1),r=slope(j);
      return l*r<=0?0:2*l*r/(l+r);
    };
    return ((2*p**3-3*p*p+1)*a[axis]+(p**3-2*p*p+p)*h*tangent(i)+(-2*p**3+3*p*p)*b[axis]+(p**3-p*p)*h*tangent(i+1))*SCORE_SCALE;
  };
  return {x:component('x'),z:component('y')};
};
