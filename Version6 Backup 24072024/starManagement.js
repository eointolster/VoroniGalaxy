// starManagement.js

import * as THREE from 'three';
import { STAR_TYPES, STAR_LIMITS, getStarType } from './galaxy.js';
import { markStarAsOwned } from './galaxyCreation.js';

const GROWTH_RATE = 0.5;

export function updateStarsInScene(stars, clock) {
    if (!stars || !stars.children) {
        return;
    }
    const delta = clock.getDelta();
    stars.children.forEach(star => {
        updateStarTriangles(star, delta);
    });
}


export function updateStarTriangles(star, delta) {
    const limit = STAR_LIMITS[getStarType(star)];
    if (star.userData.isOwned) {
        star.userData.triangles = Math.min(star.userData.triangles + GROWTH_RATE * delta, limit);
    } else {
        star.userData.triangles = Math.min(star.userData.triangles + GROWTH_RATE * 0.2 * delta, limit);
    }
}

export function handleTriangleArrival(star, count) {
    console.log(`Handling arrival at star ${star.userData.name} with ${count} triangles`);
    console.log(`Star current triangles: ${star.userData.triangles}, isOwned: ${star.userData.isOwned}`);

    if (star.userData.isOwned) {
        star.userData.triangles += count;
        console.log(`Reinforced star. New triangle count: ${star.userData.triangles}`);
        return { remainingTriangles: 0 };
    } else {
        return attemptStarCapture(star, count);
    }
}

export function attemptStarCapture(star, incomingTriangles) {
    console.log(`Attempting to capture star ${star.userData.name}`);
    console.log(`Incoming triangles: ${incomingTriangles}, Star triangles: ${star.userData.triangles}`);

    if (incomingTriangles > star.userData.triangles) {
        const remainingTriangles = incomingTriangles - star.userData.triangles;
        star.userData.triangles = remainingTriangles;
        markStarAsOwned(star);
        console.log(`Capture successful. Remaining triangles: ${remainingTriangles}`);
        return { captured: true, remainingTriangles: remainingTriangles };
    } else {
        star.userData.triangles -= incomingTriangles;
        console.log(`Capture failed. Star triangles left: ${star.userData.triangles}`);
        return { captured: false, remainingTriangles: 0 };
    }
}

export function updateStarLOD(star, camera) {
    const distance = camera.position.distanceTo(star.position);
    const size = STAR_TYPES[getStarType(star)].size;
    
    if (distance > 200) {
        star.scale.setScalar(size / 16);
    } else if (distance > 100) {
        star.scale.setScalar(size / 12);
    } else {
        star.scale.setScalar(1);
    }
}

export function pulsateOwnedStars(ownedStars) {
    const pulsateSpeed = 0.002;
    const minScale = 0.8;
    const maxScale = 1.2;

    ownedStars.forEach(star => {
        if (star.userData.orbitContainer) {
            const circle = star.userData.orbitContainer.children[0];
            circle.scale.x = circle.scale.y = minScale + Math.sin(Date.now() * pulsateSpeed) * (maxScale - minScale) / 2;
        }
    });
}