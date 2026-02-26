import React from "react";
import { GeneratedImage } from "../types";
import { Download, ExternalLink } from "lucide-react";

interface ImageGridProps {
  images: GeneratedImage[];
  isLoading: boolean;
  expectedCount: number;
}

export const ImageGrid: React.FC<ImageGridProps> = ({ images, isLoading, expectedCount }) => {
  if (isLoading && images.length === 0) {
     // Initial Loading State for Grid
     return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: expectedCount }).map((_, i) => (
                <div key={i} className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse flex flex-col items-center justify-center border border-gray-200 dark:border-gray-700">
                    <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-gray-400 mt-2">Generating Variation {i + 1}...</span>
                </div>
            ))}
        </div>
     )
  }

  if (images.length === 0) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-center p-8">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">✨</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ready to Create</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          Select a template, enter your product details, and generate multiple high-quality variations instantly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {images.map((image, index) => (
          <div key={image.id} className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/30">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Variation {index + 1}</span>
              <div className="flex gap-2">
                <a 
                    href={image.url} 
                    download={`banner-ad-${index}-${Date.now()}.png`}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Download"
                >
                    <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
            
            <div className="relative bg-[#f0f0f0] dark:bg-[#1a1a1a] flex-1 flex items-center justify-center min-h-[200px] p-2">
                 <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px'}}></div>
                 <img 
                    src={image.url} 
                    alt={`Variation ${index + 1}`} 
                    className="max-w-full max-h-[300px] object-contain shadow-lg rounded-sm relative z-10"
                />
            </div>
            
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2 flex-wrap text-[10px] text-gray-500">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">{image.size}</span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">{image.ratio}</span>
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 rounded-full">{image.style}</span>
                </div>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="aspect-video bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <span className="text-sm text-gray-400">Generating more...</span>
            </div>
        )}
      </div>
    </div>
  );
};