import * as THREE from 'three';
import {GLTFLoader} from 'GLTFLoader';
import {OrbitControls} from 'OrbitControls';


window.AVAILABLE_LANGUAGES = ['en', 'nl'];


class BaubleAnimation {
    constructor(context) {
        this.element = context.querySelector('.animation');
        this.src = this.element.dataset.src;

        this.init();
        this.animate();

        window.addEventListener('resize', this.handleResize.bind(this));
    }

    init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(36, this.element.clientWidth / this.element.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 75, 200);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(this.element.clientWidth, this.element.clientHeight);
        this.element.appendChild(this.renderer.domElement);

        // this.initControls();
        this.loadScene();
    }

    loadMaterial() {
        const textureLoader = new THREE.TextureLoader();
        let texture = textureLoader.load('http://ornament.localhost/img/textures/globe.jpg');
        // let texture = textureLoader.load('http://ornament.localhost/img/textures/waves.jpg');
        texture.flipY = false;

        return new THREE.MeshPhongMaterial({
            map: texture,
            color: 0xffffff,
            fog: true,
            shininess: 20,
        });
    }

    loadScene() {
        // init lights;
        this.scene.add(new THREE.HemisphereLight(0xffeedd, 0x332211, 0.5));

        let directionalLight = new THREE.DirectionalLight(0xffeedd, 0.9);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);

        const loader = new GLTFLoader();
        loader.load(
            this.src,
            (gltf) => {
                this.bauble = gltf.scene.children[0];
                this.bauble.material = this.loadMaterial();
                // this.bauble.position.y += 60;
                this.scene.add(this.bauble);
            },
        );
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.rotateSpeed = 0.05;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.panSpeed = 5;
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        if (this.controls)
            this.controls.update();

        if (this.bauble)
            this.bauble.rotation.y += 0.005;

        this.renderer.render(this.scene, this.camera);
    }

    handleResize() {
        this.renderer.setSize(this.element.clientWidth, this.element.clientHeight);
        this.camera.aspect = this.element.clientWidth / this.element.clientHeight;
        this.camera.updateProjectionMatrix();
    }
}


function initLanguage() {
    const url = new URL(window.location.href);
    let searchParams = url.searchParams;

    if (searchParams.has('lang') && window.AVAILABLE_LANGUAGES.includes(searchParams.get('lang').toLowerCase()))
        document.documentElement.lang = searchParams.get('lang').toLowerCase();
    else if (/^nl\b/.test(navigator.language))
        document.documentElement.lang = navigator.language;
}

initLanguage();
new BaubleAnimation(document);
