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

class BoundStep(BaseModel):
    bound: float
    step: float

@app.post("/points")
async def getPoints(boundingVal: BoundStep):
    bound = boundingVal.bound
    step = boundingVal.step
    points = getValues(bound, step)
    return JSONResponse(content={"points": points})

def safe_function_calc(func, X, Y):
    try:
        result = func(X, Y)
        return result
    except (ValueError, ZeroDivisionError, TypeError):
        return None

def functionCalc(x, y):
    return math.cos(x**2 + y**2)
    # return x**2 + y**2

def getValues(bound, setStep):
    points = []
    step = setStep
    x = -bound
    while x <= bound:
        y = -bound
        while y <= bound:
            z = safe_function_calc(functionCalc, x, y)
            if z is not None:
                points.append((x, y, z))
            y += step
        x += step
    return points

if __name__ == "__main__":
    # Testing code
    points = getValues(2, 0.5)
    if points:
        print(points[0])
        x, y, z = points[0]
