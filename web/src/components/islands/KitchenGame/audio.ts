/**
 * Procedural sound effects using ZzFX (inline, zero dependencies).
 * Each sound is a set of parameters — no audio files needed.
 *
 * ZzFX Micro by Frank Force — MIT License
 * https://github.com/KilledByAPixel/ZzFX
 */

// ZzFX micro — the entire engine in one function
// prettier-ignore
const zzfxV = 0.3;
// prettier-ignore
function zzfx(...t:number[]){return zzfxP(zzfxG(...t))}
// prettier-ignore
function zzfxP(...t:any[]){const e=zzfxX.createBufferSource(),f=zzfxX.createBuffer(t.length,t[0].length,zzfxR);t.map((d:any,i:number)=>f.getChannelData(i).set(d));e.buffer=f;e.connect(zzfxX.destination);e.start();return e}
// prettier-ignore
function zzfxG(p=1,k=.05,b=220,e=0,r=0,t=.1,q=0,D=1,u=0,y=0,v=0,z=0,l=0,E=0,A=0,F=0,c=0,w=1,m=0,B=0){const d=2*Math.PI,R=44100,G=u*=500*d/R**2;let C=b*=(1+k*2*Math.random()-k)*d/R,g=[];let H=0,I=0,J=0,K=1,L=0,M=0,a:any,x:number,h:number,f=0;e=R*e+9;m*=R;r*=R;t*=R;c*=R;y*=500*d/R**3;A*=d/R;v*=d/R;z*=R;l=R*l|0;for(h=e+m+r+t+c|0;J<h;g[J++]=a){++M>100*F&&(M=0,a=H*b*Math.sin(I*d-d/4),a=q?q>1?q>2?q>3?Math.sin((a%d)**3):Math.max(Math.min(Math.tan(a),1),-1):1-(2*a/d%2+2)%2:1-4*Math.abs(Math.round(a/d)-a/d):Math.sin(a),a=(l?1-B+B*Math.sin(d*J/l):1)*(a>=0?1:-1)*Math.abs(a)**D*zzfxV*p*(J<e?J/e:J<e+m?1-(J-e)/m*(1-w):J<e+m+r?w:J<e+m+r+t?(e+m+r+t-J)/t:0),a=c?a/2+(c>J?0:(J<c?1-(J-c)/c:1)*g[J-c|0]/2):a);H+=1+y*Math.sin(I),I+=u+=A,b+=b*v,K&&++K>z&&(b+=y,C+=y,K=0),!l||++L%l||(b=C,u=G,K=K||1)}return g}

let zzfxX: AudioContext;
const zzfxR = 44100;

function ensureAudio() {
  if (!zzfxX) {
    zzfxX = new AudioContext();
  }
  if (zzfxX.state === 'suspended') {
    zzfxX.resume();
  }
}

/** Alarm beep — urgent, short */
export function playAlarm() {
  ensureAudio();
  zzfx(1, .05, 880, .02, .1, .1, 2, 1.5, 0, 0, 0, 0, 0, 0, 0, 0, .02, .5, .02);
}

/** Positive confirmation ding */
export function playDing() {
  ensureAudio();
  zzfx(1, .05, 587, .02, .15, .3, 0, 1, 0, 0, 200, .05, 0, 0, 0, 0, 0, .8, .05);
}

/** Paper slide / receipt */
export function playPaper() {
  ensureAudio();
  zzfx(.8, .05, 100, .01, .05, .2, 4, .5, 0, 0, 0, 0, 0, .5, 50, .1, 0, .5, .01);
}

/** Wrench / fix sound */
export function playFix() {
  ensureAudio();
  zzfx(.6, .05, 300, .01, .08, .1, 0, 2, 0, 3, 50, .02, 0, 0, 0, 0, .05, .8, .03);
}

/** Step / footstep */
export function playStep() {
  ensureAudio();
  zzfx(.2, .05, 60, 0, .01, .02, 4, .5, 0, 0, 0, 0, 0, 0, 0, 0, 0, .3, .01);
}
