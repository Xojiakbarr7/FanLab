import * as T from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {SoftwareRenderer} from './software-renderer.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
export class ExperimentWorld {
 constructor(host){
  this.host=host;this.scene=new T.Scene();this.scene.background=new T.Color(0xdce9ed);
  try{this.renderer=new T.WebGLRenderer({antialias:true})}catch{this.renderer=new SoftwareRenderer()}
  const r=this.renderer;r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.1;
  host.replaceChildren(r.domElement);r.domElement.setAttribute('aria-label','3D tajriba. Aylantirish uchun torting, yaqinlashtirish uchun g‘ildirak yoki ikki barmoqdan foydalaning.');r.domElement.tabIndex=0;
  this.camera=new T.PerspectiveCamera(38,1,.1,50);this.controls=new OrbitControls(this.camera,r.domElement);this.controls.enableDamping=true;this.controls.minDistance=3;this.controls.maxDistance=12;this.controls.maxPolarAngle=Math.PI*.49;this.controls.target.set(0,1.4,0);this.home();
  this.scene.add(new T.HemisphereLight(0xeaf5ff,0x627881,2.3));const key=new T.DirectionalLight(0xffefda,3);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5});key.shadow.normalBias=.025;this.scene.add(key);
  if(!r.isSoftware){const pm=new T.PMREMGenerator(r),room=new RoomEnvironment();this.scene.environment=pm.fromScene(room,.04).texture;room.dispose();pm.dispose()}
  this.metal=this.mat(0x9cacb1,.25,.8);this.dark=this.mat(0x294e5c,.42,.4);this.brass=this.mat(0xb28b43,.27,.7);this.wood=this.mat(0xc69758,.65);this.box(5,.15,3.5,this.mat(0xe6e9e4,.7),0,-.1,0,this.scene);
  this.group=new T.Group();this.scene.add(this.group);new ResizeObserver(()=>this.resize()).observe(host);this.resize();
 }
 mat(color,roughness=.4,metalness=0){return new T.MeshStandardMaterial({color,roughness,metalness})}
 mesh(g,m,x=0,y=0,z=0,parent=this.group){const q=new T.Mesh(g,m);q.position.set(x,y,z);q.castShadow=true;q.receiveShadow=true;parent.add(q);return q}
 box(w,h,d,m,x,y,z,parent){return this.mesh(new T.BoxGeometry(w,h,d),m,x,y,z,parent)}
 rod(a,b,r,mat=this.metal,parent=this.group){const A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A),q=this.mesh(new T.CylinderGeometry(r,r,d.length(),10),mat,0,0,0,parent);q.position.copy(A.add(B).multiplyScalar(.5));q.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return q}
 label(text,x,y,z,w=1.2){const c=document.createElement('canvas');c.width=512;c.height=100;const g=c.getContext('2d');g.fillStyle='#eaf2f2';g.fillRect(0,0,512,100);g.fillStyle='#285467';g.font='600 38px Arial';g.textAlign='center';g.fillText(text,256,65);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;return this.mesh(new T.PlaneGeometry(w,w/5.12),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}),x,y,z)}
 home(){this.camera.position.set(4,3.5,6);this.controls.target.set(0,1.4,0);this.controls.update()}
 front(){this.camera.position.set(0,2.2,7);this.controls.target.set(0,1.5,0);this.controls.update()}
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix()}
 clear(){const shared=new Set([this.metal,this.dark,this.brass,this.wood]),disposed=new Set();this.group.traverse(o=>{o.geometry?.dispose();const m=o.material;if(m&&!shared.has(m)&&!disposed.has(m)){m.map?.dispose();m.dispose();disposed.add(m)}});this.group.clear();this.pivot=null}
 stand(){this.box(1.2,.13,.8,this.dark,-.85,.08,0);this.rod([-.85,.15,0],[-.85,3.25,0],.055);this.rod([-.95,3.2,0],[.5,3.2,0],.055);this.box(.17,.18,.17,this.dark,.3,3.2,0)}
 ruler(){this.box(.15,2.8,.035,this.mat(0xf3e7c9),1.3,1.5,0);for(let i=0;i<=28;i++)this.box(i%5===0?.13:.065,.008,.01,this.dark,1.3, .1+i*.1,.025);this.label('O‘lchov shkalasi',1.3,3.08,.03,.9)}
 build(id,p){this.clear();this.id=id;
  if(id==='pendulum'){this.stand();this.ruler();this.pivot=new T.Group();this.pivot.position.set(.3,3.12,0);this.group.add(this.pivot);this.rod([0,0,0],[0,-p.length,0],.009,this.dark,this.pivot);this.mesh(new T.SphereGeometry(.15,20,12),this.brass,0,-p.length,0,this.pivot);this.label('L = '+p.length.toFixed(1)+' m',-.95,2.2,.08,.9)}
  if(id==='spring'){this.stand();this.ruler();const extension=p.mass*9.81/p.k,len=.55+extension;const pts=[];for(let i=0;i<=192;i++){const a=i/192;pts.push(new T.Vector3(.3+Math.cos(a*Math.PI*24)*.12,3.05-a*len,Math.sin(a*Math.PI*24)*.12))}this.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),192,.018,6,false),this.metal);this.rod([.3,3.05-len,0],[.3,2.9-len,0],.02);this.mesh(new T.CylinderGeometry(.22,.22,.33,24),this.brass,.3,2.74-len,0);this.label(p.mass.toFixed(1)+' kg',.3,2.73-len,.235,.45);this.label('x = '+(extension*100).toFixed(1)+' cm',-.8,2,.08,1)}
  if(id==='refraction'){
   const glass=new T.MeshPhysicalMaterial({color:0x70c9dc,roughness:.12,metalness:0,transparent:true,opacity:.23,depthWrite:false,side:T.DoubleSide});this.box(3.4,1.4,.65,glass,0,.82,0);this.box(3.6,.12,.9,this.dark,0,.06,0);this.label('n₂ = '+p.n2.toFixed(2),-1,.5,.36,.8);this.label('n₁ = '+p.n1.toFixed(2),-1,2.85,.05,.8);
   for(let i=0;i<15;i++)this.rod([0,.15+i*.2,.39],[0,.24+i*.2,.39],.009,this.dark);
   const a=p.angle*Math.PI/180,ratio=p.n1/p.n2*Math.sin(a),tir=ratio>1,b=tir?a:Math.asin(ratio),origin=[0,1.52,.4],source=[-Math.sin(a)*1.35,1.52+Math.cos(a)*1.35,.4],end=[Math.sin(b)*1.3,1.52+(tir?1:-1)*Math.cos(b)*1.3,.4];const laser=new T.MeshBasicMaterial({color:0xf54f37});this.rod(source,origin,.018,laser);this.rod(origin,end,.018,laser);this.mesh(new T.SphereGeometry(.045,12,8),laser,...origin);this.rod([source[0]-Math.sin(a)*.25,source[1]+Math.cos(a)*.25,.4],source,.08,this.dark);this.label(tir?'To‘liq ichki qaytish':'Muhitlar chegarasi',.8,1.68,.42,1.35);
  }
  if(id==='buoyancy'){
   const glass=new T.MeshPhysicalMaterial({color:0xc3e5ec,roughness:.1,transmission:.9,transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide});this.box(2.7,.12,1.8,this.dark,0,.1,0);for(const x of [-1.3,1.3])this.box(.035,2.25,1.7,glass,x,1.28,0);for(const z of [-.85,.85])this.box(2.6,2.25,.025,glass,0,1.28,z);
   const water=new T.MeshStandardMaterial({color:0x359ebc,transparent:true,opacity:.22,depthWrite:false,roughness:.2});this.box(2.55,1.5,1.65,water,0,.92,0);for(const x of [-1.3,1.3])for(const z of [-.85,.85])this.rod([x,.17,z],[x,2.42,z],.018);this.rod([-1.3,1.67,.86],[1.3,1.67,.86],.012,this.mat(0x51a7ba));
   const size=Math.cbrt(p.volume/100)*.65,fraction=Math.min(1,p.density/p.fluid),floating=p.density<p.fluid,y=p.density===p.fluid?.95:floating?1.67+size*(.5-fraction):.17+size/2;this.box(size,size,size,p.density>1200?this.metal:this.wood,0,y,0);for(let i=0;i<4;i++)this.box(size*.95,.008,.008,this.dark,0,y-size*.3+i*size*.2,size/2+.006);this.label(p.density===p.fluid?'Neytral suzuvchanlik':floating?'Jism suzmoqda':'Jism cho‘kdi',0,2.7,.2,1.6);this.label('ρ = '+p.fluid+' kg/m³',0,.45,.88,1.4);
  }
 }
 update(id,p,time){const signature=id+JSON.stringify(p);if(signature!==this.signature){this.signature=signature;this.build(id,p)}if(this.pivot)this.pivot.rotation.z=p.angle*Math.PI/180*Math.cos(time*Math.sqrt(p.gravity/p.length));this.controls.update();this.renderer.render(this.scene,this.camera)}
}
