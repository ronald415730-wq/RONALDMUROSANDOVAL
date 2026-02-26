import React from "react";
import { AspectRatio, ImageSize, BannerStyle } from "../types";
import { ASPECT_RATIOS, IMAGE_SIZES, BANNER_STYLES } from "../constants";
import { Settings, Monitor, Maximize, Palette, Copy } from "lucide-react";

interface SettingsPanelProps {
  aspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;
  imageSize: ImageSize;
  setImageSize: (size: ImageSize) => void;
  bannerStyle: BannerStyle;
  setBannerStyle: (style: BannerStyle) => void;
  variationCount: number;
  setVariationCount: (count: number) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  aspectRatio,
  setAspectRatio,
  imageSize,
  setImageSize,
  bannerStyle,
  setBannerStyle,
  variationCount,
  setVariationCount,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-8">
      <div className="flex items-center gap-2 pb-4 border-b border-gray-200 dark:border-gray-700">
        <Settings className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configuration</h2>
      </div>

      {/* Style Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Palette className="w-4 h-4" />
          <span>Banner Style Template</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BANNER_STYLES.map((style) => (
            <button
              key={style.value}
              onClick={() => setBannerStyle(style.value)}
              className={`p-3 text-sm rounded-lg border transition-all text-left flex flex-col gap-1 ${
                bannerStyle === style.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400"
              }`}
            >
              <span className="font-semibold">{style.label}</span>
              <span className="text-xs opacity-80">{style.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Variation Count */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Copy className="w-4 h-4" />
          <span>Variations</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((count) => (
            <button
              key={count}
              onClick={() => setVariationCount(count)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
                variationCount === count
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400"
              }`}
            >
              {count} {count === 1 ? 'Version' : 'Versions'}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Generate multiple options to A/B test different visuals.
        </p>
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Maximize className="w-4 h-4" />
          <span>Aspect Ratio</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.value}
              onClick={() => setAspectRatio(ratio.value)}
              className={`px-3 py-2 text-sm rounded-lg border transition-all text-center ${
                aspectRatio === ratio.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400"
              }`}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resolution */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Monitor className="w-4 h-4" />
          <span>Resolution</span>
        </div>
        <div className="flex gap-2">
          {IMAGE_SIZES.map((size) => (
            <button
              key={size.value}
              onClick={() => setImageSize(size.value)}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${
                imageSize === size.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400"
              }`}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};