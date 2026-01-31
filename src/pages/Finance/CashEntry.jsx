import React, { useState, useEffect } from 'react';
import { Plus, Calendar, User, DollarSign, FileText, CheckCircle2, TrendingUp, Wallet, X } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';

const CashEntry = () => {
    const [formData, setFormData] = useState({
        eventDate: '',
        seriesId: '',
        accountId: '',
        donorName: '',
        amount: '',
        donationNotes: '',
        transactionNotes: ''
    });

    const [accounts, setAccounts] = useState([]);
    const [eventSeries, setEventSeries] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [recentEntries, setRecentEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalToday, setTotalToday] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('success'); // 'success' or 'error'

    const showNotification = (message, type = 'success') => {
        setModalMessage(message);
        setModalType(type);
        setShowModal(true);
    };

    useEffect(() => {
        fetchAccounts();
        fetchEventSeries();
        fetchRecentEntries();
    }, []);

    useEffect(() => {
        if (formData.eventDate) {
            filterEventsByDate(formData.eventDate);
        } else {
            setFilteredEvents(eventSeries);
        }
    }, [formData.eventDate, eventSeries]);

    const fetchAccounts = async () => {
        try {
            const { data, error } = await supabase
                .from('finance_accounts')
                .select('account_id, account_name, account_type, balance')
                .eq('is_active', true)
                .order('account_name');
            
            if (error) throw error;
            setAccounts(data || []);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };

    const fetchEventSeries = async () => {
        try {
            const { data, error } = await supabase
                .from('event_series')
                .select('series_id, title, starts_on, ends_on, event_type, location')
                .eq('is_active', true)
                .order('starts_on', { ascending: false });
            
            if (error) throw error;
            setEventSeries(data || []);
            setFilteredEvents(data || []);
        } catch (error) {
            console.error('Error fetching event series:', error);
        }
    };

    const filterEventsByDate = (selectedDate) => {
        if (!selectedDate) {
            setFilteredEvents(eventSeries);
            return;
        }
        
        const filtered = eventSeries.filter(event => {
            // Direct comparison since starts_on is already a date string (YYYY-MM-DD)
            return event.starts_on === selectedDate;
        });
        
        console.log('Selected date:', selectedDate);
        console.log('Filtered events:', filtered);
        setFilteredEvents(filtered);
    };

    const fetchRecentEntries = async () => {
        try {
            const { data, error } = await supabase
                .from('donations')
                .select(`
                    donation_id,
                    amount,
                    donation_date,
                    notes,
                    is_anonymous,
                    event_series(title),
                    transactions!donation_id(
                        finance_accounts(account_name)
                    )
                `)
                .order('donation_date', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            
            const entries = data.map(entry => {
                const notesArray = entry.notes?.split('|') || [];
                const transaction = Array.isArray(entry.transactions) ? entry.transactions[0] : entry.transactions;
                return {
                    id: entry.donation_id,
                    date: new Date(entry.donation_date).toISOString().split('T')[0],
                    time: new Date(entry.donation_date).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    }),
                    donorName: entry.is_anonymous ? 'Anonymous' : (notesArray[0] || 'Anonymous'),
                    amount: parseFloat(entry.amount),
                    donationType: notesArray[1] || 'Donation',
                    event: entry.event_series?.title || 'N/A',
                    account: transaction?.finance_accounts?.account_name || 'N/A'
                };
            });
            
            setRecentEntries(entries);
            
            const today = new Date().toISOString().split('T')[0];
            const todayTotal = entries
                .filter(entry => entry.date === today)
                .reduce((sum, entry) => sum + entry.amount, 0);
            setTotalToday(todayTotal);
            
        } catch (error) {
            console.error('Error fetching recent entries:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data: userRecord } = await supabase
                .from('users')
                .select('user_id')
                .eq('email', user.email)
                .single();

            if (!userRecord) throw new Error('User record not found');

            const isAnonymous = !formData.donorName || formData.donorName.trim() === '';
            const donorDisplay = isAnonymous ? 'Anonymous' : formData.donorName;
            const donationNotesField = `${donorDisplay}|${formData.donationNotes || 'General Donation'}`;

            // Insert into donations table (no account_id - it's in transactions)
            const { data: donation, error: donationError } = await supabase
                .from('donations')
                .insert({
                    donor_id: null, // Only for online donations
                    is_anonymous: isAnonymous,
                    amount: parseFloat(formData.amount),
                    donation_date: new Date().toISOString(), // Current timestamp
                    notes: donationNotesField,
                    series_id: formData.seriesId || null
                })
                .select()
                .single();

            if (donationError) throw donationError;

            // Insert into transactions table
            const { error: transactionError } = await supabase
                .from('transactions')
                .insert({
                    account_id: formData.accountId,
                    transaction_type: 'Donation',
                    donation_id: donation.donation_id,
                    amount: parseFloat(formData.amount),
                    notes: formData.transactionNotes || `Cash Entry: ${formData.donationNotes || 'Donation'} - ${donorDisplay}`,
                    created_by: userRecord.user_id,
                    transaction_date: new Date().toISOString() // Current timestamp - automatic
                });

            if (transactionError) throw transactionError;

            // Update account balance
            const { error: balanceError } = await supabase.rpc('update_account_balance', {
                p_account_id: formData.accountId,
                p_amount: parseFloat(formData.amount),
                p_operation: 'add'
            });

            if (balanceError) throw balanceError;

            showNotification('Donation recorded successfully!');
            
            // Reset form
            setFormData({
                eventDate: '',
                seriesId: '',
                accountId: formData.accountId, // Keep account selected
                donorName: '',
                amount: '',
                donationNotes: '',
                transactionNotes: ''
            });

            // Refresh recent entries
            fetchRecentEntries();

        } catch (error) {
            console.error('Error recording donation:', error);
            showNotification('Error recording donation: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            
            <div className="flex flex-col flex-1">
                <Header />
                
                <div className="flex-1 bg-gradient-to-br from-gray-50 to-green-50 p-10 overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Cash / Walk-in Entry</h1>
                <p className="text-gray-500">Record donations received in cash or during church services</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-green-100 p-3 rounded-xl">
                                <Plus className="text-green-700" size={24} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">New Cash Entry</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <Wallet className="inline mr-2" size={16} />
                                    Account <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.accountId}
                                    onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
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
                                    <Calendar className="inline mr-2" size={16} />
                                    Event Date (Optional - to filter events)
                                </label>
                                <input 
                                    type="date"
                                    value={formData.eventDate}
                                    onChange={(e) => setFormData({...formData, eventDate: e.target.value, seriesId: ''})}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                                />
                                <p className="text-xs text-gray-500 mt-1">Select a date to filter events happening on that date</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Event/Series (Optional)
                                </label>
                                <select
                                    value={formData.seriesId}
                                    onChange={(e) => setFormData({...formData, seriesId: e.target.value})}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                                >
                                    <option value="">None</option>
                                    {filteredEvents.map(series => (
                                        <option key={series.series_id} value={series.series_id}>
                                            {series.title} - {new Date(series.starts_on).toLocaleDateString()} 
                                            {series.event_type && ` (${series.event_type})`}
                                        </option>
                                    ))}
                                </select>
                                {formData.eventDate && filteredEvents.length === 0 && (
                                    <p className="text-xs text-amber-600 mt-1">No events found for the selected date</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <User className="inline mr-2" size={16} />
                                    Donor Name (Optional)
                                </label>
                                <input 
                                    type="text"
                                    value={formData.donorName}
                                    onChange={(e) => setFormData({...formData, donorName: e.target.value})}
                                    placeholder="Leave blank for Anonymous"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <DollarSign className="inline mr-2" size={16} />
                                    Amount (₱) <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    placeholder="0.00"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors text-2xl font-bold"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <FileText className="inline mr-2" size={16} />
                                    Donation Notes (What type of donation)
                                </label>
                                <input 
                                    type="text"
                                    value={formData.donationNotes}
                                    onChange={(e) => setFormData({...formData, donationNotes: e.target.value})}
                                    placeholder="e.g., Tithes, Offerings, Building Fund, Mission Fund"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <FileText className="inline mr-2" size={16} />
                                    Transaction Notes (Optional)
                                </label>
                                <textarea
                                    value={formData.transactionNotes}
                                    onChange={(e) => setFormData({...formData, transactionNotes: e.target.value})}
                                    placeholder="Additional transaction information..."
                                    rows="3"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-4 rounded-xl font-bold text-lg hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckCircle2 size={20} />
                                {loading ? 'Recording...' : 'Record Entry'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-6 rounded-2xl shadow-lg text-white">
                        <p className="text-emerald-100 text-xs font-semibold uppercase mb-2">Today's Collection</p>
                        <p className="text-4xl font-black mb-1">₱{totalToday.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                        <div className="flex items-center gap-1 text-sm">
                            <TrendingUp size={16} />
                            <span>{recentEntries.filter(e => e.date === new Date().toISOString().split('T')[0]).length} transactions</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Entries</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {recentEntries.length > 0 ? (
                                recentEntries.map(entry => (
                                    <div key={entry.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800">{entry.donorName}</p>
                                            <p className="text-xs text-gray-500">{entry.donationType}</p>
                                            <p className="text-xs text-purple-600">💳 {entry.account}</p>
                                            <p className="text-xs text-blue-600">{entry.event}</p>
                                            <p className="text-xs text-gray-400">{entry.date} • {entry.time}</p>
                                        </div>
                                        <p className="font-bold text-green-700">₱{entry.amount.toLocaleString()}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-4">No entries yet</p>
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
                                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3 rounded-xl font-bold hover:from-emerald-700 hover:to-green-700 transition-all"
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

export default CashEntry;
