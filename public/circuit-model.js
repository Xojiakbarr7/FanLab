export const PORTS = ['bp','bn','la','lb','sa','sb'];
export const PORT_NAMES = {bp:'Batareya +',bn:'Batareya −',la:'Lampochka A',lb:'Lampochka B',sa:'Kalit 1',sb:'Kalit 2'};
export const EXAMPLE = [['bp','la'],['lb','sa'],['sb','bn']];
export class CircuitModel {
  constructor(){ this.reset(); }
  reset(){this.wires=[];this.cells=2;this.closed=false;this.tripped=false;this.temperature=293;this.overload=0;this.result={voltage:3,current:0,lampVoltage:0,power:0,temperature:293,potentials:{}};}
  connect(a,b){if(!PORTS.includes(a)||!PORTS.includes(b))return 'Kontakt topilmadi.';if(a===b)return 'Simning ikki uchini boshqa-boshqa kontaktlarga ulang.';if(this.wires.some(w=>w.includes(a)||w.includes(b)))return 'Bu kontakt band. Avval undagi simni oling.';this.wires.push([a,b]);return null;}
  remove(i){this.wires.splice(i,1);}
  route(assumeClosed=false){const edges=[...this.wires.map(w=>[...w,'wire']),['la','lb','lamp']];if(this.closed||assumeClosed)edges.push(['sa','sb','switch']);const visit=(n,seen,types)=>{if(n==='bn')return types;for(const[a,b,t]of edges){const next=a===n?b:b===n?a:null;if(next&&!seen.has(next)){const result=visit(next,new Set([...seen,next]),[...types,t]);if(result)return result;}}return null;};return visit('bp',new Set(['bp']),[]);}
  topology(){const route=this.route(true);return {complete:!!route?.includes('lamp')&&!!route?.includes('switch'),bypass:!!route?.includes('lamp')&&!route?.includes('switch'),short:!!this.route(false)&&!this.route(false)?.includes('lamp')};}
  electrical(){
    const nodes=PORTS.filter(n=>n!=='bn'),size=nodes.length,index=Object.fromEntries(nodes.map((n,i)=>[n,i]));
    const matrix=Array.from({length:size},()=>Array(size+1).fill(0));for(let i=0;i<size;i++)matrix[i][i]=1e-9;
    const stamp=(a,b,r)=>{const g=1/r,ia=index[a],ib=index[b];if(ia!==undefined)matrix[ia][ia]+=g;if(ib!==undefined)matrix[ib][ib]+=g;if(ia!==undefined&&ib!==undefined){matrix[ia][ib]-=g;matrix[ib][ia]-=g;}};
    this.wires.forEach(([a,b])=>stamp(a,b,.08));const lampR=2+18*Math.max(0,(this.temperature-293)/2207);stamp('la','lb',lampR);if(this.closed)stamp('sa','sb',.025);
    const sourceR=.16*this.cells+.12,sourceV=this.tripped?0:this.cells*1.5;matrix[index.bp][index.bp]+=1/sourceR;matrix[index.bp][size]+=sourceV/sourceR;
    for(let col=0;col<size;col++){let pivot=col;for(let row=col+1;row<size;row++)if(Math.abs(matrix[row][col])>Math.abs(matrix[pivot][col]))pivot=row;[matrix[col],matrix[pivot]]=[matrix[pivot],matrix[col]];const divisor=matrix[col][col];for(let j=col;j<=size;j++)matrix[col][j]/=divisor;for(let row=0;row<size;row++){if(row===col)continue;const factor=matrix[row][col];for(let j=col;j<=size;j++)matrix[row][j]-=factor*matrix[col][j];}}
    const potentials={bn:0};nodes.forEach((n,i)=>potentials[n]=matrix[i][size]);const current=Math.max(0,(sourceV-potentials.bp)/sourceR),lampVoltage=Math.abs(potentials.la-potentials.lb);return {voltage:Math.max(0,potentials.bp),current:current<1e-6?0:current,lampVoltage,power:lampVoltage**2/lampR,temperature:this.temperature,potentials,lampR};
  }
  step(dt){const steps=Math.max(1,Math.ceil(dt/.012)),h=dt/steps;for(let i=0;i<steps;i++){let r=this.electrical();this.overload=r.current>3?this.overload+h:Math.max(0,this.overload-h*2);if(this.overload>.065){this.tripped=true;r=this.electrical();}const normalized=(this.temperature/2500)**4-(293/2500)**4;this.temperature=Math.max(293,Math.min(3000,this.temperature+(r.power/1.8-normalized)*h*2800));this.result=r;}this.result=this.electrical();return this.result;}
}
