import React, { useEffect, useState } from 'react';
import axios from 'axios';

const VisualizationContainer = () => {
  // general variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // function display variables
  const [scale, setScale] = useState(60);
  const [points, setPoints] = useState([]);
  const [colour, setColour] = useState("#002fa7");

  // axes related variables
  const [xAxis, setXAxis] = useState([[3.5, 0, 0], [-3.5, 0, 0]]);
  const [yAxis, setYAxis] = useState([[0, 3.5, 0], [0, -3.5, 0]]);
  const [zAxis, setZAxis] = useState([[0, 0, 3.5], [0, 0, -3.5]]);

  // function rotation
  const [dragging, setDragging] = useState(false);
  const [currentCoords, setCurrentCoords] = useState([0, 0])

  const width = 500;
  const height = 500;


  // retrieve the calculated points from the backend
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

  // soon to be deprecated handles rotations manually with button clicks
  const handleClick = (e) => {
    if (points.length > 0) {
      const typeOfRot = e.target.value
      if (typeOfRot === "x") {
        setPoints(handleRotations(.12, 0, 0, points))
        updateAxes(.12, 0, 0)
      }
      else if (typeOfRot === "y") {
        setPoints(handleRotations(0, .12, 0, points))
        updateAxes(0, .12, 0)
      }
      else {
        setPoints(handleRotations(0, 0, .12, points))
        updateAxes(0, 0, .12)
      }
    }
  };


  // allows for scroll to zoom in or out
  const handleWheel = (e) => {
    const { deltaY } = e;
    const newScale = 
      deltaY > 0 
        ? scale - (0.075 * Math.abs(deltaY))
        : scale + (0.075 * Math.abs(deltaY));

    if (newScale > 1) {
      setScale(newScale);
    } else {
      setScale(1);
    }
  }

  // function to unitize a vector
  const unitizeVector = (v) => {
    const [x, y, z] = v
    const magnitude = Math.sqrt(x**2 + y**2 + z**2)

    const unitizedVector = [x / magnitude, y / magnitude, z / magnitude]

    return unitizedVector
  }

  // point rotation calculations in the frontend
  const handleRotations = (xRot, yRot, zRot, points) => {
    const Rx = [
      [1, 0, 0],
      [0, Math.cos(xRot), -Math.sin(xRot)],
      [0, Math.sin(xRot), Math.cos(xRot)]
    ];

    const Ry = [
      [Math.cos(yRot), 0, Math.sin(yRot)],
      [0, 1, 0],
      [-Math.sin(yRot), 0, Math.cos(yRot)]
    ];

    const Rz = [
      [Math.cos(zRot), -Math.sin(zRot), 0],
      [Math.sin(zRot), Math.cos(zRot), 0],
      [0, 0, 1]
    ];

    // Rotate all the points
    const rotatedPoints = points.map(point => {
      const [x, y, z] = point;
      const vector = [x, y, z];
      const zRotatedVector = [0, 0, 0];
      const zyRotatedVector = [0, 0, 0];
      const zyxRotatedVector = [0, 0, 0];

      // Apply the x, y, and z rotations
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          zRotatedVector[i] += Rx[i][j] * vector[j];
        }
      }
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          zyRotatedVector[i] += Ry[i][j] * zRotatedVector[j];
        }
      }
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          zyxRotatedVector[i] += Rz[i][j] * zyRotatedVector[j];
        }
      }

      return zyxRotatedVector;
    });

    return rotatedPoints;
  };

  // starts coordinate capture on mouse down
  const handleMouseDown =  (e) => {
    console.log("Mouse down: ", e.clientX, e.clientY);
    setDragging(true)
  }

    // Safeguard to prevent division by zero or small values
    const safeCoordDiff = (value, minValue) => Math.abs(value) < minValue ? minValue : value;

  let animationFrame;

  const handleMouseMove = (e) => {
    if (dragging) {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
  
      animationFrame = requestAnimationFrame(() => {
        const coordDiff = [
          safeCoordDiff(e.clientX - currentCoords[0], 0.1), // Horizontal movement
          safeCoordDiff(e.clientY - currentCoords[1], 0.1), // Vertical movement
        ];

        let rotationZ = 0
        let rotationX = Math.min(0.02, Math.max(-0.02, coordDiff[1] * 0.001));
        // let rotationY = Math.min(0.02, Math.max(-0.02, coordDiff[0] * 0.001));
        let rotationY = 0

        if (JSON.stringify(zAxis) === JSON.stringify([[0, 0, 3.5], [0, 0, -3.5]])) {
          rotationZ = Math.min(0.02, Math.max(-0.02, coordDiff[0] * 0.001));
          rotationX = Math.min(0.02, Math.max(-0.02, coordDiff[1] * 0.001));
          rotationY = 0
          // Update points and axes
          setPoints(handleRotations(-rotationX, -rotationY, -rotationZ, points));
          updateAxes(-rotationX, -rotationY, -rotationZ);
        }
  
        // Update points and axes
        setPoints(handleRotations(-rotationX, -rotationY, -rotationZ, points));
        updateAxes(-rotationX, -rotationY, -rotationZ);
  
        // Update current coordinates
        setCurrentCoords([e.clientX, e.clientY]);
      });
    }
  };  

  const handleMouseUp = (e) => {
    console.log("Mouse up: ", e.clientX, e.clientY);
    setDragging(false)
  } 

  const safeRadius = (z, scale, cameraPos) => {
    const denominator = 1 + z * scale / cameraPos;
  
    if (denominator <= 0.2) {
      return 0;
    }
  
    return 1.5 * (1 / denominator);
  };

  // soon to be removed axis rotation
  // const updateAxesOld = (typeOfRot) => {
  //   axios.post('http://localhost:8000/rotate_points', {
  //     type: typeOfRot,
  //     newPoints: xAxis,
  //     theta: .2,
  //   }).then((response) => {
  //     setXAxis(response.data.rotatedPoints);
  //   });

  //   axios.post('http://localhost:8000/rotate_points', {
  //     type: typeOfRot,
  //     newPoints: yAxis,
  //     theta: .2,
  //   }).then((response) => {
  //     setYAxis(response.data.rotatedPoints);
  //   });
    
  //   axios.post('http://localhost:8000/rotate_points', {
  //     type: typeOfRot,
  //     newPoints: zAxis,
  //     theta: .2,
  //   }).then((response) => {
  //     setZAxis(response.data.rotatedPoints);
  //   });
  // };

  const updateAxes = (xRot, yRot, zRot) => {
    setXAxis(handleRotations(xRot, yRot, zRot, xAxis))
    setYAxis(handleRotations(xRot, yRot, zRot, yAxis))
    setZAxis(handleRotations(xRot, yRot, zRot, zAxis))
  }

  const projectPoint = ([x, y, z], cameraPos = 1000) => {
    return [
      (x * scale * cameraPos) / (z * scale + cameraPos) + width / 2,
      (-y * scale * cameraPos) / (z * scale + cameraPos) + height / 2,
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
                <text x={x1 - 5} y={y1 - 2} fontSize={scale / 2.5} fontWeight="bold" style={{ userSelect: "none" }}>{axes[index]}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <button value="x" onClick={handleClick} >Rotate X</button>
      <button value="y" onClick={handleClick}>Rotate Y</button>
      <button value="z" onClick={handleClick}>Rotate Z</button>
      <div id='testing'>
        <h1>TESTING</h1>
      </div>
    </div>
  );
};

export default VisualizationContainer;
