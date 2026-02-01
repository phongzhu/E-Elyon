import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, Calendar, DollarSign, FileText, Building2 } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';

const TransferRevolvingFunds = () => {
    const [formData, setFormData] = useState({
        sourceAccount: '',
        amountPerBranch: '',
        purpose: '',
        notes: ''
    });

    const [selectedBranches, setSelectedBranches] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [userBranchId, setUserBranchId] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        fetchUserInfo();
    }, []);

    useEffect(() => {
        if (userBranchId) {
            fetchAccounts();
            fetchBranches();
        }
    }, [userBranchId]);

    const fetchUserInfo = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: userData } = await supabase
                .from('users')
                .select(`
                    user_id,
                    user_details_id,
                    users_details!user_details_id(branch_id)
                `)
                .eq('auth_user_id', user.id)
                .limit(1)
                .single();

            if (userData) {
                setCurrentUserId(userData.user_id);
                setUserBranchId(userData.users_details?.branch_id);
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    };

    const fetchAccounts = async () => {
        try {
            const { data, error } = await supabase
                .from('finance_accounts')
                .select('account_id, account_name, account_type, balance')
                .eq('is_active', true)
                .eq('branch_id', userBranchId)
                .ilike('account_type', 'bank')
                .order('account_name');
            
            if (error) throw error;
            setAccounts(data || []);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };

    const fetchBranches = async () => {
        try {
            // Fetch branches with their finance accounts count
            const { data: branchesData, error: branchesError } = await supabase
                .from('branches')
                .select('branch_id, name, city, province')
                .order('name');
            
            if (branchesError) throw branchesError;

            // Get finance accounts count for each branch
            const { data: accountsData, error: accountsError } = await supabase
                .from('finance_accounts')
                .select('branch_id, account_type')
                .eq('is_active', true);
            
            if (accountsError) throw accountsError;

            // Count bank accounts per branch
            const bankAccountsCount = {};
            accountsData?.forEach(account => {
                if (account.account_type?.toLowerCase() === 'bank') {
                    bankAccountsCount[account.branch_id] = (bankAccountsCount[account.branch_id] || 0) + 1;
                }
            });

            // Add bank account info to branches and exclude user's own branch
            const branchesWithAccounts = branchesData
                ?.filter(branch => branch.branch_id !== userBranchId) // Exclude user's own branch
                ?.map(branch => ({
                    ...branch,
                    hasBankAccount: (bankAccountsCount[branch.branch_id] || 0) > 0,
                    bankAccountsCount: bankAccountsCount[branch.branch_id] || 0
                })) || [];

            setBranches(branchesWithAccounts);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const toggleBranch = (branchId) => {
        if (selectedBranches.includes(branchId)) {
            setSelectedBranches(selectedBranches.filter(id => id !== branchId));
        } else {
            setSelectedBranches([...selectedBranches, branchId]);
        }
    };

    const selectAllBranches = () => {
        setSelectedBranches(branches.map(b => b.branch_id));
    };

    const clearAllBranches = () => {
        setSelectedBranches([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!canTransfer || selectedBranches.length === 0) {
            setShowErrorModal(true);
            setErrorMessage('Cannot process transfer. Please check balance and selected branches.');
            return;
        }

        setLoading(true);
        try {
            const totalAmount = parseFloat(formData.amountPerBranch) * selectedBranches.length;
            const sourceAccount = accounts.find(a => a.account_id === parseInt(formData.sourceAccount));

            // Create transfer records and transactions for each branch (Status: Pending, no reference yet)
            for (const branchId of selectedBranches) {
                // 1. Create transfer record with requires_approval = true
                const { data: transfer, error: transferError } = await supabase
                    .from('transfers')
                    .insert({
                        to_account_id: parseInt(formData.sourceAccount),
                        amount: parseFloat(formData.amountPerBranch),
                        transfer_method: formData.purpose,
                        notes: `${formData.notes} - Branch: ${branches.find(b => b.branch_id === branchId)?.name}`,
                        requires_approval: true
                    })
                    .select()
                    .single();

                if (transferError) throw transferError;

                // 2. Create debit transaction for source account (Pending, no reference yet)
                const { error: debitError } = await supabase
                    .from('transactions')
                    .insert({
                        account_id: parseInt(formData.sourceAccount),
                        transaction_type: 'Transfer Out',
                        transfer_id: transfer.transfer_id,
                        amount: -parseFloat(formData.amountPerBranch),
                        status: 'Pending',
                        notes: `Transfer to ${branches.find(b => b.branch_id === branchId)?.name}`,
                        created_by: currentUserId,
                        branch_id: userBranchId,
                        reference_id: null
                    });

                if (debitError) throw debitError;

                // 3. Create credit transaction for destination branch (Pending, no reference yet)
                const { error: creditError } = await supabase
                    .from('transactions')
                    .insert({
                        account_id: parseInt(formData.sourceAccount),
                        transaction_type: 'Transfer In',
                        transfer_id: transfer.transfer_id,
                        amount: parseFloat(formData.amountPerBranch),
                        status: 'Pending',
                        notes: `Transfer from ${sourceAccount?.account_name}`,
                        created_by: currentUserId,
                        branch_id: branchId,
                        reference_id: null
                    });

                if (creditError) throw creditError;
            }

            // Note: Balance NOT deducted here - will be deducted upon bishop approval
            // Reference ID will be generated by PayMongo during approval

            setShowSuccessModal(true);
            setSuccessMessage(`Transfer request submitted! Total: ₱${totalAmount.toLocaleString()} to ${selectedBranches.length} branches. Awaiting bishop approval.`);
            
            // Reset form
            setFormData({
                sourceAccount: '',
                amountPerBranch: '',
                purpose: '',
                notes: ''
            });
            setSelectedBranches([]);
        } catch (error) {
            console.error('Error processing transfer:', error);
            setShowErrorModal(true);
            setErrorMessage('Error processing transfer: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const sourceBalance = accounts.find(a => a.account_id === parseInt(formData.sourceAccount))?.balance || 0;
    const totalTransferAmount = parseFloat(formData.amountPerBranch || 0) * selectedBranches.length;
    const canTransfer = sourceBalance >= totalTransferAmount && totalTransferAmount > 0;

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            
            <div className="flex flex-col flex-1">
                <Header />
                
                <div className="flex-1 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-10 overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">Transfer Revolving Funds</h1>
                <p className="text-gray-600 font-medium">Distribute funds to multiple branches in one transaction</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-teal-100 p-3 rounded-xl">
                                <Send className="text-teal-700" size={24} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">New Revolving Fund Transfer</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Source Account</label>
                                <select
                                    value={formData.sourceAccount}
                                    onChange={(e) => setFormData({...formData, sourceAccount: e.target.value})}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-colors"
                                    required
                                >
                                    <option value="">Select source account...</option>
                                    {accounts.map(acc => (
                                        <option key={acc.account_id} value={acc.account_id}>
                                            {acc.account_name} - {acc.account_type} (₱{parseFloat(acc.balance).toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                                {formData.sourceAccount && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        Available: ₱{sourceBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <DollarSign className="inline mr-2" size={16} />
                                    Amount Per Branch (₱)
                                </label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    value={formData.amountPerBranch}
                                    onChange={(e) => setFormData({...formData, amountPerBranch: e.target.value})}
                                    placeholder="0.00"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-colors text-2xl font-bold"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Purpose</label>
                                <select
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-colors"
                                    required
                                >
                                    <option value="">Select purpose...</option>
                                    <option value="Revolving Funds">Revolving Funds</option>
                                    <option value="Ministry Operations">Ministry Operations</option>
                                    <option value="Branch Support">Branch Support</option>
                                    <option value="Event Funding">Event Funding</option>
                                    <option value="Outreach Program">Outreach Program</option>
                                    <option value="Emergency Fund">Emergency Fund</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <FileText className="inline mr-2" size={16} />
                                    Additional Notes (Optional)
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    placeholder="Add any additional information..."
                                    rows="3"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-colors resize-none"
                                />
                            </div>

                            {/* Branch Selection */}
                            <div className="border-t-2 border-gray-200 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="block text-sm font-bold text-gray-700">
                                        <Building2 className="inline mr-2" size={16} />
                                        Select Branches ({selectedBranches.length} selected)
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={selectAllBranches}
                                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs hover:bg-gray-200 transition-all"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={clearAllBranches}
                                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs hover:bg-gray-200 transition-all"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {branches.map(branch => {
                                        const isSelected = selectedBranches.includes(branch.branch_id);
                                        const locationText = [branch.city, branch.province].filter(Boolean).join(', ') || 'N/A';
                                        const isDisabled = !branch.hasBankAccount;
                                        return (
                                            <button
                                                key={branch.branch_id}
                                                type="button"
                                                onClick={() => !isDisabled && toggleBranch(branch.branch_id)}
                                                disabled={isDisabled}
                                                className={`p-4 rounded-xl font-bold text-sm transition-all ${
                                                    isDisabled
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                                                    : isSelected
                                                    ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                <div className="text-center">
                                                    <p className="mb-1">{branch.name}</p>
                                                    <p className="text-xs opacity-75">{locationText}</p>
                                                    <p className={`text-xs mt-1 font-semibold ${
                                                        isDisabled ? 'text-red-500' :
                                                        isSelected ? 'text-white' : 
                                                        branch.hasBankAccount ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                        {branch.hasBankAccount 
                                                            ? `✓ ${branch.bankAccountsCount} Bank Account${branch.bankAccountsCount > 1 ? 's' : ''}` 
                                                            : '⚠ No Bank Account'
                                                        }
                                                    </p>
                                                    {isSelected && <span className="text-lg">✓</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Transfer Summary */}
                            {selectedBranches.length > 0 && formData.amountPerBranch && (
                                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-6 rounded-xl border-2 border-teal-200">
                                    <h3 className="font-bold text-gray-800 mb-3">Transfer Summary</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-600 font-semibold">Branches Selected</p>
                                            <p className="text-2xl font-black text-gray-900">{selectedBranches.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 font-semibold">Amount Per Branch</p>
                                            <p className="text-2xl font-black text-gray-900">₱{parseFloat(formData.amountPerBranch).toLocaleString()}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-gray-600 font-semibold mb-1">Total Transfer Amount</p>
                                            <p className="text-4xl font-black bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                                                ₱{totalTransferAmount.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    {!canTransfer && totalTransferAmount > 0 && (
                                        <p className="text-red-600 text-sm font-bold mt-3">⚠️ Insufficient balance in source account</p>
                                    )}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!canTransfer || selectedBranches.length === 0 || loading}
                                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-4 rounded-xl font-bold text-lg hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={20} />
                                        Distribute Funds to {selectedBranches.length} Branch{selectedBranches.length !== 1 ? 'es' : ''}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-6 rounded-2xl shadow-lg text-white">
                        <p className="text-teal-100 text-xs font-semibold uppercase mb-2">Total Branches</p>
                        <p className="text-4xl font-black mb-1">{branches.length}</p>
                        <p className="text-sm opacity-90">Active church branches</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Info</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-teal-50 rounded-xl">
                                <p className="text-xs font-bold text-teal-700 mb-2">Transfer Method</p>
                                <p className="text-sm text-gray-700">Distribute equal amounts to multiple branches simultaneously</p>
                            </div>
                            <div className="p-4 bg-cyan-50 rounded-xl">
                                <p className="text-xs font-bold text-cyan-700 mb-2">Processing Time</p>
                                <p className="text-sm text-gray-700">Instant transfer to all selected branches</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-xl">
                                <p className="text-xs font-bold text-blue-700 mb-2">Tracking</p>
                                <p className="text-sm text-gray-700">View all transfers in the Transfer Reports page</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Request Submitted</h3>
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
    );
};

export default TransferRevolvingFunds;
