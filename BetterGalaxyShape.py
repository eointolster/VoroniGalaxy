import pygame
import random
import scipy.spatial
import numpy as np
import json
import os
from collections import deque
import networkx as nx  # Add this line
import random

# Initialize Pygame
pygame.init()

# Set up the display
width, height = 1200, 900
screen = pygame.display.set_mode((width, height))
pygame.display.set_caption("Galaxy Map Generator")
MAX_CONNECTION_DISTANCE = 100  # Adjust this value as needed

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
BLUE = (0, 0, 255)
GREEN = (0, 255, 0)
YELLOW = (255, 255, 0)

# Star types and their properties
STAR_TYPES = {
    'gigantic': {'color': RED, 'size': 6, 'connections': 7, 'weight': 1},
    'large': {'color': BLUE, 'size': 5, 'connections': 5, 'weight': 2},
    'medium': {'color': GREEN, 'size': 4, 'connections': 3, 'weight': 4},
    'small': {'color': YELLOW, 'size': 3, 'connections': 3, 'weight': 8}
}

# Quadrants
QUADRANTS = ['Alpha', 'Beta', 'Gamma', 'Delta']

# Segment size
SEGMENT_SIZE = 240  # Divide the screen into 5x5 segments

# Total number of stars
TOTAL_STARS = 500000

# Maximum distance for star connections
MAX_CONNECTION_DISTANCE = SEGMENT_SIZE * 1.1


def generate_star_name():
    prefixes = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa"]
    suffixes = ["Prime", "Major", "Minor", "Secundus", "Tertius", "Quartus", "Quintus", "Sextus", "Septimus", "Octavus"]
    numbers = list(range(1, 1001))
    
    prefix = random.choice(prefixes)
    suffix = random.choice(suffixes)
    number = random.choice(numbers)
    
    return f"{prefix} {suffix}-{number}"


def generate_segment(segment_x, segment_y, segment_width, segment_height, stars_per_segment, existing_points):
    seed_points = []
    star_types = []
    min_distance = 5  # Minimum distance between stars

    def generate_point():
        return (random.uniform(segment_x, segment_x + segment_width),
                random.uniform(segment_y, segment_y + segment_height))

    def is_far_enough(point, existing_points):
        return all((point[0] - p[0])**2 + (point[1] - p[1])**2 >= min_distance**2 for p in existing_points)

    attempts = 0
    while len(seed_points) < stars_per_segment and attempts < stars_per_segment * 10:
        new_point = generate_point()
        if is_far_enough(new_point, seed_points) and is_far_enough(new_point, existing_points):
            seed_points.append(new_point)
            
            rand = random.random()
            if rand < 0.0667:  # 1/15
                star_types.append('gigantic')
            elif rand < 0.2:  # 1/5
                star_types.append('large')
            elif rand < 0.4667:  # 1/3
                star_types.append('medium')
            else:
                star_types.append('small')
        attempts += 1

    return seed_points, star_types

def save_galaxy(galaxy_data, filename):
    serializable_data = {
        'points': [list(p) for p in galaxy_data['points']],
        'types': galaxy_data['types'],
        'connections': [list(map(list, conn)) for conn in galaxy_data['connections']],
        'connection_counts': {str(k): v for k, v in galaxy_data['connection_counts'].items()},
        'star_names': galaxy_data['star_names'],
        'lane_details': galaxy_data['lane_details']
    }
    with open(filename, 'w') as f:
        json.dump(serializable_data, f)

def load_galaxy(filename):
    with open(filename, 'r') as f:
        galaxy_data = json.load(f)
        galaxy_data['points'] = [tuple(p) for p in galaxy_data['points']]
        galaxy_data['connections'] = [tuple(map(tuple, conn)) for conn in galaxy_data['connections']]
        galaxy_data['connection_counts'] = {tuple(eval(k)): v for k, v in galaxy_data['connection_counts'].items()}
    return galaxy_data

def within_distance(p1, p2, max_distance):
    return ((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2) <= max_distance**2

def find_connected_components(points, connections):
    graph = {p: set() for p in points}
    for p1, p2 in connections:
        if p1 in graph and p2 in graph:
            graph[p1].add(p2)
            graph[p2].add(p1)
    
    components = []
    visited = set()
    
    for point in points:
        if point not in visited:
            component = set()
            queue = deque([point])
            while queue:
                p = queue.popleft()
                if p not in visited:
                    visited.add(p)
                    component.add(p)
                    queue.extend(graph.get(p, set()) - visited)
            components.append(component)
    
    return components

def is_valid_connection(p1, p2, segment_size):
    seg1 = (int(p1[0] // segment_size), int(p1[1] // segment_size))
    seg2 = (int(p2[0] // segment_size), int(p2[1] // segment_size))
    
    if seg1 == seg2:
        return True
    
    dx = seg2[0] - seg1[0]
    dy = seg2[1] - seg1[1]
    
    if abs(dx) > 1 or abs(dy) > 1:
        return False
    
    if dx != 0:
        x1_rel = p1[0] % segment_size
        x2_rel = p2[0] % segment_size
        if dx > 0 and x1_rel > segment_size / 2 and x2_rel > segment_size / 2:
            return False
        if dx < 0 and x1_rel < segment_size / 2 and x2_rel < segment_size / 2:
            return False
    
    if dy != 0:
        y1_rel = p1[1] % segment_size
        y2_rel = p2[1] % segment_size
        if dy > 0 and y1_rel > segment_size / 2 and y2_rel > segment_size / 2:
            return False
        if dy < 0 and y1_rel < segment_size / 2 and y2_rel < segment_size / 2:
            return False
    
    return True

def line_intersection(line1, line2):
    x1, y1 = line1[0]
    x2, y2 = line1[1]
    x3, y3 = line2[0]
    x4, y4 = line2[1]
    
    denom = (y4-y3)*(x2-x1) - (x4-x3)*(y2-y1)
    if denom == 0:  # lines are parallel
        return False
    
    ua = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / denom
    ub = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / denom
    
    if ua < 0 or ua > 1 or ub < 0 or ub > 1:
        return False
    
    return True

def creates_too_many_intersections(graph, new_edge, max_intersections=3):
    def ccw(A, B, C):
        return (C[1]-A[1]) * (B[0]-A[0]) > (B[1]-A[1]) * (C[0]-A[0])

    def intersect(A, B, C, D):
        return ccw(A,C,D) != ccw(B,C,D) and ccw(A,B,C) != ccw(A,B,D)

    intersections = 0
    for edge in graph.edges():
        if edge != new_edge and intersect(new_edge[0], new_edge[1], edge[0], edge[1]):
            intersections += 1
            if intersections > max_intersections:
                return True
    return False


def post_process_galaxy(galaxy_data):
    points = galaxy_data['points']
    connections = galaxy_data['connections']
    
    # Create a graph
    G = nx.Graph()
    G.add_nodes_from(points)
    
    # Add edges with weights, ensuring both ends have stars
    valid_connections = []
    for p1, p2 in connections:
        if p1 in points and p2 in points:
            distance = ((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)**0.5
            if distance <= MAX_CONNECTION_DISTANCE:
                G.add_edge(p1, p2, weight=distance)
                valid_connections.append((p1, p2))
    
    # Create a minimum spanning tree
    mst = nx.minimum_spanning_tree(G)
    
    # Add back some connections, avoiding too many intersections
    for edge in G.edges(data=True):
        if edge[:2] not in mst.edges():
            if not creates_too_many_intersections(mst, edge[:2]):
                mst.add_edge(edge[0], edge[1], weight=edge[2]['weight'])
    
    # Remove any remaining long connections
    edges_to_remove = [(u, v) for (u, v, d) in mst.edges(data=True) if d['weight'] > MAX_CONNECTION_DISTANCE]
    mst.remove_edges_from(edges_to_remove)
    
    # Ensure all nodes are connected
    largest_cc = max(nx.connected_components(mst), key=len)
    for node in mst.nodes():
        if node not in largest_cc:
            closest_node = min(largest_cc, key=lambda x: ((x[0]-node[0])**2 + (x[1]-node[1])**2)**0.5)
            distance = ((node[0]-closest_node[0])**2 + (node[1]-closest_node[1])**2)**0.5
            if distance <= MAX_CONNECTION_DISTANCE:
                mst.add_edge(node, closest_node, weight=distance)
    
    # Update galaxy data
    galaxy_data['connections'] = list(mst.edges())
    
    return galaxy_data


def generate_galaxy():
    all_points = []
    all_types = []
    all_connections = []
    connection_counts = {}

    # Define the number of segments for each row
    row_segments = [2, 4, 4, 4, 4, 4, 4, 4, 4, 6, 6, 6, 6, 6, 6, 6, 6, 8, 8, 8, 8, 8, 8, 8, 8, 10, 10, 10, 10, 10, 10, 10, 10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 10, 10, 10, 10, 8, 8, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 4, 4, 4, 4, 4, 4, 4, 4, 2]
    total_rows = len(row_segments)
    
    for row, num_segments in enumerate(row_segments):
        segment_width = width / 12  # Always divide the width into 12 parts
        segment_height = height / total_rows
        stars_per_segment = TOTAL_STARS // sum(row_segments)

        start_x = (12 - num_segments) * segment_width / 2  # Center the segments

        for col in range(num_segments):
            segment_x = start_x + col * segment_width
            segment_y = row * segment_height

            seed_points, star_types = generate_segment(segment_x, segment_y, segment_width, segment_height, stars_per_segment, all_points)
            
            points_to_triangulate = seed_points + [p for p in all_points if 
                                                   abs(p[0] - (segment_x + segment_width/2)) <= segment_width*1.5 and
                                                   abs(p[1] - (segment_y + segment_height/2)) <= segment_height*1.5]
            
            if len(points_to_triangulate) > 3:
                delaunay = scipy.spatial.Delaunay(points_to_triangulate)
                
                new_connections = []
                for simplex in delaunay.simplices:
                    for k in range(3):
                        p1 = points_to_triangulate[simplex[k]]
                        p2 = points_to_triangulate[simplex[(k+1)%3]]
                        
                        if p1 in seed_points or p2 in seed_points:
                            t1 = star_types[seed_points.index(p1)] if p1 in seed_points else all_types[all_points.index(p1)]
                            t2 = star_types[seed_points.index(p2)] if p2 in seed_points else all_types[all_points.index(p2)]
                            
                            max_connections1 = STAR_TYPES[t1]['connections']
                            max_connections2 = STAR_TYPES[t2]['connections']
                            
                            if not within_distance(p1, p2, MAX_CONNECTION_DISTANCE):
                                continue
                            
                            if (connection_counts.get(p1, 0) < max_connections1 and
                                connection_counts.get(p2, 0) < max_connections2):
                                
                                keep_chance = min(max_connections1, max_connections2) / 7.0
                                
                                if random.random() < keep_chance:
                                    new_connections.append((p1, p2))
                                    connection_counts[p1] = connection_counts.get(p1, 0) + 1
                                    connection_counts[p2] = connection_counts.get(p2, 0) + 1

                all_connections.extend(new_connections)

            all_points.extend(seed_points)
            all_types.extend(star_types)

            screen.fill(BLACK)
            for conn in all_connections:
                pygame.draw.line(screen, (50, 50, 50), conn[0], conn[1], 1)
            for point, star_type in zip(all_points, all_types):
                color = STAR_TYPES[star_type]['color']
                size = STAR_TYPES[star_type]['size']
                pygame.draw.circle(screen, color, (int(point[0]), int(point[1])), size)

            progress_text = f"Generating segment ({row+1}, {col+1})"
            font = pygame.font.Font(None, 36)
            text_surface = font.render(progress_text, True, WHITE)
            screen.blit(text_surface, (width // 2 - text_surface.get_width() // 2, height - 50))
            pygame.display.flip()

    all_points_set = set(all_points)
    all_connections = [conn for conn in all_connections if conn[0] in all_points_set and conn[1] in all_points_set]

    # Remove lanes with only one star
    valid_connections = []
    for conn in all_connections:
        if conn[0] in all_points_set and conn[1] in all_points_set:
            valid_connections.append(conn)
    all_connections = valid_connections

    components = find_connected_components(all_points, all_connections)
    largest_component = max(components, key=len)
    
    all_points = [p for p in all_points if p in largest_component]
    all_types = [t for p, t in zip(all_points, all_types) if p in largest_component]
    all_connections = [c for c in all_connections if c[0] in largest_component and c[1] in largest_component]
    connection_counts = {p: count for p, count in connection_counts.items() if p in largest_component}

    while len(components) > 1:
        main_component = largest_component
        for component in components:
            if component != main_component:
                p1 = random.choice(list(main_component))
                p2 = min(component, key=lambda p: ((p[0]-p1[0])**2 + (p[1]-p1[1])**2))
                if within_distance(p1, p2, MAX_CONNECTION_DISTANCE) and is_valid_connection(p1, p2, SEGMENT_SIZE):
                    all_connections.append((p1, p2))
                    connection_counts[p1] = connection_counts.get(p1, 0) + 1
                    connection_counts[p2] = connection_counts.get(p2, 0) + 1
        components = find_connected_components(all_points, all_connections)
        largest_component = max(components, key=len)

    galaxy_data = {
        'points': all_points,
        'types': all_types,
        'connections': all_connections,
        'connection_counts': connection_counts
    }

    # Apply post-processing
    galaxy_data = post_process_galaxy(galaxy_data)

    # Update all_points and all_connections after post-processing
    all_points = galaxy_data['points']
    all_connections = galaxy_data['connections']

    valid_points = set(all_points)

    # Filter connections to ensure both endpoints are in valid_points
    valid_connections = [conn for conn in all_connections if conn[0] in valid_points and conn[1] in valid_points]

    star_names = []
    lane_details = []

    # Create a dictionary to map points to their indices
    point_to_index = {tuple(p): i for i, p in enumerate(all_points)}

    for point in all_points:
        star_names.append(generate_star_name())

    for conn in valid_connections:
        start_point = tuple(conn[0])
        end_point = tuple(conn[1])
        start_star = point_to_index[start_point]
        end_star = point_to_index[end_point]
        distance = ((start_point[0] - end_point[0])**2 + (start_point[1] - end_point[1])**2)**0.5
        lane_details.append({
            "start_star": start_star,
            "end_star": end_star,
            "distance": distance
        })

    galaxy_data = {
        'points': all_points,
        'types': [all_types[all_points.index(p)] for p in all_points],
        'connections': valid_connections,
        'connection_counts': {p: connection_counts.get(p, 0) for p in all_points},
        'star_names': star_names,
        'lane_details': lane_details
    }

    save_galaxy(galaxy_data, "galaxy.json")

    print("Galaxy generation complete!")

def display_galaxy():
    galaxy_data = load_galaxy("galaxy.json")
    
    camera_x, camera_y = 0, 0
    zoom = 0.5
    target_zoom = 0.5
    panning = False
    pan_start_x, pan_start_y = 0, 0
    font = pygame.font.Font(None, 24)

    running = True
    clock = pygame.time.Clock()

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 2:  # Middle mouse button
                    panning = True
                    pan_start_x, pan_start_y = event.pos
            elif event.type == pygame.MOUSEBUTTONUP:
                if event.button == 2:  # Middle mouse button
                    panning = False
            elif event.type == pygame.MOUSEMOTION:
                if panning:
                    dx, dy = event.pos[0] - pan_start_x, event.pos[1] - pan_start_y
                    camera_x -= dx / zoom
                    camera_y -= dy / zoom
                    pan_start_x, pan_start_y = event.pos
            elif event.type == pygame.MOUSEWHEEL:
                target_zoom *= 1.1 ** event.y

        zoom += (target_zoom - zoom) * 0.1

        screen.fill(BLACK)

        grid_size = 100
        for x in range(0, width * 2, grid_size):
            pygame.draw.line(screen, (30, 30, 30), 
                             (int((x + camera_x) * zoom), 0), 
                             (int((x + camera_x) * zoom), height))
        for y in range(0, height * 2, grid_size):
            pygame.draw.line(screen, (30, 30, 30), 
                             (0, int((y + camera_y) * zoom)), 
                             (width, int((y + camera_y) * zoom)))

        for p1, p2 in galaxy_data['connections']:
            x1, y1 = int((p1[0] + camera_x) * zoom), int((p1[1] + camera_y) * zoom)
            x2, y2 = int((p2[0] + camera_x) * zoom), int((p2[1] + camera_y) * zoom)
            pygame.draw.line(screen, (50, 50, 50), (x1, y1), (x2, y2), 1)

        for point, star_type in zip(galaxy_data['points'], galaxy_data['types']):
            x = int((point[0] + camera_x) * zoom)
            y = int((point[1] + camera_y) * zoom)
            color = STAR_TYPES[star_type]['color']
            size = STAR_TYPES[star_type]['size']
            pygame.draw.circle(screen, color, (x, y), size)
            mouse_x, mouse_y = pygame.mouse.get_pos()
        grid_x = int((mouse_x / zoom - camera_x) / grid_size)
        grid_y = int((mouse_y / zoom - camera_y) / grid_size)
        quadrant_x = min(max(grid_x // 5, 0), 1)
        quadrant_y = min(max(grid_y // 5, 0), 1)
        quadrant = QUADRANTS[quadrant_y * 2 + quadrant_x]
        segment_x = grid_x % 5
        segment_y = grid_y % 5

        coord_text = f"{quadrant} Quadrant, Segment ({segment_x}, {segment_y})"
        text_surface = font.render(coord_text, True, WHITE)
        screen.blit(text_surface, (mouse_x + 10, mouse_y + 10))

        pygame.display.flip()
        clock.tick(60)

    pygame.quit()

# Run the generation and display
if __name__ == "__main__":
    generate_galaxy()
    display_galaxy()