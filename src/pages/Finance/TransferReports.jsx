import React, { useState } from 'react';
import { FileText, Download, Calendar, Building2, DollarSign, Filter, X, ArrowRight } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

const TransferReports = () => {
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    const [selectedBranches, setSelectedBranches] = useState([]);

    // Sample transfer history data
    const transferHistory = [
        {
            id: 1,
            date: '2026-01-30',
            reference: 'RVF-001',
            sourceAccount: 'Main Church Account',
            branches: ['Manila Branch', 'Quezon City Branch', 'Makati Branch'],
            amountPerBranch: 50000,
            totalAmount: 150000,
            purpose: 'Ministry Operations',
            status: 'Completed'
        },
        {
            id: 2,
            date: '2026-01-28',
            reference: 'RVF-002',
            sourceAccount: 'Mission Fund',
            branches: ['Pasig Branch', 'Caloocan Branch'],
            amountPerBranch: 35000,
            totalAmount: 70000,
            purpose: 'Outreach Program',
            status: 'Completed'
        },
        {
            id: 3,
            date: '2026-01-25',
            reference: 'RVF-003',
            sourceAccount: 'BDO Checking Account',
            branches: ['Manila Branch', 'Quezon City Branch', 'Makati Branch', 'Pasig Branch', 'Caloocan Branch'],
            amountPerBranch: 25000,
            totalAmount: 125000,
            purpose: 'Branch Support',
            status: 'Completed'
        },
        {
            id: 4,
            date: '2026-01-22',
            reference: 'RVF-004',
            sourceAccount: 'Main Church Account',
            branches: ['Taguig Branch', 'Paranaque Branch', 'Las Pinas Branch'],
            amountPerBranch: 40000,
            totalAmount: 120000,
            purpose: 'Event Funding',
            status: 'Completed'
        },
        {
            id: 5,
            date: '2026-01-20',
            reference: 'RVF-005',
            sourceAccount: 'BPI Savings Account',
            branches: ['Manila Branch', 'Makati Branch'],
            amountPerBranch: 60000,
            totalAmount: 120000,
            purpose: 'Emergency Fund',
            status: 'Completed'
        },
    ];

    const allBranches = [
        'Manila Branch',
        'Quezon City Branch',
        'Makati Branch',
        'Pasig Branch',
        'Caloocan Branch',
        'Taguig Branch',
        'Paranaque Branch',
        'Las Pinas Branch'
    ];

    const toggleBranch = (branch) => {
        if (selectedBranches.includes(branch)) {
            setSelectedBranches(selectedBranches.filter(b => b !== branch));
        } else {
            setSelectedBranches([...selectedBranches, branch]);
        }
    };

    const getFilteredTransfers = () => {
        if (selectedBranches.length === 0) return transferHistory;
        return transferHistory.filter(transfer => 
            transfer.branches.some(branch => selectedBranches.includes(branch))
        );
    };

    const filteredTransfers = getFilteredTransfers();
    const totalTransferred = filteredTransfers.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalTransactions = filteredTransfers.length;
    const uniqueBranches = [...new Set(filteredTransfers.flatMap(t => t.branches))].length;

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            
            <div className="flex flex-col flex-1">
                <Header />
                
                <div className="flex-1 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-10 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-2">Transfer Funds Reports</h1>
                    <p className="text-gray-600 font-medium">Complete history of revolving fund transfers to branches</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowDateFilter(!showDateFilter)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                            showDateFilter 
                            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg' 
                            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-violet-500'
                        }`}
                    >
                        <Filter size={18} />
                        Date Filter
                    </button>
                    <button className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg">
                        <Download size={18} />
                        Export Report
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
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                            <input
                                type="date"
                                value={dateRange.endDate}
                                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            />
                        </div>
                        <button
                            onClick={() => console.log('Filtering', dateRange)}
                            className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold hover:from-violet-700 hover:to-purple-700 transition-all"
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
                <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-8 rounded-3xl shadow-2xl text-white transform hover:scale-105 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                        <DollarSign size={32} />
                        <p className="text-violet-100 text-xs font-semibold uppercase tracking-wider">Total Transferred</p>
                    </div>
                    <p className="text-5xl font-black mb-2">₱{totalTransferred.toLocaleString()}</p>
                    <p className="text-sm opacity-90">All time transfers</p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-purple-100 transform hover:scale-105 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                        <FileText size={32} className="text-purple-600" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Transactions</p>
                    </div>
                    <p className="text-5xl font-black bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-2">{totalTransactions}</p>
                    <p className="text-sm text-gray-600 font-semibold">Completed transfers</p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-purple-100 transform hover:scale-105 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                        <Building2 size={32} className="text-purple-600" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Branches Served</p>
                    </div>
                    <p className="text-5xl font-black bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-2">{uniqueBranches}</p>
                    <p className="text-sm text-gray-600 font-semibold">Receiving funds</p>
                </div>
            </div>

            {/* Branch Filter */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">
                        <Building2 className="inline mr-2" size={20} />
                        Filter by Branch ({selectedBranches.length} selected)
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedBranches(allBranches)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs hover:bg-gray-200 transition-all"
                        >
                            Select All
                        </button>
                        <button
                            onClick={() => setSelectedBranches([])}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs hover:bg-gray-200 transition-all"
                        >
                            Clear
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    {allBranches.map(branch => {
                        const isSelected = selectedBranches.includes(branch);
                        return (
                            <button
                                key={branch}
                                onClick={() => toggleBranch(branch)}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                    isSelected
                                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {branch}
                                {isSelected && <span className="ml-2">✓</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Transfer History Table */}
            <div className="bg-white rounded-3xl shadow-xl border-2 border-purple-100 overflow-hidden">
                <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Transfer History</h2>
                    <p className="text-gray-600">Detailed records of all revolving fund transfers</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Reference</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Source</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Branches</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Per Branch</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-purple-700 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Purpose</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTransfers.map((transfer) => (
                                <tr key={transfer.id} className="hover:bg-purple-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900">{transfer.date}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg font-bold text-sm">
                                            {transfer.reference}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700 font-semibold">{transfer.sourceAccount}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {transfer.branches.slice(0, 2).map((branch, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                                                    {branch}
                                                </span>
                                            ))}
                                            {transfer.branches.length > 2 && (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-bold">
                                                    +{transfer.branches.length - 2} more
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                                        ₱{transfer.amountPerBranch.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-black text-lg text-purple-700">
                                        ₱{transfer.totalAmount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{transfer.purpose}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                            {transfer.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gradient-to-r from-violet-100 to-purple-100 border-t-2 border-gray-300">
                            <tr>
                                <td colSpan="5" className="px-6 py-4 font-black text-gray-900 text-right">TOTAL</td>
                                <td className="px-6 py-4 text-right font-mono font-black text-2xl text-purple-900">
                                    ₱{totalTransferred.toLocaleString()}
                                </td>
                                <td colSpan="2"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Branch-wise Summary */}
            <div className="mt-8 bg-white rounded-3xl shadow-xl border-2 border-purple-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Branch-wise Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {allBranches.map((branch) => {
                        const branchTransfers = transferHistory.filter(t => t.branches.includes(branch));
                        const branchTotal = branchTransfers.reduce((sum, t) => {
                            return sum + t.amountPerBranch;
                        }, 0);
                        const transactionCount = branchTransfers.length;

                        return (
                            <div key={branch} className="p-4 rounded-xl border-2 border-purple-100 hover:border-purple-300 transition-all">
                                <div className="flex items-center gap-2 mb-3">
                                    <Building2 size={18} className="text-purple-600" />
                                    <h3 className="font-bold text-gray-800 text-sm">{branch}</h3>
                                </div>
                                <p className="text-2xl font-black text-purple-700 mb-1">₱{branchTotal.toLocaleString()}</p>
                                <p className="text-xs text-gray-500 font-semibold">{transactionCount} transfer{transactionCount !== 1 ? 's' : ''}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
            </div>
        </div>
    );
};

export default TransferReports;
