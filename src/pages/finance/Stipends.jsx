import React, { useState } from 'react';
import { Users, CheckCircle, Clock, XCircle, DollarSign, Calendar, Filter, Download } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

const Stipends = () => {
  const [filter, setFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sample stipend data
  const stipends = [
    {
      id: 1,
      recipient: 'Pastor Carlos Mendoza',
      position: 'Senior Pastor',
      amount: 25000,
      period: 'January 2026',
      dueDate: '2026-02-05',
      status: 'Pending',
      branch: 'Main Church',
    },
    {
      id: 2,
      recipient: 'Pastor Maria Santos',
      position: 'Associate Pastor',
      amount: 18000,
      period: 'January 2026',
      dueDate: '2026-02-05',
      status: 'Pending',
      branch: 'Quezon City Branch',
    },
    {
      id: 3,
      recipient: 'Brother Juan Reyes',
      position: 'Worship Leader',
      amount: 12000,
      period: 'January 2026',
      dueDate: '2026-02-05',
      status: 'Pending',
      branch: 'Main Church',
    },
    {
      id: 4,
      recipient: 'Sister Ana Garcia',
      position: 'Youth Coordinator',
      amount: 10000,
      period: 'January 2026',
      dueDate: '2026-02-05',
      status: 'Pending',
      branch: 'Manila Branch',
    },
    {
      id: 5,
      recipient: 'Pastor Carlos Mendoza',
      position: 'Senior Pastor',
      amount: 25000,
      period: 'December 2025',
      dueDate: '2026-01-05',
      status: 'Paid',
      paidDate: '2026-01-04',
      branch: 'Main Church',
    },
    {
      id: 6,
      recipient: 'Pastor Maria Santos',
      position: 'Associate Pastor',
      amount: 18000,
      period: 'December 2025',
      dueDate: '2026-01-05',
      status: 'Paid',
      paidDate: '2026-01-04',
      branch: 'Quezon City Branch',
    },
  ];

  const filteredStipends = stipends.filter(s => {
    // Filter by status
    if (filter !== 'all' && s.status.toLowerCase() !== filter) return false;
    
    // Filter by date range
    if (startDate && s.dueDate < startDate) return false;
    if (endDate && s.dueDate > endDate) return false;
    
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
      printWindow.document.write('<td>' + stipend.period + '</td>');
      printWindow.document.write('<td>₱' + stipend.amount.toLocaleString() + '</td>');
      printWindow.document.write('<td>' + stipend.dueDate + '</td>');
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

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Pending':
        return <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
          <Clock size={12} /> Pending
        </span>;
      case 'Paid':
        return <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
          <CheckCircle size={12} /> Paid
        </span>;
      default:
        return status;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex flex-col flex-1">
        <Header />
        
        <div className="flex-1 bg-gradient-to-br from-gray-50 to-indigo-50 p-10 overflow-y-auto">
          <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Stipend Management</h1>
        <p className="text-gray-500">Manage and process monthly stipends for pastors and workers</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={24} />
            <p className="text-indigo-100 text-xs font-semibold uppercase">Pending Payments</p>
          </div>
          <p className="text-4xl font-black">{pendingCount}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="text-indigo-600" size={24} />
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Pending Amount</p>
          </div>
          <p className="text-3xl font-black text-indigo-700">₱{totalPending.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-green-600" size={24} />
            <p className="text-xs font-semibold text-gray-500 uppercase">Recipients</p>
          </div>
          <p className="text-3xl font-black text-gray-900">{new Set(stipends.map(s => s.recipient)).size}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Filter size={20} className="text-gray-500" />
            <span className="font-bold text-gray-700">Filter by Status:</span>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                filter === 'pending' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('paid')}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                filter === 'paid' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Paid
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
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-sm"
                placeholder="Start Date"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-sm"
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
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Stipend Records</h2>
          <div className="flex gap-3">
            <button 
              onClick={exportToPDF}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center gap-2"
            >
              <Download size={20} />
              Export to PDF
            </button>
            <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg">
              Release All Pending
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Recipient</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Position</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Period</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStipends.map(stipend => (
                <tr key={stipend.id} className="hover:bg-indigo-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Users size={20} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{stipend.recipient}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-700">{stipend.position}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{stipend.branch}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900">{stipend.period}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-mono font-bold text-lg text-indigo-700">₱{stipend.amount.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                      <Calendar size={14} />
                      {stipend.dueDate}
                    </div>
                    {stipend.paidDate && (
                      <p className="text-xs text-green-600 mt-1">Paid: {stipend.paidDate}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(stipend.status)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {stipend.status === 'Pending' ? (
                      <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors">
                        Mark as Paid
                      </button>
                    ) : (
                      <button className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold cursor-default">
                        Completed
                      </button>
                    )}
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

export default Stipends;