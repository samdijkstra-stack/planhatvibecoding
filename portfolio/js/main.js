/* ============================================================
   Mira Solén — Portfolio · interaction layer
   ============================================================ */
import * as THREE from '../vendor/three.module.min.js';
import Lenis from '../vendor/lenis.esm.js';

// GSAP + ScrollTrigger are loaded as UMD globals via <script> tags
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(hover: none)').matches;

/* ------------------------------------------------------------------
   1 · Smooth scroll (Lenis) wired into ScrollTrigger
------------------------------------------------------------------ */
let lenis;
if (!reduceMotion) {
  lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
} else {
  // still register a basic ticker so GSAP runs
  gsap.ticker.lagSmoothing(0);
}

// anchor links → lenis
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 });
    else el.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ------------------------------------------------------------------
   2 · WebGL hero — flowing gradient field (custom shader)
------------------------------------------------------------------ */
function initGL() {
  const canvas = document.getElementById('gl');
  if (!canvas) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch (err) {
    canvas.classList.add('is-dead'); // CSS gradient fallback takes over
    return null;
  }
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime:   { value: 0 },
    uRes:    { value: new THREE.Vector2(1, 1) },
    uMouse:  { value: new THREE.Vector2(0.5, 0.5) },
    uScroll: { value: 0 },
    uColA:   { value: new THREE.Color('#ff4d1c') }, // vermilion
    uColB:   { value: new THREE.Color('#4cc2ff') }, // electric blue
    uColC:   { value: new THREE.Color('#0c0b0a') }, // ink
    uColD:   { value: new THREE.Color('#9b7bff') }, // lilac
  };

  const vert = /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }
  `;

  // 3D simplex noise (Ashima) + fbm → flowing organic gradient
  const frag = /* glsl */`
    precision highp float;
    varying vec2 vUv;
    uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse; uniform float uScroll;
    uniform vec3 uColA, uColB, uColC, uColD;

    vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + 1.0 * C.xxx;
      vec3 x2 = x0 - i2 + 2.0 * C.xxx;
      vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
      i = mod(i, 289.0);
      vec4 p = permute(permute(permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 1.0/7.0;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m*m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    float fbm(vec3 p){
      float f = 0.0, a = 0.5;
      for(int i=0;i<5;i++){ f += a*snoise(p); p *= 2.02; a *= 0.5; }
      return f;
    }
    // cheap hash for grain
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }

    void main(){
      vec2 uv = vUv;
      vec2 p = (uv - 0.5);
      p.x *= uRes.x / uRes.y;
      float t = uTime * 0.06;

      // mouse influence (subtle)
      vec2 m = (uMouse - 0.5); m.x *= uRes.x/uRes.y;
      float md = length(p - m*0.6);

      // domain-warped fbm
      vec3 q = vec3(p * 1.4, t);
      float warp = fbm(q + vec3(uScroll*0.6));
      float n = fbm(q + warp + vec3(0.0, 0.0, t*1.3) - md*0.4);
      n = n * 0.5 + 0.5;

      float n2 = fbm(q*2.1 - warp*0.6 + vec3(t*0.8));
      n2 = n2 * 0.5 + 0.5;

      // colour ramp through 4 brand colours
      vec3 col = mix(uColC, uColA, smoothstep(0.25, 0.75, n));
      col = mix(col, uColB, smoothstep(0.45, 0.95, n2) * 0.65);
      col = mix(col, uColD, smoothstep(0.6, 1.0, n*n2) * 0.4);

      // deepen toward edges → keeps text legible
      float vig = smoothstep(1.15, 0.25, length(uv-0.5)*1.4);
      col *= mix(0.35, 1.0, vig);

      // darken on scroll so the section dissolves into ink
      col = mix(col, uColC, clamp(uScroll*1.1, 0.0, 0.9));

      // glow seam
      float seam = smoothstep(0.5, 0.52, n) - smoothstep(0.52, 0.56, n);
      col += uColA * seam * 0.5 * vig;

      // grain
      float g = hash(uv * uRes + t*60.0);
      col += (g - 0.5) * 0.045;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w * DPR, h * DPR);
  }
  resize();
  window.addEventListener('resize', resize);

  // mouse → smoothed uniform
  const target = { x: 0.5, y: 0.5 };
  window.addEventListener('pointermove', (e) => {
    target.x = e.clientX / window.innerWidth;
    target.y = 1 - e.clientY / window.innerHeight;
  });

  // pause render when hero off-screen
  let visible = true;
  ScrollTrigger.create({
    trigger: '#hero', start: 'top bottom', end: 'bottom top',
    onToggle: (self) => { visible = self.isActive; },
    onUpdate: (self) => { uniforms.uScroll.value = self.progress; },
  });

  const clock = new THREE.Clock();
  function render() {
    if (visible) {
      uniforms.uTime.value = clock.getElapsedTime();
      uniforms.uMouse.value.x += (target.x - uniforms.uMouse.value.x) * 0.04;
      uniforms.uMouse.value.y += (target.y - uniforms.uMouse.value.y) * 0.04;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(render);
  }
  if (reduceMotion) { uniforms.uTime.value = 8.0; renderer.render(scene, camera); }
  else render();

  return { renderer };
}

/* ------------------------------------------------------------------
   3 · Custom cursor (magnetic + label states)
------------------------------------------------------------------ */
function initCursor() {
  if (isTouch) return;
  const cursor = document.querySelector('.cursor');
  const dot = document.querySelector('.cursor__dot');
  const ring = document.querySelector('.cursor__ring');
  const label = document.querySelector('.cursor__label');

  const pos = { x: window.innerWidth/2, y: window.innerHeight/2 };
  const ringPos = { ...pos };
  window.addEventListener('pointermove', (e) => { pos.x = e.clientX; pos.y = e.clientY; });

  gsap.ticker.add(() => {
    dot.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%,-50%)`;
    ringPos.x += (pos.x - ringPos.x) * 0.18;
    ringPos.y += (pos.y - ringPos.y) * 0.18;
    ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px) translate(-50%,-50%)`;
  });

  document.querySelectorAll('[data-cursor]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      const txt = el.getAttribute('data-cursor');
      if (txt) { cursor.classList.add('is-label'); label.textContent = txt; }
      else { cursor.classList.add('is-hover'); }
    });
    el.addEventListener('mouseleave', () => { cursor.classList.remove('is-hover', 'is-label'); });
  });
}

/* ------------------------------------------------------------------
   4 · Preloader
------------------------------------------------------------------ */
function runLoader(onDone) {
  const loader = document.getElementById('loader');
  const numEl = document.getElementById('loaderNum');
  const fill = document.getElementById('loaderFill');

  gsap.set('.loader__meta span', { yPercent: 120 });
  gsap.to('.loader__meta span', { yPercent: 0, duration: .9, ease: 'power3.out', stagger: .1, delay: .15 });

  const counter = { v: 0 };
  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
  tl.to(counter, {
    v: 100, duration: reduceMotion ? 0.2 : 1.9, ease: 'power2.inOut',
    onUpdate: () => { numEl.textContent = Math.round(counter.v); fill.style.width = counter.v + '%'; },
  });
  tl.to(loader, { yPercent: -100, duration: 1.0, ease: 'expo.inOut' }, '+=0.15');
  tl.set(loader, { display: 'none' });
  tl.add(() => { document.body.classList.remove('is-loading'); onDone && onDone(); }, '-=0.5');
}

/* ------------------------------------------------------------------
   5 · Hero intro reveal
------------------------------------------------------------------ */
function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.hero__eyebrow .reveal-line > span', { yPercent: 120, duration: 1, stagger: .08 })
    .from('.hero__title .word', { yPercent: 120, duration: 1.2, stagger: .07 }, '-=0.7')
    .from('.hero__blurb span', { yPercent: 110, duration: 1, }, '-=0.9')
    .from('.hero__scroll', { autoAlpha: 0, y: 14, duration: .8 }, '-=0.8')
    .from('.nav', { autoAlpha: 0, y: -14, duration: .8 }, '-=0.9')
    .from('.hero__index span', { autoAlpha: 0, x: 14, duration: .7, stagger: .08 }, '-=0.8');
  return tl;
}

/* ------------------------------------------------------------------
   6 · Scroll-driven reveals
------------------------------------------------------------------ */
function scrollReveals() {
  // hero parallax on scroll
  gsap.to('.hero__content', {
    yPercent: -18, opacity: 0.4, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  // section titles
  gsap.utils.toArray('[data-reveal-title]').forEach((el) => {
    gsap.from(el, {
      yPercent: 110, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  // generic reveal blocks
  gsap.utils.toArray('[data-reveal]').forEach((el, i) => {
    gsap.from(el, {
      y: 40, autoAlpha: 0, duration: 1, ease: 'power3.out', delay: (i % 4) * 0.05,
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  // manifesto word-by-word
  const man = document.querySelector('[data-words]');
  if (man) {
    const words = man.textContent.trim().split(/\s+/);
    man.innerHTML = words.map((w) => `<span class="word-w">${w}</span>`).join(' ');
    // re-apply emphasis on the styled word
    man.querySelectorAll('.word-w').forEach((s) => { if (s.textContent === 'discovered.') s.innerHTML = '<em>discovered.</em>'; });
    gsap.to(man.querySelectorAll('.word-w'), {
      opacity: 1, ease: 'none', stagger: 0.04,
      scrollTrigger: { trigger: man, start: 'top 80%', end: 'bottom 55%', scrub: 1 },
    });
  }

  // stat counters
  gsap.utils.toArray('[data-count]').forEach((el) => {
    const end = +el.getAttribute('data-count');
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(obj, { v: end, duration: 1.8, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(obj.v); } }),
    });
  });

  // project rows enter
  gsap.utils.toArray('.project').forEach((el) => {
    gsap.from(el, {
      yPercent: 60, autoAlpha: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%' },
    });
  });

  // capability rows
  gsap.utils.toArray('.cap').forEach((el) => {
    gsap.from(el.children, {
      y: 30, autoAlpha: 0, duration: .9, ease: 'power3.out', stagger: .06,
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  // award rows
  gsap.utils.toArray('.award').forEach((el) => {
    gsap.from(el, {
      autoAlpha: 0, x: -24, duration: .8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%' },
    });
  });

  // contact big lines
  gsap.from('.contact__big-line', {
    yPercent: 110, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: .1,
    scrollTrigger: { trigger: '.contact', start: 'top 70%' },
  });

  // marquee scroll velocity skew
  const track = document.getElementById('marquee');
  if (track) {
    gsap.to(track, {
      xPercent: -50, ease: 'none',
      scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: 0.6 },
    });
  }
}

/* ------------------------------------------------------------------
   7 · Project hover preview (cursor-following)
------------------------------------------------------------------ */
function projectPreview() {
  if (isTouch) return;
  const preview = document.getElementById('preview');
  const inner = document.getElementById('previewInner');
  if (!preview) return;

  const gradients = {
    lumen:   'radial-gradient(120% 120% at 20% 10%, #ff7a4d, #ff4d1c 45%, #7a1d05)',
    halcyon: 'radial-gradient(120% 120% at 80% 20%, #8fe0ff, #4cc2ff 45%, #0d3a5c)',
    verdant: 'radial-gradient(120% 120% at 30% 80%, #c3b0ff, #9b7bff 45%, #3a2a72)',
    sonder:  'radial-gradient(120% 120% at 70% 30%, #ffd98a, #ffba49 45%, #7a5310)',
    atlas:   'radial-gradient(120% 120% at 40% 70%, #84efc0, #2ecf91 45%, #114d36)',
  };

  const px = { x: window.innerWidth/2, y: window.innerHeight/2 };
  let raf = 0;
  function loop() {
    preview.style.transform = `translate(${px.x}px, ${px.y}px) translate(-50%,-50%) scale(var(--s,1))`;
    raf = requestAnimationFrame(loop);
  }

  document.querySelectorAll('.project').forEach((row) => {
    row.addEventListener('mouseenter', () => {
      const key = row.getAttribute('data-img');
      inner.style.background = gradients[key] || '#222';
      inner.setAttribute('data-name', row.querySelector('.project__title').textContent);
      gsap.to(preview, { autoAlpha: 1, duration: .5, ease: 'power3.out', '--s': 1, overwrite: true });
      if (!raf) loop();
    });
    row.addEventListener('mousemove', (e) => { px.x = e.clientX; px.y = e.clientY; });
    row.addEventListener('mouseleave', () => {
      gsap.to(preview, { autoAlpha: 0, duration: .4, ease: 'power2.out', '--s': 0.85, overwrite: true });
    });
  });
  // init transform var
  gsap.set(preview, { '--s': 0.85 });
}

/* ------------------------------------------------------------------
   8 · Magnetic contact button
------------------------------------------------------------------ */
function magnetic() {
  if (isTouch) return;
  document.querySelectorAll('#magnet').forEach((el) => {
    const strength = 0.35;
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width/2)) * strength;
      const y = (e.clientY - (r.top + r.height/2)) * strength;
      gsap.to(el, { x, y, duration: .6, ease: 'power3.out' });
    });
    el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1, 0.3)' }));
  });
}

/* ------------------------------------------------------------------
   9 · Live clocks (Lisbon / WET — UTC+1 in summer)
------------------------------------------------------------------ */
function clocks() {
  const a = document.getElementById('clock');
  const b = document.getElementById('clock2');
  function tick() {
    const t = new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Lisbon', hour12: false });
    if (a) a.textContent = t;
    if (b) b.textContent = t;
  }
  tick(); setInterval(tick, 1000);
}

/* ------------------------------------------------------------------
   Boot
------------------------------------------------------------------ */
window.addEventListener('DOMContentLoaded', () => {
  initGL();
  initCursor();
  scrollReveals();
  projectPreview();
  magnetic();
  clocks();
  ScrollTrigger.refresh();

  if (reduceMotion) {
    document.body.classList.remove('is-loading');
    document.getElementById('loader').style.display = 'none';
    gsap.set('.hero__eyebrow .reveal-line > span, .hero__title .word, .hero__blurb span', { yPercent: 0 });
  } else {
    runLoader(() => { heroIntro(); });
  }
});

// keep ScrollTrigger correct after full load (fonts/images)
window.addEventListener('load', () => ScrollTrigger.refresh());
