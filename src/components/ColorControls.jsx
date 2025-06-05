import React from "react";
import { ImBin } from "react-icons/im";
import { FaUndo } from "react-icons/fa";
import { LuRefreshCw } from "react-icons/lu";
import { parseColor } from "../utils/svgHelper";

const ColorControls = ({
  currentColor,
  onColorChange,
  onClear,
  onUndo,
  onReset,
}) => {
  const displayColor = parseColor(currentColor);

  return (
    <div className="flex flex-col border-2 border-gray-300 rounded-xl bg-white w-40 h-60 shadow-lg">
      <div className="border-b-2 flex md:flex-col md:items-start items-center bg-gray-100 rounded-t-lg border-gray-300 p-4 h-30">
        <label htmlFor="color" className="text-black font-bold mr-2">
          Color:
        </label>
        <div className="rounded-2xl overflow-hidden w-10 h-10 ">
          <input
            type="color"
            id="color"
            name="color"
            value={displayColor}
            onChange={onColorChange}
            className="w-full h-full p-0 border-none cursor-pointer"
          />
        </div>

        <span className="text-black font-bold ml-2 md:ml-0">
          {displayColor}
        </span>
      </div>

      <div className="flex flex-col items-center gap-2 justify-center h-30 p-4">
        <button
          className="flex items-center gap-1 underline hover:cursor-pointer text-sm"
          onClick={onReset}
        >
          Reset <LuRefreshCw className="h-3.5 w-3.5" />
        </button>
        <button
          className="flex items-center gap-1 underline pl-1 hover:cursor-pointer text-sm"
          onClick={onClear}
        >
          Delete <ImBin className="h-3 w-3" />
        </button>
        <button
          className="flex items-center gap-1 underline hover:cursor-pointer text-sm"
          onClick={onUndo}
        >
          Undo <FaUndo className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default ColorControls;
