import Phaser from 'phaser';
import { playAlarm, playDing, playFix, playPaper, playStep } from '../audio';

/**
 * KitchenScene — the entire mini-game in one scene.
 *
 * Layout: 20x12 tile grid (16px tiles = 320x192 game area)
 * Equipment randomly breaks (fridge, hood, or grease trap).
 * Player walks over, interacts, agent runs, engineer arrives, receipt.
 */

const T = 16;
const COLS = 20;
const ROWS = 12;

const C = {
  floor: 0x2d2d3a,
  floorAlt: 0x33334a,
  wall: 0x4a4a5e,
  counter: 0x6b5b3e,
  fridge: 0x88aacc,
  hood: 0x7a8a9a,
  trap: 0x5a6a4a,
  alarm: 0xff4444,
  fixed: 0x44cc88,
  stove: 0x3a3a4a,
  door: 0x5a4a3a,
  player: 0xffcc44,
  engineer: 0x44aaff,
  mandate: 0x2a6f6a,
};

interface Equipment {
  key: string;
  label: string;
  col: number;
  row: number;
  color: number;
  receipt: string;
  cost: string;
}

const EQUIPMENT: Equipment[] = [
  { key: 'fridge', label: 'Commercial fridge', col: 16, row: 2, color: C.fridge, receipt: 'Commercial fridge repair', cost: '£420' },
  { key: 'hood', label: 'Extraction hood', col: 8, row: 1, color: C.hood, receipt: 'Extraction hood service', cost: '£380' },
  { key: 'trap', label: 'Grease trap', col: 3, row: 8, color: C.trap, receipt: 'Grease trap clean', cost: '£290' },
];

type GamePhase = 'idle' | 'alarm' | 'interacting' | 'agent' | 'arriving' | 'fixing' | 'done';

export class KitchenScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private target!: Phaser.GameObjects.Rectangle;
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
  private equipment!: Equipment;
  private stepTimer = 0;

  constructor() {
    super({ key: 'KitchenScene' });
  }

  create() {
    this.startTime = this.time.now;
    this.phase = 'idle';

    // Pick random equipment
    this.equipment = EQUIPMENT[Math.floor(Math.random() * EQUIPMENT.length)];

    this.buildKitchen();

    // Player
    this.player = this.add.rectangle(5 * T + 8, 6 * T + 8, 12, 12, C.player);
    this.player.setStrokeStyle(1, 0xffffff, 0.4);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setSize(12, 12);
    this.physics.add.collider(this.player, this.walls);

    // Target equipment
    const ex = this.equipment.col * T + 8;
    const ey = this.equipment.row * T + 8;
    this.target = this.add.rectangle(ex, ey, 14, 14, this.equipment.color);
    this.target.setStrokeStyle(1, 0xffffff, 0.3);

    // Label on equipment
    this.add.text(ex, ey + 10, this.equipment.key.charAt(0).toUpperCase(), {
      fontSize: '6px', color: '#ffffff88',
    }).setOrigin(0.5);

    // Alarm icon
    this.alarmIcon = this.add.text(ex - 4, ey - 12, '!', {
      fontSize: '12px', color: '#ff4444', fontStyle: 'bold',
    }).setVisible(false);

    // Interact hint
    this.interactHint = this.add.text(160, 185, '', {
      fontSize: '8px', color: '#ffffff', backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setVisible(false);

    // Engineer
    this.engineer = this.add.rectangle(10 * T + 8, 11 * T + 8, 12, 12, C.engineer);
    this.engineer.setStrokeStyle(1, 0xffffff, 0.4);
    this.engineer.setVisible(false);

    // Agent overlay
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

    this.input.keyboard!.on('keydown-SPACE', () => this.tryInteract());

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const dist = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, this.target.x, this.target.y);
      if (dist < 28 && this.phase === 'alarm' && this.isNearTarget()) {
        this.tryInteract();
      } else {
        this.tapTarget = { x: pointer.worldX, y: pointer.worldY };
      }
    });

    // Trigger alarm after 3s
    this.time.delayedCall(3000, () => this.triggerAlarm());

    this.interactHint.setText(`${this.equipment.label} is about to break...`).setVisible(true);
    this.time.delayedCall(2500, () => {
      if (this.phase === 'idle') this.interactHint.setVisible(false);
    });

    // "Lofi" ambient: subtle moving NPCs
    this.addAmbientNPCs();
  }

  update(_time: number, delta: number) {
    if (this.phase === 'done' || this.phase === 'agent' || this.phase === 'arriving' || this.phase === 'fixing') {
      this.playerBody.setVelocity(0, 0);
      return;
    }

    const speed = 80;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = speed;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = speed;

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

    // Footstep sounds
    if (vx !== 0 || vy !== 0) {
      this.stepTimer += delta;
      if (this.stepTimer > 300) {
        this.stepTimer = 0;
        playStep();
      }
    } else {
      this.stepTimer = 200; // ready to play on next move
    }

    if (this.phase === 'alarm' && this.isNearTarget()) {
      this.interactHint.setText('SPACE / tap').setVisible(true);
    } else if (this.phase === 'alarm') {
      this.interactHint.setText(`Walk to the ${this.equipment.key}`).setVisible(true);
    }
  }

  private isNearTarget(): boolean {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, this.target.x, this.target.y) < 30;
  }

  private buildKitchen() {
    this.walls = this.physics.add.staticGroup();

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = col * T + T / 2;
        const y = row * T + T / 2;

        if (row === 0 || col === 0 || col === COLS - 1) {
          const wall = this.add.rectangle(x, y, T, T, C.wall);
          this.walls.add(wall);
          continue;
        }

        if (row === ROWS - 1) {
          if (col >= 9 && col <= 11) {
            this.add.rectangle(x, y, T, T, C.door);
          } else {
            const wall = this.add.rectangle(x, y, T, T, C.wall);
            this.walls.add(wall);
          }
          continue;
        }

        if (row === 1 && col >= 2 && col <= 13) {
          const counter = this.add.rectangle(x, y, T, T, C.counter);
          this.walls.add(counter);
          continue;
        }

        if (row >= 3 && row <= 4 && col === 1) {
          const stove = this.add.rectangle(x, y, T, T, C.stove);
          this.walls.add(stove);
          continue;
        }

        const isAlt = (row + col) % 2 === 0;
        this.add.rectangle(x, y, T, T, isAlt ? C.floor : C.floorAlt);
      }
    }
  }

  private addAmbientNPCs() {
    // Two "kitchen staff" NPCs that pace around
    const npc1 = this.add.rectangle(12 * T + 8, 5 * T + 8, 10, 10, 0xaa8866);
    npc1.setStrokeStyle(1, 0xffffff, 0.2);
    this.tweens.add({
      targets: npc1,
      x: 12 * T + 8,
      y: 8 * T + 8,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const npc2 = this.add.rectangle(7 * T + 8, 4 * T + 8, 10, 10, 0xaa8866);
    npc2.setStrokeStyle(1, 0xffffff, 0.2);
    this.tweens.add({
      targets: npc2,
      x: 14 * T + 8,
      duration: 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private triggerAlarm() {
    if (this.phase !== 'idle') return;
    this.phase = 'alarm';

    playAlarm();

    this.target.setFillStyle(C.alarm);
    this.target.setStrokeStyle(2, 0xff0000, 0.8);
    this.alarmIcon.setVisible(true);

    this.tweens.add({
      targets: this.alarmIcon,
      alpha: { from: 1, to: 0.3 },
      duration: 400,
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: this.target,
      scaleX: { from: 1, to: 1.15 },
      scaleY: { from: 1, to: 1.15 },
      duration: 300,
      yoyo: true,
      repeat: -1,
    });

    this.interactHint.setText(`! ${this.equipment.label} is down`).setVisible(true);
  }

  private tryInteract() {
    if (this.phase !== 'alarm') return;
    if (!this.isNearTarget()) return;

    this.phase = 'interacting';
    this.interactHint.setVisible(false);
    this.tweens.killTweensOf(this.target);
    this.tweens.killTweensOf(this.alarmIcon);
    this.target.setScale(1);

    this.time.delayedCall(300, () => this.runAgentSequence());
  }

  private runAgentSequence() {
    this.phase = 'agent';

    const overlay = this.add.rectangle(160, 96, 320, 192, 0x000000, 0.7);
    overlay.setDepth(10);

    this.agentOverlay.setDepth(11);
    this.agentOverlay.setVisible(true);
    this.agentOverlay.removeAll(true);

    const panel = this.add.rectangle(0, 0, 220, 110, 0x12212b, 0.95);
    panel.setStrokeStyle(1, C.mandate, 0.6);
    this.agentOverlay.add(panel);

    const title = this.add.text(0, -42, 'YALER AGENT', {
      fontSize: '8px', color: '#2a6f6a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.agentOverlay.add(title);

    const steps = [
      { text: `Searching N1 for ${this.equipment.key} engineers...`, delay: 0 },
      { text: '3 quotes received', delay: 1200 },
      { text: `Budget check: ${this.equipment.cost} < £500 ✓`, delay: 2400 },
      { text: 'Booked: London Rapid ColdCare', delay: 3600 },
      { text: 'Engineer dispatched', delay: 4800 },
    ];

    steps.forEach((step, idx) => {
      this.time.delayedCall(step.delay, () => {
        if (this.phase !== 'agent') return;

        // Dim previous
        this.agentOverlay.each((child: Phaser.GameObjects.GameObject) => {
          if (child !== panel && child !== title && child.type === 'Text') {
            (child as Phaser.GameObjects.Text).setColor('#4a5568');
          }
        });

        const isCheck = idx === 2;
        const isFinal = idx === steps.length - 1;
        const color = isCheck ? '#44cc88' : isFinal ? '#44aaff' : '#ffffff';
        const prefix = isFinal ? '→' : isCheck ? '✓' : '●';

        const stepText = this.add.text(-100, -22 + idx * 13, `${prefix} ${step.text}`, {
          fontSize: '7px', color,
        });
        this.agentOverlay.add(stepText);

        if (isCheck) playDing();
      });
    });

    this.time.delayedCall(5800, () => {
      this.agentOverlay.setVisible(false);
      overlay.destroy();
      this.dispatchEngineer();
    });
  }

  private dispatchEngineer() {
    this.phase = 'arriving';
    this.engineer.setVisible(true);
    this.engineer.setPosition(10 * T + 8, 11 * T - 4);

    this.interactHint.setText('Engineer arriving...').setVisible(true);

    this.tweens.add({
      targets: this.engineer,
      x: this.target.x,
      y: this.target.y + T,
      duration: 1800,
      ease: 'Sine.easeInOut',
      onComplete: () => this.fixEquipment(),
    });
  }

  private fixEquipment() {
    this.phase = 'fixing';
    this.interactHint.setText('Fixing...').setVisible(true);

    playFix();

    this.tweens.add({
      targets: this.engineer,
      alpha: { from: 1, to: 0.4 },
      duration: 180,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.target.setFillStyle(C.fixed);
        this.target.setStrokeStyle(2, 0x44cc88, 0.8);
        this.alarmIcon.setText('✓').setColor('#44cc88');
        this.tweens.killTweensOf(this.alarmIcon);
        this.alarmIcon.setAlpha(1);

        playDing();
        this.time.delayedCall(500, () => this.showReceipt());
      },
    });
  }

  private showReceipt() {
    this.phase = 'done';
    const elapsed = ((this.time.now - this.startTime) / 1000).toFixed(0);

    playPaper();
    this.interactHint.setVisible(false);

    const receiptBg = this.add.rectangle(160, 96, 240, 130, 0xfafaf8, 0.97);
    receiptBg.setStrokeStyle(1, 0x2a6f6a, 0.4);
    receiptBg.setDepth(20);

    const elements: Phaser.GameObjects.Text[] = [];

    elements.push(this.add.text(160, 44, 'VERIFIED RECEIPT', {
      fontSize: '7px', color: '#2a6f6a', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21));

    elements.push(this.add.text(160, 58, this.equipment.receipt + ' — N1', {
      fontSize: '8px', color: '#12212b',
    }).setOrigin(0.5).setDepth(21));

    elements.push(this.add.text(160, 73, `${this.equipment.cost} · London Rapid ColdCare`, {
      fontSize: '7px', color: '#555555',
    }).setOrigin(0.5).setDepth(21));

    elements.push(this.add.text(160, 88, '✓ Photo verified   ✓ In budget   ✓ On time', {
      fontSize: '6px', color: '#2a6f6a',
    }).setOrigin(0.5).setDepth(21));

    elements.push(this.add.text(160, 108, `You: ${elapsed}s   Manual: ~4 hours`, {
      fontSize: '9px', color: '#12212b', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21));

    elements.push(this.add.text(160, 125, 'That\'s what Yaler does. Try the real thing →', {
      fontSize: '7px', color: '#2a6f6a', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21));

    // Animate receipt sliding in from below
    receiptBg.setAlpha(0);
    receiptBg.y = 130;
    this.tweens.add({
      targets: receiptBg,
      alpha: 0.97,
      y: 96,
      duration: 400,
      ease: 'Back.easeOut',
    });

    elements.forEach((el, i) => {
      el.setAlpha(0);
      this.tweens.add({
        targets: el,
        alpha: 1,
        duration: 300,
        delay: 300 + i * 100,
        ease: 'Power2',
      });
    });

    // Dispatch completion event
    this.time.delayedCall(2000, () => {
      window.dispatchEvent(new CustomEvent('yaler:game-complete', {
        detail: { elapsed: Number(elapsed), equipment: this.equipment.key },
      }));
    });
  }
}
