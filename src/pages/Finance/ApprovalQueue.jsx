import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Clock, AlertCircle, Download } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';

const ApprovalQueue = () => {
    const [filter, setFilter] = useState('pending');
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchExpenses();
        }
    }, [currentUser, filter]);

    const fetchCurrentUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Query users table and join with users_details using user_details_id
                const { data: userData, error } = await supabase
                    .from('users')
                    .select(`
                        user_id, 
                        email,
                        user_details_id,
                        users_details!users_user_details_id_fkey(
                            first_name, 
                            last_name, 
                            branch_id
                        )
                    `)
                    .eq('auth_user_id', user.id)
                    .limit(1)
                    .single();
                
                if (error) {
                    console.error('Error fetching user data:', error);
                } else if (userData) {
                    console.log('Fetched user data:', userData);
                    setCurrentUser(userData);
                }
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    };

    const fetchExpenses = async () => {
        try {
            setLoading(true);

            // Get user's branch_id (users_details is now an object, not an array)
            const userBranchId = currentUser?.users_details?.branch_id;
            
            console.log('Current User:', currentUser);
            console.log('users_details:', currentUser?.users_details);
            console.log('User Branch ID:', userBranchId);

            // Fetch expenses that are NOT stipends (category_id != 31) AND require approval AND match user's branch
            let query = supabase
                .from('transactions')
                .select(`
                    transaction_id,
                    transaction_date,
                    amount,
                    status,
                    created_by,
                    branch_id,
                    users!transactions_created_by_fkey(
                        email,
                        users_details(first_name, last_name)
                    ),
                    expenses!inner(
                        expense_id,
                        billing_period,
                        receipt_number,
                        receipt_file,
                        notes,
                        category_id,
                        requires_approval,
                        expense_categories!inner(category_id, category_name),
                        expense_items(item_name, quantity, unit_price, total_price)
                    ),
                    finance_accounts!transactions_account_id_fkey(account_name)
                `)
                .eq('transaction_type', 'Expense')
                .neq('expenses.category_id', 31)
                .eq('expenses.requires_approval', true);

            // Filter by branch_id if user has one (branch_id is now in transactions table)
            if (userBranchId) {
                console.log('Filtering by branch_id:', userBranchId);
                query = query.eq('branch_id', userBranchId);
            } else {
                console.warn('No branch_id found for user, showing all transactions');
            }
            
            query = query.order('transaction_date', { ascending: false });

            const { data, error } = await query;

            if (error) throw error;
            
            console.log('Fetched transactions:', data?.length, 'records');
            console.log('Sample transaction branch_ids:', data?.slice(0, 3).map(t => ({ id: t.transaction_id, branch_id: t.branch_id })));

            // Format data
            const formattedExpenses = (data || []).map(transaction => ({
                transaction_id: transaction.transaction_id,
                expense_id: transaction.expenses?.expense_id,
                date: new Date(transaction.transaction_date).toLocaleDateString('en-PH'),
                submittedBy: transaction.users?.users_details?.[0]
                    ? `${transaction.users.users_details[0].first_name} ${transaction.users.users_details[0].last_name}`
                    : transaction.users?.email || 'Unknown',
                category: transaction.expenses?.expense_categories?.category_name || 'Uncategorized',
                amount: transaction.amount,
                description: transaction.expenses?.notes || 'No description',
                receiptNumber: transaction.expenses?.receipt_number,
                receiptFile: transaction.expenses?.receipt_file,
                billingPeriod: transaction.expenses?.billing_period,
                account: transaction.finance_accounts?.account_name || 'Unknown',
                status: transaction.status,
                items: transaction.expenses?.expense_items || []
            }));

            setExpenses(formattedExpenses);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredExpenses = expenses.filter(exp => {
        if (filter === 'all') return true;
        return exp.status.toLowerCase() === filter;
    });

    const pendingCount = expenses.filter(e => e.status === 'Pending').length;
    const approvedCount = expenses.filter(e => e.status === 'Completed').length;
    const rejectedCount = expenses.filter(e => e.status === 'Rejected').length;

    const handleApprove = async (transactionId) => {
        try {
            const { error } = await supabase
                .from('transactions')
                .update({ status: 'Completed' })
                .eq('transaction_id', transactionId);

            if (error) throw error;

            alert('Expense approved successfully!');
            fetchExpenses();
        } catch (error) {
            console.error('Error approving expense:', error);
            alert('Failed to approve expense');
        }
    };

    const handleReject = async (transactionId) => {
        const reason = prompt('Please provide a reason for rejection:');
        if (reason) {
            try {
                const { error } = await supabase
                    .from('transactions')
                    .update({ 
                        status: 'Rejected',
                        notes: reason 
                    })
                    .eq('transaction_id', transactionId);

                if (error) throw error;

                alert('Expense rejected');
                fetchExpenses();
            } catch (error) {
                console.error('Error rejecting expense:', error);
                alert('Failed to reject expense');
            }
        }
    };

    const downloadReceipt = async (filePath) => {
        try {
            const { data, error } = await supabase.storage
                .from('expense-receipts')
                .download(filePath);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = filePath.split('/').pop();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading receipt:', error);
            alert('Failed to download receipt');
        }
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'Pending':
                return <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                    <Clock size={12} /> Pending
                </span>;
            case 'Completed':
                return <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    <CheckCircle size={12} /> Approved
                </span>;
            case 'Rejected':
                return <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                    <XCircle size={12} /> Rejected
                </span>;
            default:
                return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">{status}</span>;
        }
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
            <Sidebar />
            
            <div className="flex flex-col flex-1">
                <Header />
                
                <div className="flex-1 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-10 overflow-y-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Expense Approval Queue</h1>
                <p className="text-gray-500">Review and approve/reject expense requests from staff</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading expenses...</p>
                    </div>
                </div>
            ) : (
                <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-6 rounded-2xl shadow-lg text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock size={24} />
                        <p className="text-yellow-100 text-xs font-semibold uppercase">Pending Approval</p>
                    </div>
                    <p className="text-4xl font-black">{pendingCount}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="text-green-600" size={24} />
                        <p className="text-xs font-semibold text-gray-500 uppercase">Approved</p>
                    </div>
                    <p className="text-4xl font-black text-green-700">{approvedCount}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                        <XCircle className="text-red-600" size={24} />
                        <p className="text-xs font-semibold text-gray-500 uppercase">Rejected</p>
                    </div>
                    <p className="text-4xl font-black text-red-700">{rejectedCount}</p>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 mb-8">
                <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-700">Filter:</span>
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            filter === 'pending' 
                            ? 'bg-[#7a2828] text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Pending ({pendingCount})
                    </button>
                    <button
                        onClick={() => setFilter('completed')}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            filter === 'completed' 
                            ? 'bg-[#1a4d2e] text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Approved ({approvedCount})
                    </button>
                    <button
                        onClick={() => setFilter('rejected')}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            filter === 'rejected' 
                            ? 'bg-[#7a2828] text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Rejected ({rejectedCount})
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            filter === 'all' 
                            ? 'bg-gray-700 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        All
                    </button>
                </div>
            </div>

            {/* Expense Request Cards */}
            <div className="space-y-6">
                {filteredExpenses.map(expense => (
                    <div key={expense.transaction_id} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-2xl font-black text-gray-900">TXN-{expense.transaction_id}</h3>
                                    {getStatusBadge(expense.status)}
                                </div>
                                <p className="text-sm text-gray-500">Submitted by <span className="font-bold">{expense.submittedBy}</span> on {expense.date}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-black text-red-600">₱{expense.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Category</p>
                                <p className="font-bold text-gray-900">{expense.category}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Receipt Number</p>
                                <p className="font-bold text-gray-900">{expense.receiptNumber || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Account</p>
                                <p className="font-bold text-gray-900">{expense.account}</p>
                            </div>
                            {expense.billingPeriod && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Billing Period</p>
                                    <p className="font-bold text-gray-900">{new Date(expense.billingPeriod).toLocaleDateString('en-PH')}</p>
                                </div>
                            )}
                        </div>

                        {expense.items && expense.items.length > 0 && (
                            <div className="mb-6">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Items</p>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-xs font-bold text-gray-500 border-b border-gray-200">
                                                <th className="text-left pb-2">Item</th>
                                                <th className="text-center pb-2">Qty</th>
                                                <th className="text-right pb-2">Unit Price</th>
                                                <th className="text-right pb-2">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expense.items.map((item, idx) => (
                                                <tr key={idx} className="border-b border-gray-100 last:border-0">
                                                    <td className="py-2 font-medium text-gray-900">{item.item_name}</td>
                                                    <td className="py-2 text-center text-gray-700">{item.quantity}</td>
                                                    <td className="py-2 text-right text-gray-700">₱{item.unit_price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                                    <td className="py-2 text-right font-bold text-gray-900">₱{item.total_price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="mb-6">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Notes</p>
                            <p className="text-gray-700">{expense.description || 'No description provided'}</p>
                        </div>

                        {expense.receiptFile && (
                            <div className="mb-6">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Receipt</p>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => downloadReceipt(expense.receiptFile)}
                                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                                    >
                                        <Download size={14} />
                                        Download Receipt
                                    </button>
                                </div>
                            </div>
                        )}

                        {expense.status === 'Completed' && (
                            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                <p className="text-sm font-bold text-green-800">
                                    ✓ Approved and Completed
                                </p>
                            </div>
                        )}

                        {expense.status === 'Rejected' && (
                            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                                <p className="text-sm font-bold text-red-800">
                                    ✗ Rejected
                                </p>
                            </div>
                        )}

                        {expense.status === 'Pending' && (
                            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                                <p className="text-sm font-bold text-yellow-800">
                                    ⏳ Awaiting Approval from Bishop
                                </p>
                            </div>
                        )}
                    </div>
                ))}

                {filteredExpenses.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-16 text-center">
                        <AlertCircle className="mx-auto text-gray-300 mb-4" size={64} />
                        <p className="text-xl font-bold text-gray-400">No expenses found with this filter</p>
                    </div>
                )}
            </div>
                </>
            )}
        </div>
            </div>
        </div>
    );
};

export default ApprovalQueue;
