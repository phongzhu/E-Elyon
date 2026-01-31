import React, { useState } from 'react';
import { Wallet, FileText, TrendingUp, DollarSign, Calendar, ArrowRight, BarChart3, PieChart, Receipt, CreditCard, Send, Filter, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

const FinanceDashboard = () => {
    const navigate = useNavigate();
    const [currentDate] = useState(new Date());
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });

    // Calendar events for the current month
    const [calendarEvents] = useState([
        { date: 5, title: 'Stipend Payment', type: 'payment' },
        { date: 10, title: 'Utility Bills Due', type: 'bill' },
        { date: 15, title: 'Monthly Report', type: 'report' },
        { date: 20, title: 'Budget Meeting', type: 'meeting' },
        { date: 25, title: 'Expense Review', type: 'review' },
    ]);

    // Quick access shortcuts
    const shortcuts = [
        { 
            title: 'Accounts & Balances', 
            icon: <Wallet size={24} />, 
            color: 'from-blue-500 to-blue-600',
            path: '/finance/funds',
            description: 'View all accounts'
        },
        { 
            title: 'Donation Reports', 
            icon: <DollarSign size={24} />, 
            color: 'from-green-500 to-green-600',
            path: '/finance/donations',
            description: 'Track donations'
        },
        { 
            title: 'Finance Reports', 
            icon: <BarChart3 size={24} />, 
            color: 'from-purple-500 to-purple-600',
            path: '/finance/reports',
            description: 'Generate reports'
        },
        { 
            title: 'Transfer Funds', 
            icon: <ArrowRightLeft size={24} />, 
            color: 'from-cyan-500 to-teal-600',
            path: '/finance/transfers',
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
            path: '/finance/expenses',
            description: 'Record expenses'
        },
        { 
            title: 'Utility Tracker', 
            icon: <TrendingUp size={24} />, 
            color: 'from-orange-500 to-orange-600',
            path: '/finance/utilities',
            description: 'Monitor utilities'
        },
        { 
            title: 'Request Fund', 
            icon: <Send size={24} />, 
            color: 'from-indigo-500 to-indigo-600',
            path: '/finance/request-fund',
            description: 'Submit fund request'
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
        return calendarEvents.find(event => event.date === day);
    };

    const getEventColor = (type) => {
        switch (type) {
            case 'payment': return 'bg-green-500';
            case 'bill': return 'bg-red-500';
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
                                        onClick={() => console.log('Filtering', dateRange)}
                                        className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all"
                                    >
                                        Apply Filter
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { title: "Total Donations", value: "₱685K", icon: <DollarSign size={20} />, color: "from-green-500 to-emerald-600" },
                                { title: "Expenses This Month", value: "₱425K", icon: <Receipt size={20} />, color: "from-red-500 to-pink-600" },
                                { title: "Pending Fund Requests", value: "15", icon: <FileText size={20} />, color: "from-orange-500 to-amber-600" },
                                { title: "Total Active Accounts", value: "7", icon: <Wallet size={20} />, color: "from-blue-500 to-indigo-600" },
                            ].map((card, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl transition-all">
                                    <div className={`inline-flex p-3 bg-gradient-to-br ${card.color} rounded-xl mb-4`}>
                                        <div className="text-white">
                                            {card.icon}
                                        </div>
                                    </div>
                                    <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">{card.title}</h3>
                                    <p className="text-3xl font-extrabold text-gray-800">{card.value}</p>
                                </div>
                            ))}
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
                            
                            {/* Income Chart */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md h-80 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="font-bold text-gray-700 mb-1">Monthly Income</h4>
                                        <p className="text-2xl font-black text-gray-800">₱685,000</p>
                                    </div>
                                    <div className="p-3 bg-green-100 rounded-xl">
                                        <TrendingUp className="text-green-600" size={24} />
                                    </div>
                                </div>
                                <p className="text-xs text-green-600 font-bold mb-6">This Month <span className="ml-1">+12%</span></p>
                                
                                {/* Mock Bar Chart */}
                                <div className="flex-1 flex items-end justify-between gap-2 px-2">
                                    {[65, 80, 50, 90, 70, 85, 75].map((h, i) => (
                                        <div key={i} className="w-full flex flex-col items-center gap-2">
                                            <div className="w-full bg-gradient-to-t from-green-500 to-green-300 rounded-t-lg transition-all hover:from-green-600 hover:to-green-400 cursor-pointer" style={{ height: `${h}%` }}></div>
                                            <span className="text-[10px] text-gray-400 font-bold">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Expense Distribution */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md h-80 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="font-bold text-gray-700 mb-1">Expense Distribution</h4>
                                        <p className="text-2xl font-black text-gray-800">₱425,000</p>
                                    </div>
                                    <div className="p-3 bg-purple-100 rounded-xl">
                                        <PieChart className="text-purple-600" size={24} />
                                    </div>
                                </div>
                                <p className="text-xs text-purple-600 font-bold mb-6">This Month</p>
                                
                                {/* Mock Pie Chart with Legend */}
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="relative w-32 h-32">
                                        <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                            <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="20" strokeDasharray="75 25" />
                                            <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray="50 50" strokeDashoffset="-75" />
                                            <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="20" strokeDasharray="40 60" strokeDashoffset="-125" />
                                            <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="20" strokeDasharray="35 65" strokeDashoffset="-165" />
                                        </svg>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    {[
                                        { label: 'Utilities', percent: '30%', color: 'bg-blue-500' },
                                        { label: 'Stipends', percent: '20%', color: 'bg-green-500' },
                                        { label: 'Maintenance', percent: '16%', color: 'bg-orange-500' },
                                        { label: 'Others', percent: '14%', color: 'bg-red-500' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className={`w-3 h-3 ${item.color} rounded-full`}></div>
                                            <span className="text-xs text-gray-600">{item.label} {item.percent}</span>
                                        </div>
                                    ))}
                                </div>
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
                                    const event = day ? getEventForDay(day) : null;
                                    const isToday = day === currentDate.getDate();
                                    
                                    return (
                                        <div
                                            key={i}
                                            className={`aspect-square flex items-center justify-center rounded-lg text-sm font-semibold relative ${
                                                !day ? 'invisible' : 
                                                isToday ? 'bg-indigo-600 text-white' :
                                                event ? 'bg-gray-100 text-gray-900' : 
                                                'text-gray-600 hover:bg-gray-50'
                                            } transition-all cursor-pointer`}
                                        >
                                            {day}
                                            {event && !isToday && (
                                                <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 ${getEventColor(event.type)} rounded-full`}></div>
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
                                onClick={() => navigate('/finance/reports')}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg mb-2"
                            >
                                Generate Monthly Report
                            </button>
                            <button 
                                onClick={() => navigate('/finance/request-fund')}
                                className="w-full bg-white border-2 border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold text-sm hover:border-indigo-500 hover:text-indigo-700 transition-all"
                            >
                                Submit Fund Request
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