/* eslint-disable no-restricted-globals */

// Helper functions (similar to those in VisualizationContainer)
const unitizeVector = (v) => {
    const magnitude = Math.sqrt(v.reduce((sum, comp) => sum + comp ** 2, 0));
    return v.map((comp) => comp / magnitude);
  };
  
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
  
  const rotatePoints = (points, axis, theta) => {
    const directionVector = axis[1].map((val, i) => val - axis[0][i]);
    const [ux, uy, uz] = unitizeVector(directionVector);
    const R = createRotationMatrix(ux, uy, uz, theta);
  
    return points.map((point) =>
      R.map((row) => row.reduce((sum, r, i) => sum + r * point[i], 0))
    );
  };
  
  self.onmessage = (e) => {
    const { points, axis, theta } = e.data;
  
    const rotatedPoints = rotatePoints(points, axis, theta);
  
    self.postMessage(rotatedPoints);
  };
  