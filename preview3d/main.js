// ===== Parkle 3D preview: three.js view on top of the real Parkle engine =====
let THREE;
try{
 const src=document.getElementById('threeSrc').textContent;
 THREE=await import(URL.createObjectURL(new Blob([src],{type:'text/javascript'})));
}catch(e){
 THREE=await import('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js');
}
const $=id=>document.getElementById(id);
const COLH=['#e3343b','#2c66e0','#ffd02b','#2fae4a','#8b4ee0','#8b5a36','#f4f6fa','#1fc4d6'];
const COLN=['red','blue','yellow','green','purple','brown','white','cyan'];
const KEYC=['#f5b82e','#2bb3ff'];
const SKIN=['#fbe0c6','#f3c7a1','#e0a87e','#c08458','#97623d','#6b4428'];
const HAIR=['#2b2220','#4e3323','#8c5530','#d9a441','#9aa0aa'];
const FOGC='#9aa3b5';
const MAXLVL=32;

// ---------- renderer ----------
const qs=new URLSearchParams(location.search);
let quality=qs.get('q')==='fast'?'fast':'hd';
try{const s=localStorage.getItem('p3dq');if(s&&!qs.get('q'))quality=s}catch(e){}
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$('stage').appendChild(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(34,1,0.5,200);

// soft studio environment so paint and glass get reflections (no extra files)
function makeEnv(){
 const es=new THREE.Scene();
 const g=new THREE.SphereGeometry(50,32,16);const cols=[];const p=g.attributes.position;const ca=new THREE.Color(),top=new THREE.Color('#9fd3ff'),hor=new THREE.Color('#ffffff'),bot=new THREE.Color('#6f8f5a');
 for(let i=0;i<p.count;i++){const y=p.getY(i)/50;if(y>0)ca.copy(hor).lerp(top,Math.pow(y,0.6));else ca.copy(hor).lerp(bot,Math.min(1,-y*3));cols.push(ca.r,ca.g,ca.b)}
 g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
 es.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
 const box=new THREE.Mesh(new THREE.PlaneGeometry(30,12),new THREE.MeshBasicMaterial({color:'#ffffff'}));box.position.set(0,40,0);box.rotation.x=Math.PI/2;es.add(box);
 const pm=new THREE.PMREMGenerator(renderer);const t=pm.fromScene(es,0.03).texture;pm.dispose();return t;
}
scene.environment=makeEnv();scene.environmentIntensity=0.55;

const hemi=new THREE.HemisphereLight('#eaf6ff','#6d8a4e',1.0);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff1d6',2.4);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.02;sun.shadow.radius=3;
scene.add(sun);scene.add(sun.target);

const THEMES={
 day:{bg:'#bfe6f7',hemiS:'#eaf6ff',hemiG:'#6d8a4e',hi:1.0,sun:'#fff1d6',si:2.4,env:0.55,head:0.3,exp:1.05},
 sunset:{bg:'#f7b98b',hemiS:'#ffd2b0',hemiG:'#6a5a4a',hi:0.8,sun:'#ffb070',si:2.2,env:0.4,head:0.8,exp:1.0},
 night:{bg:'#1b2442',hemiS:'#6d7fb8',hemiG:'#1d2433',hi:0.55,sun:'#a9bcff',si:0.7,env:0.18,head:2.2,exp:1.15},
};
let theme='day';
const headMats=[];
function applyTheme(){const T=THEMES[theme];scene.background=new THREE.Color(T.bg);scene.fog=new THREE.Fog(T.bg,34,80);hemi.color.set(T.hemiS);hemi.groundColor.set(T.hemiG);hemi.intensity=T.hi;sun.color.set(T.sun);sun.intensity=T.si;scene.environmentIntensity=T.env;renderer.toneMappingExposure=T.exp;for(const m of headMats)m.emissiveIntensity=T.head;for(const m of lampMats)m.emissiveIntensity=theme==='night'?2.5:theme==='sunset'?0.8:0.05;$('bTheme').textContent={day:'Day',sunset:'Sunset',night:'Night'}[theme]}
const lampMats=[];

function applyQuality(){
 const hd=quality==='hd';
 renderer.setPixelRatio(Math.min(devicePixelRatio,hd?2:1.25));
 renderer.shadowMap.enabled=hd;sun.castShadow=hd;
 scene.traverse(o=>{if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms)m.needsUpdate=true}});
 $('bQ').textContent=hd?'HD':'Fast';resize();
}

// ---------- shared materials and textures ----------
const matCache={};
function paint(hex){return matCache['p'+hex]||(matCache['p'+hex]=new THREE.MeshStandardMaterial({color:hex,roughness:0.32,metalness:0.12}))}
function flat(hex,r=0.85){return matCache['f'+hex+r]||(matCache['f'+hex+r]=new THREE.MeshStandardMaterial({color:hex,roughness:r,metalness:0}))}
const glass=new THREE.MeshStandardMaterial({color:'#1f2f44',roughness:0.08,metalness:0.7});
const rubber=new THREE.MeshStandardMaterial({color:'#22252b',roughness:0.9});
const hub=new THREE.MeshStandardMaterial({color:'#c9ced6',roughness:0.3,metalness:0.8});
const headL=new THREE.MeshStandardMaterial({color:'#fffbe8',emissive:'#fff2c0',emissiveIntensity:0.3,roughness:0.2});headMats.push(headL);
const tailL=new THREE.MeshStandardMaterial({color:'#ff4a4a',emissive:'#ff2020',emissiveIntensity:0.3,roughness:0.3});headMats.push(tailL);
const ice=new THREE.MeshStandardMaterial({color:'#cdefff',roughness:0.05,metalness:0.1,transparent:true,opacity:0.55,depthWrite:false});

function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t}
const badgeCache={};
function badgeTex(txt,bg='#ffffff',fg='#1d2330',ring='#1d2330'){
 const k=txt+bg+fg+ring;if(badgeCache[k])return badgeCache[k];
 return badgeCache[k]=canvasTex(128,128,(x)=>{x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.arc(64,70,54,0,7);x.fill();x.fillStyle=bg;x.beginPath();x.arc(64,62,54,0,7);x.fill();x.lineWidth=9;x.strokeStyle=ring;x.stroke();x.fillStyle=fg;x.font='900 '+(txt.length>2?44:64)+'px Nunito, system-ui, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(txt,64,66)});
}
function iconTex(kind,col){
 const k='i'+kind+col;if(badgeCache[k])return badgeCache[k];
 return badgeCache[k]=canvasTex(128,128,(x)=>{
  x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.arc(64,70,52,0,7);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(64,62,52,0,7);x.fill();x.lineWidth=8;x.strokeStyle=col;x.stroke();
  x.fillStyle=col;x.strokeStyle=col;
  if(kind==='lock'){x.lineWidth=10;x.beginPath();x.arc(64,52,17,Math.PI,0);x.stroke();x.fillRect(40,52,48,36);x.fillStyle='#fff';x.beginPath();x.arc(64,68,6,0,7);x.fill()}
  else if(kind==='key'){x.lineWidth=9;x.beginPath();x.arc(48,62,14,0,7);x.stroke();x.fillRect(60,57,36,10);x.fillRect(84,57,8,22);x.fillRect(72,57,8,16)}
  else if(kind==='ice'){x.lineWidth=7;x.lineCap='round';for(let a=0;a<3;a++){const an=a*Math.PI/3;x.beginPath();x.moveTo(64-Math.cos(an)*30,62-Math.sin(an)*30);x.lineTo(64+Math.cos(an)*30,62+Math.sin(an)*30);x.stroke()}}
 });
}
function sprite(tex,s){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));m.scale.set(s,s,1);m.renderOrder=10;return m}

// ---------- geometry helpers ----------
function rbox(wx,lz,h,r){ // rounded box, footprint wx by lz, height h, sitting on y=0
 const bv=Math.min(0.05,h*0.3),W=wx/2-bv,Lh=lz/2-bv,rr=Math.max(0.01,Math.min(r,W-0.005,Lh-0.005));
 const s=new THREE.Shape();s.moveTo(-W+rr,-Lh);s.lineTo(W-rr,-Lh);s.quadraticCurveTo(W,-Lh,W,-Lh+rr);s.lineTo(W,Lh-rr);s.quadraticCurveTo(W,Lh,W-rr,Lh);s.lineTo(-W+rr,Lh);s.quadraticCurveTo(-W,Lh,-W,Lh-rr);s.lineTo(-W,-Lh+rr);s.quadraticCurveTo(-W,-Lh,-W+rr,-Lh);
 const g=new THREE.ExtrudeGeometry(s,{depth:Math.max(0.01,h-2*bv),bevelEnabled:true,bevelThickness:bv,bevelSize:bv,bevelSegments:3,curveSegments:5});
 g.rotateX(-Math.PI/2);g.translate(0,bv,0);g.computeVertexNormals();return g;
}
const gCache={};function cg(k,f){return gCache[k]||(gCache[k]=f())}
const wheelG=new THREE.CylinderGeometry(0.13,0.13,0.11,16);wheelG.rotateZ(Math.PI/2);
const hubG=new THREE.CylinderGeometry(0.065,0.065,0.115,10);hubG.rotateZ(Math.PI/2);

// vehicle shapes per style: body height, cabin [front,back] as fraction of length, cabin height, width
const VS={
 taxi:{bh:.24,cab:[.22,.86],ch:.2,w:.66,sign:1},bubble:{bh:.2,cab:[.12,.9],ch:.26,w:.64,round:1},mini:{bh:.24,cab:[.2,.88],ch:.2,w:.64},
 sedan:{bh:.25,cab:[.3,.78],ch:.21},hatch:{bh:.26,cab:[.3,.92],ch:.22},sport:{bh:.19,cab:[.38,.74],ch:.16,spoiler:1},beetle:{bh:.24,cab:[.3,.8],ch:.24,round:1},
 jeep:{bh:.3,cab:[.32,.94],ch:.25,spare:1},pickup:{bh:.27,cab:[.26,.56],ch:.24,bed:1},van:{bh:.3,cab:[.14,.97],ch:.32},camper:{bh:.42,cab:[.06,.98],ch:.3,camper:1},
 limo:{bh:.24,cab:[.22,.86],ch:.2},bus:{bus:1,bh:.62},coach:{bus:1,bh:.68},tram:{bus:1,bh:.6,tram:1},bendy:{bus:1,bh:.6,bendy:1},ferry:{bus:1,bh:.6}
};
function buildVehicle(c,colHex){
 const g=new THREE.Group();const len=c.len,Lz=len-0.16,st=VS[c.variant]||VS.sedan,W=st.w||(st.bus?0.8:0.72);
 const body=new THREE.Group();g.add(body);const pm=paint(colHex);const parts={paint:[],body};
 const lift=0.1;
 const mk=(geo,mat,x,y,z,isPaint)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;body.add(m);if(isPaint)parts.paint.push(m);return m};
 if(st.bus){
  mk(cg('bb'+len+st.bh,()=>rbox(W,Lz,st.bh,0.12)),pm,0,lift,0,1);
  mk(cg('bw'+len+st.bh,()=>rbox(W+0.012,Lz-0.24,0.2,0.08)),glass,0,lift+st.bh-0.32,0.02);
  mk(cg('bf'+st.bh,()=>rbox(W-0.12,0.05,0.22,0.02)),glass,0,lift+st.bh-0.33,-Lz/2+0.005);
  mk(cg('br'+len+st.bh,()=>rbox(W-0.14,Lz-0.3,0.05,0.06)),flat('#f2f4f7',0.5),0,lift+st.bh-0.005,0.04);
  if(st.bendy){mk(cg('bj'+st.bh,()=>rbox(W+0.02,0.14,st.bh-0.06,0.03)),rubber,0,lift+0.03,0)}
  if(st.tram){mk(cg('tp',()=>new THREE.BoxGeometry(0.06,0.18,0.5)),rubber,0,lift+st.bh+0.09,0)}
 }else{
  mk(cg('cb'+c.variant+len,()=>rbox(W,Lz,st.bh,st.round?0.22:0.12)),pm,0,lift,0,1);
  const f=-Lz/2+st.cab[0]*Lz,b=-Lz/2+st.cab[1]*Lz,cl=b-f;
  mk(cg('cc'+c.variant+len,()=>rbox(W-0.1,cl,st.ch,st.round?0.16:0.08)),glass,0,lift+st.bh-0.02,(f+b)/2);
  mk(cg('cr'+c.variant+len,()=>rbox(W-0.16,cl-0.1,0.05,0.06)),pm,0,lift+st.bh-0.02+st.ch-0.03,(f+b)/2+0.02,1);
  if(st.bed){mk(cg('bed'+len,()=>rbox(W-0.12,Lz*0.36,0.04,0.03)),rubber,0,lift+st.bh-0.015,Lz/2-Lz*0.2)}
  if(st.sign){mk(cg('ts',()=>rbox(0.26,0.12,0.1,0.03)),flat('#ffd02b',0.4),0,lift+st.bh+st.ch-0.03,(f+b)/2)}
  if(st.spoiler){mk(cg('sp',()=>rbox(W-0.08,0.08,0.03,0.02)),rubber,0,lift+st.bh+0.07,Lz/2-0.06)}
  if(st.spare){mk(cg('spr',()=>{const q=new THREE.CylinderGeometry(0.12,0.12,0.07,14);q.rotateX(Math.PI/2);return q}),rubber,0,lift+st.bh*0.6,Lz/2+0.02)}
 }
 // lights
 const hl=cg('hl',()=>new THREE.BoxGeometry(0.13,0.06,0.03));
 for(const s of[-1,1]){mk(hl,headL,s*(W/2-0.12),lift+0.15,-Lz/2+0.005);mk(hl,tailL,s*(W/2-0.12),lift+0.15,Lz/2-0.005)}
 // wheels
 const ax=st.bus?(len>=4?[-Lz/2+0.4,-0.25,0.25,Lz/2-0.4]:[-Lz/2+0.42,Lz/2-0.42]):len===1?[-Lz/2+0.2,Lz/2-0.2]:[-Lz/2+0.3,Lz/2-0.3];
 for(const z of ax)for(const s of[-1,1]){const w=mk(wheelG,rubber,s*(W/2-0.04),0.13,z);w.castShadow=true;const h=new THREE.Mesh(hubG,hub);w.add(h)}
 const roofY=lift+(st.bus?st.bh:st.bh+st.ch);
 parts.roofY=roofY;parts.W=W;parts.Lz=Lz;
 return{g,parts};
}

// ---------- the world ----------
let L,S,cars=[],world=null,riders=new Map(),bayCar=[],bayN=[],busy=false,over=false,moves=0,lvl=26;
let geo={};
const tw=[];function tween(d,f,ease){return new Promise(res=>tw.push({t:0,d,f,ease:ease||(k=>k),res}))}
const eIO=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2,eOut=k=>1-Math.pow(1-k,3),eBack=k=>{const c1=1.7,c3=c1+1;return 1+c3*Math.pow(k-1,3)+c1*Math.pow(k-1,2)};
const wait=ms=>tween(ms/1000,()=>{});
let rng=Math.random;

function cellW(x,y){return new THREE.Vector3(geo.x0+x+0.5,0,geo.z0+y+0.5)}
function bayX(b){return (b-(L.bays-1)/2)*geo.bsp}

function buildWorld(){
 if(world){scene.remove(world);world.traverse(o=>{if(o.geometry&&!Object.values(gCache).includes(o.geometry)&&o.geometry!==wheelG&&o.geometry!==hubG)o.geometry.dispose()})}
 world=new THREE.Group();scene.add(world);lampMats.length=0;
 const w=L.w,h=L.h;geo.x0=-w/2;geo.z0=-h/2;geo.rm=0.85; // ring road offset
 geo.bsp=1.22;geo.roadZ=h/2+geo.rm;geo.bayTop=geo.roadZ+0.62;geo.bayLen=3.3;geo.bayFront=geo.bayTop+geo.bayLen;geo.lowZ=geo.bayFront+0.7;geo.plazaZ=geo.lowZ+3.1;geo.ringR=1.95;
 const PW=Math.max(w+2*geo.rm+1.2,L.bays*geo.bsp+1.4),pz0=-h/2-geo.rm-0.6,pz1=geo.lowZ+0.6;geo.PW=PW;geo.pz0=pz0;geo.pz1=pz1;
 const mulb=mulberry32(L.n*7919+3);rng=mulb;
 // grass
 const grassT=canvasTex(512,512,(x,W,H)=>{x.fillStyle='#86c463';x.fillRect(0,0,W,H);for(let i=0;i<5000;i++){const g=150+Math.random()*60|0;x.fillStyle=`rgba(${60+Math.random()*40|0},${g},${50+Math.random()*30|0},.35)`;x.fillRect(Math.random()*W,Math.random()*H,2,4)}});
 grassT.wrapS=grassT.wrapT=THREE.RepeatWrapping;grassT.repeat.set(14,14);
 const grass=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({map:grassT,roughness:1}));grass.rotation.x=-Math.PI/2;grass.position.y=-0.02;grass.receiveShadow=true;world.add(grass);
 // paved area, painted in one texture
 const PPU=64,ph=pz1-pz0;
 const paveT=canvasTex(Math.round(PW*PPU),Math.round(ph*PPU),(x,W,H)=>{
  const X=v=>(v+PW/2)*PPU,Z=v=>(v-pz0)*PPU;
  x.fillStyle='#41454e';x.fillRect(0,0,W,H);
  for(let i=0;i<W*H/60;i++){const v=Math.random()*40|0;x.fillStyle=`rgba(${90+v},${95+v},${105+v},.18)`;x.fillRect(Math.random()*W,Math.random()*H,2,2)}
  // the lot
  x.fillStyle='#565b66';x.fillRect(X(-w/2),Z(-h/2),w*PPU,h*PPU);
  x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=3;x.setLineDash([PPU*0.28,PPU*0.18]);
  for(let i=1;i<w;i++){x.beginPath();x.moveTo(X(-w/2+i),Z(-h/2)+4);x.lineTo(X(-w/2+i),Z(h/2)-4);x.stroke()}
  for(let j=1;j<h;j++){x.beginPath();x.moveTo(X(-w/2)+4,Z(-h/2+j));x.lineTo(X(w/2)-4,Z(-h/2+j));x.stroke()}
  x.setLineDash([]);x.lineWidth=6;x.strokeStyle='#f4f6fa';x.strokeRect(X(-w/2),Z(-h/2),w*PPU,h*PPU);
  // ring road center dashes
  x.strokeStyle='rgba(255,214,74,.85)';x.lineWidth=4;x.setLineDash([PPU*0.35,PPU*0.3]);
  const r=geo.rm;x.strokeRect(X(-w/2-r),Z(-h/2-r),(w+2*r)*PPU,(h+2*r)*PPU);
  x.beginPath();x.moveTo(X(-PW/2),Z(geo.lowZ));x.lineTo(X(PW/2),Z(geo.lowZ));x.stroke();x.setLineDash([]);
  // stops
  for(let b=0;b<L.bays;b++){const bx=bayX(b);x.fillStyle='#363a42';x.fillRect(X(bx-0.52),Z(geo.bayTop),1.04*PPU,geo.bayLen*PPU);
   x.strokeStyle='#ffd24a';x.lineWidth=5;x.strokeRect(X(bx-0.52),Z(geo.bayTop),1.04*PPU,geo.bayLen*PPU);
   x.fillStyle='rgba(255,210,74,.9)';x.font='900 '+PPU*0.5+'px Nunito, system-ui, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(b+1),X(bx),Z(geo.bayFront-0.35))}
 });
 const pave=new THREE.Mesh(new THREE.PlaneGeometry(PW,ph),new THREE.MeshStandardMaterial({map:paveT,roughness:0.92}));pave.rotation.x=-Math.PI/2;pave.position.set(0,0,(pz0+pz1)/2);pave.receiveShadow=true;world.add(pave);
 // curbs
 const curbM=flat('#d9dde4',0.7);
 const addCurb=(cx,cz,lx,lz)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(lx,0.09,lz),curbM);m.position.set(cx,0.045,cz);m.receiveShadow=true;m.castShadow=true;world.add(m)};
 addCurb(0,pz0-0.08,PW+0.32,0.16);addCurb(-PW/2-0.08,(pz0+pz1)/2,0.16,ph);addCurb(PW/2+0.08,(pz0+pz1)/2,0.16,ph);
 // plaza with tiles and a ring path
 const plR=3.2;
 const plazaT=canvasTex(1024,1024,(x,W,H)=>{x.fillStyle='#efe4cf';x.fillRect(0,0,W,H);x.strokeStyle='rgba(160,140,110,.35)';x.lineWidth=3;for(let i=0;i<=16;i++){x.beginPath();x.moveTo(i*64,0);x.lineTo(i*64,H);x.stroke();x.beginPath();x.moveTo(0,i*64);x.lineTo(W,i*64);x.stroke()}
  const c=W/2,s=W/(2*plR);x.fillStyle='#e2d2b4';x.beginPath();x.arc(c,c,(geo.ringR+0.5)*s,0,7);x.arc(c,c,(geo.ringR-0.85)*s,0,7,true);x.fill();x.strokeStyle='#c9b48e';x.lineWidth=8;x.beginPath();x.arc(c,c,(geo.ringR+0.5)*s,0,7);x.stroke();x.beginPath();x.arc(c,c,(geo.ringR-0.85)*s,0,7);x.stroke()});
 const plaza=new THREE.Mesh(new THREE.PlaneGeometry(PW,plR*2+0.6),new THREE.MeshStandardMaterial({map:plazaT,roughness:0.9}));plaza.rotation.x=-Math.PI/2;plaza.position.set(0,0.005,geo.plazaZ);plaza.receiveShadow=true;world.add(plaza);
 plazaT.repeat.set(1,1);
 addCurb(0,pz1+0.08,PW+0.32,0.16);
 // planter and tree in the ring centre
 const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.7,0.3,24),flat('#c9b48e',0.8));pl.position.set(0,0.15,geo.plazaZ);pl.castShadow=pl.receiveShadow=true;world.add(pl);
 const soil=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.02,24),flat('#5a3f2a'));soil.position.set(0,0.3,geo.plazaZ);world.add(soil);
 addTree(0,geo.plazaZ,1.25,true);
 // lamps along the plaza
 for(const s of[-1,1])addLamp(s*(PW/2-0.5),geo.plazaZ-1.6);
 for(const s of[-1,1])addLamp(s*(PW/2+0.55),-h/2+1);
 // trees and houses around
 const spots=[];
 for(let i=0;i<70;i++){const side=i%3;let x,z;
  if(side===0){x=(mulb()-0.5)*(PW+14);z=pz0-1.2-mulb()*6}
  else{x=(side===1?-1:1)*(PW/2+0.9+mulb()*6);z=pz0+mulb()*(geo.plazaZ+plR+2-pz0)}
  if(Math.abs(x)<PW/2+0.6&&z>pz0-0.8)continue;if(spots.some(p=>Math.hypot(p[0]-x,p[1]-z)<0.9))continue;spots.push([x,z]);
  if(mulb()<0.16&&Math.abs(x)>PW/2+1.6)addHouse(x,z,mulb());else addTree(x,z,0.75+mulb()*0.6)}
 for(let i=0;i<8;i++){const s=i%2?1:-1;addBush(s*(PW/2+0.5+mulb()*0.3),geo.plazaZ-2+mulb()*5)}
 // cones and arrows and gates
 geo.gates=[];
 for(let i=0;i<w*h;i++){const x=i%w,y=(i/w)|0,p=cellW(x,y);
  if(L.wall[i])addCone(p);
  if(L.arrow[i]>=0)addArrow(p,L.arrow[i]);
  if(L.gate[i]>=0)geo.gates.push(addGate(p,i));
 }
 fitCamera();
}
// low-poly decor, shared geometry
const trunkG=new THREE.CylinderGeometry(0.07,0.1,0.5,7),leafG=new THREE.IcosahedronGeometry(0.45,0),leafG2=new THREE.IcosahedronGeometry(0.32,0);
function addTree(x,z,s,big){const t=new THREE.Group();const tr=new THREE.Mesh(trunkG,flat('#7a5236'));tr.position.y=0.25;tr.castShadow=true;t.add(tr);
 const lm=new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(0.27+rng()*0.08,0.5,0.36+rng()*0.1),roughness:0.85,flatShading:true});
 const a=new THREE.Mesh(leafG,lm);a.position.y=0.72;a.rotation.set(rng()*3,rng()*3,0);a.castShadow=true;t.add(a);
 const b=new THREE.Mesh(leafG2,lm);b.position.set(0.18,0.98,0.05);b.rotation.y=rng()*3;b.castShadow=true;t.add(b);
 t.scale.setScalar(s);t.position.set(x,big?0.3:0,z);t.userData.sway=rng()*6;world.add(t);return t}
function addBush(x,z){const m=new THREE.Mesh(leafG2,new THREE.MeshStandardMaterial({color:'#4f9a44',roughness:0.9,flatShading:true}));m.scale.set(1,0.7,1);m.position.set(x,0.16,z);m.castShadow=true;world.add(m)}
function addHouse(x,z,r){const g=new THREE.Group();const cols=['#f7d9c4','#cfe3f7','#f6eab0','#d9f0d0','#f2c9d9'];const wl=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.75,0.9),flat(cols[(r*5)|0],0.8));wl.position.y=0.375;wl.castShadow=wl.receiveShadow=true;g.add(wl);
 const roofG=new THREE.CylinderGeometry(0.01,0.82,0.5,4,1);roofG.rotateY(Math.PI/4);const rf=new THREE.Mesh(roofG,flat(r<0.5?'#c4513b':'#5b6b8a',0.7));rf.scale.set(1,1,0.85);rf.position.y=1.0;rf.castShadow=true;g.add(rf);
 const dr=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.36,0.02),flat('#7a5236'));dr.position.set(0,0.18,0.46);g.add(dr);
 const wm=new THREE.MeshStandardMaterial({color:'#9fd6ff',emissive:'#ffcc66',emissiveIntensity:0.05,roughness:0.2});lampMats.push(wm);
 for(const s of[-1,1]){const wd=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.18,0.02),wm);wd.position.set(s*0.33,0.46,0.46);g.add(wd)}
 g.rotation.y=(x<0?1:-1)*Math.PI/2+(r-0.5)*0.4;g.position.set(x,0,z);world.add(g)}
function addLamp(x,z){const p=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.05,1.5,8),flat('#3a3f4a',0.5));p.position.set(x,0.75,z);p.castShadow=true;world.add(p);
 const m=new THREE.MeshStandardMaterial({color:'#fff6d8',emissive:'#ffd98a',emissiveIntensity:0.05});lampMats.push(m);const b=new THREE.Mesh(new THREE.SphereGeometry(0.11,12,8),m);b.position.set(x,1.55,z);world.add(b)}
const coneG=new THREE.ConeGeometry(0.17,0.5,16),coneBand=new THREE.CylinderGeometry(0.1,0.125,0.08,16),coneBase=new THREE.BoxGeometry(0.42,0.05,0.42);
function addCone(p){const g=new THREE.Group();const b=new THREE.Mesh(coneBase,flat('#e8661c',0.6));b.position.y=0.025;b.castShadow=true;g.add(b);const c=new THREE.Mesh(coneG,flat('#ff7a1f',0.5));c.position.y=0.3;c.castShadow=true;g.add(c);const s=new THREE.Mesh(coneBand,flat('#ffffff',0.5));s.position.y=0.3;g.add(s);
 const c2=new THREE.Group();c2.add(g.clone());c2.children[0].position.set(0.2,0,0.18);c2.children[0].scale.setScalar(0.75);g.position.set(-0.08,0,-0.06);c2.add(g);c2.position.copy(p);world.add(c2)}
function addArrow(p,d){const s=new THREE.Shape();s.moveTo(0,-0.34);s.lineTo(0.24,-0.06);s.lineTo(0.09,-0.06);s.lineTo(0.09,0.3);s.lineTo(-0.09,0.3);s.lineTo(-0.09,-0.06);s.lineTo(-0.24,-0.06);s.closePath();
 const g=new THREE.ShapeGeometry(s);g.rotateX(-Math.PI/2);g.rotateY(Math.PI); const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:0.6,emissive:'#ffffff',emissiveIntensity:0.15}));
 m.rotation.y=-d*Math.PI/2;m.position.copy(p);m.position.y=0.012;m.receiveShadow=true;world.add(m)}
function addGate(p,i){const g=new THREE.Group();const post=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.42,0.1),flat('#3a3f4a',0.5));post.position.set(-0.42,0.21,0);post.castShadow=true;g.add(post);
 const pivot=new THREE.Group();pivot.position.set(-0.42,0.36,0);g.add(pivot);const arm=new THREE.Mesh(new THREE.BoxGeometry(0.86,0.06,0.06),new THREE.MeshStandardMaterial({color:'#e3343b',roughness:0.4}));arm.position.x=0.43;arm.castShadow=true;pivot.add(arm);
 const lightM=new THREE.MeshStandardMaterial({color:'#e3343b',emissive:'#e3343b',emissiveIntensity:1});const lt=new THREE.Mesh(new THREE.SphereGeometry(0.05,10,8),lightM);lt.position.set(-0.42,0.46,0);g.add(lt);
 g.position.copy(p);world.add(g);return{i,pivot,arm,lightM,cur:0}}

// ---------- vehicles ----------
function carHex(c){if(L.fog&&!S.rev[c.id])return FOGC;return COLH[colorOf(L,S,c.id)]}
function makeCar(c){
 const{g,parts}=buildVehicle(c,carHex(c));
 const head=cellW(c.x,c.y),dir=new THREE.Vector3(DX[c.d],0,DY[c.d]);
 g.position.copy(head).addScaledVector(dir,-(c.len-1)/2);g.rotation.y=-c.d*Math.PI/2;
 const hit=new THREE.Mesh(new THREE.BoxGeometry(0.98,0.9,c.len),new THREE.MeshBasicMaterial({visible:false}));hit.position.y=0.4;hit.userData.car=c.id;g.add(hit);
 const badge=sprite(badgeTex('?'),0.56);badge.position.set(0,parts.roofY+0.28,0);g.add(badge);
 const V={id:c.id,g,parts,hit,badge,state:'lot',hex:null,ice:null,iconL:null,base:g.position.clone(),yaw:g.rotation.y};
 world.add(g);return V;
}
function setPaint(V,hex){if(V.hex===hex)return;const from=V.hex;V.hex=hex;const m=paint(hex);
 if(from===FOGC&&hex!==FOGC){for(const p of V.parts.paint)p.material=m;pop(V.g,1.12)}else for(const p of V.parts.paint)p.material=m}
function refreshCar(V){
 const c=L.cars[V.id];
 if(V.state==='lot'){
  setPaint(V,carHex(c));
  const fz=c.frozen>S.dep&&!S.thaw;
  if(fz&&!V.ice){V.ice=new THREE.Mesh(cg('ice'+c.len,()=>rbox(0.94,c.len-0.04,0.82,0.16)),ice);V.ice.renderOrder=2;V.g.add(V.ice)}
  if(!fz&&V.ice){const m=V.ice;V.ice=null;tween(0.4,k=>{m.scale.setScalar(1+k*0.25);m.material=m.material===ice?ice.clone():m.material;m.material.opacity=0.55*(1-k)}).then(()=>V.g.remove(m))}
  const lk=c.lock>=0&&!S.gone[c.lock]&&!S.unlock;
  let txt=L.fog&&!S.rev[c.id]?'?':String(c.cap);
  if(fz)V.badge.material.map=iconBadge('ice',c.frozen-S.dep);
  else if(lk)V.badge.material.map=iconTex('lock',KEYC[L.cars[c.lock].key]||KEYC[0]);
  else if(c.key>=0&&!S.gone[c.id])V.badge.material.map=keyBadge(txt,KEYC[c.key]);
  else V.badge.material.map=badgeTex(txt);
 }else if(V.state==='bay'){
  const b=bayCar.indexOf(V.id);const left=c.cap-(bayN[b]||0);V.badge.material.map=badgeTex(String(left),COLH[colorOf(L,S,c.id)],colorOf(L,S,c.id)===6||colorOf(L,S,c.id)===2?'#1d2330':'#ffffff','#ffffff');
 }
 V.badge.material.needsUpdate=true;
}
function iconBadge(kind,n){const k='ib'+kind+n;if(badgeCache[k])return badgeCache[k];return badgeCache[k]=canvasTex(128,128,(x)=>{x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.arc(64,70,54,0,7);x.fill();x.fillStyle='#e6f7ff';x.beginPath();x.arc(64,62,54,0,7);x.fill();x.lineWidth=9;x.strokeStyle='#4fb8ec';x.stroke();x.fillStyle='#1f6f9e';x.font='900 60px Nunito, system-ui, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(n),64,66)})}
function keyBadge(txt,col){return badgeTex(txt,'#ffffff','#1d2330',col)}
function pop(o,s){const b=o.scale.clone();return tween(0.32,k=>{const q=1+(s-1)*Math.sin(k*Math.PI);o.scale.set(b.x*q,b.y*q,b.z*q)})}

// path helpers
function chaikin(P,it){for(let n=0;n<it;n++){const Q=[P[0]];for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1];Q.push(a.clone().lerp(b,0.25),a.clone().lerp(b,0.75))}Q.push(P[P.length-1]);P=Q}return P}
function polyline(P){const s=[0];for(let i=1;i<P.length;i++)s.push(s[i-1]+P[i].distanceTo(P[i-1]));return{P,s,len:s[s.length-1],at(d){const P=this.P,s=this.s;if(d<=0){const dir=P[1].clone().sub(P[0]).normalize();return P[0].clone().addScaledVector(dir,d)}if(d>=this.len){const n=P.length;const dir=P[n-1].clone().sub(P[n-2]).normalize();return P[n-1].clone().addScaledVector(dir,d-this.len)}let lo=0,hi=s.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(s[m]<=d)lo=m;else hi=m}return P[lo].clone().lerp(P[hi],(d-s[lo])/((s[hi]-s[lo])||1))}}}
async function drive(V,pts,s0,s1,speed,len,opt={}){
 const pl=polyline(chaikin(pts,3));const total=(s1==null?pl.len:s1)-s0;const dur=Math.max(0.45,total/speed);const back=Math.max(len-1,0.45);
 let lastPuff=0;
 await tween(dur,k=>{const d=s0+total*k;const hd=pl.at(d),tl=pl.at(d-back);const mid=len>1?hd.clone().add(pl.at(d-(len-1))).multiplyScalar(0.5):hd;
  V.g.position.set(mid.x,0,mid.z);const dx=hd.x-tl.x,dz=hd.z-tl.z;if(dx*dx+dz*dz>1e-6)V.g.rotation.y=Math.atan2(-dx,-dz);
  V.parts.body.rotation.x=-0.05*Math.sin(Math.min(1,k*4)*Math.PI);
  if(opt.puff&&k-lastPuff>0.06&&k<0.8){lastPuff=k;puff(tl)}
 },opt.ease||eIO);
}
function routeToBay(exitPt,d,bx){
 // ring road rectangle around the lot, then the stop road, then into the stop
 const rx=L.w/2+geo.rm,rzT=-L.h/2-geo.rm,rzB=geo.roadZ,pts=[];
 let p=exitPt.clone();
 if(d===0)p.z=rzT;else if(d===2)p.z=rzB;else if(d===1)p.x=rx;else p.x=-rx;
 pts.push(p.clone());
 if(d===0){const sx=bx>=p.x?rx:-rx;if(Math.abs(p.x-sx)>0.01)pts.push(new THREE.Vector3(sx,0,rzT));pts.push(new THREE.Vector3(sx,0,rzB))}
 else if(d===1||d===3){pts.push(new THREE.Vector3(p.x,0,rzB))}
 pts.push(new THREE.Vector3(bx,0,rzB));pts.push(new THREE.Vector3(bx,0,geo.bayTop+0.3));
 return pts;
}
async function driveToBay(id,b,tr){
 const V=cars[id],c=L.cars[id];V.state='driving';
 if(V.ice){V.g.remove(V.ice);V.ice=null}
 const cells=L.cells[id];const pts=[];
 const dir=new THREE.Vector3(DX[c.d],0,DY[c.d]);
 const tail=cellW(...cells[cells.length-1]);pts.push(tail.clone().addScaledVector(dir,-1));
 for(let i=cells.length-1;i>=0;i--)pts.push(cellW(...cells[i]));
 for(const q of tr.path){const p=cellW(q[0],q[1]);if(q[2]===1){/* tunnel jump */}pts.push(p)}
 const last=pts[pts.length-1];const out=last.clone().add(new THREE.Vector3(DX[tr.d]*0.5,0,DY[tr.d]*0.5));
 const bx=bayX(b);const R=routeToBay(out,tr.d,bx);
 const front=new THREE.Vector3(bx,0,geo.bayFront-0.5);
 // drop points that would be duplicates
 const all=pts.concat(R,[front]).filter((p,i,a)=>i===0||p.distanceTo(a[i-1])>0.05);
 const pl=polyline(chaikin(all,3));
 // start where the head is now (1 cell in from the extra point behind the tail, plus the car length)
 sfx('vroom');
 await drive(V,all,1+(c.len-1),null,7.5,c.len,{puff:true});
 V.state='bay';bayCar[b]=id;bayN[b]=0;refreshCar(V);pop(V.g,1.06);sfx('park');
}
async function departBay(b){
 const id=bayCar[b];const V=cars[id];const c=L.cars[id];bayCar[b]=-1;V.state='leaving';
 V.badge.material.map=badgeTex('✓','#2fae4a','#ffffff','#ffffff');V.badge.material.needsUpdate=true;pop(V.badge,1.4);
 const bx=bayX(b);const hd=new THREE.Vector3(bx,0,geo.bayFront-0.5);
 const pts=[hd.clone().add(new THREE.Vector3(0,0,-(c.len-1)-1)),hd,new THREE.Vector3(bx,0,geo.lowZ),new THREE.Vector3(geo.PW/2+1,0,geo.lowZ),new THREE.Vector3(geo.PW/2+12,0,geo.lowZ)];
 sfx('honk');
 await drive(V,pts,1+(c.len-1),null,6,c.len,{ease:k=>k*k*(1.6-0.6*k)});
 world.remove(V.g);V.state='gone';
}
async function bump(id,w){
 const V=cars[id],c=L.cars[id];const dir=new THREE.Vector3(DX[c.d],0,DY[c.d]);const base=V.g.position.clone();
 let msg='';
 if(w.k==='frozen')msg='Frozen in ice. '+(c.frozen-S.dep)+' more car'+(c.frozen-S.dep>1?'s':'')+' must leave first.';
 else if(w.k==='locked')msg='Locked. The car with the matching key has to leave first.';
 else if(w.tr&&w.tr.block){const k=w.tr.block.k;msg=k==='car'?'Blocked by another car.':k==='wall'?'A cone is in the way.':k==='gate'?'The gate is closed right now.':k==='loop'?'That route goes round in circles.':'Something is in the way.'}
 toast(msg);sfx('bump');
 if(w.k==='frozen'||w.k==='locked'){await tween(0.35,k=>{V.g.position.x=base.x+Math.sin(k*Math.PI*6)*0.05*(1-k)});V.g.position.copy(base);return}
 const n=w.tr&&w.tr.path?w.tr.path.length:0;const dist=Math.min(0.32,0.12+n*0.5);
 if(w.tr&&w.tr.block&&w.tr.block.k==='car'){const B=cars[w.tr.block.id];if(B){const bb=B.g.position.clone();setTimeout(()=>tween(0.3,k=>{B.g.position.x=bb.x+Math.sin(k*Math.PI*5)*0.04*(1-k);B.g.position.z=bb.z+Math.cos(k*Math.PI*5)*0.03*(1-k)}).then(()=>B.g.position.copy(bb)),130)}}
 await tween(0.14,k=>V.g.position.copy(base).addScaledVector(dir,dist*eOut(k)));
 await tween(0.22,k=>V.g.position.copy(base).addScaledVector(dir,dist*(1-eOut(k))));
 V.g.position.copy(base);
}

// ---------- riders ----------
const bodyG=new THREE.CapsuleGeometry(0.085,0.13,4,10),headG=new THREE.SphereGeometry(0.072,14,10),hairG=new THREE.SphereGeometry(0.075,14,8,0,Math.PI*2,0,Math.PI*0.5),legG=new THREE.CapsuleGeometry(0.03,0.07,2,6);
const sMats=SKIN.map(c=>flat(c,0.7)),hMats=HAIR.map(c=>flat(c,0.8));
function makeRider(qid,col){
 const g=new THREE.Group();const m=flat(COLH[col],0.55);
 const b=new THREE.Mesh(bodyG,m);b.position.y=0.2;b.castShadow=true;g.add(b);
 for(const s of[-1,1]){const l=new THREE.Mesh(legG,flat(COLH[col]==='#f4f6fa'?'#a3abba':COLH[col],0.7));l.position.set(s*0.04,0.06,0);g.add(l)}
 const h=new THREE.Mesh(headG,sMats[qid%SKIN.length]);h.position.y=0.38;h.castShadow=true;g.add(h);
 const hr=new THREE.Mesh(hairG,hMats[(qid*7)%HAIR.length]);hr.position.y=0.39;hr.rotation.x=-0.25;g.add(hr);
 g.scale.setScalar(1.45);
 const R={qid,col,g,pos:new THREE.Vector3(),tgt:new THREE.Vector3(),ph:qid*0.73,state:'q'};world.add(g);return R;
}
function ringSlots(){
 const sl=[];const outer=17,inner=13,cz=geo.plazaZ;
 for(let i=0;i<outer;i++){const a=(i/outer)*Math.PI*2-Math.PI/2+0.1;sl.push({a,r:geo.ringR})}
 for(let i=0;i<inner;i++){const a=((i+0.5)/inner)*Math.PI*2-Math.PI/2+0.1;sl.push({a,r:geo.ringR-0.55})}
 sl.sort((p,q)=>p.a-q.a);return sl.map(p=>new THREE.Vector3(Math.cos(p.a)*p.r,0,cz+Math.sin(p.a)*p.r));
}
let slots=[];
function layoutRiders(first){
 const ringN=Math.min(L.ring||30,S.q.length-S.qi);
 const ring=[];for(let j=0;j<ringN;j++)ring.push({qid:S.qid[S.qi+j],col:S.q[S.qi+j]});
 ring.sort((a,b)=>a.col-b.col||a.qid-b.qid);
 const keep=new Set();
 ring.forEach((r,i)=>{let R=riders.get(r.qid);if(!R){R=makeRider(r.qid,r.col);riders.set(r.qid,R);R.pos.set(geo.PW/2+1,0,geo.plazaZ+0.4);if(first)R.pos.copy(slots[i])}R.tgt.copy(slots[i]);R.state='q';keep.add(r.qid)});
 // feeder line beyond the circle
 const extra=Math.min(22,S.q.length-S.qi-ringN);
 for(let j=0;j<extra;j++){const qid=S.qid[S.qi+ringN+j],col=S.q[S.qi+ringN+j];let R=riders.get(qid);const t=new THREE.Vector3(geo.ringR+0.8+j*0.34,0,geo.plazaZ+1.2+Math.sin(j*0.7)*0.35+j*0.02);
  if(!R){R=makeRider(qid,col);riders.set(qid,R);R.pos.copy(first?t:t.clone().add(new THREE.Vector3(4,0,0)))}R.tgt.copy(t);R.state='q';keep.add(qid)}
 for(const[q,R]of riders)if(!keep.has(q)&&R.state==='q'){R.state='home';R.tgt.set(geo.PW/2+8,0,geo.plazaZ+3)}
 $('left').textContent=(S.q.length-S.qi);
}
function boardRider(rid,b){
 const R=riders.get(rid);const id=bayCar[b];const V=cars[id];if(!R||!V){bayN[b]=(bayN[b]||0)+1;if(V)refreshCar(V);return Promise.resolve()}
 R.state='hop';const from=R.pos.clone();const c=L.cars[id];const to=new THREE.Vector3(bayX(b),0.35,geo.bayFront-0.35-Math.min(c.len-1,1)*0.3);
 return tween(0.42,k=>{R.pos.lerpVectors(from,to,k);R.pos.y=0.35*k+Math.sin(k*Math.PI)*0.9;R.g.scale.setScalar(1.45*(k>0.8?1-(k-0.8)*4.5:1))},k=>k).then(()=>{world.remove(R.g);riders.delete(rid);bayN[b]=(bayN[b]||0)+1;refreshCar(V);pop(V.parts.body,1.05);sfx('pop')});
}

// ---------- particles ----------
const puffs=[];const puffG=new THREE.SphereGeometry(0.09,8,6);
function puff(p){const m=new THREE.Mesh(puffG,new THREE.MeshStandardMaterial({color:'#ffffff',transparent:true,opacity:0.7,roughness:1,depthWrite:false}));m.position.set(p.x+(Math.random()-0.5)*0.2,0.15,p.z+(Math.random()-0.5)*0.2);world.add(m);puffs.push({m,t:0})}
let confetti=null;
function burst(){
 const N=quality==='hd'?220:110;const g=new THREE.PlaneGeometry(0.12,0.07);const m=new THREE.MeshStandardMaterial({side:THREE.DoubleSide,roughness:0.6});
 const im=new THREE.InstancedMesh(g,m,N);const D=[];const col=new THREE.Color();
 for(let i=0;i<N;i++){col.set(COLH[i%8]);im.setColorAt(i,col);D.push({p:new THREE.Vector3((Math.random()-0.5)*2,1,geo.bayTop+(Math.random()-0.5)*2),v:new THREE.Vector3((Math.random()-0.5)*7,5+Math.random()*6,(Math.random()-0.5)*7),r:new THREE.Euler(Math.random()*6,Math.random()*6,0),vr:(Math.random()-0.5)*12})}
 world.add(im);confetti={im,D,t:0};
}

// ---------- gates, world refresh ----------
function refreshWorld(){
 for(const G of geo.gates||[]){const closed=(S.dep&1)===L.gate[G.i]&&!S.gatesOpen;const tgt=closed?0:1;if(G.cur!==tgt){const a=G.cur;G.cur=tgt;tween(0.45,k=>{G.pivot.rotation.z=(a+(tgt-a)*eOut(k))*1.35});}G.arm.material.color.set(closed?'#e3343b':'#2fae4a');G.lightM.color.set(closed?'#e3343b':'#2fae4a');G.lightM.emissive.set(closed?'#e3343b':'#2fae4a')}
 for(const V of cars)if(V&&V.state==='lot')refreshCar(V);
 $('moves').textContent=moves;
}

// ---------- level flow ----------
function startLevel(n){
 lvl=n;L=genLevel(n);S=initState(L);reveal(L,S);moves=0;over=false;busy=false;bayCar=Array(L.bays).fill(-1);bayN=Array(L.bays).fill(0);
 riders=new Map();tw.length=0;puffs.length=0;confetti=null;
 buildWorld();
 cars=L.cars.map(c=>makeCar(c));
 for(const G of geo.gates){G.cur=-1}
 slots=ringSlots();refreshWorld();layoutRiders(true);
 for(const G of geo.gates){G.pivot.rotation.z=G.cur*1.35}
 const fs=(L.feats||[]).filter(f=>f!=='bus');
 $('lvl').textContent=n;$('feats').textContent=fs.length?fs.map(f=>({cones:'Cones',frozen:'Snow',fog:'Fog',arrows:'Arrows',locks:'Locks',gates:'Gates',taxi:'Taxis'}[f]||f)).join(' · '):(n<4?'Basics':'Buses');
 hideOv();
 // cars drop in
 cars.forEach((V,i)=>{const y0=V.g.position.y;V.g.position.y=3;setTimeout(()=>tween(0.5,k=>{V.g.position.y=3*(1-eOut(k))}).then(()=>{V.g.position.y=y0}),i*35)});
 try{localStorage.setItem('p3dl',String(n))}catch(e){}
}
async function tap(id){
 if(busy||over)return;const c=L.cars[id];const V=cars[id];if(!V||V.state!=='lot')return;
 const occ=occOf(L,S);const w=why(L,S,occ,c);
 if(w.k!=='ok'){bump(id,w);return}
 if(!S.bays.includes(null)){toast('All the stops are full.');return}
 busy=true;moves++;
 const ev=[];ev.push=function(e){if(e.t==='board')e.rid=S.qid[e.q];return Array.prototype.push.call(this,e)};
 applyTap(L,S,id,ev,w.tr);reveal(L,S);
 const hops=[];
 for(const e of ev){
  if(e.t==='exit'){const p=driveToBay(e.car,e.b,e.tr);await wait(380);refreshWorld();await p}
  else if(e.t==='board'){hops.push(boardRider(e.rid,e.b));await wait(55)}
  else if(e.t==='leave'){await Promise.all(hops);hops.length=0;await wait(120);departBay(e.b)}
 }
 await Promise.all(hops);layoutRiders(false);refreshWorld();busy=false;
 const st=status(L,S);
 if(st==='win'){over=true;await wait(500);burst();sfx('win');showOv('Lot cleared!','Level '+lvl+' done in '+moves+' moves.',lvl<MAXLVL?'Next level':'Play again',()=>startLevel(lvl<MAXLVL?lvl+1:1))}
 else if(st==='lose'){over=true;await wait(400);sfx('lose');showOv('Out of moves','No car can reach a stop. Give it another go.','Try again',()=>startLevel(lvl))}
}

// ---------- camera ----------
const views=[{el:56,name:'3D'},{el:80,name:'Top'},{el:38,name:'Low'}];let view=0;
const camTgt=new THREE.Vector3(),camPos=new THREE.Vector3();let camAnim=0;
function fitCamera(instant){
 if(!geo.PW)return;const el=views[view].el*Math.PI/180;
 const xs=[-geo.PW/2-0.2,geo.PW/2+0.2],zs=[geo.pz0-0.2,geo.plazaZ+geo.ringR+1.2];
 const center=new THREE.Vector3(0,0,(zs[0]+zs[1])/2);
 const pts=[];for(const x of xs)for(const z of zs)for(const y of[0,0.8])pts.push(new THREE.Vector3(x,y,z));
 const top=$('hud').getBoundingClientRect().height,bot=$('bar').getBoundingClientRect().height,H=innerHeight;
 const ny0=1-2*(top+6)/H,ny1=-1+2*(bot+6)/H,nyc=(ny0+ny1)/2;
 const tmp=new THREE.PerspectiveCamera(camera.fov,camera.aspect,0.5,200);
 let lo=4,hi=120;let cz=center.z;
 for(let it=0;it<40;it++){const d=(lo+hi)/2;tmp.position.set(0,Math.sin(el)*d,cz+Math.cos(el)*d);tmp.lookAt(0,0,cz);tmp.updateMatrixWorld();tmp.updateProjectionMatrix();
  let ok=true,ymin=9,ymax=-9;for(const p of pts){const v=p.clone().project(tmp);if(Math.abs(v.x)>0.97)ok=false;ymin=Math.min(ymin,v.y);ymax=Math.max(ymax,v.y)}
  if(ymax-ymin>ny0-ny1)ok=false;if(ok)hi=d;else lo=d}
 const d=hi;
 // shift target so the scene sits between the HUD and the bar
 tmp.position.set(0,Math.sin(el)*d,cz+Math.cos(el)*d);tmp.lookAt(0,0,cz);tmp.updateMatrixWorld();
 let ymin=9,ymax=-9;for(const p of pts){const v=p.clone().project(tmp);ymin=Math.min(ymin,v.y);ymax=Math.max(ymax,v.y)}
 const off=((ymin+ymax)/2-nyc);const dz=off*d*Math.tan(camera.fov*Math.PI/360)/Math.sin(el);cz-=dz*0.95;
 camTgt.set(0,0,cz);camPos.set(0,Math.sin(el)*d,cz+Math.cos(el)*d);
 if(instant||!camAnim){camera.position.copy(camPos);camera.lookAt(camTgt);camAnim=1}
 sun.position.set(-7,16,cz+9);sun.target.position.set(0,0,cz);const sc=sun.shadow.camera,R=Math.max(geo.PW,zs[1]-zs[0])*0.62+1;sc.left=-R;sc.right=R;sc.top=R;sc.bottom=-R;sc.near=1;sc.far=60;sc.updateProjectionMatrix();
}
const lookNow=new THREE.Vector3();
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();fitCamera(true)}
addEventListener('resize',resize);

// ---------- input ----------
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let down=null;
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};initAudio()});
renderer.domElement.addEventListener('pointerup',e=>{if(!down)return;const m=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(m>14)return;
 ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(ndc,camera);
 const hits=ray.intersectObjects(cars.filter(V=>V&&V.state==='lot').map(V=>V.hit),false);
 if(hits.length)tap(hits[0].object.userData.car);
});

// ---------- tiny synth sounds ----------
let AC=null;function initAudio(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}
let muted=false;try{muted=localStorage.getItem('p3dm')==='1'}catch(e){}
function tone(f,d,type='sine',v=0.12,slide){if(!AC||muted)return;const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.connect(g).connect(AC.destination);o.start(t);o.stop(t+d)}
function sfx(k){if(k==='vroom')tone(90,0.35,'sawtooth',0.04,180);else if(k==='park')tone(520,0.12,'triangle',0.08);else if(k==='pop')tone(700+Math.random()*300,0.07,'sine',0.06);else if(k==='honk'){tone(392,0.12,'square',0.03);setTimeout(()=>tone(392,0.14,'square',0.03),150)}else if(k==='bump')tone(140,0.12,'triangle',0.1,90);else if(k==='win'){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,0.25,'triangle',0.09),i*110))}else if(k==='lose')tone(300,0.4,'triangle',0.08,150)}

// ---------- UI ----------
let toastT=0;function toast(m){if(!m)return;const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),1900)}
function showOv(h,p,btn,fn){$('ovH').textContent=h;$('ovP').textContent=p;$('ovB').textContent=btn;$('ovB').onclick=fn;$('ov').classList.add('on')}
function hideOv(){$('ov').classList.remove('on')}
$('bRestart').onclick=()=>startLevel(lvl);
$('bView').onclick=()=>{view=(view+1)%views.length;$('bView').textContent=views[view].name;camAnim=2;fitCamera(false)};
$('bTheme').onclick=()=>{theme={day:'sunset',sunset:'night',night:'day'}[theme];applyTheme()};
$('bQ').onclick=()=>{quality=quality==='hd'?'fast':'hd';try{localStorage.setItem('p3dq',quality)}catch(e){}applyQuality()};
$('bSnd').onclick=()=>{muted=!muted;$('bSnd').textContent=muted?'\u{1F507}':'\u266A';try{localStorage.setItem('p3dm',muted?'1':'0')}catch(e){}};$('bSnd').textContent=muted?'\u{1F507}':'\u266A';
$('bLv').onclick=()=>{const g=$('lvGrid');g.innerHTML='';for(let n=1;n<=MAXLVL;n++){const b=document.createElement('button');b.textContent=n;if(n===lvl)b.className='cur';b.onclick=()=>{$('lvSheet').classList.remove('on');startLevel(n)};g.appendChild(b)}$('lvSheet').classList.add('on')};
$('lvClose').onclick=()=>$('lvSheet').classList.remove('on');

// ---------- main loop ----------
const clock=new THREE.Clock();let fpsN=0,fpsT=0;
renderer.setAnimationLoop(()=>{
 const dt=Math.min(qs.get('test')?0.3:0.05,clock.getDelta()),t=clock.elapsedTime;
 for(let i=tw.length-1;i>=0;i--){const a=tw[i];a.t+=dt;const k=Math.min(1,a.t/a.d);a.f(a.ease(k));if(k>=1){tw.splice(i,1);a.res()}}
 for(const R of riders.values()){
  if(R.state==='q'||R.state==='home'){const d=R.tgt.clone().sub(R.pos);const dist=d.length();const sp=Math.min(1,dt*(R.state==='home'?1.6:4));R.pos.addScaledVector(d,sp);
   const walking=dist>0.05;R.pos.y=walking?Math.abs(Math.sin(t*12+R.ph))*0.05:Math.max(0,Math.sin(t*2.2+R.ph))*0.015;
   if(walking)R.g.rotation.y=Math.atan2(d.x,d.z);else R.g.rotation.y+=((Math.atan2(-R.pos.x,geo.bayFront-R.pos.z))-R.g.rotation.y)*Math.min(1,dt*3);
   if(R.state==='home'&&dist<0.5){world.remove(R.g);riders.delete(R.qid)}}
  R.g.position.copy(R.pos);
 }
 for(let i=puffs.length-1;i>=0;i--){const p=puffs[i];p.t+=dt;p.m.position.y+=dt*0.5;p.m.scale.setScalar(1+p.t*3);p.m.material.opacity=0.6*(1-p.t/0.7);if(p.t>0.7){world.remove(p.m);p.m.material.dispose();puffs.splice(i,1)}}
 if(confetti){const C=confetti;C.t+=dt;const M=new THREE.Matrix4(),Q=new THREE.Quaternion();for(let i=0;i<C.D.length;i++){const d=C.D[i];d.v.y-=9*dt;d.v.multiplyScalar(1-dt*0.9);d.p.addScaledVector(d.v,dt);if(d.p.y<0.02){d.p.y=0.02;d.v.set(0,0,0)}else{d.r.x+=d.vr*dt;d.r.y+=d.vr*dt*0.7}Q.setFromEuler(d.r);M.compose(d.p,Q,new THREE.Vector3(1,1,1));C.im.setMatrixAt(i,M)}C.im.instanceMatrix.needsUpdate=true}
 if(camAnim===2){camera.position.lerp(camPos,Math.min(1,dt*4));lookNow.lerp(camTgt,Math.min(1,dt*4));camera.lookAt(lookNow);if(camera.position.distanceTo(camPos)<0.01)camAnim=1}else{lookNow.copy(camTgt)}
 renderer.render(scene,camera);
 fpsN++;fpsT+=dt;if(fpsT>=0.5){$('fps').textContent=Math.round(fpsN/fpsT)+' fps';fpsN=0;fpsT=0}
});

let startN=22;try{const s=+localStorage.getItem('p3dl');if(s>=1&&s<=MAXLVL)startN=s}catch(e){}
if(+qs.get('l'))startN=Math.max(1,Math.min(MAXLVL,+qs.get('l')));
if(qs.get('v'))view=+qs.get('v')%views.length;$('bView').textContent=views[view].name;
if(qs.get('t')&&THEMES[qs.get('t')])theme=qs.get('t');
if(qs.get('test'))$('fps').style.display='none';
applyTheme();applyQuality();startLevel(startN);resize();
$('loading').remove();
window.__p3d={tw,tap:(id)=>tap(id).catch(e=>console.log("TAPERR",e.message,e.stack)),get S(){return S},get L(){return L},get busy(){return busy},startLevel};
