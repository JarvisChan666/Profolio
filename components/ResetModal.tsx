import React, { useState } from 'react';
import { X, Trash2, CheckSquare, Square, RefreshCcw, Database, History, Sparkles } from 'lucide-react';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: { transactions: boolean; prices: boolean; ai: boolean; history: boolean }) => void;
}

export const ResetModal: React.FC<ResetModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [options, setOptions] = useState({
    transactions: true,
    prices: false,
    ai: false,
    history: false
  });

  if (!isOpen) return null;

  const toggleOption = (key: keyof typeof options) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirm = () => {
    onConfirm(options);
    onClose();
  };

  const OptionItem = ({ 
    id, 
    label, 
    subLabel, 
    icon: Icon 
  }: { 
    id: keyof typeof options, 
    label: string, 
    subLabel: string, 
    icon: React.ElementType 
  }) => (
    <div 
      onClick={() => toggleOption(id)}
      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
        options[id] 
          ? 'bg-rose-500/10 border-rose-500/50' 
          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className={`mt-1 ${options[id] ? 'text-rose-400' : 'text-slate-500'}`}>
        {options[id] ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-4 h-4 ${options[id] ? 'text-rose-400' : 'text-slate-400'}`} />
          <span className={`font-bold ${options[id] ? 'text-white' : 'text-slate-300'}`}>{label}</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{subLabel}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-500" />
            Reset Data
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-3">
          <p className="text-slate-400 text-sm mb-4">Select the data you want to clear permanently:</p>
          
          <OptionItem 
            id="transactions" 
            label="Portfolio Transactions" 
            subLabel="Clears all buy/sell records. This resets your Total Assets and Profit calculations."
            icon={Database}
          />
          
          <OptionItem 
            id="prices" 
            label="Cached Market Prices" 
            subLabel="Clears locally stored stock prices. Prices will re-fetch from the API next time."
            icon={RefreshCcw}
          />

          <OptionItem 
            id="ai" 
            label="AI Insights" 
            subLabel="Clears the generated Gemini analysis report."
            icon={Sparkles}
          />

          <OptionItem 
            id="history" 
            label="Undo History" 
            subLabel="Clears the stack of previous actions. You won't be able to undo after this."
            icon={History}
          />
        </div>

        <div className="p-6 pt-2">
          <button
            onClick={handleConfirm}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-900/20 transition-all active:scale-[0.98]"
          >
            Confirm Reset
          </button>
        </div>
      </div>
    </div>
  );
};