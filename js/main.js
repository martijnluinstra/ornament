import * as THREE from 'three';
import {GLTFLoader} from 'GLTFLoader';
import {OrbitControls} from 'OrbitControls';


window.AVAILABLE_LANGUAGES = ['en', 'nl'];


class BaubleAnimation {
    #material;

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
        // let texture = textureLoader.load('http://ornament.localhost/img/textures/globe.jpg');
        let texture = textureLoader.load('http://ornament.localhost/img/textures/diamonds.jpg');
        // let texture = textureLoader.load('http://ornament.localhost/img/textures/fans.jpg');
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
        directionalLight.position.set(1.5, 1, 1);
        this.scene.add(directionalLight);

        const loader = new GLTFLoader();
        loader.load(
            this.src,
            (gltf) => {
                this.bauble = gltf.scene.children[0];
                this.bauble.material = this.material;
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

    set texture(src) {
        // Init (or reset) material
        if (this.material);
            delete this.#material.map;

        if (src) {
            const textureLoader = new THREE.TextureLoader();
            this.#material.map = textureLoader.load(src);
            this.#material.map.flipY = false;
        }

        if (this.bauble)
            this.bauble.material = this.material;
    }

    get material() {
        if (!this.#material)
            this.#material = {
                color: 0xffffff,
                fog: true,
                shininess: 20,
            };
        return new THREE.MeshPhongMaterial(this.#material);
    }
}

class BaubleTemplate {
    constructor(context) {
        this.element = context.querySelector('.template svg');
        this.content = this.element.getElementById('content');
    }

    set template(src) {
        this.content.setAttribute('visibility', 'hidden');

        if (src) {
            this.content.setAttribute('href', src);
            this.content.setAttribute('visibility', 'visible');
        }
    }
}


class BaubleController {
    constructor(context) {
        this.animation = new BaubleAnimation(context);
        this.template = new BaubleTemplate(context);

        this.current = 0;
        this.baubles = [];
        for (let element of context.querySelectorAll('.bauble')) {
            const bauble = {
                element: element,
                texture: element.dataset.texture,
                template: element.dataset.template,
            }
            this.baubles.push(bauble);
        }

        this.toggle(this.baubles.findIndex(o => !o.element.hidden));

        for (let element of context.querySelectorAll('[data-next]'))
            element.addEventListener(
                'click', () => this.toggle((this.current + 1) % this.baubles.length )
            );

        for (let element of context.querySelectorAll('[data-previous]'))
            element.addEventListener(
                'click', () => this.toggle((this.baubles.length + this.current - 1) % this.baubles.length )
            );

        for (let element of context.querySelectorAll('[data-print]'))
            element.addEventListener('click', this.print.bind(this));
    }

    toggle(bauble_id) {
        for (let bauble of this.baubles)
            bauble.element.hidden = true;

        this.current = bauble_id;
        const current = this.baubles[bauble_id];
        current.element.hidden = false;
        this.animation.texture = current.texture;
        this.template.template = current.template;
    }

    print() {
        window.print()
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
new BaubleController(document);
