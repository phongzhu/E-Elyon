import React, { useState } from 'react';
import { BarChart3, PieChart, TrendingUp, Download, Calendar, Filter, X, DollarSign, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

const FinanceReports = () => {
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Sample financial data
  const monthlyIncome = [
    { month: 'Jul', amount: 620000, category: 'Tithes & Offerings' },
    { month: 'Aug', amount: 680000, category: 'Tithes & Offerings' },
    { month: 'Sep', amount: 650000, category: 'Tithes & Offerings' },
    { month: 'Oct', amount: 710000, category: 'Tithes & Offerings' },
    { month: 'Nov', amount: 695000, category: 'Tithes & Offerings' },
    { month: 'Dec', amount: 750000, category: 'Tithes & Offerings' },
    { month: 'Jan', amount: 685000, category: 'Tithes & Offerings' },
  ];

  const expenseCategories = [
    { category: 'Utilities', amount: 127500, percent: 30, color: 'blue' },
    { category: 'Stipends', amount: 85000, percent: 20, color: 'green' },
    { category: 'Maintenance', amount: 68000, percent: 16, color: 'orange' },
    { category: 'Ministry Programs', amount: 59500, percent: 14, color: 'purple' },
    { category: 'Administrative', amount: 42500, percent: 10, color: 'pink' },
    { category: 'Others', amount: 42500, percent: 10, color: 'gray' },
  ];

  const totalIncome = monthlyIncome.reduce((sum, m) => sum + m.amount, 0);
  const totalExpenses = expenseCategories.reduce((sum, c) => sum + c.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  const handleApplyDateFilter = () => {
    console.log('Filtering from', dateRange.startDate, 'to', dateRange.endDate);
    setShowDateFilter(false);
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
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              showDateFilter 
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' 
              : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-emerald-500'
            }`}
          >
            <Filter size={18} />
            Date Filter
          </button>
          <button className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg">
            <Download size={18} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Date Filter */}
      {showDateFilter && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
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
              onClick={handleApplyDateFilter}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all"
            >
              Apply Filter
            </button>
            <button
              onClick={() => setShowDateFilter(false)}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-3xl shadow-2xl text-white transform hover:scale-105 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <ArrowUpCircle size={32} />
            <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Total Donations</p>
          </div>
          <p className="text-5xl font-black mb-2">₱{totalIncome.toLocaleString()}</p>
          <p className="text-sm opacity-90">Last 7 months</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-600 p-8 rounded-3xl shadow-2xl text-white transform hover:scale-105 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <ArrowDownCircle size={32} />
            <p className="text-red-100 text-xs font-semibold uppercase tracking-wider">Total Expenses</p>
          </div>
          <p className="text-5xl font-black mb-2">₱{totalExpenses.toLocaleString()}</p>
          <p className="text-sm opacity-90">Last 7 months</p>
        </div>

        <div className={`bg-gradient-to-br p-8 rounded-3xl shadow-2xl text-white transform hover:scale-105 transition-all ${
          netIncome >= 0 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-red-600'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <DollarSign size={32} />
            <p className="text-white opacity-90 text-xs font-semibold uppercase tracking-wider">Available Funds</p>
          </div>
          <p className="text-5xl font-black mb-2">₱{netIncome.toLocaleString()}</p>
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
            {monthlyIncome.map((month, idx) => {
              const maxAmount = Math.max(...monthlyIncome.map(m => m.amount));
              const height = (month.amount / maxAmount) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-3 group">
                  <div className="relative w-full">
                    <div 
                      className="w-full bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t-xl transition-all hover:from-emerald-600 hover:to-emerald-400 cursor-pointer shadow-lg"
                      style={{ height: `${height * 2.5}px`, minHeight: '40px' }}
                    ></div>
                    <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white px-2 py-1 rounded shadow">
                      ₱{(month.amount / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-bold text-gray-700">{month.month}</span>
                  </div>
                </div>
              );
            })}
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

          <div className="flex items-center justify-center mb-6">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="20" strokeDasharray="30 70" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray="20 80" strokeDashoffset="-30" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f97316" strokeWidth="20" strokeDasharray="16 84" strokeDashoffset="-50" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#a855f7" strokeWidth="20" strokeDasharray="14 86" strokeDashoffset="-66" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#ec4899" strokeWidth="20" strokeDasharray="10 90" strokeDashoffset="-80" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#6b7280" strokeWidth="20" strokeDasharray="10 90" strokeDashoffset="-90" />
              </svg>
            </div>
          </div>

          <div className="space-y-3">
            {expenseCategories.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 bg-${cat.color}-500 rounded-full`}></div>
                  <span className="font-bold text-gray-800">{cat.category}</span>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-gray-900">₱{cat.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{cat.percent}%</p>
                </div>
              </div>
            ))}
          </div>
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
              {monthlyIncome.map((month, idx) => {
                const expense = totalExpenses / monthlyIncome.length;
                const net = month.amount - expense;
                return (
                  <tr key={idx} className="hover:bg-emerald-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{month.month} 2025</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">₱{month.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-red-600">₱{expense.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono font-black text-lg text-blue-700">₱{net.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      {net >= 0 ? (
                        <TrendingUp className="inline text-green-600" size={20} />
                      ) : (
                        <TrendingUp className="inline text-red-600 transform rotate-180" size={20} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gradient-to-r from-emerald-100 to-teal-100 border-t-2 border-gray-300">
              <tr>
                <td className="px-6 py-4 font-black text-gray-900">TOTAL</td>
                <td className="px-6 py-4 text-right font-mono font-black text-xl text-emerald-700">₱{totalIncome.toLocaleString()}</td>
                <td className="px-6 py-4 text-right font-mono font-black text-xl text-red-700">₱{totalExpenses.toLocaleString()}</td>
                <td className="px-6 py-4 text-right font-mono font-black text-2xl text-blue-900">₱{netIncome.toLocaleString()}</td>
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