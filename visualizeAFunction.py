import math
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Tuple

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/points")
async def getPoints():
    points = getValues()
    return JSONResponse(content={"points": points})


# defines the function
def functionCalc (X, Y):
    return math.sin(X**2 + Y**2)

# gets the points to be displayed
def getValues():
    points = []
    step = 0.1

    x = -2.5
    while x <= 2.5:
        y = -2.5
        while y <= 2.5:
            z = functionCalc(x, y)
            points.append((x, y, z))
            y += step
        x += step
    return points

#performs an x rotation
def rotation(x, y, z, type, theta):
    vector = [x, y, z]
    sin = math.sin(theta)
    cos = math.cos(theta)
    Rx = [
        [1, 0, 0],
        [0, cos, -sin],
        [0, sin, cos]
    ]

    Ry = [
        [cos, 0, sin],
        [0, 1, 0],
        [-sin, 0, cos]
    ]

    Rz = [
        [cos, -sin, 0],
        [sin, cos, 0],
        [0, 0, 1]
    ]

    # applies the rotation to the current x, y, z vector
    if (type == 'x'):
        rotated_vector = [0, 0, 0]
        for i in range(3):
            for j in range(3):
                rotated_vector[i] += (vector[j] * Rx[i][j])
    elif (type == 'y'):
        rotated_vector = [0, 0, 0]
        for i in range(3):
            for j in range(3):
                rotated_vector[i] += (vector[j] * Ry[i][j])
    else:
        rotated_vector = [0, 0, 0]
        for i in range(3):
            for j in range(3):
                rotated_vector[i] += (vector[j] * Rz[i][j])

    
    return rotated_vector

points = getValues()
print(points[0])
x, y, z = points[0]


class Rotation(BaseModel):
    type: str
    newPoints: List[Tuple[float, float, float]]
    theta: float

@app.post("/rotate_points")
async def getRotatedPoints (rotate: Rotation):
    type = rotate.type
    points = rotate.newPoints
    theta = rotate.theta
    rotated_points = [rotation(x, y, z, type, theta) for x, y, z in points]
    return JSONResponse(content={"rotatedPoints": rotated_points})

# # Initialize pygame
# pygame.init()
# screen = pygame.display.set_mode((800, 600))
# screen.fill((0, 0, 0))
# running = True

# # Map points to screen coordinates
# def map_to_screen(point):
#     x, y, z = point
#     screen_x = int(400 + x * 100)  # Scale and center
#     screen_y = int(300 - y * 100)  # Invert Y for screen coordinates
#     return screen_x, screen_y

# # Draw points
# # This part of the code is iterating over each point in the `points` list, mapping each point's coordinates to screen coordinates
# # using the `map_to_screen` function, and then drawing a small circle (pixel) on the pygame screen at those screen coordinates. The
# # circles are drawn in green color with a radius of 2 pixels. This allows you to visualize the points of the function on the pygame
# # screen.
# for p in points:
#     screen_x, screen_y = map_to_screen(p)
#     pygame.draw.circle(screen, (0, 255, 0), (screen_x, screen_y), 2)
# # for p in rotated_points:
# #     screen_x, screen_y = map_to_screen(p)
# #     pygame.draw.circle(screen, (0, 255, 0), (screen_x, screen_y), 2)

# pygame.display.flip()

# # Wait until window is closed
# while running:
#     for event in pygame.event.get():
#         if event.type == pygame.QUIT:
#             running = False

# pygame.quit()
