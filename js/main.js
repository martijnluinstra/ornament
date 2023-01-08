import * as THREE from 'three';
import {GLTFLoader} from 'GLTFLoader';
import {OrbitControls} from 'OrbitControls';


window.AVAILABLE_LANGUAGES = ['en', 'nl'];


class BaubleAnimation {
    #material;
    #fov = 35;
    #yOffset = 10;

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
        const aspect = this.element.clientWidth / this.element.clientHeight;
        let fov = this.#fov;
        if (aspect < 1)
            fov /= Math.sqrt(aspect);
        this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
        this.camera.position.set(0, 75 + this.#yOffset, 200);
        this.camera.lookAt(0, this.#yOffset, 0);

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
            let rotation = this.currentModel.rotation.y;
            // Show hero face
            rotation = (rotation + Math.PI / 2) % Math.PI - Math.PI / 2;
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
        const aspect = this.element.clientWidth / this.element.clientHeight;
        this.renderer.setSize(this.element.clientWidth, this.element.clientHeight);
        this.camera.aspect = aspect;
        if (aspect < 1)
            this.camera.fov = this.#fov / Math.sqrt(aspect);
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

        if (this.currentModel) {
            this.currentModel.material = this.material;

            // Show hero face
            let rotation = this.currentModel.rotation.y;
            rotation = (rotation + Math.PI / 2) % Math.PI - Math.PI / 2;
            this.currentModel.rotation.y = rotation;
        }

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
        // Things might have changed
        this.handleResize();
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
    #current = 0;

    constructor(context) {
        this.context = context;
        this.animation = new BaubleAnimation(context);
        this.template = new BaubleTemplate(context);

        this.baubleTitles = context.querySelectorAll('.bauble-title');
        this.baubleControls = context.querySelectorAll('.bauble-controls');
        this.typeControls = context.querySelectorAll('[data-type]');
        this.colorTypeControls = context.querySelectorAll('[data-type-color]');
        this.linesTypeControls = context.querySelectorAll('[data-type-lines]');

        this.loadBaubles(context);

        for (let element of context.querySelectorAll('[data-loading]'))
            element.hidden = true;

        for (let element of context.querySelectorAll('[data-next]'))
            element.addEventListener('click', this.next.bind(this));

        for (let element of context.querySelectorAll('[data-previous]'))
            element.addEventListener('click', this.previous.bind(this));

        for (let element of this.colorTypeControls)
            element.addEventListener('click', () => this.toggleAlt('color'));

        for (let element of this.linesTypeControls)
            element.addEventListener('click', () => this.toggleAlt('lines'));

        for (let element of context.querySelectorAll('[data-print]'))
            element.addEventListener('click', this.handlePrint.bind(this));

        // Dialogs
        this.dialogs = {};
        for (let element of context.querySelectorAll('dialog'))
            this.dialogs[`#${element.id}`] = element;
        document.addEventListener('click', this.handleDocumentClick.bind(this));
    }

    loadBaubles(context) {
        let navigationDialogList = context.querySelector('#navigation-dialog nav ul');

        this.baubles = {};
        this.navigation = [];
        for (const element of context.querySelectorAll('.bauble')) {
            let bauble = {
                id: `#${element.id}`,
                element: element,
                texture: element.dataset.texture,
                template: element.dataset.template,
                model: element.dataset.model,
            }

            if (element.dataset.altLines) {
                bauble.type = 'color';
                bauble.alt = element.dataset.altLines;
            }

            if (element.dataset.altColor) {
                bauble.type = 'lines';
                bauble.alt = element.dataset.altColor;
            }

            let title = element.querySelector('[data-title]');
            if (title) {
                bauble.title = title.cloneNode(true);
                title.hidden = true;
                navigationDialogList.append(this.createNavigationElement(bauble));
            }

            let controls = element.querySelector('[data-controls]');
            if (controls) {
                bauble.controls = controls.cloneNode(true);
                controls.hidden = true;
            }

            this.baubles[bauble.id] = bauble;
            if (!bauble.type || bauble.type !== 'lines')
                this.navigation.push(bauble.id);
        }

        if (window.location.hash in this.baubles)
            this.toggle(window.location.hash);
        else
            this.toggle(this.navigation[0], false);
    }

    createNavigationElement(bauble) {
        let anchorElement = document.createElement('a');
        anchorElement.append(...bauble.title.cloneNode(true).children);
        anchorElement.classList.add('button', 'is-stealth');
        anchorElement.href = bauble.id;
        anchorElement.addEventListener(
            'click', () => this.toggle(bauble.id),
        )
        let itemElement = document.createElement('li');
        itemElement.append(anchorElement);
        return itemElement;
    }

    previous() {
        this.navigate(-1);
    }

    next() {
        this.navigate(1);
    }

    navigate(direction) {
        let current = this.navigation.indexOf(this.#current.id);
        if (current < 0) 
            current = this.navigation.indexOf(this.#current.alt) || 0;
        const idx = (this.navigation.length + current + direction) % this.navigation.length;
        console.log(this.#current, current, idx, this.navigation);
        return this.toggle(this.navigation[idx]);
    }

    toggleAlt(type) {
        if (!this.#current.alt || this.#current.type === type)
            return;
        this.toggle(this.#current.alt);
    }

    toggle(bauble_id, updateLocation=true) {
        // Close dialog (if needed)
        this.context.getElementById('navigation-dialog').close();

        if (!(bauble_id in this.baubles))
            return;

        // Switch
        let previous = this.#current;
        let current = this.baubles[bauble_id];
        this.#current = current;

        // Update content
        this.animation.bauble = current;
        this.template.template = current.template;

        for (let id in this.baubles)
            this.baubles[id].element.hidden = true;
        current.element.hidden = false;

        for (let element of this.baubleTitles) {
            if (current.title)
                element.replaceChildren(current.title);
            else
                element.replaceChildren('');
        }

        for (let element of this.baubleControls) {
            if (current.controls)
                element.replaceChildren(...current.controls.cloneNode(true).children);
            else
                element.replaceChildren('');
        }

        for (let element of this.typeControls)
            element.hidden = !current.type;

        if (current.type) {
            for (let element of this.colorTypeControls) {
                if (current.type === 'color')
                    element.classList.add('is-active');
                else
                    element.classList.remove('is-active');
            }

            for (let element of this.linesTypeControls) {
                if (current.type === 'lines')
                    element.classList.add('is-active');
                else
                    element.classList.remove('is-active');
            }
        }

        // Update navigation
        for (let element of this.context.querySelectorAll(`[href='#${previous.id}']`))
            element.classList.remove('is-active');
        for (let element of this.context.querySelectorAll(`[href='#${current.id}']`))
            element.classList.add('is-active');

        // Update url
        if (updateLocation)
            history.pushState(null, null, current.id);
    }

    handlePrint(event) {
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
