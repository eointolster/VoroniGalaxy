import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { setupEventListeners, updateCamera, controls, initControls } from './controls.js';
import { initVisualEffects, updateVisualEffects, resizeVisualEffects, renderVisualEffects } from './visualEffects.js';
import { initSelection, getSelectedStars, deselectAllStars, isCurrentlySelecting } from './selection.js';
import { createStars, createConnections, getStarType, STAR_TYPES, STAR_LIMITS, BLOOM_LAYER } from './galaxy.js';
import { loadGalaxyData, markInitialStar, markStarAsOwned, findStarAtPosition, stars, ownedStars, galaxyData } from './galaxyCreation.js';
import { updateStarsInScene, handleTriangleArrival, attemptStarCapture, updateStarLOD, pulsateOwnedStars } from './starManagement.js';
import { initTriangleManagement, sendTrianglesFromMultipleStars, sendTriangles, updateMovingTriangles } from './triangleManagement.js';

let scene, camera, renderer, raycaster, composer, clock;
let selectedStar = null;
let movingTriangles = [];
let frustum = new THREE.Frustum();

// const GROWTH_RATE = .5;
const DECAY_RATE = 2;

const QUADRANTS = ['Alpha', 'Beta', 'Gamma', 'Delta'];
const SEGMENT_SIZE = 100;

function init() {
    setupScene();
    setupLights();
    clock = new THREE.Clock();

    initTriangleManagement(scene, camera);
    initVisualEffects(scene, camera, renderer);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('galaxyCanvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);
    initSelection(scene, camera, renderer);
    setupBloom();
    loadGalaxyData(scene, () => {  // Pass scene here
        zoomToInitialOwnedStar();
        animate();
    });
    initControls(camera, updateInfo, onWindowResize);
    setupEventListeners(renderer, handleMouseMove, handleMouseDown);
    
    window.addEventListener('resize', onWindowResize, false);
}

function animate() {
    requestAnimationFrame(animate);
    updateCamera();
    updateStarsInScene(stars, clock);
    updateMovingTriangles();
    pulsateOwnedStars(ownedStars);
    updateFrustum();
    updateStarVisibility(stars, frustum);
    updateVisualEffects(clock.getElapsedTime());
    renderer.render(scene, camera);
    composer.render();
}

function setupScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('galaxyCanvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    raycaster = new THREE.Raycaster();
}

function setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(0, 0, 50);
    scene.add(ambientLight, pointLight);
}

function setupBloom() {
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, 0.4, 0.85
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

function handleMouseMove(mousePosition) {
    if (!stars || !stars.children) {
        console.warn('Stars not initialized yet');
        return;
    }
    raycaster.setFromCamera(mousePosition, camera);
    const intersects = raycaster.intersectObjects(stars.children);
    const starNameElement = document.getElementById('starName');
    if (starNameElement) {
        if (intersects.length > 0) {
            const star = intersects[0].object;
            starNameElement.textContent = `Star: ${star.userData.name} (Triangles: ${Math.floor(star.userData.triangles)})`;
        } else {
            starNameElement.textContent = '';
        }
    }
}

function handleMouseDown(mousePosition, button) {
    if (button === 0) { // Left mouse button
        raycaster.setFromCamera(mousePosition, camera);
        const intersects = raycaster.intersectObjects(stars.children);
        if (intersects.length > 0) {
            const clickedStar = intersects[0].object;
            const selectedStars = getSelectedStars();
            
            if (selectedStars.length > 0) {
                sendTrianglesFromMultipleStars(selectedStars, clickedStar);
                deselectAllStars();
            } else {
                // Single star selection logic
                if (clickedStar.userData.isOwned) {
                    if (selectedStar) {
                        sendTriangles(selectedStar, clickedStar);
                    } else {
                        selectedStar = clickedStar;
                        console.log(`Selected star: ${selectedStar.userData.name}`);
                    }
                } else if (selectedStar && selectedStar.userData.isOwned) {
                    sendTriangles(selectedStar, clickedStar);
                }
            }
        } else {
            // Only deselect if we're not starting a new selection
            if (!isCurrentlySelecting()) {
                deselectAllStars();
                selectedStar = null;
            }
        }
    }
}

function zoomToInitialOwnedStar() {
    if (ownedStars.length > 0) {
        const initialStar = ownedStars[0];
        const startPosition = camera.position.clone();
        const endPosition = initialStar.position.clone().add(new THREE.Vector3(0, 0, 20));
        const duration = 3000;
        const startTime = Date.now();

        function animate() {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            camera.position.lerpVectors(startPosition, endPosition, progress);
            camera.lookAt(initialStar.position);
            if (progress < 1) requestAnimationFrame(animate);
        }
        animate();
    }
}

function updateFrustum() {
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
}

function updateStars() {
    updateStarsInScene(stars, clock);
}

function updateStarVisibility() {
    stars.children.forEach(star => {
        if (frustum.containsPoint(star.position)) {
            star.visible = true;
            updateStarLOD(star, camera);
        } else {
            star.visible = false;
        }
    });
}

function pulsateCircles() {
    pulsateOwnedStars(ownedStars);
}

function updateInfo() {
    const quadrantX = Math.floor(camera.position.x / (5 * SEGMENT_SIZE)) % 2;
    const quadrantY = Math.floor(camera.position.y / (5 * SEGMENT_SIZE)) % 2;
    const quadrant = QUADRANTS[quadrantY * 2 + quadrantX];
    const segmentX = Math.abs(Math.floor(camera.position.x / SEGMENT_SIZE) % 5);
    const segmentY = Math.abs(Math.floor(camera.position.y / SEGMENT_SIZE) % 5);
    
    document.getElementById('quadrant').textContent = `Quadrant: ${quadrant}`;
    document.getElementById('segment').textContent = `Segment: (${segmentX}, ${segmentY})`;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    resizeVisualEffects(window.innerWidth, window.innerHeight);
}

document.addEventListener('DOMContentLoaded', init);