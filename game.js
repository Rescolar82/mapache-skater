// game.js — Canvas core + audio + FX + móvil
let canvas, ctx, DPR=1, W=0, H=0, groundY=0, camShakeT=0;
let hud={}, running=false, lastTime=0, score=0, best=0;

const G = {
  CANVAS_W: 720, CANVAS_H: 480, GROUND_OFFSET: 100,
  RACCOON_SIZE: 150, PLAYER_RADIUS: 0.40,
  CAT_W: 120, CAT_H: 80, NES_SIZE: 100,
  WATER_RADIUS: 15, FOS_FONT_SIZE: 34, POWER_ICON_SIZE: 50, STAR_SIZE: 40,
  GRAVITY: 1700, JUMP_V0: -820, JUMP_BUFFER_MS: 150, COYOTE_MS: 120, JUMP_HOLD_MS:180, JUMP_HOLD_POWER:.85,
  START_LIVES: 3, INVULN_MS: 1200,
  SPAWN_NES_MS: 2400, SPAWN_WATER_MS: 2800, SPAWN_FOS_MS: 2600, SPAWN_STAR_MS: 1700,
  CAT_MIN_MS: 7000, CAT_MAX_MS: 11000, POWER_MIN_MS: 11000, POWER_MAX_MS: 16000,
  MAX_DROPS: 3,
  NES_VY_RANGE: [90,140], WATER_VY_RANGE:[85,120], FOS_VY_RANGE:[100,150], STAR_VY_RANGE:[80,120],
  VOL_THUD:.25, VOL_SPLASH:.22, VOL_BOOM:.28
};

// Sprites
const bg = new Image(); bg.src = 'assets/background.png';
const raccoon = new Image(); raccoon.src = 'assets/raccoon.png';
const catImg = new Image(); catImg.src = 'assets/cat.png';
const nesImg = new Image(); nesImg.src = 'assets/nes.png';

const keys = { left:false, right:false, dash:false, jump:false };
const player = { x:0,y:0,w:G.RACCOON_SIZE,h:G.RACCOON_SIZE,r:G.RACCOON_SIZE*G.PLAYER_RADIUS,
  speed:4.5, vy:0, onGround:true, dashCd:0, lives:G.START_LIVES, iMs:0,
  helmet:0, umbrella:0, fireproof:0, facing:1, jumpHold:0
};

const drops=[],cats=[],powerups=[],effects=[];
let tNES=0,tWater=0,tFos=0,tCat=0,tPower=0,tStar=0, jumpQueuedAtMs=-1, lastGroundedMs=0;

let audioCtx=null; function ac(){ return audioCtx||(audioCtx = new (window.AudioContext||window.webkitAudioContext)()); }
function playThud(){ try{const A=ac(),d=.18,o=A.createOscillator(),g=A.createGain();o.type='sine';o.frequency.value=110;g.gain.value=.0001;o.connect(g).connect(A.destination);g.gain.exponentialRampToValueAtTime(G.VOL_THUD,A.currentTime+.01);g.gain.exponentialRampToValueAtTime(.0001,A.currentTime+d);o.start();o.stop(A.currentTime+d);}catch(e){}}
function playSplash(){ try{const A=ac(),d=.25,nB=A.createBuffer(1,A.sampleRate*d,A.sampleRate),dt=nB.getChannelData(0);for(let i=0;i<dt.length;i++)dt[i]=(Math.random()*2-1)*(1-i/dt.length);const n=A.createBufferSource();n.buffer=nB;const hp=A.createBiquadFilter();hp.type='highpass';hp.frequency.value=600;const lp=A.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2500;const g=A.createGain();g.gain.value=G.VOL_SPLASH;n.connect(hp).connect(lp).connect(g).connect(A.destination);n.start();n.stop(A.currentTime+d);}catch(e){}}
function playExplosion(){ try{const A=ac(),d=.35,nB=A.createBuffer(1,A.sampleRate*d,A.sampleRate),dt=nB.getChannelData(0);for(let i=0;i<dt.length;i++)dt[i]=(Math.random()*2-1)*(1-i/dt.length);const n=A.createBufferSource();n.buffer=nB;const lp=A.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1200;const g1=A.createGain();g1.gain.value=G.VOL_BOOM;n.connect(lp).connect(g1).connect(A.destination);n.start();n.stop(A.currentTime+d);}catch(e){}}
function playCoin(){ try{const A=ac(),o=A.createOscillator(),g=A.createGain();o.type='square';o.frequency.value=880;g.gain.value=.04;o.connect(g).connect(A.destination);o.start();o.stop(A.currentTime+.12);}catch(e){}}

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function circleHit(ax,ay,ar,bx,by,br){ const dx=ax-bx,dy=ay-by,rr=ar+br; return dx*dx+dy*dy<=rr*rr; }
const nowMs = ()=>performance.now();
function rrand(a,b){ return a+Math.random()*(b-a); }

// BG + HUD + shake
function drawBG(){
  let sx=0, sy=0;
  if (camShakeT>0){ camShakeT-=0.016; sx=(Math.random()-0.5)*6; sy=(Math.random()-0.5)*4; }
  ctx.save(); ctx.translate(sx,sy);
  if (bg.complete){
    const s=Math.max(W/bg.width,H/bg.height);
    ctx.drawImage(bg,(W-bg.width*s)/2,(H-bg.height*s)/2,bg.width*s,bg.height*s);
  } else {
    ctx.fillStyle='#0b1220'; ctx.fillRect(0,0,W,H);
  }
  ctx.restore();
}
function drawTopBar(){
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(0,0,W,32);
  ctx.fillStyle='#fff'; ctx.font='bold 14px system-ui';
  ctx.textAlign='left'; ctx.fillText('Puntos: '+Math.floor(score),10,21);
  ctx.textAlign='center'; ctx.fillText('Mejor: '+Math.floor(best),W/2,21);
  ctx.textAlign='right';
  let rt='❤️'.repeat(Math.max(0,player.lives));
  if (player.helmet>0) rt+='  🪖×'+player.helmet;
  if (player.umbrella>0) rt+='  ☂️×'+player.umbrella;
  if (player.fireproof>0) rt+='  🔥'+Math.ceil(player.fireproof)+'s';
  ctx.fillText(rt||' ',W-10,21);
  ctx.restore();
}
function drawSprite(img,x,y,w,h,flipX=false){ ctx.save(); ctx.translate(x,y); if(flipX) ctx.scale(-1,1); ctx.drawImage(img,-w/2,-h/2,w,h); ctx.restore(); }
function drawPlayer(){ if(player.iMs>0){ const t=performance.now()/100; ctx.globalAlpha=.6+.4*Math.sin(t);} const flip=(player.facing!==1); drawSprite(raccoon,player.x,player.y,player.w,player.h,flip); ctx.globalAlpha=1; }
function drawNES(o){ ctx.save(); ctx.translate(o.x,o.y); ctx.rotate(o.rot||0); ctx.drawImage(nesImg,-G.NES_SIZE/2,-G.NES_SIZE/2,G.NES_SIZE,G.NES_SIZE); ctx.restore(); }
function drawWater(o){ ctx.save(); ctx.globalAlpha=.95; ctx.fillStyle='#56c2ff'; ctx.beginPath(); ctx.arc(o.x,o.y,G.WATER_RADIUS,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(o.x-5,o.y-6,4,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
function drawFos(o){ o.wob=(o.wob||0)+.10; ctx.save(); ctx.translate(o.x+Math.sin(o.wob)*2,o.y); ctx.font=G.FOS_FONT_SIZE+'px system-ui,Segoe UI Emoji'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🧨',0,0); ctx.restore(); }
function drawStar(s){ ctx.save(); ctx.translate(s.x,s.y); ctx.rotate((s.rot||0)+0.02); ctx.fillStyle='#ffd640'; ctx.strokeStyle='#fff3b0'; const R=G.STAR_SIZE*.55,r=G.STAR_SIZE*.25; ctx.beginPath(); for(let i=0;i<10;i++){ const ang=-Math.PI/2+i*Math.PI/5, rad=(i%2===0)?R:r, px=Math.cos(ang)*rad, py=Math.sin(ang)*rad; if(i===0)ctx.moveTo(px,py); else ctx.lineTo(px,py);} ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
function drawCat(g){ const flip=(g.dir!==1); drawSprite(catImg,g.x, groundY+26, G.CAT_W, G.CAT_H, flip); }
function drawPower(p){ ctx.font=G.POWER_ICON_SIZE+'px system-ui,Segoe UI Emoji'; ctx.textAlign='center'; ctx.textBaseline='middle'; if(p.type==='helmet') ctx.fillText('🪖',p.x,p.y); else if(p.type==='umbrella') ctx.fillText('☂️',p.x,p.y); else ctx.fillText('🔥',p.x,p.y); }

// FX
function spawnSplash(x,y){ for(let i=0;i<12;i++) effects.push({kind:'splash',x,y,vx:(Math.random()*160-80),vy:(Math.random()*120-260),life:.5,r:2+Math.random()*2}); }
function spawnExplosion(x,y){ camShakeT=0.25; for(let i=0;i<24;i++){ const a=Math.random()*Math.PI*2, sp=80+Math.random()*160; effects.push({kind:'explosion',x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.45,r:2+Math.random()*2}); } }
function spawnDebris(x,y){ camShakeT=0.18; for(let i=0;i<12;i++) effects.push({kind:'debris',x,y,vx:(Math.random()*280-140),vy:(Math.random()*120-200),life:.5,w:3+Math.random()*3,h:2+Math.random()*2}); }
function updateEffects(dt){ for(let i=effects.length-1;i>=0;i--){ const e=effects[i]; e.life-=dt; if(e.life<=0){ effects.splice(i,1); continue; } if(e.kind!=='explosion') e.vy+=900*dt; e.x+=e.vx*dt; e.y+=e.vy*dt; } }
function drawEffects(){ for(const e of effects){ if(e.kind==='splash'){ ctx.fillStyle='rgba(86,194,255,.9)'; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill(); } else if(e.kind==='explosion'){ ctx.fillStyle='rgba(255,160,40,.9)'; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill(); } else { ctx.fillStyle='rgba(180,180,180,.95)'; ctx.fillRect(e.x-e.w/2, e.y-e.h/2, e.w, e.h); } } }

// Estados
function damage(){ if(player.iMs>0) return true; player.lives--; player.iMs=G.INVULN_MS; camShakeT=0.25; return player.lives>=0; }
function reset(){ drops.length=cats.length=powerups.length=effects.length=0; Object.assign(player,{x:W/2,y:groundY,vy:0,onGround:true,dashCd:0,lives:G.START_LIVES,iMs:0,helmet:0,umbrella:0,fireproof:0,facing:1,jumpHold:0}); score=0; lastTime=0; tNES=tWater=tFos=tCat=tPower=tStar=0; jumpQueuedAtMs=-1; }

// Spawns
function spawnDrop(type,spdMul){
  const x=rrand(36,W-36);
  if(type==='nes') drops.push({type,x,y:-G.NES_SIZE/2,r:G.NES_SIZE*.38,vy:rrand(...G.NES_VY_RANGE)*spdMul,rot:Math.random()*Math.PI,rv:(Math.random()-.5)*.06});
  else if(type==='water') drops.push({type,x,y:-G.WATER_RADIUS,r:G.WATER_RADIUS,vy:rrand(...G.WATER_VY_RANGE)*spdMul});
  else if(type==='fos') drops.push({type,x,y:-G.FOS_FONT_SIZE/2,r:G.FOS_FONT_SIZE*.35,vy:rrand(...G.FOS_VY_RANGE)*spdMul,wob:Math.random()*Math.PI*2});
  else drops.push({type,x,y:-G.STAR_SIZE/2,r:G.STAR_SIZE*.35,vy:rrand(...G.STAR_VY_RANGE)*spdMul,rot:Math.random()*Math.PI,rv:(Math.random()-.5)*.08});
}
function spawnCat(spdMul){ const dir=Math.random()<.5?-1:1; cats.push({x:dir===-1?W+50:-50,dir,speed:(90+Math.random()*60)*spdMul}); }
function spawnPowerup(){ const t=['helmet','umbrella','fireproof'][Math.floor(Math.random()*3)]; powerups.push({type:t,x:rrand(40,W-40),y:-20,r:18,vy:70+Math.random()*30}); }

function update(dt){
  // Movimiento y salto
  let vx = (keys.left?-1:0) + (keys.right?1:0);
  if (vx!==0) player.facing=vx;
  let sp = player.speed * (1 + Math.min(score/160, .6));
  if(keys.dash && player.dashCd<=0){ if(vx!==0) player.x += vx*28; player.dashCd=.45; }
  if(player.dashCd>0) player.dashCd -= dt;
  player.x = clamp(player.x + vx*sp*60*dt, player.r+2, W-player.r-2);

  const tNow = nowMs();
  if(player.onGround) lastGroundedMs=tNow;
  const canBuff = (jumpQueuedAtMs>0) && (player.onGround || (tNow-lastGroundedMs)<=G.COYOTE_MS);
  if (canBuff){ player.vy=G.JUMP_V0; player.onGround=false; jumpQueuedAtMs=-1; player.jumpHold=G.JUMP_HOLD_MS; }
  if(!player.onGround){
    player.vy += G.GRAVITY*dt;
    if(keys.jump && player.vy<0 && player.jumpHold>0){ player.vy -= G.GRAVITY*G.JUMP_HOLD_POWER*dt; player.jumpHold -= dt*1000; }
    player.y += player.vy*dt;
    if(player.y>=groundY){ player.y=groundY; player.vy=0; player.onGround=true; }
  }

  if(player.iMs>0) player.iMs -= dt*1000;
  if(player.fireproof>0) player.fireproof = Math.max(0, player.fireproof - dt);

  // Spawns
  tNES+=dt*1000; tWater+=dt*1000; tFos+=dt*1000; tCat+=dt*1000; tPower+=dt*1000; tStar+=dt*1000;
  const canMore=drops.length<G.MAX_DROPS;
  if(canMore && tNES>G.SPAWN_NES_MS){spawnDrop('nes',1); tNES=0;}
  if(canMore && tWater>G.SPAWN_WATER_MS){spawnDrop('water',1); tWater=0;}
  if(canMore && tFos>G.SPAWN_FOS_MS){spawnDrop('fos',1); tFos=0;}
  if(tStar>G.SPAWN_STAR_MS){spawnDrop('star',1); tStar=0;}
  if(tCat>rrand(G.CAT_MIN_MS,G.CAT_MAX_MS)){spawnCat(1); tCat=0;}
  if(tPower>rrand(G.POWER_MIN_MS,G.POWER_MAX_MS)){spawnPowerup(); tPower=0;}

  // Drops
  for(let i=drops.length-1;i>=0;i--){
    const o=drops[i]; o.y += o.vy*dt; if(o.rot!=null) o.rot += o.rv||0;
    if(o.type==='nes') drawNES(o); else if(o.type==='water') drawWater(o); else if(o.type==='fos') drawFos(o); else drawStar(o);
    if((o.y+o.r)>=groundY+2){
      if(o.type==='water'){ spawnSplash(o.x,groundY-6); playSplash(); }
      else if(o.type==='fos'){ spawnExplosion(o.x,groundY-10); playExplosion(); }
      else if(o.type==='star'){ /* se pierde */ }
      else { spawnDebris(o.x,groundY-6); playThud(); }
      drops.splice(i,1); continue;
    }
    if(o.y>H+60){ drops.splice(i,1); continue; }
    if(circleHit(player.x,player.y,player.r,o.x,o.y,o.r)){
      if(o.type==='star'){ score+=30; playCoin(); drops.splice(i,1); continue; }
      if(o.type==='nes' && player.helmet>0){ player.helmet--; drops.splice(i,1); playThud(); continue; }
      if(o.type==='water' && player.umbrella>0){ player.umbrella--; drops.splice(i,1); playSplash(); continue; }
      if(o.type==='fos' && player.fireproof>0){ drops.splice(i,1); playExplosion(); continue; }
      if(!damage()) return false;
      if(o.type==='water'){ spawnSplash(o.x,player.y); playSplash(); }
      else if(o.type==='fos'){ spawnExplosion(o.x,player.y); playExplosion(); }
      else { spawnDebris(o.x,player.y); playThud(); }
      drops.splice(i,1);
    }
  }

  // Gatos
  for(let i=cats.length-1;i>=0;i--){
    const g=cats[i]; g.x += g.dir*g.speed*dt; drawCat(g);
    const catTop=groundY-10; const overlappingX=Math.abs(player.x-g.x)<(G.CAT_W*.28); const aboveCat=(player.y+player.r)<catTop+12;
    if(overlappingX && player.vy>140 && aboveCat){ player.vy=G.JUMP_V0*.6; player.onGround=false; player.jumpHold=0; score+=150; cats.splice(i,1); continue; }
    if(overlappingX && !aboveCat){ if(!damage()) return false; cats.splice(i,1); }
    if(g.x<-80||g.x>W+80) cats.splice(i,1);
  }

  // Powerups
  for(let i=powerups.length-1;i>=0;i--){
    const p=powerups[i]; p.y+=p.vy*dt; drawPower(p);
    if(p.y>H+30){ powerups.splice(i,1); continue; }
    if(circleHit(player.x,player.y,player.r,p.x,p.y,p.r)){
      if(p.type==='helmet') player.helmet++;
      else if(p.type==='umbrella') player.umbrella++;
      else player.fireproof=6;
      powerups.splice(i,1);
    }
  }

  // HUD
  score += dt*16;
  updateEffects(dt);
  hud.left.textContent = 'Puntos: '+Math.floor(score);
  hud.mid.textContent  = 'x'+(1+Math.min(score/500,1.8)).toFixed(1);
  hud.right.textContent= '❤️'.repeat(Math.max(0,player.lives))
    + (player.helmet?(' 🪖x'+player.helmet):'')
    + (player.umbrella?(' ☂️x'+player.umbrella):'')
    + (player.fireproof?(' 🔥'+Math.ceil(player.fireproof)+'s'):'');
  hud.furia.style.width = Math.min(100, (score%600)/6) + '%';

  return true;
}

function frame(ts){
  if(!lastTime) lastTime = ts;
  const dt = Math.min(.033, (ts-lastTime)/1000);
  lastTime = ts;
  drawBG(); drawTopBar(); drawPlayer();
  const alive=update(dt); drawEffects();
  if(alive && running) requestAnimationFrame(frame);
  else if (!alive){
    running=false;
    best = Math.max(best, Math.floor(score));
    localStorage.setItem('raccoon_best', String(best));
    ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(0,0,G.CANVAS_W,G.CANVAS_H);
    ctx.fillStyle='#fff'; ctx.textAlign='center';
    ctx.font='bold 30px system-ui'; ctx.fillText('¡Game Over!', G.CANVAS_W/2, G.CANVAS_H/2-10);
    ctx.font='18px system-ui'; ctx.fillText('Puntos: '+Math.floor(score)+' · Mejor: '+Math.floor(best), G.CANVAS_W/2, G.CANVAS_H/2+24);
  }
}

// API pública
export function mountGame(canvasEl, hudRefs){
  canvas = canvasEl; hud = hudRefs;
  DPR = Math.min(window.devicePixelRatio||1,2);
  canvas.width = G.CANVAS_W*DPR; canvas.height = G.CANVAS_H*DPR;
  ctx = canvas.getContext('2d'); ctx.setTransform(DPR,0,0,DPR,0,0);
  W=G.CANVAS_W; H=G.CANVAS_H; groundY=H-G.GROUND_OFFSET;
  best = Number(localStorage.getItem('raccoon_best')||0);
  reset();

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  hud.btnStart.addEventListener('click', ()=>{ reset(); running=true; requestAnimationFrame(frame); ac().resume?.(); });
  hud.btnPause.addEventListener('click', ()=>{ running=false; });

  running = true; requestAnimationFrame(frame);
}

export function destroyGame(){
  running=false;
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
}

// Controles teclado
function onKeyDown(e){
  if (e.key==='ArrowLeft'|| e.key.toLowerCase()==='a') keys.left=true;
  if (e.key==='ArrowRight'||e.key.toLowerCase()==='d') keys.right=true;
  if (e.code==='Space'||e.key==='ArrowUp'||e.key.toLowerCase()==='w'){
    keys.jump=true; if (jumpQueuedAtMs<0) jumpQueuedAtMs = nowMs();
  }
  if (e.shiftKey) keys.dash=true;
}
function onKeyUp(e){
  if (e.key==='ArrowLeft'|| e.key.toLowerCase()==='a') keys.left=false;
  if (e.key==='ArrowRight'||e.key.toLowerCase()==='d') keys.right=false;
  if (e.code==='Space'||e.key==='ArrowUp'||e.key.toLowerCase()==='w'){
    keys.jump=false; if(jumpQueuedAtMs>0 && (nowMs()-jumpQueuedAtMs)>G.JUMP_BUFFER_MS) jumpQueuedAtMs=-1; player.jumpHold=0;
  }
  if (!e.shiftKey) keys.dash=false;
}

// API móvil (para app.js)
export const mobile = {
  left:  (down)=>{ keys.left  = !!down; },
  right: (down)=>{ keys.right = !!down; },
  dash:  (down)=>{ keys.dash  = !!down; },
  jump:  ()=>{ if (jumpQueuedAtMs<0) jumpQueuedAtMs = nowMs(); keys.jump=true; setTimeout(()=>keys.jump=false, 120); }
};
