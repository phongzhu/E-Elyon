import React, { useState } from 'react';
import { CheckCircle, XCircle, Eye, Clock, AlertCircle } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

const ApprovalQueue = () => {
    const [filter, setFilter] = useState('pending');
    
    // Sample expense requests
    const [expenses, setExpenses] = useState([
        {
            id: 'EXP-2026-001',
            date: '2026-01-31',
            submittedBy: 'Finance Officer - Ana Santos',
            vendor: 'Meralco',
            category: 'Utilities',
            subcategory: 'Electricity',
            amount: 11230,
            description: 'Monthly electricity bill for January 2026',
            paymentMethod: 'Bank Transfer',
            accountFrom: 'BDO Checking Account',
            status: 'Pending',
            urgency: 'High',
            dueDate: '2026-02-05',
            attachments: ['meralco_jan2026.pdf']
        },
        {
            id: 'EXP-2026-002',
            date: '2026-01-30',
            submittedBy: 'Staff - Juan Reyes',
            vendor: 'Office Depot',
            category: 'Office Supplies',
            subcategory: 'Paper & Printing',
            amount: 5450,
            description: 'Office supplies for Q1 2026 - Paper, pens, folders',
            paymentMethod: 'Cash',
            accountFrom: 'Petty Cash Fund',
            status: 'Pending',
            urgency: 'Medium',
            dueDate: '2026-02-10',
            attachments: ['receipt_office_depot.jpg']
        },
        {
            id: 'EXP-2026-003',
            date: '2026-01-30',
            submittedBy: 'Finance Officer - Ana Santos',
            vendor: 'Manila Water',
            category: 'Utilities',
            subcategory: 'Water',
            amount: 2980,
            description: 'Monthly water bill for January 2026',
            paymentMethod: 'Bank Transfer',
            accountFrom: 'BDO Checking Account',
            status: 'Pending',
            urgency: 'High',
            dueDate: '2026-02-08',
            attachments: ['water_jan2026.pdf']
        },
        {
            id: 'EXP-2026-004',
            date: '2026-01-29',
            submittedBy: 'Maintenance - Pedro Cruz',
            vendor: 'ABC Hardware',
            category: 'Building Maintenance',
            subcategory: 'Repairs',
            amount: 8750,
            description: 'Repair materials for church bathroom - tiles, cement, fixtures',
            paymentMethod: 'Cash',
            accountFrom: 'Building Fund',
            status: 'Pending',
            urgency: 'Medium',
            dueDate: '2026-02-15',
            attachments: ['hardware_receipt.jpg', 'bathroom_photo.jpg']
        },
        {
            id: 'EXP-2026-005',
            date: '2026-01-28',
            submittedBy: 'Pastor Maria Santos',
            vendor: 'Shell Gas Station',
            category: 'Transportation',
            subcategory: 'Fuel',
            amount: 2500,
            description: 'Fuel for church van - pastoral visit to branch church',
            paymentMethod: 'Cash',
            accountFrom: 'Transportation Fund',
            status: 'Approved',
            urgency: 'Low',
            dueDate: '-',
            approvedBy: 'Bishop Carlos Mendoza',
            approvedDate: '2026-01-29',
            attachments: ['fuel_receipt.jpg']
        },
        {
            id: 'EXP-2026-006',
            date: '2026-01-27',
            submittedBy: 'Finance Officer - Ana Santos',
            vendor: 'Sound System Repairs Inc.',
            category: 'Ministry Supplies',
            subcategory: 'Sound System',
            amount: 15000,
            description: 'Repair and maintenance of church sound system',
            paymentMethod: 'Check',
            accountFrom: 'BDO Checking Account',
            status: 'Rejected',
            urgency: 'Medium',
            dueDate: '-',
            rejectedBy: 'Bishop Carlos Mendoza',
            rejectedDate: '2026-01-28',
            rejectionReason: 'Need additional quotations. Please get at least 2 more quotes.',
            attachments: ['sound_repair_quote.pdf']
        },
    ]);

    const filteredExpenses = expenses.filter(exp => {
        if (filter === 'all') return true;
        return exp.status.toLowerCase() === filter;
    });

    const pendingCount = expenses.filter(e => e.status === 'Pending').length;
    const approvedCount = expenses.filter(e => e.status === 'Approved').length;
    const rejectedCount = expenses.filter(e => e.status === 'Rejected').length;

    const handleApprove = (expenseId) => {
        setExpenses(expenses.map(exp => 
            exp.id === expenseId 
            ? { ...exp, status: 'Approved', approvedBy: 'Bishop Carlos Mendoza', approvedDate: new Date().toISOString().split('T')[0] }
            : exp
        ));
    };

    const handleReject = (expenseId) => {
        const reason = prompt('Please provide a reason for rejection:');
        if (reason) {
            setExpenses(expenses.map(exp => 
                exp.id === expenseId 
                ? { ...exp, status: 'Rejected', rejectedBy: 'Bishop Carlos Mendoza', rejectedDate: new Date().toISOString().split('T')[0], rejectionReason: reason }
                : exp
            ));
        }
    };

    const getUrgencyBadge = (urgency) => {
        switch(urgency) {
            case 'High':
                return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">High Priority</span>;
            case 'Medium':
                return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">Medium</span>;
            case 'Low':
                return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">Low</span>;
            default:
                return urgency;
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
                
                <div className="flex-1 bg-gradient-to-br from-gray-50 to-red-50 p-10 overflow-y-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Expense Approval Queue</h1>
                <p className="text-gray-500">Review and approve/reject expense requests from staff</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-6 rounded-2xl shadow-lg text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock size={24} />
                        <p className="text-yellow-100 text-xs font-semibold uppercase">Pending Approval</p>
                    </div>
                    <p className="text-4xl font-black">{pendingCount}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="text-green-600" size={24} />
                        <p className="text-xs font-semibold text-gray-500 uppercase">Approved</p>
                    </div>
                    <p className="text-4xl font-black text-green-700">{approvedCount}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                        <XCircle className="text-red-600" size={24} />
                        <p className="text-xs font-semibold text-gray-500 uppercase">Rejected</p>
                    </div>
                    <p className="text-4xl font-black text-red-700">{rejectedCount}</p>
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
                        Approved ({approvedCount})
                    </button>
                    <button
                        onClick={() => setFilter('rejected')}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            filter === 'rejected' 
                            ? 'bg-red-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Rejected ({rejectedCount})
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

            {/* Expense Request Cards */}
            <div className="space-y-6">
                {filteredExpenses.map(expense => (
                    <div key={expense.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-2xl font-black text-gray-900">{expense.id}</h3>
                                    {getStatusBadge(expense.status)}
                                    {expense.status === 'Pending' && getUrgencyBadge(expense.urgency)}
                                </div>
                                <p className="text-sm text-gray-500">Submitted by <span className="font-bold">{expense.submittedBy}</span> on {expense.date}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-black text-red-600">₱{expense.amount.toLocaleString()}</p>
                                {expense.status === 'Pending' && expense.dueDate !== '-' && (
                                    <p className="text-sm text-red-600 font-bold mt-1 flex items-center gap-1 justify-end">
                                        <AlertCircle size={14} /> Due: {expense.dueDate}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Vendor/Payee</p>
                                <p className="font-bold text-gray-900">{expense.vendor}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Category</p>
                                <p className="font-bold text-gray-900">{expense.category}</p>
                                <p className="text-xs text-gray-500">{expense.subcategory}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Payment Method</p>
                                <p className="font-bold text-gray-900">{expense.paymentMethod}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Account From</p>
                                <p className="font-bold text-gray-900">{expense.accountFrom}</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Description</p>
                            <p className="text-gray-700">{expense.description}</p>
                        </div>

                        {expense.attachments && expense.attachments.length > 0 && (
                            <div className="mb-6">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Attachments</p>
                                <div className="flex gap-2">
                                    {expense.attachments.map((file, idx) => (
                                        <button key={idx} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors">
                                            <Eye size={14} />
                                            {file}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {expense.status === 'Approved' && (
                            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                <p className="text-sm font-bold text-green-800">
                                    ✓ Approved by {expense.approvedBy} on {expense.approvedDate}
                                </p>
                            </div>
                        )}

                        {expense.status === 'Rejected' && (
                            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                                <p className="text-sm font-bold text-red-800 mb-1">
                                    ✗ Rejected by {expense.rejectedBy} on {expense.rejectedDate}
                                </p>
                                <p className="text-sm text-red-700">Reason: {expense.rejectionReason}</p>
                            </div>
                        )}

                        {expense.status === 'Pending' && (
                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => handleApprove(expense.id)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg active:scale-95"
                                >
                                    <CheckCircle size={20} />
                                    Approve Expense
                                </button>
                                <button
                                    onClick={() => handleReject(expense.id)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-red-500 text-red-600 py-3 rounded-xl font-bold text-lg hover:bg-red-50 transition-all active:scale-95"
                                >
                                    <XCircle size={20} />
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {filteredExpenses.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-16 text-center">
                        <AlertCircle className="mx-auto text-gray-300 mb-4" size={64} />
                        <p className="text-xl font-bold text-gray-400">No expenses found with this filter</p>
                    </div>
                )}
            </div>
        </div>
            </div>
        </div>
    );
};

export default ApprovalQueue;
