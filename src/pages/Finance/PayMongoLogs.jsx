import React, { useState } from 'react';
import { Download, Filter, Search, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

const PayMongoLogs = () => {
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Sample PayMongo transaction data
    const transactions = [
        {
            id: 1,
            date: '2026-01-31',
            time: '15:45:22',
            transactionId: 'PM-2026-001',
            donor: 'Juan Dela Cruz',
            email: 'juan.delacruz@email.com',
            amount: 15000,
            fee: 450,
            netAmount: 14550,
            paymentMethod: 'GCash',
            status: 'Success',
            reference: 'GCASH-789456123'
        },
        {
            id: 2,
            date: '2026-01-30',
            time: '18:20:15',
            transactionId: 'PM-2026-002',
            donor: 'Maria Santos',
            email: 'maria.santos@email.com',
            amount: 5000,
            fee: 150,
            netAmount: 4850,
            paymentMethod: 'Credit Card',
            status: 'Success',
            reference: 'CC-456789012'
        },
        {
            id: 3,
            date: '2026-01-30',
            time: '14:10:30',
            transactionId: 'PM-2026-003',
            donor: 'Pedro Reyes',
            email: 'pedro.reyes@email.com',
            amount: 3000,
            fee: 90,
            netAmount: 2910,
            paymentMethod: 'Maya',
            status: 'Pending',
            reference: 'MAYA-123456789'
        },
        {
            id: 4,
            date: '2026-01-29',
            time: '11:35:45',
            transactionId: 'PM-2026-004',
            donor: 'Ana Garcia',
            email: 'ana.garcia@email.com',
            amount: 25000,
            fee: 750,
            netAmount: 24250,
            paymentMethod: 'GCash',
            status: 'Success',
            reference: 'GCASH-987654321'
        },
        {
            id: 5,
            date: '2026-01-28',
            time: '16:50:00',
            transactionId: 'PM-2026-005',
            donor: 'Carlos Mendoza',
            email: 'carlos.mendoza@email.com',
            amount: 10000,
            fee: 300,
            netAmount: 9700,
            paymentMethod: 'Credit Card',
            status: 'Success',
            reference: 'CC-111222333'
        },
        {
            id: 6,
            date: '2026-01-27',
            time: '09:15:20',
            transactionId: 'PM-2026-006',
            donor: 'Rosa Cruz',
            email: 'rosa.cruz@email.com',
            amount: 2000,
            fee: 60,
            netAmount: 1940,
            paymentMethod: 'Maya',
            status: 'Failed',
            reference: 'MAYA-444555666'
        },
        {
            id: 7,
            date: '2026-01-26',
            time: '13:40:10',
            transactionId: 'PM-2026-007',
            donor: 'Anonymous',
            email: 'anonymous@donor.com',
            amount: 50000,
            fee: 1500,
            netAmount: 48500,
            paymentMethod: 'Credit Card',
            status: 'Success',
            reference: 'CC-777888999'
        },
    ];

    const filteredTransactions = transactions.filter(t => {
        const matchesStatus = filter === 'all' || t.status.toLowerCase() === filter;
        const matchesSearch = searchTerm === '' || 
            t.donor.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const totalAmount = transactions.filter(t => t.status === 'Success').reduce((sum, t) => sum + t.amount, 0);
    const totalFees = transactions.filter(t => t.status === 'Success').reduce((sum, t) => sum + t.fee, 0);
    const netTotal = transactions.filter(t => t.status === 'Success').reduce((sum, t) => sum + t.netAmount, 0);

    const getStatusBadge = (status) => {
        switch(status) {
            case 'Success':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        <CheckCircle size={14} />
                        Success
                    </span>
                );
            case 'Pending':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                        <Clock size={14} />
                        Pending
                    </span>
                );
            case 'Failed':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                        <XCircle size={14} />
                        Failed
                    </span>
                );
            default:
                return null;
        }
    };

    const getPaymentMethodColor = (method) => {
        switch(method) {
            case 'GCash':
                return 'bg-blue-100 text-blue-700';
            case 'Maya':
                return 'bg-green-100 text-green-700';
            case 'Credit Card':
                return 'bg-purple-100 text-purple-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            
            <div className="flex flex-col flex-1">
                <Header />
                
                <div className="flex-1 bg-gradient-to-br from-gray-50 to-slate-50 p-10 overflow-y-auto">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">PayMongo Transaction Logs</h1>
                    <p className="text-gray-500">Online payment records and transaction history</p>
                </div>
                <button className="flex items-center gap-2 bg-slate-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg">
                    <Download size={18} />
                    Export Report
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-6 rounded-2xl shadow-lg text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <CreditCard size={24} />
                        <p className="text-xs font-semibold uppercase opacity-90">Total Collected</p>
                    </div>
                    <p className="text-3xl font-black">₱{totalAmount.toLocaleString()}</p>
                    <p className="text-xs opacity-80 mt-2">{transactions.filter(t => t.status === 'Success').length} successful transactions</p>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-700 p-6 rounded-2xl shadow-lg text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <XCircle size={24} />
                        <p className="text-xs font-semibold uppercase opacity-90">Total Fees</p>
                    </div>
                    <p className="text-3xl font-black">₱{totalFees.toLocaleString()}</p>
                    <p className="text-xs opacity-80 mt-2">PayMongo processing fees</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-700 p-6 rounded-2xl shadow-lg text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircle size={24} />
                        <p className="text-xs font-semibold uppercase opacity-90">Net Amount</p>
                    </div>
                    <p className="text-3xl font-black">₱{netTotal.toLocaleString()}</p>
                    <p className="text-xs opacity-80 mt-2">After fees deducted</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Search size={20} className="text-gray-500" />
                            <span className="font-bold text-gray-700">Search:</span>
                        </div>
                        <input
                            type="text"
                            placeholder="Search by donor name, email, or transaction ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Filter size={20} className="text-gray-500" />
                            <span className="font-bold text-gray-700">Filter by Status:</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                    filter === 'all' ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('success')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                    filter === 'success' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Success
                            </button>
                            <button
                                onClick={() => setFilter('pending')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                    filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Pending
                            </button>
                            <button
                                onClick={() => setFilter('failed')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                    filter === 'failed' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Failed
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b-2 border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Transaction ID</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date & Time</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Donor</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Method</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Fee</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Net Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTransactions.map(transaction => (
                                <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-mono text-sm font-bold text-slate-700">{transaction.transactionId}</p>
                                        <p className="text-xs text-gray-500">{transaction.reference}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-semibold text-gray-900">{transaction.date}</p>
                                        <p className="text-xs text-gray-500">{transaction.time}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-semibold text-gray-900">{transaction.donor}</p>
                                        <p className="text-xs text-gray-500">{transaction.email}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPaymentMethodColor(transaction.paymentMethod)}`}>
                                            {transaction.paymentMethod}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="font-mono font-bold text-gray-900">₱{transaction.amount.toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="font-mono text-sm text-red-600">-₱{transaction.fee.toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="font-mono font-bold text-green-700">₱{transaction.netAmount.toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(transaction.status)}
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

export default PayMongoLogs;
