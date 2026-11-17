import test from 'node:test';
import assert from 'node:assert/strict';
import {paletteFromSeed,paletteFromSeeds,parseColor,formatColor} from '../src/palette-tool.js';

test('palette contains five valid colors and preserves the seed as its first color',()=>{
 const colors=paletteFromSeed('#3f4a24');
 assert.equal(colors.length,5);
 assert.equal(colors[0],'#3f4a24');
 assert.ok(colors.every(color=>/^#[\da-f]{6}$/i.test(color)));
});
test('palette harmony changes the generated colors',()=>{
 assert.notDeepEqual(paletteFromSeed('#336699','analogous'),paletteFromSeed('#336699','triadic'));
});
test('palette rejects malformed seed colors',()=>{
 assert.throws(()=>paletteFromSeed('red'),/hex colour/);
});
test('accepts HEX, RGB, HSL and HSV inputs and formats outputs',()=>{
 const expected=[1,0,0];
 for(const [format,value] of [['hex','#ff0000'],['rgb','rgb(255, 0, 0)'],['hsl','hsl(0, 100%, 50%)'],['hsv','hsv(0, 100%, 100%)']]){
  assert.ok(parseColor(value,format).every((channel,index)=>Math.abs(channel-expected[index])<.001));
 }
 assert.equal(formatColor(expected,'hex'),'#ff0000');
 assert.match(formatColor(expected,'oklch'),/^oklch\(/);
});
test('supports one, two and three base colours and warm/cool swapping',()=>{
 for(const count of [1,2,3])assert.equal(paletteFromSeeds(Array(count).fill('#336699')).length,5);
 assert.throws(()=>paletteFromSeeds(['#123456','#123456','#123456','#123456']),/one and three/);
 assert.notEqual(paletteFromSeeds(['#336699'],'analogous','hex','warm')[0][0],paletteFromSeeds(['#336699'])[0][0]);
});
