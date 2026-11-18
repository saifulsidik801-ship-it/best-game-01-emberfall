// Keyboard + mouse input. Tracks held keys, per-frame pressed edges, and
// mouse position in logical canvas coordinates (960x600) regardless of CSS scale.
export const input = {
  keys: new Set(),
  pressed: new Set(),
  mouse: { x: 480, y: 300, down: false, clicked: false, wx: 480, wy: 300 },
  _canvas: null,

  attach(canvas) {
    this._canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.down = false; });
    canvas.addEventListener('mousemove', (e) => this._mousePos(e));
    canvas.addEventListener('mousedown', (e) => { this._mousePos(e); this.mouse.down = true; this.mouse.clicked = true; });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  },
  _mousePos(e) {
    const r = this._canvas.getBoundingClientRect();
    this.mouse.x = (e.clientX - r.left) / r.width * 960;
    this.mouse.y = (e.clientY - r.top) / r.height * 600;
  },
  beginFrame() { this.pressed.clear(); this.mouse.clicked = false; },
  held(code) { return this.keys.has(code); },
  wasPressed(code) { return this.pressed.has(code); },
  // WASD / arrows movement axis, normalized.
  moveAxis() {
    let x = 0, y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (x && y) { x *= 0.7071; y *= 0.7071; }
    return { x, y };
  },
  beamHeld() { return this.mouse.down || this.keys.has('Space'); },
};
