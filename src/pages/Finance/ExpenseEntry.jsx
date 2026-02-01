import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, FileText, Tag, CheckCircle2, TrendingDown, X, Trash2 } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';

const ExpenseEntry = () => {
    // Helper function to get current Philippine time (UTC+8)
    const getPhilippineTime = () => {
        const now = new Date();
        now.setHours(now.getHours() + 8);
        return now;
    };

    const [formData, setFormData] = useState({
        accountId: '',
        categoryId: '',
        billingPeriod: '',
        receiptNumber: '',
        receiptFile: null,
        notes: '',
        receiverUserId: '',
        requiresApproval: false,
        items: [{ item_name: '', quantity: 1, unit_price: '' }]
    });

    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filteredCategories, setFilteredCategories] = useState([]);
    const [categorySearch, setCategorySearch] = useState('');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [receiverSearch, setReceiverSearch] = useState('');
    const [showReceiverDropdown, setShowReceiverDropdown] = useState(false);
    const [recentExpenses, setRecentExpenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [totalToday, setTotalToday] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('success');
    const [userBranchId, setUserBranchId] = useState(null);

    const showNotification = (message, type = 'success') => {
        setModalMessage(message);
        setModalType(type);
        setShowModal(true);
    };

    useEffect(() => {
        fetchUserBranch();
        fetchCategories();
    }, []);

    useEffect(() => {
        if (userBranchId !== null) {
            fetchAccounts();
            fetchUsers();
            fetchRecentExpenses();
        }
    }, [userBranchId]);

    useEffect(() => {
        // Re-fetch users when category changes (for stipends filtering)
        if (userBranchId !== null) {
            fetchUsers();
        }
    }, [formData.categoryId]);

    useEffect(() => {
        // Filter categories based on search
        if (categorySearch.trim() === '') {
            setFilteredCategories(categories);
        } else {
            const filtered = categories.filter(cat =>
                cat.category_name.toLowerCase().includes(categorySearch.toLowerCase())
            );
            setFilteredCategories(filtered);
        }
    }, [categorySearch, categories]);

    useEffect(() => {
        // Filter users based on search (limit to 15)
        if (receiverSearch.trim() === '') {
            setFilteredUsers(users.slice(0, 15));
        } else {
            const filtered = users.filter(user => {
                const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
                return fullName.includes(receiverSearch.toLowerCase()) || 
                       user.role.toLowerCase().includes(receiverSearch.toLowerCase());
            }).slice(0, 15);
            setFilteredUsers(filtered);
        }
    }, [receiverSearch, users]);

    const fetchUserBranch = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user record with user_details_id
            const { data: userRecord } = await supabase
                .from('users')
                .select('user_details_id')
                .eq('auth_user_id', user.id)
                .limit(1)
                .single();

            if (!userRecord?.user_details_id) {
                console.warn('No user_details_id found');
                return;
            }

            // Get branch_id from users_details
            const { data: userDetails } = await supabase
                .from('users_details')
                .select('branch_id')
                .eq('user_details_id', userRecord.user_details_id)
                .single();

            if (userDetails?.branch_id) {
                setUserBranchId(userDetails.branch_id);
            }
        } catch (error) {
            console.error('Error fetching user branch:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            // Check if stipends category is selected (category_id = 31)
            const isStipendsCategory = formData.categoryId === 31;
            
            let query = supabase
                .from('users')
                .select(`
                    user_id,
                    role,
                    user_details:users_details!user_details_id (
                        first_name,
                        last_name,
                        branch_id
                    )
                `)
                .eq('is_active', true);
            
            // If stipends category, filter by branch_id
            if (isStipendsCategory && userBranchId) {
                query = query.eq('user_details.branch_id', userBranchId);
            }
            
            const { data, error } = await query.order('role');
            
            if (error) {
                console.error('Error fetching users:', error);
                setUsers([]);
            } else {
                // Flatten the data structure
                const formattedUsers = (data || []).map(user => ({
                    user_id: user.user_id,
                    first_name: user.user_details?.first_name || '',
                    last_name: user.user_details?.last_name || '',
                    role: user.role
                }));
                setUsers(formattedUsers);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
        }
    };

    const fetchAccounts = async () => {
        try {
            const { data, error } = await supabase
                .from('finance_accounts')
                .select('account_id, account_name, account_type, balance')
                .eq('is_active', true)
                .eq('branch_id', userBranchId)
                .order('account_name');
            
            if (error) throw error;
            setAccounts(data || []);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('expense_categories')
                .select('category_id, category_name')
                .order('category_name');
            
            if (error) throw error;
            setCategories(data || []);
            setFilteredCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleCategorySelect = (category) => {
        setFormData({ ...formData, categoryId: category.category_id });
        setCategorySearch(category.category_name);
        setShowCategoryDropdown(false);
    };

    const handleReceiverSelect = (userId, firstName, lastName) => {
        setFormData({...formData, receiverUserId: userId});
        setReceiverSearch(`${firstName} ${lastName}`);
        setShowReceiverDropdown(false);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            showNotification('Please upload only images (JPEG, PNG, GIF) or PDF files', 'error');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('File size must be less than 5MB', 'error');
            return;
        }

        setFormData({...formData, receiptFile: file});
    };

    const fetchRecentExpenses = async () => {
        try {
            const phTime = getPhilippineTime();
            const today = phTime.toISOString().split('T')[0];
            const startOfDay = `${today}T00:00:00`;
            const endOfDay = `${today}T23:59:59.999`;

            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    transaction_id,
                    amount,
                    transaction_date,
                    branch_id,
                    finance_accounts(account_name),
                    expenses!expense_id(
                        expense_id,
                        notes,
                        receipt_number,
                        expense_categories(category_name)
                    )
                `)
                .eq('transaction_type', 'Expense')
                .gte('transaction_date', startOfDay)
                .lte('transaction_date', endOfDay)
                .order('transaction_date', { ascending: false });
            
            if (error) throw error;

            // Filter by user's branch_id
            const filteredData = data.filter(tx => {
                // If user has no branch, show all
                if (!userBranchId) return true;
                // If transaction has no branch, skip it
                if (!tx.branch_id) return false;
                // Show only matching branch
                return tx.branch_id === userBranchId;
            });

            const expenses = filteredData.map(tx => {
                const expense = Array.isArray(tx.expenses) ? tx.expenses[0] : tx.expenses;
                return {
                    id: tx.transaction_id,
                    vendor: expense?.notes?.split('|')[0] || 'N/A',
                    category: expense?.expense_categories?.category_name || 'N/A',
                    amount: parseFloat(tx.amount || 0),
                    date: new Date(tx.transaction_date).toLocaleDateString('en-PH'),
                    time: new Date(tx.transaction_date).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    }),
                    account: tx.finance_accounts?.account_name || 'N/A',
                    receipt: expense?.receipt_number
                };
            });

            setRecentExpenses(expenses);
            
            const todayTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
            setTotalToday(todayTotal);
            
        } catch (error) {
            console.error('Error fetching recent expenses:', error);
        }
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { item_name: '', quantity: 1, unit_price: '' }]
        });
    };

    const removeItem = (index) => {
        if (formData.items.length > 1) {
            const newItems = formData.items.filter((_, i) => i !== index);
            setFormData({ ...formData, items: newItems });
        }
    };

    const updateItem = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => {
            const quantity = parseFloat(item.quantity) || 0;
            const unitPrice = parseFloat(item.unit_price) || 0;
            return sum + (quantity * unitPrice);
        }, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data: userRecords, error: userError } = await supabase
                .from('users')
                .select('user_id')
                .eq('auth_user_id', user.id)
                .limit(1);

            if (userError) {
                console.error('User fetch error:', userError);
                throw new Error(`Failed to get user record: ${userError.message}`);
            }
            if (!userRecords || userRecords.length === 0) throw new Error('User record not found');
            
            const userRecord = userRecords[0];

            const totalAmount = calculateTotal();
            if (totalAmount <= 0) throw new Error('Total amount must be greater than 0');

            // Upload receipt file if provided
            let receiptFilePath = null;
            if (formData.receiptFile) {
                setUploading(true);
                const fileExt = formData.receiptFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('expense-receipts')
                    .upload(filePath, formData.receiptFile);

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    throw new Error('Failed to upload receipt file');
                }

                receiptFilePath = filePath;
                setUploading(false);
            }

            // Insert into expenses table (branch_id is now in transactions table)
            const { data: expense, error: expenseError } = await supabase
                .from('expenses')
                .insert({
                    category_id: formData.categoryId,
                    notes: formData.notes,
                    billing_period: formData.billingPeriod || null,
                    receipt_number: formData.receiptNumber || null,
                    receipt_file: receiptFilePath,
                    receiver_user_id: formData.receiverUserId || null,
                    requires_approval: formData.requiresApproval,
                    approved_by: formData.requiresApproval ? null : userRecord.user_id
                })
                .select()
                .single();

            if (expenseError) throw expenseError;

            // Insert expense items
            const itemsToInsert = formData.items.map(item => ({
                expense_id: expense.expense_id,
                item_name: item.item_name,
                quantity: parseInt(item.quantity),
                unit_price: parseFloat(item.unit_price),
                total_price: parseInt(item.quantity) * parseFloat(item.unit_price)
            }));

            const { error: itemsError } = await supabase
                .from('expense_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            // Determine transaction status based on approval requirement
            const transactionStatus = formData.requiresApproval ? 'Pending' : 'Completed';

            // Insert into transactions table with branch_id
            const { error: transactionError } = await supabase
                .from('transactions')
                .insert({
                    account_id: formData.accountId,
                    transaction_type: 'Expense',
                    expense_id: expense.expense_id,
                    amount: totalAmount,
                    status: transactionStatus,
                    notes: formData.notes || 'Expense entry',
                    created_by: userRecord.user_id,
                    branch_id: userBranchId,
                    transaction_date: getPhilippineTime().toISOString()
                });

            if (transactionError) throw transactionError;

            // Update account balance ONLY if approved (not pending)
            if (!formData.requiresApproval) {
                const { error: balanceError } = await supabase.rpc('update_account_balance', {
                    p_account_id: formData.accountId,
                    p_amount: totalAmount,
                    p_operation: 'subtract'
                });

                if (balanceError) throw balanceError;
            }

            const message = formData.requiresApproval 
                ? 'Expense submitted for approval!' 
                : 'Expense recorded successfully!';
            showNotification(message);
            
            // Reset form
            setFormData({
                accountId: formData.accountId,
                categoryId: '',
                billingPeriod: '',
                receiptNumber: '',
                receiptFile: null,
                notes: '',
                receiverUserId: '',
                requiresApproval: false,
                items: [{ item_name: '', quantity: 1, unit_price: '' }]
            });
            setCategorySearch('');
            setReceiverSearch('');
            setReceiverSearch('');

            fetchRecentExpenses();
            fetchAccounts();

        } catch (error) {
            console.error('Error recording expense:', error);
            showNotification('Error recording expense: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            
            <div className="flex flex-col flex-1">
                <Header />
                
                <div className="flex-1 bg-gradient-to-br from-gray-50 to-orange-50 p-10 overflow-y-auto">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Expense Entry</h1>
                        <p className="text-gray-500">Record church expenses and update accounts</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="bg-orange-100 p-3 rounded-xl">
                                        <Plus className="text-orange-700" size={24} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800">New Expense</h2>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Account <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.accountId}
                                            onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                                            required
                                        >
                                            <option value="">Select Account</option>
                                            {accounts.map(account => (
                                                <option key={account.account_id} value={account.account_id}>
                                                    {account.account_name} ({account.account_type}) - ₱{parseFloat(account.balance).toLocaleString()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            <Tag className="inline mr-2" size={16} />
                                            Category <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={categorySearch}
                                                onChange={(e) => {
                                                    setCategorySearch(e.target.value);
                                                    setShowCategoryDropdown(true);
                                                    setFormData({ ...formData, categoryId: '' });
                                                }}
                                                onFocus={() => setShowCategoryDropdown(true)}
                                                placeholder="Search category..."
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                                                required={!formData.categoryId}
                                            />
                                            {showCategoryDropdown && filteredCategories.length > 0 && (
                                                <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                                    {filteredCategories.map(category => (
                                                        <div
                                                            key={category.category_id}
                                                            onClick={() => handleCategorySelect(category)}
                                                            className="px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors"
                                                        >
                                                            <p className="font-medium text-gray-800">{category.category_name}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {formData.categoryId && (
                                            <p className="text-xs text-green-600 mt-1">✓ Category selected</p>
                                        )}
                                    </div>

                                    {/* Show receiver only when category is Stipends */}
                                    {categories.find(cat => cat.category_id === parseInt(formData.categoryId))?.category_name?.toLowerCase().includes('stipend') && (
                                        <div className="relative">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                Receiver (Required for Stipends) *
                                            </label>
                                            <input
                                                type="text"
                                                value={receiverSearch}
                                                onChange={(e) => {
                                                    setReceiverSearch(e.target.value);
                                                    setShowReceiverDropdown(true);
                                                }}
                                                onFocus={() => setShowReceiverDropdown(true)}
                                                placeholder="Search for receiver..."
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                                                required
                                            />
                                            {showReceiverDropdown && (
                                                <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                                    {filteredUsers.length > 0 ? (
                                                        filteredUsers.map(user => (
                                                            <div
                                                                key={user.user_id}
                                                                onClick={() => handleReceiverSelect(user.user_id, user.first_name, user.last_name)}
                                                                className="px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                                                            >
                                                                <div className="font-semibold text-gray-800">
                                                                    {user.first_name} {user.last_name}
                                                                </div>
                                                                <div className="text-sm text-gray-500">{user.role}</div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3 text-gray-500 text-center">
                                                            No users found
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-500 mt-1">Search and select the person receiving this stipend (max 15 results)</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                Billing Period (Optional)
                                            </label>
                                            <input 
                                                type="date"
                                                value={formData.billingPeriod}
                                                onChange={(e) => setFormData({...formData, billingPeriod: e.target.value})}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                Receipt Number (Optional)
                                            </label>
                                            <input 
                                                type="text"
                                                value={formData.receiptNumber}
                                                onChange={(e) => setFormData({...formData, receiptNumber: e.target.value})}
                                                placeholder="Receipt/Invoice number"
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Receipt Picture/PDF (Optional)
                                        </label>
                                        <input 
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/gif,application/pdf"
                                            onChange={handleFileChange}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                                        />
                                        {formData.receiptFile && (
                                            <p className="text-sm text-green-600 mt-2">
                                                ✓ {formData.receiptFile.name} ({(formData.receiptFile.size / 1024).toFixed(1)} KB)
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">Upload receipt image or PDF (max 5MB)</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            <FileText className="inline mr-2" size={16} />
                                            Notes (Optional)
                                        </label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                            placeholder="Additional notes or description..."
                                            rows="3"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors resize-none"
                                        />
                                    </div>

                                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.requiresApproval}
                                                onChange={(e) => setFormData({...formData, requiresApproval: e.target.checked})}
                                                className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                            />
                                            <div>
                                                <p className="font-bold text-gray-800">Requires Approval</p>
                                                <p className="text-xs text-gray-600">
                                                    {formData.requiresApproval 
                                                        ? 'This expense will be pending until approved (won\'t deduct from account yet)' 
                                                        : 'This expense will be auto-approved and immediately deducted from account'}
                                                </p>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Expense Items */}
                                    <div className="border-t pt-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-gray-800">Expense Items</h3>
                                            <button
                                                type="button"
                                                onClick={addItem}
                                                className="px-4 py-2 bg-orange-100 text-orange-700 rounded-xl font-bold text-sm hover:bg-orange-200 transition-all flex items-center gap-2"
                                            >
                                                <Plus size={16} />
                                                Add Item
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            {formData.items.map((item, index) => (
                                                <div key={index} className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className="text-sm font-bold text-gray-700">Item #{index + 1}</span>
                                                        {formData.items.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(index)}
                                                                className="text-red-600 hover:text-red-800"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        <div className="md:col-span-1">
                                                            <label className="block text-xs font-bold text-gray-600 mb-1">Item Name</label>
                                                            <input
                                                                type="text"
                                                                value={item.item_name}
                                                                onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                                                                placeholder="Item description"
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-sm"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-600 mb-1">Quantity</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-sm"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-600 mb-1">Unit Price (₱)</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={item.unit_price}
                                                                onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                                                placeholder="0.00"
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-sm"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 text-right">
                                                        <span className="text-sm font-bold text-gray-600">Total: </span>
                                                        <span className="text-lg font-bold text-orange-700">
                                                            ₱{((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 bg-orange-50 p-4 rounded-xl border-2 border-orange-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-bold text-gray-800">Grand Total:</span>
                                                <span className="text-3xl font-black text-orange-700">
                                                    ₱{calculateTotal().toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || uploading}
                                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 rounded-xl font-bold text-lg hover:from-orange-700 hover:to-red-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <CheckCircle2 size={20} />
                                        {uploading ? 'Uploading Receipt...' : loading ? 'Recording...' : 'Record Expense'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-2xl shadow-lg text-white">
                                <p className="text-orange-100 text-xs font-semibold uppercase mb-2">Today's Expenses</p>
                                <p className="text-4xl font-black mb-1">₱{totalToday.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                                <div className="flex items-center gap-1 text-sm">
                                    <TrendingDown size={16} />
                                    <span>{recentExpenses.length} transactions</span>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">Today's Entries</h3>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {recentExpenses.length > 0 ? (
                                        recentExpenses.map(expense => (
                                            <div key={expense.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-800">{expense.vendor}</p>
                                                    <p className="text-xs text-gray-500">{expense.category}</p>
                                                    <p className="text-xs text-purple-600">💳 {expense.account}</p>
                                                    {expense.receipt && <p className="text-xs text-blue-600">📄 {expense.receipt}</p>}
                                                    <p className="text-xs text-gray-400">{expense.date} • {expense.time}</p>
                                                </div>
                                                <p className="font-bold text-red-700">-₱{expense.amount.toLocaleString()}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-center py-4">No expenses yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notification Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                            <div className="text-center">
                                {modalType === 'success' ? (
                                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                        <CheckCircle2 className="h-6 w-6 text-green-600" />
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
                                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-xl font-bold hover:from-orange-700 hover:to-red-700 transition-all"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpenseEntry;
