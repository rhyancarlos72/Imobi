"use client";
// Motor de renderização do editor: desenha a linha do tempo num <canvas>
// (prévia e exportação usam o mesmo desenho, então o que você vê é o que sai).
import { buildLUT, speedAt, uAt, type ClipLUT } from "./curves";
import { ASPECT_SIZE, type BrandInfo, type Clip, type TextItem, type Timeline } from "./types";

export type LayoutItem = { clip: Clip; start: number; duration: number; lut: ClipLUT };

export function computeLayout(tl: Timeline) {
  let t = 0;
  const items: LayoutItem[] = tl.clips.map((clip) => {
    const lut = buildLUT(clip);
    const item = { clip, start: t, duration: lut.duration, lut };
    t += lut.duration;
    return item;
  });
  const textEnd = tl.texts.reduce((m, x) => Math.max(m, x.start + x.duration), 0);
  return { items, total: Math.max(t, items.length ? 0 : textEnd) };
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

function pickMime() {
  const opts = ["video/mp4;codecs=avc1.640028,mp4a.40.2", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"];
  return opts.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

export class Engine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tl!: Timeline;
  brand!: BrandInfo;
  items: LayoutItem[] = [];
  total = 0;
  time = 0;
  playing = false;
  exporting = false;
  onTime?: (t: number) => void;
  onState?: (playing: boolean) => void;

  private videos = new Map<string, HTMLVideoElement>();
  private images = new Map<string, HTMLImageElement>();
  private logo: HTMLImageElement | null = null;
  private logoSrc: string | null = null;
  private music: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private master: GainNode | null = null;
  private recordDest: MediaStreamAudioDestinationNode | null = null;
  private gains = new Map<HTMLMediaElement, GainNode>();
  private raf = 0;
  private wallStart = 0;
  private fontDisplay = "sans-serif";
  private fontSans = "sans-serif";
  private endResolver: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    const cs = getComputedStyle(document.body);
    this.fontDisplay = cs.getPropertyValue("--font-display").trim() || "sans-serif";
    this.fontSans = cs.getPropertyValue("--font-geist-sans").trim() || "sans-serif";
  }

  // ------------------------------------------------------------ dados
  setTimeline(tl: Timeline, brand: BrandInfo) {
    this.tl = tl;
    this.brand = brand;
    const { items, total } = computeLayout(tl);
    this.items = items;
    this.total = total;
    const size = ASPECT_SIZE[tl.aspect];
    if (this.canvas.width !== size.w || this.canvas.height !== size.h) {
      this.canvas.width = size.w;
      this.canvas.height = size.h;
    }
    this.loadMedia();
    if (this.time > this.total) this.time = this.total;
    if (!this.playing) this.renderStill();
  }

  private loadMedia() {
    const needed = new Set<string>();
    for (const c of this.tl.clips) {
      needed.add(c.src);
      if (c.kind === "video" && !this.videos.has(c.src)) {
        const v = document.createElement("video");
        v.crossOrigin = "anonymous";
        v.preload = "auto";
        v.playsInline = true;
        v.src = c.src;
        v.addEventListener("loadeddata", () => !this.playing && this.renderStill());
        v.addEventListener("seeked", () => !this.playing && this.draw());
        this.videos.set(c.src, v);
        this.attachAudio(v);
      }
      if (c.kind === "image" && !this.images.has(c.src)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => !this.playing && this.draw();
        img.src = c.src;
        this.images.set(c.src, img);
      }
    }
    for (const [src, v] of this.videos) if (!needed.has(src)) { v.pause(); this.videos.delete(src); }
    if (this.brand.logoUrl !== this.logoSrc) {
      this.logoSrc = this.brand.logoUrl;
      this.logo = null;
      if (this.brand.logoUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { this.logo = img; if (!this.playing) this.draw(); };
        img.src = this.brand.logoUrl;
      }
    }
    const musicSrc = this.tl.music?.src ?? null;
    if ((this.music?.dataset.src ?? null) !== musicSrc) {
      this.music?.pause();
      this.music = null;
      if (musicSrc) {
        const a = new Audio();
        a.crossOrigin = "anonymous";
        a.preload = "auto";
        a.src = musicSrc;
        a.dataset.src = musicSrc;
        a.loop = true;
        this.music = a;
        this.attachAudio(a);
      }
    }
  }

  // ------------------------------------------------------------ áudio
  private ensureAudio() {
    if (this.audioCtx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new Ctx();
    this.master = this.audioCtx.createGain();
    this.recordDest = this.audioCtx.createMediaStreamDestination();
    this.master.connect(this.audioCtx.destination);
    this.master.connect(this.recordDest);
    for (const v of this.videos.values()) this.attachAudio(v);
    if (this.music) this.attachAudio(this.music);
  }

  private attachAudio(el: HTMLMediaElement) {
    if (!this.audioCtx || !this.master || this.gains.has(el)) return;
    try {
      const src = this.audioCtx.createMediaElementSource(el);
      const g = this.audioCtx.createGain();
      g.gain.value = 0;
      src.connect(g).connect(this.master);
      this.gains.set(el, g);
    } catch {
      // elemento já conectado
    }
  }

  private setGain(el: HTMLMediaElement, v: number) {
    const g = this.gains.get(el);
    if (g) g.gain.value = v;
    else el.volume = clamp(v, 0, 1);
  }

  // ------------------------------------------------------------ transporte
  itemAt(t: number) {
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (t < it.start + it.duration || i === this.items.length - 1) return { item: it, index: i };
    }
    return null;
  }

  private srcTimeFor(it: LayoutItem, t: number) {
    const u = uAt(it.lut, t - it.start);
    return { u, src: it.clip.in + u * (it.clip.out - it.clip.in) };
  }

  async play() {
    if (!this.items.length) return;
    this.ensureAudio();
    await this.audioCtx?.resume();
    if (this.time >= this.total - 0.05) this.time = 0;
    this.playing = true;
    this.wallStart = performance.now() - this.time * 1000;
    this.onState?.(true);
    cancelAnimationFrame(this.raf);
    const tick = () => {
      if (!this.playing) return;
      this.time = (performance.now() - this.wallStart) / 1000;
      if (this.time >= this.total) {
        this.time = this.total;
        this.draw();
        this.stopMedia();
        this.playing = false;
        this.onTime?.(this.time);
        this.onState?.(false);
        this.endResolver?.();
        return;
      }
      this.syncMedia();
      this.draw();
      this.onTime?.(this.time);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.stopMedia();
    this.onState?.(false);
  }

  seek(t: number) {
    this.time = clamp(t, 0, this.total);
    if (this.playing) {
      this.wallStart = performance.now() - this.time * 1000;
      this.syncMedia(true);
    } else {
      this.renderStill();
    }
    this.onTime?.(this.time);
  }

  private stopMedia() {
    for (const v of this.videos.values()) v.pause();
    this.music?.pause();
  }

  private syncMedia(force = false) {
    const found = this.itemAt(this.time);
    let activeEl: HTMLVideoElement | null = null;
    if (found && found.item.clip.kind === "video") {
      const it = found.item;
      const el = this.videos.get(it.clip.src);
      if (el) {
        activeEl = el;
        const { u, src } = this.srcTimeFor(it, this.time);
        const rate = clamp(speedAt(it.clip, u), 0.0625, 16);
        if (Math.abs(el.playbackRate - rate) > 0.01) el.playbackRate = rate;
        const drift = Math.abs(el.currentTime - src);
        if (force || el.paused || drift > 0.3) {
          if (drift > 0.04) el.currentTime = src;
          if (el.paused) el.play().catch(() => {});
        }
        this.setGain(el, it.clip.volume * (rate > 4 ? 0 : 1));
      }
    }
    for (const v of this.videos.values()) if (v !== activeEl && !v.paused) { v.pause(); this.setGain(v, 0); }

    if (this.music && this.tl.music) {
      const m = this.music;
      const dur = isFinite(m.duration) && m.duration > 0 ? m.duration : 0;
      const want = dur ? this.time % dur : this.time;
      if (m.paused) {
        try { m.currentTime = want; } catch {}
        m.play().catch(() => {});
      } else if (force || Math.abs(m.currentTime - want) > 0.35) {
        try { m.currentTime = want; } catch {}
      }
      const fadeOut = clamp((this.total - this.time) / 1.5, 0, 1);
      const fadeIn = clamp(this.time / 0.5, 0, 1);
      this.setGain(m, this.tl.music.volume * fadeOut * fadeIn);
    }
  }

  /** Desenha o quadro parado (ajusta o vídeo para o tempo certo e redesenha no "seeked"). */
  renderStill() {
    const found = this.itemAt(this.time);
    if (found && found.item.clip.kind === "video") {
      const el = this.videos.get(found.item.clip.src);
      if (el) {
        const { src } = this.srcTimeFor(found.item, this.time);
        if (el.readyState >= 1 && Math.abs(el.currentTime - src) > 0.02) {
          try { el.currentTime = src; } catch {}
        }
      }
    }
    this.draw();
  }

  // ------------------------------------------------------------ desenho
  draw() {
    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    const found = this.items.length ? this.itemAt(this.time) : null;
    if (found) {
      const it = found.item;
      const local = this.time - it.start;
      const { u } = this.srcTimeFor(it, this.time);
      let alpha = 1;
      if (this.tl.fades) {
        const edge = Math.min(local, it.duration - local);
        alpha = clamp(edge / 0.25, 0, 1);
      }
      ctx.globalAlpha = alpha;
      this.drawClip(it.clip, u, W, H);
      ctx.globalAlpha = 1;
      if (it.clip.staged) this.drawDisclaimer(W);
    } else {
      this.drawEmpty(W, H);
    }

    this.drawTexts(W, H);
    const cardVisible = this.drawCard(W, H);
    if (this.tl.branding.enabled) this.drawBranding(W, H, cardVisible);
    ctx.restore();
  }

  private drawSource(src: CanvasImageSource, sw: number, sh: number, W: number, H: number, scale = 1, ox = 0, oy = 0) {
    const { ctx } = this;
    if (!sw || !sh) return;
    const sourceRatio = sw / sh;
    const outRatio = W / H;
    const blurFit = this.tl.fit === "blur" && sourceRatio > outRatio * 1.25;
    if (blurFit) {
      // fundo desfocado + foto inteira na largura (não corta o cômodo no 9:16)
      const sBg = Math.max(W / sw, H / sh) * 1.1;
      ctx.save();
      ctx.filter = "blur(40px) brightness(0.55)";
      ctx.drawImage(src, (W - sw * sBg) / 2, (H - sh * sBg) / 2, sw * sBg, sh * sBg);
      ctx.restore();
      const base = W / sw;
      const boxH = sh * base;
      const s = base * scale;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, (H - boxH) / 2, W, boxH);
      ctx.clip();
      ctx.drawImage(src, (W - sw * s) / 2 + ox * W, (H - sh * s) / 2 + oy * H, sw * s, sh * s);
      ctx.restore();
      return;
    }
    const s = Math.max(W / sw, H / sh) * scale;
    const dw = sw * s;
    const dh = sh * s;
    ctx.drawImage(src, (W - dw) / 2 + ox * W, (H - dh) / 2 + oy * H, dw, dh);
  }

  private drawClip(clip: Clip, u: number, W: number, H: number) {
    if (clip.kind === "video") {
      const v = this.videos.get(clip.src);
      if (v && v.readyState >= 2) this.drawSource(v, v.videoWidth, v.videoHeight, W, H);
      else this.drawLoading(W, H);
      return;
    }
    const img = this.images.get(clip.src);
    if (!img || !img.complete || !img.naturalWidth) return this.drawLoading(W, H);
    const p = ease(u) * 0.4 + u * 0.6;
    let scale = 1;
    let ox = 0;
    if (clip.motion === "zoom-in") scale = 1 + 0.18 * p;
    else if (clip.motion === "zoom-out") scale = 1.18 - 0.18 * p;
    else if (clip.motion === "pan-left") { scale = 1.15; ox = 0.05 - 0.1 * p; }
    else if (clip.motion === "pan-right") { scale = 1.15; ox = -0.05 + 0.1 * p; }
    this.drawSource(img, img.naturalWidth, img.naturalHeight, W, H, scale, ox, 0);
  }

  private drawLoading(W: number, H: number) {
    const { ctx } = this;
    ctx.fillStyle = "#11141a";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#6b7585";
    ctx.font = `600 ${Math.round(Math.min(W, H) * 0.035)}px ${this.fontSans}`;
    ctx.textAlign = "center";
    ctx.fillText("Carregando…", W / 2, H / 2);
  }

  private drawEmpty(W: number, H: number) {
    const { ctx } = this;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#161a21");
    g.addColorStop(1, "#0c0e12");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#6b7585";
    ctx.textAlign = "center";
    ctx.font = `600 ${Math.round(Math.min(W, H) * 0.04)}px ${this.fontSans}`;
    ctx.fillText("Adicione vídeos ou fotos da biblioteca", W / 2, H / 2);
  }

  private k() {
    return Math.min(this.canvas.width, this.canvas.height) / 1080;
  }

  private safe() {
    const H = this.canvas.height;
    return this.tl.aspect === "9:16" ? { top: H * 0.09, bottom: H * 0.17 } : { top: H * 0.06, bottom: H * 0.07 };
  }

  private wrap(text: string, maxW: number) {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (this.ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  private drawTexts(W: number, H: number) {
    const { ctx } = this;
    const k = this.k();
    const safe = this.safe();
    for (const t of this.tl.texts) {
      if (this.time < t.start || this.time > t.start + t.duration || !t.text.trim()) continue;
      const appear = ease((this.time - t.start) / 0.35);
      const leave = clamp((t.start + t.duration - this.time) / 0.25, 0, 1);
      const a = Math.min(appear, leave);
      ctx.save();
      ctx.globalAlpha = a;
      const size = t.style === "title" ? 96 * k : t.style === "highlight" ? 64 * k : 52 * k;
      const weight = t.style === "caption" ? 600 : 800;
      ctx.font = `${weight} ${size}px ${t.style === "caption" ? this.fontSans : this.fontDisplay}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const lines = this.wrap(t.style === "title" ? t.text.toUpperCase() : t.text, W * 0.82);
      const lh = size * 1.12;
      const blockH = lines.length * lh;
      let cy = t.position === "top" ? safe.top + blockH / 2 : t.position === "bottom" ? H - safe.bottom - blockH / 2 : H / 2;
      cy += (1 - appear) * 30 * k;
      const top = cy - blockH / 2;
      if (t.style !== "title") {
        const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
        const padX = 34 * k;
        const padY = 20 * k;
        ctx.fillStyle = t.style === "highlight" ? this.brand.color : "rgba(0,0,0,0.62)";
        this.roundRect(W / 2 - widest / 2 - padX, top - padY, widest + padX * 2, blockH + padY * 2, 22 * k);
        ctx.fill();
        ctx.fillStyle = t.style === "highlight" ? "#0a0a0a" : "#fff";
      } else {
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 30 * k;
        ctx.shadowOffsetY = 6 * k;
        ctx.fillStyle = "#fff";
      }
      lines.forEach((l, i) => ctx.fillText(l, W / 2, top + lh * i + lh / 2));
      ctx.restore();
    }
  }

  private cardVisible() {
    const c = this.tl.card;
    if (!c.enabled || this.total <= 0) return 0;
    const len = Math.min(5, this.total);
    if (c.show === "always") return 1;
    if (c.show === "start") return clamp((len - this.time) / 0.4, 0, 1) * ease(this.time / 0.4 + 0.01);
    const t0 = this.total - len;
    return ease((this.time - t0) / 0.45);
  }

  private drawCard(W: number, H: number) {
    const vis = this.cardVisible();
    if (vis <= 0) return false;
    const c = this.tl.card;
    const { ctx } = this;
    const k = this.k();
    const safe = this.safe();
    const pad = 54 * k;
    const x = pad;
    const w = W - pad * 2;
    const details = [
      c.bedrooms && `${c.bedrooms} quarto${c.bedrooms === "1" ? "" : "s"}`,
      c.bathrooms && `${c.bathrooms} banheiro${c.bathrooms === "1" ? "" : "s"}`,
      c.parking && `${c.parking} vaga${c.parking === "1" ? "" : "s"}`,
      c.area && `${c.area} m²`,
    ].filter(Boolean) as string[];
    const h = (c.title ? 70 : 0) * k + (c.price ? 110 : 0) * k + (details.length ? 64 : 0) * k + (c.location ? 54 : 0) * k + 70 * k;
    const y = H - safe.bottom - h + (1 - vis) * 80 * k;
    ctx.save();
    ctx.globalAlpha = vis;
    ctx.fillStyle = "rgba(8,9,12,0.82)";
    this.roundRect(x, y, w, h, 34 * k);
    ctx.fill();
    ctx.fillStyle = this.brand.color;
    this.roundRect(x, y, 14 * k, h, 7 * k);
    ctx.fill();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    let cy = y + 38 * k;
    const tx = x + 50 * k;
    if (c.title) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = `700 ${40 * k}px ${this.fontSans}`;
      ctx.fillText(c.title.toUpperCase(), tx, cy, w - 90 * k);
      cy += 70 * k;
    }
    if (c.price) {
      ctx.fillStyle = this.brand.color;
      ctx.font = `800 ${92 * k}px ${this.fontDisplay}`;
      ctx.fillText(c.price, tx, cy, w - 90 * k);
      cy += 110 * k;
    }
    if (details.length) {
      ctx.fillStyle = "#fff";
      ctx.font = `600 ${42 * k}px ${this.fontSans}`;
      ctx.fillText(details.join("  ·  "), tx, cy, w - 90 * k);
      cy += 64 * k;
    }
    if (c.location) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = `500 ${38 * k}px ${this.fontSans}`;
      ctx.fillText("📍 " + c.location, tx, cy, w - 90 * k);
    }
    ctx.restore();
    return vis > 0.5;
  }

  private drawBranding(W: number, H: number, cardVisible: boolean) {
    const { ctx } = this;
    const k = this.k();
    const b = this.tl.branding;
    const safe = this.safe();
    ctx.save();
    // topo: logo + nome
    const topY = this.tl.aspect === "9:16" ? safe.top * 0.55 : 40 * k;
    let x = 44 * k;
    if (b.logo && this.logo) {
      const lh = 84 * k;
      const lw = (this.logo.naturalWidth / this.logo.naturalHeight) * lh;
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 16 * k;
      ctx.drawImage(this.logo, x, topY, Math.min(lw, 300 * k), lh);
      x += Math.min(lw, 300 * k) + 20 * k;
      ctx.shadowBlur = 0;
    }
    if (this.brand.name) {
      ctx.fillStyle = "#fff";
      ctx.font = `700 ${38 * k}px ${this.fontSans}`;
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 14 * k;
      ctx.fillText(this.brand.name, x, topY + 42 * k, W * 0.6);
      ctx.shadowBlur = 0;
    }
    // rodapé: contato
    const parts = [b.whatsapp && this.brand.whatsapp ? `WhatsApp ${this.brand.whatsapp}` : "", b.creci && this.brand.creci ? `CRECI ${this.brand.creci}` : ""].filter(Boolean);
    if (parts.length) {
      const y = cardVisible ? H - safe.bottom + 22 * k : H - safe.bottom + 22 * k;
      ctx.font = `700 ${36 * k}px ${this.fontSans}`;
      const text = parts.join("   |   ");
      const tw = ctx.measureText(text).width;
      const px = 28 * k;
      ctx.fillStyle = cardVisible ? "rgba(0,0,0,0.55)" : this.brand.color;
      this.roundRect(W / 2 - tw / 2 - px, y, tw + px * 2, 70 * k, 35 * k);
      ctx.fill();
      ctx.fillStyle = cardVisible ? "#fff" : "#0a0a0a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, W / 2, y + 36 * k);
    }
    ctx.restore();
  }

  private drawDisclaimer(W: number) {
    // canto superior direito, abaixo da faixa da marca (não colide com o cartão)
    const { ctx } = this;
    const k = this.k();
    ctx.save();
    ctx.font = `600 ${26 * k}px ${this.fontSans}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    const text = "Imagem ilustrativa · mobília virtual";
    const tw = ctx.measureText(text).width;
    const y = (this.tl.aspect === "9:16" ? this.safe().top * 0.55 : 40 * k) + 100 * k;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    this.roundRect(W - 30 * k - tw - 18 * k, y - 8 * k, tw + 36 * k, 26 * k + 16 * k, 21 * k);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(text, W - 30 * k - 0 * k, y);
    ctx.restore();
  }

  // ------------------------------------------------------------ exportação
  get exportMime() {
    return pickMime();
  }

  /** Grava o vídeo em tempo real a partir do canvas. Retorna o arquivo final. */
  async exportVideo(onProgress: (p: number) => void): Promise<{ blob: Blob; ext: string }> {
    if (!this.items.length) throw new Error("A linha do tempo está vazia");
    const mime = pickMime();
    if (!mime) throw new Error("Seu navegador não suporta gravação de vídeo. Use o Chrome ou Edge atualizado.");
    this.pause();
    this.ensureAudio();
    await this.audioCtx?.resume();
    await this.preloadAll();
    this.exporting = true;
    this.seek(0);
    await new Promise((r) => setTimeout(r, 300));

    const stream = this.canvas.captureStream(30);
    this.recordDest?.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000, audioBitsPerSecond: 192_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise<void>((r) => (rec.onstop = () => r()));
    const ended = new Promise<void>((r) => (this.endResolver = r));
    const prevOnTime = this.onTime;
    this.onTime = (t) => {
      prevOnTime?.(t);
      onProgress(Math.min(1, t / this.total));
    };
    rec.start(500);
    await this.play();
    await ended;
    await new Promise((r) => setTimeout(r, 250));
    rec.stop();
    await stopped;
    this.endResolver = null;
    this.onTime = prevOnTime;
    this.exporting = false;
    stream.getVideoTracks().forEach((t) => t.stop());
    return { blob: new Blob(chunks, { type: mime.split(";")[0] }), ext: mime.includes("mp4") ? "mp4" : "webm" };
  }

  private async preloadAll() {
    const waits: Promise<void>[] = [];
    for (const v of this.videos.values()) {
      if (v.readyState >= 3) continue;
      waits.push(new Promise((r) => { v.addEventListener("canplaythrough", () => r(), { once: true }); setTimeout(r, 8000); v.load(); }));
    }
    for (const img of this.images.values()) {
      if (img.complete) continue;
      waits.push(new Promise((r) => { img.addEventListener("load", () => r(), { once: true }); setTimeout(r, 8000); }));
    }
    await Promise.all(waits);
  }

  destroy() {
    this.pause();
    for (const v of this.videos.values()) { v.removeAttribute("src"); v.load(); }
    this.music?.pause();
    this.audioCtx?.close().catch(() => {});
  }
}

export function textAt(texts: TextItem[], t: number) {
  return texts.filter((x) => t >= x.start && t <= x.start + x.duration);
}
