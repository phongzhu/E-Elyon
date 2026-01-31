import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Eye, Wallet, Building2, CreditCard, TrendingUp, TrendingDown, DollarSign, Filter, X, Trash2, CheckCircle } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';

const FundManagement = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('success');

  const showNotification = (message, type = 'success') => {
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);
  };
  const [branches, setBranches] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [newAccount, setNewAccount] = useState({
    accountName: '',
    accountType: 'Cash',
    accountNumber: '',
    branchId: '',
    branchMinistryId: '',
    balance: '0'
  });

  useEffect(() => {
    fetchAccounts();
    fetchBranches();
    fetchMinistries();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('finance_accounts')
        .select(`
          *,
          branches!branch_id(name),
          branch_ministries!branch_ministry_id(
            branch_ministry_id,
            ministries!ministry_id(name)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      showNotification('Error loading accounts: ' + error.message, 'error');
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('branch_id, name')
        .order('name');
      
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchMinistries = async () => {
    try {
      const { data, error } = await supabase
        .from('ministries')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setMinistries(data || []);
    } catch (error) {
      console.error('Error fetching ministries:', error);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('finance_accounts')
        .insert({
          account_name: newAccount.accountName,
          account_type: newAccount.accountType,
          account_number: newAccount.accountNumber || null,
          branch_id: newAccount.branchId || null,
          branch_ministry_id: newAccount.branchMinistryId || null,
          balance: parseFloat(newAccount.balance) || 0,
          is_active: true
        });

      if (error) throw error;

      showNotification('Account created successfully!');
      setShowAddModal(false);
      setNewAccount({
        accountName: '',
        accountType: 'Cash',
        accountNumber: '',
        branchId: '',
        branchMinistryId: '',
        balance: '0'
      });
      fetchAccounts();
    } catch (error) {
      console.error('Error adding account:', error);
      showNotification('Error creating account: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('finance_accounts')
        .update({
          account_name: selectedAccount.account_name,
          account_type: selectedAccount.account_type,
          account_number: selectedAccount.account_number || null,
          branch_id: selectedAccount.branch_id || null,
          branch_ministry_id: selectedAccount.branch_ministry_id || null,
          is_active: selectedAccount.is_active
        })
        .eq('account_id', selectedAccount.account_id);

      if (error) throw error;

      showNotification('Account updated successfully!');
      setShowEditModal(false);
      setSelectedAccount(null);
      fetchAccounts();
    } catch (error) {
      console.error('Error updating account:', error);
      showNotification('Error updating account: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (accountId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this account?`)) return;

    try {
      const { error } = await supabase
        .from('finance_accounts')
        .update({ is_active: !currentStatus })
        .eq('account_id', accountId);

      if (error) throw error;

      showNotification(`Account ${currentStatus ? 'deactivated' : 'activated'} successfully!`);
      fetchAccounts();
    } catch (error) {
      console.error('Error toggling account status:', error);
      showNotification('Error updating account status: ' + error.message, 'error');
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
  const activeAccounts = accounts.filter(acc => acc.is_active).length;
  const cashAccounts = accounts.filter(acc => acc.account_type === 'Cash');
  const totalCash = cashAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);

  const getAccountIcon = (type) => {
    switch (type) {
      case 'Cash': return <Wallet className="text-emerald-600" size={24} />;
      case 'Bank': return <Building2 className="text-blue-600" size={24} />;
      case 'Savings': return <DollarSign className="text-indigo-600" size={24} />;
      case 'Checking': return <CreditCard className="text-purple-600" size={24} />;
      default: return <Wallet className="text-gray-600" size={24} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex flex-col flex-1">
        <Header />
        
        <div className="flex-1 bg-gradient-to-br from-gray-50 to-blue-50 p-10 overflow-y-auto">
          <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Accounts & Balances</h1>
          <p className="text-gray-500">Manage all church financial accounts</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
        >
          <Plus size={20} />
          Add New Account
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg text-white">
          <p className="text-blue-100 text-xs font-semibold uppercase mb-2">Total Balance</p>
          <p className="text-4xl font-black mb-2">₱{totalBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
          <p className="text-sm">Across all accounts</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Active Accounts</p>
          <p className="text-4xl font-black text-gray-900 mb-2">{activeAccounts}</p>
          <p className="text-sm text-gray-600">Of {accounts.length} total</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Total Cash</p>
          <p className="text-4xl font-black text-gray-900 mb-2">₱{totalCash.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
          <p className="text-sm text-gray-600">{cashAccounts.length} cash accounts</p>
        </div>
      </div>

      {/* Accounts List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">All Accounts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map(account => (
            <div key={account.account_id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-white p-3 rounded-xl shadow-sm">
                  {getAccountIcon(account.account_type)}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setSelectedAccount(account);
                      setShowEditModal(true);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} className="text-gray-600" />
                  </button>
                  <button 
                    onClick={() => handleToggleActive(account.account_id, account.is_active)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {account.is_active ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <X size={16} className="text-red-600" />
                    )}
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1">{account.account_name}</h3>
              <p className="text-xs text-gray-500 mb-1">{account.account_type}</p>
              {account.account_number && (
                <p className="text-xs text-gray-500 mb-3">{account.account_number}</p>
              )}
              {account.branches && (
                <p className="text-xs text-blue-600 mb-3">📍 {account.branches.name}</p>
              )}
              {account.branch_ministries?.ministries && (
                <p className="text-xs text-purple-600 mb-3">🙏 {account.branch_ministries.ministries.name}</p>
              )}

              <p className="text-3xl font-black text-gray-900 mb-3">
                ₱{parseFloat(account.balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>

              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  account.is_active 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
                }`}>
                  {account.is_active ? 'Active' : 'Inactive'}
                </span>
                <p className="text-xs text-gray-400">
                  Updated: {new Date(account.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {accounts.length === 0 && (
          <div className="text-center py-12">
            <Wallet className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 text-lg">No accounts found</p>
            <p className="text-gray-400 text-sm">Add your first account to get started</p>
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Account</h2>
            
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Account Name</label>
                <input
                  type="text"
                  value={newAccount.accountName}
                  onChange={(e) => setNewAccount({...newAccount, accountName: e.target.value})}
                  placeholder="e.g., General Fund"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Account Type</label>
                <select
                  value={newAccount.accountType}
                  onChange={(e) => setNewAccount({...newAccount, accountType: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="Savings">Savings</option>
                  <option value="Checking">Checking</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Account Number (Optional)</label>
                <input
                  type="text"
                  value={newAccount.accountNumber}
                  onChange={(e) => setNewAccount({...newAccount, accountNumber: e.target.value})}
                  placeholder="0000-0000-0000"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Branch (Optional)</label>
                <select
                  value={newAccount.branchId}
                  onChange={(e) => setNewAccount({...newAccount, branchId: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                >
                  <option value="">None</option>
                  {branches.map(branch => (
                    <option key={branch.branch_id} value={branch.branch_id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Initial Balance (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newAccount.balance}
                  onChange={(e) => setNewAccount({...newAccount, balance: e.target.value})}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center">
              {modalType === 'success' ? (
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <X className="h-6 w-6 text-red-600" />
                </div>
              )}
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {modalType === 'success' ? 'Success!' : 'Error'}
              </h3>
              <p className="text-gray-600 mb-6">{modalMessage}</p>
              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                OK
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

export default FundManagement;