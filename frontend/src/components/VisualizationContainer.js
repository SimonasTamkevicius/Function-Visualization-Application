import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { debounce, throttle } from 'lodash';

const VisualizationContainer = () => {
  // General variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Function display variables
  const [scale, setScale] = useState(100);
  const [points, setPoints] = useState([]);
  const [colour, setColour] = useState("#002fa7");

  // Axes related variables
  const [xAxis, setXAxis] = useState([[3.5, 0, 0], [-3.5, 0, 0]]);
  const [yAxis, setYAxis] = useState([[0, 3.5, 0], [0, -3.5, 0]]);
  const [zAxis, setZAxis] = useState([[0, 0, 3.5], [0, 0, -3.5]]);

  // XY border lines
  const [posXBorder, setPosXBorder] = useState([[3.5, 3.5, 0], [3.5, -3.5, 0]]);
  const [negXBorder, setNegXBorder] = useState([[-3.5, 3.5, 0], [-3.5, -3.5, 0]]);
  const [posYBorder, setPosYBorder] = useState([[3.5, 3.5, 0], [-3.5, 3.5, 0]]);
  const [negYBorder, setNegYBorder] = useState([[3.5, -3.5, 0], [-3.5, -3.5, 0]]);

  // Function rotation
  const [dragging, setDragging] = useState(false);
  const [currentCoords, setCurrentCoords] = useState([0, 0]);

  const width = 1000;
  const height = 1000;

  // Retrieve the calculated points from the backend
  useEffect(() => {
    axios
      .get('http://localhost:8000/points')
      .then((response) => {
        setPoints(response.data.points);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching points:', error);
        setError('Failed to fetch points');
        setLoading(false);
      });
  }, []);

  // Allows for scroll to zoom in or out
  const handleWheel = (e) => {
    const { deltaY } = e;
    const newScale =
      deltaY > 0
        ? scale - 0.075 * Math.abs(deltaY)
        : scale + 0.075 * Math.abs(deltaY);

    if (newScale >= 40 && newScale <= 140) {
      setScale(newScale);
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
      return R.map((row) => row.reduce((sum, r, i) => sum + r * point[i], 0)).map((coord) => parseFloat(coord.toFixed(3)));
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
      safeCoordDiff(newCoords[0] - currentCoords[0], 0.005),
      safeCoordDiff(newCoords[1] - currentCoords[1], 0.005),
    ];

    setCurrentCoords(newCoords);

    const theAxis = [[1, 0, 0], [-1, 0, 0]];
    const rotationX = Math.min(0.75, Math.max(-0.75, coordDiff[1] * 0.005));
    const rotationZ = Math.min(0.75, Math.max(-0.75, coordDiff[0] * 0.005));

    setPoints((prevPoints) => handleRotations(rotationX, handleRotations(rotationZ, prevPoints, zAxis), theAxis));
    setXAxis((prevXAxis) => handleRotations(rotationX, handleRotations(rotationZ, prevXAxis, zAxis), theAxis));
    setYAxis((prevYAxis) => handleRotations(rotationX, handleRotations(rotationZ, prevYAxis, zAxis), theAxis));
    setZAxis((prevZAxis) => handleRotations(rotationX, prevZAxis, theAxis));

    // rotateBorders(rotationX, -rotationZ, theAxis, zAxis);
  }, 16);

  const rotateBorders = (theta1, theta2, axis1, axis2) => {
    const posXRotation = handleRotations(theta1, posXBorder, axis1);
    const negXRotation = handleRotations(theta1, negXBorder, axis1);
    const posYRotation = handleRotations(theta1, posYBorder, axis1);
    const negYRotation = handleRotations(theta1, negYBorder, axis1);
  
    // Round the rotated coordinates to 3 significant digits
    const roundCoords = (coords) => coords.map((coord) => coord.map((c) => parseFloat(c.toFixed(3))));
  
    setPosXBorder(roundCoords(handleRotations(theta2, posXRotation, axis2)));
    setNegXBorder(roundCoords(handleRotations(theta2, negXRotation, axis2)));
    setPosYBorder(roundCoords(handleRotations(theta2, posYRotation, axis2)));
    setNegYBorder(roundCoords(handleRotations(theta2, negYRotation, axis2)));
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const safeRadius = (z, scale, cameraPos) => {
    const denominator = 1 + (z * scale) / cameraPos;
    return denominator <= 0.2 ? 0 : parseFloat((1.5 / denominator).toFixed(3));
  };

  const projectPoint = ([x, y, z], cameraPos = 1000) => {
    return [
      parseFloat(((x * scale * cameraPos) / (z * scale + cameraPos) + width / 2).toFixed(3)),
      parseFloat(((-y * scale * cameraPos) / (z * scale + cameraPos) + height / 2).toFixed(3)),
    ];
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{overflow: 'hidden'}} options={{ passive: false }}>
      <h1>Visualization</h1>
      <div id="svg-wrapper"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg
          onWheel={handleWheel}
          width={width}
          height={height}
          style={{ border: '1px solid black' }}
        >
          {points.map((point, i) => {
            const [x, y, z] = point;
            const cameraPos = 500
            
            const [projectedX, projectedY] = projectPoint([x, y, z])

            const radius = safeRadius(z, scale, cameraPos);

            return (
              <circle
                key={i}
                cx={projectedX}
                cy={projectedY}
                r={radius}
                fill={colour}
              />
            );
          })}
          {[xAxis, yAxis, zAxis].map((axis, index) => {
            const [lineStart, lineEnd] = axis;
            const [x1, y1] = projectPoint(lineStart);
            const [x2, y2] = projectPoint(lineEnd);
            const axes = ["X", "Y", "Z"]
            const colours = ["#5A8AA8", "#9CA9B3", "#88BDBC"]

            return (
              <g key={index}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={colours[index]}
                  strokeWidth={3}
                />
                <text x={x1 - 5} y={y1 - 2} fontSize={scale / 2.5} fill="#333333" fontWeight="bold" style={{ userSelect: "none" }}>{axes[index]}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  );
};

export default VisualizationContainer;
