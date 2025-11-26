import React from 'react';
import { X, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Transaction, TransactionType } from '../types';

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  symbol: string;
  onDelete: (id: string) => void;
}

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  transactions, 
  symbol,
  onDelete 
}) => {
  if (!isOpen) return null;

  // Sort by date descending
  const sortedTx = [...transactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">{symbol} History</h2>
            <p className="text-slate-400 text-sm">Review or delete records</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4 space-y-3">
          {sortedTx.length > 0 ? (
            sortedTx.map(t => (
              <div key={t.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${t.type === TransactionType.BUY ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {t.type === TransactionType.BUY ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm px-2 py-0.5 rounded ${t.type === TransactionType.BUY ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {t.type}
                      </span>
                      <span className="text-slate-300 font-medium">{t.date}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {t.quantity} shares @ ${t.price.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-white font-bold">${(t.quantity * t.price).toFixed(2)}</p>
                    <p className="text-xs text-slate-500">Total</p>
                  </div>
                  <button 
                    onClick={() => {
                        if(window.confirm('Are you sure you want to delete this transaction? This will recalculate your portfolio.')) {
                            onDelete(t.id);
                        }
                    }}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                    title="Delete Transaction"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              No transactions found for this symbol.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};