// selection.js

import * as THREE from 'three';

let scene, camera, renderer;
let selectionBox;
let startPoint, endPoint;
let isSelecting = false;
let selectedStars = [];

export function initSelection(_scene, _camera, _renderer) {
    scene = _scene;
    camera = _camera;
    renderer = _renderer;

    // Create a 2D selection box
    selectionBox = document.createElement('div');
    selectionBox.style.position = 'absolute';
    selectionBox.style.border = '2px solid white';
    selectionBox.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    selectionBox.style.pointerEvents = 'none';
    selectionBox.style.display = 'none';
    renderer.domElement.parentElement.appendChild(selectionBox);

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
}

function onMouseDown(event) {
    if (event.button === 0) { // Left mouse button
        startPoint = { x: event.clientX, y: event.clientY };
        isSelecting = true;
        updateSelectionBox(event);
        selectionBox.style.display = 'block';
    }
}

function onMouseMove(event) {
    if (isSelecting) {
        updateSelectionBox(event);
    }
}

function onMouseUp(event) {
    if (event.button === 0 && isSelecting) {
        endPoint = { x: event.clientX, y: event.clientY };
        isSelecting = false;
        selectionBox.style.display = 'none';
        selectStars();
    }
}

function updateSelectionBox(event) {
    const currentPoint = { x: event.clientX, y: event.clientY };
    const rect = renderer.domElement.getBoundingClientRect();

    const left = Math.min(startPoint.x, currentPoint.x) - rect.left;
    const top = Math.min(startPoint.y, currentPoint.y) - rect.top;
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
}

function selectStars() {
    const rect = renderer.domElement.getBoundingClientRect();
    const min = {
        x: Math.min(startPoint.x, endPoint.x) - rect.left,
        y: Math.min(startPoint.y, endPoint.y) - rect.top
    };
    const max = {
        x: Math.max(startPoint.x, endPoint.x) - rect.left,
        y: Math.max(startPoint.y, endPoint.y) - rect.top
    };

    selectedStars = [];
    scene.traverse((object) => {
        if (object.userData && object.userData.isStar && object.userData.isOwned) {
            const screenPosition = object.position.clone().project(camera);
            const x = (screenPosition.x + 1) * rect.width / 2;
            const y = (-screenPosition.y + 1) * rect.height / 2;
            if (x >= min.x && x <= max.x && y >= min.y && y <= max.y) {
                selectedStars.push(object);
                object.userData.selected = true;
                updateStarAppearance(object);
            } else if (object.userData.selected) {
                object.userData.selected = false;
                updateStarAppearance(object);
            }
        }
    });

    console.log(`Selected ${selectedStars.length} stars`);
}

export function deselectAllStars() {
    selectedStars.forEach(star => {
        star.userData.selected = false;
        updateStarAppearance(star);
    });
    selectedStars = [];
}

function updateStarAppearance(star) {
    if (star.userData.selected) {
        star.material.emissive.setHex(0xff0000);
        star.scale.setScalar(1.2);
    } else {
        star.material.emissive.setHex(0x000000);
        star.scale.setScalar(1);
    }
}

export function getSelectedStars() {
    return selectedStars;
}

export function isCurrentlySelecting() {
    return isSelecting;
}

