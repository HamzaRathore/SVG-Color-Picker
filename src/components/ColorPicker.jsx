import React, { useState, useRef, useEffect, useCallback } from "react";
import { SVG } from "@svgdotjs/svg.js";
import domtoimage from "dom-to-image";

import UploadArea from "./UploadArea";
import ColorControls from "./ColorControls";
import DownloadButtons from "./DownloadButtons";

import { ImBin } from "react-icons/im";
import { FaUndo } from "react-icons/fa";
import { LuRefreshCw } from "react-icons/lu";
import { FiInfo } from "react-icons/fi";
import { MdOutlineZoomIn, MdOutlineZoomOut } from "react-icons/md";

import useMobileDetection from "../hooks/useMobileDetection";
import useFileUpload from "../hooks/useFileUpload";

const DEFAULT_COLOR = "#F87316";

const ColorPicker = () => {
  // State variables
  const [svgContent, setSvgContent] = useState("");
  const [selectedElement, setSelectedElement] = useState(null);
  const [currentColor, setCurrentColor] = useState(DEFAULT_COLOR);
  const [undoStack, setUndoStack] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showHelp, setShowHelp] = useState(false);
  const [recentColors, setRecentColors] = useState([]);
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPoint, setStartPanPoint] = useState({ x: 0, y: 0 });
  const [transform, setTransform] = useState({ x: 0, y: 0 });

  // Refs
  const originalSvgRef = useRef("");
  const svgContainerRef = useRef(null);
  const svgJsDraw = useRef(null);
  const hiddenColorInputRef = useRef(null);

  // Custom hooks
  const isMobile = useMobileDetection();

  // Reset state on new upload
  const resetOnUpload = useCallback((flattenedSvg) => {
    originalSvgRef.current = flattenedSvg;
    setUndoStack([]);
    setSelectedElement(null);
    setCurrentColor(DEFAULT_COLOR);
    setZoomLevel(1);
    setTransform({ x: 0, y: 0 });
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

  // Add color to recent colors
  const addRecentColor = useCallback((color) => {
    setRecentColors(prev => {
      const newColors = [color, ...prev.filter(c => c !== color)].slice(0, 8);
      return newColors;
    });
  }, []);

  // Handle panning start
  const handlePanStart = useCallback((e) => {
    if (!svgContainerRef.current || !isPanning) return;
    
    const rect = svgContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPanPoint({ x, y });
  }, [isPanning]);

  // Handle panning move
  const handlePanMove = useCallback((e) => {
    if (!svgContainerRef.current || !isPanning || !startPanPoint.x) return;
    
    const rect = svgContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const dx = x - startPanPoint.x;
    const dy = y - startPanPoint.y;
    
    setTransform(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    setStartPanPoint({ x, y });
  }, [isPanning, startPanPoint]);

  // Handle panning end
  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom in/out
  const handleZoom = useCallback((direction) => {
    setZoomLevel(prev => {
      const newZoom = direction === 'in' ? 
        Math.min(prev * 1.2, 5) : 
        Math.max(prev * 0.8, 0.5);
      return newZoom;
    });
  }, []);

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

      // Set styling for SVG container (keeping original size)
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

      // Add hover effect to show which element will be selected
      svgJsDraw.current.find(validTags.join(", ")).each(function () {
        const el = this;
        if (!el.attr("id")) return;

        el.off("mouseenter");
        el.off("mouseleave");

        el.on("mouseenter", () => {
          if (!isPanning) {
            el.node.style.outline = "2px dashed rgba(255,255,255,0.8)";
            el.node.style.outlineOffset = "2px";
          }
        });

        el.on("mouseleave", () => {
          el.node.style.outline = "";
          el.node.style.outlineOffset = "";
        });
      });

      // Add click handlers on SVG elements for color picking
      svgJsDraw.current.find(validTags.join(", ")).each(function () {
        const el = this;
        if (!el.attr("id")) return;

        el.off("click"); // remove any previous listeners

        el.on("click", (e) => {
          if (isPanning) return;
          
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
          addRecentColor(initialColor);
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
    [selectedElement, isPanning, addRecentColor]
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

  // Apply zoom and transform
  useEffect(() => {
    if (svgContainerRef.current && svgContent) {
      const svgElement = svgContainerRef.current.querySelector("svg");
      if (svgElement) {
        svgElement.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${zoomLevel})`;
        svgElement.style.transformOrigin = "center";
      }
    }
  }, [zoomLevel, transform, svgContent]);

  // Change selected element's fill/stroke color
  const handleColorChange = useCallback(
    (e) => {
      const newColor = e.target.value;
      setCurrentColor(newColor);
      addRecentColor(newColor);

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
    [selectedElement, addRecentColor]
  );

  // Apply color from recent colors
  const applyRecentColor = useCallback((color) => {
    setCurrentColor(color);
    if (!selectedElement || !svgJsDraw.current) return;

    const element = svgJsDraw.current.findOne(`#${selectedElement.id}`);
    if (!element) return;

    // Save current SVG to undo stack
    if (svgContainerRef.current) {
      const currentSvg =
        svgContainerRef.current.querySelector("svg")?.outerHTML;
      if (currentSvg) setUndoStack((prev) => [...prev, currentSvg]);
    }

    element[selectedElement.type](color);
    element.node.style[selectedElement.type] = color;

    const updatedSvg = new XMLSerializer().serializeToString(
      svgJsDraw.current.node
    );
    setSvgContent(updatedSvg);
  }, [selectedElement]);

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
    setZoomLevel(1);
    setTransform({ x: 0, y: 0 });
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
    if (!originalSvgRef.current) return;

    setUndoStack((prev) => [...prev, svgContent]);
    setSvgContent(originalSvgRef.current);
    setSelectedElement(null);
    setCurrentColor(DEFAULT_COLOR);
    setZoomLevel(1);
    setTransform({ x: 0, y: 0 });
  }, [svgContent]);

  return (
   <div className="flex justify-center items-start w-full min-h-screen animated-gradient-bg md: pt-10">
      {/* Main Content Container */}
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                SVG Color Editor
              </h1>
              <button 
                onClick={() => setShowHelp(!showHelp)}
                className="p-2 text-white hover:text-gray-200 transition-colors"
                aria-label="Help"
              >
                <FiInfo size={24} />
              </button>
            </div>
            <p className="text-white/90 mt-2">
              Upload an SVG and customize its colors
            </p>
          </div>

          {/* Help Panel */}
          {showHelp && (
            <div className="bg-blue-50 p-4 border-b border-blue-100">
              <h3 className="font-bold text-blue-800 mb-2">How to use:</h3>
              <ul className="list-disc pl-5 space-y-1 text-blue-700">
                <li>Drag & drop an SVG file or click to upload</li>
                <li>Click on any element to select it</li>
                <li>Change the color using the color picker</li>
                <li>Use the zoom and pan tools to navigate large SVGs</li>
                <li>Download your customized SVG/PNG/JPEG</li>
              </ul>
              <div className="mt-3 flex justify-end">
                <button 
                  onClick={() => setShowHelp(false)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Got it!
                </button>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Upload & Display Area - Same size as original */}
              <div className="flex-1">
                <div className="relative bg-gray-100 rounded-lg overflow-hidden "
                  style={{ height: "385px" }}>
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
                      onMouseDown={handlePanStart}
                      onMouseMove={handlePanMove}
                      onMouseUp={handlePanEnd}
                      onMouseLeave={handlePanEnd}
                      style={{ cursor: isPanning ? 'grabbing' : 'auto' }}
                    />
                  </UploadArea>

                  {svgContent && (
                    <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
                      <button
                        onClick={() => handleZoom('in')}
                        className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                        aria-label="Zoom in"
                      >
                        <MdOutlineZoomIn size={20} />
                      </button>
                      <button
                        onClick={() => handleZoom('out')}
                        className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                        aria-label="Zoom out"
                      >
                        <MdOutlineZoomOut size={20} />
                      </button>
                      <button
                        onMouseDown={() => setIsPanning(true)}
                        onMouseUp={() => setIsPanning(false)}
                        className={`p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors ${isPanning ? 'bg-gray-200' : ''}`}
                        aria-label="Pan tool"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setZoomLevel(1);
                          setTransform({ x: 0, y: 0 });
                        }}
                        className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors text-xs font-medium"
                        aria-label="Reset view"
                      >
                        1:1
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile Controls */}
                {isMobile && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      onClick={handleReset}
                      className="flex items-center justify-center gap-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
                    >
                      <LuRefreshCw className="w-4 h-4" /> Reset
                    </button>
                    <button
                      onClick={handleClear}
                      className="flex items-center justify-center gap-1 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-sm font-medium transition-colors"
                    >
                      <ImBin className="w-3.5 h-3.5" /> Clear
                    </button>
                    <button
                      onClick={handleUndo}
                      className="flex items-center justify-center gap-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
                    >
                      <FaUndo className="w-4 h-4" /> Undo
                    </button>
                  </div>
                )}
              </div>

              {/* Controls Panel */}
              <div className="lg:w-96 flex-shrink-0 ">
                <ColorControls
                  selectedElement={selectedElement}
                  currentColor={currentColor}
                  recentColors={recentColors}
                  onColorChange={handleColorChange}
                  onApplyRecentColor={applyRecentColor}
                  onReset={handleReset}
                  onClear={handleClear}
                  onUndo={handleUndo}
                />

                <DownloadButtons
                  onDownloadSVG={handleDownloadSVG}
                  onDownloadPNG={() => downloadImage("png")}
                  onDownloadJPEG={() => downloadImage("jpeg")}
                  disabled={!svgContent}
                />
              </div>
            </div>
          </div>
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
      </div>
    </div>
  );
};

export default ColorPicker;