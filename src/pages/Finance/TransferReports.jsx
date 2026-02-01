import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Building2, DollarSign, Filter, X, ArrowRight } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';

const TransferReports = () => {
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchBranches();
            fetchTransfers();
        }
    }, [dateRange, selectedBranches, currentUser]);

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

    const fetchBranches = async () => {
        if (!currentUser?.users_details?.branch_id) return;
        
        try {
            const { data, error } = await supabase
                .from('branches')
                .select('branch_id, name, city')
                .neq('branch_id', currentUser.users_details.branch_id)
                .order('name');

            if (error) throw error;
            setBranches(data || []);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const fetchTransfers = async () => {
        if (!currentUser?.users_details?.branch_id) return;

        setLoading(true);
        try {
            // Build query for transactions with transfer_id
            let query = supabase
                .from('transactions')
                .select(`
                    transaction_id,
                    amount,
                    transaction_date,
                    status,
                    reference_id,
                    branch_id,
                    transaction_type,
                    transfers!transactions_transfer_id_fkey(
                        transfer_id,
                        amount,
                        transfer_method,
                        notes,
                        approved_at
                    ),
                    branches!fk_transactions_branch(
                        branch_id,
                        name,
                        city
                    ),
                    finance_accounts!transactions_account_id_fkey(
                        account_id,
                        account_name,
                        account_type
                    )
                `)
                .not('transfer_id', 'is', null)
                .eq('status', 'Completed')
                .order('transaction_date', { ascending: false });

            // Apply date filters
            if (dateRange.startDate) {
                query = query.gte('transaction_date', dateRange.startDate);
            }
            if (dateRange.endDate) {
                query = query.lte('transaction_date', dateRange.endDate);
            }

            // Apply branch filter
            if (selectedBranches.length > 0) {
                query = query.in('branch_id', selectedBranches);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Group transactions by transfer_id
            const transfersMap = {};
            data?.forEach(txn => {
                const transferId = txn.transfers?.transfer_id;
                if (!transferId) return;

                if (!transfersMap[transferId]) {
                    transfersMap[transferId] = {
                        transfer_id: transferId,
                        date: txn.transaction_date,
                        reference: txn.reference_id || `TRF-${transferId}`,
                        sourceAccount: txn.finance_accounts?.account_name || 'Unknown',
                        branches: [],
                        totalAmount: Math.abs(txn.transfers.amount || 0),
                        purpose: txn.transfers.transfer_method || 'Fund Transfer',
                        status: txn.status,
                        approved_at: txn.transfers.approved_at,
                        transactions: []
                    };
                }
                
                // Add branch if Transfer In
                if (txn.transaction_type === 'Transfer In' && txn.branches) {
                    if (!transfersMap[transferId].branches.find(b => b.branch_id === txn.branches.branch_id)) {
                        transfersMap[transferId].branches.push({
                            branch_id: txn.branches.branch_id,
                            name: txn.branches.name
                        });
                    }
                }
                
                transfersMap[transferId].transactions.push(txn);
            });

            // Calculate amount per branch
            const transfersList = Object.values(transfersMap).map(transfer => ({
                ...transfer,
                amountPerBranch: transfer.branches.length > 0 
                    ? transfer.totalAmount / transfer.branches.length 
                    : transfer.totalAmount
            }));

            setTransfers(transfersList);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching transfers:', error);
            setLoading(false);
        }
    };

    const toggleBranch = (branchId) => {
        if (selectedBranches.includes(branchId)) {
            setSelectedBranches(selectedBranches.filter(b => b !== branchId));
        } else {
            setSelectedBranches([...selectedBranches, branchId]);
        }
    };

    const totalTransferred = transfers.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalTransactions = transfers.length;
    const uniqueBranches = [...new Set(transfers.flatMap(t => t.branches.map(b => b.branch_id)))].length;

    const handleApplyDateFilter = () => {
        fetchTransfers();
        setShowDateFilter(false);
    };

    const exportToCSV = () => {
        let csv = 'Transfer Reports\n\n';
        csv += `Total Transferred: ₱${totalTransferred.toLocaleString()}\n`;
        csv += `Total Transactions: ${totalTransactions}\n\n`;
        
        csv += 'Date,Reference,Source,Branches,Per Branch,Total,Purpose,Status\n';
        transfers.forEach(t => {
            const branchNames = t.branches.map(b => b.name).join('; ');
            csv += `${t.date},${t.reference},${t.sourceAccount},"${branchNames}",${t.amountPerBranch},${t.totalAmount},${t.purpose},${t.status}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transfer-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

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
                    <button onClick={exportToCSV} className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg">
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
                        onClick={handleApplyDateFilter}
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
                            onClick={() => setSelectedBranches(branches.map(b => b.branch_id))}
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
                    {branches.map(branch => {
                        const isSelected = selectedBranches.includes(branch.branch_id);
                        return (
                            <button
                                key={branch.branch_id}
                                onClick={() => toggleBranch(branch.branch_id)}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                    isSelected
                                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {branch.name}
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
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                                        Loading transfers...
                                    </td>
                                </tr>
                            ) : transfers.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                                        No transfers found for the selected filters
                                    </td>
                                </tr>
                            ) : transfers.map((transfer) => (
                                <tr key={transfer.transfer_id} className="hover:bg-purple-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900">
                                        {new Date(transfer.date).toLocaleDateString()}
                                    </td>
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
                                                    {branch.name}
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
                                        ₱{transfer.amountPerBranch.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-black text-lg text-purple-700">
                                        ₱{transfer.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    {branches.map((branch) => {
                        const branchTransfers = transfers.filter(t => 
                            t.branches.some(b => b.branch_id === branch.branch_id)
                        );
                        const branchTotal = branchTransfers.reduce((sum, t) => {
                            return sum + t.amountPerBranch;
                        }, 0);
                        const transactionCount = branchTransfers.length;

                        return (
                            <div key={branch.branch_id} className="p-4 rounded-xl border-2 border-purple-100 hover:border-purple-300 transition-all">
                                <div className="flex items-center gap-2 mb-3">
                                    <Building2 size={18} className="text-purple-600" />
                                    <h3 className="font-bold text-gray-800 text-sm">{branch.name}</h3>
                                </div>
                                <p className="text-2xl font-black text-purple-700 mb-1">
                                    ₱{branchTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
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
