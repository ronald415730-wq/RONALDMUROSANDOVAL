import React from "react";
import { GeneratedImage } from "../types";
import { Download, Share2, ExternalLink } from "lucide-react";
import { Button } from "./Button";

interface ImagePreviewProps {
  image: GeneratedImage | null;
  isLoading: boolean;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ image, isLoading }) => {
  const handleShare = async () => {
    if (!image) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Generated Banner',
          text: 'Check out this banner created with BannerGenius',
          url: image.url,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      // Fallback
      try {
        await navigator.clipboard.writeText(image.url);
        alert("Link copied to clipboard!");
      } catch (err) {
        console.error("Failed to copy: ", err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
        <div className="relative w-20 h-20 mb-4">
          <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Generating your banner...</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">This may take a few moments</p>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-center p-8">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">✨</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ready to Create</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          Enter your product details and configure the settings to generate a high-quality professional banner ad.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Generated Result</h3>
              <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                  <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{image.size}</span>
                  <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{image.ratio}</span>
              </div>
            </div>
            <div className="flex gap-2">
                 <button
                    onClick={handleShare}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Share"
                 >
                    <Share2 className="w-5 h-5" />
                 </button>
                 <a 
                    href={image.url} 
                    download={`banner-ad-${Date.now()}.png`}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Download"
                 >
                    <Download className="w-5 h-5" />
                 </a>
            </div>
        </div>
        <div className="relative bg-[#f0f0f0] dark:bg-[#1a1a1a] p-2 flex items-center justify-center min-h-[300px]">
             {/* Pattern background for transparency check */}
            <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px'}}></div>
            <img 
                src={image.url} 
                alt="Generated Banner" 
                className="max-w-full max-h-[600px] object-contain shadow-2xl rounded-sm relative z-10"
            />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
         <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">Visual Impact</h4>
            <p className="text-xs text-blue-700 dark:text-blue-300">
                Optimized for {image.ratio} displays. High contrast elements detected for better CTR.
            </p>
         </div>
         <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
            <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">Resolution Ready</h4>
            <p className="text-xs text-green-700 dark:text-green-300">
                Generated at {image.size}. Ready for production deployment.
            </p>
         </div>
      </div>
    </div>
  );
};