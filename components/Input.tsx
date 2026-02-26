import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = "", ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        className={`w-full px-3 py-2 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none transition-all ${
          error 
            ? "border-red-500 focus:ring-red-500" 
            : "border-gray-300 dark:border-gray-700"
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, className = "", ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <textarea
        className={`w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none transition-all min-h-[100px] resize-y ${className}`}
        {...props}
      />
    </div>
  );
};