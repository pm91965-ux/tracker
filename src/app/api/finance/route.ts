import { NextResponse } from 'next/server';
import { getData, saveData } from '@/lib/store';
import { calculateCycle } from '@/lib/logic';
import { RecurringItem, OneOffItem } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date'); // "YYYY-MM-DD" reference
  
  const data = getData();
  const refDate = dateParam ? new Date(dateParam) : new Date();
  
  const cycle = calculateCycle(data, refDate);
  
  return NextResponse.json({
    cycle,
    recurring: data.recurring, // Return all recurring items
    oneOffs: data.oneOffs,     // Return all one-off items
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = getData();
    
    if (body.type === 'recurring') {
      data.recurring.push({
        id: Date.now().toString(),
        name: body.name,
        amount: Number(body.amount),
        type: 'recurring', // Explicitly set to 'recurring'
        day: new Date(body.startDate).getDate(), // Derive day from startDate
        startDate: body.startDate || undefined // Store startDate for recurring items
      });
    } else if (body.type === 'one-off') {
      data.oneOffs.push({
        id: Date.now().toString(),
        name: body.name,
        amount: Number(body.amount),
        date: body.date,
        type: 'one-off', // Explicitly set to 'one-off'
      });
    } else if (body.type === 'override') {
      if (!data.overrides) data.overrides = [];
      
      const existingIndex = data.overrides.findIndex(o => o.recurringItemId === body.recurringItemId && o.originalDate === body.originalDate);
      
      const overridePayload = {
        id: existingIndex >= 0 ? data.overrides[existingIndex].id : Date.now().toString(),
        recurringItemId: body.recurringItemId,
        originalDate: body.originalDate,
        newAmount: Number(body.amount),
        type: 'override' as const,
      };

      if (existingIndex >= 0) {
        data.overrides[existingIndex] = overridePayload;
      } else {
        data.overrides.push(overridePayload);
      }
    }
    
    saveData(data);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    }

    const data = getData();

    if (type === 'recurring') {
      data.recurring = data.recurring.filter(item => item.id !== id);
    } else if (type === 'one-off') {
      data.oneOffs = data.oneOffs.filter(item => item.id !== id);
    }

    saveData(data);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const data = getData();

    const itemId = body.id;
    const newType = body.type;

    let originalItem: (RecurringItem | OneOffItem) | undefined;
    let originalType: 'recurring' | 'one-off' | undefined;

    // Find the original item and its type
    originalItem = data.recurring.find(item => item.id === itemId);
    if (originalItem) originalType = 'recurring';
    
    if (!originalItem) {
      originalItem = data.oneOffs.find(item => item.id === itemId);
      if (originalItem) originalType = 'one-off';
    }

    if (!originalItem || !originalType) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (originalType === newType) {
      // Type hasn't changed, just update in place
      if (newType === 'recurring') {
        data.recurring = data.recurring.map(item => 
          item.id === itemId ? { ...item, name: body.name, amount: Number(body.amount), day: new Date(body.startDate).getDate(), startDate: body.startDate || undefined, type: 'recurring' } : item
        );
      } else if (newType === 'one-off') {
        data.oneOffs = data.oneOffs.map(item => 
          item.id === itemId ? { ...item, name: body.name, amount: Number(body.amount), date: body.date, type: 'one-off' } : item
        );
      }
    } else {
      // Type has changed, move item between arrays
      const updatedItem: RecurringItem | OneOffItem = {
        id: itemId,
        name: body.name,
        amount: Number(body.amount),
        // Assign type-specific properties
        ...(newType === 'recurring' ? { day: new Date(body.startDate).getDate(), startDate: body.startDate || undefined, type: 'recurring' } : { date: body.date, type: 'one-off' })
      } as RecurringItem | OneOffItem; // Cast for type safety

      // Remove from original array
      if (originalType === 'recurring') {
        data.recurring = data.recurring.filter(item => item.id !== itemId);
      } else {
        data.oneOffs = data.oneOffs.filter(item => item.id !== itemId);
      }

      // Add to new array
      if (newType === 'recurring') {
        data.recurring.push(updatedItem as RecurringItem);
      } else {
        data.oneOffs.push(updatedItem as OneOffItem);
      }
    }
    
    saveData(data);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
