import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let starField, shootingStars, composer;
const starCount = 15000;
const shootingStarCount = 20;

function createStarField() {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        vertices[i3] = Math.random() * 2000 - 1000;
        vertices[i3 + 1] = Math.random() * 2000 - 1000;
        vertices[i3 + 2] = Math.random() * 2000 - 1000;

        const shade = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
        colors[i3] = colors[i3 + 1] = colors[i3 + 2] = shade;

        sizes[i] = Math.random() * 2 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8
    });

    starField = new THREE.Points(geometry, material);
}

function createShootingStars() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(shootingStarCount * 6); // 2 points per shooting star
    const velocities = new Float32Array(shootingStarCount * 3);

    for (let i = 0; i < shootingStarCount; i++) {
        resetShootingStar(positions, velocities, i);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true });
    shootingStars = new THREE.LineSegments(geometry, material);
    shootingStars.userData.velocities = velocities;
}

function resetShootingStar(positions, velocities, index) {
    const i6 = index * 6;
    const i3 = index * 3;
    positions[i6] = positions[i6 + 3] = Math.random() * 2000 - 1000;
    positions[i6 + 1] = positions[i6 + 4] = Math.random() * 2000 - 1000;
    positions[i6 + 2] = positions[i6 + 5] = Math.random() * 2000 - 1000;

    velocities[i3] = (Math.random() - 0.5) * 10;
    velocities[i3 + 1] = (Math.random() - 0.5) * 10;
    velocities[i3 + 2] = (Math.random() - 0.5) * 10;
}

export function initVisualEffects(scene, camera, renderer) {
    createStarField();
    createShootingStars();
    scene.add(starField);
    scene.add(shootingStars);

    // Setup bloom effect
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, 0.4, 0.85
    );
    bloomPass.threshold = 0;
    bloomPass.strength = 1.5;
    bloomPass.radius = 0;

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
}

export function updateVisualEffects(time) {
    if (starField) {
        starField.rotation.y = time * 0.00005;
    }

    if (shootingStars) {
        const positions = shootingStars.geometry.attributes.position.array;
        const velocities = shootingStars.userData.velocities;
        for (let i = 0; i < shootingStarCount; i++) {
            const i6 = i * 6;
            const i3 = i * 3;
            positions[i6] += velocities[i3] * 0.1;
            positions[i6 + 1] += velocities[i3 + 1] * 0.1;
            positions[i6 + 2] += velocities[i3 + 2] * 0.1;
            positions[i6 + 3] = positions[i6] - velocities[i3] * 2;
            positions[i6 + 4] = positions[i6 + 1] - velocities[i3 + 1] * 2;
            positions[i6 + 5] = positions[i6 + 2] - velocities[i3 + 2] * 2;

            if (Math.abs(positions[i6]) > 1000 || Math.abs(positions[i6 + 1]) > 1000 || Math.abs(positions[i6 + 2]) > 1000) {
                resetShootingStar(positions, velocities, i);
            }
        }
        shootingStars.geometry.attributes.position.needsUpdate = true;
    }
}

export function resizeVisualEffects(width, height) {
    if (composer) {
        composer.setSize(width, height);
    }
}

export function renderVisualEffects() {
    if (composer) {
        composer.render();
    }
}