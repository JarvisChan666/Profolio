
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, RefreshCcw, TrendingUp, PieChart, List, DollarSign, LineChart, History, Minus, Wallet, Undo2, Trash2 } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Transaction, Holding, TransactionType, PortfolioSummary, AIAnalysisResult, HistoryDataPoint } from './types';
import { INITIAL_TRANSACTIONS, MOCK_PRICES } from './constants';
import { TransactionModal } from './components/TransactionModal';
import { TransactionHistoryModal } from './components/TransactionHistoryModal';
import { ResetModal } from './components/ResetModal';
import { SummaryCard } from './components/SummaryCard';
import { AIInsights } from './components/AIInsights';
import { PerformanceChart } from './components/PerformanceChart';
import { analyzePortfolio, fetchLivePrices } from './services/geminiService';

// --- Helper Functions ---

// Calculates the current state of the portfolio including Cash Balance
const calculatePortfolioState = (transactions: Transaction[], prices: Record<string, number>) => {
  if (!transactions || transactions.length === 0) {
    return {
      holdings: [],
      summary: {
        totalInvested: 0,
        currentValue: 0,
        stockValue: 0,
        cashBalance: 0,
        totalProfit: 0,
        returnRate: 0
      }
    };
  }

  const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let netInvested = 0;
  let cashBalance = 0;
  const holdingsMap: Record<string, Holding> = {};

  sortedTx.forEach(t => {
    // Initialize holding if not exists
    if (!holdingsMap[t.symbol]) {
      holdingsMap[t.symbol] = {
        symbol: t.symbol,
        name: t.symbol,
        quantity: 0,
        averageCost: 0,
        currentPrice: prices[t.symbol] || t.price
      };
    }

    const h = holdingsMap[t.symbol];

    if (t.type === TransactionType.BUY) {
      const cost = t.quantity * t.price;
      
      // Smart Cash Logic: Use available cash first, then add new principal
      if (cashBalance >= cost) {
        cashBalance -= cost;
        // Invested amount doesn't change because we are reinvesting profits/capital
      } else {
        const remainingCost = cost - cashBalance;
        cashBalance = 0;
        netInvested += remainingCost;
      }

      // Weighted Average Cost Calculation
      const totalCost = (h.quantity * h.averageCost) + cost;
      const totalQuantity = h.quantity + t.quantity;
      h.averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
      h.quantity = totalQuantity;

    } else { // SELL
      const revenue = t.quantity * t.price;
      cashBalance += revenue; // Revenue goes to cash pile

      // Reduce quantity
      h.quantity -= t.quantity;
      if (h.quantity < 0) h.quantity = 0;
    }
  });

  const activeHoldings = Object.values(holdingsMap).filter(h => h.quantity > 0.0001);
  
  let stockValue = 0;
  activeHoldings.forEach(h => {
    stockValue += h.quantity * h.currentPrice;
  });

  const totalValue = stockValue + cashBalance;
  const totalProfit = totalValue - netInvested;
  const returnRate = netInvested > 0 ? (totalProfit / netInvested) * 100 : 0;

  return {
    holdings: activeHoldings,
    summary: {
      totalInvested: netInvested,
      currentValue: totalValue,
      stockValue,
      cashBalance,
      totalProfit,
      returnRate
    }
  };
};

const generateHistoryWithCashFlow = (transactions: Transaction[], currentPrices: Record<string, number>): HistoryDataPoint[] => {
  if (transactions.length === 0) return [];

  const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const startDate = new Date(sortedTx[0].date);
  
  let currentDate = new Date(startDate); 
  const today = new Date();

  const history: HistoryDataPoint[] = [];
  
  // Mock Price Generation (Backwards from current)
  const symbolHistory: Record<string, Record<string, number>> = {};
  const uniqueSymbols = Array.from(new Set(transactions.map(t => t.symbol)));
  
  uniqueSymbols.forEach(symbol => {
    symbolHistory[symbol] = {};
    let price = currentPrices[symbol] || 100;
    // Walk backwards 3000 days (covers most needs)
    for (let i = 0; i < 3000; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      symbolHistory[symbol][dateStr] = price;
      const change = (Math.random() * 0.041) - 0.02; 
      price = price / (1 + change); 
    }
  });

  // Re-simulate portfolio state day by day
  let runningInvested = 0;
  let runningCash = 0;
  const runningHoldings: Record<string, number> = {}; // Symbol -> Qty

  // Optimization: Pointer for transactions
  let txIndex = 0;

  while (currentDate <= today) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Process transactions for this day
    while (txIndex < sortedTx.length && sortedTx[txIndex].date <= dateStr) {
      const t = sortedTx[txIndex];
      if (!runningHoldings[t.symbol]) runningHoldings[t.symbol] = 0;

      if (t.type === TransactionType.BUY) {
        const cost = t.quantity * t.price;
        if (runningCash >= cost) {
          runningCash -= cost;
        } else {
          const needed = cost - runningCash;
          runningCash = 0;
          runningInvested += needed;
        }
        runningHoldings[t.symbol] += t.quantity;
      } else {
        const revenue = t.quantity * t.price;
        runningCash += revenue;
        runningHoldings[t.symbol] -= t.quantity;
        if (runningHoldings[t.symbol] < 0) runningHoldings[t.symbol] = 0;
      }
      txIndex++;
    }

    // Calculate daily valuation
    let dailyStockValue = 0;
    Object.keys(runningHoldings).forEach(sym => {
      const qty = runningHoldings[sym];
      if (qty > 0) {
        const price = symbolHistory[sym]?.[dateStr] || currentPrices[sym] || 100;
        dailyStockValue += qty * price;
      }
    });

    const totalValue = dailyStockValue + runningCash;
    
    // Only add data point if we have started investing
    if (runningInvested > 0) {
      history.push({
        date: dateStr,
        value: totalValue,
        invested: runningInvested,
        returnRate: ((totalValue - runningInvested) / runningInvested) * 100
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return history;
};

// --- Main Component ---

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [transactionHistoryStack, setTransactionHistoryStack] = useState<Transaction[][]>([]);
  
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>(MOCK_PRICES);
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<{symbol: string, price: number, type?: TransactionType} | null>(null);
  
  const [historySymbol, setHistorySymbol] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'holdings' | 'performance'>('overview');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Load cached prices on mount and check if we need to update
  useEffect(() => {
    const cachedData = localStorage.getItem('smart_sip_prices');
    if (cachedData) {
      try {
        const { date, prices } = JSON.parse(cachedData);
        setCurrentPrices(prices);
        setLastUpdated(date);
        
        const today = new Date().toISOString().split('T')[0];
        if (date !== today) {
           console.log("Cache expired, queuing update...");
           updatePrices(prices); 
        }
      } catch (e) {
        console.error("Failed to parse price cache", e);
      }
    } else {
       updatePrices(MOCK_PRICES);
    }
  }, []);

  // Derived State using the new logic
  const { holdings, summary: portfolioSummary } = useMemo(() => 
    calculatePortfolioState(transactions, currentPrices), 
  [transactions, currentPrices]);

  const historyData = useMemo(() => 
    generateHistoryWithCashFlow(transactions, currentPrices), 
  [transactions, currentPrices]);
  
  // State Management Handlers
  const saveStateToHistory = () => {
    setTransactionHistoryStack(prev => {
      // Keep max 20 steps
      const newStack = [...prev, transactions];
      if (newStack.length > 20) return newStack.slice(newStack.length - 20); 
      return newStack;
    });
  };

  const handleUndo = () => {
    if (transactionHistoryStack.length === 0) return;
    
    // Pop the last state
    const previousState = transactionHistoryStack[transactionHistoryStack.length - 1];
    setTransactions(previousState);
    
    // Update stack
    setTransactionHistoryStack(prev => prev.slice(0, prev.length - 1));
  };

  const handleResetConfirm = (options: { transactions: boolean; prices: boolean; ai: boolean; history: boolean }) => {
    if (options.transactions) {
      if (!options.history) {
        saveStateToHistory(); // Save before clearing if we aren't clearing history too
      }
      setTransactions([]);
    }

    if (options.prices) {
      localStorage.removeItem('smart_sip_prices');
      setCurrentPrices(MOCK_PRICES); // Reset to defaults
      setLastUpdated(null);
    }

    if (options.ai) {
      setAiAnalysis(null);
    }

    if (options.history) {
      setTransactionHistoryStack([]);
    }
  };

  // Handlers
  const handleAddTransaction = (data: { symbol: string; type: TransactionType; price: number; quantity: number; date: string }) => {
    saveStateToHistory();
    const newTx: Transaction = {
      id: Date.now().toString(),
      fees: 0,
      ...data
    };
    setTransactions(prev => [...prev, newTx]);
    
    setCurrentPrices(prev => ({
      ...prev,
      [data.symbol]: prev[data.symbol] || data.price
    }));
  };

  const handleDeleteTransaction = (id: string) => {
    saveStateToHistory();
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const openAddModal = () => {
    setModalInitialData(null);
    setIsModalOpen(true);
  };

  const openQuickSell = (symbol: string, currentPrice: number) => {
    setModalInitialData({ symbol, price: currentPrice, type: TransactionType.SELL });
    setIsModalOpen(true);
  };

  const updatePrices = async (currentKnownPrices: Record<string, number>) => {
    const symbols = Array.from(new Set(transactions.map(t => t.symbol)));
    if (symbols.length === 0) return;
    
    setAiLoading(true);
    const newPrices = await fetchLivePrices(symbols);
    
    if (newPrices) {
      const mergedPrices = { ...currentKnownPrices, ...newPrices };
      setCurrentPrices(mergedPrices);
      
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('smart_sip_prices', JSON.stringify({
        date: today,
        prices: mergedPrices
      }));
      setLastUpdated(today);
    }
    setAiLoading(false);
  };

  const handleManualPriceUpdate = () => {
    updatePrices(currentPrices);
  };

  const handleAnalyze = async () => {
    if (holdings.length === 0) return;
    setAiLoading(true);
    try {
      const result = await analyzePortfolio(holdings);
      setAiAnalysis(result);
    } catch (e) {
      // console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  // Chart Data: Include Cash in allocation if significant
  const allocationData = [
    ...holdings.map(h => ({
      name: h.symbol,
      value: h.quantity * h.currentPrice
    })),
    ...(portfolioSummary.cashBalance > 1 ? [{ name: 'Cash (Realized)', value: portfolioSummary.cashBalance }] : [])
  ];

  const COLORS = ['#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#64748B'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">SmartSIP</span>
            </div>
            
            <div className="flex gap-3 items-center">
              
              {/* Undo Button - Always visible, disabled if empty */}
              <button 
                onClick={handleUndo}
                disabled={transactionHistoryStack.length === 0}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  transactionHistoryStack.length === 0 
                    ? 'text-slate-600 cursor-not-allowed opacity-50' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Undo last action"
              >
                <Undo2 className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">Undo</span>
              </button>

              {/* Reset Button */}
              <button 
                onClick={() => setIsResetModalOpen(true)}
                className="flex items-center gap-2 text-slate-400 hover:text-rose-400 transition-colors px-3 py-2 rounded-lg hover:bg-slate-800"
                title="Reset Data"
              >
                <Trash2 className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">Reset</span>
              </button>

              <div className="h-6 w-px bg-slate-800 mx-1"></div>

              {/* Add Button */}
              <button 
                onClick={openAddModal}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Transaction</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard 
            title="Total Assets" 
            value={`$${portfolioSummary.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            subValue={portfolioSummary.cashBalance > 0 ? `Inc. $${portfolioSummary.cashBalance.toFixed(0)} Cash` : undefined}
            icon="dollar"
          />
          <SummaryCard 
            title="Net Invested" 
            value={`$${portfolioSummary.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            subValue="Out of Pocket"
            icon="dollar"
          />
          <SummaryCard 
            title="Total Profit" 
            value={`$${Math.abs(portfolioSummary.totalProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            subValue={portfolioSummary.totalProfit >= 0 ? 'All Time Gain' : 'All Time Loss'}
            trend={portfolioSummary.totalProfit >= 0 ? 'up' : 'down'}
            icon="chart"
          />
          <SummaryCard 
            title="Return Rate" 
            value={`${portfolioSummary.returnRate.toFixed(2)}%`}
            subValue="Money Weighted"
            trend={portfolioSummary.returnRate >= 0 ? 'up' : 'down'}
            icon="percent"
          />
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content (Left 2/3) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Tabs */}
            <div className="flex space-x-4 border-b border-slate-800 pb-2">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 pb-2 px-1 text-sm font-medium transition-colors relative ${activeTab === 'overview' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <PieChart className="w-4 h-4" />
                Overview
                {activeTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full" />}
              </button>
              <button 
                onClick={() => setActiveTab('performance')}
                className={`flex items-center gap-2 pb-2 px-1 text-sm font-medium transition-colors relative ${activeTab === 'performance' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <LineChart className="w-4 h-4" />
                Performance
                {activeTab === 'performance' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full" />}
              </button>
              <button 
                onClick={() => setActiveTab('holdings')}
                className={`flex items-center gap-2 pb-2 px-1 text-sm font-medium transition-colors relative ${activeTab === 'holdings' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <List className="w-4 h-4" />
                Holdings
                {activeTab === 'holdings' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full" />}
              </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[400px]">
                <h3 className="text-lg font-bold text-white mb-6">Asset Allocation</h3>
                {allocationData.length > 0 && allocationData.some(d => d.value > 0) ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart data={allocationData} colors={COLORS} />
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                    <PieChart className="w-12 h-12 mb-2 opacity-50" />
                    <p>No holdings yet. Add a transaction to see data.</p>
                  </div>
                )}
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && (
              <PerformanceChart data={historyData} />
            )}

            {/* Holdings Tab */}
            {activeTab === 'holdings' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                   <h3 className="text-lg font-bold text-white">Your Stocks</h3>
                   <div className="flex items-center gap-3">
                     {lastUpdated && <span className="text-xs text-slate-500">Updated: {lastUpdated}</span>}
                     <button 
                      onClick={handleManualPriceUpdate}
                      className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                     >
                       <RefreshCcw className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} />
                       {aiLoading ? 'Updating...' : 'Force Update'}
                     </button>
                   </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase font-medium">
                      <tr>
                        <th className="px-4 py-4">Symbol</th>
                        <th className="px-4 py-4 text-right">Qty</th>
                        <th className="px-4 py-4 text-right">Avg Cost</th>
                        <th className="px-4 py-4 text-right">Price</th>
                        <th className="px-4 py-4 text-right">Return</th>
                        <th className="px-4 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {holdings.map((h) => {
                        const totalVal = h.quantity * h.currentPrice;
                        const invested = h.quantity * h.averageCost;
                        const profit = totalVal - invested;
                        const percent = invested > 0 ? (profit / invested) * 100 : 0;
                        return (
                          <tr key={h.symbol} className="hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-4 font-bold text-white">
                                <div>{h.symbol}</div>
                                <div className="text-xs text-slate-500 font-normal">${totalVal.toLocaleString(undefined, {minimumFractionDigits: 0})}</div>
                            </td>
                            <td className="px-4 py-4 text-right text-slate-300">{h.quantity.toFixed(2)}</td>
                            <td className="px-4 py-4 text-right text-slate-300">${h.averageCost.toFixed(2)}</td>
                            <td className="px-4 py-4 text-right text-slate-300">${h.currentPrice.toFixed(2)}</td>
                            <td className={`px-4 py-4 text-right font-semibold ${percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {percent >= 0 ? '+' : ''}{percent.toFixed(2)}%
                            </td>
                            <td className="px-4 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button 
                                        onClick={() => openQuickSell(h.symbol, h.currentPrice)}
                                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                        title="Sell / Reduce"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => setHistorySymbol(h.symbol)}
                                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                        title="History / Delete"
                                    >
                                        <History className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                          </tr>
                        );
                      })}
                      {holdings.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                            No active holdings. Add a transaction to start.
                          </td>
                        </tr>
                      )}
                      {/* Cash Row */}
                      {portfolioSummary.cashBalance > 1 && (
                         <tr className="bg-slate-900/50 border-t border-slate-700">
                           <td className="px-4 py-4 font-bold text-white flex items-center gap-2">
                             <Wallet className="w-4 h-4 text-slate-400" />
                             Cash Balance
                           </td>
                           <td colSpan={5} className="px-4 py-4 text-right font-bold text-slate-200">
                             ${portfolioSummary.cashBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                           </td>
                         </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar (Right 1/3) */}
          <div className="space-y-8">
            <AIInsights 
              analysis={aiAnalysis} 
              loading={aiLoading} 
              onAnalyze={handleAnalyze} 
            />
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
               <h3 className="text-lg font-bold text-white mb-4">Recent Transactions</h3>
               <div className="space-y-4">
                  {transactions.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {t.type === 'BUY' ? <Plus className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-200">{t.symbol}</p>
                          <p className="text-xs text-slate-500">{t.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${t.type === 'BUY' ? 'text-slate-200' : 'text-slate-200'}`}>
                          {t.type === 'BUY' ? '-' : '+'}${(t.price * t.quantity).toFixed(0)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t.quantity} @ {t.price}
                        </p>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="text-center text-slate-500 text-sm">No transactions yet.</p>
                  )}
               </div>
            </div>
          </div>

        </div>
      </main>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleAddTransaction} 
        initialData={modalInitialData}
        holdings={holdings}
      />
      
      <TransactionHistoryModal 
        isOpen={!!historySymbol}
        onClose={() => setHistorySymbol(null)}
        symbol={historySymbol || ''}
        transactions={transactions.filter(t => t.symbol === historySymbol)}
        onDelete={handleDeleteTransaction}
      />

      <ResetModal 
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetConfirm}
      />

    </div>
  );
}

// Separate component for the Pie Chart to keep App clean
const RechartsPieChart = ({ data, colors }: { data: any[], colors: string[] }) => {
  return (
    <RechartsPie>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={80}
        paddingAngle={5}
        dataKey="value"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.name.includes('Cash') ? '#64748B' : colors[index % colors.length]} stroke="rgba(0,0,0,0)" />
        ))}
      </Pie>
      <RechartsTooltip 
        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f1f5f9' }}
        itemStyle={{ color: '#f1f5f9' }}
        formatter={(value: number) => `$${value.toFixed(2)}`}
      />
      <Legend verticalAlign="bottom" height={36} />
    </RechartsPie>
  );
}
