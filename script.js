// =================================================================
//  PROJECT DATA
// =================================================================

const projects = [
  {
    id: 'PROJECT-001',
    status: 'ACTIVE',
    title: 'WRITEQUEST',
    description: 'Creative writing platform with AI-powered assistance, real-time collaboration, and immersive storytelling tools for modern authors.',
    tags: ['CREATIVE', 'AI', 'COLLAB'],
    url: 'https://writequest.netlify.app/',
    image: 'images/WriteQuest.jpg'
  },
  {
    id: 'PROJECT-002',
    status: 'LIVE',
    title: 'NEWTON\'S BOUNCE',
    description: 'Interactive physics simulation game with WebGL rendering, realistic particle dynamics, and engaging gameplay mechanics.',
    tags: ['WEBGL', 'PHYSICS', 'GAME'],
    url: 'https://newtonsbounce.netlify.app',
    image: 'images/Bounce.jpg'
  },
  {
    id: 'PROJECT-003',
    status: 'DEPLOYED',
    title: 'INFORELAX',
    description: 'Relaxation and meditation platform with ambient soundscapes, guided sessions, and beautiful visual experiences for mindfulness.',
    tags: ['WELLNESS', 'AUDIO', 'UX'],
    url: 'https://inforelax.netlify.app',
    image: 'images/InfoRelax.jpg'
  }
];

// =================================================================
//  GLSL SHADER COMMON CODE
// =================================================================

const glslCommon = /* glsl */`
#define PI 3.14159265359

uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform vec2 uResolution;
uniform vec2 uFromSize;
uniform vec2 uToSize;
uniform float uProgress;
uniform float uTime;
uniform float uDirection;

varying vec2 vUv;

// FBM Noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for(int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Cover fit function
vec2 coverFit(vec2 uv, vec2 container, vec2 content) {
  float containerAspect = container.x / container.y;
  float contentAspect = content.x / content.y;
  vec2 scale = vec2(1.0);
  vec2 offset = vec2(0.0);

  if(containerAspect > contentAspect) {
    scale.y = containerAspect / contentAspect;
    offset.y = (1.0 - scale.y) * 0.5;
  } else {
    scale.x = contentAspect / containerAspect;
    offset.x = (1.0 - scale.x) * 0.5;
  }

  return (uv - offset) / scale;
}

// RGB split sampling
vec4 sampleRGB(sampler2D tex, vec2 uv, float offset) {
  float r = texture2D(tex, uv + vec2(offset, 0.0)).r;
  float g = texture2D(tex, uv).g;
  float b = texture2D(tex, uv - vec2(offset, 0.0)).b;
  return vec4(r, g, b, 1.0);
}

// Grain
float grain(vec2 uv, float time) {
  return (hash(uv * time) - 0.5) * 0.03;
}

// Vignette
float vignette(vec2 uv) {
  float dist = distance(uv, vec2(0.5));
  return 1.0 - smoothstep(0.3, 0.9, dist);
}
`;

// =================================================================
//  TRANSITION SHADERS (5 different effects)
// =================================================================

const transitionShaders = [
  // 1. Liquid Morph
  /* glsl */ `${glslCommon}
  void main() {
    float t = uProgress;
    vec2 uv = vUv;
    float peak = sin(t * PI);

    vec2 disp = vec2(
      fbm(uv * 5.0 + uTime * 0.5),
      fbm(uv * 5.0 + uTime * 0.5 + vec2(50.0))
    ) - 0.5;

    float strength = peak * 0.1;
    vec2 uvFrom = uv + disp * strength;
    vec2 uvTo = uv - disp * strength * 0.5;

    vec2 fcUV = coverFit(uvFrom, uResolution, uFromSize);
    vec2 tcUV = coverFit(uvTo, uResolution, uToSize);

    float rgbSplit = peak * 0.012;
    vec4 fromC = sampleRGB(uFrom, fcUV, rgbSplit);
    vec4 toC = sampleRGB(uTo, tcUV, rgbSplit);

    float n = fbm(uv * 4.0 + uTime * 0.3);
    float dissolve = smoothstep(t - 0.15, t + 0.15, n * 0.5 + uv.x * 0.5);

    vec4 color = mix(fromC, toC, dissolve);
    color.rgb += grain(uv, uTime);
    color.rgb *= vignette(uv);
    gl_FragColor = color;
  }`,

  // 2. Directional Wipe
  /* glsl */ `${glslCommon}
  void main() {
    float t = uProgress;
    vec2 uv = vUv;
    float peak = sin(t * PI);

    vec2 uvFrom = uv;
    vec2 uvTo = uv;

    vec2 fcUV = coverFit(uvFrom, uResolution, uFromSize);
    vec2 tcUV = coverFit(uvTo, uResolution, uToSize);

    float rgbSplit = peak * 0.015;
    vec4 fromC = sampleRGB(uFrom, fcUV, rgbSplit);
    vec4 toC = sampleRGB(uTo, tcUV, rgbSplit);

    float wipe = smoothstep(t - 0.1, t + 0.1, uv.x + uDirection * 0.2);

    vec4 color = mix(fromC, toC, wipe);
    color.rgb += grain(uv, uTime);
    color.rgb *= vignette(uv);
    gl_FragColor = color;
  }`,

  // 3. Radial Zoom
  /* glsl */ `${glslCommon}
  void main() {
    float t = uProgress;
    vec2 uv = vUv;
    float peak = sin(t * PI);

    vec2 center = vec2(0.5);
    vec2 delta = uv - center;
    float dist = length(delta);

    float zoom = 1.0 + peak * 0.15;
    vec2 uvFrom = center + delta * zoom;
    vec2 uvTo = center + delta / zoom;

    vec2 fcUV = coverFit(uvFrom, uResolution, uFromSize);
    vec2 tcUV = coverFit(uvTo, uResolution, uToSize);

    float rgbSplit = peak * 0.01;
    vec4 fromC = sampleRGB(uFrom, fcUV, rgbSplit);
    vec4 toC = sampleRGB(uTo, tcUV, rgbSplit);

    float dissolve = smoothstep(t * 1.2 - 0.15, t * 1.2 + 0.15, dist);

    vec4 color = mix(fromC, toC, dissolve);
    color.rgb += grain(uv, uTime);
    color.rgb *= vignette(uv);
    gl_FragColor = color;
  }`,

  // 4. Wave Ripple
  /* glsl */ `${glslCommon}
  void main() {
    float t = uProgress;
    vec2 uv = vUv;
    float peak = sin(t * PI);

    vec2 center = vec2(0.5);
    float dist = distance(uv, center);

    float wave = sin(dist * 20.0 - t * 8.0) * peak * 0.02;
    wave *= (1.0 - smoothstep(0.0, 0.6, dist));

    vec2 waveDir = normalize(uv - center + 0.001);
    vec2 uvFrom = uv + waveDir * wave;
    vec2 uvTo = uv - waveDir * wave * 0.5;

    vec2 fcUV = coverFit(uvFrom, uResolution, uFromSize);
    vec2 tcUV = coverFit(uvTo, uResolution, uToSize);

    float rgbSplit = peak * 0.01;
    vec4 fromC = sampleRGB(uFrom, fcUV, rgbSplit);
    vec4 toC = sampleRGB(uTo, tcUV, rgbSplit);

    float dissolve = smoothstep(t - 0.1, t + 0.1, dist);

    vec4 color = mix(fromC, toC, dissolve);
    color.rgb += grain(uv, uTime);
    color.rgb *= vignette(uv);
    gl_FragColor = color;
  }`,

  // 5. Smoke Dissolve
  /* glsl */ `${glslCommon}
  void main() {
    float t = uProgress;
    vec2 uv = vUv;
    float peak = sin(t * PI);

    vec2 smokeUV = uv;
    smokeUV.y -= uTime * 0.25;
    float smoke = fbm(smokeUV * 3.0);

    vec2 warp = vec2(
      fbm(uv * 4.0 + uTime * 0.3),
      fbm(uv * 4.0 + uTime * 0.3 + vec2(50.0))
    ) - 0.5;

    vec2 uvFrom = uv + warp * peak * 0.05;
    vec2 uvTo = uv - warp * peak * 0.02;

    vec2 fcUV = coverFit(uvFrom, uResolution, uFromSize);
    vec2 tcUV = coverFit(uvTo, uResolution, uToSize);

    float rgbSplit = peak * 0.01;
    vec4 fromC = sampleRGB(uFrom, fcUV, rgbSplit);
    vec4 toC = sampleRGB(uTo, tcUV, rgbSplit);

    float dissolve = smoothstep(t - 0.1, t + smoke * 0.15, smoke);

    vec4 color = mix(fromC, toC, dissolve);
    color.rgb += grain(uv, uTime);
    color.rgb *= vignette(uv);
    gl_FragColor = color;
  }`
];

const transitionNames = [
  'LIQUID MORPH',
  'DIRECTIONAL WIPE',
  'RADIAL ZOOM',
  'WAVE RIPPLE',
  'SMOKE DISSOLVE'
];

// =================================================================
//  THREE.JS SETUP
// =================================================================

const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 2;

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// =================================================================
//  TEXTURE LOADER
// =================================================================

const textureLoader = new THREE.TextureLoader();
const textures = {};

function loadTextures() {
  projects.forEach((project, index) => {
    textures[index] = textureLoader.load(project.image);
  });
}

loadTextures();

// =================================================================
//  TRANSITION PLANE
// =================================================================

const geometry = new THREE.PlaneGeometry(4, 4);

const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

let transitionMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uFrom: { value: null },
    uTo: { value: null },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uFromSize: { value: new THREE.Vector2(1920, 1080) },
    uToSize: { value: new THREE.Vector2(1920, 1080) },
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uDirection: { value: 1 }
  },
  vertexShader: vertexShader,
  fragmentShader: transitionShaders[0]
});

const plane = new THREE.Mesh(geometry, transitionMaterial);
scene.add(plane);

// =================================================================
//  CAROUSEL STATE
// =================================================================

const state = {
  currentIndex: 0,
  nextIndex: 0,
  isTransitioning: false,
  transitionProgress: 0,
  transitionDuration: 1.5,
  currentShader: 0,
  time: 0,
  direction: 1
};

// =================================================================
//  UPDATE UI
// =================================================================

function updateUI(index) {
  const project = projects[index];

  const titleEl = document.getElementById('project-title');
  titleEl.textContent = project.title;
  titleEl.setAttribute('data-text', project.title);
  document.getElementById('project-link').href = project.url;
  document.getElementById('current-num').textContent = String(index + 1).padStart(2, '0');

  // Reset text transform
  titleEl.style.transform = 'scale(1) translateZ(0)';
}

// =================================================================
//  NAVIGATION
// =================================================================

function goToSlide(newIndex) {
  if (state.isTransitioning) return;

  state.nextIndex = newIndex;
  state.isTransitioning = true;
  state.transitionProgress = 0;

  // Set textures
  transitionMaterial.uniforms.uFrom.value = textures[state.currentIndex];
  transitionMaterial.uniforms.uTo.value = textures[state.nextIndex];

  // Pick random shader
  state.currentShader = Math.floor(Math.random() * transitionShaders.length);
  transitionMaterial.fragmentShader = transitionShaders[state.currentShader];
  transitionMaterial.needsUpdate = true;

  // Update HUD
  document.getElementById('transition-mode').textContent = transitionNames[state.currentShader];

  // Determine direction
  state.direction = newIndex > state.currentIndex ? 1 : -1;
  transitionMaterial.uniforms.uDirection.value = state.direction;

  // Animate title 3D zoom
  const titleEl = document.getElementById('project-title');
  titleEl.style.transform = 'scale(1.5) translateZ(200px)';
}

function nextSlide() {
  const newIndex = (state.currentIndex + 1) % projects.length;
  goToSlide(newIndex);
}

function prevSlide() {
  const newIndex = (state.currentIndex - 1 + projects.length) % projects.length;
  goToSlide(newIndex);
}

// =================================================================
//  EVENT LISTENERS
// =================================================================

document.getElementById('next-btn').addEventListener('click', nextSlide);
document.getElementById('prev-btn').addEventListener('click', prevSlide);

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') nextSlide();
  if (e.key === 'ArrowLeft') prevSlide();
});

// Mouse wheel navigation
let scrollTimeout;
let lastScrollTime = 0;

window.addEventListener('wheel', (e) => {
  if (state.isTransitioning) return;

  const now = Date.now();
  if (now - lastScrollTime < 800) return; // Debounce

  if (Math.abs(e.deltaY) > 10) {
    if (e.deltaY > 0) {
      nextSlide();
    } else {
      prevSlide();
    }
    lastScrollTime = now;
  }
}, { passive: true });

// Auto advance (optional)
let autoAdvanceInterval = setInterval(nextSlide, 8000);

// Pause auto-advance on interaction
['click', 'touchstart', 'keydown'].forEach(event => {
  document.addEventListener(event, () => {
    clearInterval(autoAdvanceInterval);
    autoAdvanceInterval = setInterval(nextSlide, 8000);
  });
});

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  transitionMaterial.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

// =================================================================
//  FPS COUNTER
// =================================================================

const feedbackFPS = document.getElementById('fps');
let lastTime = 0;
let frameCount = 0;
let fpsTime = 0;

// =================================================================
//  ANIMATION LOOP
// =================================================================

function animate(time) {
  requestAnimationFrame(animate);

  // Time tracking
  const deltaTime = time - lastTime;
  lastTime = time;
  state.time = time * 0.001;

  // FPS calculation
  frameCount++;
  fpsTime += deltaTime;
  if (fpsTime >= 1000) {
    feedbackFPS.innerText = Math.round(frameCount);
    frameCount = 0;
    fpsTime = 0;
  }

  // Update shader time
  transitionMaterial.uniforms.uTime.value = state.time;

  // Transition logic
  if (state.isTransitioning) {
    state.transitionProgress += deltaTime / (state.transitionDuration * 1000);

    if (state.transitionProgress >= 1) {
      state.transitionProgress = 1;
      state.isTransitioning = false;
      state.currentIndex = state.nextIndex;
      updateUI(state.currentIndex);
    }

    transitionMaterial.uniforms.uProgress.value = state.transitionProgress;

    // Animate title with 3D zoom
    const titleEl = document.getElementById('project-title');
    const progress = state.transitionProgress;

    // Zoom in first half, zoom out second half
    const scale = progress < 0.5
      ? 1 + (progress * 2) * 0.5  // 1 to 1.5
      : 1.5 - ((progress - 0.5) * 2) * 0.5; // 1.5 to 1

    const translateZ = progress < 0.5
      ? (progress * 2) * 200  // 0 to 200
      : 200 - ((progress - 0.5) * 2) * 200; // 200 to 0

    titleEl.style.transform = `scale(${scale}) translateZ(${translateZ}px)`;
  } else {
    // Show current slide
    if (!transitionMaterial.uniforms.uFrom.value) {
      transitionMaterial.uniforms.uFrom.value = textures[state.currentIndex];
      transitionMaterial.uniforms.uTo.value = textures[state.currentIndex];
    }
  }

  renderer.render(scene, camera);
}

// =================================================================
//  INITIALIZATION
// =================================================================

function init() {
  updateUI(0);
  animate(0);
  console.log('%c CAROUSEL INITIALIZED ', 'background: #00e5ff; color: #000; font-size: 20px; font-weight: bold; padding: 10px;');
  console.log('%c 5 GLSL TRANSITIONS LOADED ', 'background: #ff003c; color: #fff; font-size: 14px; padding: 5px;');
}

// Wait for textures to load
setTimeout(init, 500);
