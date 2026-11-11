import artwork from './artwork.json' with { type: 'json' };
import characters from './characters.json' with { type: 'json' };
import {renderMotionPortrait} from './motion.ts';
import {renderAuraMotion} from './aura.ts';
import type { StatusState } from './schema.ts';

type Theme = keyof typeof artwork.panels;
type FieldKey = keyof typeof artwork.fields;
type FieldBox = { x:number; y:number; width:number; height:number; font_size:number; line_height?:number; padding_y?:number; align?:string };
type TextBlock = { id:string; box:FieldBox; value:string; lines:string[]; lineHeight:number; height:number };
type Insertion = { at:number; height:number };
type Cut = { from:number; to:number };
// Omit quiet space, preserving the original title, labels and bevel artwork.
const COMPACT_CUTS:Cut[]=[{from:79,to:145},{from:770,to:797},{from:900,to:925}];
const UNKNOWN = '확인 필요';
const FONT = 'Arial, Apple SD Gothic Neo, Malgun Gothic, sans-serif';
const MODE = { daily:'일상', hero:'히어로 레드', fallen:'타락한 레드', ally:'동료 레드', dark:'다크 레드' } as const;
const SCENARIO = { daily:'일상', corruption:'타락', ally:'동료', reversal:'역전' } as const;
const REALITY = { clear:'온전', hazy:'흐려짐', swapped:'뒤바뀜', lost:'상실' } as const;
const PALETTE = {
  red:{ fill:'#ff3c55',light:'#ffb2bc' },
  pink:{ fill:'#ff4db6',light:'#ffd0ef' },
  purple:{ fill:'#cd3cff',light:'#f4ceff' },
} as const;
const graphemes = new Intl.Segmenter('ko', {granularity:'grapheme'});

/** XML 1.0 text: replace illegal scalars, retain valid Unicode and line breaks. */
function clean(value:string):string {
  return Array.from(value.replace(/\r\n?/g,'\n'), char=>{
    const n=char.codePointAt(0)!;
    return n===9 || n===10 || n>=0x20&&n<=0xD7FF || n>=0xE000&&n<=0xFFFD || n>=0x10000&&n<=0x10FFFF ? char : '\uFFFD';
  }).join('');
}
function escape(value:string):string {
  const entities:Record<string,string>={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'};
  return clean(value).replace(/[&<>"']/g, char=>entities[char]!);
}
function advance(cluster:string,size:number):number {
  const c=cluster.codePointAt(0)!;
  if(cluster==='\t')return size*2;
  if(cluster===' ')return size*.35;
  if(/[.,'`!:;|]/.test(cluster))return size*.3;
  if(/[()\[\]{}-]/.test(cluster))return size*.4;
  if(c>0xFFFF)return size*1.5;
  if(c>0x7F)return size*1.02;
  if(/[MW@%]/.test(cluster))return size;
  if(/[A-Z]/.test(cluster))return size*.82;
  return size*.67;
}
function wrap(value:string,width:number,size:number):string[] {
  const result:string[]=[];
  for(const paragraph of clean(value).split('\n')){
    let line='',used=0;
    for(const token of paragraph.match(/[ \t]+|[^ \t]+/gu)??[]){
      const segments=Array.from(graphemes.segment(token),item=>item.segment);
      const tokenWidth=segments.reduce((sum,segment)=>sum+advance(segment,size),0);
      if(line&&tokenWidth<=width&&used+tokenWidth>width){result.push(line);line='';used=0;}
      for(const segment of segments){
        const next=advance(segment,size);
        if(line&&used+next>width){result.push(line);line='';used=0;}
        line+=segment;used+=next;
      }
    }
    result.push(line);
  }
  return result;
}
function block(id:string,key:FieldKey,value:string,override:Partial<FieldBox>={}):TextBlock {
  const box:FieldBox={...artwork.fields[key],...override};
  const lineHeight=box.line_height??Math.ceil(box.font_size*1.3);
  const lines=wrap(value,box.width,box.font_size);
  return {id,box,value,lines,lineHeight,height:Math.max(box.height,lines.length*lineHeight+2*(box.padding_y??0))};
}
function drawText(item:TextBlock,shift:(y:number)=>number):string {
  const {box,lines,lineHeight}=item;
  const x=box.align==='right'?box.x+box.width:box.x;
  const anchor=box.align==='right'?'end':'start';
  const top=shift(box.y)+(item.id==='thought'?(box.padding_y??0):(item.height-lines.length*lineHeight)/2);
  const rowCenter=Object.hasOwn(artwork.rowCenters,item.id)
    ? artwork.rowCenters[item.id as keyof typeof artwork.rowCenters] : undefined;
  const alignment=rowCenter===undefined?'':' dominant-baseline="central"';
  const lineY=(index:number)=>rowCenter===undefined
    ? top+index*lineHeight+box.font_size*.9 : shift(rowCenter)+index*lineHeight;
  // Every tspan is positioned explicitly. Whitespace never becomes markup.
  // Status rows use the approved label centers, not a guessed alphabetic
  // baseline. Extra lines grow downward without moving the first-line anchor.
  return `<text data-field="${item.id}" font-size="${box.font_size}" text-anchor="${anchor}"${alignment} xml:space="preserve">${lines.map((line,i)=>`<tspan x="${x}" y="${lineY(i)}">${escape(line)}</tspan>`).join('\n')}</text>`;
}
function chooseTheme(state:StatusState):Theme {
  if(typeof state.stage==='number')return state.stage>=4?'purple':state.stage>=2?'pink':'red';
  return state.mode==='dark'?'purple':state.mode==='fallen'?'pink':'red';
}
function stageLabel(state:StatusState):string {
  if(state.stage===null)return UNKNOWN;
  if(state.stage==='na')return state.scenario==='ally'?'없음 (동료)':state.scenario==='reversal'?'없음 (역전)':UNKNOWN;
  return `${state.stage}단계${state.stage===4?' (타락)':state.stage===0&&state.scenario==='daily'?' (일상)':''}`;
}
function panelSlices(insertions:Insertion[],source='#frame-shell',cuts:Cut[]=COMPACT_CUTS):string {
  let y=0;const output:string[]=[];
  const slice=(sourceY:number,length:number,height=length)=>`<svg x="0" y="${y}" width="512" height="${height}" viewBox="0 ${sourceY} 512 ${length}" preserveAspectRatio="none" overflow="hidden"><use href="${source}"/></svg>`;
  const points=[...new Set([0,artwork.height,...insertions.map(item=>item.at),...cuts.flatMap(cut=>[cut.from,cut.to])])].sort((a,b)=>a-b);
  for(let i=0;i<points.length-1;i++){
    const from=points[i]!,to=points[i+1]!;
    for(const insertion of insertions.filter(item=>item.at===from)){
      output.push(slice(from+1,1,insertion.height));y+=insertion.height;
    }
    if(cuts.some(cut=>from>=cut.from&&to<=cut.to))continue;
    output.push(slice(from,to-from));y+=to-from;
  }
  return output.join('');
}

/** Self-contained image of one immutable URL snapshot; no external fetches. */
export function renderStatus(state:StatusState):string {
  const theme=chooseTheme(state);
  const location=(state.loc??UNKNOWN)+(state.seen&&['swapped','lost'].includes(state.reality??'')?` (${state.seen})`:'');
  const reality=(state.reality===null?UNKNOWN:REALITY[state.reality])+(state.reason?` (${state.reason})`:'');
  const commands=(state.commands.status==='unknown'?[UNKNOWN,...state.commands.items]:state.commands.items.length?state.commands.items:['없음']).join('\n');
  const stage=stageLabel(state);
  const stageBox=typeof state.stage==='number'?{}:{x:170,width:301.5};
  const blocks=[
    block('name','name','양동호 (20세)'),block('height','height','182 cm'),block('weight','weight','84 kg'),
    block('location','location',location),block('time','time',state.time??UNKNOWN),
    block('stage','corruption',stage,stageBox),
    block('reality','reality',reality),block('arousal','arousal',state.arousal===null?UNKNOWN:`${state.arousal}%`),
    block('shame','shame',state.shame===null?UNKNOWN:`${state.shame}%`),
    block('commands','command',commands),
    // Start just below the title rail, preserving the original bottom edge.
    block('thought','thought',state.thought??UNKNOWN,{y:856,height:62}),
  ];
  // The last profile rows end inside beveled corners. Insert before
  // those corners, after the fixed icon/label ink, so the bevel stays intact.
  const cutFor=(item:TextBlock)=>item.id==='time'?285:item.id==='thought'?930:item.box.y+item.box.height;
  const profileIds=new Set(['name','height','weight','location','time']);
  const profileInsertions=blocks.filter(item=>profileIds.has(item.id)&&item.height>item.box.height).map(item=>({at:cutFor(item),height:item.height-item.box.height})).sort((a,b)=>a.at-b.at);
  const profileGrowth=profileInsertions.reduce((sum,item)=>sum+item.height,0);
  // Keep native profile row sizes and align its top with the user-marked
  // position immediately below the title bar.
  const profileShift=(y:number)=>y+profileInsertions.filter(item=>item.at<=y).reduce((sum,item)=>sum+item.height,0);
  const insertions=[{at:472,height:54+profileGrowth},...blocks.filter(item=>!profileIds.has(item.id)&&item.height>item.box.height).map(item=>({at:cutFor(item),height:item.height-item.box.height}))].sort((a,b)=>a.at-b.at);
  const shift=(y:number)=>y+insertions.filter(item=>item.at<=y).reduce((sum,item)=>sum+item.height,0)-COMPACT_CUTS.reduce((sum,cut)=>sum+Math.max(0,Math.min(y,cut.to)-cut.from),0);
  const height=shift(artwork.height);
  const portrait=characters.frames[theme];
  // Keep the character at its existing scale, but let its lower edge meet
  // the marked center of the status title (native y519).
  const portraitTop=100;
  const portraitBottom=Math.min(shift(520),portraitTop+464);
  // Fade only the hero's dark glass into the status surface. The original
  // bright rails and lettering are restored independently, so there is no
  // rectangular cutoff at native y493 and no dimmed frame/title.
  const frameShell=`<linearGradient id="hero-shell-visibility" gradientUnits="userSpaceOnUse" x1="0" y1="448" x2="0" y2="536"><stop stop-color="black"/><stop offset="1" stop-color="white"/></linearGradient><filter id="frame-ink" x="0" y="0" width="512" height="960" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0.333333 0.333333 0.333333 0 0" result="frame-ink-light"/><feComposite in="frame-ink-light" in2="SourceAlpha" operator="in"/><feComponentTransfer><feFuncA type="linear" slope="4" intercept="-1.5"/></feComponentTransfer><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/></filter><mask id="frame-shell-cutout" x="0" y="0" width="512" height="960" maskUnits="userSpaceOnUse"><rect width="512" height="960" fill="white"/><rect x="24" y="79" width="464" height="457" fill="url(#hero-shell-visibility)"/><rect x="296" y="96" width="202" height="352" fill="black"/><svg x="24" y="448" width="464" height="88" viewBox="24 448 464 88" overflow="hidden"><use href="#approved-panel" filter="url(#frame-ink)"/></svg></mask><g id="frame-shell" mask="url(#frame-shell-cutout)"><use href="#approved-panel"/></g>`;
  const profile=artwork.panels[theme].profile;
  const profileBottom=profileShift(297);
  const profileOutline=`M310 98 H482 L494 110 V${profileBottom-12} L482 ${profileBottom} H310 L298 ${profileBottom-12} V110 Z`;
  // A single contour owns the glass, border and clipping. Only the dark fill
  // is translucent; original icons, labels and dynamic values stay opaque.
  const profileLayer=`<svg data-basic-info="true" data-bottom="${profileBottom}" x="297" y="97" width="198" height="${201+profileGrowth}" viewBox="297 97 198 ${201+profileGrowth}" overflow="hidden"><defs><clipPath id="basic-info-clip"><path d="${profileOutline}"/></clipPath></defs><path data-profile-surface="true" d="${profileOutline}" fill="#08060b" fill-opacity="0.8" stroke="${profile.stroke}" stroke-width="0.8" stroke-opacity="0.7"/><g clip-path="url(#basic-info-clip)">${profile.rules.map(y=>`<path d="M298 ${profileShift(y)} H494" fill="none" stroke="${profile.stroke}" stroke-width="0.8" stroke-opacity="0.25"/>`).join('')}${profile.icons.map(icon=>`<image x="${icon.x}" y="${profileShift(icon.y)}" width="${icon.width}" height="${icon.height}" href="${icon.image}"/>`).join('')}<g fill="#fff7ff" font-family="${FONT}">${profile.labels.map(label=>`<text x="${label.x}" y="${profileShift(label.y)}" font-size="${label.size}" font-weight="${label.weight}">${escape(label.text)}</text>`).join('')}</g></g></svg>`;
  // Draw the unchanged character over the scene's dark tint. The inverse
  // light mask preserves bright rails and title lettering in front, while
  // dark header fill cannot cut it off early. The profile glass is painted
  // afterwards so the image behind it can show through its translucent fill.
  const portraitOcclusion=`<filter id="frame-occlusion" x="0" y="0" width="512" height="${height}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0.333333 0.333333 0.333333 0 0" result="frame-light"/><feComposite in="frame-light" in2="SourceAlpha" operator="in"/><feComponentTransfer><feFuncA type="linear" slope="-4" intercept="2.5"/></feComponentTransfer><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/></filter><mask id="portrait-visibility" x="0" y="0" width="512" height="${height}" maskUnits="userSpaceOnUse"><g filter="url(#frame-occlusion)">${panelSlices(insertions)}</g></mask>`;
  const animatedStage=state.stage===2||state.stage===3?state.stage:null;
  const auraStage=state.stage===1||state.stage===2||state.stage===3||state.stage===4?state.stage:null;
  const portraitBackdrop=auraStage?renderAuraMotion(portraitBottom,auraStage,height):`<image data-scene-background="true" x="0" y="0" width="512" height="${height}" preserveAspectRatio="none" href="${artwork.panels[theme].aura}"/>`;
  const portraitLayer=animatedStage?renderMotionPortrait(portraitTop,animatedStage):`<svg data-character="${theme}" x="14" y="${portraitTop}" width="350" height="464" viewBox="${portrait.x} ${portrait.y} ${portrait.width} ${portrait.height}" preserveAspectRatio="xMidYMin slice" overflow="hidden"><use href="#character-sprite"/></svg>`;
  const characterSprite=animatedStage?'':`<image id="character-sprite" width="${characters.width}" height="${characters.height}" href="${characters.image}"/>`;
  const percentage=(key:'arousal'|'shame')=>{
    const value=state[key];const count=value===null?0:Math.round(value/100*8);
    return artwork.gauges[key].cells.slice(0,count).map(cell=>`<rect data-gauge="${key}" x="${cell.x}" y="${shift(cell.y)}" width="${cell.width}" height="${cell.height}" rx="1" fill="url(#gauge-fill)" stroke="${PALETTE[theme].light}"/>`).join('');
  };
  const corruption=typeof state.stage==='number'?artwork.gauges.corruption.cells.slice(0,state.stage).map(cell=>`<rect data-gauge="stage" x="${cell.x}" y="${shift(cell.y)}" width="${cell.width}" height="${cell.height}" fill="url(#gauge-fill)"/>`).join('')
    :`<rect x="165" y="${shift(550)}" width="115" height="32" fill="#100a16"/>`;
  const description=`장소·시간: ${location} | ${state.time??UNKNOWN}\n모드: ${state.mode===null?UNKNOWN:MODE[state.mode]}\n시나리오: ${state.scenario===null?UNKNOWN:SCENARIO[state.scenario]}\n복장: ${state.outfit??UNKNOWN}\n타락 단계: ${stage}\n현실감: ${reality}\n흥분도: ${state.arousal===null?UNKNOWN:state.arousal+'%'}\n수치심: ${state.shame===null?UNKNOWN:state.shame+'%'}\n각인 명령: ${commands}\n속마음: ${state.thought??UNKNOWN}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="${height*360/512}" viewBox="0 0 512 ${height}" role="img" aria-labelledby="status-title status-desc" data-theme="${theme}"><title id="status-title">상태창</title><desc id="status-desc">${escape(description)}</desc><defs><image id="approved-panel" width="512" height="960" href="${artwork.panels[theme].frame}"/>${characterSprite}${frameShell}${portraitOcclusion}<linearGradient id="portrait-opacity" gradientUnits="userSpaceOnUse" x1="0" y1="${portraitBottom-56}" x2="0" y2="${portraitBottom}"><stop stop-color="white"/><stop offset="0.5" stop-color="#262626"/><stop offset="1" stop-color="black"/></linearGradient><mask id="portrait-fade" maskUnits="userSpaceOnUse" x="14" y="${portraitTop}" width="350" height="${portraitBottom-portraitTop}"><rect x="14" y="${portraitTop}" width="350" height="${portraitBottom-portraitTop}" fill="url(#portrait-opacity)"/></mask><linearGradient id="gauge-fill" x2="0" y2="1"><stop stop-color="${PALETTE[theme].light}"/><stop offset="1" stop-color="${PALETTE[theme].fill}"/></linearGradient></defs>${portraitBackdrop}${panelSlices(insertions)}<g mask="url(#portrait-fade)"><g mask="url(#portrait-visibility)">${portraitLayer}</g></g>${profileLayer}${corruption}${percentage('arousal')}${percentage('shame')}<g fill="#fff7ff" font-family="${FONT}" font-weight="500">${blocks.map(item=>drawText(item,profileIds.has(item.id)?profileShift:shift)).join('')}</g></svg>`;
}

export function renderError(message:string):string {
  const lines=wrap(message,312,18);
  const height=Math.max(144,100+lines.length*26);
  const item:TextBlock={id:'error',box:{x:24,y:70,width:312,height:lines.length*26,font_size:18},value:message,lines,lineHeight:26,height:lines.length*26};
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="${height}" viewBox="0 0 360 ${height}" role="img" aria-labelledby="error-title error-desc"><title id="error-title">상태창 오류</title><desc id="error-desc">${escape(message)}</desc><rect x="1" y="1" width="358" height="${height-2}" rx="12" fill="#130d19" stroke="#ee88bf"/><g fill="#fff7ff" font-family="${FONT}"><text x="24" y="42" font-size="22" font-weight="700">상태창을 표시할 수 없습니다</text>${drawText(item,y=>y)}</g></svg>`;
}
