import Phaser from 'phaser';

/**
 * KitchenScene — the entire mini-game in one scene.
 *
 * Layout: 20x12 tile grid (16px tiles = 320x192 game area)
 * Player: kitchen manager (yellow square sprite)
 * Fridge: breaks after 3s, player interacts, agent runs, engineer arrives
 */

// Tile size
const T = 16;
// Grid dimensions
const COLS = 20;
const ROWS = 12;

// Colors for procedural tiles
const C = {
  floor: 0x2d2d3a,
  floorAlt: 0x33334a,
  wall: 0x4a4a5e,
  counter: 0x6b5b3e,
  fridge: 0x88aacc,
  fridgeAlarm: 0xff4444,
  fridgeFixed: 0x44cc88,
  stove: 0x3a3a4a,
  door: 0x5a4a3a,
  player: 0xffcc44,
  engineer: 0x44aaff,
  mandate: 0x2a6f6a,
};

type GamePhase = 'idle' | 'alarm' | 'interacting' | 'agent' | 'arriving' | 'fixing' | 'done';

export class KitchenScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private fridge!: Phaser.GameObjects.Rectangle;
  private fridgeZone!: Phaser.GameObjects.Zone;
  private engineer!: Phaser.GameObjects.Rectangle;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private phase: GamePhase = 'idle';
  private agentOverlay!: Phaser.GameObjects.Container;
  private interactHint!: Phaser.GameObjects.Text;
  private alarmIcon!: Phaser.GameObjects.Text;
  private tapTarget: { x: number; y: number } | null = null;
  private startTime = 0;

  constructor() {
    super({ key: 'KitchenScene' });
  }

  create() {
    this.startTime = this.time.now;
    this.phase = 'idle';

    // Build the kitchen
    this.buildKitchen();

    // Player
    this.player = this.add.rectangle(5 * T + 8, 6 * T + 8, 12, 12, C.player);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setSize(12, 12);

    // Collision with walls
    this.physics.add.collider(this.player, this.walls);

    // Fridge (top-right area)
    this.fridge = this.add.rectangle(16 * T + 8, 2 * T + 8, 14, 14, C.fridge);
    this.fridge.setStrokeStyle(1, 0xffffff, 0.3);

    // Interaction zone around fridge
    this.fridgeZone = this.add.zone(16 * T + 8, 2 * T + 8, 32, 32);
    this.physics.add.existing(this.fridgeZone, true);

    // Alarm icon (hidden initially)
    this.alarmIcon = this.add.text(16 * T + 4, 1 * T, '!', {
      fontSize: '12px',
      color: '#ff4444',
      fontStyle: 'bold',
    }).setVisible(false);

    // Interact hint
    this.interactHint = this.add.text(160, 185, '', {
      fontSize: '8px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setVisible(false);

    // Engineer (hidden initially, spawns at door)
    this.engineer = this.add.rectangle(10 * T + 8, 11 * T + 8, 12, 12, C.engineer);
    this.engineer.setVisible(false);

    // Agent overlay container (hidden initially)
    this.agentOverlay = this.add.container(160, 96);
    this.agentOverlay.setVisible(false);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Space to interact
    this.input.keyboard!.on('keydown-SPACE', () => this.tryInteract());

    // Tap to move / interact (mobile)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // If near fridge and in alarm phase, interact
      const dist = Phaser.Math.Distance.Between(
        pointer.worldX, pointer.worldY,
        this.fridge.x, this.fridge.y,
      );
      if (dist < 24 && this.phase === 'alarm' && this.isNearFridge()) {
        this.tryInteract();
      } else {
        this.tapTarget = { x: pointer.worldX, y: pointer.worldY };
      }
    });

    // Trigger fridge alarm after 3 seconds
    this.time.delayedCall(3000, () => this.triggerAlarm());

    // Initial hint
    this.interactHint.setText('The fridge is about to break...').setVisible(true);
    this.time.delayedCall(2500, () => {
      if (this.phase === 'idle') this.interactHint.setVisible(false);
    });
  }

  update() {
    if (this.phase === 'done' || this.phase === 'agent' || this.phase === 'arriving' || this.phase === 'fixing') {
      this.playerBody.setVelocity(0, 0);
      return;
    }

    // Movement
    const speed = 80;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = speed;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = speed;

    // Tap-to-move
    if (vx === 0 && vy === 0 && this.tapTarget) {
      const dx = this.tapTarget.x - this.player.x;
      const dy = this.tapTarget.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 4) {
        this.tapTarget = null;
      } else {
        vx = (dx / dist) * speed;
        vy = (dy / dist) * speed;
      }
    }

    this.playerBody.setVelocity(vx, vy);

    // Show interact hint when near fridge during alarm
    if (this.phase === 'alarm' && this.isNearFridge()) {
      this.interactHint.setText('SPACE / tap to interact').setVisible(true);
    } else if (this.phase === 'alarm') {
      this.interactHint.setText('Walk to the fridge →').setVisible(true);
    }
  }

  private isNearFridge(): boolean {
    return Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.fridge.x, this.fridge.y,
    ) < 28;
  }

  private buildKitchen() {
    this.walls = this.physics.add.staticGroup();

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = col * T + T / 2;
        const y = row * T + T / 2;

        // Walls (perimeter + back counter)
        if (row === 0 || col === 0 || col === COLS - 1) {
          const wall = this.add.rectangle(x, y, T, T, C.wall);
          this.walls.add(wall);
          continue;
        }

        // Bottom wall with door gap
        if (row === ROWS - 1) {
          if (col >= 9 && col <= 11) {
            // Door
            this.add.rectangle(x, y, T, T, C.door);
          } else {
            const wall = this.add.rectangle(x, y, T, T, C.wall);
            this.walls.add(wall);
          }
          continue;
        }

        // Counter along top wall
        if (row === 1 && col >= 2 && col <= 13) {
          const counter = this.add.rectangle(x, y, T, T, C.counter);
          this.walls.add(counter);
          continue;
        }

        // Stove (left side)
        if (row >= 3 && row <= 4 && col === 1) {
          this.add.rectangle(x, y, T, T, C.stove);
          continue;
        }

        // Chequered floor
        const isAlt = (row + col) % 2 === 0;
        this.add.rectangle(x, y, T, T, isAlt ? C.floor : C.floorAlt);
      }
    }
  }

  private triggerAlarm() {
    if (this.phase !== 'idle') return;
    this.phase = 'alarm';

    // Fridge turns red
    this.fridge.setFillStyle(C.fridgeAlarm);
    this.fridge.setStrokeStyle(2, 0xff0000, 0.8);
    this.alarmIcon.setVisible(true);

    // Pulse animation
    this.tweens.add({
      targets: this.alarmIcon,
      alpha: { from: 1, to: 0.3 },
      duration: 400,
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: this.fridge,
      scaleX: { from: 1, to: 1.1 },
      scaleY: { from: 1, to: 1.1 },
      duration: 300,
      yoyo: true,
      repeat: -1,
    });

    this.interactHint.setText('! Fridge is down — walk over').setVisible(true);
  }

  private tryInteract() {
    if (this.phase !== 'alarm') return;
    if (!this.isNearFridge()) return;

    this.phase = 'interacting';
    this.interactHint.setVisible(false);
    this.tweens.killTweensOf(this.fridge);
    this.tweens.killTweensOf(this.alarmIcon);
    this.fridge.setScale(1);

    // Start agent sequence
    this.time.delayedCall(300, () => this.runAgentSequence());
  }

  private runAgentSequence() {
    this.phase = 'agent';

    // Dark overlay
    const overlay = this.add.rectangle(160, 96, 320, 192, 0x000000, 0.6);
    overlay.setDepth(10);

    this.agentOverlay.setDepth(11);
    this.agentOverlay.setVisible(true);
    this.agentOverlay.removeAll(true);

    // Background panel
    const panel = this.add.rectangle(0, 0, 200, 100, 0x1a1a2e, 0.95);
    panel.setStrokeStyle(1, C.mandate, 0.8);
    this.agentOverlay.add(panel);

    // Title
    const title = this.add.text(0, -38, 'YALER AGENT', {
      fontSize: '8px',
      color: '#2a6f6a',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.agentOverlay.add(title);

    // Steps
    const steps = [
      { text: 'Searching N1 engineers...', delay: 0 },
      { text: '3 quotes received', delay: 1500 },
      { text: 'Budget check: £420 < £500 ✓', delay: 3000 },
      { text: 'Booked: London Rapid ColdCare', delay: 4500 },
      { text: 'Engineer dispatched →', delay: 6000 },
    ];

    steps.forEach((step, idx) => {
      this.time.delayedCall(step.delay, () => {
        if (this.phase !== 'agent') return;

        // Clear previous step highlights
        this.agentOverlay.each((child: Phaser.GameObjects.GameObject) => {
          if (child !== panel && child !== title && child.type === 'Text') {
            (child as Phaser.GameObjects.Text).setColor('#666688');
          }
        });

        const dot = idx < steps.length - 1 ? '●' : '→';
        const color = idx === 2 ? '#44cc88' : '#ffffff';
        const stepText = this.add.text(-90, -18 + idx * 14, `${dot} ${step.text}`, {
          fontSize: '7px',
          color,
        });
        this.agentOverlay.add(stepText);
      });
    });

    // After all steps, dispatch engineer
    this.time.delayedCall(7000, () => {
      this.agentOverlay.setVisible(false);
      overlay.destroy();
      this.dispatchEngineer();
    });
  }

  private dispatchEngineer() {
    this.phase = 'arriving';
    this.engineer.setVisible(true);
    this.engineer.setPosition(10 * T + 8, 11 * T + 8);

    // Walk to fridge
    this.tweens.add({
      targets: this.engineer,
      x: this.fridge.x,
      y: this.fridge.y + T,
      duration: 2000,
      ease: 'Linear',
      onComplete: () => this.fixFridge(),
    });

    this.interactHint.setText('Engineer arriving...').setVisible(true);
  }

  private fixFridge() {
    this.phase = 'fixing';
    this.interactHint.setText('Fixing...').setVisible(true);

    // Wrench animation (flash the engineer)
    this.tweens.add({
      targets: this.engineer,
      alpha: { from: 1, to: 0.5 },
      duration: 200,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        // Fridge fixed
        this.fridge.setFillStyle(C.fridgeFixed);
        this.fridge.setStrokeStyle(2, 0x44cc88, 0.8);
        this.alarmIcon.setText('✓').setColor('#44cc88');
        this.tweens.killTweensOf(this.alarmIcon);
        this.alarmIcon.setAlpha(1);

        this.showReceipt();
      },
    });
  }

  private showReceipt() {
    this.phase = 'done';
    const elapsed = ((this.time.now - this.startTime) / 1000).toFixed(0);

    this.interactHint.setVisible(false);

    // Receipt overlay
    const receiptBg = this.add.rectangle(160, 96, 220, 120, 0xffffff, 0.95);
    receiptBg.setStrokeStyle(1, 0x000000, 0.2);
    receiptBg.setDepth(20);

    const receiptTitle = this.add.text(160, 52, 'RECEIPT', {
      fontSize: '7px',
      color: '#2a6f6a',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    const receiptBody = this.add.text(160, 68, 'Commercial fridge repair — N1', {
      fontSize: '8px',
      color: '#12212b',
    }).setOrigin(0.5).setDepth(21);

    const receiptPrice = this.add.text(160, 82, '£420 · London Rapid ColdCare', {
      fontSize: '7px',
      color: '#555555',
    }).setOrigin(0.5).setDepth(21);

    const receiptCheck = this.add.text(160, 96, '✓ Photo verified  ✓ In budget  ✓ On time', {
      fontSize: '6px',
      color: '#2a6f6a',
    }).setOrigin(0.5).setDepth(21);

    const timeLabel = this.add.text(160, 115, `${elapsed} seconds. Last time: 4 hours.`, {
      fontSize: '8px',
      color: '#12212b',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    const cta = this.add.text(160, 133, '→ Try it with your real kitchen', {
      fontSize: '7px',
      color: '#2a6f6a',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    // Animate in
    const elements = [receiptBg, receiptTitle, receiptBody, receiptPrice, receiptCheck, timeLabel, cta];
    elements.forEach((el) => {
      el.setAlpha(0);
      this.tweens.add({
        targets: el,
        alpha: 1,
        duration: 400,
        delay: 200,
        ease: 'Power2',
      });
    });

    // Dispatch completion event after a beat
    this.time.delayedCall(1500, () => {
      window.dispatchEvent(new CustomEvent('yaler:game-complete'));
    });
  }
}
