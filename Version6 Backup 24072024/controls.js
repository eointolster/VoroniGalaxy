import * as THREE from 'three';

export const controls = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    moveUp: false,
    moveDown: false,
    mouse: new THREE.Vector2()
};

let camera, updateInfo, onResize;

export function initControls(_camera, _updateInfo, _onResize) {
    camera = _camera;
    updateInfo = _updateInfo;
    onResize = _onResize;
}

export function setupEventListeners(renderer, onMouseMove, onMouseDown) {
    window.addEventListener('resize', handleResize, false);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    if (typeof onMouseMove === 'function') {
        renderer.domElement.addEventListener('mousemove', (event) => {
            updateMousePosition(event);
            onMouseMove(controls.mouse);
        });
    } else {
        console.warn('onMouseMove is not a function. Mouse move events will not be processed.');
    }
    
    renderer.domElement.addEventListener('wheel', onMouseWheel);
    
    if (typeof onMouseDown === 'function') {
        renderer.domElement.addEventListener('mousedown', (event) => {
            updateMousePosition(event);
            onMouseDown(controls.mouse, event.button);
        });
    } else {
        console.warn('onMouseDown is not a function. Mouse down events will not be processed.');
    }
    
    setupNavigation();
}

function handleResize() {
    if (typeof onResize === 'function') {
        onResize();
    }
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

function setupNavigation() {
    document.getElementById('up').addEventListener('click', () => moveCamera(0, 1));
    document.getElementById('down').addEventListener('click', () => moveCamera(0, -1));
    document.getElementById('left').addEventListener('click', () => moveCamera(-1, 0));
    document.getElementById('right').addEventListener('click', () => moveCamera(1, 0));
}

function moveCamera(dx, dy) {
    camera.position.x += dx * 10;
    camera.position.y += dy * 10;
    updateInfo();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': controls.moveForward = true; break;
        case 'KeyS': controls.moveBackward = true; break;
        case 'KeyA': controls.moveLeft = true; break;
        case 'KeyD': controls.moveRight = true; break;
        case 'KeyQ': controls.moveUp = true; break;
        case 'KeyE': controls.moveDown = true; break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': controls.moveForward = false; break;
        case 'KeyS': controls.moveBackward = false; break;
        case 'KeyA': controls.moveLeft = false; break;
        case 'KeyD': controls.moveRight = false; break;
        case 'KeyQ': controls.moveUp = false; break;
        case 'KeyE': controls.moveDown = false; break;
    }
}

function updateMousePosition(event) {
    controls.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    controls.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseWheel(event) {
    event.preventDefault();
    const zoomSpeed = 0.1;
    const newZoom = camera.position.z + event.deltaY * zoomSpeed;
    camera.position.z = Math.max(10, Math.min(newZoom, 1000));
    updateInfo();
}

export function updateCamera() {
    const speed = 0.5;
    const direction = new THREE.Vector3();
    const sideDirection = new THREE.Vector3();

    direction.set(0, 0, -1).applyQuaternion(camera.quaternion);
    sideDirection.set(1, 0, 0).applyQuaternion(camera.quaternion);

    if (controls.moveForward) camera.position.addScaledVector(direction, speed);
    if (controls.moveBackward) camera.position.addScaledVector(direction, -speed);
    if (controls.moveLeft) camera.position.addScaledVector(sideDirection, -speed);
    if (controls.moveRight) camera.position.addScaledVector(sideDirection, speed);
    if (controls.moveUp) camera.position.y += speed;
    if (controls.moveDown) camera.position.y -= speed;

    updateInfo();
}