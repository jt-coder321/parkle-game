# Parkle 3D preview

A three.js view running on the real Parkle engine (levels 1 to 32). This does not replace the live 2D game.

- `parkle3d.html` is self-contained (engine + three.js 0.169.0 inlined) and opens directly in a browser.
- `main.js` is the 3D view, `shell.html` the page markup. `build.js` stitches them (needs `npm i three@0.169.0` and the engine source).
- URL options: `?l=26` level, `?t=sunset|night` look, `?v=1|2` camera, `?q=fast` low quality.
