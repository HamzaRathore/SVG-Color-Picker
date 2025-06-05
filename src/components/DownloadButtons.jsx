import React from "react";

const DownloadButtons = ({ onDownloadSVG, onDownloadPNG, onDownloadJPEG }) => {
  return (
    <div className="flex flex-col md:flex-row mt-6 md:mt-8 gap-4">
      <button
        className="bg-[#283038] text-white py-2 px-4 rounded-md hover:cursor-pointer font-semibold hover:scale-105 duration-150 transition"
        onClick={onDownloadSVG}
      >
        Download SVG
      </button>
      <button
        className="bg-[#283038] text-white py-2 px-4 rounded-md hover:cursor-pointer font-semibold hover:scale-105 duration-150 transition"
         onClick={onDownloadPNG}
      >
        Download PNG
      </button>
      <button
        className="bg-[#283038] text-white py-2 px-4 rounded-md hover:cursor-pointer font-semibold hover:scale-105 duration-150 transition"
         onClick={onDownloadJPEG}
      >
        Download JPG
      </button>
    </div>
  );
};

export default DownloadButtons;