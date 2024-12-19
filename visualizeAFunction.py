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


def safe_function_calc(func, X, Y):
    try:
        # Check if the function is defined for the given inputs
        result = func(X, Y)
        return result
    except (ValueError, ZeroDivisionError, TypeError) as e:
        # Handle known errors such as math errors (like log of negative number)
        return None  # Or you can return a default value like float('nan')

# Example of a custom function (can be modified in the future)
def functionCalc(x, y):
    # This is just a placeholder for whatever function you want to use
    return math.e**x  # Logarithm, which works only for X > 0

# gets the points to be displayed
def getValues():
    points = []
    step = 0.2

    x = -3
    while x <= 3:
        y = -3
        while y <= 3:
            z = safe_function_calc(functionCalc, x, y)
            if (z is not None):
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
