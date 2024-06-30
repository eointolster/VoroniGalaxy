// import * as THREE from 'three';
// import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// let scene, camera, renderer, stars, raycaster, mouse, composer;
// let currentSegment = { x: 0, y: 0 };
// const segmentSize = 100;

// const STAR_TYPES = {
//     'gigantic': { color: 0xff0000, size: 6 },
//     'large': { color: 0x0000ff, size: 5 },
//     'medium': { color: 0x00ff00, size: 4 },
//     'small': { color: 0xffff00, size: 3 }
// };

// const QUADRANTS = ['Alpha', 'Beta', 'Gamma', 'Delta'];

// const bloomParams = {
//     exposure: 1,
//     bloomStrength: 1.5,
//     bloomThreshold: 0,
//     bloomRadius: 0
// };

// const BLOOM_LAYER = 1;

// function init() {
//     scene = new THREE.Scene();
//     camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
//     renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('galaxyCanvas') });
//     renderer.setSize(window.innerWidth, window.innerHeight);

//     raycaster = new THREE.Raycaster();
//     mouse = new THREE.Vector2();

//     camera.position.z = 500;

//     const ambientLight = new THREE.AmbientLight(0x404040);
//     scene.add(ambientLight);

//     const pointLight = new THREE.PointLight(0xffffff, 1);
//     pointLight.position.set(0, 0, 50);
//     scene.add(pointLight);

//     setupBloom();
//     loadGalaxyData();

//     window.addEventListener('resize', onWindowResize, false);
//     setupNavigation();
//     setupMouseInteractions();
// }

// function setupBloom() {
//     const renderScene = new RenderPass(scene, camera);
//     const bloomPass = new UnrealBloomPass(
//         new THREE.Vector2(window.innerWidth, window.innerHeight),
//         bloomParams.bloomStrength,
//         bloomParams.bloomRadius,
//         bloomParams.bloomThreshold
//     );

//     composer = new EffectComposer(renderer);
//     composer.addPass(renderScene);
//     composer.addPass(bloomPass);

//     renderer.toneMapping = THREE.ReinhardToneMapping;
//     renderer.toneMappingExposure = Math.pow(bloomParams.exposure, 4.0);
// }

// function loadGalaxyData() {
//     fetch('galaxy.json')
//         .then(response => response.json())
//         .then(data => {
//             console.log("Galaxy data loaded:", data);
//             if (data.points && data.points.length > 0) {
//                 createStars(data);
//                 createConnections(data);
//                 updateStarCount(data.points.length);
//                 animate();
//             } else {
//                 console.error("Galaxy data is empty or invalid");
//             }
//         })
//         .catch(error => {
//             console.error("Error loading galaxy data:", error);
//         });
// }

// function createStars(data) {
//     stars = new THREE.Group();
//     console.log("Creating stars:", data.points.length);
//     data.points.forEach((point, index) => {
//         const starType = data.types[index];
//         const starGeometry = new THREE.SphereGeometry(STAR_TYPES[starType].size / 10, 32, 32);
//         const starMaterial = new THREE.MeshPhongMaterial({
//             color: STAR_TYPES[starType].color,
//             emissive: STAR_TYPES[starType].color,
//             emissiveIntensity: 1,
//             shininess: 100
//         });
//         const star = new THREE.Mesh(starGeometry, starMaterial);
//         star.position.set(point[0], point[1], 0);
//         star.userData.name = data.star_names[index];
//         star.layers.enable(BLOOM_LAYER);
//         stars.add(star);
//     });
//     scene.add(stars);
//     console.log("Stars added to scene");
// }

// function createConnections(data) {
//     const material = new THREE.LineBasicMaterial({ color: 0x333333 });
//     data.connections.forEach(connection => {
//         const geometry = new THREE.BufferGeometry().setFromPoints([
//             new THREE.Vector3(connection[0][0], connection[0][1], 0),
//             new THREE.Vector3(connection[1][0], connection[1][1], 0)
//         ]);
//         const line = new THREE.Line(geometry, material);
//         scene.add(line);
//     });
// }

// function animate() {
//     requestAnimationFrame(animate);
//     render();
// }

// function render() {
//     composer.render();
// }

// function onWindowResize() {
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     composer.setSize(window.innerWidth, window.innerHeight);
// }

// function setupNavigation() {
//     document.getElementById('up').addEventListener('click', () => moveCamera(0, 1));
//     document.getElementById('down').addEventListener('click', () => moveCamera(0, -1));
//     document.getElementById('left').addEventListener('click', () => moveCamera(-1, 0));
//     document.getElementById('right').addEventListener('click', () => moveCamera(1, 0));
// }

// function moveCamera(dx, dy) {
//     camera.position.x += dx * 10;
//     camera.position.y += dy * 10;
//     updateInfo();
// }

// function updateInfo() {
//     const quadrantX = Math.floor(camera.position.x / (5 * segmentSize)) % 2;
//     const quadrantY = Math.floor(camera.position.y / (5 * segmentSize)) % 2;
//     const quadrant = QUADRANTS[quadrantY * 2 + quadrantX];
//     const segmentX = Math.abs(Math.floor(camera.position.x / segmentSize) % 5);
//     const segmentY = Math.abs(Math.floor(camera.position.y / segmentSize) % 5);
    
//     document.getElementById('quadrant').textContent = `Quadrant: ${quadrant}`;
//     document.getElementById('segment').textContent = `Segment: (${segmentX}, ${segmentY})`;
// }

// function setupMouseInteractions() {
//     const canvas = renderer.domElement;
//     canvas.addEventListener('mousemove', onMouseMove);
//     canvas.addEventListener('wheel', onMouseWheel);
//     canvas.addEventListener('mousedown', onMouseDown);
//     canvas.addEventListener('mouseup', onMouseUp);
//     canvas.addEventListener('mousemove', onMouseDrag);
// }

// function onMouseMove(event) {
//     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
//     mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

//     raycaster.setFromCamera(mouse, camera);
//     const intersects = raycaster.intersectObjects(stars.children);

//     const starNameElement = document.getElementById('starName');
//     if (starNameElement) {
//         if (intersects.length > 0) {
//             const star = intersects[0].object;
//             starNameElement.textContent = `Star: ${star.userData.name}`;
//         } else {
//             starNameElement.textContent = '';
//         }
//     }
// }

// function onMouseWheel(event) {
//     event.preventDefault();
//     const zoomSpeed = 0.1;
//     const newZoom = camera.position.z + event.deltaY * zoomSpeed;
//     camera.position.z = Math.max(10, Math.min(newZoom, 1000));
//     updateInfo();
// }

// let isDragging = false;
// let previousMousePosition = {
//     x: 0,
//     y: 0
// };

// function onMouseDown(event) {
//     if (event.button === 1) { // Middle mouse button
//         isDragging = true;
//         previousMousePosition = {
//             x: event.clientX,
//             y: event.clientY
//         };
//     } else if (event.button === 0) { // Left mouse button
//         raycaster.setFromCamera(mouse, camera);
//         const intersects = raycaster.intersectObjects(stars.children);
//         if (intersects.length > 0) {
//             const star = intersects[0].object;
//             star.layers.toggle(BLOOM_LAYER);
//         }
//     }
// }

// function onMouseUp(event) {
//     if (event.button === 1) { // Middle mouse button
//         isDragging = false;
//     }
// }

// function onMouseDrag(event) {
//     if (!isDragging) return;

//     const deltaMove = {
//         x: event.clientX - previousMousePosition.x,
//         y: event.clientY - previousMousePosition.y
//     };

//     const rotationSpeed = 0.005;
//     camera.rotation.y += deltaMove.x * rotationSpeed;
//     camera.rotation.x += deltaMove.y * rotationSpeed;

//     previousMousePosition = {
//         x: event.clientX,
//         y: event.clientY
//     };
// }

// function updateStarCount(count) {
//     const starCountElement = document.getElementById('starCount');
//     if (starCountElement) {
//         starCountElement.textContent = `Total Stars: ${count}`;
//     }
// }

// document.addEventListener('DOMContentLoaded', init);

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, stars, raycaster, mouse, composer;
let currentSegment = { x: 0, y: 0 };
const segmentSize = 100;

const STAR_TYPES = {
    'gigantic': { color: 0xff0000, size: 6 },
    'large': { color: 0x0000ff, size: 5 },
    'medium': { color: 0x00ff00, size: 4 },
    'small': { color: 0xffff00, size: 3 }
};

const QUADRANTS = ['Alpha', 'Beta', 'Gamma', 'Delta'];

const bloomParams = {
    exposure: 1,
    bloomStrength: 1.5,
    bloomThreshold: 0,
    bloomRadius: 0
};

const BLOOM_LAYER = 1;
const NON_BLOOM_LAYER = 0;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('galaxyCanvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Add a test cube to check if rendering is working
    const geometry = new THREE.BoxGeometry(10, 10, 10);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    camera.position.z = 500;
    camera.position.x = 600;
    camera.position.y = 450;
    console.log("Camera position:", camera.position);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(0, 0, 50);
    scene.add(pointLight);

    setupBloom();
    loadGalaxyData();

    window.addEventListener('resize', onWindowResize, false);
    setupNavigation();
    setupMouseInteractions();
}


function setupBloom() {
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,  // bloomStrength
        0.4,  // bloomRadius
        0.85  // bloomThreshold
    );

    bloomPass.threshold = 0;
    bloomPass.strength = 3;
    bloomPass.radius = 1;

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.5;
}


function loadGalaxyData() {
    fetch('galaxy.json')
        .then(response => response.json())
        .then(data => {
            console.log("Galaxy data loaded:", data);
            if (data.points && data.points.length > 0) {
                createStars(data);
                createConnections(data);
                updateStarCount(data.points.length);
                animate();
            } else {
                console.error("Galaxy data is empty or invalid");
            }
        })
        .catch(error => {
            console.error("Error loading galaxy data:", error);
        });
}

function createStars(data) {
    stars = new THREE.Group();
    console.log("Creating stars:", data.points.length);
    data.points.forEach((point, index) => {
        const starType = data.types[index];
        const starGeometry = new THREE.SphereGeometry(STAR_TYPES[starType].size / 8, 32, 32);
        const starMaterial = new THREE.MeshPhongMaterial({
            color: STAR_TYPES[starType].color,
            emissive: STAR_TYPES[starType].color,
            emissiveIntensity: 1,
            shininess: 100,
            specular: new THREE.Color(0xffffff)
        });
        const star = new THREE.Mesh(starGeometry, starMaterial);
        star.position.set(point[0], point[1], 0);
        star.userData.name = data.star_names[index];
        star.userData.bloomEnabled = true;
        star.layers.enable(BLOOM_LAYER);
        stars.add(star);
    });
    scene.add(stars);
    console.log("Stars added to scene. Total stars:", stars.children.length);
}


function createConnections(data) {
    const material = new THREE.LineBasicMaterial({ color: 0x333333 });
    data.connections.forEach(connection => {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(connection[0][0], connection[0][1], 0),
            new THREE.Vector3(connection[1][0], connection[1][1], 0)
        ]);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
    });
}

function animate() {
    requestAnimationFrame(animate);
    render();
    // Log camera position in each frame
    //console.log("Camera position:", camera.position);
}

function render() {
    composer.render();
}


function darkenNonBloomed(obj) {
    if (obj.isMesh && obj.userData.bloomEnabled === false) {
        obj.userData.originalMaterial = obj.material;
        obj.material = new THREE.MeshBasicMaterial({ color: 'black' });
    }
}

function restoreMaterial(obj) {
    if (obj.isMesh && obj.userData.originalMaterial) {
        obj.material = obj.userData.originalMaterial;
        delete obj.userData.originalMaterial;
    }
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
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

function updateInfo() {
    const quadrantX = Math.floor(camera.position.x / (5 * segmentSize)) % 2;
    const quadrantY = Math.floor(camera.position.y / (5 * segmentSize)) % 2;
    const quadrant = QUADRANTS[quadrantY * 2 + quadrantX];
    const segmentX = Math.abs(Math.floor(camera.position.x / segmentSize) % 5);
    const segmentY = Math.abs(Math.floor(camera.position.y / segmentSize) % 5);
    
    document.getElementById('quadrant').textContent = `Quadrant: ${quadrant}`;
    document.getElementById('segment').textContent = `Segment: (${segmentX}, ${segmentY})`;
}

function setupMouseInteractions() {
    const canvas = renderer.domElement;
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('wheel', onMouseWheel);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', onMouseDrag);
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(stars.children);

    const starNameElement = document.getElementById('starName');
    if (starNameElement) {
        if (intersects.length > 0) {
            const star = intersects[0].object;
            starNameElement.textContent = `Star: ${star.userData.name}`;
        } else {
            starNameElement.textContent = '';
        }
    }
}

function onMouseWheel(event) {
    event.preventDefault();
    const zoomSpeed = 0.1;
    const newZoom = camera.position.z + event.deltaY * zoomSpeed;
    camera.position.z = Math.max(10, Math.min(newZoom, 1000));
    updateInfo();
}

let isDragging = false;
let previousMousePosition = {
    x: 0,
    y: 0
};

function onMouseDown(event) {
    if (event.button === 1) { // Middle mouse button
        isDragging = true;
        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    } else if (event.button === 0) { // Left mouse button
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(stars.children);
        if (intersects.length > 0) {
            const star = intersects[0].object;
            toggleStarBloom(star);
        }
    }
}

function toggleStarBloom(star) {
    star.userData.bloomEnabled = !star.userData.bloomEnabled;
    if (star.userData.bloomEnabled) {
        star.layers.enable(BLOOM_LAYER);
        star.material.emissiveIntensity = 1;
    } else {
        star.layers.disable(BLOOM_LAYER);
        star.material.emissiveIntensity = 0.2;
    }
    console.log(`Toggled bloom for star ${star.userData.name}: ${star.userData.bloomEnabled}`);
}

function onMouseUp(event) {
    if (event.button === 1) { // Middle mouse button
        isDragging = false;
    }
}

function onMouseDrag(event) {
    if (!isDragging) return;

    const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
    };

    const rotationSpeed = 0.005;
    camera.rotation.y += deltaMove.x * rotationSpeed;
    camera.rotation.x += deltaMove.y * rotationSpeed;

    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function updateStarCount(count) {
    const starCountElement = document.getElementById('starCount');
    if (starCountElement) {
        starCountElement.textContent = `Total Stars: ${count}`;
    }
}

document.addEventListener('DOMContentLoaded', init);