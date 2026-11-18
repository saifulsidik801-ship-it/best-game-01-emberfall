// Procedural audio: no audio files. A tiny WebAudio synth plays SFX and a
// generative music loop — one pentatonic-ish scale per realm, slow pad +
// plucked ember notes, so each realm sounds different with zero assets.
const SCALES = [
  [0, 3, 5, 7, 10], // Ashen Moor — minor
  [0, 2, 4, 7, 9],  // Glasswood — major
  [0, 2, 3, 7, 8],  // Sunken Choir — dorian-ish
  [0, 3, 5, 6, 10], // Ember Peaks — tense
  [0, 1, 3, 7, 8],  // The Hollow — dark
];
const ROOTS = [110, 98, 87.31, 123.47, 82.41];

class AudioSys {
  constructor() {
    this.ctx = null; this.master = null; this.musicGain = null; this.sfxGain = null;
    this.muted = false; this.musicOn = true; this.realm = 0;
    this._step = 0; this._timer = null; this._padNodes = [];
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.34;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.master);
    } catch (e) { this.ctx = null; }
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; }
  setMusic(on) { this.musicOn = on; if (!on) this.stopMusic(); else this.startMusic(this.realm); }
  tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.sfxGain); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  sfx(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'beam': this.tone(880, 0.09, 'sawtooth', 0.05); break;
      case 'hit': this.tone(220, 0.07, 'square', 0.10, 0, 140); break;
      case 'kill': this.tone(330, 0.22, 'triangle', 0.22, 0, 66); this.tone(660, 0.14, 'sine', 0.12, 0.02); break;
      case 'pickup': this.tone(523, 0.1, 'sine', 0.16); this.tone(784, 0.16, 'sine', 0.16, 0.07); break;
      case 'brazier': [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.16, i * 0.07)); break;
      case 'shard': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.18, i * 0.09)); break;
      case 'hurt': this.tone(160, 0.18, 'sawtooth', 0.18, 0, 70); break;
      case 'boss': this.tone(55, 0.7, 'sawtooth', 0.25, 0, 40); this.tone(110, 0.5, 'square', 0.12, 0.1, 55); break;
      case 'feat': [659, 880, 1174].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.15, i * 0.08)); break;
      case 'click': this.tone(700, 0.05, 'sine', 0.12); break;
      case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.18, i * 0.12)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.16, i * 0.16)); break;
      case 'relic': [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.14, i * 0.06)); break;
      case 'gate': this.tone(98, 0.6, 'sawtooth', 0.14, 0, 196); break;
      default: this.tone(440, 0.08, 'sine', 0.1);
    }
  }
  startMusic(realmIdx) {
    this.realm = realmIdx || 0;
    this.stopMusic();
    if (!this.ctx || !this.musicOn || this.muted) return;
    const scale = SCALES[this.realm % SCALES.length], root = ROOTS[this.realm % ROOTS.length];
    const stepMs = 420;
    this._step = 0;
    this._timer = setInterval(() => {
      if (!this.ctx || !this.musicOn || this.muted) return;
      this._step++;
      // Low pad every 8 steps.
      if (this._step % 8 === 1) {
        const f = root * 0.5;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        const t = this.ctx.currentTime;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.10, t + 0.6);
        g.gain.linearRampToValueAtTime(0.0001, t + 3.2);
        o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + 3.4);
      }
      // Plucked ember note, pentatonic walk with rests.
      if (this._step % 2 === 0 && Math.random() < 0.62) {
        const deg = scale[Math.floor(Math.random() * scale.length)];
        const oct = Math.random() < 0.25 ? 4 : 2;
        const freq = root * Math.pow(2, deg / 12) * oct;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'triangle'; o.frequency.value = freq;
        const t = this.ctx.currentTime;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + 1);
      }
    }, stepMs);
  }
  stopMusic() { if (this._timer) { clearInterval(this._timer); this._timer = null; } }
}

export const audio = new AudioSys();
