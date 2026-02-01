import React, { useState, useEffect } from 'react';
import { Wallet, FileText, TrendingUp, DollarSign, Calendar, ArrowRight, BarChart3, PieChart, Receipt, CreditCard, Send, Filter, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';

const FinanceDashboard = () => {
    const navigate = useNavigate();
    const [currentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });

    // State for real data
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalDonations: 0,
        monthlyExpenses: 0,
        pendingRequests: 0,
        activeAccounts: 0
    });
    const [weeklyDonations, setWeeklyDonations] = useState([0, 0, 0, 0, 0, 0, 0]);
    const [expenseCategories, setExpenseCategories] = useState([]);
    const [calendarEvents, setCalendarEvents] = useState([]);

    // Fetch current user
    useEffect(() => {
        fetchCurrentUser();
    }, []);

    // Fetch all data when user is loaded
    useEffect(() => {
        if (currentUser) {
            fetchDashboardData();
        }
    }, [currentUser, dateRange]);

    const fetchCurrentUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error('No user found');
                return;
            }

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

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchDonationStats(),
                fetchExpenseStats(),
                fetchPendingRequests(),
                fetchActiveAccounts(),
                fetchWeeklyDonations(),
                fetchExpenseDistribution(),
                fetchCalendarExpenses()
            ]);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDonationStats = async () => {
        try {
            let query = supabase
                .from('transactions')
                .select('amount, transaction_date')
                .eq('branch_id', currentUser.users_details.branch_id)
                .not('donation_id', 'is', null);

            if (dateRange.startDate && dateRange.endDate) {
                query = query
                    .gte('transaction_date', dateRange.startDate)
                    .lte('transaction_date', dateRange.endDate);
            }

            const { data, error } = await query;
            if (error) throw error;

            const total = data.reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
            setStats(prev => ({ ...prev, totalDonations: total }));
        } catch (error) {
            console.error('Error fetching donation stats:', error);
        }
    };

    const fetchExpenseStats = async () => {
        try {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
            const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    transaction_id,
                    amount,
                    expenses!transactions_expense_id_fkey(
                        expense_id,
                        expense_items(
                            total_price
                        )
                    )
                `)
                .eq('branch_id', currentUser.users_details.branch_id)
                .not('expense_id', 'is', null)
                .gte('transaction_date', startOfMonth)
                .lte('transaction_date', endOfMonth);

            if (error) throw error;

            const total = data.reduce((sum, txn) => {
                if (!txn.expenses) return sum;
                const expenseTotal = (txn.expenses.expense_items || []).reduce((itemSum, item) => 
                    itemSum + parseFloat(item.total_price || 0), 0);
                return sum + expenseTotal;
            }, 0);

            setStats(prev => ({ ...prev, monthlyExpenses: total }));
        } catch (error) {
            console.error('Error fetching expense stats:', error);
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('transfers')
                .select('transfer_id')
                .eq('requires_approval', true)
                .is('approved_at', null);

            if (error) throw error;
            setStats(prev => ({ ...prev, pendingRequests: data.length }));
        } catch (error) {
            console.error('Error fetching pending requests:', error);
        }
    };

    const fetchActiveAccounts = async () => {
        try {
            const { data, error } = await supabase
                .from('finance_accounts')
                .select('account_id')
                .eq('branch_id', currentUser.users_details.branch_id);

            if (error) throw error;
            setStats(prev => ({ ...prev, activeAccounts: data.length }));
        } catch (error) {
            console.error('Error fetching active accounts:', error);
        }
    };

    const fetchWeeklyDonations = async () => {
        try {
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

            const { data, error } = await supabase
                .from('transactions')
                .select('amount, transaction_date')
                .eq('branch_id', currentUser.users_details.branch_id)
                .not('donation_id', 'is', null)
                .gte('transaction_date', weekAgo.toISOString())
                .lte('transaction_date', today.toISOString());

            if (error) throw error;

            // Group by day of week
            const weekData = [0, 0, 0, 0, 0, 0, 0];
            data.forEach(txn => {
                const date = new Date(txn.transaction_date);
                const dayOfWeek = date.getDay();
                weekData[dayOfWeek] += parseFloat(txn.amount || 0);
            });

            setWeeklyDonations(weekData);
        } catch (error) {
            console.error('Error fetching weekly donations:', error);
        }
    };

    const fetchExpenseDistribution = async () => {
        try {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
            const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    transaction_id,
                    amount,
                    expenses!transactions_expense_id_fkey(
                        expense_id,
                        expense_categories!expenses_category_id_fkey(
                            category_name
                        ),
                        expense_items(
                            total_price
                        )
                    )
                `)
                .eq('branch_id', currentUser.users_details.branch_id)
                .not('expense_id', 'is', null)
                .gte('transaction_date', startOfMonth)
                .lte('transaction_date', endOfMonth);

            if (error) throw error;

            // Group by category
            const categoryTotals = {};
            data.forEach(txn => {
                if (!txn.expenses) return;
                const categoryName = txn.expenses.expense_categories?.category_name || 'Others';
                const expenseTotal = (txn.expenses.expense_items || []).reduce((sum, item) => 
                    sum + parseFloat(item.total_price || 0), 0);
                
                if (!categoryTotals[categoryName]) {
                    categoryTotals[categoryName] = 0;
                }
                categoryTotals[categoryName] += expenseTotal;
            });

            // Convert to array and calculate percentages
            const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
            const categoriesArray = Object.entries(categoryTotals).map(([name, amount]) => ({
                label: name,
                amount: amount,
                percent: total > 0 ? ((amount / total) * 100).toFixed(1) : 0
            }));

            setExpenseCategories(categoriesArray);
        } catch (error) {
            console.error('Error fetching expense distribution:', error);
        }
    };

    const fetchCalendarExpenses = async () => {
        try {
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
            const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('expenses')
                .select(`
                    expense_id,
                    billing_period,
                    notes,
                    receipt_number,
                    expense_categories!expenses_category_id_fkey(
                        category_name
                    ),
                    expense_items(
                        total_price
                    )
                `)
                .gte('billing_period', startOfMonth)
                .lte('billing_period', endOfMonth)
                .order('billing_period', { ascending: true });

            if (error) throw error;

            // Map expenses to calendar events
            const events = data.map(expense => {
                const billingDate = new Date(expense.billing_period);
                const day = billingDate.getDate();
                const categoryName = expense.expense_categories?.category_name || 'General';
                const totalAmount = (expense.expense_items || []).reduce(
                    (sum, item) => sum + parseFloat(item.total_price || 0), 
                    0
                );

                // Determine event type based on category
                let type = 'expense';
                if (categoryName.toLowerCase().includes('utility') || categoryName.toLowerCase().includes('bill')) {
                    type = 'bill';
                } else if (categoryName.toLowerCase().includes('stipend') || categoryName.toLowerCase().includes('salary')) {
                    type = 'payment';
                }

                return {
                    date: day,
                    title: `${categoryName} - ₱${formatCurrency(totalAmount)}`,
                    type: type,
                    notes: expense.notes,
                    amount: totalAmount,
                    expense_id: expense.expense_id
                };
            });

            setCalendarEvents(events);
        } catch (error) {
            console.error('Error fetching calendar expenses:', error);
        }
    };

    const handleApplyDateFilter = () => {
        if (currentUser) {
            fetchDashboardData();
        }
    };

    const formatCurrency = (amount) => {
        return amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // Quick access shortcuts
    const shortcuts = [
        { 
            title: 'Accounts & Balances', 
            icon: <Wallet size={24} />, 
            color: 'from-blue-500 to-blue-600',
            path: '/finance/accounts-balances',
            description: 'View all accounts'
        },
        { 
            title: 'Donation Reports', 
            icon: <DollarSign size={24} />, 
            color: 'from-green-500 to-green-600',
            path: '/finance/donation-reports',
            description: 'Track donations'
        },
        { 
            title: 'Finance Reports', 
            icon: <BarChart3 size={24} />, 
            color: 'from-purple-500 to-purple-600',
            path: '/finance/statement-reports',
            description: 'Generate reports'
        },
        { 
            title: 'Transfer Funds', 
            icon: <ArrowRightLeft size={24} />, 
            color: 'from-cyan-500 to-teal-600',
            path: '/finance/transfer-funds',
            description: 'Distribute to branches'
        },
        { 
            title: 'Transfer Reports', 
            icon: <FileText size={24} />, 
            color: 'from-violet-500 to-purple-600',
            path: '/finance/transfer-reports',
            description: 'View transfer history'
        },
        { 
            title: 'Expense Entry', 
            icon: <Receipt size={24} />, 
            color: 'from-red-500 to-red-600',
            path: '/finance/expense-entry',
            description: 'Record expenses'
        },
        { 
            title: 'Utility Tracker', 
            icon: <TrendingUp size={24} />, 
            color: 'from-orange-500 to-orange-600',
            path: '/finance/utility-tracker',
            description: 'Monitor utilities'
        },
        { 
            title: 'Cash Entry', 
            icon: <Send size={24} />, 
            color: 'from-indigo-500 to-indigo-600',
            path: '/finance/cash-entry',
            description: 'Record cash donations'
        },
    ];

    // Generate calendar days
    const generateCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        return days;
    };

    const getEventForDay = (day) => {
        return calendarEvents.filter(event => event.date === day);
    };

    const getEventsForDay = (day) => {
        return calendarEvents.filter(event => event.date === day);
    };

    const getEventColor = (type) => {
        switch (type) {
            case 'payment': return 'bg-green-500';
            case 'bill': return 'bg-red-500';
            case 'expense': return 'bg-orange-500';
            case 'report': return 'bg-blue-500';
            case 'meeting': return 'bg-purple-500';
            case 'review': return 'bg-orange-500';
            default: return 'bg-gray-500';
        }
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            
            <div className="flex flex-col flex-1">
                <Header />
                
                {/* MAIN WRAPPER: Pure white background with padding and margin from sidebar */}
                <div className="flex-1 bg-gradient-to-br from-gray-50 to-green-50 p-10 overflow-y-auto">
                    
                    {/* Top Header Bar */}
                    <div className="mb-10">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Finance Dashboard</h1>
                        <p className="text-gray-500">Church Financial Overview and Management</p>
                    </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column - Stats and Shortcuts */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Quick Stats Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-gray-800 font-bold text-sm uppercase tracking-widest opacity-70">Church Financial Overview</h3>
                            <button
                                onClick={() => setShowDateFilter(!showDateFilter)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                    showDateFilter 
                                    ? 'bg-green-600 text-white shadow-md' 
                                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-green-500'
                                }`}
                            >
                                <Filter size={16} />
                                Date Filter
                            </button>
                        </div>

                        {/* Date Filter */}
                        {showDateFilter && (
                            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 mb-6">
                                <div className="flex flex-wrap items-end gap-4">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Start Date</label>
                                        <input
                                            type="date"
                                            value={dateRange.startDate}
                                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                                        <input
                                            type="date"
                                            value={dateRange.endDate}
                                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                    <button
                                        onClick={handleApplyDateFilter}
                                        className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all"
                                    >
                                        Apply Filter
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {loading ? (
                                <div className="col-span-4 text-center py-8">
                                    <p className="text-gray-500">Loading dashboard data...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl transition-all">
                                        <div className="inline-flex p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mb-4">
                                            <div className="text-white">
                                                <DollarSign size={20} />
                                            </div>
                                        </div>
                                        <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">Total Donations</h3>
                                        <p className="text-3xl font-extrabold text-gray-800">₱{formatCurrency(stats.totalDonations)}</p>
                                    </div>
                                    
                                    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl transition-all">
                                        <div className="inline-flex p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl mb-4">
                                            <div className="text-white">
                                                <Receipt size={20} />
                                            </div>
                                        </div>
                                        <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">Expenses This Month</h3>
                                        <p className="text-3xl font-extrabold text-gray-800">₱{formatCurrency(stats.monthlyExpenses)}</p>
                                    </div>
                                    
                                    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl transition-all">
                                        <div className="inline-flex p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl mb-4">
                                            <div className="text-white">
                                                <FileText size={20} />
                                            </div>
                                        </div>
                                        <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">Pending Fund Requests</h3>
                                        <p className="text-3xl font-extrabold text-gray-800">{stats.pendingRequests}</p>
                                    </div>
                                    
                                    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl transition-all">
                                        <div className="inline-flex p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mb-4">
                                            <div className="text-white">
                                                <Wallet size={20} />
                                            </div>
                                        </div>
                                        <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">Total Active Accounts</h3>
                                        <p className="text-3xl font-extrabold text-gray-800">{stats.activeAccounts}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Quick Access Shortcuts */}
                    <div>
                        <h3 className="text-gray-800 font-bold mb-4 text-sm uppercase tracking-widest opacity-70">Quick Access</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {shortcuts.map((shortcut, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => navigate(shortcut.path)}
                                    className={`bg-gradient-to-br ${shortcut.color} text-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 group`}
                                >
                                    <div className="flex flex-col items-start gap-3">
                                        <div className="p-3 bg-white bg-opacity-20 rounded-xl group-hover:bg-opacity-30 transition-all">
                                            {shortcut.icon}
                                        </div>
                                        <div className="text-left">
                                            <h4 className="font-bold text-sm mb-1">{shortcut.title}</h4>
                                            <p className="text-xs opacity-90">{shortcut.description}</p>
                                        </div>
                                        <ArrowRight size={16} className="ml-auto opacity-70 group-hover:opacity-100 transition-all" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Financial Overview Charts */}
                    <div>
                        <h3 className="text-gray-800 font-bold mb-4 text-sm uppercase tracking-widest opacity-70">Financial Overview</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Donations Chart */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md h-80 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="font-bold text-gray-700 mb-1">Weekly Donations</h4>
                                        <p className="text-2xl font-black text-gray-800">₱{formatCurrency(weeklyDonations.reduce((sum, val) => sum + val, 0))}</p>
                                    </div>
                                    <div className="p-3 bg-green-100 rounded-xl">
                                        <TrendingUp className="text-green-600" size={24} />
                                    </div>
                                </div>
                                <p className="text-xs text-green-600 font-bold mb-4">Last 7 Days</p>
                                
                                {/* Bar Chart */}
                                <div className="flex-1 flex flex-col justify-end">
                                    <div className="h-40 flex items-end justify-between gap-2 px-2">
                                        {weeklyDonations.map((amount, i) => {
                                            const maxAmount = Math.max(...weeklyDonations, 1);
                                            const heightPercent = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                                            const heightPx = maxAmount > 0 ? Math.max((amount / maxAmount) * 140, amount > 0 ? 8 : 2) : 2;
                                            
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                                    <div className="w-full flex justify-center items-end" style={{ height: '140px' }}>
                                                        <div 
                                                            className="w-full bg-gradient-to-t from-green-500 to-green-300 rounded-t-lg transition-all hover:from-green-600 hover:to-green-400 cursor-pointer shadow-sm" 
                                                            style={{ 
                                                                height: `${heightPx}px`,
                                                                minHeight: amount > 0 ? '8px' : '2px'
                                                            }}
                                                            title={`${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i]}: ₱${formatCurrency(amount)}`}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 font-bold">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Expense Distribution */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md h-80 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="font-bold text-gray-700 mb-1">Expense Distribution</h4>
                                        <p className="text-2xl font-black text-gray-800">₱{formatCurrency(stats.monthlyExpenses)}</p>
                                    </div>
                                    <div className="p-3 bg-purple-100 rounded-xl">
                                        <PieChart className="text-purple-600" size={24} />
                                    </div>
                                </div>
                                <p className="text-xs text-purple-600 font-bold mb-6">This Month</p>
                                
                                {/* Category Legend */}
                                {expenseCategories.length > 0 ? (
                                    <>
                                        <div className="flex-1 flex items-center justify-center mb-4">
                                            <div className="text-center">
                                                <p className="text-sm text-gray-600 mb-2">Top Categories</p>
                                                <div className="space-y-1">
                                                    {expenseCategories.slice(0, 4).map((cat, i) => (
                                                        <div key={i} className="flex items-center gap-2 justify-center">
                                                            <div className={`w-3 h-3 rounded-full`} style={{ 
                                                                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][i % 4]
                                                            }}></div>
                                                            <span className="text-xs text-gray-700 font-semibold">{cat.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 mt-auto">
                                            {expenseCategories.slice(0, 4).map((cat, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full`} style={{ 
                                                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][i % 4]
                                                    }}></div>
                                                    <span className="text-xs text-gray-600">{cat.percent}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center">
                                        <p className="text-sm text-gray-400">No expense data available</p>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>

                {/* Right Column - Calendar */}
                <div className="xl:col-span-1">
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 sticky top-4">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-100 rounded-xl">
                                <Calendar className="text-indigo-600" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                                <p className="text-sm text-gray-500">Important Dates</p>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="mb-4">
                            <div className="grid grid-cols-7 gap-2 mb-2">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                    <div key={i} className="text-center text-xs font-bold text-gray-500 py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="grid grid-cols-7 gap-2">
                                {generateCalendar().map((day, i) => {
                                    const events = day ? getEventsForDay(day) : [];
                                    const hasEvents = events.length > 0;
                                    const isToday = day === currentDate.getDate();
                                    const isSelected = day === selectedDate;
                                    
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => day && setSelectedDate(day)}
                                            className={`aspect-square flex items-center justify-center rounded-lg text-sm font-semibold relative ${
                                                !day ? 'invisible' : 
                                                isToday ? 'bg-indigo-600 text-white' :
                                                isSelected ? 'bg-indigo-400 text-white' :
                                                hasEvents ? 'bg-gray-100 text-gray-900 hover:bg-gray-200' : 
                                                'text-gray-600 hover:bg-gray-50'
                                            } transition-all cursor-pointer`}
                                            title={hasEvents ? events.map(e => e.title).join(', ') : ''}
                                        >
                                            {day}
                                            {hasEvents && !isToday && !isSelected && (
                                                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                                                    {events.slice(0, 3).map((event, idx) => (
                                                        <div key={idx} className={`w-1 h-1 ${getEventColor(event.type)} rounded-full`}></div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Upcoming Events */}
                        <div className="mt-6">
                            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Upcoming Events</h3>
                            <div className="space-y-2">
                                {calendarEvents.slice(0, 5).map((event, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all">
                                        <div className={`w-2 h-2 ${getEventColor(event.type)} rounded-full flex-shrink-0`}></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
                                            <p className="text-xs text-gray-500">{monthNames[currentDate.getMonth()]} {event.date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <button 
                                onClick={() => navigate('/finance/statement-reports')}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
                            >
                                Generate Monthly Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>

                </div>
            </div>
        </div>
    );
};

export default FinanceDashboard;