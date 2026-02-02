import React, { useState } from 'react';
import { Send, FileText, DollarSign, Calendar, User, Building2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

const RequestFund = () => {
    const [formData, setFormData] = useState({
        requestor: '',
        branch: '',
        amount: '',
        purpose: '',
        category: '',
        dateNeeded: '',
        justification: '',
        attachments: null
    });

    const [requests, setRequests] = useState([
        {
            id: 1,
            requestor: 'Pastor Juan Dela Cruz',
            branch: 'Manila Branch',
            amount: 50000,
            purpose: 'Youth Camp Activities',
            category: 'Ministry',
            dateRequested: '2026-01-28',
            dateNeeded: '2026-02-15',
            status: 'Pending',
            priority: 'Medium'
        },
        {
            id: 2,
            requestor: 'Sister Maria Santos',
            branch: 'Quezon City Branch',
            amount: 25000,
            purpose: 'Sound System Repair',
            category: 'Maintenance',
            dateRequested: '2026-01-29',
            dateNeeded: '2026-02-05',
            status: 'Approved',
            priority: 'High'
        },
        {
            id: 3,
            requestor: 'Deacon Pedro Reyes',
            branch: 'Makati Branch',
            amount: 15000,
            purpose: 'Bible Study Materials',
            category: 'Education',
            dateRequested: '2026-01-30',
            dateNeeded: '2026-02-20',
            status: 'Under Review',
            priority: 'Low'
        },
    ]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, attachments: e.target.files });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newRequest = {
            id: requests.length + 1,
            requestor: formData.requestor,
            branch: formData.branch,
            amount: parseFloat(formData.amount),
            purpose: formData.purpose,
            category: formData.category,
            dateRequested: new Date().toISOString().split('T')[0],
            dateNeeded: formData.dateNeeded,
            status: 'Pending',
            priority: 'Medium'
        };
        setRequests([newRequest, ...requests]);
        setFormData({
            requestor: '',
            branch: '',
            amount: '',
            purpose: '',
            category: '',
            dateNeeded: '',
            justification: '',
            attachments: null
        });
        alert('Fund request submitted successfully!');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved':
                return 'bg-green-100 text-green-700 border-green-300';
            case 'Pending':
                return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            case 'Under Review':
                return 'bg-blue-100 text-blue-700 border-blue-300';
            case 'Rejected':
                return 'bg-red-100 text-red-700 border-red-300';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-300';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Approved':
                return <CheckCircle size={16} />;
            case 'Pending':
                return <Clock size={16} />;
            case 'Under Review':
                return <AlertCircle size={16} />;
            default:
                return <AlertCircle size={16} />;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High':
                return 'text-red-600';
            case 'Medium':
                return 'text-orange-600';
            case 'Low':
                return 'text-blue-600';
            default:
                return 'text-gray-600';
        }
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
            <Sidebar />
            
            <div className="flex flex-col flex-1">
                <Header />
                
                <div className="flex-1 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-10 overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Fund Request</h1>
                <p className="text-gray-500">Submit and manage fund requests for church activities</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Request Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Send className="text-blue-600" size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">New Request</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <User size={16} className="inline mr-1" />
                                    Requestor Name
                                </label>
                                <input
                                    type="text"
                                    name="requestor"
                                    value={formData.requestor}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <Building2 size={16} className="inline mr-1" />
                                    Branch
                                </label>
                                <select
                                    name="branch"
                                    value={formData.branch}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value="">Select Branch</option>
                                    <option value="Manila Branch">Manila Branch</option>
                                    <option value="Quezon City Branch">Quezon City Branch</option>
                                    <option value="Makati Branch">Makati Branch</option>
                                    <option value="Pasig Branch">Pasig Branch</option>
                                    <option value="Caloocan Branch">Caloocan Branch</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <DollarSign size={16} className="inline mr-1" />
                                    Amount Requested (₱)
                                </label>
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Category
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value="">Select Category</option>
                                    <option value="Ministry">Ministry</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Education">Education</option>
                                    <option value="Events">Events</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Purpose
                                </label>
                                <input
                                    type="text"
                                    name="purpose"
                                    value={formData.purpose}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    placeholder="Brief description"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <Calendar size={16} className="inline mr-1" />
                                    Date Needed
                                </label>
                                <input
                                    type="date"
                                    name="dateNeeded"
                                    value={formData.dateNeeded}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Justification
                                </label>
                                <textarea
                                    name="justification"
                                    value={formData.justification}
                                    onChange={handleInputChange}
                                    rows="4"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    placeholder="Explain why this fund is needed..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <FileText size={16} className="inline mr-1" />
                                    Supporting Documents
                                </label>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    multiple
                                />
                                <p className="text-xs text-gray-500 mt-1">Upload quotations, receipts, or other supporting documents</p>
                            </div>

                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                            >
                                <Send size={18} />
                                Submit Request
                            </button>
                        </form>
                    </div>
                </div>

                {/* Requests List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Requests</h2>
                        
                        <div className="space-y-4">
                            {requests.map((request) => (
                                <div
                                    key={request.id}
                                    className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg">{request.purpose}</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {request.requestor} • {request.branch}
                                            </p>
                                        </div>
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-sm ${getStatusColor(request.status)}`}>
                                            {getStatusIcon(request.status)}
                                            {request.status}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                        <div>
                                            <p className="text-xs text-gray-500 font-semibold">Amount</p>
                                            <p className="text-lg font-black text-gray-900">₱{request.amount.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-semibold">Category</p>
                                            <p className="text-sm font-bold text-gray-700">{request.category}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-semibold">Date Needed</p>
                                            <p className="text-sm font-bold text-gray-700">{request.dateNeeded}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-semibold">Priority</p>
                                            <p className={`text-sm font-bold ${getPriorityColor(request.priority)}`}>{request.priority}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        {request.status === 'Pending' && (
                                            <>
                                                <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-all">
                                                    Approve
                                                </button>
                                                <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-all">
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all">
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
            </div>
        </div>
    );
};

export default RequestFund;
