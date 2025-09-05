(async function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Adapter canvas à la fenêtre
  function resizeCanvas() {
    canvas.height = window.innerHeight;
    canvas.width = window.innerHeight * 0.6; // ratio hauteur/largeur ajustable
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const W = () => canvas.width;
  const H = () => canvas.height;

  // Utilitaires
  function rand(min, max){ return Math.random() * (max-min) + min; }
  function loadImage(src){ 
    return new Promise((resolve,reject)=>{ 
      const i=new Image(); 
      i.onload=()=>resolve(i); 
      i.onerror=reject; 
      i.src=src; 
    }); 
  }

  // Charger sprites
  const shipImg = await loadImage('./src/assets/ship/ship_19.png');
  const enemyImg = await loadImage('./src/assets/enemies/sparrows/sparrows_unprotected.png');
  const bulletImg = await loadImage('./src/assets/bullets/bullet.png');

  // État du jeu
  const player = { x: W()/2, y: H()-100 };
  const bullets = [];
  const enemies = [];
  const enemyBullets = [];
  let running = true;

  // Tir automatique du joueur
  setInterval(()=>{ 
    if(running) bullets.push({x: player.x, y: player.y - 30}); 
  }, 200);

  // Déplacement du vaisseau avec la souris
  canvas.addEventListener('mousemove', e=>{
    const rect = canvas.getBoundingClientRect();
    player.x = e.clientX - rect.left;
    player.y = e.clientY - rect.top;
  });

  // Spawn d'une vague d'ennemis
  function spawnWave(){
    for(let i=0;i<5;i++){
      enemies.push({
        x: 100 + i*120,
        y: 80,
        w: 72, h: 72,
        hp: 3,
        vx: (Math.random()<0.5?-30:30),
        vy: 20 + Math.random()*20,
        fire: Math.random()*1.5+0.5
      });
    }
  }
  spawnWave();

  // Boucle principale
  let last = performance.now();
  function loop(now){
    const dt = (now-last)/1000; 
    last=now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Update logique du jeu
  function update(dt){
    // Bullets du joueur
    for(const b of bullets) b.y -= 400*dt;
    bullets.filter(b=>b.y>-20);

    // Bullets ennemies
    for(const b of enemyBullets) b.y += 200*dt;
    enemyBullets.filter(b=>b.y<H()+20);

    // Ennemis
    for(const e of enemies){
      e.x += e.vx*dt;
      e.y += e.vy*dt;

      // rebond horizontal
      if(e.x < e.w/2 || e.x > W()-e.w/2) e.vx *= -1;

      // tir ennemi
      e.fire -= dt;
      if(e.fire<=0){
        e.fire = Math.random()*2+0.5;
        enemyBullets.push({x:e.x, y:e.y});
      }
    }

    // éviter que les ennemis se superposent
    for (let i=0;i<enemies.length;i++){
      for (let j=i+1;j<enemies.length;j++){
        const e1=enemies[i], e2=enemies[j];
        if (Math.abs(e1.x-e2.x)<(e1.w/2+e2.w/2) &&
            Math.abs(e1.y-e2.y)<(e1.h/2+e2.h/2)) {
          if (e1.x<e2.x){ e1.x-=5; e2.x+=5; }
          else { e1.x+=5; e2.x-=5; }
        }
      }
    }
  }

  // Dessin
  function draw(){
    ctx.fillStyle='#050814';
    ctx.fillRect(0,0,W(),H());

    // Joueur
    ctx.drawImage(shipImg, player.x-shipImg.width/2, player.y-shipImg.height/2);

    // Bullets du joueur
    for(const b of bullets){
      ctx.drawImage(bulletImg, b.x-8, b.y-16, 16, 32);
    }

    // Ennemis
    for(const e of enemies){
      ctx.drawImage(enemyImg, e.x-e.w/2, e.y-e.h/2, e.w, e.h);
    }

    // Bullets ennemies
    for(const b of enemyBullets){
      ctx.drawImage(bulletImg, b.x-8, b.y-16, 16, 32);
    }
  }
})();
