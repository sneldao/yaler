import Phaser from 'phaser';
import { playAlarm, playDing, playFix, playPaper, playStep } from '../audio';
import { COLORS, FONTS } from '../theme';

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

const T = 24;
const COLS = 20;
const ROWS = 11;
const W = 480;
const H = 270;

const toHex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
const toRgba = (c: number, a: number) => {
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const C = {
  floor: COLORS.paper,
  floorAlt: COLORS.paper,
  wall: COLORS.paperRaised,
  counter: COLORS.paperInset,
  fridge: COLORS.paperRaised,
  hood: COLORS.paperRaised,
  gasline: COLORS.paperRaised,
  alarm: COLORS.escalate,
  fixed: COLORS.mandate,
  stove: COLORS.paperInset,
  door: COLORS.paperRaised,
  player: COLORS.ink,
  engineer: COLORS.mandate,
  mandate: COLORS.mandate,
  escalate: COLORS.escalate,
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
  /** £/second the till bleeds while this is down. */
  bleed: number;
  bleedLabel: string;
  /** Manual mode: lump-sum extra loss for the afternoon the visit eats. */
  waitLoss: number;
  agentSteps: string[];
  /** Manual mode: the phone shuffle, one line per beat. */
  phoneSteps: string[];
  /** Manual mode: what the quote lands on when you chase it by phone. */
  phoneCost: number;
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
    bleed: 6, bleedLabel: 'food spoiling',
    waitLoss: 210,
    agentSteps: [
      'Searching N1 engineers…',
      '3 quotes in',
      '£420 < £500 ✓',
      'Booked Rapid ColdCare',
      'Dispatched',
    ],
    phoneSteps: [
      '☎ ColdCare: on hold… (pos 4)',
      '☎ "Visit? Maybe Thursday"',
      '☎ Ring two more…',
      'Quote: £495 — you take it',
      'Earliest: 3pm today',
    ],
    phoneCost: 495,
    receipt: 'Commercial fridge repair',
  },
  {
    key: 'hood',
    label: 'Extraction hood',
    col: 8, row: 1,
    color: C.hood,
    cost: 580, budget: 500,
    type: 'approval',
    bleed: 4, bleedLabel: 'smoke · covers leaving',
    waitLoss: 150,
    agentSteps: [
      'Searching N1 specialists…',
      '2 quotes in',
      '£580 > £500 ✗',
      'OVER BUDGET — your call',
    ],
    phoneSteps: [
      '☎ Two hood specialists…',
      '☎ One voicemail, one busy',
      'Quote: £720 — over budget',
      'No time to shop — accept',
    ],
    phoneCost: 720,
    receipt: 'Extraction hood service',
  },
  {
    key: 'gas',
    label: 'Gas line',
    col: 3, row: 5,
    color: C.gasline,
    cost: 650, budget: 500,
    type: 'escalation',
    bleed: 5, bleedLabel: 'hobs locked · orders lost',
    waitLoss: 160,
    agentSteps: [
      'Searching gas engineers…',
      'REGULATED: Gas Safety',
      'Policy engine: BLOCK ✗',
      'Escalate: Gas Safe only',
      'GasCert London ✓',
    ],
    phoneSteps: [
      '☎ Needs Gas Safe…',
      '☎ Registered engineers busy',
      '☎ 6th call: "can do later"',
      'Quote: £765 — verified by ear',
      'Booked for the afternoon',
    ],
    phoneCost: 765,
    receipt: 'Gas line repair (Gas Safe)',
  },
];

type Phase = 'intro' | 'idle' | 'alarm' | 'walking' | 'agent' | 'decision' | 'arriving' | 'fixing' | 'transition' | 'summary';
export type GameMode = 'yaler' | 'manual';

export class KitchenScene extends Phaser.Scene {
  // Core objects
  private player!: Phaser.GameObjects.Rectangle;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private playerSprite!: Phaser.GameObjects.Image;
  private engineer!: Phaser.GameObjects.Rectangle;
  private engineerSprite!: Phaser.GameObjects.Image;
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
  private reducedMotion = false;
  private eventTimes: number[] = [];
  private decisions: string[] = [];
  private totalCost = 0;

  // Shift economy: the till ticks up while service runs and bleeds while
  // equipment is down — makes the cost of every breakdown visceral.
  private cash = 0;
  private bleedRate = 0;
  private bleedLabel = '';
  private totalLosses = 0;
  private cashAcc = 0;
  private shiftMinutes = 0;
  private callsMade = 0;

  // UI
  private interactHint!: Phaser.GameObjects.Text;
  private shiftLabel!: Phaser.GameObjects.Text;
  private cashText!: Phaser.GameObjects.Text;
  private clockText?: Phaser.GameObjects.Text;
  private overlayContainer!: Phaser.GameObjects.Container;

  private gameMode: GameMode;

  constructor(mode: GameMode = 'yaler') {
    super({ key: 'KitchenScene' });
    this.gameMode = mode;
  }

  create() {
    // Continuous/decorative motion is gated on this throughout the scene;
    // gameplay and every bit of content stay the same without it.
    this.reducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.startTime = this.time.now;
    this.phase = 'intro';
    this.eventIdx = 0;
    this.eventTimes = [];
    this.decisions = [];
    this.totalCost = 0;
    this.cash = 0;
    this.bleedRate = 0;
    this.bleedLabel = '';
    this.totalLosses = 0;
    this.cashAcc = 0;
    this.shiftMinutes = 0;
    this.callsMade = 0;

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
    this.tickEconomy(delta);
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

    // Sync sprite to physics body + walk bob
    const isMoving = vx !== 0 || vy !== 0;
    this.playerSprite.setPosition(this.player.x, this.player.y - 4);

    // Bob animation: resume when moving, pause when still
    const bobTween = this.tweens.getTweens().find(t => (t as any).key === 'playerBob');
    if (bobTween) {
      if (isMoving && !bobTween.isPlaying()) bobTween.resume();
      else if (!isMoving && bobTween.isPlaying()) bobTween.pause();
    }

    // Flip sprite based on horizontal direction
    if (vx < 0) this.playerSprite.setFlipX(true);
    else if (vx > 0) this.playerSprite.setFlipX(false);

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

  // ─── Economy ─────────────────────────────────────────────

  /** Till ticks up while service runs, bleeds while kit is down. */
  private tickEconomy(delta: number) {
    if (this.phase === 'intro' || this.phase === 'summary') return;
    const dt = delta / 1000;
    this.cashAcc += delta;
    // Manual mode bleeds harder: staff are pulled off service to make calls.
    const rate = this.bleedRate * (this.gameMode === 'manual' ? 1.5 : 1);
    if (rate > 0) {
      const loss = rate * dt;
      this.cash -= loss;
      this.totalLosses += loss;
    } else {
      this.cash += (this.gameMode === 'manual' ? 2 : 3) * dt;
    }
    // Manual mode runs a compressed shift clock — the point of the mode.
    if (this.gameMode === 'manual' && this.clockText) {
      this.shiftMinutes += (this.bleedRate > 0 ? 8 : 2) * dt;
    }
    if (this.cashAcc >= 150) {
      this.cashAcc = 0;
      if (rate > 0) {
        this.cashText.setText(`Till £${Math.round(this.cash)} · ${this.bleedLabel}`).setColor(toHex(COLORS.escalate));
      } else {
        this.cashText.setText(`Till £${Math.round(this.cash)}`).setColor(toHex(this.gameMode === 'manual' ? COLORS.escalate : COLORS.mandate));
      }
      if (this.clockText) {
        const total = 6 * 60 + 47 + Math.floor(this.shiftMinutes);
        const h24 = Math.floor(total / 60) % 24;
        const m = total % 60;
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        this.clockText.setText(`${h12}:${String(m).padStart(2, '0')}${h24 < 12 ? 'am' : 'pm'} — shift running long`);
      }
    }
  }

  // ─── Setup ───────────────────────────────────────────────

  private createPlayer() {
    // Paper/ink silhouette: apron in paper tones, head as an ink shape.
    const g = this.add.graphics();
    // Shadow — ink at low opacity
    g.fillStyle(COLORS.ink, 0.15);
    g.fillEllipse(10, 28, 14, 6);
    // Body (apron)
    g.fillStyle(COLORS.paperRaised, 1);
    g.fillRoundedRect(3, 10, 14, 16, 3);
    // Apron strings
    g.lineStyle(1, COLORS.ink, 0.25);
    g.lineBetween(7, 12, 7, 22);
    g.lineBetween(13, 12, 13, 22);
    // Head (ink shape)
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(4, 0, 12, 12, 4);
    // Hair (paper-raised highlight)
    g.fillStyle(COLORS.paperRaised, 1);
    g.fillRoundedRect(4, 0, 12, 5, { tl: 4, tr: 4, bl: 0, br: 0 });
    // Glasses (ink frame)
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(4, 4, 12, 4);
    // Lenses (paper)
    g.fillStyle(COLORS.paper, 1);
    g.fillRect(5, 5, 4, 2);
    g.fillRect(11, 5, 4, 2);
    // Eyes (ink)
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(6, 5, 2, 2);
    g.fillRect(12, 5, 2, 2);
    g.generateTexture('player_sprite', 20, 32);
    g.destroy();

    this.player = this.add.rectangle(5 * T + 12, 6 * T + 12, 16, 20, C.player);
    this.player.setVisible(false);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setSize(16, 20);
    this.physics.add.collider(this.player, this.walls);

    // Visual sprite follows the physics body
    this.playerSprite = this.add.image(this.player.x, this.player.y, 'player_sprite');
    this.playerSprite.setDepth(5);

    // Walk bob tween (paused, started when moving) — skipped under reduced motion
    if (!this.reducedMotion) {
      this.tweens.add({
        targets: this.playerSprite,
        y: '-=1.5',
        duration: 150,
        yoyo: true,
        repeat: -1,
        paused: true,
        key: 'playerBob',
      });
    }
  }

  private createEquipment() {
    EVENTS.forEach((evt, idx) => {
      const x = evt.col * T + 12;
      const y = evt.row * T + 12;
      // Paper cutout equipment: paper-raised fill, ink stroke.
      const rect = this.add.rectangle(x, y, 20, 20, COLORS.paperRaised);
      rect.setStrokeStyle(1.5, COLORS.ink, 0.6);
      rect.setDepth(3);
      this.targets.push(rect);

      // Machine-font label below equipment, large enough to read on paper.
      this.add.text(x, y + 14, evt.key.toUpperCase(), {
        fontSize: '12px', color: toHex(COLORS.ink),
        backgroundColor: toRgba(COLORS.paperRaised, 0.9),
        padding: { x: 3, y: 1 },
        fontFamily: FONTS.machine,
        resolution: 2,
      }).setOrigin(0.5).setDepth(3);

      // Alarm icon (hidden)
      const icon = this.add.text(x - 2, y - 18, '!', {
        fontSize: '18px', color: toHex(COLORS.escalate), fontStyle: 'bold',
        fontFamily: FONTS.machine,
        backgroundColor: toRgba(COLORS.paperRaised, 0.9),
        padding: { x: 2, y: 0 },
      }).setVisible(false).setDepth(6);
      this.alarmIcons.push(icon);
    });
  }

  private createEngineer() {
    // Engineer: paper overalls, ink silhouette, mandate accent.
    const g = this.add.graphics();
    // Shadow — ink at low opacity
    g.fillStyle(COLORS.ink, 0.15);
    g.fillEllipse(10, 28, 14, 6);
    // Body (paper overalls)
    g.fillStyle(COLORS.paperRaised, 1);
    g.fillRoundedRect(3, 10, 14, 16, 3);
    // Tool belt (ink)
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(3, 18, 14, 3);
    // Belt buckle (mandate accent)
    g.fillStyle(COLORS.mandate, 1);
    g.fillRect(8, 18, 4, 3);
    // Head (ink shape)
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(4, 0, 12, 12, 4);
    // Hard hat (paper-raised top)
    g.fillStyle(COLORS.paperRaised, 1);
    g.fillRoundedRect(3, -1, 14, 5, { tl: 4, tr: 4, bl: 0, br: 0 });
    // Glasses (ink frame)
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(4, 4, 12, 4);
    // Lenses (paper)
    g.fillStyle(COLORS.paper, 1);
    g.fillRect(5, 5, 4, 2);
    g.fillRect(11, 5, 4, 2);
    // Eyes (ink)
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(6, 5, 2, 2);
    g.fillRect(12, 5, 2, 2);
    g.generateTexture('engineer_sprite', 20, 32);
    g.destroy();

    this.engineer = this.add.rectangle(10 * T + 12, 10 * T, 16, 20, C.engineer);
    this.engineer.setVisible(false);
    this.engineerSprite = this.add.image(this.engineer.x, this.engineer.y, 'engineer_sprite');
    this.engineerSprite.setDepth(5);
    this.engineerSprite.setVisible(false);
  }

  private createUI() {
    this.interactHint = this.add.text(W / 2, H - 14, '', {
      fontSize: '18px', color: toHex(COLORS.ink), backgroundColor: toRgba(COLORS.paperRaised, 0.9),
      padding: { x: 8, y: 4 },
      fontFamily: FONTS.display,
    }).setOrigin(0.5).setVisible(false).setDepth(15);

    this.shiftLabel = this.add.text(6, 4, '', {
      fontSize: '12px', color: toHex(COLORS.ink),
      backgroundColor: toRgba(COLORS.paperRaised, 0.85),
      fontFamily: FONTS.machine, resolution: 2,
    }).setDepth(15);

    // The till — live P&L for the shift.
    this.cashText = this.add.text(W - 6, 4, '', {
      fontSize: '12px', fontStyle: 'bold', color: toHex(COLORS.mandate),
      backgroundColor: toRgba(COLORS.paperRaised, 0.85), padding: { x: 5, y: 3 },
      fontFamily: FONTS.machine, resolution: 2,
    }).setOrigin(1, 0).setDepth(15);

    // Manual mode: compressed shift clock under the till.
    if (this.gameMode === 'manual') {
      this.clockText = this.add.text(W - 6, 24, '6:47am', {
        fontSize: '10px', color: toHex(COLORS.ink),
        backgroundColor: toRgba(COLORS.paperRaised, 0.85), padding: { x: 5, y: 2 },
        fontFamily: FONTS.machine, resolution: 2,
      }).setOrigin(1, 0).setDepth(15);
    }

    this.overlayContainer = this.add.container(W / 2, H / 2).setDepth(20).setVisible(false);
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
          const wall = this.add.rectangle(x, y, T, T, C.wall);
          wall.setStrokeStyle(1, COLORS.ink, 0.35);
          this.walls.add(wall);
          continue;
        }
        if (row === ROWS - 1) {
          if (col >= 9 && col <= 11) {
            const door = this.add.rectangle(x, y, T, T, C.door);
            door.setStrokeStyle(1, COLORS.ink, 0.35);
          } else {
            const wall = this.add.rectangle(x, y, T, T, C.wall);
            wall.setStrokeStyle(1, COLORS.ink, 0.35);
            this.walls.add(wall);
          }
          continue;
        }
        // Top counter
        if (row === 1 && col >= 2 && col <= 6) {
          const counter = this.add.rectangle(x, y, T, T, C.counter);
          counter.setStrokeStyle(1, COLORS.ink, 0.35);
          this.walls.add(counter);
          continue;
        }
        // Stove area
        if (row === 1 && col >= 10 && col <= 13) {
          const stove = this.add.rectangle(x, y, T, T, C.stove);
          stove.setStrokeStyle(1, COLORS.ink, 0.35);
          this.walls.add(stove);
          continue;
        }
        // Island counter
        if (row === 5 && col >= 7 && col <= 12) {
          const counter = this.add.rectangle(x, y, T, T, C.counter);
          counter.setStrokeStyle(1, COLORS.ink, 0.35);
          this.walls.add(counter);
          continue;
        }

        // Paper floor with a faint grid of paperInset tiles.
        this.add.rectangle(x, y, T, T, C.floor);
      }
    }

    // Faint paperInset grid over the floor.
    const grid = this.add.graphics();
    grid.lineStyle(1, COLORS.paperInset, 0.5);
    for (let row = 1; row < ROWS - 1; row++) {
      const y = row * T;
      grid.lineBetween(T, y, (COLS - 1) * T, y);
    }
    for (let col = 1; col < COLS - 1; col++) {
      const x = col * T;
      grid.lineBetween(x, T, x, (ROWS - 2) * T);
    }
    grid.setDepth(0);
  }

  private addAmbientNPCs() {
    // Paper/ink kitchen staff sprite.
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 0.12);
    g.fillEllipse(10, 26, 12, 5);
    g.fillStyle(COLORS.paperRaised, 1);
    g.fillRoundedRect(4, 10, 12, 14, 2);
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(5, 1, 10, 10, 3);
    g.fillStyle(COLORS.paperRaised, 1);
    g.fillRoundedRect(5, 1, 10, 4, { tl: 3, tr: 3, bl: 0, br: 0 });
    g.generateTexture('staff_sprite', 20, 30);
    g.destroy();

    const npc1 = this.add.image(13 * T + 12, 3 * T + 12, 'staff_sprite');
    npc1.setDepth(4).setAlpha(0.8);

    const npc2 = this.add.image(6 * T + 12, 8 * T + 12, 'staff_sprite');
    npc2.setDepth(4).setAlpha(0.8).setFlipX(true);

    // Continuous patrol loops — skipped under reduced motion; NPCs stay put.
    if (!this.reducedMotion) {
      this.tweens.add({ targets: npc1, y: 7 * T + 12, duration: 3500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: npc2, x: 14 * T + 12, duration: 4500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  // ─── Intro ───────────────────────────────────────────────

  private showIntro() {
    // Paper-raised card with an ink border.
    const bg = this.add.rectangle(W/2, H/2, W - 32, H - 24, COLORS.paperRaised, 0.98).setDepth(30);
    bg.setStrokeStyle(1, COLORS.ink, 0.25);
    // High-contrast, generously sized text: this card is read on phones
    // where the 480×270 canvas scales DOWN, and pixelArt nearest-neighbour
    // upscaling makes small text crunchy. resolution: 2 keeps glyphs crisp.
    const brand = this.gameMode === 'manual' ? toHex(COLORS.escalate) : toHex(COLORS.mandate);
    const lines = this.gameMode === 'manual'
      ? [
          { text: 'SAME TUESDAY — NO YALER', y: 56, size: '14px', color: brand, bold: true, font: FONTS.display },
          { text: 'Tuesday, 6:47am', y: 78, size: '11px', color: toHex(COLORS.ink), bold: false, font: FONTS.machine },
          { text: 'The agent stays home. You are the phone system now.', y: 98, size: '10px', color: toHex(COLORS.ink), bold: false, font: FONTS.display },
          { text: 'Walk to each breakdown. Call around. Wait.', y: 116, size: '10px', color: toHex(COLORS.ink), bold: false, font: FONTS.display },
          { text: 'The clock runs fast — that is the point.', y: 138, size: '9px', color: toHex(COLORS.inkMuted), bold: false, font: FONTS.hand },
          { text: 'tap anywhere to start the longest morning of your life', y: 162, size: '11px', color: brand, bold: true, font: FONTS.display },
        ]
      : [
          { text: 'CAFÉ NOOR — Dalston, N1', y: 52, size: '14px', color: brand, bold: true, font: FONTS.display },
          { text: 'Tuesday, 6:47am', y: 74, size: '11px', color: toHex(COLORS.ink), bold: false, font: FONTS.machine },
          { text: 'The breakfast rush starts in 13 minutes.', y: 92, size: '10px', color: toHex(COLORS.ink), bold: false, font: FONTS.display },
          { text: 'Three things are going to break today.', y: 109, size: '10px', color: toHex(COLORS.ink), bold: false, font: FONTS.display },
          { text: 'Walk to each one. Yaler handles the rest.', y: 126, size: '10px', color: toHex(COLORS.ink), bold: false, font: FONTS.display },
          { text: 'WASD / tap to move · Space / tap to interact', y: 148, size: '9px', color: toHex(COLORS.inkMuted), bold: false, font: FONTS.hand },
          { text: 'tap anywhere to start', y: 168, size: '11px', color: brand, bold: true, font: FONTS.display },
        ];

    const textObjs: Phaser.GameObjects.Text[] = [];
    lines.forEach((line, i) => {
      const t = this.add.text(W/2, line.y, line.text, {
        fontSize: line.size,
        color: line.color,
        fontStyle: line.bold ? 'bold' : 'normal',
        fontFamily: line.font,
        resolution: 2,
      }).setOrigin(0.5).setDepth(31).setAlpha(this.reducedMotion ? 1 : 0);
      textObjs.push(t);
      // Reduced motion: intro lines are simply there — no staggered fade.
      if (!this.reducedMotion) {
        this.tweens.add({ targets: t, alpha: 1, duration: 400, delay: i * 200, ease: 'Power2' });
      }
    });

    const startGame = () => {
      if (this.reducedMotion) {
        bg.destroy();
        textObjs.forEach((t) => t.destroy());
        this.phase = 'idle';
        this.triggerNextEvent();
        return;
      }
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
    this.bleedRate = evt.bleed;
    this.bleedLabel = evt.bleedLabel;
    const target = this.targets[this.eventIdx];
    const icon = this.alarmIcons[this.eventIdx];

    playAlarm();

    target.setFillStyle(C.alarm);
    target.setStrokeStyle(2, COLORS.escalate, 0.8);
    icon.setVisible(true);

    // Continuous alarm pulses — skipped under reduced motion; the static red
    // fill and "!" icon still mark the breakdown.
    if (!this.reducedMotion) {
      this.tweens.add({ targets: icon, alpha: { from: 1, to: 0.3 }, duration: 400, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: target, scaleX: { from: 1, to: 1.15 }, scaleY: { from: 1, to: 1.15 }, duration: 300, yoyo: true, repeat: -1 });
    }

    this.interactHint.setText(`! ${evt.label} is down`).setVisible(true);

    // Easter egg: AFK for 10s → Priya walks to the equipment
    this.time.delayedCall(10000, () => {
      if (this.phase !== 'alarm') return;
      const priya = this.add.rectangle(this.player.x + 20, this.player.y, 10, 10, COLORS.mandate);
      priya.setStrokeStyle(1, COLORS.ink, 0.35).setDepth(5);
      const hint = this.add.text(priya.x - 2, priya.y - 12, '?', {
        fontSize: '13px', color: toHex(COLORS.mandate), fontStyle: 'bold',
        fontFamily: FONTS.display,
      }).setDepth(6);
      this.tweens.add({
        targets: [priya, hint],
        x: target.x - 16,
        y: target.y + 8,
        duration: 2500,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          hint.setText('!').setColor(toHex(COLORS.escalate));
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
    if (this.gameMode === 'manual') {
      this.runPhoneCall(evt);
      return;
    }

    const bg = this.add.rectangle(0, 0, 280, 140, COLORS.paperRaised, 0.98);
    bg.setStrokeStyle(1, evt.type === 'escalation' ? C.escalate : C.mandate, 0.8);

    this.overlayContainer.removeAll(true);
    this.overlayContainer.add(bg);
    this.overlayContainer.setVisible(true);

    // Title
    const titleColor = toHex(evt.type === 'escalation' ? COLORS.escalate : COLORS.mandate);
    const title = this.add.text(0, -56, 'YALER AGENT', {
      fontSize: '14px', color: titleColor, fontStyle: 'bold',
      fontFamily: FONTS.display, resolution: 2,
    }).setOrigin(0.5);
    this.overlayContainer.add(title);

    // Animate steps — larger 12px machine text so it stays readable on paper.
    evt.agentSteps.forEach((text, idx) => {
      this.time.delayedCall(idx * 700, () => {
        if (!this.overlayContainer.visible) return;

        // Dim previous
        this.overlayContainer.each((child: Phaser.GameObjects.GameObject) => {
          if (child !== bg && child !== title && child.type === 'Text') {
            (child as Phaser.GameObjects.Text).setColor(toHex(COLORS.inkMuted));
          }
        });

        const isError = text.includes('✗') || text.includes('BLOCK');
        const isSuccess = text.includes('✓') || text.includes('Booked') || text.includes('Found');
        const color = isError ? toHex(COLORS.escalate) : isSuccess ? toHex(COLORS.mandate) : toHex(COLORS.ink);
        const prefix = isError ? '✗' : isSuccess ? '✓' : '●';

        const stepText = this.add.text(-128, -36 + idx * 16, `${prefix} ${text}`, {
          fontSize: '12px', color, wordWrap: { width: 246 },
          fontFamily: FONTS.machine, resolution: 2,
        });
        this.overlayContainer.add(stepText);

        if (isSuccess) playDing();
        if (isError) playAlarm();
      });
    });

    // After steps complete, handle based on type
    const afterSteps = evt.agentSteps.length * 700 + 400;
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

  /** Manual mode: no agent — the player endures the phone shuffle. */
  private runPhoneCall(evt: BreakdownEvent) {
    this.phase = 'agent';

    const bg = this.add.rectangle(0, 0, 260, 128, COLORS.paperRaised, 0.98);
    bg.setStrokeStyle(1, C.escalate, 0.8);
    this.overlayContainer.removeAll(true);
    this.overlayContainer.add(bg);
    this.overlayContainer.setVisible(true);

    const title = this.add.text(0, -56, 'YOU, ON THE PHONE', {
      fontSize: '14px', color: toHex(COLORS.escalate), fontStyle: 'bold',
      fontFamily: FONTS.display, resolution: 2,
    }).setOrigin(0.5);
    this.overlayContainer.add(title);

    evt.phoneSteps.forEach((text, idx) => {
      this.time.delayedCall(idx * 1300, () => {
        if (!this.overlayContainer.visible) return;

        if (text.startsWith('☎')) {
          this.callsMade++;
          playStep();
        }
        const isQuote = text.startsWith('Quote');
        const color = isQuote ? toHex(COLORS.escalate) : toHex(COLORS.ink);

        this.overlayContainer.add(this.add.text(-128, -36 + idx * 16, text, {
          fontSize: '12px', color, wordWrap: { width: 246 },
          fontFamily: FONTS.machine, resolution: 2,
        }));

        if (isQuote) playAlarm();
      });
    });

    this.time.delayedCall(evt.phoneSteps.length * 1300 + 400, () => {
      this.overlayContainer.setVisible(false);
      this.decisions.push('manual');
      this.totalCost += evt.phoneCost;
      this.dispatchEngineer();
    });
  }

  // ─── Decision (approval type) ────────────────────────────

  private showDecision() {
    this.phase = 'decision';
    const evt = EVENTS[this.eventIdx];

    const bg = this.add.rectangle(0, 0, 280, 124, COLORS.paperRaised, 0.98);
    bg.setStrokeStyle(1, C.escalate, 0.8);
    this.overlayContainer.removeAll(true);
    this.overlayContainer.add(bg);
    this.overlayContainer.setVisible(true);

    const q = this.add.text(0, -46, 'OVER BUDGET', {
      fontSize: '14px', color: toHex(COLORS.escalate), fontStyle: 'bold',
      fontFamily: FONTS.display, resolution: 2,
    }).setOrigin(0.5);
    this.overlayContainer.add(q);

    const desc = this.add.text(0, -28, `${evt.label}: £${evt.cost} (budget £${evt.budget})`, {
      fontSize: '12px', color: toHex(COLORS.ink),
      fontFamily: FONTS.machine, resolution: 2,
    }).setOrigin(0.5);
    this.overlayContainer.add(desc);

    const prompt = this.add.text(0, -10, 'Approve or reroute?', {
      fontSize: '11px', color: toHex(COLORS.inkMuted),
      fontFamily: FONTS.display, resolution: 2,
    }).setOrigin(0.5);
    this.overlayContainer.add(prompt);

    // Approve button — paper inset with ink border and escalate text.
    const approveBg = this.add.rectangle(-62, 34, 110, 28, COLORS.paperInset, 0.98).setInteractive({ useHandCursor: true });
    approveBg.setStrokeStyle(1, COLORS.escalate, 0.8);
    const approveText = this.add.text(-62, 34, 'APPROVE £580', {
      fontSize: '12px', color: toHex(COLORS.escalate), fontStyle: 'bold',
      fontFamily: FONTS.display, resolution: 2,
    }).setOrigin(0.5);
    this.overlayContainer.add(approveBg);
    this.overlayContainer.add(approveText);

    // Reject button — paper inset with ink border and mandate text.
    const rejectBg = this.add.rectangle(62, 34, 110, 28, COLORS.paperInset, 0.98).setInteractive({ useHandCursor: true });
    rejectBg.setStrokeStyle(1, COLORS.mandate, 0.8);
    const rejectText = this.add.text(62, 34, 'REROUTE', {
      fontSize: '12px', color: toHex(COLORS.mandate), fontStyle: 'bold',
      fontFamily: FONTS.display, resolution: 2,
    }).setOrigin(0.5);
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

    const bg = this.add.rectangle(0, 0, 240, 80, COLORS.paperRaised, 0.98);
    bg.setStrokeStyle(1, C.mandate, 0.8);
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
        const color = text.includes('✓') ? toHex(COLORS.mandate) : text.includes('→') ? toHex(COLORS.ink) : toHex(COLORS.inkMuted);
        const t = this.add.text(-108, -22 + idx * 16, text, { fontSize: '14px', color, fontFamily: FONTS.machine, resolution: 2 });
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
    const evt = EVENTS[this.eventIdx];
    if (this.gameMode === 'manual') {
      // The afternoon the visit eats — a compressed lump on top of the bleed.
      this.cash -= evt.waitLoss;
      this.totalLosses += evt.waitLoss;
    }
    this.engineer.setPosition(10 * T + 12, 10 * T);
    this.engineer.setVisible(false); // keep rect hidden, show sprite
    this.engineerSprite.setPosition(this.engineer.x, this.engineer.y - 4);
    this.engineerSprite.setVisible(true);
    this.engineerSprite.setAlpha(1);

    this.interactHint.setText(
      this.gameMode === 'manual' ? 'Booked — "sometime this afternoon"…' : 'Engineer arriving...',
    ).setVisible(true);

    this.tweens.add({
      targets: [this.engineer, this.engineerSprite],
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

    const onFixed = () => {
      this.bleedRate = 0;
      this.bleedLabel = '';
      target.setFillStyle(C.fixed);
      target.setStrokeStyle(2, COLORS.mandate, 0.8);
      icon.setText('✓').setColor(toHex(COLORS.mandate)).setAlpha(1);
      this.tweens.killTweensOf(icon);

      playDing();
      this.engineer.setVisible(false);
      this.engineerSprite.setVisible(false);
      this.interactHint.setVisible(false);

      this.eventTimes.push(Math.round((this.time.now - this.startTime) / 1000));

      // Next event
      this.phase = 'transition';
      this.eventIdx++;
      this.time.delayedCall(800, () => this.triggerNextEvent());
    };

    // Reduced motion: no flashing — mark fixed straight away.
    if (this.reducedMotion) {
      onFixed();
      return;
    }

    this.tweens.add({
      targets: this.engineerSprite,
      alpha: { from: 1, to: 0.4 },
      duration: 150,
      yoyo: true,
      repeat: 4,
      onComplete: onFixed,
    });
  }

  // ─── Summary ─────────────────────────────────────────────

  private showSummary() {
    if (this.gameMode === 'manual') {
      this.showManualSummary();
      return;
    }
    this.phase = 'summary';
    const totalTime = Math.round((this.time.now - this.startTime) / 1000);
    playPaper();

    // Calculate stars
    const rerouted = this.decisions.includes('rerouted');
    const approved = this.decisions.includes('approved');
    const stars = rerouted ? 3 : (!approved ? 3 : 2); // Rerouting is good governance

    // Your all-in: repair spend + whatever the till bled while kit was down.
    const withYaler = this.totalCost + Math.round(this.totalLosses);
    // Modelled manual path: same three breakdowns handled by phone.
    const withoutYaler = 1980 + 240 + 176 + 410; // pricier quotes, spoiled stock, staff time, lost covers

    const bg = this.add.rectangle(W / 2, H / 2, 400, 238, COLORS.paperRaised, 0.97).setDepth(25);
    bg.setStrokeStyle(1, C.mandate, 0.5);

    const FONT = FONTS.display;
    const els: Phaser.GameObjects.Text[] = [];
    const add = (x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle) => {
      els.push(this.add.text(x, y, text, { fontFamily: FONT, resolution: 2, ...style }).setOrigin(0.5).setDepth(26));
    };

    add(W / 2, 28, 'SHIFT COMPLETE', { fontSize: '16px', color: toHex(COLORS.mandate), fontStyle: 'bold' });
    add(W / 2, 44, 'Café Noor — Tuesday breakfast', { fontSize: '10px', color: toHex(COLORS.inkMuted) });
    add(W / 2, 62, '★'.repeat(stars) + '☆'.repeat(3 - stars), { fontSize: '16px', color: toHex(COLORS.mandate) });

    // The pitch: the same shift, with and without the agent.
    const lx = 150, rx = 330;
    this.add.rectangle(W / 2, 110, 1, 80, COLORS.paperInset, 0.5).setDepth(26);
    add(lx, 80, 'WITH YALER', { fontSize: '11px', color: toHex(COLORS.mandate), fontStyle: 'bold' });
    add(rx, 80, 'WITHOUT YALER*', { fontSize: '11px', color: toHex(COLORS.escalate), fontStyle: 'bold' });
    add(lx, 96, `${totalTime}s · 0 calls`, { fontSize: '10px', color: toHex(COLORS.ink) });
    add(rx, 96, '~11 hrs · 43 calls', { fontSize: '10px', color: toHex(COLORS.ink) });
    add(lx, 109, 'nothing spoiled', { fontSize: '10px', color: toHex(COLORS.ink) });
    add(rx, 109, '£240 stock spoiled', { fontSize: '10px', color: toHex(COLORS.ink) });
    add(lx, 122, 'full service kept', { fontSize: '10px', color: toHex(COLORS.ink) });
    add(rx, 122, '£410 covers lost', { fontSize: '10px', color: toHex(COLORS.ink) });

    // Totals race up — Yaler lands fast; the manual grind takes its time.
    const withTotal = this.add.text(lx, 144, '£0', {
      fontSize: '18px', color: toHex(COLORS.mandate), fontStyle: 'bold', fontFamily: FONT, resolution: 2,
    }).setOrigin(0.5).setDepth(26);
    const withoutTotal = this.add.text(rx, 144, '£0', {
      fontSize: '18px', color: toHex(COLORS.escalate), fontStyle: 'bold', fontFamily: FONT, resolution: 2,
    }).setOrigin(0.5).setDepth(26);
    this.countUpTo(withTotal, withYaler, 1800, 400);
    this.countUpTo(withoutTotal, withoutYaler, 3600, 800);

    // Governance note
    const note = rerouted
      ? 'Good call — you rejected the overspend and saved £120.'
      : approved
        ? 'You approved an overspend. Rerouting would have saved £120.'
        : 'All events resolved within budget.';
    add(W / 2, 170, note, { fontSize: '11px', color: toHex(rerouted ? COLORS.mandate : COLORS.escalate), wordWrap: { width: 370 } });

    add(W / 2, 190, 'Quotes checked, budget guarded, Gas Safe verified.', { fontSize: '9px', color: toHex(COLORS.inkMuted), wordWrap: { width: 370 } });
    add(W / 2, 208, '→ Try it with your real kitchen', { fontSize: '12px', color: toHex(COLORS.mandate), fontStyle: 'bold' });
    add(W / 2, 224, '*modelled: same three breakdowns, handled by phone', { fontSize: '9px', color: toHex(COLORS.inkMuted) });

    // Animate in — skipped under reduced motion; the summary renders in place.
    if (!this.reducedMotion) {
      bg.setAlpha(0).setPosition(160, 130);
      this.tweens.add({ targets: bg, alpha: 0.97, y: H / 2, duration: 500, ease: 'Back.easeOut' });
      els.forEach((el, i) => {
        el.setAlpha(0);
        this.tweens.add({ targets: el, alpha: 1, duration: 300, delay: 400 + i * 60, ease: 'Power2' });
      });
      withTotal.setAlpha(0);
      withoutTotal.setAlpha(0);
      this.tweens.add({ targets: [withTotal, withoutTotal], alpha: 1, duration: 300, delay: 800 });
    }

    // Dispatch to React — after the totals race finishes so it's actually seen.
    this.time.delayedCall(4600, () => {
      window.dispatchEvent(new CustomEvent('yaler:game-complete', {
        detail: { elapsed: totalTime, stars, totalCost: this.totalCost, decisions: this.decisions, mode: 'yaler', totalAllIn: withYaler, calls: 0 },
      }));
    });
  }

  /** Manual-mode ledger: your phone shift vs the agent shift you skipped. */
  private showManualSummary() {
    this.phase = 'summary';
    const totalTime = Math.round((this.time.now - this.startTime) / 1000);
    playPaper();

    const shiftHrs = Math.floor(this.shiftMinutes / 60);
    const shiftMins = Math.round(this.shiftMinutes % 60);
    const allIn = this.totalCost + Math.round(this.totalLosses);

    const bg = this.add.rectangle(W / 2, H / 2, 400, 238, COLORS.paperRaised, 0.97).setDepth(25);
    bg.setStrokeStyle(1, C.escalate, 0.5);

    const FONT = FONTS.display;
    const els: Phaser.GameObjects.Text[] = [];
    const add = (x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle) => {
      els.push(this.add.text(x, y, text, { fontFamily: FONT, resolution: 2, ...style }).setOrigin(0.5).setDepth(26));
    };

    add(W / 2, 28, 'PHONE SHIFT COMPLETE', { fontSize: '16px', color: toHex(COLORS.escalate), fontStyle: 'bold' });
    add(W / 2, 44, 'Café Noor — the long way round', { fontSize: '10px', color: toHex(COLORS.inkMuted) });
    add(W / 2, 62, '☆☆☆', { fontSize: '16px', color: toHex(COLORS.inkMuted) });

    // Your morning by phone, vs the morning you skipped.
    const lx = 150, rx = 330;
    this.add.rectangle(W / 2, 110, 1, 80, COLORS.paperInset, 0.5).setDepth(26);
    add(lx, 80, 'YOUR PHONE SHIFT', { fontSize: '11px', color: toHex(COLORS.escalate), fontStyle: 'bold' });
    add(rx, 80, 'WITH YALER*', { fontSize: '11px', color: toHex(COLORS.mandate), fontStyle: 'bold' });
    add(lx, 96, `${shiftHrs}h ${shiftMins}m of shift`, { fontSize: '10px', color: toHex(COLORS.ink) });
    add(rx, 96, 'a 96-second shift', { fontSize: '10px', color: toHex(COLORS.ink) });
    add(lx, 109, `${this.callsMade} calls chased`, { fontSize: '10px', color: toHex(COLORS.ink) });
    add(rx, 109, '0 calls', { fontSize: '10px', color: toHex(COLORS.ink) });
    add(lx, 122, `£${Math.round(this.totalLosses)} spoiled & lost`, { fontSize: '10px', color: toHex(COLORS.ink) });
    add(rx, 122, 'full service kept', { fontSize: '10px', color: toHex(COLORS.ink) });

    const phoneTotal = this.add.text(lx, 144, '£0', {
      fontSize: '18px', color: toHex(COLORS.escalate), fontStyle: 'bold', fontFamily: FONT, resolution: 2,
    }).setOrigin(0.5).setDepth(26);
    const agentTotal = this.add.text(rx, 144, '£0', {
      fontSize: '18px', color: toHex(COLORS.mandate), fontStyle: 'bold', fontFamily: FONT, resolution: 2,
    }).setOrigin(0.5).setDepth(26);
    this.countUpTo(phoneTotal, allIn, 3200, 400);
    this.countUpTo(agentTotal, 1530, 1200, 800);

    add(W / 2, 170, 'You spent the breakfast rush on hold.', { fontSize: '11px', color: toHex(COLORS.escalate), fontStyle: 'bold' });
    add(W / 2, 190, 'Same kitchen, same breakdowns — one of them had an agent.', { fontSize: '9px', color: toHex(COLORS.inkMuted), wordWrap: { width: 370 } });
    add(W / 2, 208, '→ Hand it to the agent', { fontSize: '12px', color: toHex(COLORS.mandate), fontStyle: 'bold' });
    add(W / 2, 224, '*the first shift — repairs £1,530, all-in with walking pace', { fontSize: '9px', color: toHex(COLORS.inkMuted) });

    if (!this.reducedMotion) {
      bg.setAlpha(0).setPosition(160, 130);
      this.tweens.add({ targets: bg, alpha: 0.97, y: H / 2, duration: 500, ease: 'Back.easeOut' });
      els.forEach((el, i) => {
        el.setAlpha(0);
        this.tweens.add({ targets: el, alpha: 1, duration: 300, delay: 400 + i * 60, ease: 'Power2' });
      });
      phoneTotal.setAlpha(0);
      agentTotal.setAlpha(0);
      this.tweens.add({ targets: [phoneTotal, agentTotal], alpha: 1, duration: 300, delay: 800 });
    } else {
      phoneTotal.setText(`£${allIn.toLocaleString('en-GB')}`);
      agentTotal.setText('£1,530');
    }

    this.time.delayedCall(4200, () => {
      window.dispatchEvent(new CustomEvent('yaler:game-complete', {
        detail: { elapsed: totalTime, stars: 0, totalCost: this.totalCost, decisions: this.decisions, mode: 'manual', totalAllIn: allIn, calls: this.callsMade },
      }));
    });
  }

  /** Animated £ counter — lands instantly under reduced motion. */
  private countUpTo(label: Phaser.GameObjects.Text, target: number, duration: number, delay: number) {
    const fmt = (v: number) => `£${Math.round(v).toLocaleString('en-GB')}`;
    if (this.reducedMotion) { label.setText(fmt(target)); return; }
    const counter = { v: 0 };
    this.tweens.add({
      targets: counter, v: target, duration, delay, ease: 'Linear',
      onUpdate: () => label.setText(fmt(counter.v)),
    });
  }

  // ─── Helpers ─────────────────────────────────────────────

  private isNear(target: Phaser.GameObjects.Rectangle): boolean {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y) < 32;
  }
}
