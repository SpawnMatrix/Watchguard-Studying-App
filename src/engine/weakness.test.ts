import { it,expect } from 'vitest';
import { advanceWeakness } from './weakness';
it('requires three consecutive correct responses and resets on a miss',()=>{
 let deck=advanceWeakness({},10001,false);expect(deck).toEqual({10001:0});
 deck=advanceWeakness(deck,10001,true);expect(deck[10001]).toBe(1);
 deck=advanceWeakness(deck,10001,true);expect(deck[10001]).toBe(2);
 deck=advanceWeakness(deck,10001,false);expect(deck[10001]).toBe(0);
 for(let i=0;i<3;i++)deck=advanceWeakness(deck,10001,true);
 expect(deck).toEqual({});expect(advanceWeakness(deck,10001,true)).toEqual({});
});
