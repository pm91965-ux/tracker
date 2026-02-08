export interface RecurringItem {
  id: string;
  name: string;
  amount: number; // Positive for Income, Negative for Expense
  day?: number; // 1-31 (Optional, derived from startDate if not provided in form)
  startDate?: string; // YYYY-MM-DD (Optional start date for recurring items)
  type: 'recurring'; // Explicitly define type
}

export interface OneOffItem {
  id: string;
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: 'one-off'; // Explicitly define type
}

export interface MonthlyOverride {
  id: string;
  recurringItemId: string; // Link to the original recurring item
  originalDate: string; // YYYY-MM-DD of the instance being overridden
  newAmount?: number;
  newDate?: string; // Optional: if the date is also changed
  type: 'override';
}

export interface FinanceData {
  recurring: RecurringItem[];
  oneOffs: OneOffItem[];
  overrides: MonthlyOverride[];
}

export interface MonthCycle {
  label: string; // "Feb 20 - Mar 19"
  startDate: string;
  endDate: string;
  items: {
    id: string;
    date: string;
    name: string;
    amount: number;
    type: 'recurring' | 'one-off';
  }[];
  startBalance: number;
  endBalance: number;
}

export interface MonthlySummary {
  monthLabel: string; // e.g., "February 2026"
  monthStart: string; // YYYY-MM-DD (start of calendar month)
  monthEnd: string;   // YYYY-MM-DD (end of calendar month)
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

export interface MonthlyOverviewData {
  year: number;
  months: MonthlySummary[];
}
