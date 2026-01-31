import React, { useState } from 'react';
import { Plus, Calendar, DollarSign, FileText, Upload, Tag, CheckCircle2 } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

const ExpenseEntry = () => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: 'Utilities',
        subcategory: '',
        vendor: '',
        description: '',
        paymentMethod: 'Cash',
        accountFrom: 'Cash on Hand',
        receipt: null
    });

    const categories = {
        'Utilities': ['Electricity (Meralco)', 'Water Bill', 'Internet', 'Gas', 'Phone'],
        'Salaries & Stipends': ['Pastor Salary', 'Staff Salaries', 'Allowances', 'Bonuses'],
        'Building Maintenance': ['Repairs', 'Cleaning', 'Supplies', 'Equipment'],
        'Ministry Supplies': ['Office Supplies', 'Event Materials', 'Literature', 'Sound System'],
        'Transportation': ['Fuel', 'Vehicle Maintenance', 'Public Transport'],
        'Others': ['Miscellaneous', 'Emergency']
    };

    // Sample recent expenses
    const recentExpenses = [
        { id: 1, date: '2026-01-31', vendor: 'Meralco', amount: 11230, category: 'Utilities', status: 'Pending' },
        { id: 2, date: '2026-01-30', vendor: 'Office Depot', amount: 5450, category: 'Office Supplies', status: 'Approved' },
        { id: 3, date: '2026-01-30', vendor: 'Manila Water', amount: 2980, category: 'Utilities', status: 'Approved' },
        { id: 4, date: '2026-01-29', vendor: 'Shell Gas Station', amount: 2500, category: 'Transportation', status: 'Pending' },
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Submitting expense:', formData);
        // Reset form
        setFormData({
            date: new Date().toISOString().split('T')[0],
            amount: '',
            category: 'Utilities',
            subcategory: '',
            vendor: '',
            description: '',
            paymentMethod: 'Cash',
            accountFrom: 'Cash on Hand',
            receipt: null
        });
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            
            <div className="flex flex-col flex-1">
                <Header />
                
                <div className="flex-1 bg-gradient-to-br from-gray-50 to-orange-50 p-10 overflow-y-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">New Expense Entry</h1>
                <p className="text-gray-500">Record church expenses for approval and tracking</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Entry Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-orange-100 p-3 rounded-xl">
                                <Plus className="text-orange-700" size={24} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">Expense Details</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Date */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        <Calendar className="inline mr-2" size={16} />
                                        Date
                                    </label>
                                    <input 
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                                        required
                                    />
                                </div>

                                {/* Amount */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        <DollarSign className="inline mr-2" size={16} />
                                        Amount (₱)
                                    </label>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                        placeholder="0.00"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors text-2xl font-bold"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Category & Subcategory */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        <Tag className="inline mr-2" size={16} />
                                        Category
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value, subcategory: ''})}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                                        required
                                    >
                                        {Object.keys(categories).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Subcategory
                                    </label>
                                    <select
                                        value={formData.subcategory}
                                        onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                                        required
                                    >
                                        <option value="">Select subcategory...</option>
                                        {categories[formData.category]?.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Vendor/Payee */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Vendor / Payee
                                </label>
                                <input 
                                    type="text"
                                    value={formData.vendor}
                                    onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                                    placeholder="Who received the payment?"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <FileText className="inline mr-2" size={16} />
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    placeholder="Brief description of the expense..."
                                    rows="3"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors resize-none"
                                    required
                                />
                            </div>

                            {/* Payment Method & Account */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Payment Method
                                    </label>
                                    <select
                                        value={formData.paymentMethod}
                                        onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="Check">Check</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="GCash">GCash</option>
                                        <option value="Credit Card">Credit Card</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Account From
                                    </label>
                                    <select
                                        value={formData.accountFrom}
                                        onChange={(e) => setFormData({...formData, accountFrom: e.target.value})}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                                    >
                                        <option value="Cash on Hand">Cash on Hand</option>
                                        <option value="BDO Checking Account">BDO Checking Account</option>
                                        <option value="BPI Savings Account">BPI Savings Account</option>
                                        <option value="Petty Cash Fund">Petty Cash Fund</option>
                                    </select>
                                </div>
                            </div>

                            {/* Receipt Upload */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <Upload className="inline mr-2" size={16} />
                                    Attach Receipt / Invoice
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-orange-500 transition-colors cursor-pointer">
                                    <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                                    <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF up to 10MB</p>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 rounded-xl font-bold text-lg hover:from-orange-700 hover:to-red-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={20} />
                                Submit for Approval
                            </button>
                        </form>
                    </div>
                </div>

                {/* Recent Expenses */}
                <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-2xl shadow-lg text-white">
                        <p className="text-orange-100 text-xs font-semibold uppercase mb-2">Pending Approval</p>
                        <p className="text-4xl font-black mb-1">
                            {recentExpenses.filter(e => e.status === 'Pending').length}
                        </p>
                        <p className="text-sm opacity-90">expenses awaiting review</p>
                    </div>

                    {/* Recent Entries */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Expenses</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {recentExpenses.map(expense => (
                                <div key={expense.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                    <div>
                                        <p className="font-bold text-gray-800">{expense.vendor}</p>
                                        <p className="text-xs text-gray-500">{expense.category}</p>
                                        <p className="text-xs text-gray-400 mt-1">{expense.date}</p>
                                        <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-bold ${
                                            expense.status === 'Approved' 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {expense.status}
                                        </span>
                                    </div>
                                    <p className="font-bold text-red-600">-₱{expense.amount.toLocaleString()}</p>
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

export default ExpenseEntry;
