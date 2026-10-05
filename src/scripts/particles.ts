/**
 * One full-screen canvas whose "weather" follows the circle currently in view.
 * Particles of the previous mode are left to die naturally, so modes crossfade.
 */
type Kind =
  | 'ember' | 'ash' | 'fly' | 'mote' | 'wind' | 'rain' | 'hail' | 'dust' | 'bubble'
  | 'blood' | 'leaf' | 'fire' | 'snow' | 'icewind' | 'star' | 'shoot';

interface P {
  k: Kind;
  x: number; y: number;
  vx: number; vy: number;
  age: number; life: number;
  s: number; rot: number; vr: number; seed: number;
}

type Mode = { rate: number; max: number; mix: [Kind, number][] };

const MODES: Record<string, Mode> = {
  motes: { rate: 14, max: 90, mix: [['mote', 1]] },
  embers: { rate: 45, max: 240, mix: [['ember', 0.85], ['ash', 0.15]] },
  flies: { rate: 35, max: 140, mix: [['fly', 1]] },
  leaves: { rate: 10, max: 70, mix: [['leaf', 0.7], ['ash', 0.3]] },
  wind: { rate: 90, max: 300, mix: [['wind', 0.85], ['mote', 0.15]] },
  rain: { rate: 220, max: 520, mix: [['rain', 0.88], ['hail', 0.12]] },
  dust: { rate: 34, max: 160, mix: [['dust', 1]] },
  bubbles: { rate: 22, max: 110, mix: [['bubble', 0.8], ['mote', 0.2]] },
  blood: { rate: 34, max: 170, mix: [['blood', 0.6], ['ember', 0.4]] },
  firerain: { rate: 26, max: 140, mix: [['fire', 0.75], ['ember', 0.25]] },
  snow: { rate: 80, max: 380, mix: [['snow', 1]] },
  icewind: { rate: 150, max: 500, mix: [['icewind', 0.55], ['snow', 0.45]] },
  ash: { rate: 26, max: 140, mix: [['ash', 1]] },
  stars: { rate: 160, max: 420, mix: [['star', 0.995], ['shoot', 0.005]] },
};

export type Palette = Record<'ember' | 'fire' | 'mote' | 'dust' | 'blood' | 'star' | 'cold' | 'wind' | 'icewind' | 'rain' | 'bubble' | 'fly' | 'leafFill' | 'leafStroke' | 'ash', string>;

export const COLOR_PALETTE: Palette = {
  ember: '#ff7a2a', fire: '#ffb347', mote: '#efe6b8', dust: '#d4ae5a', blood: '#ff2a10', star: '#dfe8ff', cold: '#cfe8ff',
  wind: '#f2c4dc', icewind: '#dff1ff', rain: '#b9cad4', bubble: '#a9c47e', fly: '#d9c27a', leafFill: '#3a2418', leafStroke: '#7a4a2a', ash: '#9a928a',
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function sprite(color: string, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.15, color);
  grd.addColorStop(0.45, color + '55');
  grd.addColorStop(1, color + '00');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
}

export class Particles {
  private ctx: CanvasRenderingContext2D;
  private ps: P[] = [];
  private W = 0;
  private H = 0;
  private dpr = 1;
  private acc = 0;
  private last = performance.now();
  private sprites: Record<string, HTMLCanvasElement> = {};
  mode = 'motes';
  scrollVel = 0;
  density = 1;

  constructor(private canvas: HTMLCanvasElement, private pal: Palette = COLOR_PALETTE) {
    this.ctx = canvas.getContext('2d')!;
    this.sprites = {
      ember: sprite(pal.ember),
      fire: sprite(pal.fire),
      mote: sprite(pal.mote),
      dust: sprite(pal.dust),
      blood: sprite(pal.blood),
      star: sprite(pal.star),
      cold: sprite(pal.cold),
    };
    this.resize();
    addEventListener('resize', () => this.resize());
    if (innerWidth < 700) this.density = 0.55;
  }

  resize() {
    this.dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.W = innerWidth;
    this.H = innerHeight;
    this.canvas.width = this.W * this.dpr;
    this.canvas.height = this.H * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private spawn(k: Kind) {
    const { W, H } = this;
    const p: P = { k, x: rnd(0, W), y: rnd(0, H), vx: 0, vy: 0, age: 0, life: rnd(3, 6), s: 1, rot: rnd(0, 6.28), vr: 0, seed: Math.random() * 100 };
    switch (k) {
      case 'ember':
      case 'blood':
        p.y = H + 10; p.vx = rnd(-15, 15); p.vy = rnd(-140, -50); p.s = rnd(0.5, 1.6); p.life = rnd(4, 9);
        break;
      case 'bubble':
        p.y = H + 10; p.vy = rnd(-70, -30); p.s = rnd(2, 7); p.life = rnd(4, 9);
        break;
      case 'mote':
      case 'dust':
        p.vx = rnd(-10, 10); p.vy = rnd(-14, 4); p.s = rnd(0.4, 1.3); p.life = rnd(4, 9);
        break;
      case 'fly':
        p.vx = rnd(-60, 60); p.vy = rnd(-60, 60); p.s = rnd(1, 2.2); p.life = rnd(3, 7);
        break;
      case 'wind':
        p.x = -40; p.vx = rnd(500, 1000); p.vy = rnd(-60, 60); p.life = rnd(1.6, 3); p.s = rnd(0.6, 1.6);
        break;
      case 'icewind':
        p.x = W + 40; p.vx = -rnd(700, 1300); p.vy = rnd(-40, 80); p.life = rnd(1.2, 2.4); p.s = rnd(0.5, 1.5);
        break;
      case 'rain':
        p.x = rnd(-100, W + 200); p.y = -20; p.vx = -rnd(120, 180); p.vy = rnd(900, 1300); p.life = 1.6; p.s = rnd(0.6, 1.2);
        break;
      case 'hail':
        p.x = rnd(-100, W + 200); p.y = -20; p.vx = -150; p.vy = rnd(700, 900); p.life = 1.8; p.s = rnd(1, 2);
        break;
      case 'leaf':
        p.y = -20; p.vx = rnd(-30, 40); p.vy = rnd(40, 90); p.vr = rnd(-3, 3); p.s = rnd(4, 9); p.life = rnd(8, 14);
        break;
      case 'ash':
        p.y = -10; p.vx = rnd(-20, 20); p.vy = rnd(25, 60); p.vr = rnd(-2, 2); p.s = rnd(1, 3); p.life = rnd(8, 16);
        break;
      case 'fire':
        p.y = -30; p.vx = rnd(-20, 5); p.vy = rnd(60, 130); p.s = rnd(1.2, 3); p.life = rnd(6, 12);
        break;
      case 'snow':
        p.x = rnd(0, W + 200); p.y = -10; p.vx = -rnd(20, 90); p.vy = rnd(40, 110); p.s = rnd(0.8, 2.8); p.life = rnd(8, 14);
        break;
      case 'star':
        p.s = Math.pow(Math.random(), 3) * 2.2 + 0.4; p.life = rnd(8, 18);
        break;
      case 'shoot':
        p.x = rnd(W * 0.2, W); p.y = rnd(0, H * 0.4); p.vx = -rnd(600, 900); p.vy = rnd(200, 350); p.life = 0.9;
        break;
    }
    this.ps.push(p);
  }

  tick(now: number) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const m = MODES[this.mode] ?? MODES.ash;
    const max = m.max * this.density;

    this.acc += m.rate * this.density * dt;
    while (this.acc >= 1) {
      this.acc -= 1;
      if (this.ps.length >= max) continue;
      let r = Math.random();
      for (const [k, w] of m.mix) {
        if ((r -= w) <= 0) { this.spawn(k); break; }
      }
    }

    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);
    // descending pushes the world upwards
    const lift = this.scrollVel;
    const t = now / 1000;
    let alive = 0;
    for (let i = 0; i < this.ps.length; i++) {
      const p = this.ps[i];
      p.age += dt;
      if (p.age > p.life || p.y < -80 || p.y > H + 80 || p.x < -200 || p.x > W + 200) continue;
      this.ps[alive++] = p;

      switch (p.k) {
        case 'ember':
        case 'blood':
          p.vx += Math.sin(t * 2 + p.seed) * 20 * dt;
          break;
        case 'fly':
          p.vx += rnd(-600, 600) * dt; p.vy += rnd(-600, 600) * dt;
          p.vx *= 0.96; p.vy *= 0.96;
          break;
        case 'wind':
          p.vy = Math.sin(t * 3 + p.seed) * 120;
          break;
        case 'leaf':
        case 'ash':
          p.vx += Math.sin(t * 1.5 + p.seed) * 30 * dt;
          break;
        case 'snow':
          p.vx += Math.sin(t + p.seed) * 10 * dt;
          break;
        case 'bubble':
          p.vx = Math.sin(t * 3 + p.seed) * 10;
          break;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.k !== 'star' && p.k !== 'shoot') p.y -= lift * (0.15 + p.s * 0.05);

      const lifeA = Math.sin(Math.PI * Math.min(1, p.age / p.life));
      this.draw(p, lifeA, t);
    }
    this.ps.length = alive;
  }

  private draw(p: P, a: number, t: number) {
    const ctx = this.ctx;
    const S = this.sprites;
    switch (p.k) {
      case 'ember':
      case 'blood':
      case 'mote':
      case 'dust': {
        const sp = p.k === 'ember' ? S.ember : p.k === 'blood' ? S.blood : p.k === 'dust' ? S.dust : S.mote;
        const flick = p.k === 'ember' ? 0.6 + 0.4 * Math.sin(t * 12 + p.seed) : 1;
        const size = p.s * (p.k === 'mote' ? 14 : 10);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a * flick * (p.k === 'mote' ? 0.6 : 0.9);
        ctx.drawImage(sp, p.x - size / 2, p.y - size / 2, size, size);
        break;
      }
      case 'fire': {
        const size = p.s * 22;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a * 0.9;
        ctx.drawImage(S.fire, p.x - size / 2, p.y - size / 2, size, size * 1.3);
        ctx.drawImage(S.ember, p.x - size, p.y - size, size * 2, size * 2);
        break;
      }
      case 'star':
      case 'shoot': {
        ctx.globalCompositeOperation = 'lighter';
        if (p.k === 'shoot') {
          ctx.globalAlpha = a;
          ctx.strokeStyle = '#e8f0ff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.12, p.y - p.vy * 0.12);
          ctx.stroke();
        } else {
          const tw = 0.55 + 0.45 * Math.sin(t * (1 + p.seed % 3) + p.seed);
          const size = p.s * 8;
          ctx.globalAlpha = a * tw;
          ctx.drawImage(S.star, p.x - size / 2, p.y - size / 2, size, size);
        }
        break;
      }
      case 'wind':
      case 'icewind':
      case 'rain': {
        ctx.globalCompositeOperation = 'source-over';
        const k = p.k === 'rain' ? 0.025 : 0.06;
        ctx.globalAlpha = a * (p.k === 'rain' ? 0.35 : p.k === 'wind' ? 0.35 : 0.5);
        ctx.strokeStyle = p.k === 'wind' ? this.pal.wind : p.k === 'icewind' ? this.pal.icewind : this.pal.rain;
        ctx.lineWidth = p.s;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * k, p.y - p.vy * k);
        ctx.stroke();
        break;
      }
      case 'hail':
      case 'snow': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = a * (p.k === 'snow' ? 0.85 : 0.6);
        ctx.fillStyle = '#f2f8ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, 6.283);
        ctx.fill();
        break;
      }
      case 'bubble': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = a * 0.55;
        ctx.strokeStyle = this.pal.bubble;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, 6.283);
        ctx.stroke();
        break;
      }
      case 'fly': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = a * 0.85;
        ctx.fillStyle = this.pal.fly;
        ctx.fillRect(p.x, p.y, p.s, p.s);
        ctx.globalAlpha = a * 0.25;
        ctx.fillRect(p.x - 2, p.y - 1 + Math.sin(t * 60 + p.seed) * 1.5, p.s + 4, 1);
        break;
      }
      case 'leaf':
      case 'ash': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = a * (p.k === 'leaf' ? 0.85 : 0.5);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.k === 'leaf') {
          ctx.fillStyle = this.pal.leafFill;
          ctx.strokeStyle = this.pal.leafStroke;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.s, p.s * 0.45, 0, 0, 6.283);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = this.pal.ash;
          ctx.fillRect(-p.s, -p.s * 0.4, p.s * 2, p.s * 0.8);
        }
        ctx.restore();
        break;
      }
    }
  }
}
