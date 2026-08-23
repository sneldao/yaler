import Phaser from 'phaser';
import { playAlarm, playDing, playFix, playPaper, playStep } from '../audio';

/**
 * KitchenScene — Café Noor's morning shift.
 *
 * Three breakdowns happen across a 2-minute "shift":
 * 1. Fridge (in-budget, auto-resolved)
 * 2. Extraction hood (over-budget, player must approve/reject)
 * 3. Gas line (regulated category, policy blocks, agent escalates)
 *
 * The game demonstrates the full Yaler flow:
 * discovery → offers → budget check → approval → reroute → escalation → receipt
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
  gasline: 0xcc8844,
  alarm: 0xff4444,
  fixed: 0x44cc88,
  stove: 0x3a3a4a,
  door: 0x5a4a3a,
  player: 0xffcc44,
  engineer: 0x44aaff,
  mandate: 0x2a6f6a,
  escalate: 0xc45c26,
};

interface BreakdownEvent {
  key: string;
  label: string;
  col: number;
  row: number;
  color: number;
  cost: number;
  budget: number;
  type: 'auto' | 'approval' | 'escalation';
  agentSteps: string[];
  receipt: string;
}

const EVENTS: BreakdownEvent[] = [
  {
    key: 'fridge',
    label: 'Commercial fridge',
    col: 17, row: 2,
    color: C.fridge,
    cost: 420, budget: 500,
    type: 'auto',
    agentSteps: [
      'Searching N1 fridge engineers...',
      '3 quotes received',
      'Budget: £420 < £500 ✓',
      'Booked: London Rapid ColdCare',
      'Engineer dispatched',
    ],
    receipt: 'Commercial fridge repair',
  },
  {
    key: 'hood',
    label: 'Extraction hood',
    col: 8, row: 1,
    color: C.hood,
    cost: 580, budget: 500,
    type: 'approval',
    agentSteps: [
      'Searching N1 hood specialists...',
      '2 quotes received',
      'Budget: £580 > £500 ✗',
      'OVER BUDGET — needs your approval',
    ],
    receipt: 'Extraction hood service',
  },
  {
    key: 'gas',
    label: 'Gas line',
    col: 3, row: 5,
    color: C.gasline,
    cost: 650, budget: 500,
    type: 'escalation',
    agentSteps: [
      'Searching N1 gas engineers...',
      'REGULATED CATEGORY: Gas Safety',
      'Policy engine: BLOCK',
      'Escalating to Gas Safe registered only',
      'Found: GasCert London (registered)',
    ],
    receipt: 'Gas line repair (Gas Safe)',
  },
];

type Phase = 'intro' | 'idle' | 'alarm' | 'walking' | 'agent' | 'decision' | 'arriving' | 'fixing' | 'transition' | 'summary';

export class KitchenScene extends Phaser.Scene {
  // Core objects
  private player!: Phaser.GameObjects.Rectangle;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private engineer!: Phaser.GameObjects.Rectangle;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;

  // State
  private phase: Phase = 'intro';
  private eventIdx = 0;
  private targets: Phaser.GameObjects.Rectangle[] = [];
  private alarmIcons: Phaser.GameObjects.Text[] = [];
  private tapTarget: { x: number; y: number } | null = null;
  private stepTimer = 0;
  private startTime = 0;
  private eventTimes: number[] = [];
  private decisions: string[] = [];
  private totalCost = 0;

  // UI
  private interactHint!: Phaser.GameObjects.Text;
  private shiftLabel!: Phaser.GameObjects.Text;
  private overlayContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'KitchenScene' });
  }

  create() {
    this.startTime = this.time.now;
    this.phase = 'intro';
    this.eventIdx = 0;
    this.eventTimes = [];
    this.decisions = [];
    this.totalCost = 0;

    this.buildKitchen();
    this.createPlayer();
    this.createEquipment();
    this.createEngineer();
    this.createUI();
    this.setupInput();
    this.addAmbientNPCs();

    // Intro crawl
    this.showIntro();
  }

  update(_time: number, delta: number) {
    if (this.phase !== 'idle' && this.phase !== 'alarm' && this.phase !== 'walking') {
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
      if (dist < 4) { this.tapTarget = null; }
      else { vx = (dx / dist) * speed; vy = (dy / dist) * speed; }
    }

    this.playerBody.setVelocity(vx, vy);

    // Footsteps
    if (vx !== 0 || vy !== 0) {
      this.stepTimer += delta;
      if (this.stepTimer > 320) { this.stepTimer = 0; playStep(); }
    } else {
      this.stepTimer = 250;
    }

    // Hint when near current target
    if (this.phase === 'alarm') {
      const evt = EVENTS[this.eventIdx];
      const target = this.targets[this.eventIdx];
      if (this.isNear(target)) {
        this.interactHint.setText('SPACE / tap').setVisible(true);
      } else {
        this.interactHint.setText(`→ ${evt.label}`).setVisible(true);
      }
    }
  }

  // ─── Setup ───────────────────────────────────────────────

  private createPlayer() {
    this.player = this.add.rectangle(5 * T + 8, 7 * T + 8, 12, 12, C.player);
    this.player.setStrokeStyle(1, 0xffffff, 0.5);
    this.player.setDepth(5);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setSize(12, 12);
    this.physics.add.collider(this.player, this.walls);
  }

  private createEquipment() {
    EVENTS.forEach((evt, idx) => {
      const x = evt.col * T + 8;
      const y = evt.row * T + 8;
      const rect = this.add.rectangle(x, y, 14, 14, evt.color);
      rect.setStrokeStyle(1, 0xffffff, 0.3);
      rect.setDepth(3);
      this.targets.push(rect);

      // Label
      this.add.text(x, y + 10, evt.key.charAt(0).toUpperCase(), {
        fontSize: '5px', color: '#ffffff66',
      }).setOrigin(0.5).setDepth(3);

      // Alarm icon (hidden)
      const icon = this.add.text(x - 4, y - 12, '!', {
        fontSize: '11px', color: '#ff4444', fontStyle: 'bold',
      }).setVisible(false).setDepth(6);
      this.alarmIcons.push(icon);
    });
  }

  private createEngineer() {
    this.engineer = this.add.rectangle(10 * T + 8, 11 * T, 12, 12, C.engineer);
    this.engineer.setStrokeStyle(1, 0xffffff, 0.4);
    this.engineer.setDepth(5);
    this.engineer.setVisible(false);
  }

  private createUI() {
    this.interactHint = this.add.text(160, 188, '', {
      fontSize: '7px', color: '#ffffff', backgroundColor: '#000000bb',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setVisible(false).setDepth(15);

    this.shiftLabel = this.add.text(4, 2, '', {
      fontSize: '6px', color: '#ffffff88',
    }).setDepth(15);

    this.overlayContainer = this.add.container(160, 96).setDepth(20).setVisible(false);
  }

  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.input.keyboard!.on('keydown-SPACE', () => this.tryInteract());

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.phase === 'decision') return; // decisions handled by buttons
      if (this.phase === 'alarm' && this.eventIdx < EVENTS.length) {
        const target = this.targets[this.eventIdx];
        const dist = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, target.x, target.y);
        if (dist < 28 && this.isNear(target)) {
          this.tryInteract();
          return;
        }
      }
      this.tapTarget = { x: pointer.worldX, y: pointer.worldY };
    });
  }

  // ─── Kitchen Layout ──────────────────────────────────────

  private buildKitchen() {
    this.walls = this.physics.add.staticGroup();

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = col * T + T / 2;
        const y = row * T + T / 2;

        if (row === 0 || col === 0 || col === COLS - 1) {
          this.walls.add(this.add.rectangle(x, y, T, T, C.wall));
          continue;
        }
        if (row === ROWS - 1) {
          if (col >= 9 && col <= 11) {
            this.add.rectangle(x, y, T, T, C.door);
          } else {
            this.walls.add(this.add.rectangle(x, y, T, T, C.wall));
          }
          continue;
        }
        // Top counter
        if (row === 1 && col >= 2 && col <= 6) {
          this.walls.add(this.add.rectangle(x, y, T, T, C.counter));
          continue;
        }
        // Stove area
        if (row === 1 && col >= 10 && col <= 13) {
          this.walls.add(this.add.rectangle(x, y, T, T, C.stove));
          continue;
        }
        // Island counter
        if (row === 5 && col >= 7 && col <= 12) {
          this.walls.add(this.add.rectangle(x, y, T, T, C.counter));
          continue;
        }

        const isAlt = (row + col) % 2 === 0;
        this.add.rectangle(x, y, T, T, isAlt ? C.floor : C.floorAlt);
      }
    }
  }

  private addAmbientNPCs() {
    const npc1 = this.add.rectangle(13 * T + 8, 3 * T + 8, 10, 10, 0xaa8866);
    npc1.setStrokeStyle(1, 0xffffff, 0.2).setDepth(4);
    this.tweens.add({ targets: npc1, y: 8 * T + 8, duration: 3500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const npc2 = this.add.rectangle(6 * T + 8, 9 * T + 8, 10, 10, 0xaa8866);
    npc2.setStrokeStyle(1, 0xffffff, 0.2).setDepth(4);
    this.tweens.add({ targets: npc2, x: 15 * T + 8, duration: 4500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ─── Intro ───────────────────────────────────────────────

  private showIntro() {
    const bg = this.add.rectangle(160, 96, 320, 192, 0x000000, 0.85).setDepth(30);
    const lines = [
      { text: 'CAFÉ NOOR — Dalston, N1', y: 50, size: '9px', color: '#2a6f6a', bold: true },
      { text: 'Tuesday, 6:47am', y: 68, size: '8px', color: '#ffffff', bold: false },
      { text: 'The breakfast rush starts in 13 minutes.', y: 82, size: '7px', color: '#ffffffaa', bold: false },
      { text: 'Three things are going to break today.', y: 100, size: '7px', color: '#ffffffaa', bold: false },
      { text: 'Walk to each one. Yaler handles the rest.', y: 114, size: '7px', color: '#ffffffaa', bold: false },
      { text: 'WASD / tap to move · Space / tap to interact', y: 138, size: '6px', color: '#ffffff55', bold: false },
      { text: 'tap anywhere to start', y: 158, size: '7px', color: '#2a6f6a', bold: true },
    ];

    const textObjs: Phaser.GameObjects.Text[] = [];
    lines.forEach((line, i) => {
      const t = this.add.text(160, line.y, line.text, {
        fontSize: line.size,
        color: line.color,
        fontStyle: line.bold ? 'bold' : 'normal',
      }).setOrigin(0.5).setDepth(31).setAlpha(0);
      textObjs.push(t);
      this.tweens.add({ targets: t, alpha: 1, duration: 400, delay: i * 200, ease: 'Power2' });
    });

    const startGame = () => {
      this.tweens.add({
        targets: [bg, ...textObjs],
        alpha: 0,
        duration: 300,
        onComplete: () => {
          bg.destroy();
          textObjs.forEach((t) => t.destroy());
          this.phase = 'idle';
          this.triggerNextEvent();
        },
      });
    };

    this.input.once('pointerdown', startGame);
    this.input.keyboard!.once('keydown-SPACE', startGame);
  }

  // ─── Event loop ──────────────────────────────────────────

  private triggerNextEvent() {
    if (this.eventIdx >= EVENTS.length) {
      this.showSummary();
      return;
    }

    const evt = EVENTS[this.eventIdx];
    this.shiftLabel.setText(`Shift: ${this.eventIdx + 1}/3 — ${evt.label}`);

    // Delay before alarm
    this.time.delayedCall(this.eventIdx === 0 ? 2000 : 1500, () => {
      this.triggerAlarm();
    });
  }

  private triggerAlarm() {
    this.phase = 'alarm';
    const evt = EVENTS[this.eventIdx];
    const target = this.targets[this.eventIdx];
    const icon = this.alarmIcons[this.eventIdx];

    playAlarm();

    target.setFillStyle(C.alarm);
    target.setStrokeStyle(2, 0xff0000, 0.8);
    icon.setVisible(true);

    this.tweens.add({ targets: icon, alpha: { from: 1, to: 0.3 }, duration: 400, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: target, scaleX: { from: 1, to: 1.15 }, scaleY: { from: 1, to: 1.15 }, duration: 300, yoyo: true, repeat: -1 });

    this.interactHint.setText(`! ${evt.label} is down`).setVisible(true);

    // Easter egg: AFK for 10s → Priya walks to the equipment
    this.time.delayedCall(10000, () => {
      if (this.phase !== 'alarm') return;
      const priya = this.add.rectangle(this.player.x + 20, this.player.y, 10, 10, 0xcc88aa);
      priya.setStrokeStyle(1, 0xffffff, 0.3).setDepth(5);
      const hint = this.add.text(priya.x - 2, priya.y - 12, '?', {
        fontSize: '10px', color: '#cc88aa', fontStyle: 'bold',
      }).setDepth(6);
      this.tweens.add({
        targets: [priya, hint],
        x: target.x - 16,
        y: target.y + 8,
        duration: 2500,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          hint.setText('!').setColor('#ffcc44');
          this.interactHint.setText("Priya's heading there... walk over").setVisible(true);
          this.time.delayedCall(4000, () => { priya.destroy(); hint.destroy(); });
        },
      });
    });
  }

  private tryInteract() {
    if (this.phase !== 'alarm') return;
    const target = this.targets[this.eventIdx];
    if (!this.isNear(target)) return;

    this.phase = 'agent';
    this.interactHint.setVisible(false);
    this.tweens.killTweensOf(target);
    this.tweens.killTweensOf(this.alarmIcons[this.eventIdx]);
    target.setScale(1);

    this.time.delayedCall(200, () => this.runAgent());
  }

  // ─── Agent sequence ──────────────────────────────────────

  private runAgent() {
    const evt = EVENTS[this.eventIdx];

    const bg = this.add.rectangle(0, 0, 240, 110, 0x12212b, 0.95);
    bg.setStrokeStyle(1, evt.type === 'escalation' ? C.escalate : C.mandate, 0.6);

    this.overlayContainer.removeAll(true);
    this.overlayContainer.add(bg);
    this.overlayContainer.setVisible(true);

    // Title
    const titleColor = evt.type === 'escalation' ? '#c45c26' : '#2a6f6a';
    const title = this.add.text(0, -42, 'YALER AGENT', { fontSize: '8px', color: titleColor, fontStyle: 'bold' }).setOrigin(0.5);
    this.overlayContainer.add(title);

    // Animate steps
    evt.agentSteps.forEach((text, idx) => {
      this.time.delayedCall(idx * 1000, () => {
        if (!this.overlayContainer.visible) return;

        // Dim previous
        this.overlayContainer.each((child: Phaser.GameObjects.GameObject) => {
          if (child !== bg && child !== title && child.type === 'Text') {
            (child as Phaser.GameObjects.Text).setColor('#4a5568');
          }
        });

        const isError = text.includes('✗') || text.includes('BLOCK');
        const isSuccess = text.includes('✓') || text.includes('Booked') || text.includes('Found');
        const color = isError ? '#ff4444' : isSuccess ? '#44cc88' : '#ffffff';
        const prefix = isError ? '✗' : isSuccess ? '✓' : '●';

        const stepText = this.add.text(-108, -24 + idx * 12, `${prefix} ${text}`, { fontSize: '7px', color });
        this.overlayContainer.add(stepText);

        if (isSuccess) playDing();
        if (isError) playAlarm();
      });
    });

    // After steps complete, handle based on type
    const afterSteps = evt.agentSteps.length * 1000 + 500;
    this.time.delayedCall(afterSteps, () => {
      this.overlayContainer.setVisible(false);

      if (evt.type === 'auto') {
        this.decisions.push('auto');
        this.totalCost += evt.cost;
        this.dispatchEngineer();
      } else if (evt.type === 'approval') {
        this.showDecision();
      } else if (evt.type === 'escalation') {
        // Escalation auto-resolves with Gas Safe engineer at higher cost
        this.decisions.push('escalated');
        this.totalCost += evt.cost;
        this.dispatchEngineer();
      }
    });
  }

  // ─── Decision (approval type) ────────────────────────────

  private showDecision() {
    this.phase = 'decision';
    const evt = EVENTS[this.eventIdx];

    const bg = this.add.rectangle(0, 0, 240, 100, 0x12212b, 0.95);
    bg.setStrokeStyle(1, C.escalate, 0.6);
    this.overlayContainer.removeAll(true);
    this.overlayContainer.add(bg);
    this.overlayContainer.setVisible(true);

    const q = this.add.text(0, -32, 'OVER BUDGET', { fontSize: '9px', color: '#c45c26', fontStyle: 'bold' }).setOrigin(0.5);
    this.overlayContainer.add(q);

    const desc = this.add.text(0, -16, `${evt.label}: £${evt.cost} (budget £${evt.budget})`, { fontSize: '7px', color: '#ffffff' }).setOrigin(0.5);
    this.overlayContainer.add(desc);

    const prompt = this.add.text(0, 0, 'Approve the overspend or reject and reroute?', { fontSize: '7px', color: '#ffffffaa' }).setOrigin(0.5);
    this.overlayContainer.add(prompt);

    // Approve button
    const approveBg = this.add.rectangle(-45, 24, 80, 22, C.escalate, 0.8).setInteractive({ useHandCursor: true });
    const approveText = this.add.text(-45, 24, 'APPROVE £580', { fontSize: '7px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.overlayContainer.add(approveBg);
    this.overlayContainer.add(approveText);

    // Reject button
    const rejectBg = this.add.rectangle(45, 24, 80, 22, C.mandate, 0.8).setInteractive({ useHandCursor: true });
    const rejectText = this.add.text(45, 24, 'REROUTE', { fontSize: '7px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.overlayContainer.add(rejectBg);
    this.overlayContainer.add(rejectText);

    approveBg.on('pointerdown', () => {
      this.decisions.push('approved');
      this.totalCost += evt.cost;
      this.overlayContainer.setVisible(false);
      this.dispatchEngineer();
    });

    rejectBg.on('pointerdown', () => {
      this.decisions.push('rerouted');
      this.totalCost += 460; // Cheaper rerouted option
      this.overlayContainer.setVisible(false);
      this.showReroute();
    });
  }

  private showReroute() {
    this.phase = 'agent';

    const bg = this.add.rectangle(0, 0, 220, 70, 0x12212b, 0.95);
    bg.setStrokeStyle(1, C.mandate, 0.6);
    this.overlayContainer.removeAll(true);
    this.overlayContainer.add(bg);
    this.overlayContainer.setVisible(true);

    const steps = [
      '● Rerouting search...',
      '✓ Found cheaper: N1 Vent Services £460',
      '→ Dispatching',
    ];

    steps.forEach((text, idx) => {
      this.time.delayedCall(idx * 800, () => {
        const color = text.includes('✓') ? '#44cc88' : text.includes('→') ? '#44aaff' : '#ffffff';
        const t = this.add.text(-100, -20 + idx * 14, text, { fontSize: '7px', color });
        this.overlayContainer.add(t);
        if (text.includes('✓')) playDing();
      });
    });

    this.time.delayedCall(3000, () => {
      this.overlayContainer.setVisible(false);
      this.dispatchEngineer();
    });
  }

  // ─── Engineer ────────────────────────────────────────────

  private dispatchEngineer() {
    this.phase = 'arriving';
    const target = this.targets[this.eventIdx];
    this.engineer.setVisible(true);
    this.engineer.setPosition(10 * T + 8, 11 * T - 4);
    this.engineer.setAlpha(1);

    this.interactHint.setText('Engineer arriving...').setVisible(true);

    this.tweens.add({
      targets: this.engineer,
      x: target.x,
      y: target.y + T,
      duration: 1500,
      ease: 'Sine.easeInOut',
      onComplete: () => this.fixEquipment(),
    });
  }

  private fixEquipment() {
    this.phase = 'fixing';
    this.interactHint.setText('Fixing...').setVisible(true);
    playFix();

    const target = this.targets[this.eventIdx];
    const icon = this.alarmIcons[this.eventIdx];

    this.tweens.add({
      targets: this.engineer,
      alpha: { from: 1, to: 0.4 },
      duration: 150,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        target.setFillStyle(C.fixed);
        target.setStrokeStyle(2, 0x44cc88, 0.8);
        icon.setText('✓').setColor('#44cc88').setAlpha(1);
        this.tweens.killTweensOf(icon);

        playDing();
        this.engineer.setVisible(false);
        this.interactHint.setVisible(false);

        this.eventTimes.push(Math.round((this.time.now - this.startTime) / 1000));

        // Next event
        this.phase = 'transition';
        this.eventIdx++;
        this.time.delayedCall(800, () => this.triggerNextEvent());
      },
    });
  }

  // ─── Summary ─────────────────────────────────────────────

  private showSummary() {
    this.phase = 'summary';
    const totalTime = Math.round((this.time.now - this.startTime) / 1000);
    playPaper();

    // Calculate stars
    const rerouted = this.decisions.includes('rerouted');
    const approved = this.decisions.includes('approved');
    const stars = rerouted ? 3 : (!approved ? 3 : 2); // Rerouting is good governance

    const bg = this.add.rectangle(160, 96, 280, 170, 0xfafaf8, 0.97).setDepth(25);
    bg.setStrokeStyle(1, C.mandate, 0.4);

    const els: Phaser.GameObjects.Text[] = [];

    els.push(this.add.text(160, 24, 'SHIFT COMPLETE', { fontSize: '8px', color: '#2a6f6a', fontStyle: 'bold' }).setOrigin(0.5).setDepth(26));
    els.push(this.add.text(160, 38, 'Café Noor — Tuesday morning', { fontSize: '7px', color: '#555555' }).setOrigin(0.5).setDepth(26));

    // Stars
    const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    els.push(this.add.text(160, 54, starStr, { fontSize: '14px', color: '#2a6f6a' }).setOrigin(0.5).setDepth(26));

    // Stats
    els.push(this.add.text(80, 74, `Time: ${totalTime}s`, { fontSize: '8px', color: '#12212b', fontStyle: 'bold' }).setOrigin(0.5).setDepth(26));
    els.push(this.add.text(240, 74, `Cost: £${this.totalCost}`, { fontSize: '8px', color: '#12212b', fontStyle: 'bold' }).setOrigin(0.5).setDepth(26));
    els.push(this.add.text(160, 90, `Manual estimate: ~12 hours, 40+ phone calls`, { fontSize: '6px', color: '#888888' }).setOrigin(0.5).setDepth(26));

    // Event breakdown
    const breakdown = EVENTS.map((evt, i) => {
      const decision = this.decisions[i] || '';
      const label = decision === 'rerouted' ? '↻ rerouted' : decision === 'approved' ? '⚠ approved over' : decision === 'escalated' ? '🛡 escalated' : '✓ auto';
      return `${evt.key}: ${label}`;
    }).join('   ');
    els.push(this.add.text(160, 106, breakdown, { fontSize: '6px', color: '#555555' }).setOrigin(0.5).setDepth(26));

    // Governance note
    const note = rerouted
      ? 'Good governance: you rejected the overspend and saved £120.'
      : approved
        ? 'You approved an overspend. Rerouting would have saved £120.'
        : 'All events resolved within budget automatically.';
    els.push(this.add.text(160, 122, note, { fontSize: '6px', color: rerouted ? '#2a6f6a' : '#c45c26' }).setOrigin(0.5).setDepth(26));

    els.push(this.add.text(160, 142, 'Every step mapped to a real system.', { fontSize: '7px', color: '#12212b' }).setOrigin(0.5).setDepth(26));
    els.push(this.add.text(160, 158, '→ Try it with your real kitchen', { fontSize: '7px', color: '#2a6f6a', fontStyle: 'bold' }).setOrigin(0.5).setDepth(26));

    // Animate in
    bg.setAlpha(0).setPosition(160, 130);
    this.tweens.add({ targets: bg, alpha: 0.97, y: 96, duration: 500, ease: 'Back.easeOut' });
    els.forEach((el, i) => {
      el.setAlpha(0);
      this.tweens.add({ targets: el, alpha: 1, duration: 300, delay: 400 + i * 80, ease: 'Power2' });
    });

    // Dispatch to React
    this.time.delayedCall(2500, () => {
      window.dispatchEvent(new CustomEvent('yaler:game-complete', {
        detail: { elapsed: totalTime, stars, totalCost: this.totalCost, decisions: this.decisions },
      }));
    });
  }

  // ─── Helpers ─────────────────────────────────────────────

  private isNear(target: Phaser.GameObjects.Rectangle): boolean {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y) < 32;
  }
}
