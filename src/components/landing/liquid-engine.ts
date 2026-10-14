/**
 * Liquid particle engine for the landing hero.
 *
 * Adapted from "Sculpture Hero" (liquid particle hero) by Guglielmo
 * Giannattasio, https://guglielmogiannattasio.it, published on 21st.dev under
 * the MIT License:
 *
 *   Copyright (c) Guglielmo Giannattasio
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a
 *   copy of this software and associated documentation files (the "Software"),
 *   to deal in the Software without restriction, including without limitation
 *   the rights to use, copy, modify, merge, publish, distribute, sublicense,
 *   and/or sell copies of the Software, and to permit persons to whom the
 *   Software is furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 *   FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 *   DEALINGS IN THE SOFTWARE.
 *
 * What it does: the sculpture image is sampled into ~100k particles whose
 * offsets and velocities live in float textures and are simulated on the GPU.
 * The cursor blows them outward and swirls them around itself (so a resting
 * cursor winds them into a vortex), a flow map carries the wake of a moving
 * cursor, curl noise stirs disturbed material, and an elastic force brings
 * every particle home. At rest the crisp image is shown; particles appear only
 * where the material is disturbed. Changes for Shadeon: the image is our own
 * rendered sculpture (a canvas with transparency), options are fixed, the
 * image-background keying path and the intro are removed, and the code follows
 * this project's TypeScript rules. Requires WebGL2 with float render targets;
 * the constructor throws otherwise, and the caller falls back.
 */

export type Rect = { x: number; y: number; w: number; h: number };

const STRENGTH = 1;
const RADIUS = 220; // px at a 1400px-wide sculpture
const SPREAD = 1;
const TURBULENCE = 1;
const RETURN_SPEED = 1;
const LIQUID = 1;
const DOT_SIZE = 1;
const TEX_W = 1024;
const SETTLE_FRAMES = 270;

function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v));
}

const NOISE = `
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*f*(f*(f*6.0-15.0)+10.0);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x), u.y); }
vec2 ambientField(vec2 uv, float t){
  vec2 q = uv*vec2(3.2,1.7);
  vec2 a = vec2(vnoise(q+vec2(t*0.11,0.0))-0.5, vnoise(q+vec2(5.2,t*0.08)+3.1)-0.5);
  vec2 q2 = uv*vec2(7.5,4.0) + vec2(-t*0.19, t*0.13);
  vec2 b = vec2(vnoise(q2+1.7)-0.5, vnoise(q2+9.3)-0.5);
  return a + b*0.45;
}
`;

// Energy of the material at a point, shared by the image and the particles so
// their cross-fade is exactly complementary.
const ENERGY = `
float energyAt(vec2 rectPx, vec2 mouse, float radius, float presence, float wakeEnergy){
  vec2 d = rectPx - mouse;
  float f = exp(-dot(d,d)/(radius*radius))*presence;
  return smoothstep(0.06, 0.5, f*1.15 + wakeEnergy*1.7);
}
`;

const QUAD_VS = `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;

// Flow map (cursor wake). RGBA8: velocity encoded around 128, energy in B.
const FLOW_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform vec2 uMouse;
uniform vec2 uVel;
uniform vec2 uSize;
uniform float uRadius;
uniform float uPresence;
uniform float uDecay;
vec2 decV(vec4 c){ return (c.rg*255.0-128.0)/127.0; }
void main(){
  vec2 v0 = decV(texture(uPrev, vUv));
  vec2 uv = vUv - v0*uTexel*2.5;
  vec4 c = texture(uPrev, uv)*0.52
    + 0.12*(texture(uPrev, uv+vec2(uTexel.x,0.0)) + texture(uPrev, uv-vec2(uTexel.x,0.0))
          + texture(uPrev, uv+vec2(0.0,uTexel.y)) + texture(uPrev, uv-vec2(0.0,uTexel.y)));
  vec2 v = decV(c);
  float p = c.b;
  vec2 d = (vUv-uMouse)*uSize;
  float f = exp(-dot(d,d)/(uRadius*uRadius))*uPresence;
  float sp = clamp(length(uVel)*2.5, 0.0, 1.0);
  v += uVel*f*0.22;
  p = max(p, f*sp);
  v *= uDecay;
  p *= uDecay;
  v = sign(v)*max(abs(v)-1.2/127.0, 0.0);
  p = max(p-1.2/255.0, 0.0);
  v = clamp(v, -1.0, 1.0);
  o = vec4((v*127.0+128.0)/255.0, p, 1.0);
}
`;

// GPGPU step: state = (offset.xy, velocity.xy) in rect CSS px.
const SIM_FS = `#version 300 es
precision highp float;
out vec4 o;
uniform sampler2D uState;
uniform sampler2D uHome;
uniform sampler2D uFlow;
uniform vec2 uSize;
uniform vec2 uMouse;
uniform float uRadius;
uniform float uPresence;
uniform float uStrength;
uniform float uSpread;
uniform float uTurb;
uniform float uReturn;
uniform float uTime;
uniform float uDt;
${NOISE}
vec2 curl(vec2 p){
  const float e = 0.35;
  float a = vnoise(p+vec2(0.0,e)) - vnoise(p-vec2(0.0,e));
  float b = vnoise(p+vec2(e,0.0)) - vnoise(p-vec2(e,0.0));
  return vec2(a, -b)/(2.0*e);
}
void main(){
  ivec2 ij = ivec2(gl_FragCoord.xy);
  vec4 hm = texelFetch(uHome, ij, 0);
  if(hm.w <= 0.0){ o = vec4(0.0); return; }
  vec4 st = texelFetch(uState, ij, 0);
  vec2 off = st.xy;
  vec2 vel = st.zw;
  float sd = hm.z;
  float light = 0.45 + sd*1.1;

  vec2 p = hm.xy*uSize + off;
  vec4 fl = texture(uFlow, clamp(p/uSize, 0.0, 1.0));
  vec2 wake = (fl.rg*255.0-128.0)/127.0;
  float pr = fl.b;

  vec2 toM = p - uMouse;
  float r2 = dot(toM,toM);
  float f = exp(-r2/(uRadius*uRadius))*uPresence;
  vec2 n = toM*inversesqrt(r2+1.0);
  float e = clamp(pr*2.0 + f, 0.0, 1.0);

  vec2 acc = vec2(0.0);
  // blown outward and swirled around the cursor
  acc += n*f*1.25*uStrength*uSpread*light;
  acc += vec2(-n.y, n.x)*f*1.45*uStrength*uSpread*(0.4+sd);
  // carried by the liquid wake
  acc += (wake*42.0*uSpread*light - vel)*e*0.08;
  // curl-noise turbulence where the material is disturbed
  vec2 q = p*0.0095 + vec2(uTime*0.35, -uTime*0.2);
  vec2 c = curl(q) + 0.5*curl(q*2.3 + 7.1);
  acc += c*(e*1.2*uSpread)*uTurb*light;
  // elastic return home
  float k = (0.006 + 0.02*uReturn)*(0.65+sd*0.7);
  acc -= off*k;

  vel += acc*uDt;
  vel *= pow(mix(0.93, 0.955, e), uDt);
  off += vel*uDt;
  if(dot(off,off) < 0.0004 && dot(vel,vel) < 0.0004){ off = vec2(0.0); vel = vec2(0.0); }
  o = vec4(off, vel);
}
`;

// Particles: one instanced quad per particle, a capsule stretched along velocity.
const PART_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
uniform sampler2D uState;
uniform sampler2D uHome;
uniform sampler2D uCol;
uniform sampler2D uFlow;
uniform int uTexW;
uniform vec4 uRect;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uRadius;
uniform float uPresence;
uniform float uDot;
uniform float uTime;
uniform float uAmbient;
uniform float uStreak;
out vec2 vLocal;
out float vHalfLen;
out float vR;
out vec3 vCol;
out float vA;
${NOISE}
${ENERGY}
void main(){
  int id = gl_InstanceID;
  ivec2 ij = ivec2(id % uTexW, id / uTexW);
  vec4 hm = texelFetch(uHome, ij, 0);
  vec4 st = texelFetch(uState, ij, 0);
  vec4 cl = texelFetch(uCol, ij, 0);

  float wakeE = texture(uFlow, hm.xy).b;
  float E = energyAt(hm.xy*uRect.zw, uMouse, uRadius, uPresence, wakeE);
  float lift = smoothstep(0.35, 2.5, length(st.xy));
  float a = max(E, lift);
  if(a < 0.01 || hm.w <= 0.0){ gl_Position = vec4(2.0,2.0,2.0,1.0); return; }

  vec2 base = uRect.xy + hm.xy*uRect.zw + st.xy;
  base -= ambientField(hm.xy, uTime)*10.0*uAmbient;

  vec2 v = st.zw;
  float sp = length(v);
  vec2 dir = sp > 0.001 ? v/sp : vec2(1.0,0.0);
  float r = uDot*hm.w*0.5;
  float len = min(sp*1.25, 18.0)*uStreak;
  vec2 lc = aCorner*vec2(r + len*0.5 + 1.0, r + 1.0);
  vec2 center = base - dir*len*0.5;
  vec2 world = center + dir*lc.x + vec2(-dir.y, dir.x)*lc.y;

  vec2 clip = world/uRes*2.0-1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  vLocal = lc;
  vHalfLen = len*0.5;
  vR = r;
  vec3 col = cl.rgb;
  // fast material catches the light, like liquid metal
  float glint = smoothstep(2.0, 16.0, sp);
  col = mix(col, min(col*1.18 + vec3(0.07,0.075,0.085), vec3(1.0)), glint*0.75);
  vCol = col;
  vA = a;
}
`;

const PART_FS = `#version 300 es
precision highp float;
in vec2 vLocal;
in float vHalfLen;
in float vR;
in vec3 vCol;
in float vA;
uniform float uDpr;
out vec4 o;
void main(){
  vec2 q = vec2(max(abs(vLocal.x)-vHalfLen, 0.0), vLocal.y);
  float d = length(q) - vR;
  float a = clamp(0.5 - d*uDpr, 0.0, 1.0);
  // comet tail: the trailing end thins out
  float tail = vHalfLen > 0.0 ? clamp(0.5 - vLocal.x/(2.0*(vHalfLen+vR)), 0.0, 1.0) : 0.0;
  a *= 1.0 - tail*0.55;
  a *= vA;
  if(a < 0.004) discard;
  o = vec4(vCol*a, a);
}
`;

// Image pass: the crisp sculpture, gently lensed, fading out where the
// material has turned liquid.
const IMAGE_FS = `#version 300 es
precision highp float;
out vec4 o;
uniform sampler2D uImg;
uniform sampler2D uFlow;
uniform vec2 uRes;
uniform float uDpr;
uniform vec4 uRect;
uniform vec2 uMouse;
uniform float uPresence;
uniform float uRadius;
uniform float uStrength;
uniform float uTime;
uniform float uAmbient;
${NOISE}
${ENERGY}
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y*uDpr - gl_FragCoord.y)/uDpr;
  vec2 size = uRect.zw;
  vec2 uv = (px-uRect.xy)/size;
  if(uv.x < -0.05 || uv.x > 1.05 || uv.y < -0.12 || uv.y > 1.12){ o = vec4(0.0); return; }
  vec4 fl = texture(uFlow, clamp(uv,0.0,1.0));
  vec2 vel = (fl.rg*255.0-128.0)/127.0;
  vec2 rp = uv*size;
  vec2 toM = rp - uMouse;
  float fall = exp(-dot(toM,toM)/(uRadius*uRadius))*uPresence;
  vec2 disp = -toM*0.22*uStrength*fall - vel*10.0*uStrength;
  disp += ambientField(uv, uTime)*10.0*uAmbient;
  vec2 suv = uv + disp/size;
  vec4 tx = texture(uImg, suv);
  vec2 e = smoothstep(vec2(0.0), vec2(0.004,0.01), suv) * smoothstep(vec2(1.0), vec2(0.996,0.99), suv);
  float k = tx.a*e.x*e.y;
  float E = energyAt(rp, uMouse, uRadius, uPresence, fl.b);
  // premultiplied: empty areas stay transparent so the page shows through
  float A = k*(1.0 - E);
  o = vec4(tx.rgb*A, A);
}
`;

type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): Prog {
  const make = (type: number, src: string): WebGLShader => {
    const sh = gl.createShader(type);
    if (!sh) throw new Error("Could not create a shader");
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error("Shader: " + log);
    }
    return sh;
  };
  const p = gl.createProgram();
  if (!p) throw new Error("Could not create a program");
  const v = make(gl.VERTEX_SHADER, vs);
  const f = make(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.bindAttribLocation(p, 0, "aPos");
  gl.linkProgram(p);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error("Link: " + gl.getProgramInfoLog(p));
  }
  const u: Record<string, WebGLUniformLocation | null> = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    if (info) u[info.name] = gl.getUniformLocation(p, info.name);
  }
  return { p, u };
}

const loc = (prog: Prog, name: string): WebGLUniformLocation | null => prog.u[name] ?? null;

export interface LiquidEngineOptions {
  /** Upper bound for devicePixelRatio. */
  maxDpr: number;
  /** Fewer particles (phones, weak hardware). */
  lowPower: boolean;
  /** Visitors who prefer reduced motion get the still image, no interaction. */
  reducedMotion: boolean;
  onFail: () => void;
}

export class LiquidEngine {
  /** Called once, after the first frame has been drawn. */
  onFirstFrame: (() => void) | null = null;

  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private opts: LiquidEngineOptions;

  private pFlow: Prog;
  private pSim: Prog;
  private pPart: Prog;
  private pImg: Prog;
  private vao: WebGLVertexArrayObject;
  private quad: WebGLBuffer;

  private imgTex: WebGLTexture | null = null;
  private flowTex: WebGLTexture[] = [];
  private flowFb: WebGLFramebuffer[] = [];
  private flowW = 256;
  private flowH = 104;
  private flowIdx = 0;
  private flowDirty = false;

  private homeTex: WebGLTexture | null = null;
  private colTex: WebGLTexture | null = null;
  private stateTex: WebGLTexture[] = [];
  private stateFb: WebGLFramebuffer[] = [];
  private stateIdx = 0;
  private texH = 1;
  private n = 0;
  private gridW = 1;
  private stateDirty = false;
  private flowing = 0;

  private aspect = 2.5;
  private rect: Rect = { x: 0, y: 0, w: 1, h: 1 };
  private cssW = 1;
  private cssH = 1;

  private target = { x: -9999, y: -9999 };
  private mouse = { x: -9999, y: -9999 };
  private prevMouse = { x: -9999, y: -9999 };
  private mvel = { x: 0, y: 0 };
  private presence = 0;
  private presenceTarget = 0;
  private burst = 0;
  private settle = 1e9;
  private touchRelease = 0;

  private time = 0;
  private raf = 0;
  private running = false;
  private last = 0;
  private visible = true;
  private ready = false;
  private destroyed = false;
  private lost = false;

  constructor(canvas: HTMLCanvasElement, opts: LiquidEngineOptions) {
    this.canvas = canvas;
    this.opts = opts;
    // alpha: an unpresented canvas stays transparent, so the page shows through
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    // float render targets: RGBA16F is enough (offsets in px, sub-pixel precision)
    const full = gl.getExtension("EXT_color_buffer_float");
    const half = full ? null : gl.getExtension("EXT_color_buffer_half_float");
    if (!full && !half) throw new Error("No float render targets");

    this.pFlow = compile(gl, QUAD_VS, FLOW_FS);
    this.pSim = compile(gl, QUAD_VS, SIM_FS);
    this.pPart = compile(gl, PART_VS, PART_FS);
    this.pImg = compile(gl, QUAD_VS, IMAGE_FS);

    const vao = gl.createVertexArray();
    const quad = gl.createBuffer();
    if (!vao || !quad) throw new Error("Could not create buffers");
    this.vao = vao;
    this.quad = quad;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    for (let i = 0; i < 2; i++) {
      const t = this.makeTex(
        gl.RGBA8,
        this.flowW,
        this.flowH,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
        gl.LINEAR,
      );
      const fb = gl.createFramebuffer();
      if (!fb) throw new Error("Could not create a framebuffer");
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      this.flowTex.push(t);
      this.flowFb.push(fb);
    }
    this.clearFlow();
    canvas.addEventListener("webglcontextlost", this.onLost, false);
  }

  private onLost = (e: Event): void => {
    e.preventDefault();
    this.lost = true;
    this.stop();
    this.opts.onFail();
  };

  private makeTex(
    internal: number,
    w: number,
    h: number,
    format: number,
    type: number,
    data: ArrayBufferView | null,
    filter: number,
  ): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture();
    if (!t) throw new Error("Could not create a texture");
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  private clearFlow(): void {
    const gl = this.gl;
    for (const fb of this.flowFb) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0, 0, this.flowW, this.flowH);
      gl.clearColor(128 / 255, 128 / 255, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.flowDirty = false;
  }

  private clearState(): void {
    const gl = this.gl;
    for (const fb of this.stateFb) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0, 0, TEX_W, this.texH);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.stateDirty = false;
  }

  /** The sculpture: a canvas whose transparent pixels are empty space. */
  setImage(source: HTMLCanvasElement): void {
    if (this.destroyed || this.lost) return;
    const gl = this.gl;
    this.aspect = source.width / source.height || 2.5;
    this.flowH = Math.max(32, Math.round(this.flowW / this.aspect));
    for (const t of this.flowTex) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        this.flowW,
        this.flowH,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
    }
    this.clearFlow();
    if (this.imgTex) gl.deleteTexture(this.imgTex);
    this.imgTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.imgTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.buildParticles(source);
    this.ready = true;
    this.wake();
  }

  get imageAspect(): number {
    return this.aspect;
  }

  /** One particle per material pixel of a grid laid over the image. */
  private buildParticles(source: HTMLCanvasElement): void {
    const gl = this.gl;
    const gw = this.opts.lowPower ? 640 : 1000;
    const gh = Math.max(1, Math.round(gw / this.aspect));
    this.gridW = gw;
    const c = document.createElement("canvas");
    c.width = gw;
    c.height = gh;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("No 2D context");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, gw, gh);
    const data = ctx.getImageData(0, 0, gw, gh).data;
    const home: number[] = [];
    const col: number[] = [];
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = (y * gw + x) * 4;
        const a = (data[i + 3] ?? 0) / 255;
        if (a < 0.12) continue;
        if (a < 0.5 && Math.random() > a * 2) continue;
        const jx = (Math.random() - 0.5) * 0.6;
        const jy = (Math.random() - 0.5) * 0.6;
        home.push(
          (x + 0.5 + jx) / gw,
          (y + 0.5 + jy) / gh,
          Math.random(),
          0.85 + Math.random() * 0.3,
        );
        col.push(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0, 255);
      }
    }
    const n = home.length / 4;
    this.n = n;
    this.texH = Math.max(1, Math.ceil(n / TEX_W));
    const total = TEX_W * this.texH;
    const homeArr = new Float32Array(total * 4);
    homeArr.set(home);
    const colArr = new Uint8Array(total * 4);
    colArr.set(col);

    for (const t of [this.homeTex, this.colTex, ...this.stateTex]) if (t) gl.deleteTexture(t);
    for (const f of this.stateFb) gl.deleteFramebuffer(f);
    this.stateTex = [];
    this.stateFb = [];
    this.homeTex = this.makeTex(
      gl.RGBA32F,
      TEX_W,
      this.texH,
      gl.RGBA,
      gl.FLOAT,
      homeArr,
      gl.NEAREST,
    );
    this.colTex = this.makeTex(
      gl.RGBA8,
      TEX_W,
      this.texH,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      colArr,
      gl.NEAREST,
    );
    for (let i = 0; i < 2; i++) {
      const t = this.makeTex(
        gl.RGBA16F,
        TEX_W,
        this.texH,
        gl.RGBA,
        gl.HALF_FLOAT,
        null,
        gl.NEAREST,
      );
      const fb = gl.createFramebuffer();
      if (!fb) throw new Error("Could not create a framebuffer");
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error("Float framebuffer incomplete");
      }
      this.stateTex.push(t);
      this.stateFb.push(fb);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.clearState();
  }

  setReducedMotion(reduced: boolean): void {
    this.opts = { ...this.opts, reducedMotion: reduced };
    if (reduced) this.presenceTarget = 0;
    this.wake();
  }

  resize(cssW: number, cssH: number, rect: Rect): void {
    this.cssW = Math.max(1, cssW);
    this.cssH = Math.max(1, cssH);
    this.rect = rect;
    let dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDpr);
    if (this.cssW * this.cssH * dpr * dpr > 4.5e6) {
      dpr = Math.max(1, Math.sqrt(4.5e6 / (this.cssW * this.cssH)));
    }
    const w = Math.round(this.cssW * dpr);
    const h = Math.round(this.cssH * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.draw();
  }

  setVisible(v: boolean): void {
    this.visible = v;
    if (v) this.wake();
    else this.stop();
  }

  /** x, y in CSS px relative to the canvas. */
  pointer(type: "move" | "down" | "up" | "leave", x: number, y: number, touch: boolean): void {
    if (this.lost || this.opts.reducedMotion) return;
    const now = performance.now();
    if (type === "leave" || type === "up") {
      if (touch) this.touchRelease = now + 260;
      else this.presenceTarget = 0;
      this.wake();
      return;
    }
    if (this.mouse.x < -9000 || type === "down") {
      this.mouse.x = this.prevMouse.x = x;
      this.mouse.y = this.prevMouse.y = y;
    }
    this.target.x = x;
    this.target.y = y;
    this.presenceTarget = 1;
    this.settle = 0;
    if (type === "down") {
      this.burst = 1;
      this.touchRelease = 0;
    }
    this.wake();
  }

  private wake(): void {
    if (!this.ready || this.running || !this.visible || this.destroyed || this.lost) {
      if (this.ready && !this.running) this.draw();
      return;
    }
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private radiusPx(): number {
    return RADIUS * clamp(this.rect.w / 1400, 0.6, 1.25);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const rawMs = now - this.last;
    const dt = clamp(rawMs / 16.6667, 0.25, 3);
    this.last = now;

    if (this.touchRelease && now > this.touchRelease) {
      this.presenceTarget = 0;
      this.touchRelease = 0;
    }
    const ease = 1 - Math.pow(1 - 0.22, dt);
    this.mouse.x += (this.target.x - this.mouse.x) * ease;
    this.mouse.y += (this.target.y - this.mouse.y) * ease;
    const vx = (this.mouse.x - this.prevMouse.x) / dt;
    const vy = (this.mouse.y - this.prevMouse.y) / dt;
    this.prevMouse.x = this.mouse.x;
    this.prevMouse.y = this.mouse.y;
    this.mvel.x += (clamp(vx, -60, 60) - this.mvel.x) * 0.5;
    this.mvel.y += (clamp(vy, -60, 60) - this.mvel.y) * 0.5;
    const pk = this.presenceTarget > this.presence ? 0.1 : 0.035;
    this.presence += (this.presenceTarget - this.presence) * (1 - Math.pow(1 - pk, dt));
    if (this.presence < 0.001 && this.presenceTarget === 0) this.presence = 0;
    const fk = this.presenceTarget > this.flowing ? 0.05 : 0.018;
    this.flowing += (this.presenceTarget - this.flowing) * (1 - Math.pow(1 - fk, dt));
    if (this.flowing < 0.002 && this.presenceTarget === 0) this.flowing = 0;

    const interacting = this.presence > 0.001 || this.burst > 0;
    // settle is counted in simulated frames, so slow devices never snap mid-return
    this.settle = interacting ? 0 : this.settle + dt;
    const active = interacting || this.settle < SETTLE_FRAMES;

    if (!active) {
      if (this.flowDirty) this.clearFlow();
      if (this.stateDirty) this.clearState();
      this.draw();
      this.firstFrame();
      this.stop();
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
    // the field speeds up while the material is being stirred
    this.time += (dt * (1 + this.flowing * 1.6)) / 60;
    this.stepFlow(dt);
    this.stepSim(dt);
    this.burst = Math.max(0, this.burst - 0.1 * dt);
    this.draw();
    this.firstFrame();
  };

  private firstFrame(): void {
    if (this.onFirstFrame) {
      const cb = this.onFirstFrame;
      this.onFirstFrame = null;
      // one more frame so the compositor has presented the canvas
      requestAnimationFrame(() => cb());
    }
  }

  private stepFlow(dt: number): void {
    const gl = this.gl;
    const P = this.pFlow;
    const dst = 1 - this.flowIdx;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.flowFb[dst] ?? null);
    gl.viewport(0, 0, this.flowW, this.flowH);
    gl.disable(gl.BLEND);
    gl.useProgram(P.p);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.flowTex[this.flowIdx] ?? null);
    gl.uniform1i(loc(P, "uPrev"), 0);
    gl.uniform2f(loc(P, "uTexel"), 1 / this.flowW, 1 / this.flowH);
    const r = this.rect;
    gl.uniform2f(loc(P, "uMouse"), (this.mouse.x - r.x) / r.w, (this.mouse.y - r.y) / r.h);
    gl.uniform2f(loc(P, "uVel"), clamp(this.mvel.x / 40, -1, 1), clamp(this.mvel.y / 40, -1, 1));
    gl.uniform2f(loc(P, "uSize"), r.w, r.h);
    gl.uniform1f(loc(P, "uRadius"), this.radiusPx());
    gl.uniform1f(loc(P, "uPresence"), Math.max(this.presence, this.burst));
    gl.uniform1f(loc(P, "uDecay"), Math.pow(0.968, dt));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.flowIdx = dst;
    this.flowDirty = true;
  }

  private stepSim(dt: number): void {
    if (!this.n) return;
    const gl = this.gl;
    const P = this.pSim;
    const r = this.rect;
    const dst = 1 - this.stateIdx;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.stateFb[dst] ?? null);
    gl.viewport(0, 0, TEX_W, this.texH);
    gl.disable(gl.BLEND);
    gl.useProgram(P.p);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex[this.stateIdx] ?? null);
    gl.uniform1i(loc(P, "uState"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.homeTex);
    gl.uniform1i(loc(P, "uHome"), 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.flowTex[this.flowIdx] ?? null);
    gl.uniform1i(loc(P, "uFlow"), 2);
    gl.uniform2f(loc(P, "uSize"), r.w, r.h);
    gl.uniform2f(loc(P, "uMouse"), this.mouse.x - r.x, this.mouse.y - r.y);
    gl.uniform1f(loc(P, "uRadius"), this.radiusPx());
    gl.uniform1f(loc(P, "uPresence"), Math.max(this.presence, this.burst));
    gl.uniform1f(loc(P, "uStrength"), STRENGTH * (1 + this.burst * 1.5));
    gl.uniform1f(loc(P, "uSpread"), SPREAD);
    gl.uniform1f(loc(P, "uTurb"), TURBULENCE);
    gl.uniform1f(loc(P, "uReturn"), RETURN_SPEED);
    gl.uniform1f(loc(P, "uTime"), this.time);
    gl.uniform1f(loc(P, "uDt"), dt);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.stateIdx = dst;
    this.stateDirty = true;
  }

  private draw(): void {
    if (!this.ready || this.lost || this.destroyed) return;
    const gl = this.gl;
    const r = this.rect;
    const amb = this.flowing * 0.85 * LIQUID;
    const dpr = this.canvas.width / this.cssW;
    const pres = Math.max(this.presence, this.burst);
    const mx = this.mouse.x - r.x;
    const my = this.mouse.y - r.y;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.bindVertexArray(this.vao);
    gl.disable(gl.BLEND);

    const I = this.pImg;
    gl.useProgram(I.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imgTex);
    gl.uniform1i(loc(I, "uImg"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.flowTex[this.flowIdx] ?? null);
    gl.uniform1i(loc(I, "uFlow"), 1);
    gl.uniform2f(loc(I, "uRes"), this.cssW, this.cssH);
    gl.uniform1f(loc(I, "uDpr"), dpr);
    gl.uniform4f(loc(I, "uRect"), r.x, r.y, r.w, r.h);
    gl.uniform2f(loc(I, "uMouse"), mx, my);
    gl.uniform1f(loc(I, "uPresence"), pres);
    gl.uniform1f(loc(I, "uRadius"), this.radiusPx());
    gl.uniform1f(loc(I, "uStrength"), STRENGTH);
    gl.uniform1f(loc(I, "uTime"), this.time);
    gl.uniform1f(loc(I, "uAmbient"), amb);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // particles are invisible at rest: skip them entirely
    if (!this.n || !this.stateDirty) return;

    const P = this.pPart;
    gl.useProgram(P.p);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex[this.stateIdx] ?? null);
    gl.uniform1i(loc(P, "uState"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.homeTex);
    gl.uniform1i(loc(P, "uHome"), 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.colTex);
    gl.uniform1i(loc(P, "uCol"), 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.flowTex[this.flowIdx] ?? null);
    gl.uniform1i(loc(P, "uFlow"), 3);
    gl.uniform1i(loc(P, "uTexW"), TEX_W);
    gl.uniform4f(loc(P, "uRect"), r.x, r.y, r.w, r.h);
    gl.uniform2f(loc(P, "uRes"), this.cssW, this.cssH);
    gl.uniform2f(loc(P, "uMouse"), mx, my);
    gl.uniform1f(loc(P, "uRadius"), this.radiusPx());
    gl.uniform1f(loc(P, "uPresence"), pres);
    gl.uniform1f(loc(P, "uDot"), (r.w / this.gridW) * 1.45 * DOT_SIZE);
    gl.uniform1f(loc(P, "uTime"), this.time);
    gl.uniform1f(loc(P, "uAmbient"), amb);
    gl.uniform1f(loc(P, "uStreak"), 1);
    gl.uniform1f(loc(P, "uDpr"), dpr);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n);
    gl.disable(gl.BLEND);
  }

  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    const gl = this.gl;
    if (!this.lost) {
      gl.deleteBuffer(this.quad);
      gl.deleteVertexArray(this.vao);
      for (const t of [...this.flowTex, ...this.stateTex, this.imgTex, this.homeTex, this.colTex]) {
        if (t) gl.deleteTexture(t);
      }
      for (const f of [...this.flowFb, ...this.stateFb]) gl.deleteFramebuffer(f);
      for (const p of [this.pFlow, this.pSim, this.pPart, this.pImg]) gl.deleteProgram(p.p);
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
