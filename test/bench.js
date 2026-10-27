// AI strength benchmark: AI vs a random player, a rush player and itself. Usage: node test/bench.js
const RT=require('../src/engine.js');RT.loadCards(require('../src/cards.json'));
const pick=a=>a[Math.floor(Math.random()*a.length)];
// baseline players act as player 0 via the "human" prompt hook, so every choice is theirs
async function randomTurn(G){const p=G.players[0];
  for(let k=0;k<10;k++){const c=p.hand.concat(p.champion?[p.champion]:[]).filter(x=>RT.canPlay(G,0,x.iid,false).ok);if(!c.length||Math.random()<0.2)break;await RT.playCard(G,0,pick(c).iid,{});if(G.winner!=null)return;}
  for(const u of G.units.filter(u=>u.ctrl===0&&!u.ex)){const d=['base',0,1].filter(x=>RT.canMove(G,u,x));if(d.length&&Math.random()<0.7){await RT.moveUnits(G,0,[u.uid],pick(d));if(G.winner!=null)return;}}}
async function rushTurn(G){const p=G.players[0];
  for(let k=0;k<10;k++){const c=p.hand.concat(p.champion?[p.champion]:[]).filter(x=>RT.canPlay(G,0,x.iid,false).ok).sort((a,b)=>(b.c.energy||0)-(a.c.energy||0));if(!c.length)break;await RT.playCard(G,0,c[0].iid,{});if(G.winner!=null)return;}
  const ready=G.units.filter(u=>u.ctrl===0&&!u.ex&&u.loc==='base');if(ready.length){const bi=G.bfs[0].ctrl===0?1:0;await RT.moveUnits(G,0,ready.map(u=>u.uid),bi);}}
const randAsk=async r=>r.type==='confirm'||r.type==='combat'?Math.random()<0.5||r.type==='combat':r.type==='choice'?(r.optional&&Math.random()<0.3?null:Math.floor(Math.random()*r.options.length)):(r.optional&&Math.random()<0.3?null:pick(r.cands));
const autoAsk=async r=>r.type==='confirm'||r.type==='combat'?r.auto!==false:r.type==='choice'?(r.auto!=null?r.auto:(r.optional?null:0)):(r.auto!=null?r.auto:(r.optional?null:r.cands[0]));
async function series(name,turnFn,ask,N){let w=0,l=0,d=0;const pts=[];
  for(let g=0;g<N;g++){const deck=RT.DECKS[g%RT.DECKS.length];
    const G=await RT.newGame(deck,deck,{maxTurns:200,human:0,ask});
    while(G.winner==null){ if(G.active===0) await turnFn(G); else await RT.aiTurn(G,1); if(G.winner==null) await RT.endTurn(G); }
    if(G.winner===1)w++;else if(G.winner===0)l++;else d++; pts.push(G.players[0].points);}
  console.log(name.padEnd(28),'AI won',w,'/',N,'('+Math.round(100*w/N)+'%)  lost',l,' draws',d,' avg opponent points',(pts.reduce((a,b)=>a+b,0)/N).toFixed(1));}
(async()=>{
  await series('AI vs Random player',randomTurn,randAsk,150);
  await series('AI vs Rush player',rushTurn,autoAsk,150);
  await series('AI vs itself (as player 0)',async G=>RT.aiTurn(G,0),autoAsk,150);
})();
