import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Particles, type Palette } from './particles';

gsap.registerPlugin(ScrollTrigger);

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => Array.from(root.querySelectorAll(s)) as T[];

/* ---------- smooth scroll ---------- */
const lenis = new Lenis({ lerp: reduce ? 1 : 0.08, wheelMultiplier: 0.85 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

$$('[data-top]').forEach((a) =>
  a.addEventListener('click', (e) => {
    e.preventDefault();
    lenis.scrollTo(0, { duration: 7, easing: (x: number) => 1 - Math.pow(1 - x, 3) });
  }),
);

/* ---------- verses appear word by word ---------- */
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
    y: 18,
    filter: 'blur(10px)',
    stagger: 0.07,
    duration: 1.3,
    ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 86%' },
  });
}

for (const el of $$('.reveal')) {
  gsap.from(el, { opacity: 0, y: 46, duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
}

for (const el of $$('.scene-num')) {
  gsap.fromTo(el, { y: 140 }, {
    y: -200, ease: 'none',
    scrollTrigger: { trigger: el.parentElement!, start: 'top bottom', end: 'bottom top', scrub: true },
  });
}

/* ---------- engravings emerge from the darkness ---------- */
for (const frame of $$('[data-reveal]')) {
  // the light spreads from the centre of the plate outwards, like an inked proof being lifted
  gsap.fromTo(
    frame,
    { '--r': '0%', opacity: 0.2 },
    {
      '--r': '160%', opacity: 1, ease: 'power2.out',
      scrollTrigger: { trigger: frame, start: 'top 95%', end: 'top 30%', scrub: 1 },
    },
  );
  const img = $('[data-kb]', frame);
  if (img) {
    const scene = frame.closest('section') ?? frame;
    gsap.fromTo(img, { scale: 1.24, yPercent: -3 }, {
      scale: 1.08, yPercent: 3, ease: 'none',
      scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }
}

/* ---------- pinned plates: a camera travelling over the engraving ---------- */
type Cam = { x: number; y: number; s: number; r: number };
type StepData = Cam & { img: string };

for (const sec of $$('[data-pinplate]')) {
  const steps: StepData[] = JSON.parse(sec.dataset.steps || '[]');
  const layers = new Map<string, HTMLImageElement>();
  $$<HTMLImageElement>('[data-layer]', sec).forEach((im) => layers.set(im.dataset.layer!, im));
  const cams = new Map<string, Cam>();
  const size = new Map<string, { W: number; H: number }>();

  const measure = (k: string) => {
    const im = layers.get(k)!;
    const vw = sec.clientWidth;
    const vh = sec.clientHeight;
    const ar = (im.naturalWidth || 4) / (im.naturalHeight || 5);
    const W = Math.max(vw, vh * ar);
    const H = W / ar;
    size.set(k, { W, H });
    im.style.width = `${W}px`;
    im.style.height = `${H}px`;
  };
  const apply = (k: string) => {
    const im = layers.get(k)!;
    const c = cams.get(k)!;
    const sz = size.get(k);
    if (!sz) return;
    const vw = sec.clientWidth;
    const vh = sec.clientHeight;
    const sw = sz.W * c.s;
    const sh = sz.H * c.s;
    let tx = vw / 2 - c.x * sw;
    let ty = vh / 2 - c.y * sh;
    if (!c.r) {
      tx = Math.min(0, Math.max(vw - sw, tx));
      ty = Math.min(0, Math.max(vh - sh, ty));
    }
    im.style.transform = `translate(${vw / 2}px,${vh / 2}px) rotate(${c.r}deg) translate(${-vw / 2}px,${-vh / 2}px) translate(${tx}px,${ty}px) scale(${c.s})`;
  };
  const relayout = () => layers.forEach((_, k) => { measure(k); apply(k); });

  // first appearance of each image defines its starting camera
  steps.forEach((st, i) => {
    if (cams.has(st.img)) return;
    const { img, ...cam } = st;
    cams.set(img, i === 0 ? { ...cam } : { ...cam, s: cam.s * 1.12 });
  });
  layers.forEach((im) => {
    if (im.complete) relayout();
    else im.addEventListener('load', () => { relayout(); }, { once: true });
  });
  addEventListener('resize', relayout);
  relayout();

  const tl = gsap.timeline({
    scrollTrigger: { trigger: sec, start: 'top top', end: `+=${sec.dataset.len}`, pin: true, scrub: 1, anticipatePin: 1 },
  });
  const title = $('[data-pin-title]', sec);
  if (title) tl.to(title, { opacity: 0, y: -40, duration: 0.4 }, 0.15);

  for (let j = 1; j < steps.length; j++) {
    const prev = steps[j - 1];
    const cur = steps[j];
    const { img, ...cam } = cur;
    tl.to(cams.get(img)!, { ...cam, duration: 1, ease: 'power1.inOut', onUpdate: () => apply(img) }, j - 1);
    if (img !== prev.img) {
      tl.to(layers.get(prev.img)!, { opacity: 0, duration: 0.45 }, j - 1 + 0.2);
      tl.fromTo(layers.get(img)!, { opacity: 0 }, { opacity: 1, duration: 0.45, immediateRender: false }, j - 1 + 0.2);
    }
  }
  // captions follow the camera
  const caps = $$('[data-cap]', sec);
  for (const cap of caps) {
    const i = parseInt(cap.dataset.cap!, 10);
    const last = i === steps.length - 1;
    if (i === 0) gsap.set(cap, { opacity: 1 });
    else tl.fromTo(cap, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, immediateRender: false }, i - 0.35);
    if (!last) tl.to(cap, { opacity: 0, y: -16, duration: 0.25 }, i + 0.35);
  }
  tl.to({}, { duration: 0.5 });

  // hero: the title belongs to the first frame only
  const hero = $('.hero-title', sec);
  if (hero) tl.to([hero, $('.scroll-cue', sec)], { opacity: 0, y: -60, duration: 0.5 }, 0);
}

/* ---------- finale: the plate recedes, stars come out ---------- */
{
  const fin = $('#salida');
  if (fin) {
    gsap.fromTo($('.plate', fin), { scale: 1.6, opacity: 0 }, {
      scale: 0.8, opacity: 0.85, ease: 'none',
      scrollTrigger: { trigger: fin, start: 'top bottom', end: 'center center', scrub: true },
    });
    gsap.fromTo($('.finale-verse', fin), { opacity: 0, y: 60 }, {
      opacity: 1, y: 0, ease: 'none',
      scrollTrigger: { trigger: fin, start: 'top 20%', end: 'top -30%', scrub: true },
    });
  }
}

/* ---------- pause offscreen CSS animations ---------- */
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => (e.target as HTMLElement).classList.toggle('idle', !e.isIntersecting)),
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
  bg: hex(el.dataset.bg || '#0a0908'),
  glow: hex(el.dataset.glow || '#1d1912'),
  mode: el.dataset.mode || 'ash',
  level: parseInt(el.dataset.level || '0', 10),
  label: el.dataset.label || '',
}));

let centreMid = 1;
let maxScroll = 1;
const measureScenes = () => {
  for (const s of scenes) {
    const box = s.el.parentElement?.classList.contains('pin-spacer') ? s.el.parentElement : s.el;
    s.top = box.getBoundingClientRect().top + scrollY;
    s.h = box.offsetHeight;
  }
  const c = scenes.find((s) => s.el.id === 'centro');
  if (c) centreMid = c.top + c.h * 0.5;
  maxScroll = document.documentElement.scrollHeight - innerHeight;
};
ScrollTrigger.addEventListener('refresh', measureScenes);

const INK: Palette = {
  ember: '#f6ead0', fire: '#fff3d6', mote: '#efe6d2', dust: '#cdbb94', blood: '#d8c8b0', star: '#f0f4ff', cold: '#e8f0ff',
  wind: '#e9e0cc', icewind: '#eef4ff', rain: '#c8c2b4', bubble: '#b8b0a0', fly: '#cfc4a8', leafFill: '#141210', leafStroke: '#6a6052', ash: '#a8a090',
};

const root = document.documentElement;
const bar = $('#hud-bar');
const km = $('#hud-km');
const label = $('#hud-label');
const dir = $('#hud-dir');
const dot = $<SVGCircleElement>('#hud-dot');
const bands = $$<SVGPolygonElement>('[data-band]');
const bandLabels = $$<SVGTextElement>('[data-band-label]');

const fx = new Particles($<HTMLCanvasElement>('#fx'), INK);
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

  bar.style.transform = `scaleX(${y / maxScroll})`;
  let depth: number;
  if (centre <= centreMid) {
    depth = 6371 * Math.pow(Math.min(1, centre / centreMid), 1.35);
    dir.textContent = 'descendiendo';
  } else {
    depth = 6371 * (1 - Math.min(1, (centre - centreMid) / (maxScroll + innerHeight / 2 - centreMid)));
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
measureScenes();
