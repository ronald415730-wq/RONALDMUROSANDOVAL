

import React, { useState } from "react";
import { Sparkles, ArrowRight, Lightbulb } from "lucide-react";
import { Button } from "./Button";
import { generateCopySuggestions } from "../services/geminiService";
import { CopySuggestion } from "../types";

interface CopyAssistantProps {
  description: string;
  onApply: (suggestion: CopySuggestion) => void;
  apiKeyReady: boolean;
  onSelectKey: () => void;
}

export const CopyAssistant: React.FC<CopyAssistantProps> = ({ 
  description, 
  onApply,
  apiKeyReady,
  onSelectKey
}) => {
  const [suggestions, setSuggestions] = useState<CopySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleGenerateCopy = async () => {
    if (!apiKeyReady) {
      onSelectKey();
      return;
    }
    
    setLoading(true);
    setShowSuggestions(true);
    try {
      const results = await generateCopySuggestions(description);
      setSuggestions(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!description.trim() && !showSuggestions) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-lg p-4 mt-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">AI Copywriter</h3>
        </div>
        <Button 
          variant="outline" 
          onClick={handleGenerateCopy} 
          isLoading={loading}
          disabled={!description.trim()}
          className="text-xs py-1 h-8 bg-white dark:bg-gray-800"
        >
          {suggestions.length > 0 ? "Regenerate Ideas" : "Generate Copy Ideas"}
        </Button>
      </div>

      {showSuggestions && suggestions.length === 0 && !loading && (
         <p className="text-xs text-gray-500 italic">Enter a product description to generate ideas.</p>
      )}

      {loading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-10 bg-white/50 dark:bg-gray-700/50 rounded-md w-full"></div>
          <div className="h-10 bg-white/50 dark:bg-gray-700/50 rounded-md w-full"></div>
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((item, idx) => (
            <div 
              key={idx} 
              className="group bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer relative"
              onClick={() => onApply(item)}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100"><span className="text-gray-400 text-xs mr-1">H:</span> {item.headline}</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium"><span className="text-gray-400 text-xs mr-1">CTA:</span> {item.cta}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-50 dark:bg-indigo-900/50 p-1.5 rounded-full text-indigo-600 dark:text-indigo-300">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-center text-gray-400 mt-2">Click a suggestion to apply it to your ad.</p>
        </div>
      )}
    </div>
  );
};
