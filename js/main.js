import * as THREE from 'three';
import {GLTFLoader} from 'GLTFLoader';
import {OrbitControls} from 'OrbitControls';


window.AVAILABLE_LANGUAGES = ['en', 'nl'];


class BaubleAnimation {
    #material;

    constructor(context) {
        this.element = context.querySelector('.animation');
        this.defaultModel = this.element.dataset.model;
        this.models = {};
        this.textures = {};

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
        this.initLights();
        this.loadModel(this.defaultModel);
    }

    initLights() {
        // init lights;
        this.scene.add(new THREE.HemisphereLight(0xffeedd, 0x332211, 0.5));

        let directionalLight = new THREE.DirectionalLight(0xffeedd, 0.9);
        directionalLight.position.set(1.5, 1, 1);
        this.scene.add(directionalLight);
    }

    loadModel(src) {
        if (!(src in this.models)) {
            const loader = new GLTFLoader();
            loader.load(
                src,
                (gltf) => {
                    const model = gltf.scene.children[0];
                    model.name = src;
                    model.material = this.material;
                    this.models[src] = model;
                    this.loadModel(src);
                },
            );
        } else if (!this.currentModel) {
            this.currentModel = this.models[src];
            this.scene.add(this.currentModel);
        } else if (this.currentModel.name !== src) {
            const rotation = this.currentModel.rotation.y;
            this.scene.remove(this.currentModel);
            this.currentModel = this.models[src];
            this.currentModel.rotation.y = rotation;
            this.scene.add(this.currentModel);
        }
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
        else if (this.currentModel)
            this.currentModel.rotation.y += 0.005;

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

        if (src && !(src in this.textures)) {
            const textureLoader = new THREE.TextureLoader();
            let texture = textureLoader.load(src);
            texture.flipY = false;
            this.textures[src] = texture;
        }

        if (src) {
            this.#material.map = this.textures[src];
            this.#material.version ++;
            // this.#material.needsUpdate = true;
        }

        if (this.currentModel)
            this.currentModel.material = this.material;
        for (const key in this.models)
            this.models[key].material = this.material;
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

    set bauble(bauble) {
        this.texture = bauble.texture;
        if (bauble.model)
            this.loadModel(bauble.model);
        else
            this.loadModel(this.defaultModel);
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
        this.context = context;
        this.animation = new BaubleAnimation(context);
        this.template = new BaubleTemplate(context);

        this.dialogs = {};
        for (let element of context.querySelectorAll('dialog'))
            this.dialogs[`#${element.id}`] = element;

        this.navigationDialog = context.getElementById('navigation-dialog');

        let navigationDialogList = this.navigationDialog.querySelector('nav ul');

        this.current = 0;
        this.baubles = [];
        for (const element of context.querySelectorAll('.bauble')) {
            let bauble = {
                id: element.id,
                element: element,
                texture: element.dataset.texture,
                template: element.dataset.template,
                model: element.dataset.model,
            }
            let title = element.querySelector('[data-title]');
            if (title) {
                bauble.title = title.cloneNode(true);
                title.hidden = true;

                let aEl = document.createElement('a');
                aEl.append(...title.cloneNode(true).children);
                aEl.href = `#${bauble.id}`;
                aEl.addEventListener(
                    'click', () => this.toggle(bauble.id),
                )
                let liEl = document.createElement('li');
                liEl.append(aEl);
                navigationDialogList.append(liEl);
            }

            let controls = element.querySelector('[data-controls]');
            if (controls) {
                bauble.controls = controls.cloneNode(true);
                controls.hidden = true;
            }

            this.baubles.push(bauble);
        }

        this.titleContainers = context.querySelectorAll('.title-container');
        this.controlsContainers = context.querySelectorAll('.bauble-controls');
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

        document.addEventListener('click', this.handleDocumentClick.bind(this));

    }

    toggle(bauble_id) {
        this.navigationDialog.close();
        if (typeof bauble_id === 'string')
            bauble_id = this.baubles.findIndex(b => b.id === bauble_id);

        if (bauble_id < 0)
            return;

        let previous = this.baubles[this.current];
        let current = this.baubles[bauble_id];
        this.current = bauble_id;

        for (let element of this.context.querySelectorAll(`[href='#${previous.id}']`))
            element.classList.remove('is-active');

        for (let bauble of this.baubles)
            bauble.element.hidden = true;

        current.element.hidden = false;

        this.animation.bauble = current;
        this.template.template = current.template;
        for (let element of this.titleContainers) {
            if (current.title)
                element.replaceChildren(current.title);
            else
                element.replaceChildren('');
        }
        for (let element of this.controlsContainers) {
            if (current.controls)
                element.replaceChildren(...current.controls.cloneNode(true).children);
            else
                element.replaceChildren('');
        }

        for (let element of this.context.querySelectorAll(`[href='#${current.id}']`))
            element.classList.add('is-active');
    }

    print(event) {
        window.print();
        event.target.blur();
    }

    handleDocumentClick(event) {
        const anchor = event.target.closest('a[href]');
        if (anchor && anchor.hash in this.dialogs) {
            event.preventDefault();
            this.dialogs[anchor.hash].showModal();
        }
        if (event.target.tagName === 'DIALOG') {
            const rect = event.target.getBoundingClientRect();
            const isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height
                              && rect.left <= event.clientX && event.clientX <= rect.left + rect.width);
            if (!isInDialog)
                event.target.close();
        }
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
