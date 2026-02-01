import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';
import { createPayMongoSource, createPayMongoPayout, getPayoutStatus, BANK_CODES } from '../../lib/paymongoUtils';

const TransferApprovals = () => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Pending'); // Pending, Completed, Rejected
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        fetchCurrentUser();
        
        // Check for PayMongo callback immediately
        checkPaymentCallback();
    }, []);

    const checkPaymentCallback = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        
        if (paymentStatus === 'success') {
            const pending = localStorage.getItem('pending_transfer_approval');
            if (pending) {
                const { transfer_id, paymongo_source_id } = JSON.parse(pending);
                // Set a flag to trigger approval after user data loads
                sessionStorage.setItem('complete_approval', JSON.stringify({
                    transfer_id,
                    paymongo_source_id
                }));
                localStorage.removeItem('pending_transfer_approval');
            }
            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (paymentStatus === 'failed') {
            setShowErrorModal(true);
            setErrorMessage('Payment failed or was cancelled. Please try again.');
            localStorage.removeItem('pending_transfer_approval');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    // Complete approval after currentUser is loaded
    useEffect(() => {
        if (currentUser) {
            const pending = sessionStorage.getItem('complete_approval');
            if (pending) {
                const { transfer_id, paymongo_source_id } = JSON.parse(pending);
                completeApproval(transfer_id, paymongo_source_id);
                sessionStorage.removeItem('complete_approval');
            }
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            fetchTransfers();
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

    const fetchTransfers = async () => {
        setLoading(true);
        try {
            // Get all transactions with transfer_id that match the filter status
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    transaction_id,
                    amount,
                    status,
                    notes,
                    reference_id,
                    branch_id,
                    transaction_date,
                    transaction_type,
                    created_by,
                    transfers!transactions_transfer_id_fkey (
                        transfer_id,
                        amount,
                        transfer_method,
                        notes,
                        requires_approval,
                        approved_by,
                        approved_at
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
                    users!transactions_created_by_fkey (
                        user_id,
                        users_details!users_user_details_id_fkey (
                            first_name,
                            middle_name,
                            last_name
                        )
                    )
                `)
                .eq('status', filter)
                .not('transfer_id', 'is', null)
                .order('transaction_date', { ascending: false });

            if (error) throw error;

            // Group by transfer_id to show as single transfer request
            const groupedTransfers = {};
            data?.forEach(transaction => {
                const transferId = transaction.transfers?.transfer_id;
                if (!groupedTransfers[transferId]) {
                    groupedTransfers[transferId] = {
                        ...transaction.transfers,
                        transactions: [],
                        source_account: transaction.transaction_type === 'Transfer Out' ? transaction.finance_accounts : null,
                        created_by: transaction.users,
                        reference_id: transaction.reference_id,
                        transaction_date: transaction.transaction_date,
                        status: transaction.status
                    };
                }
                // Update source_account if this is the Transfer Out transaction
                if (transaction.transaction_type === 'Transfer Out' && !groupedTransfers[transferId].source_account) {
                    groupedTransfers[transferId].source_account = transaction.finance_accounts;
                }
                groupedTransfers[transferId].transactions.push(transaction);
            });

            setTransfers(Object.values(groupedTransfers));
        } catch (error) {
            console.error('Error fetching transfers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveClick = (transfer) => {
        setSelectedTransfer(transfer);
        setShowApproveModal(true);
    };

    const handleRejectClick = (transfer) => {
        setSelectedTransfer(transfer);
        setShowRejectModal(true);
    };

    const handleApprove = async () => {
        if (!selectedTransfer) return;

        setProcessingPayment(true);
        setShowApproveModal(false);
        
        try {
            // 1. Create PayMongo source for payment
            const totalAmount = selectedTransfer.transactions.filter(t => t.transaction_type === 'Transfer In').length * selectedTransfer.amount;
            
            // Redirect to PayMongo checkout
            const paymongoSource = await createPayMongoSource(
                totalAmount,
                'gcash', // or 'grab_pay'
                {
                    name: currentUser?.users_details?.first_name + ' ' + currentUser?.users_details?.last_name,
                    email: 'bishop@example.com', // Get from user profile
                    phone: '09123456789' // Get from user profile
                }
            );

            // Store transfer_id in localStorage to complete after payment
            localStorage.setItem('pending_transfer_approval', JSON.stringify({
                transfer_id: selectedTransfer.transfer_id,
                paymongo_source_id: paymongoSource.id
            }));

            // Redirect to PayMongo checkout
            window.location.href = paymongoSource.attributes.redirect.checkout_url;

        } catch (error) {
            console.error('Error initiating PayMongo:', error);
            setShowErrorModal(true);
            setErrorMessage('Error initiating payment: ' + error.message);
            setProcessingPayment(false);
        }
    };

    // Complete approval after PayMongo payment
    const completeApproval = async (transferId, paymongoReferenceId) => {
        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data: userData } = await supabase
                .from('users')
                .select('user_id')
                .eq('auth_user_id', user.id)
                .limit(1)
                .single();

            if (!userData) throw new Error('User not found');

            // Fetch the transfer and its transactions
            const { data: transferData, error: transferError } = await supabase
                .from('transfers')
                .select(`
                    *,
                    transactions(
                        *,
                        branches(name),
                        finance_accounts(account_name, balance)
                    )
                `)
                .eq('transfer_id', transferId)
                .single();

            if (transferError || !transferData) throw new Error('Transfer not found');

            // 1. Update transfer record
            await supabase
                .from('transfers')
                .update({
                    approved_by: userData.user_id,
                    approved_at: new Date().toISOString()
                })
                .eq('transfer_id', transferId);

            // 2. Update all transactions to Completed with PayMongo reference
            const transactionIds = transferData.transactions.map(t => t.transaction_id);
            await supabase
                .from('transactions')
                .update({ 
                    status: 'Completed',
                    reference_id: paymongoReferenceId
                })
                .in('transaction_id', transactionIds);

            // 3. Deduct balance from source account (Transfer Out transaction)
            const transferOutTxn = transferData.transactions.find(t => t.transaction_type === 'Transfer Out');
            if (transferOutTxn) {
                const { data: sourceAccount } = await supabase
                    .from('finance_accounts')
                    .select('account_id, balance')
                    .eq('account_id', transferOutTxn.account_id)
                    .single();

                if (sourceAccount) {
                    const newBalance = sourceAccount.balance + transferOutTxn.amount; // amount is already negative
                    await supabase
                        .from('finance_accounts')
                        .update({ balance: newBalance })
                        .eq('account_id', sourceAccount.account_id);
                }
            }

            // 4. Credit destination branch accounts (Transfer In transactions)
            for (const transaction of transferData.transactions) {
                if (transaction.transaction_type === 'Transfer In') {
                    const { data: branchAccounts } = await supabase
                        .from('finance_accounts')
                        .select('account_id, balance')
                        .eq('branch_id', transaction.branch_id)
                        .eq('is_active', true)
                        .limit(1);

                    if (branchAccounts && branchAccounts.length > 0) {
                        const destAccount = branchAccounts[0];
                        const newDestBalance = destAccount.balance + Math.abs(transaction.amount);

                        await supabase
                            .from('finance_accounts')
                            .update({ balance: newDestBalance })
                            .eq('account_id', destAccount.account_id);
                    }
                }
            }

            setShowSuccessModal(true);
            setSuccessMessage('Transfer approved and funds distributed successfully!');
            fetchTransfers();
        } catch (error) {
            console.error('Error completing approval:', error);
            setShowErrorModal(true);
            setErrorMessage('Error completing approval: ' + error.message);
        }
    };

    const handleReject = async () => {
        if (!selectedTransfer) return;

        try {
            // Update all transactions to Rejected
            const transactionIds = selectedTransfer.transactions.map(t => t.transaction_id);
            const { error } = await supabase
                .from('transactions')
                .update({ status: 'Rejected' })
                .in('transaction_id', transactionIds);

            if (error) throw error;

            setShowRejectModal(false);
            setSelectedTransfer(null);
            setShowSuccessModal(true);
            setSuccessMessage('Transfer rejected successfully.');
            fetchTransfers();
        } catch (error) {
            console.error('Error rejecting transfer:', error);
            setShowErrorModal(true);
            setErrorMessage('Error rejecting transfer: ' + error.message);
        }
    };

    const getCreatorName = (creator) => {
        if (!creator?.users_details) return 'Unknown';
        const { first_name, middle_name, last_name } = creator.users_details;
        return `${first_name} ${middle_name || ''} ${last_name}`.trim();
    };

    const getBranchNames = (transactions) => {
        const branches = transactions
            .filter(t => t.transaction_type === 'Transfer In')
            .map(t => t.branches?.name)
            .filter(Boolean);
        return branches.join(', ');
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold text-gray-800 mb-2">Transfer Approvals</h1>
                            <p className="text-gray-600">Review and approve fund transfer requests</p>
                        </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
                {['Pending', 'Completed', 'Rejected'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            filter === status
                                ? 'bg-teal-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Transfers List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600">Loading transfers...</p>
                </div>
            ) : transfers.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <p className="text-gray-500 text-lg">No {filter.toLowerCase()} transfers found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {transfers.map(transfer => {
                        const branchCount = transfer.transactions.filter(t => t.transaction_type === 'Transfer In').length;
                        const totalAmount = branchCount * transfer.amount;
                        
                        return (
                            <div key={transfer.transfer_id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-1">
                                            {transfer.transfer_method || 'Transfer Request'}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Reference: {transfer.reference_id}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Requested by: {getCreatorName(transfer.created_by)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Date: {new Date(transfer.transaction_date).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    <span className={`px-4 py-2 rounded-full font-semibold text-sm ${
                                        transfer.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                        transfer.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {transfer.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-600 mb-1">Source Account</p>
                                        <p className="font-semibold text-gray-800">
                                            {transfer.source_account?.account_name}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {transfer.source_account?.account_type} • Balance: ₱{transfer.source_account?.balance?.toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-600 mb-1">Amount Details</p>
                                        <p className="font-semibold text-gray-800">
                                            ₱{transfer.amount?.toLocaleString()} per branch
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {branchCount} branches • Total: ₱{totalAmount.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                                    <p className="text-sm text-gray-600 mb-1">Destination Branches</p>
                                    <p className="font-medium text-gray-800">{getBranchNames(transfer.transactions)}</p>
                                </div>

                                {transfer.notes && (
                                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                        <p className="text-sm text-gray-600 mb-1">Notes</p>
                                        <p className="text-gray-800">{transfer.notes}</p>
                                    </div>
                                )}

                                {transfer.status === 'Pending' && (
                                    <div className="flex gap-3 mt-4">
                                        <button
                                            onClick={() => handleApproveClick(transfer)}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                                        >
                                            Approve Transfer
                                        </button>
                                        <button
                                            onClick={() => handleRejectClick(transfer)}
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}

                                {transfer.approved_by && (
                                    <div className="mt-4 text-sm text-gray-500">
                                        Approved on {new Date(transfer.approved_at).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Approve Modal */}
            {showApproveModal && selectedTransfer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Approve Transfer</h2>
                        <div className="mb-6">
                            <p className="text-gray-700 mb-4">
                                Are you sure you want to approve this transfer?
                            </p>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                                <p className="text-sm"><span className="font-semibold">Amount per branch:</span> ₱{selectedTransfer.amount?.toLocaleString()}</p>
                                <p className="text-sm"><span className="font-semibold">Total branches:</span> {selectedTransfer.transactions.filter(t => t.transaction_type === 'Transfer In').length}</p>
                                <p className="text-sm"><span className="font-semibold">Total amount:</span> ₱{(selectedTransfer.transactions.filter(t => t.transaction_type === 'Transfer In').length * selectedTransfer.amount).toLocaleString()}</p>
                                <p className="text-sm"><span className="font-semibold">Purpose:</span> {selectedTransfer.transfer_method}</p>
                            </div>
                            <p className="text-sm text-gray-600 mt-4">
                                ⚠️ This will deduct funds from the source account and update transaction statuses.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleApprove}
                                disabled={processingPayment}
                                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                            >
                                {processingPayment ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Processing...
                                    </>
                                ) : (
                                    'Confirm Approval'
                                )}
                            </button>
                            <button
                                onClick={() => setShowApproveModal(false)}
                                disabled={processingPayment}
                                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedTransfer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
                        <h2 className="text-2xl font-bold text-red-700 mb-4">Reject Transfer</h2>
                        <div className="mb-6">
                            <p className="text-gray-700 mb-4">
                                Are you sure you want to reject this transfer request?
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm text-gray-700">
                                    This action will mark the transfer as rejected. No funds will be deducted.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleReject}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                            >
                                Confirm Rejection
                            </button>
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                <span className="text-green-600 text-2xl">✓</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Success</h3>
                            <p className="text-sm text-gray-600 mb-6">{successMessage}</p>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
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
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <span className="text-red-600 text-2xl">⚠</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Error</h3>
                            <p className="text-sm text-gray-600 mb-6">{errorMessage}</p>
                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransferApprovals;
