import json
import pygame
import sys

# Initialize Pygame
pygame.init()

# Set up the display
width, height = 1200, 900
screen = pygame.display.set_mode((width, height))
pygame.display.set_caption("Galaxy Viewer")

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

def load_galaxy(filename):
    with open(filename, 'r') as f:
        galaxy_data = json.load(f)
    galaxy_data['points'] = [tuple(p) for p in galaxy_data['points']]
    galaxy_data['connections'] = [tuple(map(tuple, conn)) for conn in galaxy_data['connections']]
    return galaxy_data

def display_galaxy(galaxy_data):
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

        mouse_x, mouse_y = pygame.mouse.get_pos()
        hovered_star = None

        for i, (point, star_type) in enumerate(zip(galaxy_data['points'], galaxy_data['types'])):
            x = int((point[0] + camera_x) * zoom)
            y = int((point[1] + camera_y) * zoom)
            color = STAR_TYPES[star_type]['color']
            size = STAR_TYPES[star_type]['size']
            pygame.draw.circle(screen, color, (x, y), size)

            # Check if mouse is hovering over the star
            if ((x - mouse_x)**2 + (y - mouse_y)**2)**0.5 < size * 2:
                hovered_star = galaxy_data['star_names'][i]

        # Display number of stars in top left corner
        star_count_text = f"Total Stars: {len(galaxy_data['points'])}"
        star_count_surface = font.render(star_count_text, True, WHITE)
        screen.blit(star_count_surface, (10, 10))

        # Display quadrant and segment information
        grid_x = int((mouse_x / zoom - camera_x) / grid_size)
        grid_y = int((mouse_y / zoom - camera_y) / grid_size)
        quadrant_x = min(max(grid_x // 5, 0), 1)
        quadrant_y = min(max(grid_y // 5, 0), 1)
        quadrant = QUADRANTS[quadrant_y * 2 + quadrant_x]
        segment_x = grid_x % 5
        segment_y = grid_y % 5

        quadrant_text = f"Quadrant: {quadrant}"
        segment_text = f"Segment: ({segment_x}, {segment_y})"
        
        quadrant_surface = font.render(quadrant_text, True, WHITE)
        segment_surface = font.render(segment_text, True, WHITE)
        
        screen.blit(quadrant_surface, (mouse_x + 10, mouse_y + 10))
        screen.blit(segment_surface, (mouse_x + 10, mouse_y + 35))

        # Display hovered star name
        if hovered_star:
            star_name_surface = font.render(hovered_star, True, WHITE)
            screen.blit(star_name_surface, (mouse_x + 10, mouse_y + 60))

        pygame.display.flip()
        clock.tick(60)

    pygame.quit()

if __name__ == "__main__":
    galaxy_data = load_galaxy("galaxy.json")
    display_galaxy(galaxy_data)