(() => {
  'use strict';

  const TILE = 32;
  const GRID_W = 32;
  const GRID_H = 16;
  const GAME_W = GRID_W * TILE;
  const GAME_H = GRID_H * TILE;
  
  class GameScene extends Phaser.Scene {
    constructor() {
      super('GameScene');
      this.grid = null;
      this.tiles = null;
      this.crops = null;
      this.waterOverlays = null;
      this.farmer = null;
      this.cursors = null;
      this.keys = null;
      this.speed = 150;
      this.hud = null;
      this.coordText = null;

    }

    init() {
      this.inventory = { wheat: 0 };
      this.energy = 100;      // reset to full    
      this.gameOver = false;

    }
    drawHealthBar(x, y, health) {
    this.healthBar.clear(); // Clear the previous drawings

    const barWidth = 60;
    const barHeight = 8;
    const offsetX = -barWidth / 2; // Center the bar above the player
    const offsetY = -this.farmer.height / 2 - 3; // 10 pixels above the player

    // Calculate the position of the health bar relative to the player
    const barX = x + offsetX;
    const barY = y + offsetY;

    // Background bar (always full width)
    this.healthBar.fillStyle(0x000000, 0.5); // Dark grey, semi-transparent
    this.healthBar.fillRect(barX, barY, barWidth, barHeight);

    // Foreground health bar
    // Calculate the width based on current health percentage
    const currentHealthWidth = (barWidth * health) / this.farmer.maxHealth;

    // Choose color based on health (e.g., green for high, red for low)
    if (health < 30) {
        this.healthBar.fillStyle(0xff0000, 1); // Red for low health
    } else if (health < 60) {
        this.healthBar.fillStyle(0xffff00, 1); // Yellow for medium health
    } else {
        this.healthBar.fillStyle(0x00ff00, 1); // Green for high health
    }
    
    this.healthBar.fillRect(barX, barY, currentHealthWidth, barHeight);
}

drawBaseHealthBar() {
      // Draws the Base health bar above the Citadel in World-Space
      if (!this.baseHealthBar || !this.base) return;

      this.baseHealthBar.clear();

      const barWidth = 150; 
      const barHeight = 10;
      
      // Calculate position relative to the base object (using its center coordinates)
      const barCenterX = this.base.x; 
      // barTopY is 10px above the actual top edge of the base
      const barTopY = this.base.y - (this.base.height / 2) - 10; 
      
      const barX = barCenterX - barWidth / 2;
      const barY = barTopY;
      
      // Background (Black)
      this.baseHealthBar.fillStyle(0x000000, 0.7);
      this.baseHealthBar.fillRect(barX, barY, barWidth, barHeight);

      // Foreground (Color based on health)
      const currentHealthWidth = (barWidth * this.base.health) / this.base.maxHealth;

      if (this.base.health < 125) { // 25% of 500
          this.baseHealthBar.fillStyle(0xff3333, 1); 
      } else if (this.base.health < 250) { // 50% of 500
          this.baseHealthBar.fillStyle(0xffaa00, 1); 
      } else {
          this.baseHealthBar.fillStyle(0x00ff00, 1); // Green health bar
      }

      this.baseHealthBar.fillRect(barX, barY, currentHealthWidth, barHeight);

      // Update the label position (World-Space)
      this.baseHealthText.x = barCenterX;
      this.baseHealthText.y = barY - 10; 
      this.baseHealthText.setText(`CITADEL: ${this.base.health}/${this.base.maxHealth}`);
    }


    preload() {
      // Ground tile
      const g = this.add.graphics();
      g.fillStyle(0x1cbd2a, 1);
      g.fillRect(0, 0, TILE, TILE);
      g.fillStyle(0x3a7f5b, 1);
      for (let i = 0; i < 10; i++) {
        g.fillRect(Phaser.Math.Between(0, TILE - 1), Phaser.Math.Between(0, TILE - 1), 1, 1);
      }
      g.generateTexture('tile-ground', TILE, TILE);
      g.clear();
      

      
      this.load.spritesheet('farmer','assets/giong_spritesheet64.png',{ frameWidth:20.5 , frameHeight:64 });    
      this.load.audio('step',['assets/step.mp3']);
      this.load.image('citadel', 'assets/Hue_Citadel.png'); 

    }

    create() {
      const gameCenterX = GAME_W / 2 - 5; // 480
      const gameCenterY = GAME_H / 2 - 5; // 256

      this.cameras.main.setZoom(1);          // no zoom
      this.cameras.main.setScroll(0, 0);  
      this.add.image(0, 0, 'citadel').setOrigin(0);
      

      // Farmer
      this.farmer = this.physics.add.sprite(GAME_W/2 + 25, GAME_H/2 + 100, 'farmer');
      this.farmer.setBounce(0.2);
      this.farmer.setCollideWorldBounds(true);

      this.farmer.health = 100;
      this.farmer.maxHealth = 100;
      this.healthBar = this.add.graphics();
      this.healthBar.fillStyle(0x00ff00);
      this.healthBar.fillRect(10, 10, this.farmer.health, 10);
      this.drawHealthBar(this.farmer.x, this.farmer.y, this.farmer.health);

      this.farmer.lastHitTime = 0; // Timer for damage cooldown

      const farmer_height = 64; // The frame height
      const collision_height = 30; // Make the collision box 10px tall
      const offset_y = farmer_height - collision_height; // Offset from top of frame

      this.farmer.body.setSize(this.farmer.width, collision_height); 

      this.farmer.body.setOffset(0, offset_y); 

      // base
      // Game dimensions are available globally or locally via 'this'
      const rectWidth = 132;
      const rectHeight = 69;

      // Calculate the top-left (x, y) needed for perfect centering
      const rectX = gameCenterX; // 480 - 66 = 414
      const rectY = gameCenterY;// 256 - 34.5 = 221.5

      // Initialize the rectangle using the calculated top-left corner
       this.base = this.add.rectangle(rectX, rectY, rectWidth, rectHeight, 0xff0000)
      .setOrigin(0.5, 0.5) // Key to aligning with physics body
      .setAlpha(0.5); 
      
      // Base Health Properties (The new part!)
      this.base.health = 500;
      this.base.maxHealth = 500;
      this.base.lastHitTime = 0;

    // Base Health Bar (HUD)
    this.baseHealthBar = this.add.graphics().setScrollFactor(0);
    this.baseHealthText = this.add.text(GAME_W / 2, 30, 'CITADEL HEALTH: 500/500', { 
        fontFamily: 'monospace', fontSize: '12px', color: '#ffffffff' 
      }).setOrigin(0.5).setScrollFactor(0);

      this.physics.add.existing(this.base, true);
      this.physics.add.collider(this.farmer, this.base);
      this.base.body.setSize(this.base.width, this.base.height -20);  
      this.base.body.setOffset(0, 20);  



      // Gate
      const gateWidth = 100;
      const gateHeight = 70 ;
      
      // Calculate the top-left (x, y) needed for perfect centering
      const gateX = 457;
      const gateY = 350;

      this.gate = this.add.rectangle(gateX, gateY + 50, gateWidth, gateHeight, 0x0000ff)
      .setOrigin(0, 0) // Key to aligning with physics body
      .setAlpha(0);

      this.physics.add.existing(this.gate, true);
      this.physics.add.collider(this.farmer, this.gate);
      this.gate.body.setSize(this.gate.width, this.gate.height);  
      this.gate.body.setOffset(0, 20);

      // Walls
      // Example: Top Wall Re-Revisited (The most stable way)
      this.walls = this.physics.add.staticGroup();

      // Top Wall
      this.walls.create(GAME_W / 2, 32, null) 
          .setDisplaySize(GAME_W, 20) 
          .setOrigin(0.5, 0) 
          .refreshBody() 
          .setAlpha(0); 
      // Bottom Wall
      this.walls.create(GAME_W / 2, GAME_H - 60, null) 
          .setDisplaySize(GAME_W, 20) 
          .setOrigin(0.5, 0) 
          .refreshBody() 
          .setAlpha(0);
      // Left Wall
      this.walls.create(150, GAME_H / 2, null) 
          .setDisplaySize(20, GAME_H) 
          .setOrigin(0, 0.5) 
          .refreshBody() 
          .setAlpha(0);
      // Right Wall
      this.walls.create(GAME_W - 155, GAME_H / 2, null) 
          .setDisplaySize(20, GAME_H) 
          .setOrigin(1, 0.5) 
          .refreshBody() 
          .setAlpha(0);
      this.physics.add.collider(this.farmer, this.walls); 

      //Healing Station
      const healWidth = 150;
      const healHeight = 100;
      
      // Calculate the top-left (x, y) needed for perfect centering
      const healX = GAME_W/2 - 5;
      const healY = 50;

      this.healStation = this.add.rectangle(healX, healY, healWidth, healHeight, 0xffff00)
      .setOrigin(0.5, 0.5) // Key to aligning with physics body
      .setAlpha(0);

      this.physics.add.existing(this.healStation, true);
      this.physics.add.collider(this.farmer, this.healStation, () => {
        this.eatWheat();
      }, null, this);
      this.healStation.body.setSize(this.healStation.width, this.healStation.height);  
      this.healStation.body.setOffset(0, 0);

      //Shop
      const shopWidth = 25;
      const shopHeight = 25;
      
      // Calculate the top-left (x, y) needed for perfect centering
      const shopX = GAME_W/2 - 150;
      const shopY = GAME_H - 180;

      this.shop = this.add.rectangle(shopX, shopY, shopWidth, shopHeight, 0x00ffff)
      .setOrigin(0.5, 0.5) // Key to aligning with physics body
      .setAlpha(0);

      this.physics.add.existing(this.shop, true);
      this.physics.add.collider(this.farmer, this.shop);
      this.shop.body.setSize(this.shop.width, this.shop.height);  
      this.shop.body.setOffset(0, 0.2
      );

      // Random Building
      const buildWidth = 85;
      const buildHeight = 20;
      
      // Calculate the top-left (x, y) needed for perfect centering
      const buildX = GAME_W/2 + 180;
      const buildY = GAME_H - 170;
      
      this.building = this.add.rectangle(buildX, buildY, buildWidth, buildHeight, 0xff00ff)
      .setOrigin(0.5, 0.5) // Key to aligning with physics body
      .setAlpha(0);
      this.physics.add.existing(this.building, true);
      this.physics.add.collider(this.farmer, this.building);
      this.building.body.setSize(this.building.width, this.building.height);  
      this.building.body.setOffset(0, 0.2
      );

      //Tower 1
      const tower1Width = 20;
      const tower1Height = 85;
      
      // Calculate the top-left (x, y) needed for perfect centering
      const tower1X = 180;
      const tower1Y = GAME_H/2 - 35;
      
      this.tower1 = this.add.rectangle(tower1X, tower1Y, tower1Width, tower1Height, 0xffffff)
      .setOrigin(0.5, 0.5) // Key to aligning with physics body
      .setAlpha(0);
      this.physics.add.existing(this.tower1, true);
      this.physics.add.collider(this.farmer, this.tower1);
      this.tower1.body.setSize(this.tower1.width, this.tower1.height - 20);  
      this.tower1.body.setOffset(0, 10);
      
      //Tower 2
      const tower2Width = 20;
      const tower2Height = 85;
      
      // Calculate the top-left (x, y) needed for perfect centering
      const tower2X = GAME_W - 180;
      const tower2Y = GAME_H/2 - 35;
      
      this.tower2 = this.add.rectangle(tower2X, tower2Y, tower2Width, tower2Height, 0x000000  )
      .setOrigin(0.5, 0.5) // Key to aligning with physics body
      .setAlpha(0);
      this.physics.add.existing(this.tower2, true);
      this.physics.add.collider(this.farmer, this.tower2);
      this.tower2.body.setSize(this.tower2.width, this.tower2.height - 20);  
      this.tower2.body.setOffset(0, 10);

      // Enemies group
      this.enemies = this.physics.add.group();
      this.spawnPoints = [this.tower1, this.tower2]; // Add more spawn points as needed

      // 2. Set up Collisions (Crucial for physics behavior)
      this.physics.add.collider(this.enemies, this.walls);
      this.physics.add.collider(this.enemies, this.enemies); // Enemies bounce off each other
      this.physics.add.collider(this.enemies, this.gate);

      this.physics.add.overlap(this.base, this.enemies, this.handleBaseDamage, null, this);
      this.physics.add.overlap(this.farmer, this.enemies, this.handleEnemyTouch, null, this);

      this.time.addEvent({
        delay: 4000, 
        callback: this.spawnEnemy,
        callbackScope: this,
        loop: true
      });


      // Animations 
      //  Our player animations, turning, walking left and walking right.
      this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('farmer', { start: 6, end: 8 }),
        frameRate: 10,
        repeat: -1
      });

      this.anims.create({
        key: 'up',
        frames: this.anims.generateFrameNumbers('farmer', { start: 0  , end: 2 }),
        frameRate: 10,
        repeat: -1
      });

      this.anims.create({
        key: 'down',
        frames: this.anims.generateFrameNumbers('farmer', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: -1
      });


      this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('farmer', { start: 3, end: 5 }),
        frameRate: 10,
        repeat: -1
      });

      // Input
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
      });

      // HUD
      this.hud = this.add.text(8, 8, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff'
      }).setScrollFactor(0);

      this.coordText = this.add.text(8, 72, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#cccccc'
      }).setScrollFactor(0);

      this.refreshHUD();
      // Game Over overlay (hidden at start)
      this.gameOverText = this.add.text(GAME_W / 2, GAME_H / 2 - 20, 'GAME OVER', {
        fontFamily: 'monospace', fontSize: '32px', color: '#ff3333'
      }).setOrigin(0.5).setDepth(500).setVisible(false);

      this.restartText = this.add.text(GAME_W / 2, GAME_H / 2 + 20, 'Press R to Restart', {
        fontFamily: 'monospace', fontSize: '20px', color: '#ffffff'
      }).setOrigin(0.5).setDepth(500).setVisible(false);

      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        // Remove keyboard listeners created in create()
        this.input.keyboard.removeAllListeners();
      });
      // sound
      this.stepSfx = this.sound.add('step', { volume: 0.4 });

      // footstep cadence (ms between steps)
      this.stepInterval = 250;       // tweak to taste; lower = faster cadence
      this.stepAccumulator = 0;      // timer accumulator

    }

    update(time, delta) {

      this.farmerHitTimer += delta;
      this.drawHealthBar(this.farmer.x, this.farmer.y, this.farmer.health);
      this.drawBaseHealthBar();
       // Simple Enemy AI: Make enemies slowly move towards the farmer
      this.enemies.getChildren().forEach(enemy => {
        // Note: this.farmer must be initialized as your player sprite
        this.physics.moveToObject(enemy, this.base, enemy.speed);
      });


      if (this.gameOver) return;
      // Movement (costs small energy per tick)
      const vx = (this.cursors.left.isDown || this.keys.A.isDown ? -1 : 0) +
        (this.cursors.right.isDown || this.keys.D.isDown ? 1 : 0);
      const vy = (this.cursors.up.isDown || this.keys.W.isDown ? -1 : 0) +
        (this.cursors.down.isDown || this.keys.S.isDown ? 1 : 0);

      if (this.energy > 0) {
        const len = Math.hypot(vx, vy);
        this.farmer.setVelocity(len ? (vx / len) * this.speed : 0, len ? (vy / len) * this.speed : 0);
        if (len) {
          this.farmer.setVelocity((vx / len) * this.speed, (vy / len) * this.speed);

          if (Math.abs(vx) > Math.abs(vy)) {
            // Horizontal
            if (vx > 0) this.farmer.anims.play('right', true);
            else this.farmer.anims.play('left', true);
          } else {
            // Vertical
            if (vy > 0) this.farmer.anims.play('down', true);
              else this.farmer.anims.play('up', true);
            }
            const speedFactor = this.speed / 150; // 150 is your base speed

  this.stepAccumulator += delta * speedFactor;

  if (this.stepAccumulator >= this.stepInterval) {
    // rate-limited: fire one footstep and reset timer
    this.stepSfx.play();
    this.stepAccumulator = 0;
  }
        } else {
            this.stepAccumulator = 0;
          this.farmer.setVelocity(0, 0);
          this.farmer.anims.stop();
        }
      } else {
        // this.farmer.setVelocity(0, 0); // too tired

        this.triggerGameOver();
      }


      const tx = Math.floor(this.farmer.x / TILE);
      const ty = Math.floor(this.farmer.y / TILE);
      this.coordText.setText(`Tile: (${tx}, ${ty})`);

      // Are we moving?
      const moving = (vx !== 0 || vy !== 0) && this.energy > 0;

      // Advance or reset the footstep timer
      if (moving) {
        // optional: scale cadence by speed (faster walk = faster steps)
        const speedFactor = this.speed / 150; // 150 is your base speed
        this.stepAccumulator += delta * speedFactor;

        if (this.stepAccumulator >= this.stepInterval) {
          // rate-limited: fire one footstep and reset timer
          this.stepSfx.play();
          this.stepAccumulator = 0;
        }
      } else {
        // stopped: make sure we don't spam a stale step when resuming
        this.stepAccumulator = 0;
        // (No need to stop the sound since it's a short one-shot)
      }

    }
    
    handleEnemyTouch(farmer, enemy) {
 // Damage cooldown: 500ms (0.5 seconds)
    const damageCooldown = 500; 
    const currentTime = this.time.now;
    
    if (this.gameOver) return;

    // Check if enough time has passed since the last hit
    if (currentTime > farmer.lastHitTime + damageCooldown) {
    // 1. Apply Damage
    farmer.health -= 10;
    farmer.lastHitTime = currentTime; // Reset the hit timer

    // Visual feedback: Flash the farmer red briefly
    this.tweens.add({
    targets: farmer,
    duration: 100,
    tint: 0xff0000,
    yoyo: true,
    onComplete: () => {
    farmer.setTint(0xffffff); // Return to normal color
    }
    });

    // 2. Update HUD
    this.refreshHUD();

    // 3. Check for game over
    if (farmer.health <= 0) {
    this.triggerGameOver();
    }
    }
    }


    handleBaseDamage(base, enemy) {
    // No need for damage cooldown check now, since the enemy will be destroyed on impact.
    // If you still want to ensure a single enemy can only hit the base once per lifetime,
    // you can skip the cooldown check entirely.

    if (this.gameOver) return;
    
    // 1. Apply Damage
    base.health -= 50; // Base takes 50 damage
    
    // 2. Destroy the enemy immediately
    

    // 4. Update HUD
    this.refreshHUD();
    enemy.destroy(); // Remove the enemy after it hits the base
    // 5. Check for game over
    if (base.health <= 0) {
        this.triggerGameOver('The Citadel has fallen!');
    }
}


    spawnEnemy() {
      if (this.gameOver) return;
      
      // Choose a random spawn point
      const spawnPoint = Phaser.Math.RND.pick(this.spawnPoints);
      
      // Use the center of the spawn point's physics body for the spawn location
      const x = spawnPoint.body.center.x;
      const y = spawnPoint.body.center.y;
      
      // Create the enemy sprite
      const enemy = this.enemies.create(x, y, 'enemy-placeholder');
      // Set minimal properties
      enemy.setCollideWorldBounds(true);
      enemy.setBounce(0.5); 
      enemy.speed = 30; // Used for simple AI movement later
      enemy.lastHitTime = 0; // Timer for damage cooldown
    }

    eatWheat() {
      if (this.gameOver) return;
      if (this.inventory.wheat > 0 && this.energy < 100) {
        this.inventory.wheat -= 1;
        this.changeEnergy(+15);
      }
    }


    restartGame() {
      this.scene.restart();
    }

    changeEnergy(amount) {
      this.energy = Math.max(0, Math.min(100, this.energy + amount));
      this.refreshHUD();
    }
    makeGrassTexture(key, size) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x2d6a4f, 1);
      g.fillRect(0, 0, size, size);
      g.fillStyle(0x3a7f5b, 1);
      for (let i = 0; i < 10; i++) {
        g.fillRect(Phaser.Math.Between(0, size - 1), Phaser.Math.Between(0, size - 1), 1, 1);
      }
      g.generateTexture(key, size, size);
      g.destroy();
    }
    refreshHUD() {
      if (this.gameOver) return;
      this.hud.setText(
        `Energy: ${this.energy}\n`
      );
    }
    triggerGameOver() {
      this.gameOver = true;
      this.farmer.setVelocity(0, 0);
      this.hud.setText('');
      this.coordText.setText('');
      this.gameOverText.setVisible(true);
      this.restartText.setVisible(true);
      if (this.stepSfx) this.stepSfx.stop();
if (this.stepSfx) this.stepSfx.destroy();

    }
    inBounds(tx, ty) {
      return tx >= 0 && tx < GRID_W && ty >= 0 && ty < GRID_H;
    }
  }


  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#1f1f1f',

    scene: [GameScene],
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  };

  new Phaser.Game(config);
})();
