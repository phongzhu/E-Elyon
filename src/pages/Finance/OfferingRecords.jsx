import React, { useState } from 'react';
import { Plus, Calendar, DollarSign, Users, Filter, Download, TrendingUp, Church } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

const OfferingRecords = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [newOffering, setNewOffering] = useState({
    date: new Date().toISOString().split('T')[0],
    serviceType: '',
    amount: '',
    attendance: '',
    branch: '',
    notes: ''
  });

  // Sample offering data
  const offerings = [
    {
      id: 1,
      date: '2026-01-26',
      serviceType: 'Sunday Morning Service',
      amount: 45000,
      attendance: 250,
      branch: 'Main Church',
      notes: 'Regular Sunday service',
      recordedBy: 'John Santos'
    },
    {
      id: 2,
      date: '2026-01-26',
      serviceType: 'Sunday Evening Service',
      amount: 28000,
      attendance: 180,
      branch: 'Main Church',
      notes: 'Evening worship',
      recordedBy: 'Maria Garcia'
    },
    {
      id: 3,
      date: '2026-01-22',
      serviceType: 'Wednesday Prayer Meeting',
      amount: 15000,
      attendance: 120,
      branch: 'Main Church',
      notes: 'Mid-week service',
      recordedBy: 'John Santos'
    },
    {
      id: 4,
      date: '2026-01-25',
      serviceType: 'Youth Service',
      amount: 12000,
      attendance: 80,
      branch: 'Quezon City Branch',
      notes: 'Youth gathering',
      recordedBy: 'Anna Reyes'
    },
    {
      id: 5,
      date: '2026-01-19',
      serviceType: 'Sunday Morning Service',
      amount: 48000,
      attendance: 265,
      branch: 'Main Church',
      notes: 'Regular Sunday service',
      recordedBy: 'John Santos'
    },
    {
      id: 6,
      date: '2026-01-12',
      serviceType: 'Sunday Morning Service',
      amount: 42000,
      attendance: 240,
      branch: 'Main Church',
      notes: 'Regular Sunday service',
      recordedBy: 'John Santos'
    },
  ];

  const serviceTypes = [
    'Sunday Morning Service',
    'Sunday Evening Service',
    'Wednesday Prayer Meeting',
    'Youth Service',
    'Kids Service',
    'Special Event',
    'Outreach Service',
    'Holiday Service'
  ];

  const branches = [
    'Main Church',
    'Manila Branch',
    'Quezon City Branch',
    'Makati Branch',
    'Pasig Branch'
  ];

  const filteredOfferings = offerings.filter(o => {
    if (filter !== 'all' && o.serviceType !== filter) return false;
    if (startDate && o.date < startDate) return false;
    if (endDate && o.date > endDate) return false;
    return true;
  });

  const totalOfferings = filteredOfferings.reduce((sum, o) => sum + o.amount, 0);
  const totalAttendance = filteredOfferings.reduce((sum, o) => sum + o.attendance, 0);
  const averagePerService = filteredOfferings.length > 0 ? totalOfferings / filteredOfferings.length : 0;
  const averagePerPerson = totalAttendance > 0 ? totalOfferings / totalAttendance : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('New offering record:', newOffering);
    alert('Offering record added successfully!');
    setNewOffering({
      date: new Date().toISOString().split('T')[0],
      serviceType: '',
      amount: '',
      attendance: '',
      branch: '',
      notes: ''
    });
    setShowAddModal(false);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Offering Records Report</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: Arial, sans-serif; padding: 20px; }');
    printWindow.document.write('h1 { color: #059669; }');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-top: 20px; }');
    printWindow.document.write('th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }');
    printWindow.document.write('th { background-color: #059669; color: white; }');
    printWindow.document.write('.header { margin-bottom: 20px; }');
    printWindow.document.write('.summary { margin-bottom: 20px; background-color: #f0fdf4; padding: 15px; border-radius: 8px; }');
    printWindow.document.write('.total { font-weight: bold; background-color: #f3f4f6; }');
    printWindow.document.write('</style></head><body>');
    
    printWindow.document.write('<div class="header">');
    printWindow.document.write('<h1>Offering Records Report</h1>');
    printWindow.document.write('<p>Generated on: ' + new Date().toLocaleDateString() + '</p>');
    if (startDate || endDate) {
      printWindow.document.write('<p>Period: ' + (startDate || 'All') + ' to ' + (endDate || 'Present') + '</p>');
    }
    printWindow.document.write('</div>');
    
    printWindow.document.write('<div class="summary">');
    printWindow.document.write('<h3>Summary</h3>');
    printWindow.document.write('<p><strong>Total Offerings:</strong> ₱' + totalOfferings.toLocaleString() + '</p>');
    printWindow.document.write('<p><strong>Total Services:</strong> ' + filteredOfferings.length + '</p>');
    printWindow.document.write('<p><strong>Total Attendance:</strong> ' + totalAttendance.toLocaleString() + '</p>');
    printWindow.document.write('<p><strong>Average per Service:</strong> ₱' + averagePerService.toFixed(2) + '</p>');
    printWindow.document.write('</div>');
    
    printWindow.document.write('<table>');
    printWindow.document.write('<thead><tr>');
    printWindow.document.write('<th>Date</th>');
    printWindow.document.write('<th>Service Type</th>');
    printWindow.document.write('<th>Branch</th>');
    printWindow.document.write('<th>Amount</th>');
    printWindow.document.write('<th>Attendance</th>');
    printWindow.document.write('<th>Notes</th>');
    printWindow.document.write('</tr></thead><tbody>');
    
    filteredOfferings.forEach(offering => {
      printWindow.document.write('<tr>');
      printWindow.document.write('<td>' + offering.date + '</td>');
      printWindow.document.write('<td>' + offering.serviceType + '</td>');
      printWindow.document.write('<td>' + offering.branch + '</td>');
      printWindow.document.write('<td>₱' + offering.amount.toLocaleString() + '</td>');
      printWindow.document.write('<td>' + offering.attendance + '</td>');
      printWindow.document.write('<td>' + offering.notes + '</td>');
      printWindow.document.write('</tr>');
    });
    
    printWindow.document.write('</tbody></table></body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex flex-col flex-1">
        <Header />
        
        <div className="flex-1 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-10 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
          Offering Records
        </h1>
        <p className="text-gray-600 font-medium">Track and manage offerings by service type</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign size={24} />
            <p className="text-green-100 text-xs font-semibold uppercase">Total Offerings</p>
          </div>
          <p className="text-4xl font-black">₱{totalOfferings.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Church className="text-green-600" size={24} />
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Services</p>
          </div>
          <p className="text-3xl font-black text-gray-900">{filteredOfferings.length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-emerald-600" size={24} />
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Attendance</p>
          </div>
          <p className="text-3xl font-black text-gray-900">{totalAttendance.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-teal-600" size={24} />
            <p className="text-xs font-semibold text-gray-500 uppercase">Avg per Service</p>
          </div>
          <p className="text-3xl font-black text-green-700">₱{averagePerService.toLocaleString('en-PH', { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter size={20} className="text-gray-500" />
            <span className="font-bold text-gray-700">Filter by Service:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                filter === 'all' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Services
            </button>
            <button
              onClick={() => setFilter('Sunday Morning Service')}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                filter === 'Sunday Morning Service' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sunday Morning
            </button>
            <button
              onClick={() => setFilter('Sunday Evening Service')}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                filter === 'Sunday Evening Service' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sunday Evening
            </button>
            <button
              onClick={() => setFilter('Wednesday Prayer Meeting')}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                filter === 'Wednesday Prayer Meeting' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Wednesday
            </button>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            <Calendar size={20} className="text-gray-500" />
            <span className="font-bold text-gray-700">Date Range:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors text-sm"
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

      {/* Offerings Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Service Offering Records</h2>
          <div className="flex gap-3">
            <button 
              onClick={exportToPDF}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-bold hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg flex items-center gap-2"
            >
              <Download size={20} />
              Export to PDF
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center gap-2"
            >
              <Plus size={20} />
              Add Offering Record
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Service Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Attendance</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Per Person Avg</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOfferings.map(offering => (
                <tr key={offering.id} className="hover:bg-green-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Calendar size={14} />
                      {offering.date}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Church size={16} className="text-green-600" />
                      <span className="font-bold text-gray-900">{offering.serviceType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{offering.branch}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-mono font-bold text-lg text-green-700">₱{offering.amount.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users size={14} className="text-gray-500" />
                      <span className="font-bold text-gray-900">{offering.attendance}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="text-sm font-semibold text-gray-700">₱{(offering.amount / offering.attendance).toFixed(2)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{offering.notes}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-700">{offering.recordedBy}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Offering Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Add Offering Record</h2>
              <p className="text-gray-500 text-sm mt-1">Record a new service offering</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    <Calendar className="inline mr-2" size={16} />
                    Service Date
                  </label>
                  <input
                    type="date"
                    value={newOffering.date}
                    onChange={(e) => setNewOffering({...newOffering, date: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    <Church className="inline mr-2" size={16} />
                    Service Type
                  </label>
                  <select
                    value={newOffering.serviceType}
                    onChange={(e) => setNewOffering({...newOffering, serviceType: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                    required
                  >
                    <option value="">Select service type...</option>
                    {serviceTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    <DollarSign className="inline mr-2" size={16} />
                    Offering Amount (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOffering.amount}
                    onChange={(e) => setNewOffering({...newOffering, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors text-lg font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    <Users className="inline mr-2" size={16} />
                    Attendance Count
                  </label>
                  <input
                    type="number"
                    value={newOffering.attendance}
                    onChange={(e) => setNewOffering({...newOffering, attendance: e.target.value})}
                    placeholder="0"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Branch</label>
                <select
                  value={newOffering.branch}
                  onChange={(e) => setNewOffering({...newOffering, branch: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                  required
                >
                  <option value="">Select branch...</option>
                  {branches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={newOffering.notes}
                  onChange={(e) => setNewOffering({...newOffering, notes: e.target.value})}
                  placeholder="Any additional notes..."
                  rows="3"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
                >
                  Save Offering Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
      </div>
    </div>
  );
};

export default OfferingRecords;
