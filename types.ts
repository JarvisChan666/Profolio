
export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL'
}

export interface Transaction {
  id: string;
  symbol: string;
  type: TransactionType;
  date: string;
  price: number;
  quantity: number;
  fees: number;
}

export interface Holding {
  symbol: string;
  name: string; // derived or user entered
  quantity: number;
  averageCost: number;
  currentPrice: number;
  sector?: string;
}

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  totalProfit: number;
  returnRate: number;
  cashBalance: number;
  stockValue: number;
}

export interface AIAnalysisResult {
  summary: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  suggestions: string[];
}

export interface HistoryDataPoint {
  date: string;
  value: number; // Portfolio total value (Stock + Cash)
  invested: number; // Net principal invested
  returnRate: number; // Percentage return
}
