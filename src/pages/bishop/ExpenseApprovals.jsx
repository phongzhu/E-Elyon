import React, { useState, useEffect } from 'react';
import { Check, X, Eye, FileText, Calendar, DollarSign, User, Building, Receipt } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';

const ExpenseApprovals = () => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Pending'); // Pending, Approved, Rejected
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchExpenses();
        }
    }, [filter, currentUser]);

    const fetchCurrentUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: userData, error } = await supabase
                .from('users')
                .select('user_id, user_details_id, users_details!users_user_details_id_fkey(*)')
                .eq('auth_user_id', user.id)
                .limit(1);

            if (error) throw error;
            setCurrentUser(userData?.[0]);
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    };

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('transactions')
                .select(`
                    transaction_id,
                    account_id,
                    amount,
                    status,
                    notes,
                    transaction_date,
                    branch_id,
                    expenses!transactions_expense_id_fkey (
                        expense_id,
                        notes,
                        billing_period,
                        receipt_number,
                        receipt_file,
                        requires_approval,
                        approved_by,
                        expense_categories!expenses_category_id_fkey (
                            category_id,
                            category_name
                        ),
                        expense_items (
                            item_id,
                            item_name,
                            quantity,
                            unit_price,
                            total_price
                        ),
                        receiver:users!expenses_receiver_user_id_fkey (
                            user_id,
                            users_details!users_user_details_id_fkey (
                                first_name,
                                middle_name,
                                last_name
                            )
                        )
                    ),
                    finance_accounts!transactions_account_id_fkey (
                        account_id,
                        account_name,
                        account_type,
                        balance
                    ),
                    branches!fk_transactions_branch (
                        branch_id,
                        name,
                        city,
                        province
                    ),
                    created_by_user:users!transactions_created_by_fkey (
                        user_id,
                        users_details!users_user_details_id_fkey (
                            first_name,
                            middle_name,
                            last_name
                        )
                    )
                `)
                .not('expense_id', 'is', null)
                .order('transaction_date', { ascending: false });

            // Filter based on status
            if (filter === 'Pending') {
                query = query.eq('status', 'Pending');
            } else if (filter === 'Approved') {
                query = query.eq('status', 'Completed');
            } else if (filter === 'Rejected') {
                query = query.eq('status', 'Rejected');
            }

            const { data, error } = await query;

            if (error) throw error;

            // Filter only expenses that require approval
            const filteredExpenses = data.filter(txn => txn.expenses?.requires_approval === true);

            setExpenses(filteredExpenses || []);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            setErrorMessage('Failed to load expenses: ' + error.message);
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (expense) => {
        setSelectedExpense(expense);
        setShowDetailsModal(true);
    };

    const handleApproveClick = (expense) => {
        setSelectedExpense(expense);
        setShowApproveModal(true);
    };

    const handleRejectClick = (expense) => {
        setSelectedExpense(expense);
        setShowRejectModal(true);
    };

    const handleApprove = async () => {
        if (!selectedExpense || !currentUser) return;

        setProcessing(true);
        setShowApproveModal(false);

        try {
            const expenseId = selectedExpense.expenses.expense_id;
            const transactionId = selectedExpense.transaction_id;
            const accountId = selectedExpense.account_id;
            const amount = Math.abs(parseFloat(selectedExpense.amount));

            // 1. Update expense record - set approved_by
            const { error: expenseError } = await supabase
                .from('expenses')
                .update({
                    approved_by: currentUser.user_id
                })
                .eq('expense_id', expenseId);

            if (expenseError) throw expenseError;

            // 2. Update transaction status to Completed
            const { error: transactionError } = await supabase
                .from('transactions')
                .update({
                    status: 'Completed'
                })
                .eq('transaction_id', transactionId);

            if (transactionError) throw transactionError;

            // 3. Deduct amount from finance account
            const { data: accountData, error: accountFetchError } = await supabase
                .from('finance_accounts')
                .select('balance')
                .eq('account_id', accountId)
                .single();

            if (accountFetchError) throw accountFetchError;

            const newBalance = parseFloat(accountData.balance) - amount;

            const { error: balanceError } = await supabase
                .from('finance_accounts')
                .update({
                    balance: newBalance
                })
                .eq('account_id', accountId);

            if (balanceError) throw balanceError;

            setSuccessMessage('Expense approved successfully! Amount has been deducted from the account.');
            setShowSuccessModal(true);
            setSelectedExpense(null);
            fetchExpenses();
        } catch (error) {
            console.error('Error approving expense:', error);
            setErrorMessage('Failed to approve expense: ' + error.message);
            setShowErrorModal(true);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedExpense) return;

        setProcessing(true);
        setShowRejectModal(false);

        try {
            const transactionId = selectedExpense.transaction_id;

            // Update transaction status to Rejected (no deduction from account)
            const { error } = await supabase
                .from('transactions')
                .update({
                    status: 'Rejected'
                })
                .eq('transaction_id', transactionId);

            if (error) throw error;

            setSuccessMessage('Expense rejected successfully.');
            setShowSuccessModal(true);
            setSelectedExpense(null);
            fetchExpenses();
        } catch (error) {
            console.error('Error rejecting expense:', error);
            setErrorMessage('Failed to reject expense: ' + error.message);
            setShowErrorModal(true);
        } finally {
            setProcessing(false);
        }
    };

    const formatCurrency = (amount) => {
        return Math.abs(parseFloat(amount || 0)).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getUserName = (user) => {
        if (!user?.users_details) return 'Unknown';
        const { first_name, middle_name, last_name } = user.users_details;
        return `${first_name} ${middle_name || ''} ${last_name}`.trim();
    };

    const getTotalAmount = (items) => {
        return items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold text-gray-800 mb-2">Expense Approvals</h1>
                            <p className="text-gray-600">Review and approve expense requests from branches</p>
                        </div>

                        {/* Filter Tabs */}
                        <div className="mb-6 flex gap-2">
                            <button
                                onClick={() => setFilter('Pending')}
                                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                                    filter === 'Pending'
                                        ? 'bg-orange-600 text-white shadow-lg'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                }`}
                            >
                                Pending
                            </button>
                            <button
                                onClick={() => setFilter('Approved')}
                                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                                    filter === 'Approved'
                                        ? 'bg-green-600 text-white shadow-lg'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                }`}
                            >
                                Approved
                            </button>
                            <button
                                onClick={() => setFilter('Rejected')}
                                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                                    filter === 'Rejected'
                                        ? 'bg-red-600 text-white shadow-lg'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                }`}
                            >
                                Rejected
                            </button>
                        </div>

                        {/* Expenses List */}
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                                <p className="mt-4 text-gray-600">Loading expenses...</p>
                            </div>
                        ) : expenses.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                                <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">No {filter} Expenses</h3>
                                <p className="text-gray-500">There are no {filter.toLowerCase()} expense requests at this time.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {expenses.map((expense) => (
                                    <div key={expense.transaction_id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                {/* Header */}
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="p-3 bg-indigo-100 rounded-lg">
                                                        <Receipt className="text-indigo-600" size={24} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                                                            {expense.expenses.expense_categories?.category_name || 'General Expense'}
                                                        </h3>
                                                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar size={14} />
                                                                {formatDate(expense.expenses.billing_period)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Building size={14} />
                                                                {expense.branches?.name}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <User size={14} />
                                                                Created by: {getUserName(expense.created_by_user)}
                                                            </span>
                                                            {expense.expenses.receipt_number && (
                                                                <span className="flex items-center gap-1">
                                                                    <FileText size={14} />
                                                                    Receipt: {expense.expenses.receipt_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Items Preview */}
                                                <div className="mb-4 pl-16">
                                                    <p className="text-sm font-semibold text-gray-700 mb-2">Items:</p>
                                                    <div className="space-y-1">
                                                        {expense.expenses.expense_items?.slice(0, 3).map((item, idx) => (
                                                            <div key={idx} className="text-sm text-gray-600 flex justify-between">
                                                                <span>{item.item_name} (x{item.quantity})</span>
                                                                <span className="font-semibold">₱{formatCurrency(item.total_price)}</span>
                                                            </div>
                                                        ))}
                                                        {expense.expenses.expense_items?.length > 3 && (
                                                            <p className="text-sm text-indigo-600 font-semibold">
                                                                +{expense.expenses.expense_items.length - 3} more items
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Total and Account */}
                                                <div className="pl-16 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-gray-600">Account:</p>
                                                        <p className="font-semibold text-gray-800">{expense.finance_accounts?.account_name}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-gray-600">Total Amount</p>
                                                        <p className="text-2xl font-bold text-gray-900">₱{formatCurrency(expense.amount)}</p>
                                                    </div>
                                                </div>

                                                {/* Notes */}
                                                {expense.expenses.notes && (
                                                    <div className="mt-4 pl-16">
                                                        <p className="text-sm text-gray-600 italic">"{expense.expenses.notes}"</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-2 ml-4">
                                                <button
                                                    onClick={() => handleViewDetails(expense)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye size={20} />
                                                </button>
                                                {filter === 'Pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApproveClick(expense)}
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                            title="Approve"
                                                        >
                                                            <Check size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectClick(expense)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Reject"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedExpense && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900">Expense Details</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Category</p>
                                    <p className="font-semibold text-gray-900">
                                        {selectedExpense.expenses.expense_categories?.category_name || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Billing Period</p>
                                    <p className="font-semibold text-gray-900">{formatDate(selectedExpense.expenses.billing_period)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Branch</p>
                                    <p className="font-semibold text-gray-900">{selectedExpense.branches?.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Account</p>
                                    <p className="font-semibold text-gray-900">{selectedExpense.finance_accounts?.account_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Created By</p>
                                    <p className="font-semibold text-gray-900">{getUserName(selectedExpense.created_by_user)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Receipt Number</p>
                                    <p className="font-semibold text-gray-900">{selectedExpense.expenses.receipt_number || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Expense Items</h3>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Item Name</th>
                                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Qty</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Unit Price</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {selectedExpense.expenses.expense_items?.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm text-gray-900">{item.item_name}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">₱{formatCurrency(item.unit_price)}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">₱{formatCurrency(item.total_price)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50">
                                            <tr>
                                                <td colSpan="3" className="px-4 py-3 text-right text-sm font-bold text-gray-900">Total Amount:</td>
                                                <td className="px-4 py-3 text-right text-lg font-bold text-indigo-600">
                                                    ₱{formatCurrency(getTotalAmount(selectedExpense.expenses.expense_items || []))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Notes */}
                            {selectedExpense.expenses.notes && (
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Notes</h3>
                                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedExpense.expenses.notes}</p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-6 py-2.5 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve Confirmation Modal */}
            {showApproveModal && selectedExpense && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Approve Expense?</h2>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to approve this expense of <span className="font-bold text-green-600">₱{formatCurrency(selectedExpense.amount)}</span>? 
                                The amount will be deducted from <span className="font-bold">{selectedExpense.finance_accounts?.account_name}</span>.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowApproveModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApprove}
                                    disabled={processing}
                                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50"
                                >
                                    {processing ? 'Processing...' : 'Approve'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Confirmation Modal */}
            {showRejectModal && selectedExpense && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reject Expense?</h2>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to reject this expense request? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowRejectModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={processing}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
                                >
                                    {processing ? 'Processing...' : 'Reject'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="text-green-600" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
                            <p className="text-gray-600 mb-6">{successMessage}</p>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Modal */}
            {showErrorModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <X className="text-red-600" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
                            <p className="text-gray-600 mb-6">{errorMessage}</p>
                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseApprovals;
