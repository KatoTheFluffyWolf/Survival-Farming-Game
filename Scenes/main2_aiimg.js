(() => {
  'use strict';

  const TILE = 32;
  const GRID_W = 32 ;
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
      

      
      this.load.spritesheet('farmer','assets/giong_spritesheet.png',{ frameWidth:94 , frameHeight:293 });    
      this.load.audio('step',['assets/step.mp3']);
      this.load.image('citadel', 'assets/Hue_Citadel.png'); 

      // Water overlay
      const w = this.add.graphics();
      w.fillStyle(0x0000ff, 0.3);
      w.fillRect(0, 0, TILE, TILE);
      w.generateTexture('tile-watered', TILE, TILE);
      w.destroy();
    }

    create() {
      this.add.image(0, 0, 'citadel').setOrigin(0);
      

      // Farmer
      // this.farmer = this.physics.add.image(GAME_W / 2, GAME_H / 2, 'farmer');
      this.farmer = this.physics.add.sprite(GAME_W / 2, GAME_H / 2, 'farmer');
      this.farmer.setBounce(0.2);
      this.farmer.setCollideWorldBounds(true);
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

      // Growth timer
      this.growthTimer += delta;
      if (this.growthTimer >= 5000) {
        this.advanceGrowth();
        this.growthTimer = 0;
      }
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
    
    eatWheat() {
      if (this.gameOver) return;
      if (this.inventory.wheat > 0 && this.energy < 100) {
        this.inventory.wheat -= 1;
        this.changeEnergy(+15);
      }
    }

    advanceGrowth() {
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const tile = this.grid[y][x];
          if (tile.crop && tile.crop.watered && tile.crop.stage < 3) {
            tile.crop.stage++;
            tile.crop.beginFrame += 2;
            tile.crop.watered = false;
            this.crops[y][x].setTexture('wheat', tile.crop.beginFrame);
            this.waterOverlays[y][x].setVisible(false);
          }
        }
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
