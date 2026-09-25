---
penecho-plugin: 1
id: general
name: General HTML
name-zh: 通用 HTML
version: 1
description: Self-contained HTML for SVG drawing, transparent overlays, live visuals, and interactive browser-native experiences.
description-zh: 为 SVG 绘图、透明叠加、实时视觉和交互式浏览器体验生成自包含 HTML。
category: Creative
category-zh: 创作
source: Public HTTPS web
connect:
recommended-refresh-seconds: 60
---

# General HTML

Use native `draw` for a very simple static sketch or annotation with about 10 or fewer basic primitives or line segments. Use this capability for larger static drawings and for animation, simulation, illustration, diagrams, custom visual experiences, live displays, small interactive tools, or browser-native behavior. Prefer a compact inline SVG inside the generated HTML; SVG is the default static and animated visual format, and canvas is appropriate only when SVG is materially unsuitable. For requested motion, prefer SVG animation with CSS, SMIL, or JavaScript as appropriate. Use ordinary `write_text`, `draw_formula`, or `plot_function` for simple prose, formulas, and single-variable function plots that do not need a custom visual.

## Output contract

Return exactly one `html_widget` command and no prose, with `pluginId:"general"`. Generate one complete responsive HTML document yourself with inline CSS and JavaScript. Choose dimensions for the actual request; a useful standalone default is `w:2400`, `h:1400`, `refreshSeconds:0`.

Placement is semantic, not a search for unused canvas space. Put the widget where it most directly solves the user's problem. When the answer annotates existing canvas content, align a transparent SVG overlay with the referenced region and draw only the new information without reproducing what is underneath—for example, overlay only the solution path on an existing maze. If existing figures or objects are the actors or targets of a requested animation, position the transparent widget over their actual locations and draw only the new motion, projectile, path, or effect; never redraw the figures or build a duplicate standalone scene. Use nearby blank space only for standalone visuals or when overlap would hide information the user still needs.

Transparency is the default. Keep `html`, `body`, the outermost layout, and the SVG root transparent; do not add an enclosing background, card, border, corner radius, or shadow unless the user explicitly asks for one. For an overlay, draw only the new answer or annotation and let the existing canvas remain visible beneath it. Make requested content prominent and readable.

## Runtime rules

The generated HTML may directly access public HTTPS APIs and load HTTPS scripts, modules, styles, fonts, images, media, or other resources when they materially improve the result. Choose data endpoints that need no OAuth or API key because the local channel solves browser CORS, not source authentication. When a resource supports browser CORS, call its exact HTTPS URL directly with `fetch(url,{credentials:"omit"})`; do not route a working direct request through PenEcho. If browser CORS prevents a direct GET, use the read-only fallback `window.penechoFetchPublic(url)`. It returns a standard `Response`: check `response.ok`, then consume it with `response.json()`, `response.text()`, `response.blob()`, or `response.arrayBuffer()` as appropriate. The fallback passes through bounded public HTTPS response bodies—including APIs, RSS/Atom feeds, and images—without rewriting the supplied URL or requiring a correct `Content-Type`. It rejects credentials, localhost, private networks, and unsafe redirects. Do not call the local channel endpoint yourself.

Use stable version-pinned library URLs, encode user-derived URL parameters, use `credentials:"omit"` for direct resource requests, and show useful loading and error states. Never include secrets, authorization headers, cookies, private endpoints, or user data that was not explicitly provided for that destination. Do not use forms, storage, `sendBeacon`, or current-frame navigation. Make useful public HTTPS source URLs from fetched news and other records clickable with `<a target="_blank" rel="noopener noreferrer">`. Native HTML, CSS, JavaScript, timers, SVG, and canvas remain preferred when no dependency is needed. Dynamic SVG fully supports inline scripts, CSS animation, SMIL animation, filters, gradients, masks, and event-driven interaction. For a multi-part SVG visual, use a wrapping CSS layout with tight-viewBox panels or rebuild coordinates from a `ResizeObserver`; never make the whole widget one fixed-size viewBox that only scales to `width:100%;height:100%`. In 3D scenes, explicitly aim the camera at the subject and keep it centered after resize. Redraw canvas, SVG, and 3D visuals after viewport changes when needed. After the initial render and meaningful layout/state changes, call `window.parent.postMessage({type:"penecho-widget-updated"}, "*")`; do not send it on every animation frame or clock tick.

## Library toolbelt

When a matching built-in renderer contract (such as the Professional Diagrams `diagram_source` formats) fits, use it first. Otherwise, prefer a mature library from this toolbelt over reimplementing its rendering from scratch; hand-written SVG remains right for bespoke illustrations the toolbelt does not cover. Load exactly one of these version-pinned URLs on demand, show a brief loading state, and if the library fails to load fall back to your own compact SVG rather than an error card:

- Organic chemistry (any molecule: rings, functional groups, skeletal formula, reactions): build the SMILES string, then render it with `https://cdn.jsdelivr.net/npm/smiles-drawer@2.1.7/dist/smiles-drawer.min.js` (`SmilesDrawer.parse` + `new SmilesDrawer.SvgDrawer({width, height, bondThickness: 2})`, `drawer.draw(tree, svgElement, "light")`).
- 3D molecules, proteins, crystal structures: `https://cdn.jsdelivr.net/npm/3dmol@2.0.4/build/3Dmol-min.js` with `$3Dmol.createViewer`.
- Typeset mathematics and formulas: `https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css` plus `https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js` and `katex.render(tex, element, {displayMode:true})`.
- Function graphs, geometry constructions, interactive plots: `https://cdn.jsdelivr.net/npm/jsxgraph@1.10.1/distrib/jsxgraphcore.js` plus `https://cdn.jsdelivr.net/npm/jsxgraph@1.10.1/distrib/jsxgraph.css`.
- Statistical and scientific charts: `https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js`; multi-trace scientific figures: `https://cdn.jsdelivr.net/npm/plotly.js-dist-min@2.32.0/plotly.min.js`; bespoke data-driven graphics: `https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js`.
- 3D graphics and scenes: a `<script type="module">` with an import map mapping `"three"` to `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js`, then `import * as THREE from "three"`; for orbit controls add the import-map entry `"three/addons/"` → `https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/` and `import { OrbitControls } from "three/addons/controls/OrbitControls.js"`. The legacy `examples/js/` folder does not exist in modern three.js — never reference it and never use `new THREE.OrbitControls`.
- Flowcharts and standard diagrams: `https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs`.
- Physics simulations (rigid bodies, collisions): `https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js`.
- Interactive maps: `https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js` plus `https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css`.

## Text and symbol hygiene

Whatever the renderer, everything the user sees must be final readable content — never source code, escape sequences, or placeholders. In SVG `<text>` and HTML, write real characters directly (`° − √ × ≤ π`), never `\uXXXX` or `&#...;` escape text, and typeset formulas with the toolbelt (KaTeX or MathJax) instead of pasting raw TeX like `$\frac{a}{b}$` as visible text. A loading state must always resolve: if a library fails to load or a script throws, remove the loading indicator and render your own compact fallback in the same widget rather than leaving it stuck. Before returning, mentally re-read every label as a user would: each must be a single correctly encoded glyph sequence with no mojibake (a `Â` or `Ã` prefix means double encoding — fix it), no overlapping labels, and values consistent with the mathematics.

## One-shot example

User writes `我需要一个五颜六色的钟，显示当前时间` and points right. Produce one `html_widget` there with a large colorful clock, local date and seconds, an internal one-second timer, responsive layout, no network requests, and no prose outside the command.
