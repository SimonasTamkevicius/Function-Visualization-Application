import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { throttle } from 'lodash';
import ColourPicker from './ColourPicker';

const VisualizationContainer = () => {
  // general variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // function display variables
  const [scale, setScale] = useState(70);
  const [points, setPoints] = useState([]);
  const [colour, setColour] = useState([10, 75, 80]);

  // axes related variables
  const [xAxis, setXAxis] = useState([[3.5, 0, 0], [-3.5, 0, 0]]);
  const [yAxis, setYAxis] = useState([[0, 3.5, 0], [0, -3.5, 0]]);
  const [zAxis, setZAxis] = useState([[0, 0, 3.5], [0, 0, -3.5]]);

  // XY border lines
  const [posXBorder, setPosXBorder] = useState([[3.5, 3.5, 0], [3.5, -3.5, 0]]);
  const [negXBorder, setNegXBorder] = useState([[-3.5, 3.5, 0], [-3.5, -3.5, 0]]);
  const [posYBorder, setPosYBorder] = useState([[3.5, 3.5, 0], [-3.5, 3.5, 0]]);
  const [negYBorder, setNegYBorder] = useState([[3.5, -3.5, 0], [-3.5, -3.5, 0]]);

  // function rotation
  const [dragging, setDragging] = useState(false);
  const [currentCoords, setCurrentCoords] = useState([0, 0]);

  // lighting
  const lightDir = [2, 0, 5]

  // canvas settings
  const canvasRef = useRef(null);
  // const dpr = window.devicePixelRatio || 1;

  // bound and step for changing zoom level
  const [bound, setBound] = useState(3)
  const [step, setStep] = useState(0.1)

  // const [cumulativeRotation, setCumulativeRotation] = useState({ x: 0, y: 0, z: 0 });

  const width = 1000;
  const height = 1000;

  // retrieve the calculated points from the backend
  useEffect(() => {
    axios
      .post('http://localhost:8000/points', {
        bound: 3,
        step: 0.2
      })
      .then((response) => {
        const points = response.data.points;
        // setPoints(points)

        setPoints(handleRotations(90, handleRotations(18, points, zAxis), [[1,0,0], [-1,0,0]]))
        setXAxis(handleRotations(90, handleRotations(18, xAxis, zAxis), [[1,0,0], [-1,0,0]]))
        setYAxis(handleRotations(90, handleRotations(18, yAxis, zAxis), [[1,0,0], [-1,0,0]]))
        setZAxis(handleRotations(90, zAxis, [[1,0,0], [-1,0,0]]))

        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching points:', error);
        setError('Failed to fetch points');
        setLoading(false);
      });
  }, []);

  // allows for scroll to zoom in or out
  const handleWheel = (e) => {
    const { deltaY } = e;
    const newScale =
      deltaY > 0
        ? scale + 0.075 * Math.abs(deltaY) / 10
        : scale - 0.075 * Math.abs(deltaY) / 10;

    if (newScale >= 40 && newScale <= 140) {
      setScale(newScale);
      // console.log(newScale / 10, newScale/120);

      // const newBound = newScale / 10
      // const newStep = newScale / 120

      // setBound(newBound)
      // setStep(newStep)
      
      // axios
      //   .post('http://localhost:8000/points', {
      //     bound: bound,
      //     step: step,
      //   })
      //   .then((response) => {
      //     const fetchedPoints = response.data.points;
    
      //     // Apply cumulative rotations to the fetched points
      //     const rotatedPoints = handleRotations(
      //       cumulativeRotation.x,
      //       handleRotations(cumulativeRotation.z, fetchedPoints, zAxis),
      //       [[1, 0, 0], [-1, 0, 0]]
      //     );
    
      //     setPoints(rotatedPoints);
      //     setLoading(false);
      //   })
      //   .catch((error) => {
      //     console.error('Error fetching points:', error);
      //     setError('Failed to fetch points');
      //     setLoading(false);
      //   });
    }
  };

  // Function to unitize a vector
  const unitizeVector = (v) => {
    const magnitude = Math.sqrt(v.reduce((sum, comp) => sum + comp ** 2, 0));
    return v.map((comp) => comp / magnitude);
  };

  // Create the Rodrigues rotation matrix
  const createRotationMatrix = (ux, uy, uz, theta) => {
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const oneMinusCos = 1 - cos;

    return [
      [cos + ux ** 2 * oneMinusCos, ux * uy * oneMinusCos - uz * sin, ux * uz * oneMinusCos + uy * sin],
      [uy * ux * oneMinusCos + uz * sin, cos + uy ** 2 * oneMinusCos, uy * uz * oneMinusCos - ux * sin],
      [uz * ux * oneMinusCos - uy * sin, uz * uy * oneMinusCos + ux * sin, cos + uz ** 2 * oneMinusCos],
    ];
  };

  // Point rotation calculations in the frontend
  const handleRotations = (theta, points, axis) => {
    const directionVector = axis[1].map((val, i) => val - axis[0][i]);
    const [ux, uy, uz] = unitizeVector(directionVector);
    const R = createRotationMatrix(ux, uy, uz, theta);
  
    return points.map((point) => {
      const rotatedPoint = R.map((row) => row.reduce((sum, r, i) => sum + r * point[i], 0));
      return rotatedPoint.map(coord => parseFloat(coord.toFixed(3)));
    });
  };  

  // Starts coordinate capture on mouse down
  const handleMouseDown = (e) => {
    setCurrentCoords([e.clientX, e.clientY]);
    setDragging(true);
  };

  // Safeguard to prevent division by zero or small values
  const safeCoordDiff = (value, minValue) => (Math.abs(value) < minValue ? minValue : value);

  const handleMouseMove = throttle((e) => {
    if (!dragging) return;
  
    const newCoords = [e.clientX, e.clientY];
    const coordDiff = [
      safeCoordDiff(newCoords[0] - currentCoords[0], 0.001),
      safeCoordDiff(newCoords[1] - currentCoords[1], 0.001),
    ];
  
    setCurrentCoords(newCoords);
  
    const rotationX = Math.min(0.75, Math.max(-0.75, coordDiff[1] * 0.001));
    const rotationZ = Math.min(0.75, Math.max(-0.75, coordDiff[0] * 0.001));
  
    // setCumulativeRotation((prev) => ({
    //   x: prev.x + rotationX,
    //   y: prev.y, // You can also add rotationY logic if needed
    //   z: prev.z + rotationZ,
    // }));
  
    setPoints((prevPoints) =>
      handleRotations(rotationX, handleRotations(rotationZ, prevPoints, zAxis), [[1, 0, 0], [-1, 0, 0]])
    );
    setXAxis((prevXAxis) =>
      handleRotations(rotationX, handleRotations(rotationZ, prevXAxis, zAxis), [[1, 0, 0], [-1, 0, 0]])
    );
    setYAxis((prevYAxis) =>
      handleRotations(rotationX, handleRotations(rotationZ, prevYAxis, zAxis), [[1, 0, 0], [-1, 0, 0]])
    );
    setZAxis((prevZAxis) => handleRotations(rotationX, prevZAxis, [[1, 0, 0], [-1, 0, 0]]));
  }, 16);  

  const handleMouseUp = () => {
    setDragging(false);
  };

  const safeRadius = (z, scale, cameraPos) => {
    const denominator = 1 + (z * (scale / 10)) / cameraPos;
    if (denominator <= 0.2) return 0;
    const radius = 2 / denominator;
    return parseFloat(radius.toFixed(3));
  };  

  const projectPoint = ([x, y, z], cameraPos = 1000) => {
    const projectedX = (x * scale * cameraPos) / (z * scale + cameraPos) + width / 2;
    const projectedY = (-y * scale * cameraPos) / (z * scale + cameraPos) + height / 2;
  
    return [parseFloat(projectedX.toFixed(3)), parseFloat(projectedY.toFixed(3))];
  };   

  function normalize(value, min, max) {
    const targetMin = -3.5;
    const targetMax = 3.5;
  
    // Normalize each component (x, y, z)
    return value.map(v => parseFloat((targetMin + ((v - min) / (max - min)) * (targetMax - targetMin)).toFixed(3)));
  }


  function crossProduct(v1, v2){
    return {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x
    } 
  }

  function dotProduct(v1, v2){
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z
  }

  const createTriangles = () => {
    // gets the grid size based on points array
    const gridSize = Math.sqrt(points.length);
    if (!Number.isInteger(gridSize)) {
      throw new Error("Points array must represent a square grid.");
    }
  
    const triangles = [];
    
    // loops to generate triangles based off the grid
    for (let i = 0; i < gridSize - 1; i++) {
      for (let j = 0; j < gridSize - 1; j++) {
        const p1 = points[i * gridSize + j];
        const p2 = points[i * gridSize + j + 1];
        const p3 = points[(i + 1) * gridSize + j];
        const p4 = points[(i + 1) * gridSize + j + 1];
  
        // check that points exist before adding triangles
        if (p1 && p2 && p3) {
          triangles.push([p2, p1, p3]);
        }
        if (p2 && p3 && p4) {
          triangles.push([p2, p3, p4]);
        }
      }
    }

    return triangles;
  };

  function normalizeVector(vector) {
    const magnitude = Math.sqrt(vector.x**2 + vector.y**2 + vector.z**2)
    return {x: vector.x / magnitude, y: vector.y / magnitude, z: vector.z / magnitude}
  }
  
  useEffect(() => {
    
  })
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // clear the canvas before redrawing
    ctx.clearRect(0, 0, width, height);

    // Draw points
    // points.forEach(([x, y, z]) => {
    //   const newPoint = normalize([x, y, z], -2.5, 2.5);
    //   const [px, py] = projectPoint(newPoint);
    //   const radius = safeRadius(z, scale, 500);

    //   ctx.beginPath();
    //   ctx.arc(px, py, radius, 0, 2 * Math.PI);
    //   ctx.fillStyle = colour;
    //   ctx.fill();
    // });

    const triangles = createTriangles(points);
    if (!triangles || triangles.length === 0) {
      console.warn("Triangles are undefined or empty.");
      return;
    } else {
      triangles.sort((a, b) => {
        const avgZ1 = (a[0][2] + a[1][2] + a[2][2]) / 3;
        const avgZ2 = (b[0][2] + b[1][2] + b[2][2]) / 3;
        return avgZ2 - avgZ1;
      });
      triangles.forEach((triangle) => {
        const [p1, p2, p3] = triangle;
        
        // normalizes the values of p1 to be between -3.5 and 3.5
        const normalizedP1 = normalize(p1, -bound, bound);
        const normalizedP2 = normalize(p2, -bound, bound);
        const normalizedP3 = normalize(p3, -bound, bound);
        
        // projects the point from 3d to 2d space
        const [p1x, p1y] = projectPoint(normalizedP1);
        const [p2x, p2y] = projectPoint(normalizedP2);
        const [p3x, p3y] = projectPoint(normalizedP3);
        
        // normalizes the light direction vector
        const lightDirection = normalizeVector({ x: lightDir[0], y: lightDir[1], z: lightDir[2] });
        
        // extracts the normalized points of the triangle
        const [x1, y1, z1] = normalizedP1;
        const [x2, y2, z2] = normalizedP2;
        const [x3, y3, z3] = normalizedP3;
        
        // calculates the vectors AB and AC
        let AB = { x: x2 - x1, y: y2 - y1, z: z2 - z1 };
        let AC = { x: x3 - x1, y: y3 - y1, z: z3 - z1 };
        
        // calculates the normal to the current triangle by taking the cross product between AB and AC
        let normal = crossProduct(AB, AC);

        // if the normal z value is negative (facing the wrong way) it inverts the triangle coordinates
        if (normal.z < 0) {
          normal = { x: -normal.x, y: -normal.y, z: -normal.z };
        }

        // normalizes the normal vector
        normal = normalizeVector(normal);

        console.log(normal);
        
        
        // calculates the lighting intensity for the current triangle based on the light direction dot product with the normal
        const lightingIntensity = Math.max(0, dotProduct(lightDirection, normal));
      
        const baseColour = { r: colour[0], g: colour[1], b: colour[2] };
        // (r: 100, g: 25, b: 50) - maroon
        // {r: 0, g: 100, b: 120} - dark turqoise
        // {r: 10, g: 75, b: 80} - dark green turqoise
        // {r: 252, g: 108, b: 133} - watermelon pink


        // gets the new shade of the base colour based on the lighting intensity
        const colourShade = {
          r: Math.floor(baseColour.r * lightingIntensity),
          g: Math.floor(baseColour.g * lightingIntensity),
          b: Math.floor(baseColour.b * lightingIntensity),
        };
      
        // Draw the triangle
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p3x, p3y);
        ctx.closePath();

        // sets the line width, fill colour and outline colour
        ctx.lineWidth = 1;
        ctx.fillStyle = `rgb(${colourShade.r}, ${colourShade.g}, ${colourShade.b})`;
        ctx.strokeStyle = `rgb(${colourShade.r}, ${colourShade.g}, ${colourShade.b})`;
        ctx.fill();
        ctx.stroke();
      });
    }

    // draw axes
    [[xAxis, '#5A8AA8'], [yAxis, '#9CA9B3'], [zAxis, '#88BDBC']].forEach(([axis, color], index) => {
      const [x1, y1] = projectPoint(axis[0]);
      const [x2, y2] = projectPoint(axis[1]);

      console.log(index);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();

      // label the axes
      const axisLabels = ["X", "Y", "Z"];
      ctx.fillStyle = "#333";
      ctx.font = `${scale / 2.5}px sans-serif`;
      ctx.fillText(axisLabels[index], x1 - 5, y1 - 2);
      ctx.font = `${scale / 6}px sans-serif`;
      ctx.fillText(3.5, x1 - 40, y1 + 6);
    });
  };

  const updateColour = (newColour) => {
    setColour(newColour);
  };

  useEffect(() => {
    if (!loading && !error) {
      drawCanvas();
    }
  }, [points, scale, colour]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{ overflow: 'hidden' }}>
      <h1>Visualization</h1>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ border: '1px solid black' }}
      />
      <ColourPicker onColourChange={updateColour} />
    </div>
  );
};

export default VisualizationContainer;
