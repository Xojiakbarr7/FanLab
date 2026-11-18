import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CircuitModel,EXAMPLE} from '../public/circuit-model.js';
test('switch, heating, cooling, reset and occupied connectors',()=>{const m=new CircuitModel();for(const [a,b] of EXAMPLE)assert.equal(m.connect(a,b),null);assert.ok(m.connect('bp','bn'));assert.equal(m.topology().complete,true);assert.equal(m.step(.05).current,0);m.closed=true;for(let i=0;i<120;i++)m.step(1/60);assert.ok(m.result.power>0);assert.ok(m.temperature>293);const hot=m.temperature;m.closed=false;for(let i=0;i<120;i++)m.step(1/60);assert.equal(m.result.current,0);assert.ok(m.temperature<hot);m.reset();assert.equal(m.wires.length,0);assert.equal(m.temperature,293)});
test('short circuit trips protection',()=>{const m=new CircuitModel();m.connect('bp','bn');for(let i=0;i<20;i++)m.step(.01);assert.equal(m.tripped,true);assert.equal(m.result.current,0)});
