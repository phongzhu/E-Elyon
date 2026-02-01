import React, { useState } from 'react';
import { Download, Filter, Search, Calendar, TrendingUp, TrendingDown, ArrowRightLeft, Plus, Minus } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

const FinancialAuditTrail = () => {
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Sample audit trail data
    const transactions = [
        { 
            id: 1, 
            date: '2026-01-31', 
            time: '14:35:22',
            type: 'Income',
            category: 'Cash Entry',
            description: 'Walk-in donation - Anonymous',
            account: 'Cash on Hand',
            amount: 5000,
            balance: 239567.50,
            user: 'Finance Officer - Ana Santos',
            reference: 'CE-001',
            icon: <Plus className="text-green-600" size={20} />
        },
        { 
            id: 2, 
            date: '2026-01-31', 
            time: '13:20:15',
            type: 'Expense',
            category: 'Utilities',
            description: 'Meralco - January 2026 electricity bill',
            account: 'BDO Checking Account',
            amount: 11230,
            balance: 845559.25,
            user: 'Finance Officer - Ana Santos',
            reference: 'EXP-001',
            icon: <Minus className="text-red-600" size={20} />
        },
        { 
            id: 3, 
            date: '2026-01-31', 
            time: '11:45:00',
            type: 'Transfer',
            category: 'Inter-Account Transfer',
            description: 'Transfer from PayMongo Wallet to BDO Checking',
            account: 'Multiple',
            amount: 25000,
            balance: null,
            user: 'Finance Officer - Ana Santos',
            reference: 'TRF-005',
            icon: <ArrowRightLeft className="text-purple-600" size={20} />
        },
        { 
            id: 4, 
            date: '2026-01-30', 
            time: '16:20:45',
            type: 'Income',
            category: 'PayMongo',
            description: 'Online donation - Juan Dela Cruz',
            account: 'PayMongo Wallet',
            amount: 15000,
            balance: 104234.00,
            user: 'System - PayMongo Integration',
            reference: 'PM-045',
            icon: <Plus className="text-green-600" size={20} />
        },
        { 
            id: 5, 
            date: '2026-01-30', 
            time: '14:10:30',
            type: 'Expense',
            category: 'Office Supplies',
            description: 'Office Depot - Paper and printing supplies',
            account: 'Petty Cash Fund',
            amount: 5450,
            balance: 19550.00,
            user: 'Staff - Juan Reyes',
            reference: 'EXP-002',
            icon: <Minus className="text-red-600" size={20} />
        },
        { 
            id: 6, 
            date: '2026-01-30', 
            time: '10:30:15',
            type: 'Income',
            category: 'Special Offering',
            description: 'Building Fund - Maria Santos',
            account: 'Building Fund',
            amount: 50000,
            balance: 500000.00,
            user: 'Finance Officer - Ana Santos',
            reference: 'CE-002',
            icon: <Plus className="text-green-600" size={20} />
        },
        { 
            id: 7, 
            date: '2026-01-29', 
            time: '15:45:20',
            type: 'Expense',
            category: 'Stipends',
            description: 'Monthly stipend - Pastor Carlos Mendoza',
            account: 'BDO Checking Account',
            amount: 25000,
            balance: 831789.25,
            user: 'Finance Officer - Ana Santos',
            reference: 'STIP-001',
            icon: <Minus className="text-red-600" size={20} />
        },
        { 
            id: 8, 
            date: '2026-01-29', 
            time: '14:20:10',
            type: 'Transfer',
            category: 'Branch Fund Release',
            description: 'Monthly revolving fund - Quezon City Branch',
            account: 'Multiple',
            amount: 50000,
            balance: null,
            user: 'Bishop - Carlos Mendoza',
            reference: 'BFR-003',
            icon: <ArrowRightLeft className="text-purple-600" size={20} />
        },
        { 
            id: 9, 
            date: '2026-01-28', 
            time: '11:15:00',
            type: 'Expense',
            category: 'Building Maintenance',
            description: 'ABC Hardware - Bathroom repair materials',
            account: 'Building Fund',
            amount: 8750,
            balance: 491250.00,
            user: 'Maintenance - Pedro Cruz',
            reference: 'EXP-003',
            icon: <Minus className="text-red-600" size={20} />
        },
        { 
            id: 10, 
            date: '2026-01-27', 
            time: '09:30:45',
            type: 'Income',
            category: 'Tithes',
            description: 'Sunday service collection',
            account: 'Cash on Hand',
            amount: 78500,
            balance: 312567.50,
            user: 'Finance Officer - Ana Santos',
            reference: 'CE-003',
            icon: <Plus className="text-green-600" size={20} />
        },
    ];

    const filteredTransactions = transactions.filter(t => {
        const matchesType = filter === 'all' || t.type.toLowerCase() === filter;
        const matchesSearch = searchTerm === '' || 
            t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.user.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    const totalIncome = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
    const netChange = totalIncome - totalExpense;

    const getTypeColor = (type) => {
        switch(type) {
            case 'Income':
                return 'bg-green-100 text-green-700';
            case 'Expense':
                return 'bg-red-100 text-red-700';
            case 'Transfer':
                return 'bg-purple-100 text-purple-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            
            <div className="flex flex-col flex-1">
                <Header />
                
                <div className="flex-1 bg-gradient-to-br from-gray-50 to-slate-50 p-10 overflow-y-auto">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Financial Audit Trail</h1>
                    <p className="text-gray-500">Complete transaction history and financial activity log</p>
                </div>
                <button className="flex items-center gap-2 bg-slate-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg">
                    <Download size={18} />
                    Export CSV
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="text-green-600" size={24} />
                        <p className="text-xs font-semibold text-gray-500 uppercase">Total Income</p>
                    </div>
                    <p className="text-3xl font-black text-green-700">₱{totalIncome.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">{transactions.filter(t => t.type === 'Income').length} transactions</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingDown className="text-red-600" size={24} />
                        <p className="text-xs font-semibold text-gray-500 uppercase">Total Expenses</p>
                    </div>
                    <p className="text-3xl font-black text-red-700">₱{totalExpense.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">{transactions.filter(t => t.type === 'Expense').length} transactions</p>
                </div>

                <div className={`p-6 rounded-2xl shadow-lg border ${netChange >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        {netChange >= 0 ? <TrendingUp className="text-green-600" size={24} /> : <TrendingDown className="text-red-600" size={24} />}
                        <p className="text-xs font-semibold text-gray-700 uppercase">Net Change</p>
                    </div>
                    <p className={`text-3xl font-black ${netChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {netChange >= 0 ? '+' : ''}₱{netChange.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">Period total</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Search size={20} className="text-gray-500" />
                            <span className="font-bold text-gray-700">Search:</span>
                        </div>
                        <input
                            type="text"
                            placeholder="Search by description, reference, or user..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Filter size={20} className="text-gray-500" />
                            <span className="font-bold text-gray-700">Filter by Type:</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                    filter === 'all' ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('income')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                    filter === 'income' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Income
                            </button>
                            <button
                                onClick={() => setFilter('expense')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                    filter === 'expense' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Expense
                            </button>
                            <button
                                onClick={() => setFilter('transfer')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                    filter === 'transfer' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Transfer
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b-2 border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date & Time</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Account</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Balance</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTransactions.map(transaction => (
                                <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{transaction.date}</p>
                                            <p className="text-xs text-gray-500">{transaction.time}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-gray-50 p-2 rounded-lg">
                                                {transaction.icon}
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTypeColor(transaction.type)}`}>
                                                {transaction.type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{transaction.category}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-semibold text-gray-900">{transaction.description}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-700">{transaction.account}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className={`font-mono font-bold text-lg ${
                                            transaction.type === 'Income' ? 'text-green-700' : 
                                            transaction.type === 'Expense' ? 'text-red-700' : 
                                            'text-purple-700'
                                        }`}>
                                            {transaction.type === 'Income' ? '+' : transaction.type === 'Expense' ? '-' : ''}₱{transaction.amount.toLocaleString()}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {transaction.balance !== null ? (
                                            <p className="font-mono text-sm text-gray-900">₱{transaction.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                                        ) : (
                                            <p className="text-xs text-gray-400">N/A</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs text-gray-600">{transaction.user}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-mono text-xs font-bold text-slate-700">{transaction.reference}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
            </div>
        </div>
    );
};

export default FinancialAuditTrail;
