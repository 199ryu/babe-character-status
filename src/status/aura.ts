import videos from './aura-video.json' with {type:'json'};

type AuraStage=1|2|3|4;
type AuraTheme=keyof typeof videos.panels;
const themeByStage:Record<AuraStage,AuraTheme>={1:'red',2:'pink',3:'pink',4:'purple'};

// Cache immutable image definitions and frame timing once per function instance.
const prepared=Object.fromEntries(Object.entries(videos.panels).map(([theme,clip])=>{
  const count=clip.frames.length;
  const time=(index:number)=>String(Number((index/count).toFixed(7)));
  const id=(index:number)=>`aura-video-${theme}-${index}`;
  const definitions=clip.frames.map((frame,index)=>`<image id="${id(index)}" width="${clip.width}" height="${clip.height}" href="${frame}"/>`).join('');
  const pictures=clip.frames.map((_,index)=>{
    const times=index===0?['0',time(1),'1']:index===count-1?['0',time(index),'1']:['0',time(index),time(index+1),'1'];
    const values=index===0?['visible','hidden','hidden']:index===count-1?['hidden','visible','visible']:['hidden','visible','hidden','hidden'];
    return `<g class="aura-video-frame" visibility="${index===0?'visible':'hidden'}"><animate attributeName="visibility" values="${values.join(';')}" keyTimes="${times.join(';')}" dur="${clip.duration}s" repeatCount="indefinite" calcMode="discrete"/><use href="#${id(index)}"/></g>`;
  }).join('');
  return [theme,{definitions,pictures,first:id(0),width:clip.width,height:clip.height,count,duration:clip.duration}];
})) as Record<AuraTheme,{definitions:string;pictures:string;first:string;width:number;height:number;count:number;duration:number}>;

/** Play the supplied aura video as embedded frames; never paint the old still beneath it. */
export function renderAuraMotion(bottom:number,stage:AuraStage=2,canvasHeight=896):string {
  const top=79,height=bottom-top,theme=themeByStage[stage],clip=prepared[theme];
  const scale=`scale(${512/clip.width} ${canvasHeight/clip.height})`;
  const poster=`<use href="#${clip.first}" transform="${scale}"/>`;
  const definitions=`<defs>${clip.definitions}<mask id="static-aura-cutout" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="${canvasHeight}"><rect width="512" height="${canvasHeight}" fill="white"/><rect x="24" y="${top}" width="464" height="${height}" fill="black"/></mask><linearGradient id="aura-edge-fade" gradientUnits="userSpaceOnUse" x1="0" y1="${bottom-64}" x2="0" y2="${bottom}"><stop stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient><mask id="aura-scene-mask" maskUnits="userSpaceOnUse" x="24" y="${top}" width="464" height="${height}"><rect x="24" y="${top}" width="464" height="${height}" fill="url(#aura-edge-fade)"/></mask></defs>`;
  const backdrop=`<rect data-aura-base="true" width="512" height="${canvasHeight}" fill="#08020e"/><g data-aura-outside="true" mask="url(#static-aura-cutout)">${poster}</g><g class="aura-static-fallback">${poster}</g>`;
  const style=`<style>.aura-static-fallback{display:none}@media(prefers-reduced-motion:reduce){.aura-video-frame{visibility:hidden!important}.aura-static-fallback{display:inline}}</style>`;
  const scene=`<svg data-aura-motion="stage-${stage}" data-aura-source="video" data-aura-theme="${theme}" data-aura-frames="${clip.count}" x="24" y="${top}" width="464" height="${height}" viewBox="24 ${top} 464 ${height}" overflow="hidden" pointer-events="none"><g data-aura-flow="true" opacity="1" mask="url(#aura-scene-mask)"><g transform="${scale}">${clip.pictures}</g></g></svg>`;
  return definitions+style+backdrop+scene;
}
