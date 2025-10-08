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
      this.startButton = null;
      this.isShopping = false; // NEW: Track if the shop UI is open
    }

    init() {    // reset to full    
      this.gameOver = false;
      this.currentRound = 0;   // Starts at 0, first round will be 1
      this.maxRounds = 10;     // Total number of rounds to survive
      this.enemiesRemaining = 0; // Tracks enemies to determine if a round is complete
      this.money = 0;

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
      
      this.load.spritesheet('boss2','assets/TIGER_SPRITES.png', {frameWidth: 128, frameHeight:128})
      this.load.spritesheet('boss1','assets/BOSS_SPRITES.png', {frameWidth: 128, frameHeight:128})
      this.load.spritesheet('enemies','assets/enemies.png',{ frameWidth:64, frameHeight:64 });    
      this.load.spritesheet('player','assets/giong_spritesheet64.png',{ frameWidth:49, frameHeight:64 });
      this.load.audio('attack-sfx',['assets/attack-sfx.wav']);
      this.load.audio('step',['assets/step.mp3']);
      this.load.audio('heal',['assets/heal.wav']);
      this.load.audio('buy',['assets/buy.wav']);
      this.load.audio('buy-fail',['assets/buy-fail.wav'])
      this.load.image('citadel', 'assets/Hue_Citadel.png'); 
      this.load.image('banhchung', 'assets/banhchung.png'); 
      this.load.image('banhgiay', 'assets/banhgiay.png'); 
      this.load.image('attack-visual', 'assets/hitting_effect.png');
      this.load.image('longchimlac','assets/longchimlac.png')
    }

    create() {
      const gameCenterX = GAME_W / 2 - 5; // 480
      const gameCenterY = GAME_H / 2 - 5; // 256

      this.cameras.main.setZoom(1);          // no zoom
      this.cameras.main.setScroll(0, 0);  
      this.add.image(0, 0, 'citadel').setOrigin(0);
      
      this.BOSS_SPEED = 5;

      // player
      this.player = this.physics.add.sprite(GAME_W/2, GAME_H/2 + 100, 'player');
      this.player.setBounce(0.2);
      this.player.setCollideWorldBounds(true);
      this.player.setOrigin(0.2, 0.5);
      this.player.health = 100;
      this.player.maxHealth = 100;
      this.player.attackDamage = 10;
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

      this.add.text(gateX + 50, gateY + 50, 'Ngọ Môn', { fontSize: '20px', fill: '#f1ececff' }).setOrigin(0.5, 1).setDepth(500);

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
      this.healStation.cooldownDuration = 45000; // 60 seconds cooldown
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

      const shopItems = [
    {
        id: 'banhchung',
        name: 'Bánh Chưng',
        description: 'x2 sát thương',
        price: 75,
        // Effect function takes the player sprite and modifies its 'attackDamage'
        effect: (player) => { player.attackDamage *= 2; } 
    },
    {
        id: 'banhgiay',
        name: 'Bánh Giầy',
        description: '+20 máu tối đa',
        price: 75,
        // Effect function modifies 'maxHealth' and heals the player to the new max
        effect: (player) => { 
            player.maxHealth += 20;  // Refill health on purchase
            player.health = player.maxHealth;
            this.drawHealthBar(player.x, player.y, player.health); // Update health bar display
        }
    },
    {
        id: 'longchim',
        name: 'Lông Chim Lạc',
        description: 'x1.5 Tốc Độ',
        price: 60,
        // Effect function increases the player's movement speed property
        effect: () => { 
            // Assuming the speed property on the player is named 'speed'
            this.speed *= 1.5; 
        }
    }
];  


      this.add.text(shopX + 20, shopY - 20, 'Cửa Hàng (E)  ', { fontSize: '14px', fill: '#ecf0f1' }).setOrigin(0.5, 1);

       // NEW: Shop UI Group/Container (hidden initially)
      this.shopUI = this.add.container(GAME_W / 2, GAME_H / 2).setScrollFactor(0).setDepth(600).setVisible(false);
      
      // 1. Background Panel
      const shopBG = this.add.rectangle(0, 0, 500, 350, 0x1c2833).setAlpha(0.9);
      shopBG.setStrokeStyle(4, 0xecf0f1);
      
      // 2. Title
      const shopTitle = this.add.text(0, -130, 'Cửa Hàng', {
        fontFamily: 'monospace', fontSize: '28px', color: '#f1c40f'
      }).setOrigin(0.5);
      
      const banhchungIcon = this.add.image(-220, -90, 'banhchung').setOrigin(0, 0.5); 
      const banhgiayIcon = this.add.image(-220, -30, 'banhgiay').setOrigin(0, 0.5);
      const longchimIcon = this.add.image(-220, 30, 'longchimlac').setOrigin(0,0.5);

      // 4. Instructions
      const instructions = this.add.text(0, 150, 'Bấm E để đóng cửa hàng', {
        fontFamily: 'monospace', fontSize: '24px', color: '#e74c3c'
      }).setOrigin(0.5);
      
      // ⭐ ADD the new icon to the container's list of objects ⭐
      this.shopUI.add([shopBG, shopTitle, banhchungIcon, banhgiayIcon, longchimIcon, instructions]);
      
      const itemContainerYStart = -90;
      const itemSpacing = 60;

      shopItems.forEach((item, index) => {
          const yPos = itemContainerYStart + (index * itemSpacing);

          // 3. Items (Text)
          const itemText = this.add.text(-140, yPos, `${index + 1}. ${item.name} (${item.description})`, {
              fontFamily: 'monospace', fontSize: '18px', color: '#ffffff'
          }).setOrigin(0, 0.5);

          // 4. Price and Buy Button
          const priceText = this.add.text(100, yPos + 30, `${item.price} G`, { 
              fontFamily: 'monospace', fontSize: '18px', color: '#5dade2'
          }).setOrigin(0, 0.5);

          const buyButton = this.add.text(150, yPos + 30, '[MUA]', {
              fontFamily: 'monospace', fontSize: '18px', color: '#2ecc71'
          })
          .setOrigin(0, 0.5)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.buyItem(item)); // Attach buying function

          // Add elements to the container
          this.shopUI.add([itemText, priceText, buyButton]);
      });

      // 5. Player Money Display
      this.moneyText = this.add.text(0, 120, `Tiền: ${this.money}`, {
          fontFamily: 'monospace', fontSize: '20px', color: '#f1c40f'
      }).setOrigin(0.5);
      this.shopUI.add(this.moneyText);
       
      
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


      //Enemy anims
      this.anims.create({
        key: 'enemy-left',
        frames: this.anims.generateFrameNumbers('enemies', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: -1
      });
      this.anims.create({
        key: 'enemy-right',
        frames: this.anims.generateFrameNumbers('enemies', { start: 3, end: 5 }),
        frameRate: 10,
        repeat: -1
      });
      this.anims.create({
        key: 'enemy-attack-left',
        frames: this.anims.generateFrameNumbers('enemies', { start: 6, end: 8 }),
        frameRate: 5,
        repeat: 0
      });
      this.anims.create({
        key: 'enemy-attack-right',
        frames: this.anims.generateFrameNumbers('enemies', { start: 9, end: 11 }),
        frameRate: 5,
        repeat: 0
      });

      // Boss anims
      this.anims.create({
        key: 'boss1-walk',
        frames: this.anims.generateFrameNumbers('boss1', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
      });

      this.anims.create({
        key: 'boss2-walk',
        frames: this.anims.generateFrameNumbers('boss2', { start: 12, end: 15 }),
        frameRate: 10,
        repeat: -1
      })
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

      this.refreshHUD();
      // Game Over overlay (hidden at start)
      this.gameOverText = this.add.text(GAME_W / 2, GAME_H / 2 - 20, 'GAME OVER', {
        fontFamily: 'monospace', fontSize: '32px', color: '#ffd900ff'
      }).setOrigin(0.5).setDepth(500).setVisible(false);

      this.VictoryText = this.add.text(GAME_W / 2, GAME_H / 2 - 20, 'Chiến Thắng!', {
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
      this.enemyHitSfx = this.sound.add('attack-sfx', {volume: 0.4});
      this.healSfx = this.sound.add('heal', {volume: 0.4});
      this.buySfx = this.sound.add('buy', {volume: 0.4});
      this.buyFailSfx = this.sound.add('buy-fail', {volume: 0.4});
      // footstep cadence (ms between steps)
      this.stepInterval = 250;       // tweak to taste; lower = faster cadence
      this.stepAccumulator = 0;      // timer accumulator

      this.nextRoundTimerText = this.add.text(GAME_W / 2, GAME_H / 2 + 60, '', {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#ffffffff' // Gold/Yellow color for visibility
      })
      .setOrigin(0.5)
      .setDepth(500)
      .setScrollFactor(0) // Fixed position
      .setVisible(false); // Start hidden

      // Initialize the flag to manage the cooldown state
      this.roundEndTimerActive = false;
      this.cooldownEndTime = 0;


      this.background = this.add.rectangle(220, 90, 550, 100, 0x333333).setOrigin(0).setAlpha(0.8);

        // Loading/Response text
        this.responseText = this.add.text(
            230, 
            100, 
            'Awaiting Gemini response...',
            { 
                fontFamily: 'Arial', 
                fontSize: '13px', 
                color: '#ffffff',
                wordWrap: { width: 600 },
                lineSpacing: 10
            }
        ).setOrigin(0);
        this.children.bringToTop(this.responseText); 
        
        // --- 2. SETUP HIDDEN BUTTON ---
        this.startButton = this.add.text(
            100, 
            150, // Position it below the response text (will be moved later)
            '[NHẤN ĐỂ BẮT ĐẦU]',
            { 
                fontFamily: 'Arial', 
                fontSize: '18px', 
                color: '#ffdd00' // Gold/Yellow for visibility
            }
        )
        .setOrigin(0)
        .setDepth(500)
        .setInteractive() // Make it clickable!
        .setVisible(false); // Start hidden

        // Attach the final game start action to the button
        this.startButton.on('pointerdown', this.startGame, this);
        
        // --- 3. START THE ASYNCHRONOUS PROCESS ---
        this.startLoadingAndFetch(); 
    }



    update(time, delta) {

      this.playerHitTimer += delta;
      this.drawHealthBar(this.player.x, this.player.y, this.player.health);
      this.drawBaseHealthBar();
       // Simple Enemy AI: Make enemies slowly move towards the player
      this.enemies.getChildren().forEach(enemy => {
        if (enemy.isBoss) {
            return; // Skip regular enemy movement
        }
        // Note: this.player must be initialized as your player sprite
        this.physics.moveToObject(enemy, this.base, enemy.speed);
    });

    // ⭐ DEDICATED BOSS MOVEMENT BLOCK ⭐
    if (this.boss && this.boss.active) {
        
        // Check if the boss has reached or is overlapping the actual target (this.base)
        if (!this.physics.overlap(this.boss, this.base)) {
            
            this.physics.moveToObject(this.boss, this.base, this.BOSS_SPEED);
            
        } else {
            this.boss.body.setVelocity(0); 
        }
    }

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


      const tx = Math.floor(this.player.x / TILE);
      const ty = Math.floor(this.player.y / TILE);

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
      this.enemies.getChildren().forEach(enemy => {
        this.drawEnemyHealthBar(enemy);
     });


      // ⭐ COOLDOWN HUD UPDATE ⭐
    if (this.roundEndTimerActive) {
        const remainingTime = this.cooldownEndTime - this.time.now;

        if (remainingTime > 0) {
            // Convert milliseconds to seconds and round up to the next whole second
            const seconds = Math.ceil(remainingTime / 1000); 
            
            // Update the text display using the new name
            this.nextRoundTimerText.setText(`Vòng mới sau ${seconds}s`);
        } else {
            // Cooldown finished: hide HUD and reset the flag
            this.nextRoundTimerText.setVisible(false);
            this.roundEndTimerActive = false;
            // The delayedCall from checkRoundEnd will now execute startNextRound()
        }
    }
    }
    
    handleEnemyTouch(player, enemy) {
    if (enemy.isBoss) {
        // Do nothing (No damage applied to the player)
        return; 
    }
    
    // Check if the enemy is already playing an attack animation
    if (enemy.anims.isPlaying && enemy.anims.currentAnim.key.includes('attack')) {
        return; // Don't interrupt an ongoing attack animation
    }
    
    // --- Determine Attack Animation Key ---
    let attackAnimKey;
    
    // Check velocity to determine facing direction:
    if (enemy.body.velocity.x < 0) {
        // Enemy is moving/facing LEFT
        attackAnimKey = 'enemy-attack-left';
    } else {
        // Enemy is moving/facing RIGHT
        attackAnimKey = 'enemy-attack-right';
    }
    
    // --- Trigger the Attack Animation ---
    // Use once to play the attack animation only one time
    enemy.play(attackAnimKey, true); 
    
    // Important: Stop the movement/walking animation while attacking
    enemy.setVelocityX(0);

    // After the attack animation completes, return to walking
    enemy.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        // Restore velocity and walk animation based on original direction
        if (attackAnimKey === 'enemy-attack-left') {
            enemy.setVelocityX(-enemy.speed);
            enemy.play('enemy-left');
        } else {
            enemy.setVelocityX(enemy.speed);
            enemy.play('enemy-right');
        }
    });

    // --- Apply Damage Cooldown and Logic ---
    const damageCooldown = 500; 
    const currentTime = this.time.now;
    
    if (this.gameOver) return;

    // Check if enough time has passed since the last hit
    if (currentTime > player.lastHitTime + damageCooldown) {
        // 1. Apply Damage
        player.health -= 5;
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
    
    // ⭐ NEW: Determine Damage Amount ⭐
    let damageAmount = 50; // Default damage for regular enemies

    if (enemy.isBoss) {
        damageAmount = 500; // Boss deals 10x damage to the base
    }

    // Apply the determined damage amount
    base.health -= damageAmount; 
    
    // If the boss is removed here, its separate health bar needs to be cleaned up.
    if (enemy.isBoss && this.bossHealthBar) {
        this.bossHealthBar.destroy();
        this.bossHealthBar = null; 
    }

    if (enemy.healthBar) {
        enemy.healthBar.destroy();
        enemy.healthBar = null; 
    }

    // Safely remove the enemy
    enemy.body.enable = false;
    enemy.setVelocity(0, 0); 
    enemy.setVisible(false);
    
    // Use a delayedCall of 0 to ensure proper destruction at the end of the frame
    this.time.delayedCall(0, () => {
        if (enemy.active) {
            enemy.destroy(); 
            
            this.enemiesRemaining--; // DECREMENT THE HUD COUNTER!
            this.refreshHUD();      // Update the HUD immediately
            
            this.checkRoundEnd(); 
        }
    });

    this.refreshHUD(); 
    
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
                this.roundSpawnTimer = null; // 
                return; // End the callback
            }
        },
        callbackScope: this,
        loop: true
    });
}

    createSingleEnemy() {
    if (this.gameOver) return;

    // --- 1. Get Spawn Location ---
    // Choose a random spawn point
    const spawnPoint = Phaser.Math.RND.pick(this.spawnPoints);

    // Use the center of the spawn point's physics body for the spawn location
    const x = spawnPoint.body.center.x;
    const y = spawnPoint.body.center.y;

    // Create the enemy sprite
    const enemy = this.enemies.create(x, y, 'enemies').setScale(0.6);

    // Set minimal properties
    enemy.setCollideWorldBounds(true);
    enemy.setBounce(0.5);

    // --- 2. Apply Facing Logic and Movement ---

    // Define the base/center X-coordinate. Replace 'this.baseX' 
    // with the actual X-coordinate of your game's base/center.
    const baseX = this.baseX || (this.sys.game.config.width / 2); // Fallback to screen center

    enemy.speed = 10 + (this.currentRound * 5); // Enemy speed increases each round

    if (x > baseX) {
        // Enemy spawned on the RIGHT side. It must walk LEFT.
         

        // 2. Set movement speed to negative for leftward movement.
        enemy.setVelocityX(-enemy.speed); 
        enemy.play('enemy-left'); 

    } else {
        // Enemy spawned on the LEFT side. It must walk RIGHT.

        // 2. Set movement speed to positive for rightward movement.
        enemy.setVelocityX(enemy.speed); 

        // 3. Play the walking animation
        enemy.play('enemy-right'); 
    }

    // --- 3. Set Other Properties ---
    enemy.lastHitTime = 0; // Timer for damage cooldown
    enemy.health = 30; // Increase health each round
    enemy.maxHealth = enemy.health;
    
    // This allows the bar to be drawn relative to and move with the enemy.
    enemy.healthBar = this.add.graphics();
}

    damageEnemy(hitbox, enemy) {
    // 1. Initialize a Set on the hitbox to track which enemies it has hit.
    // We use a Set for fast lookups and to store the unique enemy object reference.
    if (!hitbox.enemiesHit) {
        hitbox.enemiesHit = new Set();
    }
    
    // 2. Check if this specific enemy has already been hit by THIS specific hitbox.
    if (hitbox.enemiesHit.has(enemy)) {
        // If the enemy is already in the Set, exit immediately (damage already applied by this hitbox).
        return;
    }

    // 3. If not hit, mark the enemy as hit by adding it to the hitbox's Set.
    hitbox.enemiesHit.add(enemy);

     if (this.enemyHitSfx) {
        this.enemyHitSfx.play();
    }
    // Define the damage to apply (default to 1 if player.attackDamage isn't set)
    const damageAmount = this.player.attackDamage || 1;
    
    enemy.health -= damageAmount; 

    if (enemy.isBoss && this.bossHealthBar && this.currentRound === 5) {
        // Update the custom text display for the boss
        this.bossHealthBar.setText(`TRIỆU ĐÀ: ${Math.max(0, enemy.health)}`);
        
        // Ensure the health bar is updated if you're using separate drawing logic
        // If the enemy health bar function handles the boss, that's fine, but this text is unique.
    }
    else if (enemy.isBoss && this.bossHealthBar && this.currentRound === 10) {
        // Update the custom text display for the boss
        this.bossHealthBar.setText(`BẠCH HỔ: ${Math.max(0, enemy.health)}`);
        
        // Ensure the health bar is updated if you're using separate drawing logic
        // If the enemy health bar function handles the boss, that's fine, but this text is unique.
    }
    // 4. Visual Feedback (Flash red)
    enemy.setTint(0xff0000); 
    this.time.delayedCall(100, () => {
        if (enemy.active) {
            enemy.clearTint();
        }
    }, [], this);


    if (enemy.health <= 0) { 
        // Important: Destroy the enemy's dedicated health bar graphics object
        if (enemy.healthBar) {
            enemy.healthBar.destroy();
        }
        
        if (enemy.isBoss && this.bossHealthBar) {
            this.bossHealthBar.destroy();
            this.bossHealthBar = null; // Clear the reference
        }
        // Destroy the enemy
        enemy.destroy(); 
        this.money += 10;
        this.enemiesRemaining--; // DECREMENT THE HUD COUNTER!
        this.refreshHUD();       // Update the HUD immediately

        this.checkRoundEnd();
    }
}

    drawEnemyHealthBar(enemy) {
    // Safety check: Stop if the enemy or its graphics object is invalid.
    if (!enemy || !enemy.healthBar || enemy.health <= 0) {
        // If the enemy is destroyed but for some reason the bar wasn't, destroy it now.
        if (enemy && enemy.healthBar) {
             enemy.healthBar.destroy(); 
        }
        return;
    }

    const healthBar = enemy.healthBar;
    healthBar.clear(); // Clear the previous drawing
    
    // to the enemy's position. This lets Phaser handle the synchronization.
    healthBar.setPosition(enemy.x, enemy.y); 

    // Configuration 
    const barWidth = 40;
    const barHeight = 5;

    // Calculate offsets based on bar size. These offsets are drawn RELATIVE to (enemy.x, enemy.y)
    const offsetX = -barWidth / 2;
    const offsetY = -enemy.height / 2 - 5; 
    
    // The drawing coordinates are now just the offsets (relative to the Graphics object's position)
    const drawX = offsetX;
    const drawY = offsetY;

    // Background bar (always full width)
    healthBar.fillStyle(0x000000, 0.5); 
    healthBar.fillRect(drawX, drawY, barWidth, barHeight);

    // Foreground health bar
    const currentHealthWidth = (barWidth * enemy.health) / enemy.maxHealth;
    const healthPercentage = (enemy.health / enemy.maxHealth) * 100;

    // Choose color based on health percentage
    if (healthPercentage < 25) {
        healthBar.fillStyle(0xff0000, 1); 
    } else if (healthPercentage < 50) {
        healthBar.fillStyle(0xffff00, 1); 
    } else {
        healthBar.fillStyle(0x00ff00, 1); 
    }

    // Draw the health fill
    healthBar.fillRect(drawX, drawY, currentHealthWidth, barHeight);
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
    
    if (this.healSfx) {
        this.healSfx.play();
    }
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
    this.currentRound++; 
    if (this.currentRound > this.maxRounds) {
        // Player survived all rounds
        this.triggerVictory();
        return;
    }

    if (this.currentRound === 5) {
        this.spawnBossRound5();
        return; // Stop the standard spawn process for this round
    }

    else if (this.currentRound === 10) {
        this.spawnBossRound10();
        return; // Stop the standard spawn process for this round
    }

     // Advance to the next round
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
    // 1. Check if the spawner has finished
    const spawningFinished = this.roundSpawnTimer === null;
    
    // 2. Check if all active enemies are gone
    const allEnemiesDestroyed = this.enemiesRemaining <= 0;

    if (spawningFinished && allEnemiesDestroyed) {
        // Stop repeat calls during the cooldown
        if (this.roundEndTimerActive) return; 
        
        // Activate the cooldown flag
        this.roundEndTimerActive = true; 

        if (this.currentRound == 10) {
            this.triggerVictory();
            return;
        }
        // All enemies for the round are gone!
        this.displayRoundInfo(`Vượt ải ${this.currentRound} thành công!`);

        // ⭐ START COOLDOWN SETUP ⭐
        const cooldownDuration = 15000; // 15 seconds
        
        // Calculate the exact time when the cooldown should end
        this.cooldownEndTime = this.time.now + cooldownDuration;
        
        // Show the countdown HUD
        this.nextRoundTimerText.setVisible(true);

        // Schedule the next round start after the delay
        this.time.delayedCall(cooldownDuration, this.startNextRound, [], this);
    }
}

spawnBossRound5() {
    this.roundSpawnTimer = null;
    // Gate X: 507, Gate Y: 385 (Correct center calculation)
    const bossX = 507;
    const bossY = 385;

    // ⭐ CRITICAL FIX: Use this.boss instead of const boss
    this.boss = this.physics.add.sprite(bossX, bossY, 'boss1').setDepth(1); 
    
    // Set boss properties
    this.boss.isBoss = true;
    this.boss.health = 500;
    this.boss.maxHealth = 500;
    this.boss.moneyDrop = 200;
    
    // Set the specific slow speed for the boss
    this.boss.speed = this.BOSS_SPEED;
    this.boss.setVelocityX(this.boss.speed); // Assuming you define this.BOSS_SPEED in create()
    this.boss.play('boss1-walk'); 
    this.boss.setScale(0.5);
    this.boss.setCollideWorldBounds(true); 

    // Create and attach health bar (make sure to update the boss's HP display if using this)
    this.bossHealthBar = this.add.text(bossX, bossY - 100, `TRIỆU ĐÀ: ${this.boss.health}`, {
        fontFamily: 'monospace', fontSize: '24px', color: '#ff0000'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500);

    // ⭐ Add the scene property boss to the enemy group
    if (this.enemies) { 
        this.enemies.add(this.boss);
    } 

    this.enemiesRemaining = 1;
}
spawnBossRound10() {
    this.roundSpawnTimer = null;
    // Gate X: 507, Gate Y: 385 (Correct center calculation)
    const bossX = 507;
    const bossY = 385;

    // ⭐ CRITICAL FIX: Use this.boss instead of const boss
    this.boss = this.physics.add.sprite(bossX, bossY, 'boss2').setDepth(1); 
    
    // Set boss properties
    this.boss.isBoss = true;
    this.boss.health = 1000;
    this.boss.maxHealth = 1000;
    this.boss.moneyDrop = 200;
    
    // Set the specific slow speed for the boss
    this.boss.speed = this.BOSS_SPEED;
    this.boss.setVelocityX(this.boss.speed); // Assuming you define this.BOSS_SPEED in create()
    this.boss.play('boss2-walk'); 
    this.boss.setScale(0.5);
    this.boss.setCollideWorldBounds(true); 

    // Create and attach health bar (make sure to update the boss's HP display if using this)
    this.bossHealthBar = this.add.text(bossX, bossY - 100, `BẠCH HỔ: ${this.boss.health}`, {
        fontFamily: 'monospace', fontSize: '24px', color: '#ff0000'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500);

    // ⭐ Add the scene property boss to the enemy group
    if (this.enemies) { 
        this.enemies.add(this.boss);
    } 

    this.enemiesRemaining = 1;
}

    restartGame() {
      this.scene.restart();
    }

    startGame() {
        
        // 1. CLEAN UP THE INTRO/LOADING UI
        this.responseText.destroy();
        this.background.destroy();
        this.startButton.destroy(); 
        
        // 2. Initial game setup (e.g., creating the player sprite, map assets)
        // ... (Place your unique 'first time' game setup here) ...

        // 3. Delegate to the reusable round start function
        this.startNextRound();
    }

    refreshHUD() {
    if (this.gameOver) return;
    this.hud.setText(
        `Máu: ${this.player.health}/${this.player.maxHealth}\n` +
        `Sát Thương: ${this.player.attackDamage}\n` +   
        `Công Trạng: ${this.money}\n` +
        `Vòng: ${this.currentRound}/${this.maxRounds}\n` +
        `Địch còn lại: ${this.enemiesRemaining}`
    );
}   
    triggerVictory() {
        this.gameOver = true;
        this.player.setVelocity(0, 0);
        this.hud.setText('');
        this.VictoryText.setVisible(true);
        this.restartText.setVisible(true);
        if (this.stepSfx) this.stepSfx.stop();
    }
    triggerGameOver() {
      this.gameOver = true;
      this.player.setVelocity(0, 0);
      this.hud.setText('');
      this.gameOverText.setVisible(true);
      this.restartText.setVisible(true);
      if (this.stepSfx) this.stepSfx.stop();
if (this.stepSfx) this.stepSfx.destroy();

    }
    performAttack(currentTime) {
    // 1. Set cooldown
    this.nextAttackTime = currentTime + this.attackCooldown;
    // Check player's facing direction and play the corresponding animation
    if (this.player.facing === 'left') {
        this.player.anims.play('attack-left', true);
    } else if (this.player.facing === 'right') {
        this.player.anims.play('attack-right', true);
    }
    // NOTE: You may want to add 'attack-up' and 'attack-down' here if they exist.
    
    // 3. Define Hitbox Parameters
    let hitboxX = this.player.x;
    let hitboxY = this.player.y;
    let hitboxW = 40;
    let hitboxH = 40;
    
    // Define a rotation variable for the visual effect
    let visualRotation = 0; // Default to 0 (right/left)
    
    // 4. Position the Hitbox based on player.facing
    switch (this.player.facing) {
      case 'up':
        hitboxY -= 30;
        visualRotation = Phaser.Math.DegToRad(-90); // -90 degrees (or 270)
        break;
      case 'down':
        hitboxY += 30;
        visualRotation = Phaser.Math.DegToRad(90); // 90 degrees
        break;
      case 'left':
        hitboxX -= 30;
        break;
      case 'right':
        hitboxX += 30;
        break;
      default:
    }
    
    // --- START NEW VISUAL EFFECT LOGIC ---
    
    // 5. Create the VISIBLE visual effect (replaces the pink rectangle)
    // We'll use a placeholder URL for the asset key 'attack-visual' here.
    const attackVisual = this.add.image(hitboxX, hitboxY, 'attack-visual').setScale(0.8);
    attackVisual.setDepth(1); // Ensure it draws above the player/enemies
    
    // 🔥 NEW: Apply the determined rotation to the visual element
    attackVisual.setRotation(visualRotation);
    
    // 6. Create the INVISIBLE Physics Rectangle for collision
    // This is the functional part that triggers damage, now completely transparent.
    const hitbox = this.add.rectangle(hitboxX, hitboxY, hitboxW, hitboxH).setAlpha(0);
    
    // 7. Apply Physics and Add to Group (Hitbox is the functional element)
    this.physics.add.existing(hitbox);
    this.attackHitboxes.add(hitbox);
    
    hitbox.body.setAllowGravity(false);
    hitbox.body.setImmovable(true); 
    hitbox.body.moves = false;
    
    // 8. Destroy BOTH the visual effect and the invisible physics hitbox after 50ms
    this.time.delayedCall(50, () => {
        hitbox.destroy();
        attackVisual.destroy(); // Destroy the visual element
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

  buyItem(item) {
    if (!this.shopUI.visible) return; // Prevent buying if shop is closed

    if (this.money >= item.price) {
        // 1. Deduct cost
        this.money -= item.price;
        
        if (this.buySfx) {
            this.buySfx.play();
        }
        // 2. Apply effect
        item.effect(this.player);

        // 3. Update UI feedback
        this.moneyText.setText(`Công Trạng: ${this.money}`);
        
        // Optional: Add a temporary success message
        const successMessage = this.add.text(0, 0, `Đã mua ${item.name}!`, { 
            fontFamily: 'monospace', fontSize: '24px', color: '#27ae60' 
        }).setOrigin(0.5).setDepth(601);
        this.refreshHUD();
        this.shopUI.add(successMessage);
        
        this.tweens.add({
            targets: successMessage,
            alpha: 0,
            y: successMessage.y - 20,
            duration: 1000,
            onComplete: () => {
                successMessage.destroy();
            }
        });

    } else {
        if (this.buyFailSfx) {
            this.buyFailSfx.play();
        }
        // Display insufficient funds message
        const errorText = this.add.text(0, 90, 'Không đủ tiền!', {
            fontFamily: 'monospace', fontSize: '24px', color: '#e74c3c'
        }).setOrigin(0.5).setDepth(601);
        this.shopUI.add(errorText);
        
        this.time.delayedCall(1000, () => {
            errorText.destroy();
        });
    }
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
    this.moneyText.setText(`Tiền: ${this.money}`);
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

    startLoadingAndFetch() {
        const lambdaUrl = 'https://wgg7a238d3.execute-api.ap-southeast-2.amazonaws.com/default/AI-generated-hint-phaser-3'; 
        this.responseText.setText('Đang tải hướng dẫn từ AI...');

         this.loadingTween = this.tweens.add({
            targets: this.responseText,
            alpha: 0.3, // Fade to 30% opacity
            duration: 800, // Duration of one fade cycle in ms
            ease: 'Sine.easeInOut',
            yoyo: true, // Go back and forth (pulse)
            repeat: -1 // Repeat forever
        });

        this.fetchDataAndHandleResponse(lambdaUrl);
    }

    // --- FUNCTION 2: Handles the async call and flow control ---
    async fetchDataAndHandleResponse(lambdaUrl) {
        let newTextContent = 'LỖI KẾT NỐI:\nKhông thể nhận hướng dẫn.';
        let isError = false;

        try {
            const response = await fetch(lambdaUrl, { method: 'GET' });

            if (!response.ok) {
                const errorDetail = await response.text(); 
                throw new Error(`HTTP error! Status: ${response.status}. Detail: ${errorDetail}`);
            }

            newTextContent = await response.text();
            newTextContent = newTextContent.replace(/(\*\*|")/g, '');
    
    
            newTextContent = newTextContent.replace(/\\n/g, '\n'); 
        } catch (error) {
            console.error("Lỗi khi tải", error);
            isError = true;
        }
        
        if (this.loadingTween) {
        this.loadingTween.stop();
        this.responseText.setAlpha(1); // Ensure text is fully visible
    }
        // --- Flow Control: Runs AFTER the API call completes or fails ---

        // 1. Finalize the main response text
        this.responseText.setText(isError ? newTextContent : '' + newTextContent);
        this.responseText.setColor(isError ? '#ffffffff' : '#ffffff'); 

        // 2. Resize the background to fit the final text
        const bounds = this.responseText.getBounds();
        this.background.setSize(bounds.width + 20, bounds.height + 20);
        
        // 3. Position the button immediately below the response text
        // Set its new position based on the final text height
        this.startButton.setPosition(
            bounds.x, 
            bounds.bottom + 10 // 10 pixels of padding below the text
        );
        
        // 4. Show the button! (The player can now click it)
        this.startButton.setVisible(true);
        this.background.height += this.startButton.height + 10; // Expand background to cover button area
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
