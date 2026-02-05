// --- THREE.JS SCENE SETUP ---
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

// --- PARTICLES ---
const particleCount = 2000;
const particlesGeometry = new THREE.BufferGeometry();
const particlesPositions = new Float32Array(particleCount * 3);
const particlesVelocities = new Float32Array(particleCount * 3);
const particlesColors = new Float32Array(particleCount * 3);

// Color palette
const colors = [
    new THREE.Color(0xff003c), // Red
    new THREE.Color(0x00f3ff), // Cyan
    new THREE.Color(0xccff00), // Yellow
    new THREE.Color(0xffffff)  // White
];

for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    // Position
    particlesPositions[i3] = (Math.random() - 0.5) * 200;
    particlesPositions[i3 + 1] = (Math.random() - 0.5) * 200;
    particlesPositions[i3 + 2] = (Math.random() - 0.5) * 100;

    // Velocity
    particlesVelocities[i3] = (Math.random() - 0.5) * 0.02;
    particlesVelocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
    particlesVelocities[i3 + 2] = Math.random() * 0.05 + 0.02;

    // Color
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

// --- GEOMETRIC GRID ---
const gridSize = 20;
const gridDivisions = 20;
const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0xff003c, 0x00f3ff);
gridHelper.position.y = -10;
gridHelper.rotation.x = Math.PI / 2;
scene.add(gridHelper);

// --- WIREFRAME SHAPES ---
const shapes = [];

// Add rotating wireframe boxes
for (let i = 0; i < 5; i++) {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0xff003c : 0x00f3ff,
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

// Add wireframe torus
const torusGeometry = new THREE.TorusGeometry(5, 1, 16, 100);
const torusEdges = new THREE.EdgesGeometry(torusGeometry);
const torusMaterial = new THREE.LineBasicMaterial({
    color: 0xccff00,
    transparent: true,
    opacity: 0.4
});
const torus = new THREE.LineSegments(torusEdges, torusMaterial);
torus.position.set(-15, 0, -20);
shapes.push(torus);
scene.add(torus);

// --- STATE ---
const state = {
    scroll: 0,
    velocity: 0,
    targetSpeed: 0,
    mouseX: 0,
    mouseY: 0,
    time: 0
};

// --- MOUSE MOVEMENT ---
window.addEventListener('mousemove', (e) => {
    state.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    state.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// --- WINDOW RESIZE ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- LENIS SMOOTH SCROLL ---
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
});

// --- HUD UPDATES ---
const feedbackVel = document.getElementById('vel-readout');
const feedbackFPS = document.getElementById('fps');
const feedbackCoord = document.getElementById('coord');
let lastTime = 0;
let frameCount = 0;
let fpsTime = 0;

// --- ANIMATION LOOP ---
function animate(time) {
    // Lenis RAF
    lenis.raf(time);

    // Time tracking
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

    // --- CAMERA MOVEMENT ---
    // Mouse parallax
    camera.position.x += (state.mouseX * 5 - camera.position.x) * 0.05;
    camera.position.y += (-state.mouseY * 5 - camera.position.y) * 0.05;

    // Scroll influence
    camera.rotation.z = state.velocity * 0.0001;

    // --- PARTICLE ANIMATION ---
    const positions = particlesGeometry.attributes.position.array;

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Update positions with velocity
        positions[i3] += particlesVelocities[i3];
        positions[i3 + 1] += particlesVelocities[i3 + 1];
        positions[i3 + 2] += particlesVelocities[i3 + 2];

        // Add scroll influence
        positions[i3 + 2] += state.velocity * 0.01;

        // Wrap particles
        if (positions[i3 + 2] > 50) {
            positions[i3 + 2] = -50;
            positions[i3] = (Math.random() - 0.5) * 200;
            positions[i3 + 1] = (Math.random() - 0.5) * 200;
        }

        // Boundary check for X and Y
        if (Math.abs(positions[i3]) > 100) {
            particlesVelocities[i3] *= -1;
        }
        if (Math.abs(positions[i3 + 1]) > 100) {
            particlesVelocities[i3 + 1] *= -1;
        }
    }

    particlesGeometry.attributes.position.needsUpdate = true;

    // Rotate particles mesh
    particles.rotation.y = state.time * 0.05;
    particles.rotation.x = Math.sin(state.time * 0.1) * 0.1;

    // --- GRID ANIMATION ---
    gridHelper.position.z = (state.scroll * 0.05) % 20 - 10;

    // --- SHAPES ANIMATION ---
    shapes.forEach((shape, i) => {
        shape.rotation.x = state.time * 0.2 + i;
        shape.rotation.y = state.time * 0.3 + i;
        shape.rotation.z = state.time * 0.1 + i;

        // Float up and down
        shape.position.y += Math.sin(state.time + i) * 0.01;

        // Respond to scroll velocity
        const velocityEffect = state.velocity * 0.001;
        shape.rotation.x += velocityEffect;
        shape.rotation.y += velocityEffect;
    });

    // Torus specific rotation
    torus.rotation.x = state.time * 0.3;
    torus.rotation.y = state.time * 0.2;

    // --- FOV WARP (Speed effect) ---
    const baseFov = 75;
    const targetFov = baseFov + Math.min(Math.abs(state.velocity) * 0.5, 20);
    camera.fov += (targetFov - camera.fov) * 0.1;
    camera.updateProjectionMatrix();

    // --- RENDER ---
    renderer.render(scene, camera);

    requestAnimationFrame(animate);
}

// Start animation
animate(0);

// --- PROJECT BUTTONS ---
function viewProject(projectId) {
    const projectUrls = {
        1: 'https://example.com/project-1',
        2: 'https://example.com/project-2',
        3: 'https://example.com/project-3'
    };

    console.log(`Viewing Project ${projectId}`);

    // Create glitch effect on click
    const card = document.querySelector(`[data-project="${projectId}"]`);
    card.style.animation = 'glitch-anim 0.3s';
    setTimeout(() => {
        card.style.animation = '';
    }, 300);

    // Uncomment to actually navigate
    // window.open(projectUrls[projectId], '_blank');

    // Or add your custom modal/overlay logic here
    alert(`Opening Project ${projectId}\\nThis would navigate to: ${projectUrls[projectId]}`);
}

// --- SCROLL TO TOP ON LOAD ---
window.addEventListener('load', () => {
    window.scrollTo(0, 0);
    lenis.scrollTo(0, { immediate: true });
});

// --- ADDITIONAL EFFECTS ---

// Add glitch effect on random intervals
setInterval(() => {
    if (Math.random() > 0.7) {
        document.body.style.animation = 'glitch-anim 0.2s';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 200);
    }
}, 5000);

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

console.log('%c SYSTEM INITIALIZED ', 'background: #ff003c; color: #000; font-size: 20px; font-weight: bold; padding: 10px;');
console.log('%c HYPER PORTFOLIO // BRUTAL MODE ', 'background: #00f3ff; color: #000; font-size: 14px; padding: 5px;');
