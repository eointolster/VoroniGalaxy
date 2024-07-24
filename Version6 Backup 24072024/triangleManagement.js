import * as THREE from 'three';
import { findPath, findStarAtPosition, galaxyData } from './galaxyCreation.js';
import { attemptStarCapture, handleTriangleArrival } from './starManagement.js';

let scene, camera;
let movingTriangles = [];

export function initTriangleManagement(_scene, _camera) {
    scene = _scene;
    camera = _camera;
}

export function sendTrianglesFromMultipleStars(fromStars, toStar) {
    fromStars.forEach(fromStar => {
        if (fromStar.userData.isOwned && fromStar !== toStar) {
            const trianglesToSend = Math.floor(fromStar.userData.triangles / 2);
            fromStar.userData.triangles -= trianglesToSend;
            console.log(`Sending ${trianglesToSend} triangles from ${fromStar.userData.name} to ${toStar.userData.name}`);
            animateTriangles(fromStar, toStar, trianglesToSend, findPath(fromStar, toStar, galaxyData));
        }
    });
}

export function sendTriangles(fromStar, toStar) {
    const path = findPath(fromStar, toStar, galaxyData);
    if (!path) {
        console.log("No valid path found between stars");
        return;
    }

    const trianglesToSend = Math.floor(fromStar.userData.triangles / 2);
    fromStar.userData.triangles -= trianglesToSend;
    
    console.log(`Sending ${trianglesToSend} triangles from ${fromStar.userData.name} (${fromStar.userData.triangles} left) to ${toStar.userData.name} (currently ${toStar.userData.triangles})`);
    
    animateTriangles(fromStar, toStar, trianglesToSend, path);
}

function createSpaceshipSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 96;  // Increased height to accommodate longer flames
    const ctx = canvas.getContext('2d');
    
    // Draw spaceship body
    ctx.fillStyle = '#4A90E2';
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(64, 48);
    ctx.lineTo(48, 64);
    ctx.lineTo(16, 64);
    ctx.lineTo(0, 48);
    ctx.closePath();
    ctx.fill();

    // Draw cockpit (now yellow)
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.arc(32, 24, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw bigger, longer flames
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.moveTo(16, 64);
    ctx.lineTo(32, 96);  // Extended to bottom of canvas
    ctx.lineTo(48, 64);
    ctx.closePath();
    ctx.fill();

    // Add orange inner flames for more detail
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(24, 64);
    ctx.lineTo(32, 88);
    ctx.lineTo(40, 64);
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    return new THREE.Sprite(material);
}

function animateTriangles(fromStar, toStar, count, path) {
    console.log("Animating triangles:", count, "Path:", path);

    const spread = 2;

    for (let i = 0; i < count; i++) {
        const spaceship = createSpaceshipSprite();
        
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread
        );
        spaceship.position.copy(fromStar.position).add(offset);
        
        spaceship.scale.set(.5, .5, .5);
        scene.add(spaceship);

        movingTriangles.push({
            mesh: spaceship,
            path: path,
            currentSegment: 0,
            progress: 0,
            speed: 0.002 + Math.random() * 0.002,
            toStar: toStar,
            count: 1
        });
    }
}

export function updateMovingTriangles() {
    const cohesionFactor = 0.005;
    const separationFactor = 0.05;
    const alignmentFactor = 0.01;
    const maxSpeed = 0.1;
    const neighborhoodRadius = 5;

    movingTriangles = movingTriangles.filter(group => {
        if (!group.path || group.currentSegment >= group.path.length - 1) {
            scene.remove(group.mesh);
            return false;
        }

        const neighbors = movingTriangles.filter(t => {
            if (t === group) return false;
            const distance = t.mesh.position.distanceTo(group.mesh.position);
            const direction = t.mesh.position.clone().sub(group.mesh.position).normalize();
            const dot = direction.dot(group.velocity ? group.velocity.clone().normalize() : new THREE.Vector3(0, 1, 0));
            return distance < neighborhoodRadius && dot < 0.5; // Only consider neighbors behind or to the side
        });

        const cohesion = new THREE.Vector3();
        if (neighbors.length > 0) {
            neighbors.forEach(n => cohesion.add(n.mesh.position));
            cohesion.divideScalar(neighbors.length).sub(group.mesh.position).normalize().multiplyScalar(cohesionFactor);
        }

        const separation = new THREE.Vector3();
        neighbors.forEach(n => {
            const diff = group.mesh.position.clone().sub(n.mesh.position);
            separation.add(diff.normalize().divideScalar(diff.length()));
        });
        separation.normalize().multiplyScalar(separationFactor);

        const alignment = new THREE.Vector3();
        if (neighbors.length > 0) {
            neighbors.forEach(n => alignment.add(n.mesh.position.clone().sub(n.path[n.currentSegment]).normalize()));
            alignment.divideScalar(neighbors.length).normalize().multiplyScalar(alignmentFactor);
        }

        const desiredVelocity = new THREE.Vector3().addVectors(cohesion, separation).add(alignment);
        desiredVelocity.clampLength(0, maxSpeed);

        const steering = desiredVelocity.sub(group.velocity || new THREE.Vector3());
        steering.clampLength(0, maxSpeed);

        group.velocity = group.velocity || new THREE.Vector3();
        group.velocity.add(steering);
        group.velocity.clampLength(0, maxSpeed);
        group.mesh.position.add(group.velocity);
        
        group.progress += group.speed;
        if (group.progress >= 1) {
            const nextStarPosition = group.path[group.currentSegment + 1];
            const nextStar = findStarAtPosition(nextStarPosition);
            
            if (nextStar) {
                if (!nextStar.userData.isOwned) {
                    const result = attemptStarCapture(nextStar, group.count);
                    if (result.captured) {
                        console.log(`Captured star: ${nextStar.userData.name}`);
                        group.count = result.remainingTriangles;
                    } else {
                        console.log(`Failed to capture star: ${nextStar.userData.name}`);
                        scene.remove(group.mesh);
                        return false;
                    }
                } else if (nextStar.userData.isOwned && nextStar !== group.toStar) {
                    console.log(`Passing through owned star: ${nextStar.userData.name}`);
                }
            }

            group.currentSegment++;
            group.progress = 0;

            if (group.currentSegment >= group.path.length - 1) {
                if (group.toStar) {
                    handleTriangleArrival(group.toStar, group.count);
                }
                scene.remove(group.mesh);
                return false;
            }
        }

        const start = group.path[group.currentSegment];
        const end = group.path[group.currentSegment + 1];
        
        if (start && end) {
            const targetPosition = new THREE.Vector3().lerpVectors(start, end, group.progress);
            group.mesh.position.add(cohesion).add(separation).add(alignment);
            group.mesh.position.lerp(targetPosition, 0.1);

            const direction = new THREE.Vector3().subVectors(end, start).normalize();
            const angle = Math.atan2(direction.y, direction.x);
            group.mesh.material.rotation = angle - Math.PI / 2;
        }

        return true;
    });
}
