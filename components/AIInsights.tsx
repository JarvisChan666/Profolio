import React from 'react';
import { Sparkles, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { AIAnalysisResult } from '../types';

interface AIInsightsProps {
  analysis: AIAnalysisResult | null;
  loading: boolean;
  onAnalyze: () => void;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ analysis, loading, onAnalyze }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-white">Gemini Portfolio Insights</h3>
        </div>
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-full transition-all flex items-center gap-2"
        >
          {loading ? 'Analyzing...' : 'Analyze Now'}
          {!loading && <Sparkles className="w-3 h-3" />}
        </button>
      </div>

      {!analysis && !loading && (
        <p className="text-slate-400 text-sm">
          Use AI to analyze your portfolio's diversification, risk exposure, and get actionable rebalancing suggestions.
        </p>
      )}

      {analysis && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
            <p className="text-slate-200 text-sm leading-relaxed">{analysis.summary}</p>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex items-center gap-3">
              <Shield className={`w-8 h-8 ${
                analysis.riskLevel === 'Low' ? 'text-emerald-400' :
                analysis.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-rose-400'
              }`} />
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Risk Level</p>
                <p className="text-white font-bold">{analysis.riskLevel}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs text-slate-500 uppercase font-bold mb-2 flex items-center gap-2">
              <CheckCircle className="w-3 h-3" />
              Suggestions
            </h4>
            <ul className="space-y-2">
              {analysis.suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-sm text-slate-300 pl-4 border-l-2 border-indigo-500/30">
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
