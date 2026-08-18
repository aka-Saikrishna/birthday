/* ═══════════════════════════════════════════════════════════════════
   SIXTEEN LIGHTS — the world

   One persistent WebGL scene that the page scrolls *through*:

     · a domain-warped nebula shader painted behind everything
     · sixteen memory frames on a slow spiral down the −Z axis,
       each one a displaced plane with chromatic split and a gold rim
     · the focused memory streams its clip in as a live video texture
     · drifting motes whose motif changes with the act
     · a volumetric heart of ~3000 points for the opening and the finale
     · a hand-rolled post chain: bright pass → separable blur → composite
       with radial aberration, grain and vignette

   motion.js is the conductor; this file only ever reacts.
   ═══════════════════════════════════════════════════════════════════ */
window.ForeverWorld = (function () {
  'use strict';

  const CH = window.SIXTEEN.CHAPTERS;
  const N = CH.length;

  const SPACING   = 9.0;    /* world units between memories            */
  const LEAD      = 6.6;    /* how far in front of the focused memory
                               the camera stands — without this you fly
                               past each frame side-on instead of into it */
  const FRAME_W   = 5.2;
  const FRAME_H   = FRAME_W * 9 / 16;
  const END_Z     = 4.0 - (N - 1) * SPACING;
  const HEART_HOME = 5.0;            /* floating in front of the hero    */
  const HEART_END  = END_Z - 2.0;    /* waiting at the end of the world  */

  /* The heart curve spans ±16 sideways, hangs to −17 at its point but only
     rises to +11.92 at the lobes, all built at HEART_S per unit. Because it
     is lopsided, sizing it around its own origin wastes the headroom above
     the lobes — so the finale lifts it by HEART_RC to sit centred, and then
     only has to fit HEART_RH in each direction. HEART_OVER is how far past
     that we push it: 1.0 lands the point and lobes exactly on the edges, and
     1.402 gives the 2.00× used here, which bleeds the heart off the top and
     bottom on purpose. Expressed against the fit rather than as a flat number
     so a phone scales with its own frustum instead of being swamped. */
  const HEART_S    = 0.082;
  const HEART_RX   = 16 * HEART_S;
  const HEART_RY   = 17 * HEART_S;
  const HEART_RT   = 11.9233 * HEART_S;
  const HEART_RH   = (HEART_RY + HEART_RT) / 2;
  const HEART_RC   = (HEART_RY - HEART_RT) / 2;
  const HEART_OVER = 1.402;

  /* The focused memory is aimed up and to the right of centre so the
     caption always has the lower-left quarter of the screen to itself.
     AIM is how hard the camera turns toward it: the higher it is, the
     less the memory's position on the spiral is allowed to drag the
     composition around — at 0.55 chapter 11 wandered over the caption. */
  const COMPOSE = [-1.0, -0.55];
  const AIM     = 0.72;

  /* ── GLSL shared chunks ──────────────────────────────────────── */

  const NOISE = `
    vec3 hash33(vec3 p){
      p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
               dot(p, vec3(269.5, 183.3, 246.1)),
               dot(p, vec3(113.5, 271.9, 124.6)));
      return fract(sin(p) * 43758.5453123) * 2.0 - 1.0;
    }
    float vnoise(vec3 p){
      vec3 i = floor(p), f = fract(p);
      vec3 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(dot(hash33(i + vec3(0,0,0)), f - vec3(0,0,0)),
                         dot(hash33(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                     mix(dot(hash33(i + vec3(0,1,0)), f - vec3(0,1,0)),
                         dot(hash33(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
                 mix(mix(dot(hash33(i + vec3(0,0,1)), f - vec3(0,0,1)),
                         dot(hash33(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                     mix(dot(hash33(i + vec3(0,1,1)), f - vec3(0,1,1)),
                         dot(hash33(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
    }
    float fbm(vec3 p){
      float a = 0.5, s = 0.0;
      for (int i = 0; i < 4; i++){ s += a * vnoise(p); p *= 2.03; a *= 0.5; }
      return s * 0.5 + 0.5;
    }
    float grain(vec2 uv, float t){
      return fract(sin(dot(uv * (1.0 + t), vec2(12.9898, 78.233))) * 43758.5453);
    }`;

  const QUAD_VERT = `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

  /* ── 1 · nebula ──────────────────────────────────────────────── */

  const BG_FRAG = NOISE + `
    varying vec2 vUv;
    uniform vec2  uRes;
    uniform float uTime;
    uniform vec3  uA;
    uniform vec3  uB;
    uniform vec2  uMouse;
    uniform float uEnergy;
    uniform vec3  uRipple;   /* xy = origin, z = age 0..1 (>1 = spent) */

    void main(){
      float ar = uRes.x / max(uRes.y, 1.0);
      vec2  p  = (vUv - 0.5) * vec2(ar, 1.0);
      float t  = uTime * 0.035;

      /* two rounds of domain warping — silk, not smoke */
      vec2 q = vec2(fbm(vec3(p * 1.35, t)), fbm(vec3(p * 1.35 + 4.7, t)));
      vec2 r = vec2(fbm(vec3(p * 2.1 + q * 1.6 + 1.3, t * 1.4)),
                    fbm(vec3(p * 2.1 + q * 1.6 + 9.2, t * 1.4)));
      float f = fbm(vec3(p * 2.6 + r * 1.9, t * 1.8));

      vec3 col = mix(uB * 0.55, uA, smoothstep(0.22, 0.92, f));
      col = mix(col, uA * 1.25, pow(smoothstep(0.55, 1.0, f), 3.0) * 0.6);

      /* the light we are always travelling toward */
      float d = length(p * vec2(0.92, 1.22));
      col += uA * 0.5 * exp(-d * 2.3) * (0.72 + 0.28 * sin(uTime * 0.5));
      col += uA * 0.28 * uEnergy * exp(-d * 4.5);

      /* pointer aurora */
      float md = length(p - uMouse * vec2(ar, 1.0));
      col += uA * 0.22 * exp(-md * 3.6);

      /* click ripple */
      if (uRipple.z < 1.0){
        float rr  = length(p - uRipple.xy * vec2(ar, 1.0));
        float age = uRipple.z;
        col += uA * 1.1 * smoothstep(0.09, 0.0, abs(rr - age * 1.35)) * (1.0 - age);
      }

      col *= 1.0 - 0.62 * smoothstep(0.3, 1.15, d);
      col *= 0.34;
      col += (grain(vUv, uTime) - 0.5) * 0.012;

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`;

  /* ── 2 · memory frame ────────────────────────────────────────── */

  const FRAME_VERT = `
    uniform float uTime;
    uniform float uWarp;
    uniform float uFocus;
    varying vec2  vUv;
    varying float vDepth;

    void main(){
      vUv = uv;
      vec3 p = position;

      /* a slow silk ripple, amplified by scroll velocity */
      float w = sin(p.x * 1.7 + uTime * 1.15) * 0.055
              + sin(p.y * 2.6 - uTime * 0.85) * 0.04;
      p.z += w * (0.35 + uWarp * 2.2);

      /* gentle cylindrical bow so the frame hugs the flight path —
         kept shallow, because a steep curve smears the handwriting */
      p.z -= pow(abs(uv.x - 0.5) * 2.0, 2.0) * 0.26;
      p.xy *= 1.0 + uFocus * 0.06;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vDepth  = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`;

  const FRAME_FRAG = NOISE + `
    uniform sampler2D uMap;
    uniform vec2  uCover;
    uniform vec2  uTexel;   /* 1 / source resolution, for the unsharp mask */
    uniform vec2  uSize;
    uniform vec3  uTint;
    uniform vec3  uFogColor;
    uniform float uFogDensity;
    uniform float uFocus;
    uniform float uSplit;
    uniform float uTime;
    uniform float uOpacity;
    varying vec2  vUv;
    varying float vDepth;

    float sdBox(vec2 p, vec2 b, float r){
      vec2 q = abs(p) - b + r;
      return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    }

    void main(){
      vec2 uvc = (vUv - 0.5) * uCover + 0.5;
      uvc += (vUv - 0.5) * (0.008 * sin(uTime * 0.45)) * (1.0 - uFocus);

      float s = uSplit;
      vec3 col;
      col.r = texture2D(uMap, uvc + vec2( s, 0.0)).r;
      col.g = texture2D(uMap, uvc).g;
      col.b = texture2D(uMap, uvc + vec2(-s, 0.0)).b;

      /* Unsharp mask on whatever you're actually looking at. The clips
         have handwriting composited into them, and a soft 16:9 texture
         stretched over a curved plane loses it entirely without this. */
      vec3 soft = ( texture2D(uMap, uvc + vec2(uTexel.x, 0.0)).rgb
                  + texture2D(uMap, uvc - vec2(uTexel.x, 0.0)).rgb
                  + texture2D(uMap, uvc + vec2(0.0, uTexel.y)).rgb
                  + texture2D(uMap, uvc - vec2(0.0, uTexel.y)).rgb ) * 0.25;
      col += (col - soft) * (0.85 * uFocus);

      /* memories at the edge of attention drain to the act's colour */
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(lum) * uTint * 1.5, col, 0.3 + 0.7 * uFocus);

      /* and the one in focus gets its contrast and colour back */
      col = mix(col, col * col * (3.0 - 2.0 * col), 0.3 * uFocus);
      col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.0 + 0.18 * uFocus);
      col *= mix(0.4, 1.24, uFocus);

      vec2  local = (vUv - 0.5) * uSize;
      float sd    = sdBox(local, uSize * 0.5, 0.16);
      float mask  = 1.0 - smoothstep(-0.012, 0.012, sd);
      float rim   = smoothstep(0.075, 0.0, abs(sd + 0.012));

      col += uTint * rim * (0.5 + 1.5 * uFocus);
      col *= 1.0 - 0.3 * pow(length((vUv - 0.5) * 2.0), 2.4);
      col += (grain(vUv, uTime * 0.5) - 0.5) * 0.03 * (1.0 - 0.5 * uFocus);

      float fog = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
      col = mix(col, uFogColor, clamp(fog, 0.0, 1.0));

      float a = mask * uOpacity * (1.0 - clamp(fog, 0.0, 1.0) * 0.92);
      if (a < 0.004) discard;
      gl_FragColor = vec4(col, a);
    }`;

  /* ── 3 · motes ───────────────────────────────────────────────── */

  const MOTE_VERT = `
    attribute vec3  aSeed;
    attribute float aSize;
    uniform float uTime;
    uniform float uScale;   /* half the drawing-buffer height, in device px */
    uniform float uSpan;
    varying float vAlpha;
    varying float vSeed;

    void main(){
      vec3 p = position;
      p.x += sin(uTime * (0.16 + aSeed.x * 0.3) + aSeed.y * 6.283) * (0.5 + aSeed.z * 1.6);
      p.y  = mod(p.y + uTime * (0.1 + aSeed.z * 0.4), uSpan) - uSpan * 0.5;
      p.z += cos(uTime * (0.12 + aSeed.y * 0.2) + aSeed.x * 6.283) * 0.7;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      float d = -mv.z;
      gl_PointSize = min(aSize * uScale / max(d, 0.5), 40.0);
      gl_Position  = projectionMatrix * mv;

      vSeed  = aSeed.x;
      vAlpha = smoothstep(0.5, 5.0, d) * (1.0 - smoothstep(26.0, 44.0, d));
    }`;

  const MOTE_FRAG = `
    uniform vec3  uTint;
    uniform float uTime;
    uniform float uRing;
    uniform float uPulse;
    uniform float uStretch;
    uniform float uOpacity;
    varying float vAlpha;
    varying float vSeed;

    void main(){
      vec2 pc = (gl_PointCoord - 0.5) * vec2(1.0 + uStretch, 1.0 - uStretch * 0.35);
      float d = length(pc);

      float soft = smoothstep(0.5, 0.0, d);
      float ring = smoothstep(0.5, 0.4, d) * smoothstep(0.24, 0.4, d) * 1.6
                 + smoothstep(0.4, 0.0, d) * 0.22;
      float a = mix(soft, ring, uRing);

      float pulse = 0.55 + 0.45 * sin(uTime * 2.6 + vSeed * 40.0);
      a *= mix(1.0, pulse, uPulse);
      a *= vAlpha * uOpacity;
      if (a < 0.004) discard;

      vec3 col = mix(uTint, vec3(1.0, 0.94, 0.86), 0.35 * soft);
      gl_FragColor = vec4(col, a);
    }`;

  /* ── 4 · the heart ───────────────────────────────────────────── */

  const HEART_VERT = `
    attribute vec3  aScatter;
    attribute float aSeed;
    uniform float uTime;
    uniform float uForm;
    uniform float uBurst;
    uniform float uSize;
    uniform float uScale;   /* half the drawing-buffer height, in device px */
    varying float vY;
    varying float vSeed;
    varying float vAlpha;

    void main(){
      vec3 heart = position;
      vec3 p = mix(aScatter, heart, uForm);

      /* heartbeat — two quick systoles per cycle */
      float beat = pow(abs(sin(uTime * 1.15)), 12.0) * 0.06
                 + pow(abs(sin(uTime * 1.15 + 0.42)), 18.0) * 0.035;
      p *= uSize * (1.0 + beat * uForm);

      p += normalize(heart + 0.0001) * uBurst * (1.6 + aSeed * 9.0);
      p.x += sin(uTime * 0.7 + aSeed * 12.0) * 0.035;
      p.y += cos(uTime * 0.6 + aSeed * 9.0) * 0.035;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = min((0.022 + aSeed * 0.042) * uScale / max(-mv.z, 0.5), 34.0);
      gl_Position  = projectionMatrix * mv;

      vY     = heart.y;
      vSeed  = aSeed;
      vAlpha = 1.0 - smoothstep(0.0, 1.0, uBurst);
    }`;

  const HEART_FRAG = `
    uniform vec3  uTint;
    uniform float uOpacity;
    uniform float uTime;
    varying float vY;
    varying float vSeed;
    varying float vAlpha;

    void main(){
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d);
      a *= 0.45 + 0.55 * (0.5 + 0.5 * sin(uTime * 2.2 + vSeed * 30.0));
      a *= uOpacity * vAlpha;
      if (a < 0.004) discard;

      vec3 warm = vec3(1.0, 0.86, 0.62);
      vec3 col  = mix(uTint * 1.4, warm, smoothstep(-1.2, 1.0, vY) * 0.7);
      gl_FragColor = vec4(col, a);
    }`;

  /* ── 5 · post chain ──────────────────────────────────────────── */

  const BRIGHT_FRAG = `
    varying vec2 vUv;
    uniform sampler2D tMap;
    uniform float uThreshold;
    void main(){
      vec3 c = texture2D(tMap, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      float k = smoothstep(uThreshold, uThreshold + 0.32, l);
      gl_FragColor = vec4(c * k, 1.0);
    }`;

  const BLUR_FRAG = `
    varying vec2 vUv;
    uniform sampler2D tMap;
    uniform vec2 uDir;
    void main(){
      vec3 s = texture2D(tMap, vUv).rgb * 0.2270270270;
      s += texture2D(tMap, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
      s += texture2D(tMap, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
      s += texture2D(tMap, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
      s += texture2D(tMap, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
      gl_FragColor = vec4(s, 1.0);
    }`;

  const COMP_FRAG = NOISE + `
    varying vec2 vUv;
    uniform sampler2D tScene;
    uniform sampler2D tBloom;
    uniform float uBloom;
    uniform float uAber;
    uniform float uTime;
    uniform float uVignette;
    uniform float uFade;
    uniform vec3  uTint;

    void main(){
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);

      /* radial chromatic aberration, strongest under speed */
      vec2 off = c * (uAber * (0.35 + r2 * 2.4));
      vec3 col;
      col.r = texture2D(tScene, vUv + off).r;
      col.g = texture2D(tScene, vUv).g;
      col.b = texture2D(tScene, vUv - off).b;

      col += texture2D(tBloom, vUv).rgb * uBloom;

      /* a whisper of the act's colour through the highlights — a whisper,
         not a wash, or every photograph turns the same shade of amber */
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, col * uTint * 1.22, smoothstep(0.45, 1.0, l) * 0.16);

      col *= 1.0 - uVignette * smoothstep(0.16, 0.72, r2);

      /* a soft shoulder instead of a hard clip — highlights roll, never
         blow, but the toe stays low so photographs keep their blacks */
      col = max(col, 0.0);
      col = col / (col + vec3(0.82)) * 1.75;
      col = pow(col, vec3(1.2));

      col += (grain(vUv, fract(uTime)) - 0.5) * 0.035;
      col *= uFade;

      gl_FragColor = vec4(col, 1.0);
    }`;

  /* ── state ───────────────────────────────────────────────────── */

  const state = {
    progress: 0, velocity: 0,
    hero: 1, tail: 0, finale: 0,
    mouse: new THREE.Vector2(0, 0),
    mouseT: new THREE.Vector2(0, 0),
    fade: 0,
    energy: 0,
    focus: 0
  };

  let renderer, camera, scene, clock;
  let bgScene, bgCam, bgMat, quadGeo;
  let postScene, postCam, postQuad, brightMat, blurMat, compMat;
  let rtScene, rtA, rtB;
  let frames = [], motes, moteMat, heart, heartMat;
  let raf = 0, alive = false, visible = true, ready = false;
  let dpr = 1, W = 1, H = 1, lowPower = false, lastT = 0;
  const tintA = new THREE.Color(), tintB = new THREE.Color(), fogCol = new THREE.Color();
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), tmp = new THREE.Vector3();
  const ripple = new THREE.Vector3(0, 0, 2);
  let onProgress = null;

  /* video pool — one live clip at a time */
  const pool = { el: null, tex: null, index: -1, want: -1, since: 0 };

  /* ── geometry helpers ────────────────────────────────────────── */

  /* Where memory i sits on the spiral. */
  function framePlace(i, out) {
    const a = i * 0.86 + 0.35;
    const rad = 3.05 + Math.sin(i * 1.27) * 0.42;
    return out.set(Math.cos(a) * rad, Math.sin(a) * rad * 0.52, 4.0 - i * SPACING);
  }

  /* A volumetric heart, biased toward its surface. */
  function heartCloud(count) {
    const pos = new Float32Array(count * 3);
    const sct = new Float32Array(count * 3);
    const sed = new Float32Array(count);
    const S = HEART_S;

    for (let i = 0; i < count; i++) {
      const t = Math.random() * Math.PI * 2;
      const k = Math.pow(Math.random(), 0.32);
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const puff = 5.4 * Math.sqrt(Math.max(0, 1 - k * k)) * (0.5 + 0.5 * Math.random());

      pos[i * 3]     = x * k * S;
      pos[i * 3 + 1] = y * k * S;
      pos[i * 3 + 2] = (Math.random() * 2 - 1) * puff * S;

      const u = Math.random() * Math.PI * 2, v = Math.acos(Math.random() * 2 - 1);
      const rr = 3.2 + Math.random() * 5.5;
      sct[i * 3]     = Math.sin(v) * Math.cos(u) * rr;
      sct[i * 3 + 1] = Math.sin(v) * Math.sin(u) * rr;
      sct[i * 3 + 2] = Math.cos(v) * rr * 0.7;

      sed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aScatter', new THREE.BufferAttribute(sct, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(sed, 1));
    return g;
  }

  /* ── build ───────────────────────────────────────────────────── */

  function build(canvas) {
    try {
      renderer = new THREE.WebGLRenderer({
        canvas, antialias: false, alpha: false, powerPreference: 'high-performance'
      });
    } catch (e) { return false; }
    if (!renderer.getContext()) return false;

    lowPower = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
    dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.75);

    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.autoClear = false;
    renderer.setClearColor(0x08060d, 1);

    clock  = new THREE.Clock();
    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(48, 1, 0.1, 240);

    quadGeo = new THREE.PlaneGeometry(2, 2);

    /* nebula */
    bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    bgScene = new THREE.Scene();
    bgMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: BG_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        uRes:    { value: new THREE.Vector2(1, 1) },
        uTime:   { value: 0 },
        uA:      { value: new THREE.Color(0.77, 0.54, 0.29) },
        uB:      { value: new THREE.Color(0.09, 0.06, 0.1) },
        uMouse:  { value: new THREE.Vector2() },
        uEnergy: { value: 0 },
        uRipple: { value: ripple }
      }
    });
    bgScene.add(new THREE.Mesh(quadGeo, bgMat));

    /* post */
    postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postScene = new THREE.Scene();
    brightMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: BRIGHT_FRAG, depthTest: false, depthWrite: false,
      uniforms: { tMap: { value: null }, uThreshold: { value: 0.74 } }
    });
    blurMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false,
      uniforms: { tMap: { value: null }, uDir: { value: new THREE.Vector2() } }
    });
    compMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: COMP_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tScene:    { value: null },
        tBloom:    { value: null },
        uBloom:    { value: 0.85 },
        uAber:     { value: 0 },
        uTime:     { value: 0 },
        uVignette: { value: 0.62 },
        uFade:     { value: 0 },
        uTint:     { value: new THREE.Color(1, 1, 1) }
      }
    });
    postQuad = new THREE.Mesh(quadGeo, compMat);
    postScene.add(postQuad);

    return true;
  }

  function buildFrames(manager) {
    const loader = new THREE.TextureLoader(manager);
    const geo = new THREE.PlaneGeometry(FRAME_W, FRAME_H, 36, 24);
    const place = new THREE.Vector3();

    for (let i = 0; i < N; i++) {
      const ch = CH[i];
      const tex = loader.load(ch.still, (t) => {
        const m = frames[i];
        if (m && t.image) m.material.uniforms.uTexel.value.set(1 / t.image.width, 1 / t.image.height);
      });
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;

      const mat = new THREE.ShaderMaterial({
        vertexShader: FRAME_VERT, fragmentShader: FRAME_FRAG,
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: {
          uMap:        { value: tex },
          uCover:      { value: new THREE.Vector2(1, 1) },
          uTexel:      { value: new THREE.Vector2(1 / 1280, 1 / 720) },
          uSize:       { value: new THREE.Vector2(FRAME_W, FRAME_H) },
          uTint:       { value: new THREE.Color(ch.tint[0], ch.tint[1], ch.tint[2]) },
          uFogColor:   { value: new THREE.Color(0.03, 0.02, 0.05) },
          uFogDensity: { value: 0.0165 },
          uFocus:      { value: 0 },
          uSplit:      { value: 0 },
          uWarp:       { value: 0 },
          uTime:       { value: 0 },
          uOpacity:    { value: 1 }
        }
      });

      const mesh = new THREE.Mesh(geo, mat);
      framePlace(i, place);
      mesh.position.copy(place);
      mesh.lookAt(0, 0, place.z + 2.4);
      mesh.userData.still = tex;
      mesh.userData.op = 1;
      scene.add(mesh);
      frames.push(mesh);
    }
  }

  function buildMotes() {
    const count = lowPower ? 2600 : 7000;
    const span  = 20;
    const depth = (N - 1) * SPACING + 40;
    const pos = new Float32Array(count * 3);
    const sed = new Float32Array(count * 3);
    const siz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.4 + Math.pow(Math.random(), 0.6) * 8.2;
      pos[i * 3]     = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.random() * span;
      pos[i * 3 + 2] = 8 - Math.random() * depth;
      sed[i * 3]     = Math.random();
      sed[i * 3 + 1] = Math.random();
      sed[i * 3 + 2] = Math.random();
      siz[i] = 0.012 + Math.pow(Math.random(), 2.2) * 0.085;   /* world units */
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(sed, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));

    moteMat = new THREE.ShaderMaterial({
      vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime:    { value: 0 },
        uScale:   { value: 400 },
        uSpan:    { value: span },
        uTint:    { value: new THREE.Color(0.8, 0.6, 0.35) },
        uRing:    { value: 0 },
        uPulse:   { value: 0 },
        uStretch: { value: 0 },
        uOpacity: { value: 0.85 }
      }
    });

    motes = new THREE.Points(g, moteMat);
    motes.frustumCulled = false;
    scene.add(motes);
  }

  function buildHeart() {
    heartMat = new THREE.ShaderMaterial({
      vertexShader: HEART_VERT, fragmentShader: HEART_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime:    { value: 0 },
        uForm:    { value: 1 },
        uBurst:   { value: 0 },
        uSize:    { value: 1 },
        uScale:   { value: 400 },
        uTint:    { value: new THREE.Color(0.88, 0.44, 0.52) },
        uOpacity: { value: 0 }
      }
    });
    heart = new THREE.Points(heartCloud(lowPower ? 1500 : 3400), heartMat);
    heart.frustumCulled = false;
    heart.position.set(0, 0.1, HEART_HOME);
    scene.add(heart);
  }

  /* ── video texture for the focused memory ────────────────────── */

  function makePool() {
    const host = document.getElementById('videopool');
    const el = document.createElement('video');
    el.muted = true; el.loop = true; el.playsInline = true;
    el.setAttribute('playsinline', ''); el.setAttribute('muted', '');
    el.preload = 'none'; el.crossOrigin = 'anonymous';
    el.disablePictureInPicture = true;
    host.appendChild(el);
    pool.el = el;

    el.addEventListener('loadeddata', () => {
      const i = pool.index;
      if (i < 0 || !frames[i]) return;
      if (pool.tex) pool.tex.dispose();
      pool.tex = new THREE.VideoTexture(el);
      pool.tex.minFilter = THREE.LinearFilter;
      pool.tex.magFilter = THREE.LinearFilter;
      pool.tex.generateMipmaps = false;
      frames[i].material.uniforms.uMap.value = pool.tex;
      frames[i].material.uniforms.uTexel.value.set(
        1 / Math.max(el.videoWidth, 1), 1 / Math.max(el.videoHeight, 1));
      fitCover(frames[i], el.videoWidth / Math.max(el.videoHeight, 1));
      el.play().catch(() => {});
    });
  }

  function fitCover(mesh, texAspect) {
    const planeAspect = FRAME_W / FRAME_H;
    const c = mesh.material.uniforms.uCover.value;
    if (!isFinite(texAspect) || texAspect <= 0) { c.set(1, 1); return; }
    if (texAspect > planeAspect) c.set(planeAspect / texAspect, 1);
    else c.set(1, texAspect / planeAspect);
  }

  function releasePool() {
    if (pool.index >= 0 && frames[pool.index]) {
      const m = frames[pool.index];
      const img = m.userData.still.image;
      m.material.uniforms.uMap.value = m.userData.still;
      m.material.uniforms.uCover.value.set(1, 1);
      if (img) m.material.uniforms.uTexel.value.set(1 / img.width, 1 / img.height);
    }
    if (pool.tex) { pool.tex.dispose(); pool.tex = null; }
    if (pool.el) { pool.el.pause(); pool.el.removeAttribute('src'); pool.el.load(); }
    pool.index = -1;
  }

  function driveVideo(want, now) {
    if (want !== pool.want) { pool.want = want; pool.since = now; return; }
    if (want === pool.index) return;
    if (now - pool.since < 260) return;          /* let fast scrolls pass by */

    releasePool();
    if (want < 0) return;
    pool.index = want;
    pool.el.src = CH[want].video;
    pool.el.load();
  }

  /* ── the frame loop ──────────────────────────────────────────── */

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!visible) return;

    /* getElapsedTime() consumes the clock's delta, so derive dt ourselves */
    const t  = clock.getElapsedTime();
    const dt = Math.min(Math.max(t - lastT, 0.0001), 0.05);
    lastT = t;
    const now = performance.now();

    /* smoothed pointer */
    state.mouse.lerp(state.mouseT, 1 - Math.pow(0.0015, dt));
    state.energy += (Math.min(Math.abs(state.velocity) * 2.4, 1) - state.energy) * Math.min(dt * 5, 1);

    /* where are we in the story */
    const f  = state.progress * (N - 1);
    const i0 = Math.max(0, Math.min(N - 1, Math.floor(f)));
    const i1 = Math.min(N - 1, i0 + 1);
    const fr = f - i0;
    state.focus = f;

    const a = CH[i0], b = CH[i1];
    tintA.setRGB(a.tint[0], a.tint[1], a.tint[2]).lerp(tintB.setRGB(b.tint[0], b.tint[1], b.tint[2]), fr);
    fogCol.setRGB(a.tint2[0], a.tint2[1], a.tint2[2])
          .lerp(tintB.setRGB(b.tint2[0], b.tint2[1], b.tint2[2]), fr)
          .multiplyScalar(0.4);

    /* ── camera composition ── */
    const camZ = 4.0 - f * SPACING + LEAD;
    camPos.set(
      Math.sin(f * 0.4) * 0.6 + state.mouse.x * 0.55,
      Math.cos(f * 0.31) * 0.4 + state.mouse.y * 0.4,
      camZ
    );
    const near = framePlace(Math.round(f), tmp).clone();
    near.x += COMPOSE[0];
    near.y += COMPOSE[1];
    camTgt.set(0, 0, camZ - 14).lerp(near, AIM);

    if (state.hero > 0.001) {
      const h = state.hero * state.hero * (3 - 2 * state.hero);
      camPos.lerp(tmp.set(state.mouse.x * 0.5, 0.15 + state.mouse.y * 0.35, HEART_HOME + 8.4), h);
      camTgt.lerp(tmp.set(state.mouse.x * 0.3, 0.05, HEART_HOME - 1.5), h);
    }
    if (state.tail > 0.001) {
      const k = state.tail;
      camPos.lerp(tmp.set(state.mouse.x * 0.8, 0.3 + state.mouse.y * 0.5, END_Z + LEAD + Math.sin(t * 0.16) * 0.7), k);
      camTgt.lerp(tmp.set(0, 0, END_Z - 14), k);
    }
    if (state.finale > 0.001) {
      const k = state.finale;
      const dive = 8.4 - k * 4.6;
      camPos.lerp(tmp.set(state.mouse.x * 0.4, 0.1 + state.mouse.y * 0.25, HEART_END + dive), k);
      camTgt.lerp(tmp.set(0, 0.05, HEART_END), k);
    }

    camera.position.copy(camPos);
    camera.lookAt(camTgt);
    camera.rotation.z = Math.sin(f * 0.23) * 0.035 + state.velocity * 0.05;

    /* ── frames ── */
    /* during the hero the memories are only ghosts ahead of you */
    /* tail is held at 1 from the interlude through the finale, so this alone
       keeps the memories down for every section after the voyage. */
    const back = Math.max(state.tail, state.finale);
    const framesOn = (1 - back) * (1 - state.hero * 0.86);
    for (let i = 0; i < N; i++) {
      const m = frames[i];
      const u = m.material.uniforms;
      const dz = Math.abs(i - f);
      const focus = Math.max(0, 1 - dz * 1.35);

      u.uFocus.value += (focus - u.uFocus.value) * Math.min(dt * 6, 1);
      u.uTime.value = t;
      u.uWarp.value = Math.abs(state.velocity) * 0.9;
      u.uSplit.value = Math.min(Math.abs(state.velocity) * 0.006, 0.0035);
      u.uFogColor.value.copy(fogCol);

      /* dissolve a memory as you rush through it, rather than letting it
         smear across the whole viewport on the way past */
      const gone = Math.min(1, Math.max(0, (m.position.distanceTo(camera.position) - 2.0) / 3.2));
      m.userData.op += (framesOn - m.userData.op) * Math.min(dt * 3, 1);
      u.uOpacity.value = m.userData.op * gone;
      m.visible = u.uOpacity.value > 0.01 && dz < 5.5;
      if (m.visible) m.rotation.z = Math.sin(t * 0.2 + i) * 0.012;
    }

    /* ── motes ── */
    const motif = CH[fr < 0.5 ? i0 : i1].motif;
    const ring    = (motif === 1) ? 1 : 0;
    const pulse   = (motif === 4) ? 1 : (motif === 5 ? 0.6 : 0);
    const stretch = (motif === 0 || motif === 3) ? 0.55 : 0;
    const mu = moteMat.uniforms;
    mu.uTime.value = t;
    mu.uTint.value.lerp(tintA, Math.min(dt * 2, 1));
    mu.uRing.value    += (ring - mu.uRing.value) * Math.min(dt * 2, 1);
    mu.uPulse.value   += (pulse - mu.uPulse.value) * Math.min(dt * 2, 1);
    mu.uStretch.value += (stretch - mu.uStretch.value) * Math.min(dt * 2, 1);
    mu.uOpacity.value = 0.55 + 0.45 * state.energy;

    /* ── heart ── */
    const hu = heartMat.uniforms;
    const heartOn = Math.max(state.hero * 0.85, state.finale);
    hu.uTime.value = t;
    hu.uOpacity.value += (heartOn - hu.uOpacity.value) * Math.min(dt * 3, 1);
    hu.uTint.value.lerp(tintA, Math.min(dt * 1.5, 1));
    /* Finale size, measured against the frustum rather than guessed. The
       camera finishes the dive `dive` in front of the heart — the same figure
       the camera block above uses — so the view can show halfV world units
       above and below its centre, and halfV * aspect to either side. `fit` is
       therefore the largest scale whose point still lands on screen: the
       vertical term binds on a wide monitor, the horizontal one on a portrait
       phone. The swell ramps into that figure across the finale, so the heart
       still grows as you arrive and settles on 2.00× at the end of the scroll
       — the camera is closing at the same time, which is what keeps the growth
       reading on screen even though `fit` itself is shrinking. */
    const dive  = 8.4 - state.finale * 4.6;
    const halfV = Math.tan(camera.fov * Math.PI / 360) * dive;
    const fit   = Math.min(halfV / HEART_RH,
                           (halfV * camera.aspect) / HEART_RX) * HEART_OVER;
    const swell = state.finale > 0.01 ? 1.0 + (fit - 1.0) * state.finale : 1.0;
    hu.uSize.value += (swell - hu.uSize.value) * Math.min(dt * 2, 1);
    if (hu.uBurst.value > 0) hu.uBurst.value = Math.max(0, hu.uBurst.value - dt * 0.42);
    hu.uForm.value += ((hu.uBurst.value > 0.02 ? 0.35 : 1) - hu.uForm.value) * Math.min(dt * 2.5, 1);
    heart.position.z = state.finale > 0.002 ? HEART_END : HEART_HOME;
    /* Lift it into the middle of the frame as the finale takes over: the point
       hangs further than the lobes rise, so a heart left on its own origin
       rides low and has to stay small to keep its tip on screen. */
    heart.position.y = 0.1 + (HEART_RC * hu.uSize.value - 0.1) * Math.max(0, Math.min(1, state.finale));
    heart.rotation.y = Math.sin(t * 0.25) * 0.32 + state.mouse.x * 0.35;
    heart.rotation.x = state.mouse.y * -0.22;
    heart.visible = hu.uOpacity.value > 0.01;

    /* ── nebula ── */
    const bu = bgMat.uniforms;
    bu.uTime.value = t;
    bu.uA.value.lerp(tintA, Math.min(dt * 1.6, 1));
    bu.uB.value.lerp(fogCol, Math.min(dt * 1.6, 1));
    bu.uMouse.value.copy(state.mouse).multiplyScalar(0.5);
    bu.uEnergy.value = state.energy;
    if (ripple.z < 1) ripple.z += dt * 0.85;

    /* ── the focused clip ── */
    const want = (state.hero < 0.4 && state.tail < 0.4 && state.finale < 0.02 && Math.abs(state.velocity) < 0.55)
      ? Math.round(f) : -1;
    driveVideo(want, now);

    /* ── post ── */
    const cu = compMat.uniforms;
    cu.uTime.value = t;
    cu.uAber.value += (Math.min(Math.abs(state.velocity) * 0.012, 0.005) - cu.uAber.value) * Math.min(dt * 6, 1);
    cu.uFade.value += (state.fade - cu.uFade.value) * Math.min(dt * 1.6, 1);
    cu.uBloom.value = 0.24 + state.energy * 0.16 + state.finale * 0.3;
    cu.uTint.value.lerp(tintA, Math.min(dt * 1.6, 1));

    render();

    if (onProgress) onProgress(f, tintA);
  }

  function render() {
    /* scene → rtScene */
    renderer.setRenderTarget(rtScene);
    renderer.clear(true, true, true);
    renderer.render(bgScene, bgCam);
    renderer.clearDepth();
    renderer.render(scene, camera);

    /* bright → rtA, blur h → rtB, blur v → rtA */
    postQuad.material = brightMat;
    brightMat.uniforms.tMap.value = rtScene.texture;
    renderer.setRenderTarget(rtA);
    renderer.clear(true, false, false);
    renderer.render(postScene, postCam);

    postQuad.material = blurMat;
    blurMat.uniforms.tMap.value = rtA.texture;
    blurMat.uniforms.uDir.value.set(1.6 / rtA.width, 0);
    renderer.setRenderTarget(rtB);
    renderer.clear(true, false, false);
    renderer.render(postScene, postCam);

    blurMat.uniforms.tMap.value = rtB.texture;
    blurMat.uniforms.uDir.value.set(0, 1.6 / rtA.height);
    renderer.setRenderTarget(rtA);
    renderer.clear(true, false, false);
    renderer.render(postScene, postCam);

    /* composite → screen */
    postQuad.material = compMat;
    compMat.uniforms.tScene.value = rtScene.texture;
    compMat.uniforms.tBloom.value = rtA.texture;
    renderer.setRenderTarget(null);
    renderer.clear(true, false, false);
    renderer.render(postScene, postCam);
  }

  function resize() {
    if (!renderer) return;
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = W < 700 ? 62 : 48;
    camera.updateProjectionMatrix();

    const pw = Math.max(2, Math.floor(W * dpr));
    const ph = Math.max(2, Math.floor(H * dpr));
    const bw = Math.max(2, Math.floor(pw * 0.5));
    const bh = Math.max(2, Math.floor(ph * 0.5));

    if (rtScene) { rtScene.dispose(); rtA.dispose(); rtB.dispose(); }
    const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
    rtScene = new THREE.WebGLRenderTarget(pw, ph, Object.assign({ depthBuffer: true }, opts));
    rtA = new THREE.WebGLRenderTarget(bw, bh, Object.assign({ depthBuffer: false }, opts));
    rtB = new THREE.WebGLRenderTarget(bw, bh, Object.assign({ depthBuffer: false }, opts));

    bgMat.uniforms.uRes.value.set(W, H);
    compMat.uniforms.uVignette.value = W < 700 ? 0.5 : 0.62;

    /* point sprites are sized in world units, so they need the buffer height */
    if (moteMat)  moteMat.uniforms.uScale.value  = ph * 0.5;
    if (heartMat) heartMat.uniforms.uScale.value = ph * 0.5;
  }

  /* ── public API ──────────────────────────────────────────────── */

  const api = {

    init(canvas, hooks) {
      if (!window.THREE) return false;
      if (!build(canvas)) return false;

      const manager = new THREE.LoadingManager();
      manager.onProgress = (url, loaded, total) => {
        if (hooks && hooks.onLoad) hooks.onLoad(loaded / Math.max(total, 1));
      };
      manager.onLoad = () => {
        ready = true;
        if (hooks && hooks.onReady) hooks.onReady();
      };
      manager.onError = () => {
        ready = true;
        if (hooks && hooks.onReady) hooks.onReady();
      };

      buildFrames(manager);
      buildMotes();
      buildHeart();
      makePool();
      resize();

      window.addEventListener('resize', resize, { passive: true });
      document.addEventListener('visibilitychange', () => {
        visible = !document.hidden;
        if (!visible && pool.el) pool.el.pause();
        else if (pool.el && pool.index >= 0) pool.el.play().catch(() => {});
      });

      alive = true;
      clock.start();
      raf = requestAnimationFrame(tick);
      return true;
    },

    /* voyage progress 0..1 and normalised scroll velocity */
    setProgress(p, v) {
      state.progress = Math.max(0, Math.min(1, p));
      state.velocity = Math.max(-1.5, Math.min(1.5, v || 0));
    },

    setHero(v)   { state.hero = v; },
    setTail(v)   { state.tail = v; },
    setFinale(v) { state.finale = v; },
    setFade(v)   { state.fade = v; },

    pointer(nx, ny) { state.mouseT.set(nx, ny); },

    /* click ripple through the nebula, in −1..1 screen space */
    pulse(nx, ny) { ripple.set(nx * 0.5, ny * 0.5, 0); },

    burst() {
      if (!heartMat) return;
      heartMat.uniforms.uBurst.value = 1;
      heartMat.uniforms.uForm.value = 0.35;
    },

    onFrame(fn) { onProgress = fn; },

    isReady() { return ready; },

    chapterCount() { return N; }
  };

  return api;
})();
