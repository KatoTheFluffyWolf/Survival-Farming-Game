(() => {
  'use strict';

  const TILE = 32;
  const GRID_W = 20;
  const GRID_H = 15;
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
      // this.currentTool = 'hoe';
      this.hud = null;
      this.coordText = null;

      // this.inventory = { wheat: 0 };
      // this.energy = 2;
      // this.day = 1;
      // this.growthTimer = 0;
      // this.gameOver = false;

      // this.bedTile = { x: 3, y: 3 }; // top-left corner bed
      this.house = { x1: 3, x2: 5, y1: 3, y2: 5 };
    }

    init() {
      this.inventory = { wheat: 0 };
      this.energy = 100;      // reset to full
      this.day = 1;           // reset day
      this.growthTimer = 0;
      this.gameOver = false;
      this.currentTool = 'hoe';

    }

    preload() {
      // Ground tile
      const g = this.add.graphics();
      g.fillStyle(0x2d6a4f, 1);
      g.fillRect(0, 0, TILE, TILE);
      g.fillStyle(0x3a7f5b, 1);
      for (let i = 0; i < 10; i++) {
        g.fillRect(Phaser.Math.Between(0, TILE - 1), Phaser.Math.Between(0, TILE - 1), 1, 1);
      }
      g.generateTexture('tile-ground', TILE, TILE);
      g.clear();

      // Tilled tile
      g.fillStyle(0x4b3621, 1);
      g.fillRect(0, 0, TILE, TILE);
      g.lineStyle(1, 0x000000, 0.25);
      g.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
      g.generateTexture('tile-tilled', TILE, TILE);
      g.clear();

      // Bed tile
      g.fillStyle(0x4444aa, 1);
      g.fillRect(0, 0, TILE, TILE);
      g.lineStyle(2, 0xffffff, 1);
      g.strokeRect(2, 2, TILE - 4, TILE - 4);
      g.generateTexture('tile-bed', TILE, TILE);
      g.clear();

      // Farmer
      // const s = this.add.graphics();
      // s.fillStyle(0xe6c229, 1);
      // s.fillRoundedRect(0, 0, 24, 24, 4);
      // s.lineStyle(2, 0x333333, 1);
      // s.strokeRoundedRect(1, 1, 22, 22, 4);
      // s.generateTexture('farmer', 24, 24);
      // s.destroy();
      this.load.spritesheet('farmer', '../assets/farmer_spritesheet.png', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('house', '../assets/House_free.png', { frameWidth: 80, frameHeight: 128 });
      this.load.audio('step', ['../assets/step.mp3']);


      // Crop textures (4 stages)
      // const stages = [
      //   { color: 0x00ff00, size: 12 },
      //   { color: 0x55aa00, size: 16 },
      //   { color: 0xaaaa00, size: 20 },
      //   { color: 0xffdd00, size: 24 } // mature
      // ];
      // stages.forEach((st, i) => {
      //   const c = this.add.graphics();
      //   c.fillStyle(st.color, 1);
      //   c.fillRect(0, 0, st.size, st.size);
      //   c.generateTexture(`crop-wheat-${i}`, st.size, st.size);
      //   c.destroy();
      // });
      this.load.spritesheet('wheat', '../assets/wheat.png', {
        frameWidth: 16,   // <- set to your frame width
        frameHeight: 32   // <- set to your frame height
      });

      // Water overlay
      const w = this.add.graphics();
      w.fillStyle(0x0000ff, 0.3);
      w.fillRect(0, 0, TILE, TILE);
      w.generateTexture('tile-watered', TILE, TILE);
      w.destroy();
    }

    create() {
      this.grid = Array.from({ length: GRID_H }, (_, y) =>
        Array.from({ length: GRID_W }, (_, x) => ({
          type: (x >= this.house.x1 && x <= this.house.x2 &&
            y >= this.house.y1 && y <= this.house.y2)
            ? 'bed' : 'ground',
          crop: null
        }))
      );

      this.tiles = Array.from({ length: GRID_H }, () => Array(GRID_W));
      this.crops = Array.from({ length: GRID_H }, () => Array(GRID_W));
      this.waterOverlays = Array.from({ length: GRID_H }, () => Array(GRID_W));

      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          let texture = 'tile-ground';
          // if (this.grid[y][x].type != 'bed'){
          this.tiles[y][x] = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, texture);
          this.crops[y][x] = null;
          this.waterOverlays[y][x] = this.add.image(
            x * TILE + TILE / 2,
            y * TILE + TILE / 2,
            'tile-watered'
          ).setVisible(false);
        // }
        }
      }
      if (this.grid[3][3].type === 'bed'){
          this.tiles[3][3] = this.add.image(80*1.5,128/2*2,"house");
      }

      // Farmer
      // this.farmer = this.physics.add.image(GAME_W / 2, GAME_H / 2, 'farmer');
      this.farmer = this.physics.add.sprite(GAME_W / 2, GAME_H / 2, 'farmer');
      this.farmer.setBounce(0.2);
      this.farmer.setCollideWorldBounds(true);
      //  Our player animations, turning, walking left and walking right.
      this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('farmer', { start: 8, end: 11 }),
        frameRate: 10,
        repeat: -1
      });

      this.anims.create({
        key: 'up',
        frames: this.anims.generateFrameNumbers('farmer', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
      });

      this.anims.create({
        key: 'down',
        frames: this.anims.generateFrameNumbers('farmer', { start: 12, end: 15 }),
        frameRate: 10,
        repeat: -1
      });



      this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('farmer', { start: 4, end: 7 }),
        frameRate: 10,
        repeat: -1
      });

      // Input
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys('W,A,S,D,Z,ONE,TWO,THREE,ENTER');
      this.input.keyboard.on('keydown-SPACE', () => this.useTool());
      this.input.keyboard.on('keydown-Z', () => this.useTool());
      this.input.keyboard.on('keydown-ENTER', () => this.trySleep());
      this.input.keyboard.on('keydown-R', () => { if (this.gameOver) this.restartGame(); });
      this.input.keyboard.on('keydown-E', () => this.eatWheat());
      // Tool switching
      this.input.keyboard.on('keydown-ONE', () => { this.currentTool = 'hoe'; this.refreshHUD(); });
      this.input.keyboard.on('keydown-TWO', () => { this.currentTool = 'water'; this.refreshHUD(); });
      this.input.keyboard.on('keydown-THREE', () => { this.currentTool = 'hand'; this.refreshHUD(); });

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
        if (len) this.changeEnergy(-0.005 * delta); // movement drains slowly
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

    // --- Tools ---
    useTool() {
      if (this.energy <= 0 || this.gameOver) return; // too tired

      const tx = Math.floor(this.farmer.x / TILE);
      const ty = Math.floor(this.farmer.y / TILE);
      if (!this.inBounds(tx, ty)) return;

      const tile = this.grid[ty][tx];

      if (this.currentTool === 'hoe' && tile.type === 'ground') {
        tile.type = 'tilled';
        this.tiles[ty][tx].setTexture('tile-tilled');
        this.changeEnergy(-3);
      }

      if (this.currentTool === 'hand') {
        if (tile.type === 'tilled' && tile.crop === null) {
          tile.crop = { kind: 'wheat', stage: 0, watered: false, beginFrame: 1 };
          this.crops[ty][tx] = this.add.image(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 'wheat', tile.crop.beginFrame).setDepth(5);
          this.changeEnergy(-2);
        }
        else if (tile.crop && tile.crop.stage === 3) {
          tile.crop = null;
          this.crops[ty][tx].destroy();
          this.crops[ty][tx] = null;
          this.tiles[ty][tx].setTexture('tile-tilled');
          this.waterOverlays[ty][tx].setVisible(false);
          this.inventory.wheat += 1;
          this.changeEnergy(-2);

        }
      }

      if (this.currentTool === 'water') {
        if (tile.crop && !tile.crop.watered && tile.crop.stage < 3) {
          tile.crop.watered = true;
          this.waterOverlays[ty][tx].setVisible(true);
          this.changeEnergy(-2);
        }
      }
    }
    eatWheat() {
      if (this.gameOver) return;
      if (this.inventory.wheat > 0 && this.energy < 100) {
        this.inventory.wheat -= 1;
        this.changeEnergy(+15);
      }
    }
    trySleep() {
      if (this.gameOver) return;
      const tx = Math.floor(this.farmer.x / TILE);
      const ty = Math.floor(this.farmer.y / TILE);
      if (tx >= this.house.x1 && tx <= this.house.x2 &&
      ty >= this.house.y1 && ty <= this.house.y2) {
        this.day++;
        this.energy = 100;
        this.advanceGrowth(); // crops grow overnight too
        this.refreshHUD();
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
      let toolName = '';
      if (this.currentTool === 'hoe') toolName = 'Hoe';
      if (this.currentTool === 'hand') toolName = 'Hand (Plant/Harvest)';
      if (this.currentTool === 'water') toolName = 'Watering Can';
      this.hud.setText(
        `Day ${this.day}\nTool: ${toolName}\nEnergy: ${this.energy.toFixed(0)}\nWheat: ${this.inventory.wheat}`
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
