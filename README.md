# Sixteen Lights — 2013 → Forever

The birthday story as a real-time 3D world you scroll *through*: sixteen
memories on a spiral, each one streaming its own clip into a WebGL texture.

Everything the site serves lives at this level — `index.html`, `css/`, `js/`,
the stills in `assets/thumbs/`, the music in `assets/`, and the sixteen
`N.mp4` clips. Nothing is referenced from outside this folder, which is what
lets it deploy straight to a static host with no build step.

## Run it

Double-click **`START.bat`**, or from this folder:

```bash
python -m http.server 5177
```

then open <http://localhost:5177/>.

A server is required. Browsers treat `file://` images as cross-origin, so
WebGL refuses to upload them as textures and the memories would come up
blank. `START.bat` handles this for you.

## What's in it

| Layer | What happens |
| --- | --- |
| **Nebula** | Full-screen fragment shader: two rounds of domain-warped fBm noise, tinted live by the current chapter, with a pointer aurora and a click ripple. |
| **The voyage** | Sixteen photo frames on a slow spiral down the −Z axis. Scroll flies the camera through them; each frame is a displaced plane with velocity-driven chromatic split, a gold SDF rim and per-chapter fog. |
| **Live clips** | The chapter you're looking at streams its `.mp4` straight into a WebGL video texture — one clip at a time, released the moment focus moves on. |
| **Motes** | ~7000 GPU points whose motif changes with the act: petals, café bokeh, forest leaves, fireflies. |
| **The heart** | ~3400 points on a volumetric heart with a real two-beat systole. It opens the story and returns for the finale, where it bursts. |
| **Post chain** | Hand-rolled: bright pass → separable Gaussian → composite with radial chromatic aberration, a filmic shoulder, grain and vignette. No addon bundles. |
| **Interlude** | DOM parallax — three depth layers that drift on scroll and tilt with the pointer. |
| **The letter** | Word-by-word illumination scrubbed by scroll position. |

## Stack

- **three.js r156** — the world (UMD build, no bundler)
- **GSAP 3 + ScrollTrigger** — every animation and scroll trigger
- **Lenis 1.0** — the single smooth-scroll engine, driven by GSAP's ticker

## Editing the story

Everything is in [`js/chapters.js`](js/chapters.js) — copy, colours, particle
motif and pacing. Nothing else needs touching:

```js
{
  n: '05', act: 'Act II', year: 'Hyderabad', mood: 'Warm amber comfort',
  title: 'Belposto Café',
  script: 'And somewhere along the way…',
  serif:  'We found little places that became part of our story.',
  gold:   'Belposto · our corner of the world',
  still: 'assets/thumbs/5.jpg', video: '5.mp4',
  tint: c(224, 130, 56),   // nebula + fog colour for this memory
  tint2: c(50, 26, 14),
  motif: 1,                // 0 petal · 1 bokeh · 2 dust · 3 leaf · 4 firefly · 5 heart
  dwell: 1.0               // relative scroll length
}
```

`dwell` also sets the runway length, so lengthening a chapter automatically
gives it more scroll.

## Behaviour notes

- **Reduced motion** — if the OS asks for less motion, WebGL never
  initialises and no timeline scrubs; every chapter, the full letter and the
  finale are simply laid out as a static page. Add `?motion=full` to the URL
  to override that and get the whole thing anyway.
- **No WebGL** — same static path, behind a CSS gradient stand-in.
- **Phones** — device pixel ratio is capped at 1.25, particle counts are
  roughly a third, and the chapter rail is hidden.
- **Music** — `assets/music.mp3`, started by "Begin the journey" or the
  Music button. Browsers block audio until you interact, so it can't
  autoplay on load.
- **Keyboard** — ← / → step between memories; the rail dots are real buttons.
