import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Download, Calendar, Filter, X, DollarSign, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';

const FinanceReports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [donations, setDonations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [expensesByCategory, setExpensesByCategory] = useState([]);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchFinancialData();
    }
  }, [currentUser, selectedPeriod, dateRange]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData, error } = await supabase
        .from('users')
        .select('user_id, user_details_id, users_details!users_user_details_id_fkey(branch_id, first_name, middle_name, last_name)')
        .eq('auth_user_id', user.id)
        .limit(1);

      if (error) throw error;
      setCurrentUser(userData?.[0]);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (selectedPeriod) {
      case 'weekly':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = now;
        break;
      case 'monthly':
        // Show last 3 months to ensure we capture all data
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        endDate = now;
        break;
      case 'quarterly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        endDate = now;
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      case 'custom':
        if (dateRange.startDate && dateRange.endDate) {
          startDate = new Date(dateRange.startDate);
          endDate = new Date(dateRange.endDate);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          endDate = now;
        }
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        endDate = now;
    }

    return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
  };

  const fetchFinancialData = async () => {
    if (!currentUser?.users_details?.branch_id) return;
    
    setLoading(true);
    try {
      const branchId = currentUser.users_details.branch_id;
      const { startDate, endDate } = getDateRange();
      
      // Query donations from transactions table with branch_id filter
      let donationQuery = supabase
        .from('transactions')
        .select(`
          transaction_id,
          amount,
          transaction_date,
          branch_id,
          donations!transactions_donation_id_fkey(
            donation_id,
            amount,
            donation_date,
            donation_type,
            is_anonymous
          )
        `)
        .eq('branch_id', branchId)
        .not('donation_id', 'is', null)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false });

      // Query expenses from transactions table with branch_id filter (no date filter for now)
      let expenseQuery = supabase
        .from('transactions')
        .select(`
          transaction_id,
          amount,
          transaction_date,
          status,
          branch_id,
          expenses!transactions_expense_id_fkey(
            expense_id,
            notes,
            receipt_number,
            billing_period,
            expense_categories!expenses_category_id_fkey(
              category_id,
              category_name
            ),
            expense_items(
              item_name,
              quantity,
              unit_price,
              total_price
            )
          )
        `)
        .eq('branch_id', branchId)
        .not('expense_id', 'is', null)
        .order('transaction_date', { ascending: false });

      console.log('Querying donations from', startDate, 'to', endDate);
      console.log('Querying ALL expenses (no date filter) for branch:', branchId);

      const [{ data: donationsData, error: donationsError }, { data: expensesData, error: expensesError }] = await Promise.all([
        donationQuery,
        expenseQuery
      ]);

      if (donationsError) {
        console.error('Donations error:', donationsError);
        throw donationsError;
      }
      if (expensesError) {
        console.error('Expenses error:', expensesError);
        throw expensesError;
      }

      console.log('Donations fetched:', donationsData?.length || 0, donationsData);
      console.log('Expenses fetched:', expensesData?.length || 0, expensesData);
      console.log('Sample expense:', expensesData?.[0]);

      setDonations(donationsData || []);
      setExpenses(expensesData || []);
      
      // Process monthly data
      processMonthlyData(donationsData || [], expensesData || []);
      // Process expense categories
      processExpenseCategories(expensesData || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      setLoading(false);
    }
  };

  const processMonthlyData = (donationsData, expensesData) => {
    const monthlyMap = {};
    
    console.log('Processing monthly data...');
    console.log('Donations to process:', donationsData.length);
    console.log('Expenses to process:', expensesData.length);
    
    // Process donations from transactions
    donationsData.forEach(txn => {
      const date = new Date(txn.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, income: 0, expenses: 0 };
      }
      monthlyMap[monthKey].income += parseFloat(txn.amount || 0);
    });

    // Process expenses - sum up expense_items from transactions
    expensesData.forEach(txn => {
      if (!txn.transaction_date || !txn.expenses) return; // Skip if no date or no expense data
      const date = new Date(txn.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, income: 0, expenses: 0 };
      }
      
      // Calculate total from expense_items
      const expenseTotal = (txn.expenses.expense_items || []).reduce((sum, item) => {
        return sum + parseFloat(item.total_price || 0);
      }, 0);
      
      console.log(`Adding expense for ${monthKey}: ${expenseTotal}`);
      monthlyMap[monthKey].expenses += expenseTotal;
    });

    const sortedMonthly = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
    console.log('Monthly data processed:', sortedMonthly);
    setMonthlyData(sortedMonthly.slice(-7)); // Last 7 months
  };

  const processExpenseCategories = (expensesData) => {
    const categoryMap = {};
    let totalExpenses = 0;

    console.log('Processing expense categories...');
    console.log('Expenses data:', expensesData);

    expensesData.forEach(txn => {
      if (txn.expenses?.expense_categories) {
        const categoryName = txn.expenses.expense_categories.category_name || 'Uncategorized';
        
        // Calculate total from expense_items
        const expenseTotal = (txn.expenses.expense_items || []).reduce((sum, item) => {
          return sum + parseFloat(item.total_price || 0);
        }, 0);
        
        console.log(`Category: ${categoryName}, Amount: ${expenseTotal}`);
        
        if (!categoryMap[categoryName]) {
          categoryMap[categoryName] = 0;
        }
        categoryMap[categoryName] += expenseTotal;
        totalExpenses += expenseTotal;
      }
    });

    console.log('Category map:', categoryMap);
    console.log('Total expenses:', totalExpenses);

    const categories = Object.entries(categoryMap).map(([category, amount]) => ({
      category,
      amount,
      percent: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);

    console.log('Categories processed:', categories);
    setExpensesByCategory(categories);
  };

  const totalIncome = donations.reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, txn) => {
    if (!txn.expenses) return sum;
    const expenseTotal = (txn.expenses.expense_items || []).reduce((itemSum, item) => {
      return itemSum + parseFloat(item.total_price || 0);
    }, 0);
    return sum + expenseTotal;
  }, 0);
  const netIncome = totalIncome - totalExpenses;

  const handleCustomDateFilter = () => {
    if (dateRange.startDate && dateRange.endDate) {
      setSelectedPeriod('custom');
      setShowCustomDateRange(false);
      fetchFinancialData();
    }
  };

  const exportToPDF = () => {
    // Create CSV content for now (can be enhanced to PDF later)
    let csv = 'Financial Reports\n\n';
    csv += `Period: ${selectedPeriod}\n`;
    csv += `Total Donations: ₱${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    csv += `Total Expenses: ₱${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    csv += `Net Income: ₱${netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;
    
    csv += 'Monthly Summary\n';
    csv += 'Month,Donations,Expenses,Net\n';
    monthlyData.forEach(month => {
      const net = month.income - month.expenses;
      const monthName = new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      csv += `${monthName},${month.income.toFixed(2)},${month.expenses.toFixed(2)},${net.toFixed(2)}\n`;
    });
    
    csv += '\n\nExpense Categories\n';
    csv += 'Category,Amount,Percentage\n';
    expensesByCategory.forEach(cat => {
      csv += `${cat.category},${cat.amount.toFixed(2)},${cat.percent}%\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex flex-col flex-1">
        <Header />
        
        <div className="flex-1 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-10 overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">Financial Reports</h1>
          <p className="text-gray-600 font-medium">Comprehensive financial analysis and insights</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
          >
            <Download size={18} />
            Export Report
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-emerald-600" />
            <span className="font-bold text-gray-700">Filter Period:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedPeriod('weekly'); setShowCustomDateRange(false); }}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                selectedPeriod === 'weekly' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => { setSelectedPeriod('monthly'); setShowCustomDateRange(false); }}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                selectedPeriod === 'monthly' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => { setSelectedPeriod('quarterly'); setShowCustomDateRange(false); }}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                selectedPeriod === 'quarterly' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Quarter
            </button>
            <button
              onClick={() => { setSelectedPeriod('yearly'); setShowCustomDateRange(false); }}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                selectedPeriod === 'yearly' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Year
            </button>
            <button
              onClick={() => setShowCustomDateRange(!showCustomDateRange)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                selectedPeriod === 'custom' || showCustomDateRange
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>
        
        {/* Custom Date Range */}
        {showCustomDateRange && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-bold text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <button
                onClick={handleCustomDateFilter}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all"
              >
                Apply Filter
              </button>
              <button
                onClick={() => setShowCustomDateRange(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-3xl shadow-2xl text-white transform hover:scale-105 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <ArrowUpCircle size={32} />
            <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Total Donations</p>
          </div>
          <p className="text-5xl font-black mb-2">₱{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-sm opacity-90">Selected Period</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-600 p-8 rounded-3xl shadow-2xl text-white transform hover:scale-105 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <ArrowDownCircle size={32} />
            <p className="text-red-100 text-xs font-semibold uppercase tracking-wider">Total Expenses</p>
          </div>
          <p className="text-5xl font-black mb-2">₱{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-sm opacity-90">Selected Period</p>
        </div>

        <div className={`bg-gradient-to-br p-8 rounded-3xl shadow-2xl text-white transform hover:scale-105 transition-all ${
          netIncome >= 0 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-red-600'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <DollarSign size={32} />
            <p className="text-white opacity-90 text-xs font-semibold uppercase tracking-wider">Available Funds</p>
          </div>
          <p className="text-5xl font-black mb-2">₱{netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-sm opacity-90">{netIncome >= 0 ? 'Surplus' : 'Deficit'}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Monthly Income Chart */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-emerald-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <BarChart3 className="text-emerald-600" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Monthly Donations Trend</h2>
              <p className="text-sm text-gray-500">Last 7 months</p>
            </div>
          </div>
          
          <div className="h-80 flex items-end justify-between gap-3">
            {monthlyData.length > 0 ? monthlyData.map((month, idx) => {
              const maxAmount = Math.max(...monthlyData.map(m => m.income));
              const height = maxAmount > 0 ? (month.income / maxAmount) * 100 : 0;
              const monthName = new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short' });
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-3 group">
                  <div className="relative w-full">
                    <div 
                      className="w-full bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t-xl transition-all hover:from-emerald-600 hover:to-emerald-400 cursor-pointer shadow-lg"
                      style={{ height: `${Math.max(height * 2.5, 40)}px` }}
                    ></div>
                    <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white px-2 py-1 rounded shadow">
                      ₱{(month.income / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-bold text-gray-700">{monthName}</span>
                  </div>
                </div>
              );
            }) : (
              <div className="w-full text-center text-gray-400">No donation data available</div>
            )}
          </div>
        </div>

        {/* Expense Distribution Pie Chart */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-purple-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-100 rounded-xl">
              <PieChart className="text-purple-600" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Expense Distribution</h2>
              <p className="text-sm text-gray-500">By category</p>
            </div>
          </div>

          {expensesByCategory.length > 0 ? (
            <>
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {expensesByCategory.map((cat, idx) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];
                      const previousPercent = expensesByCategory.slice(0, idx).reduce((sum, c) => sum + c.percent, 0);
                      const offset = -(previousPercent * 2.51);
                      return (
                        <circle
                          key={idx}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={colors[idx % colors.length]}
                          strokeWidth="20"
                          strokeDasharray={`${cat.percent * 2.51} ${(100 - cat.percent) * 2.51}`}
                          strokeDashoffset={offset}
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>

              <div className="space-y-3">
                {expensesByCategory.map((cat, idx) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></div>
                        <span className="font-bold text-gray-800">{cat.category}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-gray-900">₱{cat.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-xs text-gray-500">{cat.percent}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-8">No expense data available</div>
          )}
        </div>
      </div>

      {/* Detailed Financial Table */}
      <div className="bg-white rounded-3xl shadow-xl border-2 border-teal-100 overflow-hidden">
        <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Financial Summary</h2>
          <p className="text-gray-600">Detailed breakdown of income and expenses</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Month</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-emerald-700 uppercase tracking-wider">Donations</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-red-700 uppercase tracking-wider">Expenses</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">Available</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthlyData.length > 0 ? monthlyData.map((month, idx) => {
                const net = month.income - month.expenses;
                const monthName = new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                return (
                  <tr key={idx} className="hover:bg-emerald-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{monthName}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">₱{month.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-red-600">₱{month.expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right font-mono font-black text-lg text-blue-700">₱{net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-center">
                      {net >= 0 ? (
                        <TrendingUp className="inline text-green-600" size={20} />
                      ) : (
                        <TrendingUp className="inline text-red-600 transform rotate-180" size={20} />
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                    {loading ? 'Loading financial data...' : 'No data available for the selected period'}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gradient-to-r from-emerald-100 to-teal-100 border-t-2 border-gray-300">
              <tr>
                <td className="px-6 py-4 font-black text-gray-900">TOTAL</td>
                <td className="px-6 py-4 text-right font-mono font-black text-xl text-emerald-700">₱{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-right font-mono font-black text-xl text-red-700">₱{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-right font-mono font-black text-2xl text-blue-900">₱{netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceReports;