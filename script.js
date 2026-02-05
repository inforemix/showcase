// ======================
// GLSL SHADER TRANSITIONS
// ======================

const SHADERS = {
    // Liquid Morph Transition
    liquidMorph: {
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float progress;
            uniform vec2 resolution;
            varying vec2 vUv;

            // Noise function
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            void main() {
                vec2 uv = vUv;
                float noise = random(uv * 10.0 + progress) * 0.1;

                // Liquid distortion
                float dist = length(uv - 0.5);
                float angle = atan(uv.y - 0.5, uv.x - 0.5);
                float ripple = sin(dist * 20.0 - progress * 10.0) * 0.1 * (1.0 - progress);

                vec2 distortedUv = uv + vec2(
                    cos(angle) * ripple,
                    sin(angle) * ripple
                );

                vec4 color = texture2D(tDiffuse, distortedUv + noise);
                color.rgb = mix(color.rgb, vec3(1.0), progress * 0.3);

                gl_FragColor = color;
            }
        `
    },

    // Quantum Glitch Transition
    quantumGlitch: {
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float progress;
            uniform float time;
            varying vec2 vUv;

            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            void main() {
                vec2 uv = vUv;

                // Glitch blocks
                float blocks = 15.0;
                float blockY = floor(uv.y * blocks) / blocks;
                float glitchStrength = step(0.5, random(vec2(blockY, time * 0.1))) * progress;

                // RGB split
                float offset = glitchStrength * 0.1;
                vec4 rColor = texture2D(tDiffuse, uv + vec2(offset, 0.0));
                vec4 gColor = texture2D(tDiffuse, uv);
                vec4 bColor = texture2D(tDiffuse, uv - vec2(offset, 0.0));

                vec4 color = vec4(rColor.r, gColor.g, bColor.b, 1.0);

                // Horizontal displacement
                float displacement = (random(vec2(blockY, time)) - 0.5) * glitchStrength * 0.3;
                color = texture2D(tDiffuse, vec2(uv.x + displacement, uv.y));

                // Digital artifacts
                if (random(vec2(blockY, time)) > 0.9) {
                    color.rgb = mix(color.rgb, vec3(0.0, 1.0, 1.0), glitchStrength);
                }

                gl_FragColor = color;
            }
        `
    },

    // Spiral Vortex Transition
    spiralVortex: {
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float progress;
            uniform vec2 resolution;
            varying vec2 vUv;

            void main() {
                vec2 uv = vUv;
                vec2 center = vec2(0.5, 0.5);
                vec2 toCenter = center - uv;
                float dist = length(toCenter);
                float angle = atan(toCenter.y, toCenter.x);

                // Spiral effect
                float spiralStrength = progress * 3.14159 * 4.0;
                float spiralAngle = angle + dist * spiralStrength;

                vec2 spiralUv = center + dist * vec2(cos(spiralAngle), sin(spiralAngle));

                // Vortex distortion
                float vortex = progress * dist * 2.0;
                spiralUv = mix(uv, spiralUv, smoothstep(0.0, 1.0, progress));

                vec4 color = texture2D(tDiffuse, spiralUv);

                // Color shift
                color.rgb += vec3(
                    sin(dist * 10.0 - progress * 5.0) * 0.2,
                    cos(dist * 10.0 - progress * 5.0) * 0.2,
                    sin(dist * 15.0 - progress * 7.0) * 0.2
                );

                gl_FragColor = color;
            }
        `
    }
};

// ======================
// THREE.JS SCENE SETUP
// ======================

const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 50;

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ======================
// PARTICLE SYSTEM
// ======================

const particleCount = 1500;
const particlesGeometry = new THREE.BufferGeometry();
const particlesPositions = new Float32Array(particleCount * 3);
const particlesVelocities = new Float32Array(particleCount * 3);
const particlesColors = new Float32Array(particleCount * 3);

const colors = [
    new THREE.Color(0xff003c),
    new THREE.Color(0x00f3ff),
    new THREE.Color(0xccff00),
    new THREE.Color(0xffffff)
];

for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    particlesPositions[i3] = (Math.random() - 0.5) * 200;
    particlesPositions[i3 + 1] = (Math.random() - 0.5) * 200;
    particlesPositions[i3 + 2] = (Math.random() - 0.5) * 100;

    particlesVelocities[i3] = (Math.random() - 0.5) * 0.02;
    particlesVelocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
    particlesVelocities[i3 + 2] = Math.random() * 0.05 + 0.02;

    const color = colors[Math.floor(Math.random() * colors.length)];
    particlesColors[i3] = color.r;
    particlesColors[i3 + 1] = color.g;
    particlesColors[i3 + 2] = color.b;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlesPositions, 3));
particlesGeometry.setAttribute('color', new THREE.BufferAttribute(particlesColors, 3));

const particlesMaterial = new THREE.PointsMaterial({
    size: 0.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);

// ======================
// 3D TEXT ELEMENTS
// ======================

const worldContainer = document.getElementById('world-container');
const textElements = [];
const projectTitles = ['WRITEQUEST', 'NEWTON\'S BOUNCE', 'INFORELAX'];

projectTitles.forEach((title, index) => {
    const textEl = document.createElement('div');
    textEl.className = 'text-3d';
    textEl.textContent = title;
    textEl.style.zIndex = index;
    worldContainer.appendChild(textEl);

    textElements.push({
        el: textEl,
        index: index,
        baseZ: -index * 2000
    });
});

// ======================
// WIREFRAME SHAPES
// ======================

const shapes = [];

for (let i = 0; i < 3; i++) {
    const geometry = new THREE.TorusGeometry(5 + i * 2, 1, 16, 100);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.3
    });
    const wireframe = new THREE.LineSegments(edges, material);

    wireframe.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 20
    );

    shapes.push(wireframe);
    scene.add(wireframe);
}

// ======================
// STATE MANAGEMENT
// ======================

const state = {
    scroll: 0,
    velocity: 0,
    targetSpeed: 0,
    mouseX: 0,
    mouseY: 0,
    time: 0,
    currentSection: 0,
    transitionProgress: 0,
    isTransitioning: false,
    transitionType: 'liquid'
};

// ======================
// SHADER TRANSITION SYSTEM
// ======================

let transitionPlane, transitionMaterial;

function initTransitionPlane() {
    const geometry = new THREE.PlaneGeometry(200, 200);
    transitionMaterial = new THREE.ShaderMaterial({
        uniforms: {
            tDiffuse: { value: null },
            progress: { value: 0.0 },
            time: { value: 0.0 },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        },
        vertexShader: SHADERS.liquidMorph.vertexShader,
        fragmentShader: SHADERS.liquidMorph.fragmentShader,
        transparent: true
    });

    transitionPlane = new THREE.Mesh(geometry, transitionMaterial);
    transitionPlane.position.z = 10;
    transitionPlane.visible = false;
    scene.add(transitionPlane);
}

initTransitionPlane();

function updateTransitionShader(type) {
    const shader = SHADERS[type] || SHADERS.liquidMorph;
    transitionMaterial.vertexShader = shader.vertexShader;
    transitionMaterial.fragmentShader = shader.fragmentShader;
    transitionMaterial.needsUpdate = true;
}

// ======================
// MOUSE & SCROLL EVENTS
// ======================

window.addEventListener('mousemove', (e) => {
    state.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    state.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    transitionMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
});

// ======================
// LENIS SMOOTH SCROLL
// ======================

const lenis = new Lenis({
    smooth: true,
    lerp: 0.08,
    direction: 'vertical',
    gestureDirection: 'vertical',
    smoothTouch: true,
    touchMultiplier: 2
});

lenis.on('scroll', ({ scroll, velocity }) => {
    state.scroll = scroll;
    state.targetSpeed = velocity;

    // Calculate current section
    const viewportHeight = window.innerHeight;
    const newSection = Math.floor(scroll / viewportHeight);

    if (newSection !== state.currentSection && newSection < 3) {
        state.currentSection = newSection;

        // Determine transition type
        const transitionTypes = ['liquidMorph', 'quantumGlitch', 'spiralVortex'];
        const transitionNames = ['LIQUID', 'QUANTUM', 'SPIRAL'];
        state.transitionType = transitionTypes[newSection % 3];

        // Update HUD
        document.getElementById('transition-mode').textContent = transitionNames[newSection % 3];

        updateTransitionShader(state.transitionType);
    }
});

// ======================
// HUD UPDATES
// ======================

const feedbackVel = document.getElementById('vel-readout');
const feedbackFPS = document.getElementById('fps');
const feedbackCoord = document.getElementById('coord');
let lastTime = 0;
let frameCount = 0;
let fpsTime = 0;

// ======================
// ANIMATION LOOP
// ======================

function animate(time) {
    lenis.raf(time);

    const deltaTime = time - lastTime;
    lastTime = time;
    state.time = time * 0.001;

    // FPS Calculation
    frameCount++;
    fpsTime += deltaTime;
    if (fpsTime >= 1000) {
        feedbackFPS.innerText = Math.round(frameCount);
        frameCount = 0;
        fpsTime = 0;
    }

    // Smooth velocity
    state.velocity += (state.targetSpeed - state.velocity) * 0.1;

    // HUD updates
    feedbackVel.innerText = Math.abs(state.velocity).toFixed(2);
    feedbackCoord.innerText = state.scroll.toFixed(1).padStart(7, '0');

    // ======================
    // CAMERA ANIMATION
    // ======================

    camera.position.x += (state.mouseX * 5 - camera.position.x) * 0.05;
    camera.position.y += (-state.mouseY * 5 - camera.position.y) * 0.05;
    camera.rotation.z = state.velocity * 0.0001;

    // ======================
    // 3D TEXT SCROLLING
    // ======================

    const scrollProgress = state.scroll * 2;

    textElements.forEach((item, i) => {
        const relZ = item.baseZ + scrollProgress;
        const loopSize = 6000;

        let vizZ = ((relZ % loopSize) + loopSize) % loopSize;
        if (vizZ > 500) vizZ -= loopSize;

        // Opacity
        let alpha = 1;
        if (vizZ < -3000) alpha = 0;
        else if (vizZ < -2000) alpha = (vizZ + 3000) / 1000;
        if (vizZ > 100) alpha = 1 - (vizZ - 100) / 400;
        if (alpha < 0) alpha = 0;

        item.el.style.opacity = alpha;

        if (alpha > 0) {
            const tiltX = state.mouseY * 5 - state.velocity * 0.3;
            const tiltY = state.mouseX * 5;
            const rotZ = Math.sin(state.time + i) * 2;

            item.el.style.transform = `
                translate(-50%, -50%)
                translate3d(0, 0, ${vizZ}px)
                rotateX(${tiltX}deg)
                rotateY(${tiltY}deg)
                rotateZ(${rotZ}deg)
            `;

            // Text shadow RGB split effect
            if (Math.abs(state.velocity) > 1) {
                const offset = state.velocity * 2;
                item.el.style.textShadow = `${offset}px 0 red, ${-offset}px 0 cyan`;
            } else {
                item.el.style.textShadow = 'none';
            }
        }
    });

    // ======================
    // PARTICLE ANIMATION
    // ======================

    const positions = particlesGeometry.attributes.position.array;

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        positions[i3] += particlesVelocities[i3];
        positions[i3 + 1] += particlesVelocities[i3 + 1];
        positions[i3 + 2] += particlesVelocities[i3 + 2];
        positions[i3 + 2] += state.velocity * 0.01;

        if (positions[i3 + 2] > 50) {
            positions[i3 + 2] = -50;
            positions[i3] = (Math.random() - 0.5) * 200;
            positions[i3 + 1] = (Math.random() - 0.5) * 200;
        }

        if (Math.abs(positions[i3]) > 100) particlesVelocities[i3] *= -1;
        if (Math.abs(positions[i3 + 1]) > 100) particlesVelocities[i3 + 1] *= -1;
    }

    particlesGeometry.attributes.position.needsUpdate = true;
    particles.rotation.y = state.time * 0.05;
    particles.rotation.x = Math.sin(state.time * 0.1) * 0.1;

    // ======================
    // SHAPES ANIMATION
    // ======================

    shapes.forEach((shape, i) => {
        shape.rotation.x = state.time * 0.2 + i;
        shape.rotation.y = state.time * 0.3 + i;
        shape.rotation.z = state.time * 0.1 + i;

        shape.position.y += Math.sin(state.time + i) * 0.01;

        const velocityEffect = state.velocity * 0.001;
        shape.rotation.x += velocityEffect;
        shape.rotation.y += velocityEffect;
    });

    // ======================
    // FOV WARP
    // ======================

    const baseFov = 75;
    const targetFov = baseFov + Math.min(Math.abs(state.velocity) * 0.5, 20);
    camera.fov += (targetFov - camera.fov) * 0.1;
    camera.updateProjectionMatrix();

    // ======================
    // SHADER TRANSITION
    // ======================

    if (transitionMaterial) {
        transitionMaterial.uniforms.time.value = state.time;

        // Calculate transition progress based on scroll between sections
        const viewportHeight = window.innerHeight;
        const sectionProgress = (state.scroll % viewportHeight) / viewportHeight;

        if (sectionProgress < 0.2 || sectionProgress > 0.8) {
            const progress = sectionProgress < 0.2 ? sectionProgress * 5 : (1 - sectionProgress) * 5;
            transitionMaterial.uniforms.progress.value = progress * Math.abs(state.velocity) * 0.1;
        } else {
            transitionMaterial.uniforms.progress.value *= 0.95;
        }
    }

    // ======================
    // RENDER
    // ======================

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// ======================
// INITIALIZATION
// ======================

animate(0);

window.addEventListener('load', () => {
    window.scrollTo(0, 0);
    lenis.scrollTo(0, { immediate: true });
});

// ======================
// EFFECTS
// ======================

// Chromatic aberration on high velocity
let chromaticInterval;
window.addEventListener('scroll', () => {
    if (Math.abs(state.velocity) > 10) {
        if (!chromaticInterval) {
            chromaticInterval = setInterval(() => {
                canvas.style.filter = `hue-rotate(${Math.random() * 10}deg)`;
            }, 50);
        }
    } else {
        if (chromaticInterval) {
            clearInterval(chromaticInterval);
            chromaticInterval = null;
            canvas.style.filter = 'none';
        }
    }
});

// Random glitch effect
setInterval(() => {
    if (Math.random() > 0.8) {
        const showcases = document.querySelectorAll('.project-showcase');
        const randomShowcase = showcases[Math.floor(Math.random() * showcases.length)];
        if (randomShowcase) {
            randomShowcase.style.animation = 'glitch-anim 0.2s';
            setTimeout(() => {
                randomShowcase.style.animation = '';
            }, 200);
        }
    }
}, 5000);

// Console ASCII art
console.log('%c SYSTEM INITIALIZED ', 'background: #ff003c; color: #000; font-size: 20px; font-weight: bold; padding: 10px;');
console.log('%c HYPER PORTFOLIO // BRUTAL MODE ', 'background: #00f3ff; color: #000; font-size: 14px; padding: 5px;');
console.log('%c GLSL TRANSITIONS ACTIVE ', 'background: #ccff00; color: #000; font-size: 12px; padding: 5px;');
