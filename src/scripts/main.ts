import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Particles } from './particles';

gsap.registerPlugin(ScrollTrigger);

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => Array.from(root.querySelectorAll(s)) as T[];

/* ---------- smooth scroll ---------- */
const lenis = new Lenis({ lerp: reduce ? 1 : 0.085, wheelMultiplier: 0.9 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

$$('[data-top]').forEach((a) =>
  a.addEventListener('click', (e) => {
    e.preventDefault();
    lenis.scrollTo(0, { duration: 6, easing: (x: number) => 1 - Math.pow(1 - x, 3) });
  }),
);

/* ---------- split verses into words ---------- */
for (const el of $$('.split')) {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
    const frag = document.createDocumentFragment();
    for (const part of node.textContent.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) frag.append(' ');
      else {
        const s = document.createElement('span');
        s.className = 'word';
        s.textContent = part;
        frag.append(s);
      }
    }
    node.replaceWith(frag);
  }
  gsap.from($$('.word', el), {
    opacity: 0,
    y: 24,
    rotateX: -60,
    filter: 'blur(8px)',
    stagger: 0.06,
    duration: 1.1,
    ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 85%' },
  });
}

/* ---------- reveals ---------- */
for (const el of $$('.reveal')) {
  gsap.from(el, {
    opacity: 0,
    y: 50,
    duration: 1.2,
    ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 90%' },
  });
}

for (const art of $$('.canto-art')) {
  gsap.fromTo(
    art,
    { opacity: 0, scale: 0.88, y: 120, filter: 'blur(10px)' },
    {
      opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', ease: 'none',
      scrollTrigger: { trigger: art, start: 'top 100%', end: 'top 45%', scrub: 1 },
    },
  );
}

for (const el of $$('.canto-num')) {
  gsap.fromTo(el, { y: 160 }, {
    y: -220, ease: 'none',
    scrollTrigger: { trigger: el.parentElement!, start: 'top bottom', end: 'bottom top', scrub: true },
  });
}

/* ---------- hero parallax ---------- */
for (const el of $$('#selva [data-speed]')) {
  const sp = parseFloat(el.dataset.speed || '0');
  gsap.to(el, { y: sp * 600, ease: 'none', scrollTrigger: { trigger: '#selva', start: 'top top', end: 'bottom top', scrub: true } });
}
gsap.to('.selva-copy', { opacity: 0, y: -120, scale: 0.9, ease: 'none', scrollTrigger: { trigger: '#selva', start: 'top top', end: '80% top', scrub: true } });

/* ---------- pinned scenes ---------- */
const pin = (id: string, len: string) => ({ trigger: id, start: 'top top', end: `+=${len}`, pin: true, scrub: 1, anticipatePin: 1 });

// The gate: inscription, doors open, we fall through
gsap
  .timeline({ scrollTrigger: pin('#puerta', '260%') })
  .from('.gate-line', { opacity: 0, y: 20, stagger: 0.5, duration: 1 })
  .to('.gate-arch-text', { fill: '#ff7a2a', duration: 0.8 })
  .to('.gate-caption', { opacity: 1, duration: 0.6 }, '<')
  .to('.gate-door-l', { scaleX: 0.06, transformOrigin: '0% 50%', duration: 2.4, ease: 'power2.inOut' })
  .to('.gate-door-r', { scaleX: 0.06, transformOrigin: '100% 50%', duration: 2.4, ease: 'power2.inOut' }, '<')
  .fromTo('.gate-glow', { opacity: 0.25 }, { opacity: 1, duration: 2.4 }, '<')
  .to('.gate-caption', { opacity: 0, duration: 0.5 })
  .to('.gate-world', { scale: 5, svgOrigin: '800 650', duration: 2.4, ease: 'power2.in' }, '<')
  .to('.gate-flash', { opacity: 1, duration: 1 }, '-=1')
  .to('#puerta .pin-stage', { opacity: 0, duration: 0.8 });

// Charon ferries the souls across
gsap
  .timeline({ scrollTrigger: pin('#aqueronte', '220%') })
  .fromTo('.ach-boat-track', { x: 260 }, { x: -880, ease: 'none', duration: 4 })
  .to('.ach-farglow', { opacity: 0.95, duration: 4 }, '<')
  .to('.ach-flash', { opacity: 0.75, duration: 0.25 })
  .to('#aqueronte .pin-stage', { x: 14, repeat: 7, yoyo: true, duration: 0.04 }, '<')
  .to('.ach-flash', { opacity: 0, duration: 0.8 });

// Geryon spirals down into the abyss
{
  const beast = $<SVGGElement>('.ger-beast');
  const flip = $<SVGGElement>('.ger-flip');
  const rings = $<SVGGElement>('.ger-rings');
  const place = (p: number) => {
    const a = p * Math.PI * 3.2;
    const c = Math.cos(a);
    const s = 1.5 + 0.3 * c + p * 0.3;
    beast.setAttribute('transform', `translate(${800 + Math.sin(a) * 430} ${250 + p * 380}) scale(${s})`);
    flip.setAttribute('transform', `scale(${Math.sign(c || 1) * Math.max(0.12, Math.abs(c))} 1)`);
    rings.setAttribute('transform', `translate(0 ${-p * 1100})`);
  };
  place(0);
  const st = { p: 0 };
  gsap.to(st, { p: 1, ease: 'none', onUpdate: () => place(st.p), scrollTrigger: pin('#gerion', '320%') });
}

// Giants rise from behind the rim of the well
gsap
  .timeline({ scrollTrigger: pin('#gigantes', '240%') })
  .from('.gi.g1', { y: 760, duration: 2, ease: 'power2.out' })
  .from('.gi.g3', { y: 760, duration: 2, ease: 'power2.out' }, '<0.6')
  .from('.gi.g2', { y: 860, duration: 2.6, ease: 'power2.out' }, '<0.6')
  .to('.gi-shout', { opacity: 1, duration: 0.4 })
  .to('#gigantes .pin-stage', { x: 8, repeat: 9, yoyo: true, duration: 0.04 }, '<')
  .to('.gi-shout', { opacity: 0, duration: 0.8 }, '+=0.6');

// Lucifer looms
{
  const body = $<SVGGElement>('.lu-body');
  const st = { s: 0.6, y: 220 };
  const apply = () => body.setAttribute('transform', `translate(0 ${st.y}) translate(800 700) scale(${st.s}) translate(-800 -700)`);
  apply();
  gsap.to(st, { s: 1.0, y: 60, ease: 'power1.inOut', onUpdate: apply, scrollTrigger: pin('#lucifer', '240%') });
}

// Through the centre of the earth: gravity flips
gsap
  .timeline({ scrollTrigger: pin('#centro', '220%') })
  .fromTo('.ce-climb', { y: -40 }, { y: 760, duration: 3, ease: 'none' })
  .to('.ce-world', { rotation: 180, svgOrigin: '800 450', duration: 1.6, ease: 'power2.inOut' }, 0.7);

/* ---------- pause offscreen animations ---------- */
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      const el = e.target as HTMLElement;
      el.classList.toggle('idle', !e.isIntersecting);
      for (const svg of $$<SVGSVGElement>('svg', el)) {
        if (e.isIntersecting) svg.unpauseAnimations?.();
        else svg.pauseAnimations?.();
      }
    }
  },
  { rootMargin: '30% 0px' },
);
$$('[data-scene]').forEach((s) => io.observe(s));

/* ---------- atmosphere, HUD, particles ---------- */
type Scene = { el: HTMLElement; top: number; h: number; bg: number[]; glow: number[]; mode: string; level: number; label: string };
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

const scenes: Scene[] = $$('[data-scene]').map((el) => ({
  el,
  top: 0,
  h: 1,
  bg: hex(el.dataset.bg || '#050403'),
  glow: hex(el.dataset.glow || '#200800'),
  mode: el.dataset.mode || 'ash',
  level: parseInt(el.dataset.level || '0', 10),
  label: el.dataset.label || '',
}));

let centreMid = 1;
let maxScroll = 1;
const measure = () => {
  for (const s of scenes) {
    const box = s.el.parentElement?.classList.contains('pin-spacer') ? s.el.parentElement : s.el;
    s.top = box.getBoundingClientRect().top + scrollY;
    s.h = box.offsetHeight;
  }
  const c = scenes.find((s) => s.el.id === 'centro');
  // gravity flips at the middle of the rotation in the pinned "centre" scene
  if (c) centreMid = c.top + c.h * 0.5;
  maxScroll = document.documentElement.scrollHeight - innerHeight;
};
ScrollTrigger.addEventListener('refresh', measure);

const root = document.documentElement;
const bar = $('#hud-bar');
const km = $('#hud-km');
const label = $('#hud-label');
const dir = $('#hud-dir');
const dot = $<SVGCircleElement>('#hud-dot');
const bands = $$<SVGPolygonElement>('[data-band]');
const bandLabels = $$<SVGTextElement>('[data-band-label]');

const fx = new Particles($<HTMLCanvasElement>('#fx'));
if (reduce) fx.density = 0.3;

let lastY = scrollY;
let vel = 0;
let lastLevel = -99;
let lastLabel = '';

gsap.ticker.add(() => {
  const y = scrollY;
  vel += (y - lastY - vel) * 0.2;
  lastY = y;
  const centre = y + innerHeight / 2;

  let i = 0;
  while (i < scenes.length - 1 && centre >= scenes[i + 1].top) i++;
  const s = scenes[i];
  const n = scenes[Math.min(i + 1, scenes.length - 1)];
  const t = Math.max(0, Math.min(1, (centre - s.top) / s.h));
  const k = t > 0.7 ? (t - 0.7) / 0.3 : 0;
  const ease = k * k * (3 - 2 * k);

  root.style.setProperty('--bgc', mix(s.bg, n.bg, ease));
  root.style.setProperty('--glow', mix(s.glow, n.glow, ease));

  fx.mode = s.mode;
  fx.scrollVel = vel;

  // HUD
  bar.style.transform = `scaleX(${y / maxScroll})`;
  let depth: number;
  if (y + innerHeight / 2 <= centreMid) {
    const p = Math.min(1, (y + innerHeight / 2) / centreMid);
    depth = 6371 * Math.pow(p, 1.35);
    dir.textContent = 'descendiendo';
  } else {
    const p = Math.min(1, (y + innerHeight / 2 - centreMid) / (maxScroll + innerHeight / 2 - centreMid));
    depth = 6371 * (1 - p);
    dir.textContent = 'ascendiendo · hemisferio sur';
  }
  km.textContent = `${Math.round(depth).toLocaleString('es-ES')} km`;

  if (s.label !== lastLabel) {
    lastLabel = s.label;
    label.textContent = s.label;
  }
  if (s.level !== lastLevel) {
    lastLevel = s.level;
    bands.forEach((b, bi) => {
      b.classList.toggle('on', bi === s.level);
      b.classList.toggle('past', bi < s.level);
    });
    bandLabels.forEach((b, bi) => b.classList.toggle('on', bi === s.level));
  }
  const lv = Math.max(-0.2, Math.min(10.9, s.level + (s.level === n.level ? 0 : t)));
  dot.setAttribute('cy', String(lv * 27 + 12));
});

const loop = (now: number) => {
  fx.tick(now);
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

addEventListener('load', () => ScrollTrigger.refresh());
measure();
