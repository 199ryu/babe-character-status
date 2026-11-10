type AuraStage=1|2|3|4;
const profiles={
  1:{style:'heat',noise:'0.006 0.004;0.009 0.006;0.006 0.004',noiseTime:'10s',warp:'8;24;8',warpTime:'6.5s',opacity:'0.35;0.62;0.35',pulseTime:'7s',seed:3},
  2:{style:'wave',noise:'0.010 0.005;0.015 0.009;0.010 0.005',noiseTime:'9s',warp:'28;56;34;28',warpTime:'4.8s',opacity:'0.52;0.9;0.65;0.52',pulseTime:'3.6s',seed:11},
  3:{style:'pulse',noise:'0.015 0.010;0.022 0.016;0.015 0.010',noiseTime:'5.5s',warp:'42;88;50;42',warpTime:'2.2s',opacity:'0.5;1;0.6;0.5',pulseTime:'2.2s',seed:19},
  4:{style:'surge',noise:'0.010 0.014;0.016 0.010;0.012 0.018;0.019 0.012;0.010 0.014',noiseTime:'5.6s',warp:'18;38;24;44;18',warpTime:'3.2s',opacity:'0.74;0.9;0.8;0.94;0.74',pulseTime:'3.6s',seed:29},
} as const;

/** Each stage has a different motion, reusing its existing colored texture. */
export function renderAuraMotion(bottom:number,stage:AuraStage=2):string {
  const top=79,height=bottom-top,p=profiles[stage];
  const distortion=`<filter id="aura-warp" x="0" y="20" width="512" height="${bottom+20}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.007" numOctaves="${stage===1?1:2}" seed="${p.seed}" result="aura-noise"><animate attributeName="baseFrequency" values="${p.noise}" dur="${p.noiseTime}" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="aura-noise" xChannelSelector="R" yChannelSelector="G" scale="36"><animate attributeName="scale" values="${p.warp}" dur="${p.warpTime}" repeatCount="indefinite"/></feDisplacementMap></filter>`;
  const texture=`<g filter="url(#aura-warp)"><g transform="translate(-40 -40) scale(1.16)"><use href="#scene-aura-texture"/></g></g>`;
  let movement:string;
  if(stage===1){
    movement=`<g data-aura-heat="true"><animateTransform attributeName="transform" type="translate" values="0 10;0 -10;0 10" dur="7.2s" repeatCount="indefinite"/>${texture}</g>`;
  }else if(stage===2){
    movement=`<g data-aura-wave="true"><animateTransform attributeName="transform" type="translate" values="-24 10;15 -8;-10 -25;-24 10" keyTimes="0;0.4;0.75;1" dur="6.4s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"/>${texture}</g>`;
  }else if(stage===3){
    movement=`<g transform="translate(256 290)"><g data-aura-expansion="true"><animateTransform attributeName="transform" type="scale" values="0.99;1.18;1.04;0.99" keyTimes="0;0.35;0.7;1" dur="2.2s" repeatCount="indefinite"/><g transform="translate(-256 -290)">${texture}</g></g></g>`;
  }else{
    // Mirrored tiles meet at identical image edges. Scrolling one full period
    // loops continuously without fading the scene or exposing a reset jump.
    movement=`<defs><svg id="aura-heat-tile" width="640" height="384" viewBox="0 90 512 384" preserveAspectRatio="none" overflow="hidden"><use href="#scene-aura-texture"/></svg><pattern id="aura-rise-pattern" x="0" y="0" width="640" height="768" patternUnits="userSpaceOnUse"><animateTransform attributeName="patternTransform" type="translate" values="0 0;0 -92;0 -172;0 -310;0 -440;0 -590;0 -768" keyTimes="0;0.13;0.26;0.41;0.6;0.78;1" dur="17s" repeatCount="indefinite"/><use href="#aura-heat-tile"/><g transform="translate(0 768) scale(1 -1)"><use href="#aura-heat-tile"/></g></pattern></defs><g data-aura-surge="true" filter="url(#aura-warp)"><rect x="-64" y="20" width="640" height="${bottom+20}" fill="url(#aura-rise-pattern)"/></g>`;
  }
  return `<svg data-aura-motion="stage-${stage}" data-aura-style="${p.style}" x="24" y="${top}" width="464" height="${height}" viewBox="24 ${top} 464 ${height}" overflow="hidden" pointer-events="none"><defs>${distortion}<linearGradient id="aura-edge-fade" gradientUnits="userSpaceOnUse" x1="0" y1="${bottom-64}" x2="0" y2="${bottom}"><stop stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient><radialGradient id="aura-core-glow"><stop stop-color="#08020e" stop-opacity="0.72"/><stop offset="1" stop-color="#08020e" stop-opacity="0"/></radialGradient><mask id="aura-scene-mask" maskUnits="userSpaceOnUse" x="24" y="${top}" width="464" height="${height}"><rect x="24" y="${top}" width="464" height="${height}" fill="url(#aura-edge-fade)"/></mask></defs><style>@media(prefers-reduced-motion:reduce){.aura-motion-layer{display:none}}</style><g class="aura-motion-layer" mask="url(#aura-scene-mask)"><g data-aura-flow="true" opacity="${stage===4?1:0.8}">${movement}${stage===4?'':`<animate attributeName="opacity" values="${p.opacity}" dur="${p.pulseTime}" repeatCount="indefinite"/>`}</g></g></svg>`;
}
