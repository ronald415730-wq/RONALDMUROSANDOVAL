import React, { useState } from 'react';
import { BrandKit, AdVariation, AnimationSettings, BannerStyle } from '../types';
import { Sparkles, Play, Layers, Clock, Wand2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { generateAdVariations } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface BannerGeneratorPanelProps {
  brandKit: BrandKit;
}

export const BannerGeneratorPanel: React.FC<BannerGeneratorPanelProps> = ({ brandKit }) => {
  const [productDescription, setProductDescription] = useState("Servicios de ingeniería especializada en defensas ribereñas y control de inundaciones.");
  const [productUrl, setProductUrl] = useState("https://ohla-group.com");
  const [customCta, setCustomCta] = useState("");
  const [variations, setVariations] = useState<AdVariation[]>([
    {
      id: "sample-1",
      headline: "Protección Ribereña Experta",
      description: "Ingeniería de vanguardia para la seguridad de comunidades y ecosistemas fluviales.",
      cta: "Consultar Ahora",
      visualPrompt: "Aerial view of a modern river defense system with clean concrete structures and green surroundings, professional photography.",
      style: "professional",
      designExplanation: "Utiliza una paleta sobria y tipografía sans-serif para transmitir confianza y autoridad técnica.",
      size: "300x250"
    },
    {
      id: "sample-2",
      headline: "Seguridad Fluvial Garantizada",
      description: "Construimos defensas duraderas que resisten los desafíos del clima extremo.",
      cta: "Ver Soluciones",
      visualPrompt: "Close-up of high-quality rock armor (enrocado) on a river bank, sunlight reflecting on water, vibrant colors.",
      style: "vibrant",
      designExplanation: "Colores contrastantes y un enfoque en la materialidad para resaltar la robustez de las obras.",
      size: "300x250"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>("sample-1");
  
  // Animation State
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>({
    style: "fade-in",
    duration: 1.5
  });

  const handleGenerate = async (count: number = 2) => {
    if (!productDescription) return;
    setIsLoading(true);
    try {
      const result = await generateAdVariations(productDescription, productUrl, brandKit, count, customCta);
      setVariations(result);
      if (result.length > 0) setSelectedVariationId(result[0].id);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedVariation = variations.find(v => v.id === selectedVariationId);

  const getAnimationStyle = (style: string, duration: number) => {
    switch (style) {
      case 'fade-in':
        return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration } };
      case 'slide-in-left':
        return { initial: { x: -100, opacity: 0 }, animate: { x: 0, opacity: 1 }, transition: { duration } };
      case 'slide-in-right':
        return { initial: { x: 100, opacity: 0 }, animate: { x: 0, opacity: 1 }, transition: { duration } };
      case 'pulse':
        return { animate: { scale: [1, 1.05, 1] }, transition: { duration, repeat: Infinity } };
      default:
        return {};
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Controls */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-800">Ad Campaign</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Description</label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[100px]"
                placeholder="Describe your product or service..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product URL (Optional)</label>
              <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="https://example.com/product"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Custom CTA (Optional)</label>
              <input
                type="text"
                value={customCta}
                onChange={(e) => setCustomCta(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="e.g., Shop Now and Save 20%"
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Button 
                onClick={() => handleGenerate(2)} 
                disabled={isLoading || !productDescription}
                className="w-full gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Generate A/B Pair
              </Button>
              <Button 
                onClick={() => handleGenerate(5)} 
                disabled={isLoading || !productDescription}
                variant="outline"
                className="w-full gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                Generate 5 Design Styles
              </Button>
            </div>
          </div>
        </div>

        {/* Animation Settings */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Play className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-800">Animation</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Style</label>
              <select
                value={animationSettings.style}
                onChange={(e) => setAnimationSettings({ ...animationSettings, style: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              >
                <option value="none">None</option>
                <option value="fade-in">Fade In</option>
                <option value="slide-in-left">Slide In Left</option>
                <option value="slide-in-right">Slide In Right</option>
                <option value="pulse">Pulse Effect</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-slate-700">Duration</label>
                <span className="text-xs text-slate-500">{animationSettings.duration}s</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={animationSettings.duration}
                onChange={(e) => setAnimationSettings({ ...animationSettings, duration: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Design Explanation */}
        {selectedVariation?.designExplanation && (
          <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
            <h3 className="text-sm font-bold text-indigo-900 mb-2 uppercase tracking-wider">Design Strategy</h3>
            <p className="text-xs text-indigo-800 leading-relaxed italic">
              "{selectedVariation.designExplanation}"
            </p>
          </div>
        )}
      </div>

      {/* Right Column: Preview & Variations */}
      <div className="lg:col-span-8 space-y-6">
        {/* A/B Variation Selector */}
        {variations.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {variations.map((v, idx) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariationId(v.id)}
                className={`p-3 rounded-xl border-2 transition-all text-left ${
                  selectedVariationId === v.id 
                    ? 'border-indigo-600 bg-indigo-50' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Var {idx + 1}</span>
                  {selectedVariationId === v.id && <CheckCircle2 className="w-3 h-3 text-indigo-600" />}
                </div>
                <h3 className="text-xs font-semibold text-slate-800 truncate">{v.style}</h3>
                <p className="text-[10px] text-slate-500 line-clamp-1">{v.size || '300x250'}</p>
              </button>
            ))}
          </div>
        )}

        {/* Ad Preview Area */}
        <div className="bg-slate-100 rounded-3xl p-8 border border-slate-200 min-h-[500px] flex items-center justify-center relative overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedVariation ? (
              <motion.div
                key={selectedVariation.id + animationSettings.style}
                {...getAnimationStyle(animationSettings.style, animationSettings.duration)}
                className="w-full max-w-2xl bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col md:flex-row"
                style={{ fontFamily: brandKit.fontFamily }}
              >
                {/* Visual Side */}
                <div className="md:w-1/2 h-64 md:h-auto relative bg-slate-200">
                  <img 
                    src={`https://picsum.photos/seed/${selectedVariation.id}/800/800`} 
                    alt="Ad Visual" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {brandKit.logo && (
                    <div className="absolute top-4 left-4 w-12 h-12 bg-white/90 backdrop-blur p-2 rounded-lg shadow-sm">
                      <img src={brandKit.logo} alt="Brand Logo" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
                
                {/* Content Side */}
                <div className="md:w-1/2 p-8 flex flex-col justify-center space-y-6">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold leading-tight text-slate-900" style={{ color: brandKit.primaryColor }}>
                      {selectedVariation.headline}
                    </h1>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {selectedVariation.description}
                    </p>
                  </div>
                  
                  <button 
                    className="px-6 py-3 rounded-full font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                    style={{ backgroundColor: brandKit.secondaryColor }}
                  >
                    {selectedVariation.cta}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto">
                  <Layers className="w-8 h-8 text-slate-300" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-slate-800 font-medium">No Ad Generated</h3>
                  <p className="text-slate-500 text-sm">Enter a product description to generate variations.</p>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* Style Badge */}
          {selectedVariation && (
            <div className="absolute top-4 right-4 flex gap-2">
              <div className="px-3 py-1 bg-white/50 backdrop-blur rounded-full text-[10px] font-bold text-slate-600 uppercase tracking-widest border border-white/20">
                Size: {selectedVariation.size || '300x250'}
              </div>
              <div className="px-3 py-1 bg-white/50 backdrop-blur rounded-full text-[10px] font-bold text-slate-600 uppercase tracking-widest border border-white/20">
                Style: {selectedVariation.style}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
