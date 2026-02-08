import { NextResponse } from 'next/server';
import { getData } from '@/lib/store';
import { calculateMonthlySummaries } from '@/lib/logic';
import { MonthlyOverviewData } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get('year');
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  const data = getData();
  const months = calculateMonthlySummaries(data, year);

  const monthlyOverviewData: MonthlyOverviewData = {
    year,
    months,
  };

  return NextResponse.json(monthlyOverviewData);
}