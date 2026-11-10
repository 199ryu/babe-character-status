import motion from './motion.json' with { type: 'json' };

/** Pre-render the immutable six-second loop once per function instance. */
const count=motion.frames.length;
const time=(frame:number)=>String(Number((frame/count).toFixed(7)));
const duration=`${motion.duration}s`;
const masks=motion.frames.map((frame,index)=>`<mask id="motion-alpha-${index}" maskUnits="userSpaceOnUse" x="0" y="0" width="${motion.width}" height="${motion.height}"><image width="${motion.width}" height="${motion.height}" href="${frame.alpha}"/></mask>`).join('');
const pictures=motion.frames.map((frame,index)=>{
  const times=index===0?['0',time(1),'1']:index===count-1?['0',time(index),'1']:['0',time(index),time(index+1),'1'];
  const values=index===0?['visible','hidden','hidden']:index===count-1?['hidden','visible','visible']:['hidden','visible','hidden','hidden'];
  return `<g class="motion-frame" visibility="${index===0?'visible':'hidden'}"><animate attributeName="visibility" values="${values.join(';')}" keyTimes="${times.join(';')}" dur="${duration}" repeatCount="indefinite" calcMode="discrete"/><image width="${motion.width}" height="${motion.height}" mask="url(#motion-alpha-${index})" href="${frame.color}"/></g>`;
}).join('');
const content=`<defs>${masks}</defs><style>@media(prefers-reduced-motion:reduce){.motion-frame{visibility:hidden!important}.motion-frame:first-of-type{visibility:visible!important}}</style>${pictures}`;

/** Same portrait box/occlusion as static characters; no external resources. */
export function renderMotionPortrait(top:number):string {
  const crop=motion.crop;
  return `<svg data-character="pink" data-motion="stage-2" data-matte-version="${motion.matteVersion}" x="14" y="${top}" width="350" height="464" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}" preserveAspectRatio="xMidYMin slice" overflow="hidden">${content}</svg>`;
}
