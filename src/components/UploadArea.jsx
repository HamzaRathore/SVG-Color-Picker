import React from "react";
import { MdOutlineUploadFile } from "react-icons/md";

const UploadArea = ({
  isDragging,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onClick,
  hasContent,
  children,
}) => {
  return (
    <div
      className={`border-2 border-dashed ${
        isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
      } h-96 w-full max-w-[450px] items-center rounded-xl relative`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {hasContent ? (
        children
      ) : (
        <div
          className="flex flex-col items-center justify-center h-full gap-4 cursor-pointer"
          onClick={onClick}
        >
          <MdOutlineUploadFile className="w-20 h-20 block text-gray-400" />
          <p className="text-center text-black">Click or drag file to upload</p>
        </div>
      )}
    </div>
  );
};

export default UploadArea;
