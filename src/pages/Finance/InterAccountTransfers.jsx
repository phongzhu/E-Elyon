import React, { useState } from 'react';
import { Send, CheckCircle2, Calendar, DollarSign, FileText, Building2 } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

const TransferRevolvingFunds = () => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        sourceAccount: '',
        amountPerBranch: '',
        reference: '',
        purpose: '',
        notes: ''
    });

    const [selectedBranches, setSelectedBranches] = useState([]);

    const accounts = [
        { id: 1, name: 'Main Church Account', balance: 2456789.50 },
        { id: 2, name: 'BDO Checking Account', balance: 856789.25 },
        { id: 3, name: 'BPI Savings Account', balance: 600000.00 },
        { id: 4, name: 'Mission Fund', balance: 450000.00 },
    ];

    const branches = [
        { id: 1, name: 'Manila Branch', location: 'Manila' },
        { id: 2, name: 'Quezon City Branch', location: 'Quezon City' },
        { id: 3, name: 'Makati Branch', location: 'Makati' },
        { id: 4, name: 'Pasig Branch', location: 'Pasig' },
        { id: 5, name: 'Caloocan Branch', location: 'Caloocan' },
        { id: 6, name: 'Taguig Branch', location: 'Taguig' },
        { id: 7, name: 'Paranaque Branch', location: 'Paranaque' },
        { id: 8, name: 'Las Pinas Branch', location: 'Las Pinas' },
    ];

    const toggleBranch = (branchId) => {
        if (selectedBranches.includes(branchId)) {
            setSelectedBranches(selectedBranches.filter(id => id !== branchId));
        } else {
            setSelectedBranches([...selectedBranches, branchId]);
        }
    };

    const selectAllBranches = () => {
        setSelectedBranches(branches.map(b => b.id));
    };

    const clearAllBranches = () => {
        setSelectedBranches([]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const totalAmount = parseFloat(formData.amountPerBranch) * selectedBranches.length;
        const selectedBranchNames = branches.filter(b => selectedBranches.includes(b.id)).map(b => b.name).join(', ');
        
        console.log('Transfer submitted:', {
            ...formData,
            branches: selectedBranchNames,
            totalAmount
        });
        
        alert(`Revolving funds transfer of ₱${totalAmount.toLocaleString()} distributed successfully to ${selectedBranches.length} branches!`);
        
        setFormData({
            date: new Date().toISOString().split('T')[0],
            sourceAccount: '',
            amountPerBranch: '',
            reference: '',
            purpose: '',
            notes: ''
        });
        setSelectedBranches([]);
    };

    const sourceBalance = accounts.find(a => a.name === formData.sourceAccount)?.balance || 0;
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        <Calendar className="inline mr-2" size={16} />
                                        Transfer Date
                                    </label>
                                    <input 
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-colors"
                                        required
                                    />
                                </div>

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
                                            <option key={acc.id} value={acc.name}>
                                                {acc.name} (₱{acc.balance.toLocaleString()})
                                            </option>
                                        ))}
                                    </select>
                                    {formData.sourceAccount && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Available: ₱{sourceBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                        </p>
                                    )}
                                </div>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Reference Number</label>
                                    <input 
                                        type="text"
                                        value={formData.reference}
                                        onChange={(e) => setFormData({...formData, reference: e.target.value})}
                                        placeholder="RVF-XXX"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-colors"
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
                                        <option value="Ministry Operations">Ministry Operations</option>
                                        <option value="Branch Support">Branch Support</option>
                                        <option value="Event Funding">Event Funding</option>
                                        <option value="Outreach Program">Outreach Program</option>
                                        <option value="Emergency Fund">Emergency Fund</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
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
                                        const isSelected = selectedBranches.includes(branch.id);
                                        return (
                                            <button
                                                key={branch.id}
                                                type="button"
                                                onClick={() => toggleBranch(branch.id)}
                                                className={`p-4 rounded-xl font-bold text-sm transition-all ${
                                                    isSelected
                                                    ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                <div className="text-center">
                                                    <p className="mb-1">{branch.name}</p>
                                                    <p className="text-xs opacity-75">{branch.location}</p>
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
                                disabled={!canTransfer || selectedBranches.length === 0}
                                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-4 rounded-xl font-bold text-lg hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckCircle2 size={20} />
                                Distribute Funds to {selectedBranches.length} Branch{selectedBranches.length !== 1 ? 'es' : ''}
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
        </div>
            </div>
        </div>
    );
};

export default TransferRevolvingFunds;
