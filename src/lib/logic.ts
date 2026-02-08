import { FinanceData, MonthCycle, MonthlySummary } from './types';
import { 
  isAfter, 
  isBefore, 
  addMonths, 
  setDate, 
  format, 
  parseISO, 
  startOfDay, 
  addDays, 
  startOfMonth, // New import
  endOfMonth,   // New import
  eachMonthOfInterval, // New import
} from 'date-fns';

// Helper to get cycle bounds given a reference date
export const getCycleBounds = (refDate: Date) => {
  // If date is >= 20th, cycle start is this month 20th.
  // If date is < 20th, cycle start is prev month 20th.
  let startMonth = refDate;
  if (refDate.getDate() < 20) {
    startMonth = addMonths(refDate, -1);
  }
  
  const start = startOfDay(setDate(startMonth, 20));
  const end = startOfDay(addMonths(start, 1));
  // End date is actually the 20th of next month (exclusive) or 19th (inclusive).
  // Let's use exclusive upper bound for easier math: [Start, End)
  
  return { start, end };
};

export const calculateCycle = (data: FinanceData, refDate: Date = new Date()): MonthCycle => {
  const { start, end } = getCycleBounds(refDate);
  const items: MonthCycle['items'] = [];

  // 1. Process Recurring
  data.recurring.forEach(rec => {
    // If startDate is defined and is in the future relative to the current cycle's end, skip this recurring item.
    if (rec.startDate && isBefore(end, parseISO(rec.startDate))) {
      return; 
    }

    // Determine the date of this recurring item within the cycle
    // Example Cycle: Feb 20 - Mar 20
    // Rec Day: 25 -> Feb 25
    // Rec Day: 5 -> Mar 5
    
    let itemDate = setDate(start, rec.day || 1);
    
    // If setting the day moves it before start (e.g. Start Feb 20, Rec Day 5 -> Feb 5), it belongs to next month (Mar 5)
    if (isBefore(itemDate, start)) {
      itemDate = addMonths(itemDate, 1);
    }
    
    const formattedItemDate = format(itemDate, 'yyyy-MM-dd');
    const override = data.overrides?.find(o => o.recurringItemId === rec.id && o.originalDate === formattedItemDate);

    const amount = override?.newAmount !== undefined ? override.newAmount : rec.amount;

    items.push({
      id: rec.id, // Add id
      date: formattedItemDate,
      name: rec.name,
      amount: amount,
      type: 'recurring',
    });
  });

  // 2. Process One-Offs
  data.oneOffs.forEach(one => {
    const d = parseISO(one.date);
    // Ensure one-off date is within the cycle range [start, end)
    if (isAfter(d, addDays(start, -1)) && isBefore(d, end)) {
      items.push({
        id: one.id, // Add id
        date: one.date,
        name: one.name,
        amount: one.amount,
        type: 'one-off'
      });
    }
  });

  // Sort by date
  items.sort((a, b) => a.date.localeCompare(b.date));

  const total = items.reduce((sum, i) => sum + i.amount, 0);

  return {
    label: `${format(start, 'MMM do')} - ${format(addDays(end, -1), 'MMM do')}`,
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
    items,
    startBalance: 0, // Placeholder
    endBalance: total
  };
};


export const calculateMonthlySummaries = (data: FinanceData, year: number): MonthlySummary[] => {
  const summaries: MonthlySummary[] = [];
  const startOfYear = new Date(year, 0, 1); // January 1st of the given year
  const endOfYear = new Date(year, 11, 31); // December 31st of the given year

  eachMonthOfInterval({ start: startOfYear, end: endOfYear }).forEach(monthStart => {
    const monthEnd = endOfMonth(monthStart);

    let totalIncome = 0;
    let totalExpenses = 0;

    // Process Recurring Items for this month
    data.recurring.forEach(rec => {
      // If recurring item has a startDate, only consider it from that month onwards
      if (rec.startDate && isBefore(monthEnd, parseISO(rec.startDate))) {
          return;
      }

      // Check if the day of the recurring item falls within this month
      const itemDateInMonth = setDate(monthStart, rec.day || 1);
      if (itemDateInMonth.getMonth() === monthStart.getMonth()) { // Ensure day didn't roll into next month
        const formattedItemDate = format(itemDateInMonth, 'yyyy-MM-dd');
        const override = data.overrides?.find(o => o.recurringItemId === rec.id && o.originalDate === formattedItemDate);
        
        const amount = override?.newAmount !== undefined ? override.newAmount : rec.amount;

        if (amount >= 0) {
          totalIncome += amount;
        } else {
          totalExpenses += amount;
        }
      }
    });

    // Process One-Off Items for this month
    data.oneOffs.forEach(one => {
      const oneOffDate = parseISO(one.date);
      if (isAfter(oneOffDate, startOfDay(monthStart)) && isBefore(oneOffDate, addDays(monthEnd, 1))) { // [monthStart, monthEnd + 1)
        if (one.amount >= 0) {
          totalIncome += one.amount;
        } else {
          totalExpenses += one.amount;
        }
      }
    });

    summaries.push({
      monthLabel: format(monthStart, 'MMMM yyyy'),
      monthStart: format(monthStart, 'yyyy-MM-dd'),
      monthEnd: format(monthEnd, 'yyyy-MM-dd'),
      totalIncome,
      totalExpenses,
      netBalance: totalIncome + totalExpenses,
    });
  });

  return summaries;
};
