import React, { useState, useEffect } from 'react';
import { Zap, Droplets, Wifi, Phone, TrendingUp, TrendingDown, Download, Calendar, Filter, ChevronDown, BarChart3, Search, X } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';

const UtilityTracker = () => {
    const [utilities, setUtilities] = useState([]);
    const [selectedUtilities, setSelectedUtilities] = useState([]);
    const [utilityData, setUtilityData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    const [showFilter, setShowFilter] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const utilityIcons = {
        'Electricity Bill': { icon: Zap, color: 'yellow' },
        'Water Bill': { icon: Droplets, color: 'blue' },
        'Internet Bill': { icon: Wifi, color: 'indigo' },
        'Mobile Load & Communication': { icon: Phone, color: 'purple' }
    };

    useEffect(() => {
        fetchUtilities();
    }, []);

    useEffect(() => {
        if (utilities.length > 0 && selectedUtilities.length > 0) {
            fetchUtilityExpenses();
        } else if (utilities.length > 0 && selectedUtilities.length === 0) {
            setUtilityData([]);
            setLoading(false);
        }
    }, [dateRange, utilities, selectedUtilities]);

    const fetchUtilities = async () => {
        try {
            // Fetch ALL expense categories
            const { data, error } = await supabase
                .from('expense_categories')
                .select('category_id, category_name')
                .order('category_name');

            if (error) throw error;

            setUtilities(data || []);
            // Select utility bills by default
            const defaultUtilities = (data || []).filter(u => 
                u.category_name.includes('Bill') || u.category_name.includes('Load')
            );
            setSelectedUtilities(defaultUtilities.map(u => u.category_id));
        } catch (error) {
            console.error('Error fetching utilities:', error);
        }
    };

    const fetchUtilityExpenses = async () => {
        try {
            setLoading(true);

            if (selectedUtilities.length === 0) {
                setUtilityData([]);
                setLoading(false);
                return;
            }

            let query = supabase
                .from('transactions')
                .select(`
                    transaction_id,
                    amount,
                    transaction_date,
                    status,
                    expenses!inner(
                        expense_id,
                        billing_period,
                        receipt_number,
                        category_id,
                        expense_categories(category_name),
                        expense_items(item_name, quantity, unit_price, total_price)
                    )
                `)
                .eq('transaction_type', 'Expense')
                .eq('status', 'Completed')
                .order('transaction_date', { ascending: false });

            // Apply date range filter if provided
            if (dateRange.startDate) {
                query = query.gte('expenses.billing_period', dateRange.startDate);
            }
            if (dateRange.endDate) {
                query = query.lte('expenses.billing_period', dateRange.endDate);
            }

            const { data, error } = await query.limit(500);

            if (error) {
                console.error('Fetch error:', error);
                throw error;
            }

            // Group by month and category
            const groupedData = {};
            
            (data || []).forEach(transaction => {
                const expense = transaction.expenses;
                if (!expense || !expense.billing_period) return;
                
                // Filter by selected categories
                if (!selectedUtilities.includes(expense.category_id)) return;
                
                const date = new Date(expense.billing_period);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                
                if (!groupedData[monthKey]) {
                    groupedData[monthKey] = {
                        monthKey,
                        monthLabel,
                        utilities: {}
                    };
                }

                const categoryName = expense.expense_categories?.category_name;
                const totalAmount = (expense.expense_items || []).reduce((sum, item) => 
                    sum + (parseFloat(item.total_price) || 0), 0
                );

                if (!groupedData[monthKey].utilities[categoryName]) {
                    groupedData[monthKey].utilities[categoryName] = {
                        amount: 0,
                        count: 0,
                        receiptNumbers: []
                    };
                }

                groupedData[monthKey].utilities[categoryName].amount += totalAmount;
                groupedData[monthKey].utilities[categoryName].count += 1;
                if (expense.receipt_number) {
                    groupedData[monthKey].utilities[categoryName].receiptNumbers.push(expense.receipt_number);
                }
            });

            const dataArray = Object.values(groupedData).sort((a, b) => 
                b.monthKey.localeCompare(a.monthKey)
            );

            setUtilityData(dataArray);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching utility expenses:', error);
            setLoading(false);
        }
    };

    const calculateTrend = (categoryName) => {
        if (utilityData.length < 2) return { change: 0, isIncrease: false };
        
        const currentMonth = utilityData[0]?.utilities[categoryName]?.amount || 0;
        const lastMonth = utilityData[1]?.utilities[categoryName]?.amount || 0;
        
        if (lastMonth === 0) return { change: 0, isIncrease: false };
        
        const change = ((currentMonth - lastMonth) / lastMonth) * 100;
        return { change: change.toFixed(1), isIncrease: change > 0 };
    };

    const toggleUtility = (categoryId) => {
        if (selectedUtilities.includes(categoryId)) {
            setSelectedUtilities(selectedUtilities.filter(u => u !== categoryId));
        } else {
            setSelectedUtilities([...selectedUtilities, categoryId]);
        }
    };

    const selectAll = () => {
        setSelectedUtilities(utilities.map(u => u.category_id));
    };

    const clearAll = () => {
        setSelectedUtilities([]);
    };

    const getFilteredUtilities = () => {
        return utilities.filter(u => selectedUtilities.includes(u.category_id));
    };

    const calculateMonthTotal = (monthData) => {
        return Object.values(monthData.utilities).reduce((sum, util) => sum + util.amount, 0);
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
            <Sidebar />
            
            <div className="flex flex-col flex-1">
                <Header />
                
                <div className="flex-1 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-10 overflow-y-auto">
                    <div className="bg-gradient-to-r from-[#1a4d2e] to-[#2d7a4a] rounded-2xl p-6 text-white shadow-xl mb-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-4xl font-bold mb-2">Expense Tracker</h1>
                                <p className="text-green-100">Monitor and compare expenses month-over-month</p>
                            </div>
                            <button className="flex items-center gap-2 bg-white text-[#1a4d2e] px-6 py-3 rounded-xl font-bold hover:bg-green-50 transition-all shadow-lg">
                                <Download size={18} />
                                Export Report
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 p-6 mb-8">
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <Filter size={20} className="text-[#1a4d2e]" />
                                <span className="font-bold text-gray-700">Select Expense Categories:</span>
                            </div>
                            <button onClick={selectAll} className="px-4 py-2 rounded-xl font-bold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all">
                                Select All
                            </button>
                            <button onClick={clearAll} className="px-4 py-2 rounded-xl font-bold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all">
                                Clear All
                            </button>
                        </div>
                        
                        {/* Search Bar for Categories */}
                        <div className="relative">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search expense categories..."
                                    className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e] focus:outline-none transition-colors font-medium text-gray-700"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            {searchQuery && (
                                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
                                    {utilities
                                        .filter(utility => 
                                            utility.category_name.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map(utility => {
                                            const isSelected = selectedUtilities.includes(utility.category_id);
                                            return (
                                                <div
                                                    key={utility.category_id}
                                                    onClick={() => {
                                                        toggleUtility(utility.category_id);
                                                        setSearchQuery('');
                                                    }}
                                                    className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                                                        isSelected ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className={`font-medium ${isSelected ? 'text-[#1a4d2e]' : 'text-gray-700'}`}>
                                                            {utility.category_name}
                                                        </span>
                                                        {isSelected && (
                                                            <span className="text-[#1a4d2e] font-bold">✓</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    {utilities.filter(utility => 
                                        utility.category_name.toLowerCase().includes(searchQuery.toLowerCase())
                                    ).length === 0 && (
                                        <div className="px-4 py-3 text-gray-500 text-center">
                                            No categories found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected Categories Display */}
                        {selectedUtilities.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {getFilteredUtilities().map(utility => (
                                    <div
                                        key={utility.category_id}
                                        className="flex items-center gap-2 px-3 py-2 bg-green-100 text-[#1a4d2e] rounded-lg text-sm font-semibold"
                                    >
                                        {utility.category_name}
                                        <button
                                            onClick={() => toggleUtility(utility.category_id)}
                                            className="hover:text-orange-900 transition-colors"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <button
                                onClick={() => setShowFilter(!showFilter)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-green-100 text-[#1a4d2e] hover:bg-green-200 transition-all"
                            >
                                <Calendar size={16} />
                                {showFilter ? 'Hide' : 'Show'} Date Range Filter
                            </button>

                            {showFilter && (
                                <div className="mt-4 flex flex-wrap items-end gap-4">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Start Date</label>
                                        <input
                                            type="date"
                                            value={dateRange.startDate}
                                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                                        <input
                                            type="date"
                                            value={dateRange.endDate}
                                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1a4d2e] focus:border-[#1a4d2e]"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setDateRange({ startDate: '', endDate: '' })}
                                        className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                                    >
                                        Clear Dates
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {utilityData.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {getFilteredUtilities().map(utility => {
                                const iconConfig = utilityIcons[utility.category_name] || { icon: Zap, color: 'gray' };
                                const Icon = iconConfig.icon;
                                const latestAmount = utilityData[0]?.utilities[utility.category_name]?.amount || 0;
                                const trend = calculateTrend(utility.category_name);

                                return (
                                    <div key={utility.category_id} className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`p-3 rounded-xl bg-${iconConfig.color}-100`}>
                                                <Icon size={24} className={`text-${iconConfig.color}-600`} />
                                            </div>
                                            <div className={`flex items-center gap-1 text-sm font-bold ${
                                                trend.isIncrease ? 'text-red-600' : 'text-green-600'
                                            }`}>
                                                {trend.isIncrease ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                {Math.abs(parseFloat(trend.change))}%
                                            </div>
                                        </div>
                                        <h3 className="text-sm text-gray-500 mb-1">{utility.category_name}</h3>
                                        <p className="text-2xl font-bold text-gray-900">₱{latestAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                                        <p className="text-xs text-gray-400 mt-2">Latest billing period</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 12-Month Comparison Table */}
                    <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">12-Month Comparison</h2>
                            <p className="text-sm text-gray-500 mt-1">Expense breakdown by month - Showing last 12 months</p>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-gray-500">
                                Loading expense data...
                            </div>
                        ) : utilityData.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                No expenses found. Record expenses with billing periods to see data here.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Month</th>
                                            {getFilteredUtilities().map(utility => (
                                                <th key={utility.category_id} className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                                                    {utility.category_name}
                                                </th>
                                            ))}
                                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {utilityData.map((monthData, index) => {
                                            const monthTotal = calculateMonthTotal(monthData);
                                            
                                            return (
                                                <tr key={monthData.monthKey} className={`border-t border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900">{monthData.monthLabel}</div>
                                                    </td>
                                                    {getFilteredUtilities().map(utility => {
                                                        const utilData = monthData.utilities[utility.category_name];
                                                        const amount = utilData?.amount || 0;
                                                        
                                                        return (
                                                            <td key={utility.category_id} className="px-6 py-4">
                                                                <div className="text-gray-900 font-semibold">
                                                                    ₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                                </div>
                                                                {utilData && utilData.count > 1 && (
                                                                    <div className="text-xs text-gray-500">
                                                                        {utilData.count} bills
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-6 py-4">
                                                        <div className="text-gray-900 font-bold text-lg">
                                                            ₱{monthTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Month-over-Month Comparison */}
                    {!loading && utilityData.length > 1 && (
                        <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 overflow-hidden mt-8">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-xl font-bold text-gray-900">Month-over-Month Changes</h2>
                                <p className="text-sm text-gray-500 mt-1">Compare current month vs previous month</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Period</th>
                                            {getFilteredUtilities().map(utility => (
                                                <th key={utility.category_id} className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                                                    {utility.category_name}
                                                </th>
                                            ))}
                                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Total Change</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {utilityData.slice(0, -1).map((currentMonth, index) => {
                                            const previousMonth = utilityData[index + 1];
                                            const currentTotal = calculateMonthTotal(currentMonth);
                                            const previousTotal = calculateMonthTotal(previousMonth);
                                            const totalDiff = currentTotal - previousTotal;
                                            const totalPercent = previousTotal > 0 ? ((totalDiff / previousTotal) * 100).toFixed(1) : 0;
                                            
                                            return (
                                                <tr key={`${currentMonth.monthKey}-${previousMonth.monthKey}`} className={`border-t border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900">{currentMonth.monthLabel}</div>
                                                        <div className="text-xs text-gray-500">vs {previousMonth.monthLabel}</div>
                                                    </td>
                                                    {getFilteredUtilities().map(utility => {
                                                        const currentAmount = currentMonth.utilities[utility.category_name]?.amount || 0;
                                                        const previousAmount = previousMonth.utilities[utility.category_name]?.amount || 0;
                                                        const diff = currentAmount - previousAmount;
                                                        const percent = previousAmount > 0 ? ((diff / previousAmount) * 100).toFixed(1) : 0;
                                                        const isIncrease = diff > 0;
                                                        
                                                        return (
                                                            <td key={utility.category_id} className="px-6 py-4">
                                                                <div className={`font-semibold ${isIncrease ? 'text-red-600' : diff < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                                                    {isIncrease ? '+' : ''}₱{diff.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                                </div>
                                                                <div className={`text-xs flex items-center gap-1 ${isIncrease ? 'text-red-500' : diff < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                                                                    {diff !== 0 && (
                                                                        <>
                                                                            {isIncrease ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                                            {Math.abs(percent)}%
                                                                        </>
                                                                    )}
                                                                    {diff === 0 && 'No change'}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-6 py-4">
                                                        <div className={`font-bold text-lg ${totalDiff > 0 ? 'text-red-600' : totalDiff < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                                            {totalDiff > 0 ? '+' : ''}₱{totalDiff.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                        </div>
                                                        <div className={`text-sm ${totalDiff > 0 ? 'text-red-500' : totalDiff < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                                                            {totalDiff !== 0 && `${totalDiff > 0 ? '+' : ''}${totalPercent}%`}
                                                            {totalDiff === 0 && 'No change'}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Chart Visualization */}
                    {!loading && utilityData.length > 0 && selectedUtilities.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 p-6 mt-8">
                            <div className="flex items-center gap-3 mb-6">
                                <BarChart3 size={24} className="text-[#1a4d2e]" />
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Visual Trend Comparison</h2>
                                    <p className="text-sm text-gray-500">Bar chart showing expense trends across months</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto overflow-y-visible">
                                <div className="w-full pt-16 pb-4">
                                    {/* Stacked Horizontal Bars */}
                                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(utilityData.length, 12)}, 1fr)` }}>
                                        {utilityData.slice(0, 12).reverse().map((monthData, index) => {
                                            const monthTotal = calculateMonthTotal(monthData);

                                            return (
                                                <div key={monthData.monthKey} className="flex-1">
                                                    <div className="space-y-1">
                                                        {/* Stacked Bar */}
                                                        <div className="h-40 flex flex-col-reverse gap-0.5 bg-gray-100 rounded-lg overflow-visible relative">
                                                            {getFilteredUtilities().map((utility, utilIndex) => {
                                                                const amount = monthData.utilities[utility.category_name]?.amount || 0;
                                                                const percentage = monthTotal > 0 ? (amount / monthTotal) * 100 : 0;
                                                                
                                                                const colors = [
                                                                    'bg-red-500', 
                                                                    'bg-blue-500', 
                                                                    'bg-green-500',
                                                                    'bg-yellow-500',
                                                                    'bg-purple-500',
                                                                    'bg-orange-500',
                                                                    'bg-pink-500',
                                                                    'bg-teal-500'
                                                                ];
                                                                const barColor = colors[utilIndex % colors.length];

                                                                if (amount === 0) return null;

                                                                return (
                                                                    <div
                                                                        key={utility.category_id}
                                                                        className={`${barColor} group relative transition-all duration-200 hover:brightness-110 hover:z-50`}
                                                                        style={{ height: `${Math.max(percentage, 2)}%`, minHeight: '4px' }}
                                                                    >
                                                                        {/* Tooltip */}
                                                                        <div className="absolute left-1/2 bottom-full transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                                                                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                                                                                <div className="font-semibold">{utility.category_name}</div>
                                                                                <div className="text-gray-300">₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                                                                            </div>
                                                                            <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute top-full left-1/2 -translate-x-1/2 -mt-1"></div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        
                                                        {/* Month Label */}
                                                        <div className="text-center text-xs font-semibold text-gray-700 mt-2">
                                                            {monthData.monthLabel.split(' ')[0]}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Legend */}
                                    <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap gap-4 justify-center">
                                        {getFilteredUtilities().map((utility, utilIndex) => {
                                            const colors = [
                                                'bg-red-500', 
                                                'bg-blue-500', 
                                                'bg-green-500',
                                                'bg-yellow-500',
                                                'bg-purple-500',
                                                'bg-orange-500',
                                                'bg-pink-500',
                                                'bg-teal-500'
                                            ];
                                            const barColor = colors[utilIndex % colors.length];

                                            return (
                                                <div key={utility.category_id} className="flex items-center gap-2">
                                                    <div className={`w-4 h-4 ${barColor} rounded`}></div>
                                                    <span className="text-xs text-gray-600">{utility.category_name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UtilityTracker;
