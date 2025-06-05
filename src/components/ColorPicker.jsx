import React, { useState, useRef, useEffect, useCallback } from "react";
import { SVG } from "@svgdotjs/svg.js";
import domtoimage from "dom-to-image";

import UploadArea from "./UploadArea";
import ColorControls from "./ColorControls";
import DownloadButtons from "./DownloadButtons";

import { ImBin } from "react-icons/im";
import { FaUndo } from "react-icons/fa";
import { LuRefreshCw } from "react-icons/lu";

import useMobileDetection from "../hooks/useMobileDetection";
import useFileUpload from "../hooks/useFileUpload";

import banner from "../assets/banner/Ads.png";
import banner2 from "../assets/banner/Ads 3.png";

const DEFAULT_COLOR = "#F87316";

const ColorPicker = () => {
  // State variables
  const [svgContent, setSvgContent] = useState("");
  const [selectedElement, setSelectedElement] = useState(null);
  const [currentColor, setCurrentColor] = useState(DEFAULT_COLOR);
  const [undoStack, setUndoStack] = useState([]);

  // Refs
  const originalSvgRef = useRef(""); // Original SVG snapshot for reset
  const svgContainerRef = useRef(null); // Container for SVG element
  const svgJsDraw = useRef(null); // svg.js instance
  const hiddenColorInputRef = useRef(null);

  // Custom hooks
  const isMobile = useMobileDetection();

  // Reset state on new upload
  const resetOnUpload = useCallback((flattenedSvg) => {
    originalSvgRef.current = flattenedSvg;
    setUndoStack([]);
    setSelectedElement(null);
    setCurrentColor(DEFAULT_COLOR);
  }, []);

  // File upload hook with reset callback
  const {
    isDragging,
    fileInputRef,
    handleFileChange,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    triggerFileInput,
  } = useFileUpload(setSvgContent, resetOnUpload);

  // Load and prepare SVG inside container
  const loadSVG = useCallback(
    (svgString) => {
      if (!svgContainerRef.current) return;

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = svgString;
      const svgElement = tempDiv.querySelector("svg");

      if (!svgElement) {
        setSvgContent("");
        setSelectedElement(null);
        return;
      }

      // Reset SVG attributes for flexible sizing
      svgElement.removeAttribute("width");
      svgElement.removeAttribute("height");

      if (!svgElement.getAttribute("viewBox")) {
        const bbox = svgElement.getBBox();
        svgElement.setAttribute("viewBox", `0 0 ${bbox.width} ${bbox.height}`);
      }

      // Set styling for SVG container
      Object.assign(svgElement.style, {
        width: "100%",
        height: "100%",
        maxWidth: "100%",
        maxHeight: "100%",
        display: "block",
        preserveAspectRatio: "xMidYMid meet",
      });

      // Move fill/stroke styles to inline styles and remove attributes
      svgElement.querySelectorAll("*").forEach((el) => {
        ["fill", "stroke", "stop-color"].forEach((attr) => {
          const val = el.getAttribute(attr);
          if (val && !el.style[attr === "stop-color" ? "stopColor" : attr]) {
            el.style[attr === "stop-color" ? "stopColor" : attr] = val;
          }
          el.removeAttribute(attr);
        });
      });

      // Assign unique IDs and pointer cursor to SVG shape elements
      let idCounter = 0;
      const validTags = [
        "path",
        "circle",
        "rect",
        "ellipse",
        "polygon",
        "polyline",
        "line",
        "text",
        "g",
      ];

      const assignIds = (node) => {
        if (
          node.nodeType === 1 &&
          validTags.includes(node.tagName.toLowerCase())
        ) {
          node.style.cursor = "pointer";
          if (!node.id) node.id = `svg-part-${idCounter++}`;
        }
        Array.from(node.children).forEach(assignIds);
      };
      assignIds(svgElement);

      // Clear previous SVG and insert the new one
      svgContainerRef.current.innerHTML = "";
      svgContainerRef.current.appendChild(svgElement);

      // Initialize svg.js with the new SVG element
      svgJsDraw.current?.clear()?.remove();
      svgJsDraw.current = SVG(svgElement);

      // Add click handlers on SVG elements for color picking
      svgJsDraw.current.find(validTags.join(", ")).each(function () {
        const el = this;
        if (!el.attr("id")) return;

        el.off("click"); // remove any previous listeners

        el.on("click", (e) => {
          // Handle click on SVG element
          e.stopPropagation();

          const styles = getComputedStyle(el.node);
          const hasFill = !["none", "rgba(0, 0, 0, 0)"].includes(styles.fill);
          const hasStroke = !["none", "rgba(0, 0, 0, 0)"].includes(
            styles.stroke
          );

          let colorType = "fill";
          if (selectedElement?.id === el.attr("id")) {
            colorType =
              selectedElement.type === "fill" && hasStroke ? "stroke" : "fill";
          } else {
            colorType = hasFill ? "fill" : hasStroke ? "stroke" : "fill";
          }

          const initialColor = styles[colorType] || DEFAULT_COLOR;
          setCurrentColor(initialColor);
          setSelectedElement({ id: el.attr("id"), type: colorType });

          // Trigger hidden color input for color picker UI
          if (hiddenColorInputRef.current) {
            hiddenColorInputRef.current.value = initialColor;
            hiddenColorInputRef.current.click();
          }
        });
      });

      // Clicking outside shapes clears selection
      svgJsDraw.current.on("click", (e) => {
        if (e.target === svgJsDraw.current.node) setSelectedElement(null);
      });
    },
    [selectedElement]
  );

  // Load SVG when svgContent changes
  useEffect(() => {
    if (svgContent) {
      loadSVG(svgContent);
    } else if (svgJsDraw.current) {
      svgJsDraw.current.clear().remove();
      svgJsDraw.current = null;
      setSelectedElement(null);
    }
  }, [svgContent, loadSVG]);

  // Change selected element's fill/stroke color
  const handleColorChange = useCallback(
    (e) => {
      const newColor = e.target.value;
      setCurrentColor(newColor);

      if (!selectedElement || !svgJsDraw.current) return;

      const element = svgJsDraw.current.findOne(`#${selectedElement.id}`);
      if (!element) return;

      // Save current SVG to undo stack
      if (svgContainerRef.current) {
        const currentSvg =
          svgContainerRef.current.querySelector("svg")?.outerHTML;
        if (currentSvg) setUndoStack((prev) => [...prev, currentSvg]);
      }

      element[selectedElement.type](newColor);
      element.node.style[selectedElement.type] = newColor;

      const updatedSvg = new XMLSerializer().serializeToString(
        svgJsDraw.current.node
      );
      setSvgContent(updatedSvg);
    },
    [selectedElement]
  );

  // Download SVG file
  const handleDownloadSVG = useCallback(() => {
    if (!svgJsDraw.current) return;

    const svgString = new XMLSerializer().serializeToString(
      svgJsDraw.current.node
    );
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "customized-image.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }, []);

  // Download PNG or JPEG using dom-to-image
  const downloadImage = useCallback(async (format) => {
    const svgContainer = svgContainerRef.current;
    if (!svgContainer) return;

    try {
      // Clone the SVG container div (not just the SVG element)
      const clonedNode = svgContainer.cloneNode(true);

      // Optional: white background for JPEG
      if (format === "jpeg") {
        clonedNode.style.backgroundColor = "#ffffff";
      }

      // Append clone to DOM (hidden)
      const hiddenWrapper = document.createElement("div");
      hiddenWrapper.style.position = "fixed";
      hiddenWrapper.style.left = "-9999px";
      hiddenWrapper.appendChild(clonedNode);
      document.body.appendChild(hiddenWrapper);

      // Convert to image
      const dataUrl =
        format === "png"
          ? await domtoimage.toPng(clonedNode)
          : await domtoimage.toJpeg(clonedNode, {
              quality: 0.95,
              bgcolor: "#ffffff",
            });

      // Clean up
      document.body.removeChild(hiddenWrapper);

      // Trigger download
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `customized-image.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download image.");
    }
  }, []);

  // Clear SVG and reset states
  const handleClear = useCallback(() => {
    if (svgContent) setUndoStack((prev) => [...prev, svgContent]);

    setSvgContent("");
    setSelectedElement(null);
    setCurrentColor(DEFAULT_COLOR);
  }, [svgContent]);

  // Undo last change
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setSvgContent(previous);
    setSelectedElement(null);
  }, [undoStack]);

  // Reset SVG to original upload
  const handleReset = useCallback(() => {
    console.log("Reset triggered", { originalSvg: originalSvgRef.current });
    if (!originalSvgRef.current) return;

    setUndoStack((prev) => [...prev, svgContent]);
    setSvgContent(originalSvgRef.current);
    setSelectedElement(null);
    setCurrentColor(DEFAULT_COLOR);
  }, [svgContent]);

  return (
    <div className="flex justify-center items-start w-full min-h-screen">
      {/* Left Banner  */}
      {/* <div className="hidden lg:flex justify-end items-center flex-grow min-w-0 pr-4">
        <img
          src={banner}
          alt="Left Banner"
          className="h-[550px] w-[100px] object-contain"
        />
      </div> */}

      {/* Main Content Container */}
      <div className="md:w-[49%] w-80 mx-auto flex-shrink-0">
        <h1 className="pt-6 text-center md:text-left text-2xl md:text-[34px] font-bold">
          Upload Svg & Change Colors
        </h1>

        <div className="flex flex-col md:flex-row mt-4 gap-4">
          {/* Upload & Display Area */}
          <UploadArea
            isDragging={isDragging}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            hasContent={!!svgContent}
          >
            <div
              ref={svgContainerRef}
              className="h-full w-full overflow-hidden"
            />
          </UploadArea>

          {/* Controls for mobile */}
          {isMobile ? (
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-xs font-semibold text-[#283038] underline"
              >
                <LuRefreshCw className="w-4 h-4" /> Reset
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1 text-xs font-semibold text-red-600 underline "
              >
                <ImBin className="w-3.5 h-3.5" /> Clear
              </button>
              <button
                onClick={handleUndo}
                className="flex items-center gap-1 text-xs font-semibold text-[#283038] underline"
              >
                <FaUndo className="w-4 h-4" /> Undo
              </button>
            </div>
          ) : (
            <ColorControls
              selectedElement={selectedElement}
              currentColor={currentColor}
              onColorChange={handleColorChange}
              onReset={handleReset}
              onClear={handleClear}
              onUndo={handleUndo}
            />
          )}
        </div>

        <input
          type="color"
          ref={hiddenColorInputRef}
          className="hidden"
          value={currentColor}
          onChange={handleColorChange}
        />

        <input
          type="file"
          ref={fileInputRef}
          accept=".svg"
          onChange={handleFileChange}
          className="hidden"
        />

      {/* Horizontal Banner  */}
        {/* <div className="mt-6 md:mt-2 flex items-center justify-center ">
          <img src={banner2} alt="" className="w-[72%] "  />
        </div> */}

        {/* Download buttons */}
        <DownloadButtons
          onDownloadSVG={handleDownloadSVG}
          onDownloadPNG={() => downloadImage("png")}
          onDownloadJPEG={() => downloadImage("jpeg")}
        />
      </div>

      {/* Right Banner */}
      {/* <div className="hidden lg:flex justify-start items-center flex-grow min-w-0 pl-4">
        <img
          src={banner}
          alt="Right Banner"
          className="h-[550px] w-[100px] object-contain"
        />
      </div> */}
    </div>
  );
};

export default ColorPicker;
