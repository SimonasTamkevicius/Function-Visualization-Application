import React from 'react';

function ChildComponent({ onColourChange }) {

  const handleSubmit = (e) => {
    e.preventDefault()
    const hexColour = e.target.elements.colourPicker.value;
    const rgbColour = hexToRgb(hexColour)
    console.log(rgbColour);

    onColourChange(rgbColour)
  }

  const hexToRgb = (hex) => {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  };
  return (
    <div>
      <form 
        onSubmit={handleSubmit} 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '120px',
          gap: '8px',
        }}
      >
        <label htmlFor="colourPicker" style={{ fontSize: '14px' }}>
          Choose Colour:
        </label>
        <input id="colourPicker" type="color" name="colourPicker" />
        <button type="submit" style={{ padding: '6px 12px', cursor: 'pointer' }}>
          Save
        </button>
      </form>
    </div>
  );
}

export default ChildComponent;
