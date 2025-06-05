import { useState, useCallback, useRef } from 'react';
import { isValidSVG, flattenSvgStyles } from '../utils/svgHelper'; // Make sure this path is correct

const useFileUpload = (onSvgContentLoad, onFileUploadReset) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null); // Ref for the hidden file input element

  // Handles the actual file processing after selection or drop
  const processFile = useCallback((file) => {
    if (!file) return;

    if (!isValidSVG(file)) {
      alert("Please upload a valid SVG file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const flattenedSvg = flattenSvgStyles(event.target.result);
      onSvgContentLoad(flattenedSvg); // Load SVG content
      onFileUploadReset(flattenedSvg);           // Reset relevant states
    };
    reader.readAsText(file);
  }, [onSvgContentLoad, onFileUploadReset]); // Dependencies for useCallback

  // Handles file selection from the input element
  const handleFileChange = useCallback((e) => {
    processFile(e?.target?.files?.[0]);
    e.target.value = null;
  }, [processFile]);

  // Drag and drop event handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation(); // Necessary to allow a drop
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFile(e?.dataTransfer?.files?.[0]); // Process the dropped file
  }, [processFile]);

  // Function to programmatically trigger the hidden file input click
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    isDragging,
    fileInputRef,
    handleFileChange, // Use this for the actual file input's onChange
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    triggerFileInput,
  };
};

export default useFileUpload;