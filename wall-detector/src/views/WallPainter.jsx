import { useRef, useState, useEffect } from "react";
import { ChromePicker } from "react-color";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
// import cv from "opencv.js";

function WallPainter() {
  const [imageSrc, setImageSrc] = useState(null); // For processed canvas URL
  const [image, setImage] = useState(null);
  const [selectedColor, setSelectedColor] = useState("#ff0000");
  const canvasRef = useRef(null);

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const img = new Image();
      img.src = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Set canvas dimensions and draw the image
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Convert canvas to URL for React Konva
        setImageSrc(canvas.toDataURL()); //  Keep the original image reference
      };
    }
  };

  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.src = imageSrc;
      setImage(img);
    }
  }, [imageSrc]);

  // Handle stage click for painting
  const handleStageClick = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Get image data
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const targetColor = getColorAtPos(
      imgData,
      Math.round(pos.x),
      Math.round(pos.y)
    );
    floodFill(
      ctx,
      Math.round(pos.x),
      Math.round(pos.y),
      targetColor,
      hexToRgba(selectedColor)
    );

    // Update the canvas and React Konva image
    setImageSrc(canvas.toDataURL());
  };

  // Get pixel color at a position
  const getColorAtPos = (imgData, x, y) => {
    const index = (y * imgData.width + x) * 4;
    return [
      imgData.data[index],
      imgData.data[index + 1],
      imgData.data[index + 2],
      imgData.data[index + 3],
    ];
  };

  // Flood fill logic
  const floodFill = (ctx, x, y, targetColor, fillColor, tolerance = 30) => {
    const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const stack = [[x, y]];
    const width = imgData.width;
    const height = imgData.height;

    // Create a visited array (1D boolean array corresponding to pixels)
    const visited = new Array(width * height).fill(false);

    // Helper to compute index in the `visited` array
    const getIndex = (x, y) => y * width + x;

    const matchColor = (data, index, color, tolerance) => {
      const rDiff = Math.abs(data[index] - color[0]);
      const gDiff = Math.abs(data[index + 1] - color[1]);
      const bDiff = Math.abs(data[index + 2] - color[2]);
      const aDiff = Math.abs(data[index + 3] - color[3]);

      return (
        rDiff <= tolerance &&
        gDiff <= tolerance &&
        bDiff <= tolerance &&
        aDiff <= tolerance
      );
    };

    const setColor = (data, index, color) => {
      data[index] = color[0];
      data[index + 1] = color[1];
      data[index + 2] = color[2];
      data[index + 3] = 255; // Opaque
    };

    while (stack.length) {
      const [cx, cy] = stack.pop();
      const index = (cy * width + cx) * 4;

      // Skip if out of bounds, already visited, or not matching the target color
      if (
        cx < 0 ||
        cy < 0 ||
        cx >= width ||
        cy >= height ||
        visited[getIndex(cx, cy)] ||
        !matchColor(imgData.data, index, targetColor, tolerance)
      ) {
        continue;
      }

      // Mark the pixel as visited
      visited[getIndex(cx, cy)] = true;

      // Set the new color
      setColor(imgData.data, index, fillColor);

      // Add neighboring pixels to the stack
      stack.push([cx + 1, cy]);
      stack.push([cx - 1, cy]);
      stack.push([cx, cy + 1]);
      stack.push([cx, cy - 1]);
    }

    // Apply updated image data back to the canvas
    ctx.putImageData(imgData, 0, 0);
  };

  const hexToRgba = (hex) => {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255, 255];
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileUpload} />
      <ChromePicker
        color={selectedColor}
        onChangeComplete={(color) => setSelectedColor(color.hex)}
      />
      <Stage width={800} height={600} onClick={handleStageClick}>
        <Layer>{image && <KonvaImage image={image} />}</Layer>
      </Stage>
      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
    </div>
  );
}

export default WallPainter;
