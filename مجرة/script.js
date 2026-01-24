/**
 * 3D Solar System - script.js
 * Ultra-Realistic, Fully Offline, Procedural Sun & Interactive Planets
 */

let scene, camera, renderer, sun, stars;
let planets = [];
let timeScale = 1;
let isPaused = false;
let focusedPlanet = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Orbit & Touch State
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraRotation = { theta: Math.PI / 4, phi: Math.PI / 4, radius: 600 };

// Touch specific state
let initialPinchDistance = null;
let initialRadius = null;

// 1. Scene Setup
function init() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 20000);
    camera.position.set(0, 300, 600);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.08); // Increased from 0.05 for better shadow visibility
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffffff, 1.8, 3000); // Reduced from 3 to soften glare on planets
    sunLight.castShadow = true;
    scene.add(sunLight);

    createSun();
    createStars();
    createPlanets();
    setupEventListeners();

    animate();
}

// 2. Procedural Sun (Procedural Sun with Enhanced Shaders)
const sunData = {
    name: "الشمس",
    nameEn: "Sun",
    size: 30,
    stats: { 
        diameter: "1,392,700 كم", 
        dist: "0 كم (المركز)", 
        period: "25-35 يوم" 
    },
    desc: "نجم النظام الشمسي ومركزه، تمثل 99.8% من كتلة النظام وتوفر الطاقة اللازمة للحياة."
};

function createSun() {
    const loader = new THREE.TextureLoader();
    const sunGeometry = new THREE.SphereGeometry(30, 64, 64);
    
    // Sun Colors - Vivid Yellow Radiant (Bright & Glowing)
    const sunUniforms = {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0xffff00) }, // Vivid Yellow (أصفر فاقع)
        uColor2: { value: new THREE.Color(0xffffff) }, // Pure White Core (مركز أبيض نقي)
        uColor3: { value: new THREE.Color(0xffe100) }, // Golden Yellow (ذهبي فاتح)
        uTexture: { value: loader.load(typeof SUN_DATA !== 'undefined' ? SUN_DATA : null) }
    };

    const vertexShader = `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform sampler2D uTexture;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        // Simple Hash for Granulation
        float hash(vec3 p) {
            p = fract(p * 0.3183099 + 0.1);
            p *= 17.0;
            return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        // Simplex Noise for Spots
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i  = floor(v + dot(v, C.yyy) );
            vec3 x0 = v - i + dot(i, C.xxx) ;
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min( g.xyz, l.zxy );
            vec3 i2 = max( g.xyz, l.zxy );
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i);
            vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
            float n_ = 0.142857142857;
            vec3  ns = n_ * D.wyz - p.xzw;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_ );
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4( x.xy, y.xy );
            vec4 b1 = vec4( x.zw, y.zw );
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
        }

        void main() {
            // 1. Radiant Surface Logic
            float centerStrength = dot(vNormal, vec3(0,0,1.0));
            centerStrength = pow(centerStrength, 1.2);
            
            // Texture & Granulation
            vec3 texColor = texture2D(uTexture, vUv + uTime * 0.01).rgb;
            float granulation = hash(vPosition * 50.0 + uTime * 0.1) * 0.1;

            // 2. Color Mixing - Bright Yellow & White
            // Center is pure white, fading to vivid yellow, then golden edges
            vec3 coreColor = mix(uColor1, uColor2, centerStrength);
            vec3 baseColor = mix(uColor3, coreColor, centerStrength);
            
            vec3 color = mix(baseColor, texColor * 1.5, 0.2) + granulation;
            
            // 3. Brightness Boost (General glow intensity)
            color *= 1.45; 
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    const sunMaterial = new THREE.ShaderMaterial({
        uniforms: sunUniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: false,
        depthWrite: true,
        depthTest: true,
        side: THREE.FrontSide
    });

    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Golden Radiant Glow (Bright Golden Halo)
    
    // Layer 1: Bright Inner Glow
    const innerGlowGeo = new THREE.SphereGeometry(30.5, 64, 64);
    const innerGlowMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: vertexShader,
        fragmentShader: `
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.85 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
                gl_FragColor = vec4(1.0, 0.9, 0.3, intensity * 0.7);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false
    });
    const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
    sun.add(innerGlow);

    // Layer 2: Main Golden Halo
    const outerHaloGeo = new THREE.SphereGeometry(42, 64, 64);
    const outerHaloMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: vertexShader,
        fragmentShader: `
            varying vec3 vNormal;
            uniform float uTime;
            void main() {
                float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 3.5);
                gl_FragColor = vec4(1.0, 0.8, 0.2, intensity * 0.5);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false
    });
    const outerHalo = new THREE.Mesh(outerHaloGeo, outerHaloMat);
    sun.add(outerHalo);

    // Layer 3: Radiant Bloom Sprite
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 150, 0.4)');
    gradient.addColorStop(0.3, 'rgba(255, 230, 0, 0.2)');
    gradient.addColorStop(0.6, 'rgba(255, 200, 0, 0.05)');
    gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const bloomTexture = new THREE.CanvasTexture(canvas);
    const bloomMaterial = new THREE.SpriteMaterial({
        map: bloomTexture,
        color: 0xffcc00,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.6,
        depthWrite: false
    });
    const bloomSprite = new THREE.Sprite(bloomMaterial);
    bloomSprite.scale.set(150, 150, 1);
    sun.add(bloomSprite);
}

// 3. Cinematic Stars
function createStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0.8 });

    const starVertices = [];
    for (let i = 0; i < 15000; i++) {
        const x = (Math.random() - 0.5) * 10000;
        const y = (Math.random() - 0.5) * 10000;
        const z = (Math.random() - 0.5) * 10000;
        starVertices.push(x, y, z);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

// 4. Planets
const planetData = [
    { 
        name: "عطارد", 
        nameEn: "Mercury",
        distance: 60, 
        size: 2.4, 
        speed: 0.047, 
        texture: typeof MERCURY_DATA !== 'undefined' ? MERCURY_DATA : null, 
        tilt: 0.03,
        stats: { diameter: "4,879 كم", dist: "57.9 مليون كم", period: "88 يوم" },
        desc: "أصغر كواكب النظام الشمسي وأقربها إلى الشمس، سطحه مليء بالفوهات الصدمية."
    },
    { 
        name: "الزهرة", 
        nameEn: "Venus",
        distance: 90, 
        size: 6.0, 
        speed: 0.035, 
        texture: typeof VENUS_DATA !== 'undefined' ? VENUS_DATA : null, 
        tilt: 177.3,
        stats: { diameter: "12,104 كم", dist: "108.2 مليون كم", period: "225 يوم" },
        desc: "توأم الأرض، يتميز بغلاف جوي سميك وحرارة شديدة جداً."
    },
    { 
        name: "الأرض", 
        nameEn: "Earth",
        distance: 130, 
        size: 6.3, 
        speed: 0.029, 
        texture: typeof EARTH_DATA !== 'undefined' ? EARTH_DATA : null, 
        tilt: 23.5,
        stats: { diameter: "12,742 كم", dist: "149.6 مليون كم", period: "365.25 يوم" },
        desc: "كوكبنا الوحيد الذي يدعم الحياة، يتميز بالمياه الزرقاء واليابسة."
    },
    { 
        name: "المريخ", 
        nameEn: "Mars",
        distance: 170, 
        size: 3.4, 
        speed: 0.024, 
        texture: typeof MARS_DATA !== 'undefined' ? MARS_DATA : null, 
        tilt: 25.2,
        stats: { diameter: "6,779 كم", dist: "227.9 مليون كم", period: "687 يوم" },
        desc: "الكوكب الأحمر، موطن لأكبر الجبال والوديان في النظام الشمسي."
    },
    { 
        name: "المشتري", 
        nameEn: "Jupiter",
        distance: 260, 
        size: 16.0, 
        speed: 0.013, 
        texture: typeof JUPITER_DATA !== 'undefined' ? JUPITER_DATA : null, 
        tilt: 3.1,
        stats: { diameter: "139,820 كم", dist: "778.6 مليون كم", period: "11.8 سنة" },
        desc: "عملاق غازي وأكبر كواكب النظام، يشتهر بقعته الحمراء العظيمة."
    },
    { 
        name: "زحل", 
        nameEn: "Saturn",
        distance: 340, 
        size: 14.0, 
        speed: 0.009, 
        texture: typeof SATURN_DATA !== 'undefined' ? SATURN_DATA : null, 
        tilt: 26.7, 
        rings: true,
        stats: { diameter: "116,460 كم", dist: "1.4 مليار كم", period: "29.4 سنة" },
        desc: "جوهرة النظام الشمسي، يشتهر بحلقاته الرائعة والمذهلة."
    },
    { 
        name: "أورانوس", 
        nameEn: "Uranus",
        distance: 420, 
        size: 10.0, 
        speed: 0.006, 
        texture: typeof URANUS_DATA !== 'undefined' ? URANUS_DATA : null, 
        tilt: 97.8, 
        stats: { diameter: "50,724 كم", dist: "2.9 مليار كم", period: "84 سنة" },
        desc: "عملاق جليدي بارد، يدور حول الشمس وهو مائل على جنبه."
    },
    { 
        name: "نبتون", 
        nameEn: "Neptune",
        distance: 500, 
        size: 9.8, 
        speed: 0.005, 
        texture: typeof NEPTUNE_DATA !== 'undefined' ? NEPTUNE_DATA : null, 
        tilt: 28.3,
        stats: { diameter: "49,244 كم", dist: "4.5 مليار كم", period: "164.8 سنة" },
        desc: "العملاق الجليدي الأزرق العميق والأبعد، يتميز برياحه العاصفة جداً."
    }
];

function createPlanets() {
    const loader = new THREE.TextureLoader();

    planetData.forEach(data => {
        const group = new THREE.Group();
        scene.add(group);

        // Orbit Path
        const orbitGeo = new THREE.RingGeometry(data.distance - 0.5, data.distance + 0.5, 128);
        const orbitMat = new THREE.MeshBasicMaterial({ color: 0x444444, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
        const orbitLine = new THREE.Mesh(orbitGeo, orbitMat);
        orbitLine.rotation.x = Math.PI / 2;
        scene.add(orbitLine);

        // Planet Mesh
        const geometry = new THREE.SphereGeometry(data.size, 64, 64);
        let material;
        if (data.texture) {
            const texture = loader.load(data.texture);
            material = new THREE.MeshPhongMaterial({ map: texture, shininess: 10, bumpScale: 0.05 });
        } else {
            material = new THREE.MeshPhongMaterial({ color: 0x888888 });
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = THREE.MathUtils.degToRad(data.tilt);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);

        // Rings
        if (data.rings) {
            const inner = data.size * 1.5;
            const outer = data.size * 3.5;
            const ringGeo = new THREE.RingGeometry(inner, outer, 128);
            
            // Fix UV mapping for RingGeometry to work with textures
            const pos = ringGeo.attributes.position;
            const v3 = new THREE.Vector3();
            for (let i = 0; i < pos.count; i++) {
                v3.fromBufferAttribute(pos, i);
                ringGeo.attributes.uv.setXY(i, (v3.length() - inner) / (outer - inner), 0);
            }

            const ringMat = new THREE.MeshPhongMaterial({
                color: data.nameEn === "Saturn" ? 0xd2b48c : 0xadd8e6,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.7,
                shininess: 0
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            mesh.add(ring);
        }

        // Earth Atmosphere Glow
        if (data.nameEn === "Earth") {
            const atmosGeo = new THREE.SphereGeometry(data.size * 1.05, 64, 64);
            const atmosMat = new THREE.ShaderMaterial({
                vertexShader: `
                    varying vec3 vNormal;
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec3 vNormal;
                    void main() {
                        float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 4.0);
                        gl_FragColor = vec4(0.44, 0.24, 0.82, intensity);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide
            });
            const atmos = new THREE.Mesh(atmosGeo, atmosMat);
            mesh.add(atmos);
        }

        planets.push({
            group: group,
            mesh: mesh,
            data: data,
            angle: Math.random() * Math.PI * 2
        });
    });
}

// 5. Events & Interaction
function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('wheel', onWheel, { passive: false });

    // Touch Events
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });

    // Close Info Panel
    document.getElementById('close-info').addEventListener('click', () => {
        document.getElementById('planet-info').classList.remove('active');
        focusedPlanet = null;
    });

    // Time Control (Fixed: Using glyphs to maintain purple theme)
    document.getElementById('pause-btn').addEventListener('click', () => {
        isPaused = !isPaused;
        document.getElementById('pause-btn').innerText = isPaused ? "▶" : "❙❙";
    });

    document.getElementById('reverse-btn').addEventListener('click', () => {
        timeScale = -Math.abs(timeScale);
        updateSpeedUI();
    });

    document.getElementById('forward-btn').addEventListener('click', () => {
        timeScale = Math.abs(timeScale) * 1.5;
        if (Math.abs(timeScale) > 50) timeScale = 50; 
        updateSpeedUI();
    });

    document.getElementById('play-btn').addEventListener('click', () => {
        timeScale = 1;
        isPaused = false;
        document.getElementById('pause-btn').innerText = "❙❙";
        updateSpeedUI();
    });

    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            timeScale = parseFloat(btn.dataset.speed) * (timeScale < 0 ? -1 : 1);
            updateSpeedUI();
        });
    });
}

function updateSpeedUI() {
    document.querySelectorAll('.speed-btn').forEach(b => {
        b.classList.toggle('active', Math.abs(parseFloat(b.dataset.speed)) === Math.abs(timeScale));
    });
    document.getElementById('current-speed').innerText = timeScale.toFixed(1) + "x";
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseDown(event) {
    isDragging = true;
    previousMousePosition = { x: event.clientX, y: event.clientY };

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    
    // Include Sun in intersections
    const intersectTargets = planets.map(p => p.mesh);
    if (sun) intersectTargets.push(sun);
    
    const intersects = raycaster.intersectObjects(intersectTargets);

    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        
        if (clickedMesh === sun) {
            focusedPlanet = { mesh: sun, data: sunData };
            showPlanetInfo(sunData);
        } else {
            focusedPlanet = planets.find(p => p.mesh === clickedMesh);
            showPlanetInfo(focusedPlanet.data);
        }
    }
}

function onMouseMove(event) {
    if (isDragging) {
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;

        cameraRotation.theta -= deltaX * 0.005;
        cameraRotation.phi -= deltaY * 0.005;

        // Constraint phi to avoid flipping
        cameraRotation.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraRotation.phi));

        if (!focusedPlanet) {
            updateCameraPosition();
        }
    }
    previousMousePosition = { x: event.clientX, y: event.clientY };
}

function onMouseUp() {
    isDragging = false;
}

// Touch Event Handlers
function onTouchStart(event) {
    if (event.touches.length === 1) {
        // Single finger: Rotation (same as mouse down)
        isDragging = true;
        previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        
        // Raycasting for planet selection
        mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        
        const intersectTargets = planets.map(p => p.mesh);
        if (sun) intersectTargets.push(sun);
        const intersects = raycaster.intersectObjects(intersectTargets);

        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;
            if (clickedMesh === sun) {
                focusedPlanet = { mesh: sun, data: sunData };
                showPlanetInfo(sunData);
            } else {
                focusedPlanet = planets.find(p => p.mesh === clickedMesh);
                showPlanetInfo(focusedPlanet.data);
            }
        }
    } else if (event.touches.length === 2) {
        // Two fingers: Start Pinch
        isDragging = false; // Stop rotation during pinch
        initialPinchDistance = getTouchDistance(event.touches);
        initialRadius = cameraRotation.radius;
    }
}

function onTouchMove(event) {
    event.preventDefault(); // Prevent scrolling

    if (event.touches.length === 1 && isDragging) {
        // Single finger: Rotate
        const deltaX = event.touches[0].clientX - previousMousePosition.x;
        const deltaY = event.touches[0].clientY - previousMousePosition.y;

        cameraRotation.theta -= deltaX * 0.005;
        cameraRotation.phi -= deltaY * 0.005;
        cameraRotation.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraRotation.phi));

        if (!focusedPlanet) {
            updateCameraPosition();
        }
        previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    } else if (event.touches.length === 2 && initialPinchDistance !== null) {
        // Two fingers: Pinch to zoom
        const currentDistance = getTouchDistance(event.touches);
        const zoomFactor = initialPinchDistance / currentDistance;
        
        cameraRotation.radius = initialRadius * zoomFactor;

        // Dynamic limits
        const minRadius = focusedPlanet ? focusedPlanet.data.size * 2.5 : 50;
        const maxRadius = 3000;
        cameraRotation.radius = Math.max(minRadius, Math.min(maxRadius, cameraRotation.radius));

        if (!focusedPlanet) {
            updateCameraPosition();
        }
    }
}

function onTouchEnd(event) {
    if (event.touches.length === 0) {
        isDragging = false;
        initialPinchDistance = null;
    } else if (event.touches.length === 1) {
        // Reset previous position to avoid jump when switching from 2 to 1 finger
        previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        isDragging = true;
    }
}

function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function updateCameraPosition() {
    if (!focusedPlanet) {
        camera.position.x = cameraRotation.radius * Math.sin(cameraRotation.phi) * Math.cos(cameraRotation.theta);
        camera.position.y = cameraRotation.radius * Math.cos(cameraRotation.phi);
        camera.position.z = cameraRotation.radius * Math.sin(cameraRotation.phi) * Math.sin(cameraRotation.theta);
        camera.lookAt(0, 0, 0);
    }
}

function showPlanetInfo(data) {
    const card = document.getElementById('planet-info');
    document.getElementById('planet-name').innerText = data.name;
    document.getElementById('planet-desc').innerText = data.desc;
    document.getElementById('planet-size').innerText = data.stats.diameter;
    
    // Update labels for Sun (distance from center is 0)
    const distElement = document.getElementById('planet-dist');
    const distLabel = distElement.previousElementSibling;
    const periodElement = document.getElementById('planet-period');
    const periodLabel = periodElement.previousElementSibling;

    if (data.nameEn === "Sun") {
        distLabel.innerText = "الموقع:";
        periodLabel.innerText = "دورة الدوران:";
    } else {
        distLabel.innerText = "البعد عن الشمس:";
        periodLabel.innerText = "فترة الدوران:";
    }

    distElement.innerText = data.stats.dist;
    periodElement.innerText = data.stats.period;
    
    card.classList.add('active');
}

function onWheel(event) {
    if (event.ctrlKey || event.metaKey) {
        event.preventDefault(); // Prevent browser zoom
    }
    
    // In many modern browsers, wheel with pinch gesture also sends wheel event with ctrlKey
    // We prevent default to ensure our custom zoom takes precedence
    event.preventDefault(); 

    const zoomSpeed = focusedPlanet ? focusedPlanet.data.size * 0.5 : 50;
    cameraRotation.radius += event.deltaY * 0.5;
    
    // Dynamic limits based on target size
    const minRadius = focusedPlanet ? focusedPlanet.data.size * 2.5 : 50;
    const maxRadius = 3000;
    cameraRotation.radius = Math.max(minRadius, Math.min(maxRadius, cameraRotation.radius));
    
    if (!focusedPlanet) {
        updateCameraPosition();
    }
}

// 6. Animation Loop
function animate() {
    requestAnimationFrame(animate);

    const time = performance.now() * 0.001;
    
    // Update Sun Shaders
    if (sun) {
        sun.material.uniforms.uTime.value = time;
        sun.children.forEach(child => {
            if (child.material && child.material.uniforms && child.material.uniforms.uTime) {
                child.material.uniforms.uTime.value = time;
            }
        });
    }

    if (!isPaused) {
        planets.forEach(p => {
            // Orbit
            p.angle += p.data.speed * 0.1 * timeScale;
            p.group.position.x = Math.cos(p.angle) * p.data.distance;
            p.group.position.z = Math.sin(p.angle) * p.data.distance;

            // Rotation
            p.mesh.rotation.y += 0.01 * timeScale;
        });
    }

    // Camera Focus & Orbital Controls
    if (focusedPlanet) {
        const targetPos = new THREE.Vector3();
        focusedPlanet.mesh.getWorldPosition(targetPos);
        
        // Dynamic focus distance scaling with planet size
        const focusFactor = Math.max(focusedPlanet.data.size * 4, cameraRotation.radius * 0.1);
        
        const ox = focusFactor * Math.sin(cameraRotation.phi) * Math.cos(cameraRotation.theta);
        const oy = focusFactor * Math.cos(cameraRotation.phi);
        const oz = focusFactor * Math.sin(cameraRotation.phi) * Math.sin(cameraRotation.theta);
        
        const targetCamPos = targetPos.clone().add(new THREE.Vector3(ox, oy, oz));
        
        camera.position.lerp(targetCamPos, 0.05);
        camera.lookAt(targetPos);
    }

    renderer.render(scene, camera);
}

// Start
init();
