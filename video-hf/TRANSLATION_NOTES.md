# Translation notes — Remotion → HyperFrames

Source: `../video/` (Remotion, composition id `promo`, 30fps, 1920×1080).
Output: `index.html` (HyperFrames, composition id `main`, 33.833s / 1015 frames).

`lint_source.py`: **0 blockers, 0 warnings, 0 info** — the composition is pure
frame-driven (no `useState` / `useEffect` / `useReducer`), so it translated in
full with no escape-hatch bow-out.

## Mapping applied

| Remotion construct | HyperFrames translation |
|---|---|
| `<Composition durationInFrames=1015 fps=30 …>` | root `#root` `data-duration="33.833" data-fps="30"` |
| `<Sequence from D>` (6 scenes) | `.clip.scene` divs, `data-start`/`data-duration` in seconds, `data-track-index="1"` |
| `Scene` fade `interpolate(f,[0,10,d-10,d],[0,1,1,0])` | two `to` tweens (fade 0.333s in / out) on a `.scene-inner` **wrapper inside** each clip (framework owns clip visibility; fade lives on the wrapper) |
| `RiseIn` `spring({damping:200,stiffness:120,durationInFrames:30})` | CSS from-state (`opacity:0; translateY(46px)`) → `gsap.to({opacity:1,y:0,duration:0.63,ease:"power3.out"})`. damping 200 is heavily overdamped (no overshoot), so `power3.out` matches with no `back`/`elastic`. |
| `BrowserFrame` pan (`objectPosition 50% p%`) + zoom (`scale 1→1.05`) | per-`.shot` `gsap.to({objectPosition, scale, ease:"none"})` over the scene window (read from `closest('.scene')`) |
| Quiz→scenario overlay crossfade (`overlayAt=82` frames) | `#quiz-overlay` opacity 0→1 tween at `14.5 + 82/30 = 17.233s`, 0.467s |
| `@remotion/google-fonts` Barlow Condensed / Zen Kaku Gothic New | Google Fonts `<link>` (weights 600;700 / 400;700;900) |
| Custom subcomponents (`Wordmark`, `Eyebrow`, `Headline`, `UnofficialBadge`, `WeightChips`, `FeatureScene`) | inlined as HTML using each prop interface as the template |

## Deliberate deviations (with reason)

1. **Persistent grid background** added as a track-0 clip spanning the whole
   composition. Remotion put the paper+grid on every `Scene` and the root
   `AbsoluteFill`. HF's frame compositor can drop a root `background` (black
   frame), and scene crossfades briefly lower `.scene-inner` opacity — a shared
   background clip guarantees the field-notes grid is always behind the content.

2. **`<br>` removed.** Remotion headlines and the `CCA / FIELD NOTES` wordmark
   used `<br/>`. HF bans `<br>` in body text, so two-line headlines became
   stacked block `<div>`s and the wordmark label a flex column.

3. **Image timing attributes.** The `.shot` images carry only `data-pan-end`
   (not `data-start`/`data-duration`) so HF's lint does not treat them as
   mis-declared clips; the pan tween derives its window from the parent scene.

## Known noise-floor / caveats

- **Fonts.** Per the skill's font reference, weight 900 CJK glyphs can render a
  touch differently on `chrome-headless-shell` vs Remotion's bundled Chromium
  (~0.025 SSIM at the noise floor). Families and weights match the source. HF
  advises local `@font-face` for zero-latency compile; kept the Google Fonts
  `<link>` to preserve the exact source families (warning, non-blocking). The
  Google Fonts stylesheet and font files remain render-time network dependencies
  without SRI because their responses and resolved URLs vary by user agent; use
  local `@font-face` assets if hermetic, offline rendering becomes a requirement.
- **GSAP integrity.** The executable CDN dependency is version-pinned and guarded
  by SHA-384 SRI. Recompute the reviewed response when updating it:

  ```sh
  curl -s https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js \
    | openssl dgst -sha384 -binary | openssl base64 -A
  ```

  Prefix the result with `sha384-` and update both `index.html` and
  `scripts/check-video-dependencies.test.mjs` together.
- **Spring→power ease.** `spring()` is the lossiest map; the damping-200 config
  is nearly critically damped, so the `power3.out` approximation is visually
  tight (no overshoot to reproduce).

`pnpm check` → **ok (0 errors)**. 7-scene contact-sheet snapshot
reviewed; all scenes, the weight chips, and the quiz→scenario crossfade match
the Remotion stills.
