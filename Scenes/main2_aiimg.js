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
      this.player = null;
      this.cursors = null;
      this.keys = null;
      this.speed = 150;
      this.hud = null;
      this.coordText = null;
      this.isShopping = false; // NEW: Track if the shop UI is open
    }

    init() {
      this.energy = 100;      // reset to full    
      this.gameOver = false;
      this.currentRound = 0;   // Starts at 0, first round will be 1
      this.maxRounds = 10;     // Total number of rounds to survive
      this.enemiesRemaining = 0; // Tracks enemies to determine if a round is complete

    }
    drawHealthBar(x, y, health) {
    this.healthBar.clear(); // Clear the previous drawings

    const barWidth = 60;
    const barHeight = 8;
    const offsetX = -barWidth / 2; // Center the bar above the player
    const offsetY = -this.player.height / 2 - 3; // 10 pixels above the player

    // Calculate the position of the health bar relative to the player
    const barX = x + offsetX;
    const barY = y + offsetY;

    // Background bar (always full width)
    this.healthBar.fillStyle(0x000000, 0.5); // Dark grey, semi-transparent
    this.healthBar.fillRect(barX, barY, barWidth, barHeight);

    // Foreground health bar
    // Calculate the width based on current health percentage
    const currentHealthWidth = (barWidth * health) / this.player.maxHealth;

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
      this.baseHealthText.setText(`ĐIỆN THÁI HÒA: ${this.base.health}/${this.base.maxHealth}`);
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
      

      
      this.load.spritesheet('player','assets/giong_spritesheet64.png',{ frameWidth:49, frameHeight:64 });    
      this.load.audio('step',['assets/step.mp3']);
      this.load.image('citadel', 'assets/Hue_Citadel.png'); 
      this.load.image('banhchung', 'assets/banhchung.png'); 
      this.load.image('banhgiay', 'assets/banhgiay.png'); 
    }

    create() {
      const gameCenterX = GAME_W / 2 - 5; // 480
      const gameCenterY = GAME_H / 2 - 5; // 256

      this.cameras.main.setZoom(1);          // no zoom
      this.cameras.main.setScroll(0, 0);  
      this.add.image(0, 0, 'citadel').setOrigin(0);
      

      // player
      this.player = this.physics.add.sprite(GAME_W/2, GAME_H/2 + 100, 'player');
      this.player.setBounce(0.2);
      this.player.setCollideWorldBounds(true);
      this.player.setOrigin(0.2, 0.5);
      this.player.health = 100;
      this.player.maxHealth = 100;
      this.healthBar = this.add.graphics();
      this.healthBar.fillStyle(0x00ff00);
      this.healthBar.fillRect(10, 10, this.player.health, 10);
      this.drawHealthBar(this.player.x, this.player.y, this.player.health);

      this.player.lastHitTime = 0; // Timer for damage cooldown

      const player_height = 64; // The frame height
      const collision_height = 30; // Make the collision box 10px tall
      const offset_y = player_height - collision_height; // Offset from top of frame

      this.player.body.setSize(this.player.width, this.player.height - offset_y); 

      this.player.body.setOffset(-15, offset_y); 

      this.attackHitboxes = this.physics.add.group(); 

  
      this.attackCooldown = 500; 
      this.nextAttackTime = 0;
      this.playerHitTimer = 0; // Timer for player damage cooldown
      this.player.facing = 'up';

      this.player.on('animationcomplete', (animation, frame) => {
    // Only handle the transition for attack animations
    if (animation.key.startsWith('attack-')) {
        // Player is done attacking. Determine next animation.
        
        // If the player is currently moving, the update loop will handle the walk animation
        if (this.player.body.velocity.x === 0 && this.player.body.velocity.y === 0) {
            // Player is standing still, so play the correct idle animation.
            const idleKey = this.player.facing + '-idle'; // Assuming you have 'right-idle', 'up-idle', etc.
            this.player.anims.play(idleKey, true);
        }
        // If the player is moving, the update loop will immediately pick up the walk animation.
    }
});
    
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
      .setAlpha(0); 
      
      // Base Health Properties (The new part!)
      this.base.health = 500;
      this.base.maxHealth = 500;
      this.base.lastHitTime = 0;
      this.base.setOrigin(0.5, 0.5);
    // Base Health Bar (HUD)
      this.baseHealthBar = this.add.graphics().setScrollFactor(0);
      this.baseHealthText = this.add.text(GAME_W / 2, 30, 'CITADEL HEALTH: 500/500', { 
        fontFamily: 'monospace', fontSize: '12px', color: '#ffffffff' 
      }).setOrigin(0.5).setScrollFactor(0);

      this.physics.add.existing(this.base, true);
      this.physics.add.collider(this.player, this.base);



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
      this.physics.add.collider(this.player, this.gate);
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
      this.physics.add.collider(this.player, this.walls); 

      //Healing Station
      const healWidth = 150;
      const healHeight = 100;
      
      // Calculate the top-left (x, y) needed for perfect centering
      const healX = GAME_W/2 - 5;
      const healY = 50;

      this.healStation = this.add.rectangle(healX, healY, healWidth, healHeight, 0xffff00)
      .setOrigin(0.5, 0.5) // Key to aligning with physics body
      .setAlpha(0);

       // NEW: Add cooldown property and duration
      this.healStation.cooldownDuration = 60000; // 60 seconds cooldown
      this.healStation.readyTime = 0; // The time when the zone is ready to heal again


      this.physics.add.existing(this.healStation, true);
      this.physics.add.collider(this.player, this.healStation, this.handleHealingCollision, null, this);
      this.healStation.body.setSize(this.healStation.width, this.healStation.height);  
      this.healStation.body.setOffset(0, 0);

      this.add.text(healX + 10, healY - 25, 'Điện Cần Chánh (Hồi Máu)', { fontSize: '20px', fill: '#f1ececff' }).setOrigin(0.5, 1).setDepth(500);
      
      this.healStation.cooldownText = this.add.text(healX, healY + healHeight / 2 + 5, '', { 
          fontSize: '18px', fill: '#f1c40f', backgroundColor: '#34495e' 
      }).setOrigin(0.5, 0).setVisible(false);
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
      this.physics.add.collider(this.player, this.shop, null ,null, this);
      this.shop.body.setSize(this.shop.width, this.shop.height);  
      this.shop.body.setOffset(0, 0.2);


      this.add.text(shopX + 20, shopY - 20, 'Cửa Hàng (E)  ', { fontSize: '14px', fill: '#ecf0f1' }).setOrigin(0.5, 1);

       // NEW: Shop UI Group/Container (hidden initially)
      this.shopUI = this.add.container(GAME_W / 2, GAME_H / 2).setScrollFactor(0).setDepth(600).setVisible(false);
      
      // 1. Background Panel
      const shopBG = this.add.rectangle(0, 0, 400, 300, 0x1c2833).setAlpha(0.9);
      shopBG.setStrokeStyle(4, 0xecf0f1);
      
      // 2. Title
      const shopTitle = this.add.text(0, -130, 'Cửa Hàng', {
        fontFamily: 'monospace', fontSize: '28px', color: '#f1c40f'
      }).setOrigin(0.5);
      
      // ⭐ NEW: Potion Image for Item 1 ⭐
      const banhchungIcon = this.add.image(-180, -60, 'banhchung').setOrigin(0, 0.5); 
      const banhgiayIcon = this.add.image(-180, -20, 'banhgiay').setOrigin(0, 0.5);
      // Position: -170 (left side), -60 (vertical position of item 1 text)
      
      // 3. Items (Placeholder)
      // Text is moved slightly to the right to make room for the icon
      const item1 = this.add.text(-100, -60, '1. Bánh Chưng (x2 sát thương)', {
        fontFamily: 'monospace', fontSize: '18px', color: '#ffffff'
      }).setOrigin(0, 0.5); // Changed to 0.5 vertical origin for better centering
      
      const item2 = this.add.text(-100, -20, '2. Bánh Giầy (x2 máu)', { // Adjusted X position
        fontFamily: 'monospace', fontSize: '18px', color: '#ffffff'
      }).setOrigin(0, 0.5);

      // 4. Instructions
      const instructions = this.add.text(0, 100, 'Bấm E để đóng cửa hàng', {
        fontFamily: 'monospace', fontSize: '20px', color: '#e74c3c'
      }).setOrigin(0.5);
      
      // ⭐ ADD the new icon to the container's list of objects ⭐
      this.shopUI.add([shopBG, shopTitle, banhchungIcon, banhgiayIcon, item1, item2, instructions]);
      
      // ... (rest of existing create code)
      
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
      this.physics.add.collider(this.player, this.building);

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
      this.physics.add.collider(this.player, this.tower1);
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
      this.physics.add.collider(this.player, this.tower2);
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
      this.physics.add.overlap(this.player, this.enemies, this.handleEnemyTouch, null, this);
      this.physics.add.overlap(
          this.attackHitboxes, // Object 1: The temporary hitbox
          this.enemies,        // Object 2: The enemy group
          this.damageEnemy,    // The function to call on overlap
          null,                // Optional processCallback (use null)
          this                 // Context (the scene itself)
      );
      this.startNextRound();


      // Animations 
      //  Our player animations, turning, walking left and walking right.
      this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('player', { start: 6, end: 8 }),
        frameRate: 10,
        repeat: -1
      });

      this.anims.create({
        key: 'up',
        frames: this.anims.generateFrameNumbers('player', { start: 0  , end: 2 }),
        frameRate: 10,
        repeat: -1
      });

      this.anims.create({
        key: 'down',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: -1
      });


      this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('player', { start: 3, end: 5 }),
        frameRate: 10,
        repeat: -1
      });
      this.anims.create({
        key: 'attack-right',
        frames: this.anims.generateFrameNumbers('player', { start: 9, end: 11 }),
        frameRate: 10,
        repeat: 0
      });
      this.anims.create({
        key: 'attack-left',
        frames: this.anims.generateFrameNumbers('player', { start: 11, end: 13 }),
        frameRate: 10,
        repeat: 0
      });
      this.anims.create({
        key: 'die',
        frames: this.anims.generateFrameNumbers('player', { start: 13, end: 15 }),
        frameRate: 10,
        repeat: 0
      });
      // Input
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
        E: Phaser.Input.Keyboard.KeyCodes.E, // NEW: 'E' key for shop exit
      });
      this.input.keyboard.on('keydown-R', () => {
          if (this.gameOver) {
              this.restartGame();
          }
      }, this);
      this.input.keyboard.on('keydown-E', () => {
    // 1. If currently shopping, always close the shop.
    if (this.isShopping) {
        this.closeShop();
        return;
    }
    
    // 2. If not shopping, attempt to open the shop.
    // The openShop() function will check the distance.
    this.openShop();
    
}, this);

      // HUD
      this.input.on('pointerdown', this.handleAttackInput, this);
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
        fontFamily: 'monospace', fontSize: '32px', color: '#ffd900ff'
      }).setOrigin(0.5).setDepth(500).setVisible(false);

      this.restartText = this.add.text(GAME_W / 2, GAME_H / 2 + 20, 'Bấm R để chơi lại', {
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

      this.playerHitTimer += delta;
      this.drawHealthBar(this.player.x, this.player.y, this.player.health);
      this.drawBaseHealthBar();
       // Simple Enemy AI: Make enemies slowly move towards the player
      this.enemies.getChildren().forEach(enemy => {
        // Note: this.player must be initialized as your player sprite
        this.physics.moveToObject(enemy, this.base, enemy.speed);
      });

      if (this.healStation && this.healStation.readyTime > 0) {
    const currentTime = time;
    const remainingTime = this.healStation.readyTime - currentTime;

    if (remainingTime > 0) {
        // Calculate remaining seconds and format the text
        const seconds = Math.ceil(remainingTime / 1000);
        this.healStation.cooldownText.setText(`${seconds}s`);
    } else {
        // Cooldown has ended
        this.healStation.readyTime = 0;
        this.healStation.cooldownText.setVisible(false);
    }
}
      if (this.gameOver) return;
      // Movement (costs small energy per tick)
      const vx = (this.cursors.left.isDown || this.keys.A.isDown ? -1 : 0) +
        (this.cursors.right.isDown || this.keys.D.isDown ? 1 : 0);
      const vy = (this.cursors.up.isDown || this.keys.W.isDown ? -1 : 0) +
        (this.cursors.down.isDown || this.keys.S.isDown ? 1 : 0);

      const currentAnimKey = this.player.anims.currentAnim ? this.player.anims.currentAnim.key : '';
      if (currentAnimKey.startsWith('attack-') && this.player.anims.isPlaying) {
        // We still calculate velocity and apply it to allow movement during attack.
        const len = Math.hypot(vx, vy);
        this.player.setVelocity(len ? (vx / len) * this.speed : 0, len ? (vy / len) * this.speed : 0);
        
        
        return; // Exit the loop early to skip all movement animation commands.
    }

      if (this.energy > 0) {
        const len = Math.hypot(vx, vy);
        this.player.setVelocity(len ? (vx / len) * this.speed : 0, len ? (vy / len) * this.speed : 0);
        if (len) {
    this.player.setVelocity((vx / len) * this.speed, (vy / len) * this.speed);

        // Horizontal
        if (vx !== 0) {
    // Horizontal movement exists, prioritize it for facing and animation
    
    if (vx > 0) {
        this.player.anims.play('right', true);
        this.player.facing = 'right'; 
    } else {
        this.player.anims.play('left', true);
        this.player.facing = 'left';
    }

} else if (vy !== 0) {
    // Only check vertical movement if there is NO horizontal movement (vx is 0)
    
    if (vy > 0) {
        this.player.anims.play('down', true);
        this.player.facing = 'down'; 
    } else { 
        this.player.anims.play('up', true);
        this.player.facing = 'up';
    }
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
    this.player.setVelocity(0, 0);
    this.player.anims.stop();
}
          } else {
            // this.player.setVelocity(0, 0); // too tired

            this.triggerGameOver();
          }


      const tx = Math.floor(this.player.x / TILE);
      const ty = Math.floor(this.player.y / TILE);
      this.coordText.setText(`Tile: (${tx}, ${ty})`);

      // Are we moving?
      const moving = (vx !== 0 || vy !== 0);

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
    
    handleEnemyTouch(player, enemy) {
 // Damage cooldown: 500ms (0.5 seconds)
    const damageCooldown = 500; 
    const currentTime = this.time.now;
    
    if (this.gameOver) return;

    // Check if enough time has passed since the last hit
    if (currentTime > player.lastHitTime + damageCooldown) {
    // 1. Apply Damage
    player.health -= 10;
    player.lastHitTime = currentTime; // Reset the hit timer

    // Visual feedback: Flash the player red briefly
    this.tweens.add({
    targets: player,
    duration: 100,
    tint: 0xff0000,
    yoyo: true,
    onComplete: () => {
    player.setTint(0xffffff); // Return to normal color
    }
    });

    // 2. Update HUD
    this.refreshHUD();

    // 3. Check for game over
    if (player.health <= 0) {
    this.triggerGameOver();
    }
    }
    }


    handleBaseDamage(base, enemy) {
    if (this.gameOver) return;
    
    base.health -= 50; 
    
    // Safely remove the enemy
    enemy.body.enable = false;
    enemy.setVelocity(0, 0); 
    enemy.setVisible(false);
    
    this.time.delayedCall(0, () => {
        if (enemy.active) {
            enemy.destroy(); 
            
            // --- NEW CODE HERE ---
            this.enemiesRemaining--; // DECREMENT THE HUD COUNTER!
            this.refreshHUD();       // Update the HUD immediately
            // --- END NEW CODE ---
            
            // CRITICAL: Call checkRoundEnd ONLY when an enemy is destroyed
            this.checkRoundEnd(); 
        }
    });

    this.refreshHUD(); // Keep this for Base Health update, but the enemy count will update above.
    
    if (base.health <= 0) {
        this.triggerGameOver('Điện Thái Hòa đã thất thủ!');
    } 
}


    spawnEnemiesInRound(count, delay) {
    let spawnedCount = 0;

    this.roundSpawnTimer = this.time.addEvent({
        delay: delay, 
        callback: () => {
            
            // If the game is over, just remove the timer and exit
            if (this.gameOver) {
                this.roundSpawnTimer.remove();
                this.roundSpawnTimer = null;
                return;
            }
            
            // 1. Spawning the enemy happens first
            this.createSingleEnemy(); 
            spawnedCount++;
            
            if (spawnedCount >= count) {
                // Remove the timer object completely when spawning finishes!
                this.roundSpawnTimer.remove(); 
                this.roundSpawnTimer = null; // ✅ THIS IS WHAT TRIGGERS checkRoundEnd()
                return; // End the callback
            }
        },
        callbackScope: this,
        loop: true
    });
}

    createSingleEnemy() {
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
    enemy.speed = 30 + (this.currentRound * 5); // Enemy speed increases each round
    enemy.lastHitTime = 0; // Timer for damage cooldown
    
    // 🟢 ADDED HEALTH PROPERTIES 🟢
    
    // 1. Set the initial health (e.g., 1 for a one-hit kill, or more for tougher enemies)
    enemy.health = 1; 
    
    // 2. Critical flag for the damageEnemy() function to prevent multiple hits 
    // from a single attack hitbox.
    enemy.hitByAttack = false; 
}

    damageEnemy(hitbox, enemy) {
    // 1. Prevents the enemy from taking damage multiple times from the same hitbox
    if (enemy.hitByAttack) {
        return;
    }

    // Define the damage to apply (default to 1 if player.attackDamage isn't set)
    const damageAmount = this.player.attackDamage || 1;

    // Mark the enemy as hit by this specific attack
    enemy.hitByAttack = true; 
    
    enemy.health -= damageAmount; 

    // 3. Visual Feedback (Flash red)
    enemy.setTint(0xff0000); 
    this.time.delayedCall(100, () => {
        if (enemy.active) {
            enemy.clearTint();
        }
    }, [], this);


    if (enemy.health <= 0) { 
        
        // Destroy the enemy
        enemy.destroy(); 
        this.enemiesRemaining--; // DECREMENT THE HUD COUNTER!
        this.refreshHUD();       // Update the HUD immediately

        this.checkRoundEnd();
        
    }
}

    handleHealingCollision(player, healStation) {
    const currentTime = this.time.now;
    const healAmount = 50; // Give a meaningful burst of healing

    // 1. Check if the healing zone is off cooldown
    if (currentTime < healStation.readyTime) {
        // Zone is on cooldown, do nothing
        return;
    }

    // 2. Check if the player needs healing and is not dead
    if (this.gameOver || player.health >= player.maxHealth) {
        return;
    }

    // --- HEAL APPLIED & COOLDOWN ACTIVATED ---

    // 3. Apply Healing (Capped at maxHealth)
    player.health = Math.min(player.maxHealth, player.health + healAmount);
    
    // 4. Set Cooldown: Calculate the next ready time
    healStation.readyTime = currentTime + healStation.cooldownDuration;
    healStation.cooldownText.setVisible(true); 

    // 5. Visual Feedback for Healing
    player.setTint(0x00ff00); // Green flash for heal
    this.time.delayedCall(150, () => {
        player.setTint(0xffffff); // Return to white/default
    }, [], this);

    // 6. Update HUD
    this.refreshHUD();
}

    startNextRound() {
    if (this.currentRound >= this.maxRounds) {
        // Player survived all rounds
        this.triggerGameOver('Chiến thắng!');
        return;
    }

    this.currentRound++; // Advance to the next round
    const enemiesToSpawn = this.currentRound * 2;
    const spawnRate = Math.max(1000, 4000 - (this.currentRound - 1) * 500); // Decrease delay but not below 1 second
    this.enemiesRemaining = enemiesToSpawn;

    // Display the round information
    this.displayRoundInfo(`Ải ${this.currentRound} trên ${this.maxRounds}`);

    // Start the spawning process
    this.spawnEnemiesInRound(enemiesToSpawn, spawnRate); // 4 seconds between spawns
}

    displayRoundInfo(message) {
        // A temporary text object to flash round start info
        const roundText = this.add.text(GAME_W / 2, GAME_H / 2, message, {
            fontSize: '48px',
            fill: '#f1c40f',
            backgroundColor: '#2c3e50',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setDepth(100);

        // Fade out and destroy the text after a brief display
        this.tweens.add({
            targets: roundText,
            alpha: 0,
            delay: 2000,
            duration: 1000,
            onComplete: () => {
                roundText.destroy();
            }
        });
    }

    checkRoundEnd() {
    // 1. Check if the spawner has finished (it sets this.roundSpawnTimer to null)
    const spawningFinished = this.roundSpawnTimer === null;
    
    // 2. Check if all active enemies are gone
    const allEnemiesDestroyed = this.enemiesRemaining <= 0;

    if (spawningFinished && allEnemiesDestroyed) {
        // All enemies for the round are gone!
        this.displayRoundInfo(`Vượt ải ${this.currentRound} thành công!`);

        // Add a delay before starting the next round (5 seconds break)
        this.time.delayedCall(5000, this.startNextRound, [], this);
    }
}
    restartGame() {
      this.scene.restart();
    }

    changeEnergy(amount) {
      this.energy = Math.max(0, Math.min(100, this.energy + amount));
      this.refreshHUD();
    }

    
    refreshHUD() {
    if (this.gameOver) return;
    this.hud.setText(
        `Energy: ${this.energy}\n` +
        `Round: ${this.currentRound}/${this.maxRounds}\n` +
        `Enemies Left: ${this.enemiesRemaining}`
    );
}
    triggerGameOver() {
      this.gameOver = true;
      this.player.setVelocity(0, 0);
      this.hud.setText('');
      this.coordText.setText('');
      this.gameOverText.setVisible(true);
      this.restartText.setVisible(true);
      if (this.stepSfx) this.stepSfx.stop();
if (this.stepSfx) this.stepSfx.destroy();

    }
    performAttack(currentTime) {
    // 1. Set cooldown
    this.nextAttackTime = currentTime + this.attackCooldown;
    if (this.attackSfx) {
        this.attackSfx.play();
    }
    
    // 🟢 ADDED: Play the attack animation 🟢
    // Check player's facing direction and play the corresponding animation
    if (this.player.facing === 'left') {
        this.player.anims.play('attack-left', true);
    } else if (this.player.facing === 'right') {
        this.player.anims.play('attack-right', true);
    } 
    // NOTE: You may want to add 'attack-up' and 'attack-down' here if they exist.
    // If not, the player will stay on the last directional frame, which is usually fine.
    
    // 3. Define Hitbox Parameters
    let hitboxX = this.player.x;
    let hitboxY = this.player.y;
    let hitboxW = 40;
    let hitboxH = 40;
    
    // 4. Position the Hitbox based on player.facing
    switch (this.player.facing) {
      case 'up':
        hitboxY -= 20;
        break;
      case 'down':
        hitboxY += 20;
        break;
      case 'left':
        hitboxX -= 20;
        break;
      case 'right':
        hitboxX += 20;
        break;
      default:
    }
    
    // 5. Create the VISIBLE Physics Rectangle
    const hitbox = this.add.rectangle(hitboxX, hitboxY, hitboxW, hitboxH, 0xff00ff).setAlpha(0);
    
    // 6. Apply Physics and Add to Group
    this.physics.add.existing(hitbox);
    this.attackHitboxes.add(hitbox);
    
    hitbox.body.setAllowGravity(false);
    hitbox.body.setImmovable(true); 
    hitbox.body.moves = false;
    
    // 7. Destroy the hitbox after a very short duration (e.g., 50ms)
    this.time.delayedCall(50, () => {
        hitbox.destroy();
    }, [], this);
}
handleAttackInput(pointer) {
    // 1. Check if the left mouse button (button 0) was pressed
    if (this.gameOver || this.isShopping || pointer.leftButtonDown() === false) {
      return; // Exit if game is over, shopping, or left button is not down
    }
    
    const currentTime = this.time.now;
    
    // 2. Check attack cooldown
    if (currentTime < this.nextAttackTime) {
      return; // Exit if the attack is still on cooldown
    }
    
    // 3. If all checks pass, execute the attack
    this.performAttack(currentTime);
}
    openShop() { 
    // Define the range the player must be within to open the shop
    const activationRange = 100; 

    // 1. Perform the Proximity Check
    const distanceToShop = Phaser.Math.Distance.Between(
        this.player.x, 
        this.player.y, 
        this.shop.x, 
        this.shop.y
    );

    // If the player is too far, exit the function.
    if (distanceToShop >= activationRange) {
        return; 
    }
    
    // 2. State Checks
    if (this.shopUI.visible || this.gameOver) return;

    // --- Open the Shop ---
    this.player.setVelocity(0, 0); 
    this.player.anims.stop();
    
    this.isShopping = true; 
    this.shopUI.setVisible(true);
    this.updateShopUI(); 
    this.refreshHUD(); 
}
    // Simplified: Close Shop Function
    closeShop() {
      this.isShopping = false;
      this.shopUI.setVisible(false);
      
      // We don't need to re-enable physics here, as the collider handles itself.
    }

    // NEW: Shop UI Update (Placeholder for item availability/cost)
    updateShopUI() {
      // Logic for displaying available gold, item costs, etc.
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
