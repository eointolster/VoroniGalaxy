import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
let galaxyData;
let scene, camera, renderer, stars, raycaster, mouse, composer, clock;
let ownedStars = [];
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, moveUp = false, moveDown = false;
let selectedStar = null;
let movingTriangles = [];

const STAR_TYPES = {
    'gigantic': { color: 0xff0000, size: 6 },
    'large': { color: 0x0000ff, size: 5 },
    'medium': { color: 0x00ff00, size: 4 },
    'small': { color: 0xffff00, size: 3 }
};

const STAR_LIMITS = {
    'small': 30,
    'medium': 50,
    'large': 80,
    'gigantic': 100
};

const GROWTH_RATE = .5; // Triangles per second for owned stars
const DECAY_RATE = 2; // Triangles per second for overfilled stars

const QUADRANTS = ['Alpha', 'Beta', 'Gamma', 'Delta'];
const SEGMENT_SIZE = 100;
const BLOOM_LAYER = 1;

function init() {
    setupScene();
    setupLights();
    setupBloom();
    loadGalaxyData();
    setupEventListeners();
    clock = new THREE.Clock();
    if (stars && stars.children.length > 0) {
        markStarAsOwned(stars.children[0]);
    }
}

function setupScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('galaxyCanvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
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

function loadGalaxyData() {
    fetch('galaxy.json')
        .then(response => response.json())
        .then(data => {
            galaxyData = data;
            if (data.points && data.points.length > 0) {
                createStars(data);
                createConnections(data);
                updateStarCount(data.points.length);
                markInitialStar(); // Add this line
                zoomToInitialOwnedStar();
                animate();
            } else {
                console.error("Galaxy data is empty or invalid");
            }
        })
        .catch(error => console.error("Error loading galaxy data:", error));
}

function createStars(data) {
    stars = new THREE.Group();
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
        star.userData.triangles = STAR_LIMITS[getStarType(star)]; // Set initial triangles to the star's limit
        star.userData.isOwned = false;
        star.layers.enable(BLOOM_LAYER);
        stars.add(star);
    });
    scene.add(stars);
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

function markStarAsOwned(star) {
    if (!star.userData.isOwned) {
        ownedStars.push(star);
        
        // Create a container for the orbiting circle
        const orbitContainer = new THREE.Object3D();
        star.add(orbitContainer);

        const circleGeometry = new THREE.RingGeometry(star.geometry.parameters.radius * 2, star.geometry.parameters.radius * 2.2, 32);
        const circleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
        const circle = new THREE.Mesh(circleGeometry, circleMaterial);
        
        // Position the circle at an offset from the center
        circle.position.set(0, 0, 0);
        // Add the circle to the orbit container
        orbitContainer.add(circle);

        star.userData.isOwned = true;
        star.userData.triangles = Math.floor(STAR_LIMITS[getStarType(star)] / 2); // Start with half the maximum
        star.userData.orbitContainer = orbitContainer;
        updateOwnedStarCount();
        console.log(`Star ${star.userData.name} has been marked as owned`);
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

function animate() {
    requestAnimationFrame(animate);
    updateCamera();
    updateStars();
    updateMovingTriangles();
    pulsateCircles(); // Add this line
    composer.render();
}

function pulsateCircles() {
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

function updateCamera() {
    const speed = 0.5;
    const direction = new THREE.Vector3();
    const sideDirection = new THREE.Vector3();

    direction.set(0, 0, -1).applyQuaternion(camera.quaternion);
    sideDirection.set(1, 0, 0).applyQuaternion(camera.quaternion);

    if (moveForward) camera.position.addScaledVector(direction, speed);
    if (moveBackward) camera.position.addScaledVector(direction, -speed);
    if (moveLeft) camera.position.addScaledVector(sideDirection, -speed);
    if (moveRight) camera.position.addScaledVector(sideDirection, speed);
    if (moveUp) camera.position.y += speed;
    if (moveDown) camera.position.y -= speed;

    updateInfo();
}

function updateStars() {
    const delta = clock.getDelta();
    stars.children.forEach(star => {
        updateStarTriangles(star, delta);
    });
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

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('wheel', onMouseWheel);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    setupNavigation();
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
    composer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'KeyQ': moveUp = true; break;
        case 'KeyE': moveDown = true; break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
        case 'KeyQ': moveUp = false; break;
        case 'KeyE': moveDown = false; break;
    }
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
            starNameElement.textContent = `Star: ${star.userData.name} (Triangles: ${Math.floor(star.userData.triangles)})`;
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

function onMouseDown(event) {
    if (event.button === 0) { // Left mouse button
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(stars.children);
        if (intersects.length > 0) {
            const clickedStar = intersects[0].object;
            console.log("Clicked star:", clickedStar.userData.name, "Is owned:", clickedStar.userData.isOwned);
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
    }
}

function markInitialStar() {
    if (stars && stars.children.length > 0) {
        const initialStar = stars.children[0];
        markStarAsOwned(initialStar);
        console.log("Marked initial star as owned:", initialStar.userData.name);
    } else {
        console.log("No stars available to mark as initial");
    }
}

function sendTriangles(fromStar, toStar) {
    const path = findPath(fromStar, toStar, galaxyData);
    if (!path) {
        console.log("No valid path found between stars");
        return;
    }

    const trianglesToSend = Math.floor(fromStar.userData.triangles / 2);
    fromStar.userData.triangles -= trianglesToSend;
    
    animateTriangles(fromStar, toStar, trianglesToSend, path);

    console.log(`Sending ${trianglesToSend} triangles from ${fromStar.userData.name} to ${toStar.userData.name}`);
    selectedStar = null;
}

function createSpaceshipSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#4A90E2';
    ctx.beginPath();
    ctx.moveTo(16, 0);  // Top point
    ctx.lineTo(32, 32); // Bottom right
    ctx.lineTo(16, 24); // Bottom middle
    ctx.lineTo(0, 32);  // Bottom left
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    return new THREE.Sprite(material);
}

function animateTriangles(fromStar, toStar, count, path) {
    console.log("Animating triangles:", count, "Path:", path);

    const spread = 2; // Adjust this value to change the spread

    for (let i = 0; i < count; i++) {
        const spaceship = createSpaceshipSprite();
        
        // Add random offset to initial position
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread
        );
        spaceship.position.copy(fromStar.position).add(offset);
        
        spaceship.scale.set(1, 1, 1); // Adjust scale as needed
        scene.add(spaceship);

        movingTriangles.push({
            mesh: spaceship,
            path: path,
            currentSegment: 0,
            progress: 0,
            speed: 0.002 + Math.random() * 0.002,
            toStar: toStar,
            count: count
        });
    }
}

// function createSpaceshipSprite() {
//     const canvas = document.createElement('canvas');
//     canvas.width = 64;
//     canvas.height = 64;
//     const ctx = canvas.getContext('2d');
    
//     // Main body
//     ctx.fillStyle = '#4A90E2';
//     ctx.beginPath();
//     ctx.moveTo(32, 5);
//     ctx.lineTo(50, 45);
//     ctx.lineTo(32, 55);
//     ctx.lineTo(14, 45);
//     ctx.closePath();
//     ctx.fill();

//     // Cockpit
//     ctx.fillStyle = '#81C784';
//     ctx.beginPath();
//     ctx.ellipse(32, 25, 8, 12, 0, 0, Math.PI * 2);
//     ctx.fill();

//     // Wings
//     ctx.fillStyle = '#FF5252';
//     ctx.beginPath();
//     ctx.moveTo(14, 45);
//     ctx.lineTo(0, 55);
//     ctx.lineTo(14, 50);
//     ctx.closePath();
//     ctx.fill();

//     ctx.beginPath();
//     ctx.moveTo(50, 45);
//     ctx.lineTo(64, 55);
//     ctx.lineTo(50, 50);
//     ctx.closePath();
//     ctx.fill();

//     // Engine
//     ctx.fillStyle = '#FFA000';
//     ctx.beginPath();
//     ctx.moveTo(26, 55);
//     ctx.lineTo(38, 55);
//     ctx.lineTo(32, 64);
//     ctx.closePath();
//     ctx.fill();

//     // Outline
//     ctx.strokeStyle = '#000000';
//     ctx.lineWidth = 2;
//     ctx.stroke();

//     const texture = new THREE.CanvasTexture(canvas);
//     const material = new THREE.SpriteMaterial({ map: texture });
//     return new THREE.Sprite(material);
// }

// function animateTriangles(fromStar, toStar, count, path) {
//     console.log("Animating triangles:", count, "Path:", path);

//     for (let i = 0; i < count; i++) {
//         const spaceship = createSpaceshipSprite();
//         spaceship.position.copy(fromStar.position);
//         spaceship.scale.set(.2, .2, .1); // Adjust scale as needed
//         scene.add(spaceship);

//         movingTriangles.push({
//             mesh: spaceship,
//             path: path,
//             currentSegment: 0,
//             progress: 0,
//             speed: 0.002 + Math.random() * 0.002,
//             toStar: toStar,
//             count: count
//         });
//     }
// }


function updateMovingTriangles() {
    const delta = clock.getDelta();
    const cohesionFactor = 0.005;
    const separationFactor = 0.01;
    const alignmentFactor = 0.005;

    movingTriangles = movingTriangles.filter(triangle => {
        if (!triangle.path || triangle.currentSegment >= triangle.path.length - 1) {
            scene.remove(triangle.mesh);
            if (triangle.toStar) {
                handleTriangleArrival(triangle.toStar, 1);
            }
            return false;
        }

        // Apply flocking behavior
        const neighbors = movingTriangles.filter(t => t !== triangle && t.mesh.position.distanceTo(triangle.mesh.position) < 5);
        
        // Cohesion
        const cohesion = new THREE.Vector3();
        neighbors.forEach(n => cohesion.add(n.mesh.position));
        if (neighbors.length > 0) {
            cohesion.divideScalar(neighbors.length).sub(triangle.mesh.position).multiplyScalar(cohesionFactor);
        }

        // Separation
        const separation = new THREE.Vector3();
        neighbors.forEach(n => {
            const diff = triangle.mesh.position.clone().sub(n.mesh.position);
            separation.add(diff.normalize().divideScalar(diff.length()));
        });
        separation.multiplyScalar(separationFactor);

        // Alignment
        const alignment = new THREE.Vector3();
        neighbors.forEach(n => alignment.add(n.mesh.position.clone().sub(n.path[n.currentSegment]).normalize()));
        if (neighbors.length > 0) {
            alignment.divideScalar(neighbors.length).multiplyScalar(alignmentFactor);
        }

        // Update position
        triangle.progress += triangle.speed;
        if (triangle.progress >= 1) {
            triangle.currentSegment++;
            triangle.progress = 0;
        }

        const start = triangle.path[triangle.currentSegment];
        const end = triangle.path[triangle.currentSegment + 1];
        
        if (start && end) {
            const targetPosition = new THREE.Vector3().lerpVectors(start, end, triangle.progress);
            triangle.mesh.position.add(cohesion).add(separation).add(alignment);
            triangle.mesh.position.lerp(targetPosition, 0.1);

            // Orient the sprite towards the direction of movement
            const direction = new THREE.Vector3().subVectors(end, start).normalize();
            const angle = Math.atan2(direction.y, direction.x);
            triangle.mesh.material.rotation = angle - Math.PI / 2;
        }

        return true;
    });

    // Update star triangle counts
    stars.children.forEach(star => {
        updateStarTriangles(star, delta);
    });
}


function attemptStarCapture(star, incomingTriangles) {
    if (!star.userData.isOwned) {
        star.userData.triangles = Math.max(star.userData.triangles - incomingTriangles, 0);
        if (star.userData.triangles === 0) {
            return { captured: true, remainingTriangles: incomingTriangles };
        }
        return { captured: false, remainingTriangles: 0 };
    } else {
        star.userData.triangles = Math.min(star.userData.triangles + incomingTriangles, STAR_LIMITS[getStarType(star)]);
        return { captured: false, remainingTriangles: 0 };
    }
}

function handleTriangleArrival(star, count) {
    if (star.userData.isOwned) {
        star.userData.triangles = Math.min(star.userData.triangles + count, STAR_LIMITS[getStarType(star)]);
    } else {
        const captureResult = attemptStarCapture(star, count);
        if (captureResult.captured) {
            markStarAsOwned(star);
            star.userData.triangles = captureResult.remainingTriangles;
        }
    }
    console.log(`Star ${star.userData.name} now has ${star.userData.triangles} triangles`);
}

function updateStarTriangles(star, delta) {
    const limit = STAR_LIMITS[getStarType(star)];
    if (star.userData.isOwned) {
        star.userData.triangles = Math.min(star.userData.triangles + GROWTH_RATE * delta, limit);
    } else {
        // Non-player owned stars should grow more slowly
        star.userData.triangles = Math.min(star.userData.triangles + GROWTH_RATE * 0.2 * delta, limit);
    }
}

function getStarType(star) {
    const size = star.geometry.parameters.radius * 8;
    if (size === STAR_TYPES.small.size) return 'small';
    if (size === STAR_TYPES.medium.size) return 'medium';
    if (size === STAR_TYPES.large.size) return 'large';
    if (size === STAR_TYPES.gigantic.size) return 'gigantic';
    return 'small'; // Default to small if unknown
}

function findStarAtPosition(position) {
    return stars.children.find(star => star.position.equals(position));
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

function findPath(fromStar, toStar, data) {
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
    
    return null; // No path found
}

document.addEventListener('DOMContentLoaded', init);

