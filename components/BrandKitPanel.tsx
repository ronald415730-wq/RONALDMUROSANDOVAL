import React from 'react';
import { BrandKit } from '../types';
import { Palette, Type, Upload, X } from 'lucide-react';
import { Button } from './Button';

interface BrandKitPanelProps {
  brandKit: BrandKit;
  onUpdate: (updates: Partial<BrandKit>) => void;
}

export const BrandKitPanel: React.FC<BrandKitPanelProps> = ({ brandKit, onUpdate }) => {
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({ logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 mb-6">
        <Palette className="w-5 h-5 text-indigo-600" />
        <h2 className="text-xl font-semibold text-slate-800">Brand Kit</h2>
      </div>

      <div className="space-y-6">
        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Brand Logo</label>
          <div className="flex items-center gap-4">
            {brandKit.logo ? (
              <div className="relative w-24 h-24 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                <img src={brandKit.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                <button
                  onClick={() => onUpdate({ logo: undefined })}
                  className="absolute top-1 right-1 p-1 bg-white/80 rounded-full hover:bg-white text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors">
                <Upload className="w-6 h-6 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Upload</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>
            )}
            <div className="text-xs text-slate-500">
              <p>Recommended: PNG or SVG</p>
              <p>Max size: 2MB</p>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brandKit.primaryColor}
                onChange={(e) => onUpdate({ primaryColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border-none"
              />
              <input
                type="text"
                value={brandKit.primaryColor}
                onChange={(e) => onUpdate({ primaryColor: e.target.value })}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="#000000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Secondary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brandKit.secondaryColor}
                onChange={(e) => onUpdate({ secondaryColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border-none"
              />
              <input
                type="text"
                value={brandKit.secondaryColor}
                onChange={(e) => onUpdate({ secondaryColor: e.target.value })}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="#000000"
              />
            </div>
          </div>
        </div>

        {/* Fonts */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Font</label>
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-slate-400" />
            <select
              value={brandKit.fontFamily}
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="Inter, sans-serif">Inter (Modern Sans)</option>
              <option value="'Playfair Display', serif">Playfair Display (Elegant Serif)</option>
              <option value="'JetBrains Mono', monospace">JetBrains Mono (Technical)</option>
              <option value="'Space Grotesk', sans-serif">Space Grotesk (Tech-forward)</option>
              <option value="'Montserrat', sans-serif">Montserrat (Geometric)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
