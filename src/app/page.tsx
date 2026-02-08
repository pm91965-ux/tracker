'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, DollarSign, Repeat, Trash2, Edit } from 'lucide-react';
import { MonthCycle, RecurringItem, OneOffItem, MonthlySummary, MonthlyOverviewData } from '@/lib/types';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7e7ce]">Loading authentication...</div>;
  }

  if (status === "unauthenticated") {
    return null; // Or a loading spinner, as the redirect will happen soon
  }

  const [cycle, setCycle] = useState<MonthCycle | null>(null);
  const [refDate, setRefDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Internal state for all master items, used for edit/delete operations
  const [allManagedItems, setAllManagedItems] = useState<(RecurringItem | OneOffItem)[]>([]); 

  // View Mode State
  const [viewMode, setViewMode] = useState<'cycle' | 'monthly'>('cycle'); // 'manage' mode removed
  const [monthlyOverview, setMonthlyOverview] = useState<MonthlyOverviewData | null>(null);
  const [overviewYear, setOverviewYear] = useState(new Date().getFullYear());

  // Unified Form State for Adding new master items
  const [showAddItemForm, setShowAddItemForm] = useState(false); 
  const [newItemForm, setNewItemForm] = useState({ 
    name: '', 
    amount: '', 
    date: new Date().toISOString().split('T')[0], 
    isRecurring: false, 
    // day is now derived from startDate for recurring items
    startDate: new Date().toISOString().split('T')[0] 
  });

  // Edit State for items displayed in Cycle View
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ 
    id: string; 
    name: string; 
    amount: string; 
    date?: string; 
    isRecurring: boolean; 
    // day is now derived from startDate for recurring items
    startDate?: string;
    originalDate?: string; // Track original date for overrides
  } | null>(null);

  const fetchData = async () => {
    if (viewMode === 'cycle') {
      const res = await fetch(`/api/finance?date=${refDate}`);
      const data = await res.json();
      setCycle(data.cycle);
      // Populate allManagedItems to serve as source for edit/delete operations on master records
      setAllManagedItems([
        ...data.recurring,
        ...data.oneOffs
      ].sort((a, b) => {
        if (a.type === 'recurring' && b.type !== 'recurring') return -1;
        if (b.type === 'recurring' && a.type !== 'recurring') return 1;
  
        if (a.type === 'recurring' && b.type === 'recurring') {
          const aStart = (a as RecurringItem).startDate || '2000-01-01'; 
          const bStart = (b as RecurringItem).startDate || '2000-01-01';
          if (aStart !== bStart) return aStart.localeCompare(bStart);
          // Day is now derived from startDate, so sorting by day after startDate
          return (new Date(aStart).getDate()) - (new Date(bStart).getDate());
        } else {
          return new Date((a as OneOffItem).date).getTime() - new Date((b as OneOffItem).date).getTime();
        }
      }));
    } else if (viewMode === 'monthly') {
      const res = await fetch(`/api/finance/monthly-summary?year=${overviewYear}`);
      const data = await res.json();
      setMonthlyOverview(data);
    }
  };

  useEffect(() => {
    // Only fetch data if authenticated
    if (status === "authenticated") {
      fetchData();
    }
  }, [refDate, viewMode, overviewYear, status]);

  const changeMonth = (offset: number) => {
    const d = new Date(refDate);
    d.setMonth(d.getMonth() + offset);
    setRefDate(d.toISOString().split('T')[0]);
  };

  const changeOverviewYear = (offset: number) => {
    setOverviewYear(prevYear => prevYear + offset);
  };

  const handleAddItem = async () => {
    const payload: any = {
      name: newItemForm.name,
      amount: Number(newItemForm.amount),
    };

    if (newItemForm.isRecurring) {
      payload.type = 'recurring';
      payload.day = new Date(newItemForm.startDate).getDate(); // Derive day from startDate
      payload.startDate = newItemForm.startDate; 
    } else {
      payload.type = 'one-off';
      payload.date = newItemForm.date;
    }

    await fetch('/api/finance', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setShowAddItemForm(false);
    setNewItemForm({ name: '', amount: '', date: new Date().toISOString().split('T')[0], isRecurring: false, startDate: new Date().toISOString().split('T')[0] }); // Removed day from initial state
    fetchData(); // Refresh data
  };

  const handleUpdateItem = async () => {
    if (!editForm) return;

    const payload: any = {
      id: editForm.id,
      name: editForm.name,
      amount: Number(editForm.amount),
    };

    if (editForm.isRecurring) {
      payload.type = 'recurring';
      payload.day = new Date(editForm.startDate || '').getDate(); // Derive day from startDate
      payload.startDate = editForm.startDate; 
    } else {
      payload.type = 'one-off';
      payload.date = editForm.date || new Date().toISOString().split('T')[0]; // Default to today's date if empty
    }

    await fetch('/api/finance', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    setEditingItemId(null); // Exit edit mode
    setEditForm(null); // Clear edit form
    fetchData(); // Refresh data
  };

  const handleUpdateOverride = async () => {
    if (!editForm || !editForm.isRecurring || !editForm.originalDate) return;

    const payload = {
      recurringItemId: editForm.id,
      originalDate: editForm.originalDate,
      amount: Number(editForm.amount),
      type: 'override',
    };

    await fetch('/api/finance', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setEditingItemId(null);
    setEditForm(null);
    fetchData();
  };

  const handleDeleteItem = async (type: 'recurring' | 'one-off', id: string) => {
    await fetch(`/api/finance?type=${type}&id=${id}`, {
      method: 'DELETE',
    });
    fetchData(); // Refresh data after deletion
  };

  if (viewMode === 'cycle' && !cycle) return <div className="p-10 text-gray-900">Loading...</div>;
  if (viewMode === 'monthly' && !monthlyOverview) return <div className="p-10 text-gray-900">Loading...</div>;

  return (
    <div className="min-h-screen bg-champagne p-4 font-sans">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-6 bg-champagne-darker p-4 rounded-xl shadow-lg border border-neutral-300">
        {viewMode === 'cycle' ? (
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-rubyred rounded-full"><ChevronLeft /></button>
        ) : (
          <button onClick={() => changeOverviewYear(-1)} className="p-2 hover:bg-rubyred rounded-full"><ChevronLeft /></button>
        )}

        <div className="text-center flex-1 mx-4">
          <button 
            onClick={() => setViewMode(viewMode === 'cycle' ? 'monthly' : 'cycle')}
            className="text-sm uppercase tracking-widest text-rubyred font-bold mb-1 bg-rubyred/20 hover:bg-rubyred/40 px-3 py-1 rounded-full"
          >
            {viewMode === 'cycle' ? 'Monthly Overview' : 'Cycle View'}
          </button>
          <h2 className="text-xl font-bold flex items-center gap-2 justify-center mt-2">
            <Calendar size={20} className="text-rubyred" /> 
            {viewMode === 'cycle' && cycle?.label}
            {viewMode === 'monthly' && overviewYear}
          </h2>
        </div>

        {viewMode === 'cycle' ? (
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-rubyred rounded-full"><ChevronRight /></button>
        ) : (
          <button onClick={() => changeOverviewYear(1)} className="p-2 hover:bg-rubyred rounded-full"><ChevronRight /></button>
        )}
      </header>

      {/* Conditional Content Rendering */}

      {/* Cycle View Content */}
      {viewMode === 'cycle' && cycle && (
        <>
          <div className="mb-8 p-6 bg-gradient-to-r from-rubyred to-champagne-darker rounded-2xl shadow-xl border border-rubyred/50 text-left">
            <h3 className="text-neutral-600 font-bold text-sm mb-2 uppercase text-left">Projected Balance</h3>
            <div className={`text-4xl font-bold text-left ${cycle.endBalance >= 0 ? 'text-forestgreen' : 'text-rubyred'}`}>
              {cycle.endBalance >= 0 ? '+' : ''}{cycle.endBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-gray-600 mt-2 text-left">Cash flow for this period (Income - Expenses)</p>
          </div>

          <section className="bg-champagne-darker rounded-xl p-4 border border-neutral-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">Transactions for this Cycle ({cycle.items.length})</h3>
              <button onClick={() => {
                setShowAddItemForm(!showAddItemForm);
                // Set default date to the start of the current refDate's month
                const defaultDate = new Date(refDate).toISOString().split('T')[0];
                setNewItemForm({ 
                  name: '', 
                  amount: '', 
                  date: defaultDate, 
                  isRecurring: false, 
                  startDate: defaultDate 
                });
              }} className="bg-rubyred/20 hover:bg-rubyred/40 p-2 rounded-lg"><Plus size={18} className="text-rubyred"/></button>
            </div>

            {showAddItemForm && (
              <div className="bg-neutral-100 p-4 rounded-lg mb-4 space-y-3 border border-neutral-300">
                <input type="text" placeholder="Name (e.g. Rent, Groceries)" className="w-full bg-neutral-200 p-2 rounded text-sm text-gray-900" value={newItemForm.name} onChange={e => setNewItemForm({...newItemForm, name: e.target.value})} />
                <input type="number" placeholder="Amount (- for expense)" className="w-full bg-neutral-200 p-2 rounded text-sm text-gray-900" value={newItemForm.amount} onChange={e => setNewItemForm({...newItemForm, amount: e.target.value})} />
                
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isRecurring" checked={newItemForm.isRecurring} onChange={e => setNewItemForm({...newItemForm, isRecurring: e.target.checked})} className="form-checkbox text-rubyred" />
                  <label htmlFor="isRecurring" className="text-sm text-gray-900">Is Recurring?</label>
                </div>

                <input 
                  type="date" 
                  className="w-full bg-neutral-200 p-2 rounded text-sm text-gray-900" 
                  value={newItemForm.isRecurring ? newItemForm.startDate : newItemForm.date}
                  onChange={e => setNewItemForm({...newItemForm, 
                    [newItemForm.isRecurring ? 'startDate' : 'date']: e.target.value
                  })} 
                />

                {/* Removed Day of Month input for recurring items */}
                {/* {newItemForm.isRecurring && (
                  <input type="number" placeholder="Day of Month (1-31)" className="w-full bg-slate-800 p-2 rounded text-sm" value={newItemForm.day} onChange={e => setNewItemForm({...newItemForm, day: e.target.value})} />
                )}*/}
                <button onClick={handleAddItem} className="w-full bg-rubyred hover:bg-rubyred-darker py-2 rounded font-bold text-white text-sm">Add Item</button>
              </div>
            )}

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {cycle.items.length === 0 && <p className="text-gray-600 text-center py-4">No transactions in this cycle.</p>}
              {cycle.items.map((item) => {
                const masterItem = allManagedItems.find(mi => mi.id === item.id);
                return (
                  <div key={item.id} 
                    className={`p-3 rounded border border-neutral-300/50 cursor-pointer hover:bg-rubyred/20 ${item.type === 'recurring' ? 'bg-rubyred/10' : 'bg-neutral-100/50'}`}
                    onClick={() => {
                      // Only open edit form if not already editing
                      if (editingItemId !== item.id) {
                        if (masterItem) {
                          setEditingItemId(item.id);
                          setEditForm({
                            id: masterItem.id,
                            name: masterItem.name,
                            amount: String(item.amount), // Use the amount from the cycle item (could be overridden)
                            date: (masterItem as OneOffItem).date || '',
                            isRecurring: masterItem.type === 'recurring',
                            // Day is now derived from startDate for recurring items
                            startDate: (masterItem as RecurringItem).startDate || '',
                            originalDate: item.date // Track the date of this occurrence
                          });
                        }
                      }
                    }}>
                    {editingItemId === item.id && editForm ? (
                      <div className="space-y-3">
                        <input type="text" placeholder="Name" className="w-full bg-neutral-200 p-2 rounded text-sm text-gray-900" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                        <input type="number" placeholder="Amount" className="w-full bg-neutral-200 p-2 rounded text-sm text-gray-900" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} />
                        
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id={`isRecurringEdit-${item.id}`} checked={editForm.isRecurring} onChange={e => setEditForm({...editForm, isRecurring: e.target.checked})} className="form-checkbox text-rubyred" />
                          <label htmlFor={`isRecurringEdit-${item.id}`} className="text-sm text-gray-900">Is Recurring?</label>
                        </div>

                        <input 
                          type="date" 
                          className="w-full bg-neutral-200 p-2 rounded text-sm text-gray-900" 
                          value={editForm.isRecurring ? editForm.startDate : editForm.date}
                          onChange={e => setEditForm({...editForm, 
                            [editForm.isRecurring ? 'startDate' : 'date']: e.target.value
                          })} 
                        />

                        {/* Removed Day of Month input for recurring items */}
                        {/* {editForm.isRecurring && (
                          <input type="number" placeholder="Day of Month (1-31)" className="w-full bg-slate-800 p-2 rounded text-sm" value={editForm.day} onChange={e => setEditForm({...editForm, day: e.target.value})} />
                        )}*/}
                        <div className="flex gap-2 flex-col sm:flex-row">
                          {editForm.isRecurring && editForm.originalDate ? (
                            <>
                              <button onClick={handleUpdateOverride} className="flex-1 bg-rubyred/80 hover:bg-rubyred py-2 rounded font-bold text-white text-sm">Change for this month</button>
                              <button onClick={handleUpdateItem} className="flex-1 bg-rubyred hover:bg-rubyred-darker py-2 rounded font-bold text-white text-sm">Change recurring</button>
                            </>
                          ) : (
                            <button onClick={handleUpdateItem} className="flex-1 bg-rubyred hover:bg-rubyred-darker py-2 rounded font-bold text-white text-sm">Save</button>
                          )}
                          <button onClick={() => setEditingItemId(null)} className="flex-1 bg-neutral-300 hover:bg-neutral-400 py-2 rounded font-bold text-gray-900 text-sm">Cancel</button>
                          <button onClick={(e) => {
                            e.stopPropagation(); // Prevent opening edit form when deleting
                            handleDeleteItem(item.type, item.id);
                          }} className="p-1 rounded-full hover:bg-red-700 text-rubyred ml-2 self-center">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-sm">{item.name}</div>
                          <div className="text-xs text-gray-600">
                            {item.type === 'recurring' ? `Every Day ${(item as RecurringItem).day} ${(item as RecurringItem).startDate ? `(Starts: ${(item as RecurringItem).startDate})` : ''}` : (item as OneOffItem).date}
                          </div>
                        </div>
                        <div className={`font-mono font-bold text-right ml-auto ${item.amount >= 0 ? 'text-forestgreen' : 'text-rubyred'}`}>
                          {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                        {/* Delete button kept here for direct access if not in edit mode */}
                        <button onClick={(e) => {
                            e.stopPropagation(); // Prevent opening edit form when deleting
                            handleDeleteItem(item.type, item.id);
                          }} className="p-1 rounded-full hover:bg-red-700 text-rubyred ml-2">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Monthly Overview Content */}
      {viewMode === 'monthly' && monthlyOverview && (
        <section className="bg-champagne-darker rounded-xl p-4 border border-neutral-300 mt-6">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><Calendar size={18} className="text-rubyred"/> Monthly Overview {overviewYear}</h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {monthlyOverview.months.length === 0 && <p className="text-gray-600 text-center py-4">No monthly data for {overviewYear}.</p>}
            {monthlyOverview.months.map((month) => (
              <div 
                key={month.monthStart} 
                className="flex items-center gap-4 bg-neutral-100/50 p-3 rounded border border-neutral-300/50 cursor-pointer hover:bg-rubyred/20"
                onClick={() => {
                  setRefDate(month.monthStart);
                  setViewMode('cycle');
                }}
              >
                <div className="flex-1">
                  <div className="font-bold text-sm text-left">{month.monthLabel}</div>
                  <div className="text-xs text-gray-600 text-left">Income: {month.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€ / Expenses: {month.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€</div>
                </div>
                <div className={`font-mono font-bold text-left w-32 ${month.netBalance >= 0 ? 'text-forestgreen' : 'text-rubyred'}`}>
                  {month.netBalance >= 0 ? '+' : ''}{month.netBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
