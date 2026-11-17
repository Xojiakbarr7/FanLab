import * as THREE from 'three';
// The same scene and physics remain usable when a browser has no WebGL.
export class SoftwareRenderer {
  constructor(){this.domElement=document.createElement('canvas');this.ctx=this.domElement.getContext('2d');this.ratio=1;this.isSoftware=true;this.shadowMap={};this.size={w:1,h:1};}
  setPixelRatio(r){this.ratio=Math.min(r,1.3)}
  setSize(w,h){this.size={w,h};this.domElement.width=w*this.ratio;this.domElement.height=h*this.ratio;}
  render(scene,camera){
    const c=this.ctx,{w,h}=this.size,r=this.ratio;c.setTransform(r,0,0,r,0,0);c.fillStyle='#'+scene.background.getHexString();c.fillRect(0,0,w,h);scene.updateMatrixWorld();camera.updateMatrixWorld();
    const vp=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),v=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3(),cameraDirection=new THREE.Vector3(),light=new THREE.Vector3(-.35,.85,.4).normalize(),faces=[],glass=[],sprites=[];
    const dim=scene.background.r<.2;const point=new THREE.Vector3();let lamp=null;scene.traverseVisible(o=>{if(o.isPointLight&&o.intensity>.01)lamp={p:o.getWorldPosition(new THREE.Vector3()),intensity:o.intensity}});
    scene.traverseVisible(o=>{
      if(o.isSprite){sprites.push(o);return;}if(!o.isMesh||o.userData.skipSoftware)return;
      const g=o.geometry,mat=Array.isArray(o.material)?o.material[0]:o.material;if(!mat?.visible)return;const a=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,ind=g.index,mvp=new THREE.Matrix4().multiplyMatrices(vp,o.matrixWorld),vertices=[];normalMatrix.getNormalMatrix(o.matrixWorld);o.getWorldPosition(point);cameraDirection.copy(camera.position).sub(point).normalize();
      for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(mvp);vertices.push([(v.x*.5+.5)*w,(-v.y*.5+.5)*h,v.z]);}
      const count=ind?ind.count:a.count,base=(mat.map&&g.type==='CylinderGeometry'?new THREE.Color(0x3b4a50):(mat.color||new THREE.Color(0xffffff))).clone().convertLinearToSRGB(),emission=mat.emissiveIntensity||0,emissive=mat.emissive||new THREE.Color(),isGlass=mat.transmission>0,texture=mat.map?.image&&g.type==='PlaneGeometry'?mat.map.image:null;
      let warmed=0;if(lamp){const d=point.distanceTo(lamp.p);warmed=Math.max(0,1-d/2.5)*Math.min(.55,lamp.intensity*.035)}
      for(let k=0;k<count;k+=3){const ia=ind?ind.getX(k):k,ib=ind?ind.getX(k+1):k+1,ic=ind?ind.getX(k+2):k+2,A=vertices[ia],B=vertices[ib],C=vertices[ic];if(A[2]<-1||A[2]>1||B[2]>1||C[2]>1)continue;const area=(B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0]);if(area>=0&&mat.side!==THREE.DoubleSide)continue;if(Math.max(A[0],B[0],C[0])<0||Math.min(A[0],B[0],C[0])>w||Math.max(A[1],B[1],C[1])<0||Math.min(A[1],B[1],C[1])>h)continue;
        if(n){normal.set(n.getX(ia)+n.getX(ib)+n.getX(ic),n.getY(ia)+n.getY(ib)+n.getY(ic),n.getZ(ia)+n.getZ(ib)+n.getZ(ic)).applyMatrix3(normalMatrix).normalize()}else normal.set(0,1,0);
        const diffuse=Math.max(0,normal.dot(light)),half=light.clone().add(cameraDirection).normalize(),spec=Math.pow(Math.max(0,normal.dot(half)),20)*(mat.metalness||0)*.32;const brightness=(mat.isMeshBasicMaterial?1:(dim?.3:.65)+diffuse*(dim?.25:.4))+warmed;const rgb=[base.r,base.g,base.b].map((ch,i)=>Math.min(255,Math.round((ch*brightness+spec+[emissive.r,emissive.g,emissive.b][i]*emission*.3)*255)));
        const f={A,B,C,layer:o.userData.softwareLayer||0,z:(A[2]+B[2]+C[2])/3,style:`rgb(${rgb.join(',')})`,alpha:mat.opacity??1,texture,uv:texture?[ia,ib,ic].map(i=>[uv.getX(i)*texture.width,(1-uv.getY(i))*texture.height]):null};
        if(isGlass){const rim=1-Math.abs(normal.dot(cameraDirection));f.alpha=.035+rim**4*.42;f.style=normal.x<-.2?'#ffffff':dim?'#c9ddda':'#78969a';glass.push(f)}else faces.push(f);
      }
    });
    const draw=f=>{c.globalAlpha=f.alpha;c.beginPath();c.moveTo(f.A[0],f.A[1]);c.lineTo(f.B[0],f.B[1]);c.lineTo(f.C[0],f.C[1]);c.closePath();if(f.texture){const [p,q,t]=f.uv,[A,B,C]=[f.A,f.B,f.C],den=p[0]*(q[1]-t[1])+q[0]*(t[1]-p[1])+t[0]*(p[1]-q[1]);if(Math.abs(den)<.001)return;const coeff=i=>[(A[i]*(q[1]-t[1])+B[i]*(t[1]-p[1])+C[i]*(p[1]-q[1]))/den,(A[i]*(t[0]-q[0])+B[i]*(p[0]-t[0])+C[i]*(q[0]-p[0]))/den,(A[i]*(q[0]*t[1]-t[0]*q[1])+B[i]*(t[0]*p[1]-p[0]*t[1])+C[i]*(p[0]*q[1]-q[0]*p[1]))/den];const X=coeff(0),Y=coeff(1);c.save();c.clip();c.transform(X[0],Y[0],X[1],Y[1],X[2],Y[2]);c.drawImage(f.texture,0,0);c.restore();}else{c.fillStyle=f.style;c.fill();if(f.alpha===1){c.lineWidth=.45;c.strokeStyle=f.style;c.stroke();}}};
    faces.sort((a,b)=>a.layer-b.layer||b.z-a.z).forEach(draw);glass.sort((a,b)=>b.z-a.z).forEach(draw);
    sprites.forEach(o=>{if(o.material.opacity<.01)return;const P=o.getWorldPosition(new THREE.Vector3()),S=P.clone().add(new THREE.Vector3(o.scale.x*.5,0,0));P.project(camera);S.project(camera);const x=(P.x*.5+.5)*w,y=(-P.y*.5+.5)*h,size=Math.abs(S.x-P.x)*w;c.globalAlpha=o.material.opacity;c.globalCompositeOperation='screen';c.drawImage(o.material.map.image,x-size/2,y-size/2,size,size);c.globalCompositeOperation='source-over'});c.globalAlpha=1;
  }
}
