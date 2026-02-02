import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, Clock, XCircle, DollarSign, Calendar, Filter, Download } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';

const Stipends = () => {
  const [filter, setFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stipends, setStipends] = useState([]);
  const [userBranchId, setUserBranchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedStipend, setSelectedStipend] = useState(null);
  const [paying, setPaying] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    fetchUserBranch();
  }, []);

  useEffect(() => {
    if (userBranchId) {
      fetchStipends();
    }
  }, [userBranchId]);

  const fetchUserBranch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select(`
          user_id,
          users_details!users_user_details_id_fkey(
            branch_id
          )
        `)
        .eq('auth_user_id', user.id)
        .limit(1);

      if (error) throw error;
      
      const currentUser = data?.[0];
      const branchId = currentUser?.users_details?.branch_id;
      setUserBranchId(branchId);
    } catch (error) {
      console.error('Error fetching user branch:', error);
    }
  };

  const fetchStipends = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          transaction_id,
          transaction_date,
          amount,
          status,
          account_id,
          expenses!inner(
            expense_id,
            category_id,
            receiver_user_id,
            notes,
            billing_period,
            users!receiver_user_id(
              user_id,
              user_details_id,
              email,
              users_details!users_user_details_id_fkey(
                photo_path,
                first_name,
                middle_name,
                last_name
              )
            )
          ),
          branches!branch_id(
            name
          ),
          finance_accounts!account_id(
            account_name
          )
        `)
        .eq('expenses.category_id', 31)
        .eq('branch_id', userBranchId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      const formattedStipends = data.map(t => {
        const userDetails = t.expenses?.users?.users_details;
        const fullName = userDetails 
          ? `${userDetails.first_name || ''} ${userDetails.middle_name ? userDetails.middle_name + ' ' : ''}${userDetails.last_name || ''}`.trim()
          : t.expenses?.users?.email || 'N/A';
        
        return {
          id: t.transaction_id,
          recipient: fullName,
          profilePath: userDetails?.photo_path || null,
          position: 'N/A',
          amount: parseFloat(t.amount),
          transactionDate: t.transaction_date,
          billingPeriod: t.expenses?.billing_period || 'N/A',
          status: t.status,
          branch: t.branches?.name || 'N/A',
          notes: t.expenses?.notes || '',
          accountId: t.account_id,
          accountName: t.finance_accounts?.account_name || 'N/A'
        };
      });

      setStipends(formattedStipends);
    } catch (error) {
      console.error('Error fetching stipends:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStipends = stipends.filter(s => {
    // Filter by status
    if (filter !== 'all' && s.status.toLowerCase() !== filter) return false;
    
    // Filter by date range
    if (startDate && s.transactionDate < startDate) return false;
    if (endDate && s.transactionDate > endDate) return false;
    
    return true;
  });

  const exportToPDF = () => {
    // Create a simple HTML structure for PDF
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Stipend Report</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: Arial, sans-serif; padding: 20px; }');
    printWindow.document.write('h1 { color: #4F46E5; }');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-top: 20px; }');
    printWindow.document.write('th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }');
    printWindow.document.write('th { background-color: #4F46E5; color: white; }');
    printWindow.document.write('.header { margin-bottom: 20px; }');
    printWindow.document.write('.total { font-weight: bold; background-color: #f3f4f6; }');
    printWindow.document.write('</style></head><body>');
    
    printWindow.document.write('<div class="header">');
    printWindow.document.write('<h1>Stipend Report</h1>');
    printWindow.document.write('<p>Generated on: ' + new Date().toLocaleDateString() + '</p>');
    if (startDate || endDate) {
      printWindow.document.write('<p>Period: ' + (startDate || 'All') + ' to ' + (endDate || 'Present') + '</p>');
    }
    printWindow.document.write('<p>Status Filter: ' + filter.charAt(0).toUpperCase() + filter.slice(1) + '</p>');
    printWindow.document.write('</div>');
    
    printWindow.document.write('<table>');
    printWindow.document.write('<thead><tr>');
    printWindow.document.write('<th>Recipient</th>');
    printWindow.document.write('<th>Position</th>');
    printWindow.document.write('<th>Branch</th>');
    printWindow.document.write('<th>Period</th>');
    printWindow.document.write('<th>Amount</th>');
    printWindow.document.write('<th>Due Date</th>');
    printWindow.document.write('<th>Status</th>');
    printWindow.document.write('</tr></thead><tbody>');
    
    let total = 0;
    filteredStipends.forEach(stipend => {
      total += stipend.amount;
      printWindow.document.write('<tr>');
      printWindow.document.write('<td>' + stipend.recipient + '</td>');
      printWindow.document.write('<td>' + stipend.position + '</td>');
      printWindow.document.write('<td>' + stipend.branch + '</td>');
      printWindow.document.write('<td>' + new Date(stipend.transactionDate).toLocaleDateString() + '</td>');
      printWindow.document.write('<td>₱' + stipend.amount.toLocaleString() + '</td>');
      printWindow.document.write('<td>' + stipend.transactionDate + '</td>');
      printWindow.document.write('<td>' + stipend.status + '</td>');
      printWindow.document.write('</tr>');
    });
    
    printWindow.document.write('<tr class="total">');
    printWindow.document.write('<td colspan="4">Total</td>');
    printWindow.document.write('<td>₱' + total.toLocaleString() + '</td>');
    printWindow.document.write('<td colspan="2">' + filteredStipends.length + ' records</td>');
    printWindow.document.write('</tr>');
    
    printWindow.document.write('</tbody></table></body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  const pendingCount = stipends.filter(s => s.status === 'Pending').length;
  const totalPending = stipends.filter(s => s.status === 'Pending').reduce((sum, s) => sum + s.amount, 0);
  const uniqueRecipients = [...new Set(stipends.map(s => s.recipient))].length;

  const handlePayStipend = async () => {
    if (!selectedStipend) return;
    
    try {
      setPaying(true);
      
      // Update transaction status
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({ status: 'Completed' })
        .eq('transaction_id', selectedStipend.id);

      if (transactionError) throw transactionError;

      // Deduct amount from finance account balance
      const { data: accountData, error: accountFetchError } = await supabase
        .from('finance_accounts')
        .select('balance')
        .eq('account_id', selectedStipend.accountId)
        .single();

      if (accountFetchError) throw accountFetchError;

      const newBalance = parseFloat(accountData.balance) - selectedStipend.amount;

      const { error: balanceError } = await supabase
        .from('finance_accounts')
        .update({ balance: newBalance })
        .eq('account_id', selectedStipend.accountId);

      if (balanceError) throw balanceError;

      // Refresh stipends
      await fetchStipends();
      setShowPaymentModal(false);
      setSelectedStipend(null);
    } catch (error) {
      console.error('Error marking stipend as paid:', error);
      alert('Error marking stipend as paid: ' + error.message);
    } finally {
      setPaying(false);
    }
  };

  const handleRejectStipend = async () => {
    if (!selectedStipend) return;
    
    try {
      setRejecting(true);
      
      // Update transaction status to Rejected (no balance deduction)
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'Rejected' })
        .eq('transaction_id', selectedStipend.id);

      if (error) throw error;

      // Refresh stipends
      await fetchStipends();
      setShowRejectModal(false);
      setSelectedStipend(null);
    } catch (error) {
      console.error('Error rejecting stipend:', error);
      alert('Error rejecting stipend: ' + error.message);
    } finally {
      setRejecting(false);
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
          <CheckCircle size={12} /> Completed
        </span>;
      case 'Rejected':
        return <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
          <XCircle size={12} /> Rejected
        </span>;
      default:
        return status;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <Sidebar />
      
      <div className="flex flex-col flex-1">
        <Header />
        
        <div className="flex-1 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-10 overflow-y-auto">
          <div className="bg-gradient-to-r from-[#1a4d2e] to-[#2d7a4a] rounded-2xl p-6 text-white shadow-xl mb-8">
            <h1 className="text-4xl font-bold mb-2">Stipend Management</h1>
            <p className="text-green-100">Manage and process monthly stipends for pastors and workers</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-[#1a4d2e] to-[#2d7a4a] p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <Clock size={24} />
                <p className="text-green-100 text-xs font-semibold uppercase">Pending Payments</p>
              </div>
              <p className="text-4xl font-black">{pendingCount}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="text-[#1a4d2e]" size={24} />
                <p className="text-xs font-semibold text-gray-500 uppercase">Total Pending Amount</p>
              </div>
              <p className="text-3xl font-black text-[#1a4d2e]">₱{totalPending.toLocaleString()}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <Users className="text-green-600" size={24} />
                <p className="text-xs font-semibold text-gray-500 uppercase">Recipients</p>
              </div>
              <p className="text-3xl font-black text-green-600">{uniqueRecipients}</p>
            </div>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 p-6 mb-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Filter size={20} className="text-gray-500" />
                <span className="font-bold text-gray-700">Filter by Status:</span>
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
                  Completed
                </button>
                <button
                  onClick={() => setFilter('rejected')}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    filter === 'rejected' 
                    ? 'bg-[#7a2828] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Rejected
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
              
              <div className="flex items-center gap-4">
                <Calendar size={20} className="text-gray-500" />
                <span className="font-bold text-gray-700">Date Range:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e] focus:outline-none transition-colors text-sm"
                    placeholder="Start Date"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e] focus:outline-none transition-colors text-sm"
                    placeholder="End Date"
                  />
                  {(startDate || endDate) && (
                    <button
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                    >
                      Clear Dates
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stipends Table */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Stipend Records</h2>
              <div className="flex gap-3">
                <button 
                  onClick={exportToPDF}
                  className="bg-gradient-to-r from-[#1a4d2e] to-[#2d7a4a] text-white px-6 py-3 rounded-xl font-bold hover:from-[#153d24] hover:to-[#246038] transition-all shadow-lg flex items-center gap-2"
                >
                  <Download size={20} />
                  Export to PDF
                </button>
                <button className="bg-gradient-to-r from-[#1a4d2e] to-[#2d7a4a] text-white px-6 py-3 rounded-xl font-bold hover:from-[#153d24] hover:to-[#246038] transition-all shadow-lg">
                  Release All Pending
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Recipient</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Billing Period</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Account</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStipends.map(stipend => (
                <tr key={stipend.id} className="hover:bg-green-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {stipend.profilePath ? (
                        <img src={stipend.profilePath} alt={stipend.recipient} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Users size={20} className="text-indigo-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900">{stipend.recipient}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{stipend.branch}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{stipend.billingPeriod ? new Date(stipend.billingPeriod).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-700">{stipend.accountName}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-mono font-bold text-lg text-indigo-700">₱{stipend.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(stipend.status)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{stipend.notes || '-'}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {stipend.status === 'Pending' ? (
                      <div className="flex gap-2 justify-center">
                        <button 
                          onClick={() => {
                            setSelectedStipend(stipend);
                            setShowPaymentModal(true);
                          }}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
                        >
                          Mark as Paid
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedStipend(stipend);
                            setShowRejectModal(true);
                          }}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm font-semibold">{stipend.status}</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredStipends.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="text-gray-300" size={48} />
                      <p className="text-gray-500 text-lg font-semibold">
                        {loading ? 'Loading stipends...' : 'No stipend records found'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {loading ? 'Please wait...' : 'Try adjusting your filters'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
            </div>
          </div>

          {/* Payment Confirmation Modal */}
          {showPaymentModal && selectedStipend && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirm Payment</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    {selectedStipend.profilePath ? (
                      <img src={selectedStipend.profilePath} alt={selectedStipend.recipient} className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Users size={28} className="text-indigo-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-lg text-gray-900">{selectedStipend.recipient}</p>
                      <p className="text-sm text-gray-500">{selectedStipend.branch}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Billing Period</p>
                      <p className="text-sm font-bold text-gray-900">{selectedStipend.billingPeriod ? new Date(selectedStipend.billingPeriod).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Account</p>
                      <p className="text-sm font-bold text-gray-900">{selectedStipend.accountName}</p>
                    </div>
                  </div>

                  <div className="bg-indigo-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Amount to Pay</p>
                    <p className="text-3xl font-black text-indigo-700">₱{selectedStipend.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                  </div>

                  {selectedStipend.notes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Notes</p>
                      <p className="text-sm text-gray-600">{selectedStipend.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedStipend(null);
                    }}
                    disabled={paying}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePayStipend}
                    disabled={paying}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {paying ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Confirm Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reject Confirmation Modal */}
          {showRejectModal && selectedStipend && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                <h2 className="text-2xl font-bold text-red-600 mb-6">Reject Stipend</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    {selectedStipend.profilePath ? (
                      <img src={selectedStipend.profilePath} alt={selectedStipend.recipient} className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <Users size={28} className="text-red-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-lg text-gray-900">{selectedStipend.recipient}</p>
                      <p className="text-sm text-gray-500">{selectedStipend.branch}</p>
                    </div>
                  </div>

                  <div className="bg-red-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-red-800 mb-2">Are you sure you want to reject this stipend?</p>
                    <p className="text-xs text-red-600">This action cannot be undone. The stipend will be marked as rejected.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Billing Period</p>
                      <p className="text-sm font-bold text-gray-900">{selectedStipend.billingPeriod ? new Date(selectedStipend.billingPeriod).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Amount</p>
                      <p className="text-sm font-bold text-gray-900">₱{selectedStipend.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setSelectedStipend(null);
                    }}
                    disabled={rejecting}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectStipend}
                    disabled={rejecting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {rejecting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <XCircle size={20} />
                        Reject Stipend
                      </>
                    )}
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

export default Stipends;