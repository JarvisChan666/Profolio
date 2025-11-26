import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Hash, Tag, AlertCircle } from 'lucide-react';
import { TransactionType, Holding } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: { symbol: string; type: TransactionType; price: number; quantity: number; date: string }) => void;
  initialData?: { symbol: string; price: number; type?: TransactionType } | null;
  holdings: Holding[]; // Need holdings to validate sell quantity
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, initialData, holdings }) => {
  const [symbol, setSymbol] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>(TransactionType.BUY);
  const [error, setError] = useState<string | null>(null);

  // Reset or pre-fill form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setSymbol(initialData.symbol);
        setPrice(initialData.price.toString());
        setType(initialData.type || TransactionType.BUY);
      } else {
        setSymbol('');
        setPrice('');
        setType(TransactionType.BUY);
      }
      setQuantity('');
      setDate(new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [isOpen, initialData]);

  // Determine max sellable quantity dynamically based on symbol input
  const currentHolding = holdings.find(h => h.symbol === symbol.toUpperCase());
  const maxSellable = currentHolding ? currentHolding.quantity : 0;

  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    if (type === TransactionType.SELL) {
      if (currentHolding && parseFloat(val) > currentHolding.quantity) {
        setError(`Insufficient holdings. Max: ${currentHolding.quantity}`);
      } else {
        setError(null);
      }
    }
  };

  const setMaxQuantity = () => {
    if (maxSellable > 0) {
      setQuantity(maxSellable.toString());
      setError(null);
    }
  };

  // Re-validate when type changes
  useEffect(() => {
    if (type === TransactionType.BUY) {
      setError(null);
    } else if (type === TransactionType.SELL && quantity) {
      if (!currentHolding || parseFloat(quantity) > currentHolding.quantity) {
        setError(`Insufficient holdings. Max: ${maxSellable}`);
      }
    }
  }, [type, symbol]); // eslint-disable-line react-hooks/exhaustive-deps


  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final Validation
    if (type === TransactionType.SELL) {
       if (!currentHolding) {
         setError("You don't own this stock.");
         return;
       }
       if (parseFloat(quantity) > maxSellable) {
         setError(`Cannot sell more than you own (${maxSellable}).`);
         return;
       }
    }

    onSave({
      symbol: symbol.toUpperCase(),
      type,
      price: parseFloat(price),
      quantity: parseFloat(quantity),
      date
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Quick Action' : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setType(TransactionType.BUY)}
              className={`py-2 text-sm font-semibold rounded-md transition-all ${type === TransactionType.BUY ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Buy / SIP
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.SELL)}
              className={`py-2 text-sm font-semibold rounded-md transition-all ${type === TransactionType.SELL ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Sell / Reduce
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">Stock Symbol</label>
              <div className="relative">
                <Tag className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="e.g. AAPL, TSLA"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all uppercase placeholder-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">Price per Share</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1 ml-1">
                  <label className="block text-xs font-medium text-slate-400">Quantity</label>
                  {type === TransactionType.SELL && (
                    <button 
                      type="button"
                      onClick={setMaxQuantity}
                      className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider"
                    >
                      Max: {maxSellable.toFixed(2)}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    placeholder="0"
                    className={`w-full bg-slate-800 border text-white rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 outline-none transition-all ${error ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:ring-blue-500 focus:border-transparent'}`}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!!error}
            className={`w-full mt-6 text-white font-bold py-3 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${type === TransactionType.BUY ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'}`}
          >
            {type === TransactionType.BUY ? 'Confirm Buy' : 'Confirm Sell'}
          </button>
        </form>
      </div>
    </div>
  );
};