let src, contours, hierarchy, mask, largestWallIndex, canvas, ctx;

document.getElementById("imageInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = function () {
    // Initialize OpenCV variables
    src = cv.imread(img);
    const gray = new cv.Mat();
    const edges = new cv.Mat();

    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

    // Apply edge detection
    cv.Canny(gray, edges, 50, 150);

    // Dilate edges to close gaps
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.dilate(edges, edges, kernel);

    // Find contours
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );

    // Determine the largest contour (assume it's the wall)
    largestWallIndex = -1;
    let maxArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      const area = cv.contourArea(contours.get(i));
      if (area > maxArea) {
        maxArea = area;
        largestWallIndex = i;
      }
    }

    // Create a mask for the wall
    mask = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
    if (largestWallIndex !== -1) {
      cv.drawContours(mask, contours, largestWallIndex, new cv.Scalar(255), -1); // Fill largest contour

      // Calculate wall position for placing the Edit button
      const rect = cv.boundingRect(contours.get(largestWallIndex));
      const canvasContainer = document.getElementById("canvasContainer");
      const editButton = document.getElementById("editButton");
      const colorPicker = document.getElementById("colorPicker");

      // Position the Edit button
      editButton.style.left = `${rect.x}px`;
      editButton.style.top = `${rect.y}px`;
      editButton.style.display = "block";

      // Handle Edit button click
      editButton.addEventListener("click", () => {
        // Show the color picker beside the Edit button
        colorPicker.style.left = `${rect.x + rect.width + 10}px`; // Position to the right of the wall
        colorPicker.style.top = `${rect.y}px`;
        colorPicker.style.display = "block";
      });
    }

    // Display the original image
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    canvas.width = src.cols;
    canvas.height = src.rows;
    cv.imshow("canvas", src);

    // Cleanup intermediate matrices
    gray.delete();
    edges.delete();
    kernel.delete();
  };

  img.src = URL.createObjectURL(file);
});

// Add event listener to the color picker
document.getElementById("colorPicker").addEventListener("input", (event) => {
  if (!src || largestWallIndex === -1) return;

  // Get selected color
  const selectedColor = hexToRgb(event.target.value);
  const color = new cv.Scalar(
    selectedColor.b,
    selectedColor.g,
    selectedColor.r,
    255
  ); // OpenCV uses BGR format

  // Create a new image for the non-detected portions
  const result = src.clone();

  // Apply the color to pixels outside the detected wall (where mask value is not 255)
  for (let i = 0; i < src.rows; i++) {
    for (let j = 0; j < src.cols; j++) {
      if (mask.ucharPtr(i, j)[0] !== 255) {
        // If pixel is NOT part of the wall
        result.ucharPtr(i, j)[0] = color[0]; // Blue
        result.ucharPtr(i, j)[1] = color[1]; // Green
        result.ucharPtr(i, j)[2] = color[2]; // Red
      }
    }
  }

  // Display the updated image
  cv.imshow("canvas", result);
});

// Utility function to convert hex color to RGB
function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}
