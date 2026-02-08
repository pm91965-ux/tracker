import fs from 'fs';
import path from 'path';
import { FinanceData, RecurringItem } from './types';

const DATA_FILE = path.join(process.cwd(), 'data/finance.json');

export const getData = (): FinanceData => {
  if (!fs.existsSync(DATA_FILE)) {
    return { recurring: [], oneOffs: [], overrides: [] };
  }
  let data: FinanceData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  let dataModified = false;

  if (!data.overrides) {
    data.overrides = [];
    dataModified = true;
  }

  // Data migration/cleanup: Ensure recurring items have a 'day' derived from 'startDate' if missing
  data.recurring = data.recurring.map((item: RecurringItem) => {
    if ((item.day === null || item.day === undefined) || !item.startDate) {
      dataModified = true;
      const newStartDate = item.startDate || new Date().toISOString().split('T')[0];
      return { ...item, day: new Date(newStartDate).getDate(), startDate: newStartDate };
    }
    return item;
  });

  // If data was modified during cleanup, save it back to disk
  if (dataModified) {
    saveData(data);
  }

  return data;
};

export const saveData = (data: FinanceData) => {
  if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};
