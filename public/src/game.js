(async function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const weaponNameEl = document.getElementById('weaponName');
  const restartBtn = document.getElementById('restart');

  // Load assets JSON
  async function loadJSON(path){ const res = await fetch(path); return await res.json(); }
  const shipInfo = await loadJSON('./src/assets/ship/ship_19.json');
  const weaponInfo = await loadJSON('./src/assets/weapons/Helix_cannon.json');
  weaponNameEl.textContent = weaponInfo['weapon name'] || 'Weapon';

  // Load images
  function loadImage(src){ 
    return new Promise((resolve,reject)=>{ 
      const i=new Image(); 
      i.onload=()=>resolve(i); 
      i.onerror=reject; 
      i.src=src; 
    }); 
  }
  const shipImg = await loadImage('./src/assets/ship/' + shipInfo.shipImage);
  const enemyImg = await loadImage('./src/assets/enemies/sparrows/sparrows_unprotected.png');
  const bulletImg = await loadImage('./src/assets/bullets/bullet.png');
  const statsparrows = await loadJSON('./src/assets/enemies/sparrows/data.json');

  // Game state
  let running = true;
  let score = 0;
  let lives = 1;

  let currentWave = 1;
  const maxWaves = 10;
  let waveInProgress = false;

  const player = {
    x: W/2, y: H-80, w: 40, h: 40,
    fireCooldown: 0,
    fireDelay: (weaponInfo['Rate of Fire']?.[0]?.['level 1'] ?? 0.12),
    projectileSpeed: (weaponInfo['Projectile Speed'] ?? 800),
  };

  const bullets = [];
  const enemies = [];
  const enemyBullets = [];

  restartBtn.addEventListener('click', ()=>reset());

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    player.x = (e.clientX - rect.left) * scaleX;
    player.y = (e.clientY - rect.top) * scaleY;
  });

  function reset(){
    score = 0; lives = 1;
    bullets.length = 0; enemies.length = 0; enemyBullets.length = 0;
    player.x = W/2; player.y = H-80; player.fireCooldown = 0;
    running = true;
    currentWave = 1;
    waveInProgress = false;
  }

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  function spawnWave(){
    const count = currentWave; // nombre d'ennemis = numéro de vague
    const baseY = -40;
    for(let i=0;i<count;i++){
      const x = 60 + i * ((W-120)/count);
      const y = baseY - i*20;
      enemies.push({ 
        x, y, 
        w: 72, h: 72, hp: 3, 
        vx: (Math.random()<0.5?-30:30),
        vy: 60 + Math.random()*20, 
        fire: Math.random()*1.5 + .5 
      });
    }
    waveInProgress = true;
  }

  function shoot(){
    bullets.push({ x: player.x, y: player.y-24, vy: -player.projectileSpeed });
  }

  function enemyShoot(e){
    enemyBullets.push({ x: e.x, y: e.y+10, vy: 220 });
  }

  function aabb(a,b){ return Math.abs(a.x-b.x) < (a.w+b.w)/2 && Math.abs(a.y-b.y) < (a.h+b.h)/2; }

  let last = performance.now();
  function loop(ts){
    const dt = Math.min(0.033, (ts-last)/1000); last = ts;
    if(running){ update(dt); draw(); }
    requestAnimationFrame(loop);
  }

  function update(dt){
    player.x = clamp(player.x, 24, W-24);
    player.y = clamp(player.y, 24, H-24);

    // Tir auto
    player.fireCooldown -= dt;
    if(player.fireCooldown <= 0){
      shoot();
      player.fireCooldown = player.fireDelay;
    }

    // Bullets
    for(const b of bullets){ b.y += b.vy*dt; }
    for(const b of enemyBullets){ b.y += b.vy*dt; }
    for(let i=bullets.length-1;i>=0;i--) if(bullets[i].y < -20) bullets.splice(i,1);
    for(let i=enemyBullets.length-1;i>=0;i--) if(enemyBullets[i].y > H+20) enemyBullets.splice(i,1);

    // Spawn wave si pas en cours
    if(!waveInProgress && currentWave <= maxWaves){
      spawnWave();
    }

    // Update enemies
    for(const e of enemies){
      e.x += e.vx*dt; 
      e.y += e.vy*dt;

      if(e.x < e.w/2 || e.x > W-e.w/2) e.vx *= -1;

      e.fire -= dt;
      if(e.fire <= 0){
        enemyShoot(e);
        e.fire = Math.random()*1.5 + .5;
      }
    }

    for(let i=enemies.length-1;i>=0;i--) if(enemies[i].y > H+40) enemies.splice(i,1);

    // Collisions bullets -> enemies
    for(let i=enemies.length-1;i>=0;i--){
      const e = enemies[i];
      for(let j=bullets.length-1;j>=0;j--){
        const b = bullets[j];
        if(Math.abs(e.x - b.x) < (e.w/2) && Math.abs(e.y - b.y) < (e.h/2)){
          bullets.splice(j,1);
          e.hp -= 1;
          if(e.hp <= 0){
            enemies.splice(i,1);
            score += 100;
            break;
          }
        }
      }
    }

    // Collisions player
    const playerBox = {x:player.x, y:player.y, w:28, h:28};
    for(let i=enemyBullets.length-1;i>=0;i--){
      const b = enemyBullets[i];
      if(Math.abs(player.x - b.x) < 14 && Math.abs(player.y - b.y) < 14){
        enemyBullets.splice(i,1);
        hitPlayer();
      }
    }
    for(let i=enemies.length-1;i>=0;i--){
      const e = enemies[i];
      if(aabb(playerBox, e)){
        enemies.splice(i,1);
        hitPlayer();
      }
    }

    // Vague terminée
    if(waveInProgress && enemies.length === 0){
      waveInProgress = false;
      currentWave++;
      if(currentWave > maxWaves){
        running = false; // victoire
      }
    }

    scoreEl.textContent = score;
    livesEl.textContent = lives;

    if(lives <= 0){ running = false; }
  }

  function hitPlayer(){
    lives -= 1;
    blinkTime = 0.8;
  }

  let blinkTime = 0;
  function draw(){
    ctx.fillStyle = '#050814';
    ctx.fillRect(0,0,W,H);
    drawStars();

    if(blinkTime > 0){
      blinkTime -= 1/60;
      if(Math.floor(blinkTime*20)%2!==0){
        drawShip(player.x, player.y);
      }
    } else {
      drawShip(player.x, player.y);
    }

    // Bullets
    for(const b of bullets){
      ctx.drawImage(bulletImg, b.x-8, b.y-16, 16, 32);
    }

    // Ennemis
    for(const e of enemies){
      ctx.drawImage(enemyImg, e.x-e.w/2, e.y-e.h/2, e.w, e.h);
    }

    // Bullets ennemis
    for(const b of enemyBullets){
      ctx.drawImage(bulletImg, b.x-6, b.y-12, 12, 24);
    }

    if(!running){
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#e6e6e6';
      ctx.textAlign = 'center';
      ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      if(lives <= 0){
        ctx.fillText('Game Over', W/2, H/2 - 10);
      } else {
        ctx.fillText('Victoire !', W/2, H/2 - 10);
      }
      ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.fillText('Appuie sur "Recommencer"', W/2, H/2 + 20);
    }
  }

  function drawShip(x,y){
    const scale = 0.6;
    const w = shipImg.width * scale;
    const h = shipImg.height * scale;
    ctx.drawImage(shipImg, x-w/2, y-h/2, w, h);
  }

  const stars = new Array(80).fill(0).map(()=>({x:Math.random()*W,y:Math.random()*H, s: Math.random()*1.5+0.5, v: 20+Math.random()*40}));
  function drawStars(){
    ctx.fillStyle = '#0c1124';
    for(const st of stars){
      st.y += st.v * (1/60);
      if(st.y > H) { st.y = -5; st.x = Math.random()*W; }
      ctx.fillRect(st.x, st.y, st.s, st.s);
    }
  }

  requestAnimationFrame(loop);
})();
