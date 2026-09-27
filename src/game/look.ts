import * as THREE from 'three';

/** Shared, locally generated art assets. No image downloads or runtime services. */
const textures = new Map<string, THREE.CanvasTexture>();
const materials = new Map<string, THREE.MeshStandardMaterial>();

function seeded(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

export function surfaceTexture(kind: 'grass' | 'gravel' | 'bark' | 'water' | 'fur') {
  const cached = textures.get(kind); if (cached) return cached;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const rand = seeded({ grass: 9305, gravel: 472, bark: 683, water: 18, fur: 245 }[kind]);
  const pixels = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const index = (y * 256 + x) * 4;
    const u = x / 256 * Math.PI * 2, v = y / 256 * Math.PI * 2;
    const broad = Math.sin(u * 3 + Math.sin(v * 2)) * Math.cos(v * 3 - Math.sin(u));
    let value = 222 + broad * 9 + (rand() - .5) * 25;
    if (kind === 'bark') value = 197 + Math.sin(u * 22 + Math.sin(v * 2) * .8) * 24 + (rand() - .5) * 31;
    if (kind === 'water') value = 128 + Math.sin(u * 6 + Math.cos(v * 3) * 1.4) * 17 + Math.cos(v * 8 + u * 3) * 12;
    if (kind === 'fur') value = 216 + Math.sin(u * 51 + Math.sin(v * 3)) * 8 + (rand() - .5) * 18;
    pixels.data[index] = value;
    pixels.data[index + 1] = value;
    pixels.data[index + 2] = value - (kind === 'water' ? 0 : 4);
    pixels.data[index + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  if (kind === 'grass') {
    for (let i = 0; i < 1250; i++) {
      const x = rand() * 256, y = rand() * 256;
      ctx.strokeStyle = i % 3 ? 'rgba(63,92,47,.17)' : 'rgba(255,250,223,.35)';
      ctx.lineWidth = .45 + rand() * .75;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rand() - .5) * 4, y - 1 - rand() * 4); ctx.stroke();
    }
  }
  if (kind === 'gravel') {
    for (let i = 0; i < 2300; i++) {
      ctx.fillStyle = i % 3 ? 'rgba(74,69,53,.19)' : 'rgba(255,253,234,.65)';
      ctx.beginPath(); ctx.ellipse(rand() * 256, rand() * 256, .3 + rand() * 1.3, .3 + rand(), rand() * 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (kind === 'bark') {
    ctx.strokeStyle = 'rgba(43,36,25,.27)'; ctx.lineWidth = .8;
    for (let i = 0; i < 65; i++) {
      const x = rand() * 256, y = rand() * 256;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rand() * 3, y + 12 + rand() * 46); ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `Lillåsen · ${kind}`;
  texture.colorSpace = kind === 'water' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  if (kind === 'grass') texture.repeat.set(46, 46);
  if (kind === 'water') texture.repeat.set(6, 6);
  textures.set(kind, texture);
  return texture;
}

export function texturedMaterial(kind: 'bark' | 'fur', color: string) {
  const key = `${kind}:${color}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({
    color, map: surfaceTexture(kind), bumpMap: surfaceTexture(kind),
    bumpScale: kind === 'bark' ? .035 : .009, roughness: .94,
  }));
  return materials.get(key)!;
}

/** Inexpensive contact shadows also work with real-time shadows switched off.
 * Cosmetic decals must never be considered an animal/weapon hit target. */
export function contactShadow(width: number, depth: number, opacity = .3) {
  let texture = textures.get('contact');
  if (!texture) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 5, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(255,255,255,.95)');
    gradient.addColorStop(.35, 'rgba(255,255,255,.68)');
    gradient.addColorStop(.7, 'rgba(255,255,255,.23)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    texture = new THREE.CanvasTexture(canvas); texture.name = 'Mjuk markskugga';
    textures.set('contact', texture);
  }
  const material = new THREE.MeshBasicMaterial({ map: texture, color: '#14281e', transparent: true, opacity, depthWrite: false, toneMapped: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  shadow.name = 'Contact shadow — decoration only';
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .062; shadow.renderOrder = -1;
  shadow.raycast = () => undefined;
  return shadow;
}

/** Layered, irregular spruce branches instead of large featureless cones.
 * Each crown is still drawn as a single instanced mesh across the whole forest. */
export function firCanopy(radius: number, height: number) {
  const rings = [[0, .78], [.10, 1], [.44, .50], [.51, .63], [.82, .18], [1, .005]];
  const count = 12, positions: number[] = [], colors: number[] = [], indices: number[] = [];
  for (let row = 0; row < rings.length; row++) {
    const [t, r] = rings[row];
    for (let j = 0; j <= count; j++) {
      const a = j % count / count * Math.PI * 2;
      const jag = .91 + .07 * Math.sin(a * 3 + t * 2) + (j % 2 ? .025 : -.025);
      const droop = (j % 2 ? -.035 : .014) * (1 - t) * height;
      positions.push(Math.cos(a) * r * radius * jag, (t - .5) * height + droop, Math.sin(a) * r * radius * jag);
      const value = (row % 2 ? .98 : .76) + t * .08;
      colors.push(value * .94, value, value * .91);
      if (row < rings.length - 1 && j < count) {
        const n = row * (count + 1) + j, next = n + count + 1;
        indices.push(n, next, n + 1, n + 1, next, next + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.name = 'Skulpterade grangrenar';
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function meadowGrass() {
  const vertices: number[] = [], colors: number[] = [], indices: number[] = [];
  for (let blade = 0; blade < 5; blade++) {
    const a = blade * 2.399, x = Math.cos(a) * .12, z = Math.sin(a) * .12;
    const h = .28 + (blade % 3) * .12, w = .055, lean = .08;
    const points = [[x - Math.cos(a) * w, 0, z - Math.sin(a) * w], [x + Math.cos(a) * w, 0, z + Math.sin(a) * w], [x + Math.sin(a) * lean + Math.cos(a) * w * .4, h * .55, z + Math.cos(a) * lean + Math.sin(a) * w * .4], [x + Math.sin(a) * lean - Math.cos(a) * w * .4, h * .55, z + Math.cos(a) * lean - Math.sin(a) * w * .4], [x + Math.sin(a) * .16, h, z + Math.cos(a) * .16]];
    const offset = vertices.length / 3;
    points.forEach((p, i) => { vertices.push(...p); const v = i < 2 ? .66 : i === 4 ? 1 : .88; colors.push(v * .95, v, v * .8); });
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3, offset + 3, offset + 2, offset + 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.name = 'Böjda grässtrån';
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function summerFlowers() {
  const root = new THREE.Group(); root.name = 'Ängsblommor vid gården';
  const random = seeded(802);
  const petals = new THREE.InstancedMesh(new THREE.SphereGeometry(.047, 6, 4), new THREE.MeshStandardMaterial({ color: '#fff8df', roughness: .92 }), 600);
  const centres = new THREE.InstancedMesh(new THREE.SphereGeometry(.034, 7, 5), new THREE.MeshStandardMaterial({ color: '#e6b64a', roughness: .9 }), 120);
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(.009, .016, .35, 4), new THREE.MeshStandardMaterial({ color: '#597d45', roughness: 1 }), 120);
  const dummy = new THREE.Object3D();
  const clusters = [[-13, 5], [-19, 11], [-11, 14], [12, 14], [25, -12], [-30, -38]];
  for (let i = 0; i < 120; i++) {
    const cluster = clusters[i % clusters.length], angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 2.1;
    const x = cluster[0] + Math.cos(angle) * radius, z = cluster[1] + Math.sin(angle) * radius, height = .23 + random() * .24;
    dummy.position.set(x, height / 2, z); dummy.rotation.set(0, 0, .04 * Math.sin(i)); dummy.scale.set(1, height / .35, 1); dummy.updateMatrix(); stems.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, height, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, .55, 1); dummy.updateMatrix(); centres.setMatrixAt(i, dummy.matrix);
    for (let petal = 0; petal < 5; petal++) {
      const a = petal / 5 * Math.PI * 2 + i;
      dummy.position.set(x + Math.cos(a) * .047, height, z + Math.sin(a) * .047); dummy.scale.set(1, .27, 1); dummy.updateMatrix(); petals.setMatrixAt(i * 5 + petal, dummy.matrix);
    }
  }
  root.add(stems, petals, centres);
  return root;
}

export function skyDome() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: {
      zenith: { value: new THREE.Color('#88b7d0') }, horizon: { value: new THREE.Color('#dde7da') },
      sunDirection: { value: new THREE.Vector3(-.45, .73, .50).normalize() },
    },
    vertexShader: 'varying vec3 vWorld; void main(){vec4 p=modelMatrix*vec4(position,1.0);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader: `uniform vec3 zenith; uniform vec3 horizon; uniform vec3 sunDirection; varying vec3 vWorld;
      void main(){vec3 direction=normalize(vWorld-cameraPosition);float h=max(direction.y,0.0);
      vec3 color=mix(horizon,zenith,pow(h,.56));float sun=pow(max(dot(direction,sunDirection),0.0),240.0);
      color+=vec3(1.,.79,.45)*sun*.5;gl_FragColor=vec4(color,1.0);
      #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(195, 32, 16), material);
  sky.name = 'Nordisk sommarhimmel'; sky.renderOrder = -100; sky.frustumCulled = false; sky.raycast = () => undefined;
  return sky;
}

/** Small procedural reflection map, assigned only to metal/glass/car paint. */
export function outdoorReflections(renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#81b7d7'); gradient.addColorStop(.4, '#d2e3e5');
  gradient.addColorStop(.5, '#faf3d9'); gradient.addColorStop(.57, '#849d77'); gradient.addColorStop(1, '#394d38');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 256);
  const sun = ctx.createRadialGradient(340, 78, 1, 340, 78, 40);
  sun.addColorStop(0, '#fffce9'); sun.addColorStop(.18, 'rgba(255,249,218,.96)'); sun.addColorStop(1, 'rgba(255,249,218,0)');
  ctx.fillStyle = sun; ctx.fillRect(285, 23, 110, 110);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  const generator = new THREE.PMREMGenerator(renderer);
  try {
    const target = generator.fromEquirectangular(texture);
    target.texture.name = 'Lillåsen sky reflections'; return target;
  } catch {
    // Reflection support is optional. Lighting and all gameplay remain available.
    return null;
  } finally { generator.dispose(); texture.dispose(); }
}

/** Soft-edged dirt clearings and dusty wheel marks, without hard circles/rails. */
export function groundDecal(kind: 'clearing' | 'track') {
  const key = `decal:${kind}`;
  const cached = textures.get(key); if (cached) return cached;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(128, 128), random = seeded(kind === 'track' ? 459 : 911);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const i = (y * 128 + x) * 4, u = (x - 63.5) / 63.5, v = (y - 63.5) / 63.5;
    let alpha;
    if (kind === 'clearing') {
      const angle = Math.atan2(v, u);
      const edge = .89 + Math.sin(angle * 5) * .04 + Math.cos(angle * 3) * .045;
      alpha = THREE.MathUtils.smoothstep(edge - Math.hypot(u, v), 0, .36) * (.78 + random() * .20);
    } else alpha = Math.pow(Math.max(0, 1 - u * u), 1.6) * (.58 + .22 * Math.sin(y / 128 * Math.PI * 8) + random() * .17);
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
    pixels.data[i + 3] = Math.round(alpha * 255);
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas); texture.name = `Lillåsen · ${kind} decal`;
  if (kind === 'track') texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4; textures.set(key, texture); return texture;
}
