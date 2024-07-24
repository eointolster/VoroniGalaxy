
import * as THREE from 'three';

export const STAR_TYPES = {
    'gigantic': { color: 0xff5500, size: 6, emissiveIntensity: 1.5 },
    'large': { color: 0x229933, size: 5, emissiveIntensity: 1.3 },
    'medium': { color: 0xff2222, size: 4, emissiveIntensity: 1.6 },
    'small': { color: 0x00aaff, size: 3, emissiveIntensity: 2 }
};

export const STAR_LIMITS = {
    'small': 30,
    'medium': 50,
    'large': 80,
    'gigantic': 100
};

export const BLOOM_LAYER = 1;

export function createStars(data, scene) {
    const stars = new THREE.Group();
    
    data.points.forEach((point, index) => {
        const starType = data.types[index];
        const starGeometry = new THREE.SphereGeometry(STAR_TYPES[starType].size / 8, 32, 32);
        const starMaterial = new THREE.MeshPhongMaterial({
            color: STAR_TYPES[starType].color,
            emissive: STAR_TYPES[starType].color,
            emissiveIntensity: STAR_TYPES[starType].emissiveIntensity,
            shininess: 100,
            specular: new THREE.Color(0xffffff)
        });
        const star = new THREE.Mesh(starGeometry, starMaterial);
        star.userData.isStar = true;
        star.layers.enable(1);
        star.position.set(point[0], point[1], 0);
        star.userData.name = data.star_names[index];
        star.userData.bloomEnabled = true;
        star.userData.triangles = STAR_LIMITS[getStarType(star)];
        star.userData.isOwned = false;
        star.layers.enable(BLOOM_LAYER);
        stars.add(star);
    });
    //scene.add(stars);
    return stars;
}

export function createConnections(data, scene) {
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

export function getStarType(star) {
    const size = star.geometry.parameters.radius * 8;
    if (size === STAR_TYPES.small.size) return 'small';
    if (size === STAR_TYPES.medium.size) return 'medium';
    if (size === STAR_TYPES.large.size) return 'large';
    if (size === STAR_TYPES.gigantic.size) return 'gigantic';
    return 'small';
}
