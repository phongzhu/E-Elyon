import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, MapPin, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

const BranchFundRequests = () => {
    const [filter, setFilter] = useState('pending');

    // Sample branch fund requests
    const [requests, setRequests] = useState([
        {
            id: 1,
            branch: 'Quezon City Branch',
            pastor: 'Pastor Maria Santos',
            requestType: 'Monthly Revolving Fund',
            amount: 50000,
            period: 'February 2026',
            requestDate: '2026-01-25',
            purpose: 'Monthly operational expenses - utilities, supplies, ministry activities',
            status: 'Pending',
            dueDate: '2026-02-01'
        },
        {
            id: 2,
            branch: 'Manila Branch',
            pastor: 'Pastor Pedro Reyes',
            requestType: 'Special Request',
            amount: 75000,
            period: 'February 2026',
            requestDate: '2026-01-26',
            purpose: 'Church building repairs - roof leaking, electrical wiring',
            status: 'Pending',
            dueDate: '2026-02-05'
        },
        {
            id: 3,
            branch: 'Makati Branch',
            pastor: 'Pastor Juan Cruz',
            requestType: 'Monthly Revolving Fund',
            amount: 45000,
            period: 'February 2026',
            requestDate: '2026-01-27',
            purpose: 'Monthly operational expenses',
            status: 'Pending',
            dueDate: '2026-02-01'
        },
        {
            id: 4,
            branch: 'Quezon City Branch',
            pastor: 'Pastor Maria Santos',
            requestType: 'Monthly Revolving Fund',
            amount: 50000,
            period: 'January 2026',
            requestDate: '2025-12-28',
            purpose: 'Monthly operational expenses',
            status: 'Approved',
            approvedDate: '2025-12-30',
            approvedBy: 'Bishop Carlos Mendoza'
        },
        {
            id: 5,
            branch: 'Manila Branch',
            pastor: 'Pastor Pedro Reyes',
            requestType: 'Special Request',
            amount: 30000,
            period: 'January 2026',
            requestDate: '2026-01-10',
            purpose: 'Youth camp expenses',
            status: 'Rejected',
            rejectedDate: '2026-01-12',
            rejectedBy: 'Bishop Carlos Mendoza',
            rejectionReason: 'Insufficient budget allocation. Please resubmit with detailed breakdown.'
        },
    ]);

    // Monthly revolving fund settings per branch
    const revolvingFundSettings = [
        { branch: 'Quezon City Branch', monthlyAllocation: 50000, lastReleased: 'January 2026' },
        { branch: 'Manila Branch', monthlyAllocation: 48000, lastReleased: 'January 2026' },
        { branch: 'Makati Branch', monthlyAllocation: 45000, lastReleased: 'January 2026' },
        { branch: 'Pasig Branch', monthlyAllocation: 40000, lastReleased: 'January 2026' },
    ];

    const filteredRequests = requests.filter(r => {
        if (filter === 'all') return true;
        return r.status.toLowerCase() === filter;
    });

    const pendingCount = requests.filter(r => r.status === 'Pending').length;
    const totalPendingAmount = requests.filter(r => r.status === 'Pending').reduce((sum, r) => sum + r.amount, 0);

    const handleApprove = (requestId) => {
        setRequests(requests.map(r => 
            r.id === requestId 
            ? { ...r, status: 'Approved', approvedDate: new Date().toISOString().split('T')[0], approvedBy: 'Bishop Carlos Mendoza' }
            : r
        ));
    };

    const handleReject = (requestId) => {
        const reason = prompt('Please provide a reason for rejection:');
        if (reason) {
            setRequests(requests.map(r => 
                r.id === requestId 
                ? { ...r, status: 'Rejected', rejectedDate: new Date().toISOString().split('T')[0], rejectedBy: 'Bishop Carlos Mendoza', rejectionReason: reason }
                : r
            ));
        }
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'Pending':
                return <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                    <Clock size={12} /> Pending
                </span>;
            case 'Approved':
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

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            
            <div className="flex flex-col flex-1">
                <Header />
                
                <div className="flex-1 bg-gradient-to-br from-gray-50 to-teal-50 p-10 overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Branch Fund Requests</h1>
                <p className="text-gray-500">Approve and manage branch funding requests and revolving monthly funds</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-6 rounded-2xl shadow-lg text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock size={24} />
                        <p className="text-teal-100 text-xs font-semibold uppercase">Pending Requests</p>
                    </div>
                    <p className="text-4xl font-black">{pendingCount}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                        <DollarSign className="text-teal-600" size={24} />
                        <p className="text-xs font-semibold text-gray-500 uppercase">Total Pending Amount</p>
                    </div>
                    <p className="text-3xl font-black text-teal-700">₱{totalPendingAmount.toLocaleString()}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                        <MapPin className="text-orange-600" size={24} />
                        <p className="text-xs font-semibold text-gray-500 uppercase">Active Branches</p>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{revolvingFundSettings.length}</p>
                </div>
            </div>

            {/* Monthly Revolving Fund Settings */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
                <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="text-teal-600" size={28} />
                    <h2 className="text-2xl font-bold text-gray-800">Monthly Revolving Fund Settings</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {revolvingFundSettings.map((setting, idx) => (
                        <div key={idx} className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-200">
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin size={16} className="text-teal-600" />
                                <p className="font-bold text-gray-900">{setting.branch}</p>
                            </div>
                            <p className="text-2xl font-black text-teal-700">₱{setting.monthlyAllocation.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 mt-2">Last: {setting.lastReleased}</p>
                        </div>
                    ))}
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
                            ? 'bg-yellow-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Pending ({pendingCount})
                    </button>
                    <button
                        onClick={() => setFilter('approved')}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            filter === 'approved' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Approved
                    </button>
                    <button
                        onClick={() => setFilter('rejected')}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            filter === 'rejected' 
                            ? 'bg-red-600 text-white' 
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
            </div>

            {/* Requests List */}
            <div className="space-y-6">
                {filteredRequests.map(request => (
                    <div key={request.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <MapPin className="text-teal-600" size={20} />
                                    <h3 className="text-2xl font-black text-gray-900">{request.branch}</h3>
                                    {getStatusBadge(request.status)}
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                        request.requestType === 'Monthly Revolving Fund'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-purple-100 text-purple-700'
                                    }`}>
                                        {request.requestType}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">Pastor: {request.pastor}</p>
                                <p className="text-sm text-gray-500">Requested on: {request.requestDate}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-black text-teal-700">₱{request.amount.toLocaleString()}</p>
                                <p className="text-sm text-gray-600 mt-1">{request.period}</p>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl mb-6">
                            <p className="text-sm font-bold text-gray-700 mb-1">Purpose:</p>
                            <p className="text-gray-700">{request.purpose}</p>
                        </div>

                        {request.status === 'Approved' && (
                            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                <p className="text-sm font-bold text-green-800">
                                    ✓ Approved by {request.approvedBy} on {request.approvedDate}
                                </p>
                            </div>
                        )}

                        {request.status === 'Rejected' && (
                            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                                <p className="text-sm font-bold text-red-800 mb-1">
                                    ✗ Rejected by {request.rejectedBy} on {request.rejectedDate}
                                </p>
                                <p className="text-sm text-red-700">Reason: {request.rejectionReason}</p>
                            </div>
                        )}

                        {request.status === 'Pending' && (
                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => handleApprove(request.id)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg active:scale-95"
                                >
                                    <CheckCircle size={20} />
                                    Approve Request
                                </button>
                                <button
                                    onClick={() => handleReject(request.id)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-red-500 text-red-600 py-3 rounded-xl font-bold text-lg hover:bg-red-50 transition-all active:scale-95"
                                >
                                    <XCircle size={20} />
                                    Reject
                                </button>
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

export default BranchFundRequests;
