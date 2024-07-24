import * as THREE from 'three';
import { createStars, createConnections, getStarType, STAR_TYPES, STAR_LIMITS, BLOOM_LAYER } from './galaxy.js';

let galaxyData;
let stars;
let ownedStars = [];

export function loadGalaxyData(scene, callback) {
    fetch('galaxy.json')
        .then(response => response.json())
        .then(data => {
            galaxyData = data;
            if (data.points && data.points.length > 0) {
                stars = createStars(data);  // Remove scene parameter
                scene.add(stars);  // Add this line to add stars to the scene
                createConnections(data, scene);
                updateStarCount(data.points.length);
                markInitialStar();
                if (callback) callback();
            } else {
                console.error("Galaxy data is empty or invalid");
            }
        })
        .catch(error => console.error("Error loading galaxy data:", error));
}

export function markInitialStar() {
    if (stars && stars.children.length > 0) {
        const initialStar = stars.children[0];
        markStarAsOwned(initialStar);
        console.log("Marked initial star as owned:", initialStar.userData.name);
    } else {
        console.log("No stars available to mark as initial");
    }
}

export function markStarAsOwned(star) {
    if (!star.userData.isOwned) {
        ownedStars.push(star);
        
        const orbitContainer = new THREE.Object3D();
        star.add(orbitContainer);

        const circleGeometry = new THREE.RingGeometry(star.geometry.parameters.radius * 2, star.geometry.parameters.radius * 2.2, 32);
        const circleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
        const circle = new THREE.Mesh(circleGeometry, circleMaterial);
        
        circle.position.set(0, 0, 0);
        orbitContainer.add(circle);

        star.userData.isOwned = true;
        star.userData.triangles = Math.floor(STAR_LIMITS[getStarType(star)] / 2);
        star.userData.orbitContainer = orbitContainer;
        updateOwnedStarCount();
        console.log(`Star ${star.userData.name} has been marked as owned`);
    }
}

export function findPath(fromStar, toStar, data) {
    const connections = data.connections;
    const visited = new Set();
    const queue = [[fromStar.position]];
    
    while (queue.length > 0) {
        const path = queue.shift();
        const currentPos = path[path.length - 1];
        
        if (currentPos.equals(toStar.position)) {
            return path;
        }
        
        for (const connection of connections) {
            const [start, end] = connection;
            const startVec = new THREE.Vector3(start[0], start[1], 0);
            const endVec = new THREE.Vector3(end[0], end[1], 0);
            
            if (currentPos.equals(startVec) && !visited.has(endVec.toArray().toString())) {
                visited.add(endVec.toArray().toString());
                queue.push([...path, endVec]);
            } else if (currentPos.equals(endVec) && !visited.has(startVec.toArray().toString())) {
                visited.add(startVec.toArray().toString());
                queue.push([...path, startVec]);
            }
        }
    }
    
    return null;
}

function updateStarCount(count) {
    const starCountElement = document.getElementById('starCount');
    if (starCountElement) {
        starCountElement.textContent = `Total Stars: ${count}`;
    }
}

function updateOwnedStarCount() {
    const ownedStarCountElement = document.getElementById('ownedStarCount');
    if (ownedStarCountElement) {
        ownedStarCountElement.textContent = `Owned Stars: ${ownedStars.length}`;
    }
}

export function findStarAtPosition(position) {
    return stars.children.find(star => star.position.equals(position));
}

export { stars, ownedStars, galaxyData };