import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, MapPin, DollarSign, Calendar, ArrowLeftRight } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';

const ApprovalQueue = () => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Pending');
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        fetchCurrentUser();
    }, []);

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
                .select('user_id, user_details_id, users_details!users_user_details_id_fkey(branch_id, first_name, middle_name, last_name)')
                .eq('auth_user_id', user.id)
                .limit(1);

            if (error) throw error;
            setCurrentUser(userData?.[0]);
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    };

    const fetchTransfers = async () => {
        if (!currentUser?.users_details?.branch_id) {
            console.log('No branch_id found for user:', currentUser);
            return;
        }
        
        console.log('Fetching transfers for branch_id:', currentUser.users_details.branch_id, 'with status:', filter);
        
        setLoading(true);
        try {
            // Get all transactions for this branch's transfers
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
                .eq('branch_id', currentUser.users_details.branch_id)
                .eq('status', filter)
                .not('transfer_id', 'is', null)
                .order('transaction_date', { ascending: false });

            if (error) throw error;

            console.log('Fetched transactions:', data?.length || 0, 'transactions');

            // Group transactions by transfer_id
            const transfersMap = {};
            data?.forEach(txn => {
                const transferId = txn.transfers?.transfer_id;
                if (!transferId) return;

                if (!transfersMap[transferId]) {
                    transfersMap[transferId] = {
                        transfer_id: transferId,
                        amount: txn.transfers.amount,
                        transfer_method: txn.transfers.transfer_method,
                        notes: txn.transfers.notes,
                        requires_approval: txn.transfers.requires_approval,
                        approved_by: txn.transfers.approved_by,
                        approved_at: txn.transfers.approved_at,
                        created_at: txn.transaction_date,
                        creator: txn.users,
                        transactions: [],
                        status: txn.status
                    };
                }
                transfersMap[transferId].transactions.push(txn);
            });

            const transfersList = Object.values(transfersMap);
            console.log('Grouped into transfers:', transfersList.length, 'transfers');
            setTransfers(transfersList);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching transfers:', error);
            setLoading(false);
        }
    };

    const getCreatorName = (creator) => {
        if (!creator?.users_details) return 'Unknown';
        const { first_name, middle_name, last_name } = creator.users_details;
        return `${first_name} ${middle_name || ''} ${last_name}`.trim();
    };

    const getBranchName = (transactions) => {
        const branch = transactions[0]?.branches;
        return branch ? `${branch.name}, ${branch.city}` : 'Unknown Branch';
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'Pending':
                return <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                    <Clock size={12} /> Pending Approval
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
                return status;
        }
    };

    const pendingCount = transfers.filter(t => t.status === 'Pending').length;
    const totalPendingAmount = transfers.filter(t => t.status === 'Pending').reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                
                <div className="flex-1 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-10 overflow-y-auto">
                    <div className="bg-gradient-to-r from-[#1a4d2e] to-[#2d7a4a] rounded-2xl p-6 text-white shadow-xl mb-8">
                        <h1 className="text-4xl font-bold mb-2">Approval Queue</h1>
                        <p className="text-green-100">View transfer requests for your branch</p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-[#1a4d2e] to-[#2d7a4a] p-6 rounded-2xl shadow-lg text-white">
                            <div className="flex items-center gap-3 mb-2">
                                <Clock size={24} />
                                <p className="text-green-100 text-xs font-semibold uppercase">Pending Approvals</p>
                            </div>
                            <p className="text-4xl font-black">{pendingCount}</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-green-200">
                            <div className="flex items-center gap-3 mb-2">
                                <DollarSign className="text-[#1a4d2e]" size={24} />
                                <p className="text-xs font-semibold text-gray-500 uppercase">Pending Amount</p>
                            </div>
                            <p className="text-3xl font-black text-[#1a4d2e]">₱{totalPendingAmount.toLocaleString()}</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                            <div className="flex items-center gap-3 mb-2">
                                <ArrowLeftRight className="text-orange-600" size={24} />
                                <p className="text-xs font-semibold text-gray-500 uppercase">Total Transfers</p>
                            </div>
                            <p className="text-3xl font-black text-gray-900">{transfers.length}</p>
                        </div>
                    </div>

                    {/* Filter */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 mb-8">
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-700">Status:</span>
                            <button
                                onClick={() => setFilter('Pending')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                    filter === 'Pending' 
                                    ? 'bg-[#7a2828] text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Pending ({pendingCount})
                            </button>
                            <button
                                onClick={() => setFilter('Completed')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                    filter === 'Completed' 
                                    ? 'bg-[#1a4d2e] text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Approved
                            </button>
                            <button
                                onClick={() => setFilter('Rejected')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                    filter === 'Rejected' 
                                    ? 'bg-[#7a2828] text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Rejected
                            </button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                            <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-500">Loading transfers...</p>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && transfers.length === 0 && (
                        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                            <ArrowLeftRight className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-xl font-bold text-gray-900 mb-2">No {filter.toLowerCase()} transfers</p>
                            <p className="text-gray-500">There are no {filter.toLowerCase()} transfer requests for your branch.</p>
                        </div>
                    )}

                    {/* Transfers List */}
                    <div className="space-y-6">
                        {transfers.map(transfer => (
                            <div key={transfer.transfer_id} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <MapPin className="text-teal-600" size={20} />
                                            <h3 className="text-2xl font-black text-gray-900">{getBranchName(transfer.transactions)}</h3>
                                            {getStatusBadge(transfer.status)}
                                        </div>
                                        <p className="text-sm text-gray-600">Requested by: {getCreatorName(transfer.creator)}</p>
                                        <p className="text-sm text-gray-500">Date: {new Date(transfer.created_at).toLocaleDateString()}</p>
                                        {transfer.transfer_method && (
                                            <span className="inline-block mt-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                                                {transfer.transfer_method}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-4xl font-black text-teal-700">₱{Math.abs(transfer.amount).toLocaleString()}</p>
                                        {transfer.reference_id && (
                                            <p className="text-xs text-gray-500 mt-2">Ref: {transfer.reference_id}</p>
                                        )}
                                    </div>
                                </div>

                                {transfer.notes && (
                                    <div className="p-4 bg-gray-50 rounded-xl mb-4">
                                        <p className="text-sm font-bold text-gray-700 mb-1">Notes:</p>
                                        <p className="text-gray-700">{transfer.notes}</p>
                                    </div>
                                )}

                                {transfer.status === 'Completed' && transfer.approved_at && (
                                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                        <p className="text-sm font-bold text-green-800">
                                            ✓ Approved on {new Date(transfer.approved_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}

                                {transfer.status === 'Rejected' && (
                                    <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                                        <p className="text-sm font-bold text-red-800">
                                            ✗ Transfer Rejected
                                        </p>
                                    </div>
                                )}

                                {transfer.status === 'Pending' && (
                                    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                                        <p className="text-sm font-bold text-yellow-800">
                                            ⏳ Awaiting bishop approval
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApprovalQueue;