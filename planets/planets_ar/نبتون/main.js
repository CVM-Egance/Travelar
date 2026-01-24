import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class EarthExperience {
    constructor() {
        this.canvas = document.querySelector('#earth-canvas');
        this.loaderElement = document.getElementById('loader');
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 3.5;
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 1.5;
        this.controls.maxDistance = 10;

        this.textureLoader = new THREE.TextureLoader();
        
        this.init();
        this.addStars();
        this.addLights();
        this.createEarth();
        this.animate();
        
        window.addEventListener('resize', () => this.onResize());
    }

    addStars() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 8000;
        const posArray = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 100;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const starMaterial = new THREE.PointsMaterial({
            size: 0.02,
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });

        const starMesh = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(starMesh);
    }

    addLights() {
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(-5, 3, 5);
        this.scene.add(sunLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(ambientLight);
    }

    createEarth() {
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        
        // استخدام روابط خارجية لصور عالية الدقة (Textures)
        const textures = {
            day: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
            specular: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
            normal: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
            clouds: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png'
        };

        const material = new THREE.MeshPhongMaterial({
            map: this.textureLoader.load(textures.day, () => {
                this.loaderElement.style.display = 'none';
            }),
            specularMap: this.textureLoader.load(textures.specular),
            normalMap: this.textureLoader.load(textures.normal),
            normalScale: new THREE.Vector2(0.5, 0.5),
            specular: new THREE.Color('grey'),
            shininess: 10
        });

        this.earth = new THREE.Mesh(geometry, material);
        this.scene.add(this.earth);

        // طبقة السحب
        const cloudGeometry = new THREE.SphereGeometry(1.02, 64, 64);
        const cloudMaterial = new THREE.MeshPhongMaterial({
            map: this.textureLoader.load(textures.clouds),
            transparent: true,
            opacity: 0.4
        });
        this.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.scene.add(this.clouds);

        // الغلاف الجوي (Atmospheric Glow) - نسخة بسيطة باستخدام Mesh
        const atmosphereGeometry = new THREE.SphereGeometry(1.1, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
            transparent: true,
            side: THREE.BackSide,
            uniforms: {
                viewVector: { type: "v3", value: this.camera.position }
            },
            vertexShader: `
                varying float intensity;
                void main() {
                    vec3 vNormal = normalize( normalMatrix * normal );
                    vec3 vNormel = normalize( normalMatrix * viewMatrix[2].xyz );
                    intensity = pow( 0.6 - dot(vNormal, vNormel), 2.0 );
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
            `,
            fragmentShader: `
                varying float intensity;
                void main() {
                    vec3 glow = vec3(0.3, 0.6, 1.0) * intensity;
                    gl_FragColor = vec4( glow, 1.0 );
                }
            `
        });
        this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.scene.add(this.atmosphere);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.earth) this.earth.rotation.y += 0.001;
        if (this.clouds) this.clouds.rotation.y += 0.0015;
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    init() {}
}

new EarthExperience();
