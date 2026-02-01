import React, { useState, useEffect } from 'react';
import { BarChart3, Download, TrendingUp, Calendar, PieChart, Filter, X } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';

const DonationReports = () => {
    const [selectedPeriod, setSelectedPeriod] = useState('monthly');
    const [showCustomDateRange, setShowCustomDateRange] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    const [donationsByCategory, setDonationsByCategory] = useState([]);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [totalDonations, setTotalDonations] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [percentChange, setPercentChange] = useState(null);
    const [loading, setLoading] = useState(true);
    const [donations, setDonations] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchDonationData();
        }
    }, [selectedPeriod, dateRange, currentUser]);

    const fetchCurrentUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: userData, error } = await supabase
                .from('users')
                .select('user_id, user_details_id, users_details!users_user_details_id_fkey(branch_id, first_name, middle_name, last_name)')
                .eq('auth_user_id', user.id)
                .limit(1);

            if (error) throw error;
            setCurrentUser(userData?.[0]);
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    };

    const getDateRange = () => {
        const now = new Date();
        let startDate, endDate;

        switch (selectedPeriod) {
            case 'weekly':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                endDate = now;
                break;
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
                break;
            case 'quarterly':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                endDate = now;
                break;
            case 'yearly':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = now;
                break;
            case 'custom':
                if (dateRange.startDate && dateRange.endDate) {
                    startDate = new Date(dateRange.startDate);
                    endDate = new Date(dateRange.endDate);
                } else {
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = now;
                }
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
        }

        return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
    };

    const normalizeDonationType = (donation) => {
        const fallback = (donation.notes?.split('|') || [])[1];
        return donation.donation_type || fallback || 'General Donation';
    };

    const formatCurrency = (n) => `₱${(Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const computeTrendBuckets = (donationsData, rangeStartIso, rangeEndIso) => {
        const start = new Date(rangeStartIso);
        const end = new Date(rangeEndIso);
        const msDay = 24 * 60 * 60 * 1000;
        const rangeDays = Math.max(1, Math.ceil((end - start) / msDay));

        // Decide granularity based on selected period + range length
        let granularity = 'month';
        if (selectedPeriod === 'weekly') granularity = 'day';
        else if (selectedPeriod === 'monthly') granularity = 'week';
        else if (selectedPeriod === 'quarterly') granularity = 'month';
        else if (selectedPeriod === 'yearly') granularity = 'month';
        else if (selectedPeriod === 'custom') {
            if (rangeDays <= 14) granularity = 'day';
            else if (rangeDays <= 90) granularity = 'week';
            else granularity = 'month';
        }

        const buckets = new Map();

        const toKey = (d) => {
            const date = new Date(d);
            if (granularity === 'day') {
                return date.toISOString().split('T')[0];
            }
            if (granularity === 'week') {
                // Week-of-month bucket (1..5)
                const wk = Math.floor((date.getDate() - 1) / 7) + 1;
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-W${wk}`;
            }
            // month
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        };

        // Pre-seed buckets so chart is stable even with gaps
        if (granularity === 'day') {
            const daysToShow = selectedPeriod === 'weekly' ? 7 : rangeDays;
            const startPoint = selectedPeriod === 'weekly'
                ? new Date(end.getTime() - (daysToShow - 1) * msDay)
                : new Date(start);
            for (let i = 0; i < daysToShow; i++) {
                const d = new Date(startPoint.getTime() + i * msDay);
                buckets.set(d.toISOString().split('T')[0], 0);
            }
        } else if (granularity === 'week') {
            // Up to 5 weeks for the selected month; for custom ranges this is approximate but readable
            const month = end.getMonth();
            const year = end.getFullYear();
            const maxWeeks = 5;
            for (let wk = 1; wk <= maxWeeks; wk++) {
                buckets.set(`${year}-${String(month + 1).padStart(2, '0')}-W${wk}`, 0);
            }
        } else {
            const monthsToShow = selectedPeriod === 'quarterly' ? 3 : (selectedPeriod === 'yearly' ? 12 : 6);
            for (let i = monthsToShow - 1; i >= 0; i--) {
                const d = new Date(end);
                d.setMonth(d.getMonth() - i);
                buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0);
            }
        }

        donationsData.forEach((donation) => {
            const key = toKey(donation.donation_date);
            if (!buckets.has(key)) buckets.set(key, 0);
            buckets.set(key, buckets.get(key) + parseFloat(donation.amount));
        });

        const rows = Array.from(buckets.entries()).map(([key, amount]) => {
            let label = key;
            if (granularity === 'day') {
                const d = new Date(key);
                label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else if (granularity === 'week') {
                const wk = key.split('-W')[1];
                label = `Week ${wk}`;
            } else {
                const [y, m] = key.split('-');
                const d = new Date(Number(y), Number(m) - 1, 1);
                label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }
            return { month: label, amount };
        });

        return rows;
    };

    const computePrevRange = (startIso, endIso) => {
        const start = new Date(startIso);
        const end = new Date(endIso);
        const delta = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime());
        const prevStart = new Date(start.getTime() - delta);
        return { prevStart: prevStart.toISOString(), prevEnd: prevEnd.toISOString() };
    };

    const fetchDonationData = async () => {
        if (!currentUser?.users_details?.branch_id) return;
        
        setLoading(true);
        try {
            const { startDate, endDate } = getDateRange();
            const branchId = currentUser.users_details.branch_id;

            // Fetch all donations from transactions table for this branch
            const { data: donationsData, error } = await supabase
                .from('transactions')
                .select(`
                    transaction_id,
                    amount,
                    transaction_date,
                    branch_id,
                    donations!transactions_donation_id_fkey(
                        donation_id,
                        donation_date,
                        notes,
                        is_anonymous,
                        donation_type
                    )
                `)
                .eq('branch_id', branchId)
                .not('donation_id', 'is', null)
                .gte('transaction_date', startDate)
                .lte('transaction_date', endDate)
                .order('transaction_date', { ascending: false });

            if (error) throw error;
            setDonations(donationsData || []);

            // Calculate totals
            const total = donationsData.reduce((sum, d) => sum + parseFloat(d.amount), 0);
            setTotalDonations(total);
            setTotalCount(donationsData.length);

            // Compare to previous period (same duration)
            try {
                const { prevStart, prevEnd } = computePrevRange(startDate, endDate);
                const { data: prevData, error: prevError } = await supabase
                    .from('transactions')
                    .select('amount')
                    .eq('branch_id', branchId)
                    .not('donation_id', 'is', null)
                    .gte('transaction_date', prevStart)
                    .lte('transaction_date', prevEnd);
                if (prevError) throw prevError;
                const prevTotal = (prevData || []).reduce((sum, d) => sum + parseFloat(d.amount), 0);
                if (prevTotal > 0) {
                    setPercentChange(((total - prevTotal) / prevTotal) * 100);
                } else {
                    setPercentChange(null);
                }
            } catch (e) {
                console.warn('Unable to compute period comparison:', e);
                setPercentChange(null);
            }

            // Group by donation type from transactions
            const categoryMap = new Map();
            donationsData.forEach(txn => {
                const donation = txn.donations;
                if (!donation) return;
                const category = normalizeDonationType(donation);
                
                if (categoryMap.has(category)) {
                    const existing = categoryMap.get(category);
                    categoryMap.set(category, {
                        amount: existing.amount + parseFloat(txn.amount),
                        count: existing.count + 1
                    });
                } else {
                    categoryMap.set(category, {
                        amount: parseFloat(txn.amount),
                        count: 1
                    });
                }
            });

            const categories = Array.from(categoryMap.entries()).map(([category, data]) => ({
                category,
                amount: data.amount,
                count: data.count,
                percent: total > 0 ? Math.round((data.amount / total) * 100) : 0
            })).sort((a, b) => b.amount - a.amount);

            setDonationsByCategory(categories);

            // Generate trend buckets that match the selected period
            setMonthlyTrend(computeTrendBuckets(donationsData, startDate, endDate));

        } catch (error) {
            console.error('Error fetching donation data:', error);
        } finally {
            setLoading(false);
        }
    };

    const avgDonation = totalCount > 0 ? totalDonations / totalCount : 0;

    const handleCustomDateFilter = () => {
        if (dateRange.startDate && dateRange.endDate) {
            setSelectedPeriod('custom');
            setShowCustomDateRange(false);
            fetchDonationData();
        }
    };

    const exportToExcel = () => {
        // Create CSV content
        let csv = 'Donation Reports\n\n';
        csv += `Period: ${selectedPeriod}\n`;
        csv += `Total Donations: ${formatCurrency(totalDonations)}\n`;
        csv += `Total Count: ${totalCount}\n\n`;
        
        csv += 'Category,Amount,Percentage,Count\n';
        donationsByCategory.forEach(cat => {
            csv += `${cat.category},${cat.amount},${cat.percent}%,${cat.count}\n`;
        });
        
        csv += '\n\nTrend\n';
        csv += 'Bucket,Amount\n';
        monthlyTrend.forEach(m => {
            csv += `${m.month},${m.amount}\n`;
        });

        csv += '\n\nRecent Donations\n';
        csv += 'Date,Donor,Type,Amount,Notes\n';
        donations
            .slice()
            .sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date))
            .forEach(d => {
                const notesArray = d.notes?.split('|') || [];
                const donorName = d.is_anonymous ? 'Anonymous' : (notesArray[0] || 'Anonymous');
                const dtype = normalizeDonationType(d);
                const safeNotes = (d.notes || '').replace(/\n/g, ' ').replace(/\r/g, ' ');
                csv += `${new Date(d.donation_date).toISOString()},${donorName},${dtype},${d.amount},"${safeNotes}"\n`;
            });
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `donation-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    // Compute topDonors
    const topDonors = React.useMemo(() => {
        const donorMap = new Map();
        donations.forEach(donation => {
            const notesArray = donation.notes?.split('|') || [];
            const donorName = donation.is_anonymous ? 'Anonymous' : (notesArray[0] || 'Anonymous');
            if (donorMap.has(donorName)) {
                const existing = donorMap.get(donorName);
                donorMap.set(donorName, {
                    totalAmount: existing.totalAmount + parseFloat(donation.amount),
                    frequency: existing.frequency + 1
                });
            } else {
                donorMap.set(donorName, {
                    totalAmount: parseFloat(donation.amount),
                    frequency: 1
                });
            }
        });
        return Array.from(donorMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 5);
    }, [donations]);

    const trendTitle = React.useMemo(() => {
        if (selectedPeriod === 'weekly') return '7-Day Trend';
        if (selectedPeriod === 'monthly') return 'This Month (Weekly)';
        if (selectedPeriod === 'quarterly') return 'Quarter Trend (Monthly)';
        if (selectedPeriod === 'yearly') return 'Year Trend (Monthly)';
        return 'Trend';
    }, [selectedPeriod]);

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            
            <div className="flex flex-col flex-1">
                <Header />
                
                <div className="flex-1 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-10 overflow-y-auto">
            {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 font-semibold">Loading donation data...</p>
                    </div>
                </div>
            ) : (
                <>
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">Donation Reports</h1>
                    <p className="text-gray-600 font-medium">Comprehensive analysis of all donation channels</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={exportToExcel}
                        disabled={loading}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50"
                    >
                        <Download size={18} />
                        {loading ? 'Loading...' : 'Export Excel'}
                    </button>
                </div>
            </div>

            {/* Period Selector with Custom Date Range */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Calendar size={20} className="text-indigo-600" />
                        <span className="font-bold text-gray-700">Filter Period:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => { setSelectedPeriod('weekly'); setShowCustomDateRange(false); }}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                selectedPeriod === 'weekly' 
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            This Week
                        </button>
                        <button
                            onClick={() => { setSelectedPeriod('monthly'); setShowCustomDateRange(false); }}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                selectedPeriod === 'monthly' 
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            This Month
                        </button>
                        <button
                            onClick={() => { setSelectedPeriod('quarterly'); setShowCustomDateRange(false); }}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                selectedPeriod === 'quarterly' 
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            This Quarter
                        </button>
                        <button
                            onClick={() => { setSelectedPeriod('yearly'); setShowCustomDateRange(false); }}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                selectedPeriod === 'yearly' 
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            This Year
                        </button>
                        <button
                            onClick={() => { setShowCustomDateRange(!showCustomDateRange); setSelectedPeriod('custom'); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                selectedPeriod === 'custom' 
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <Filter size={16} />
                            Custom Range
                        </button>
                    </div>
                </div>

                {/* Custom Date Range Picker */}
                {showCustomDateRange && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                                <input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <button
                                onClick={handleCustomDateFilter}
                                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all"
                            >
                                Apply Filter
                            </button>
                            <button
                                onClick={() => setShowCustomDateRange(false)}
                                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-3xl shadow-2xl text-white transform hover:scale-105 transition-all">
                    <p className="text-indigo-100 text-xs font-semibold uppercase mb-3 tracking-wider">Total Donations</p>
                    <p className="text-5xl font-black mb-3">{formatCurrency(totalDonations)}</p>
                    <div className="flex items-center gap-2 bg-white bg-opacity-20 px-3 py-2 rounded-lg">
                        <TrendingUp size={18} />
                        <span className="text-sm font-bold">
                            {percentChange === null
                                ? 'No previous period data'
                                : `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}% vs previous period`}
                        </span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-purple-100 transform hover:scale-105 transition-all">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3 tracking-wider">Average Donation</p>
                    <p className="text-4xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">{formatCurrency(avgDonation)}</p>
                    <p className="text-sm text-gray-600 font-semibold">Across {totalCount} donations</p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-purple-100 transform hover:scale-105 transition-all">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3 tracking-wider">Donations Count</p>
                    <p className="text-4xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">{totalCount}</p>
                    <p className="text-sm text-gray-600 font-semibold">Transactions in this period</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Donations by Category */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <PieChart className="text-blue-600" size={24} />
                        <h2 className="text-2xl font-bold text-gray-800">Donations by Type</h2>
                    </div>
                    <div className="space-y-4">
                        {donationsByCategory.map((cat, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <p className="font-bold text-gray-800">{cat.category}</p>
                                        <p className="text-xs text-gray-500">{cat.count} transactions</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono font-bold text-gray-900">₱{cat.amount.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500">{cat.percent}%</p>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3">
                                    <div 
                                        className={`h-3 rounded-full transition-all ${
                                            idx === 0 ? 'bg-blue-500' :
                                            idx === 1 ? 'bg-green-500' :
                                            idx === 2 ? 'bg-purple-500' :
                                            idx === 3 ? 'bg-orange-500' :
                                            'bg-pink-500'
                                        }`}
                                        style={{ width: `${cat.percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Monthly Trend */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <BarChart3 className="text-blue-600" size={24} />
                        <h2 className="text-2xl font-bold text-gray-800">{trendTitle}</h2>
                    </div>
                    <div className="h-64 flex items-end justify-between gap-3">
                        {monthlyTrend.length > 0 ? monthlyTrend.map((month, idx) => {
                            const maxAmount = Math.max(...monthlyTrend.map(m => m.amount), 1);
                            const height = month.amount > 0 ? Math.max((month.amount / maxAmount) * 100, 5) : 5;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div className="relative w-full h-48 flex items-end">
                                        <div 
                                            className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-400 cursor-pointer"
                                            style={{ height: `${height}%` }}
                                        ></div>
                                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white px-2 py-1 rounded shadow">
                                            {formatCurrency(month.amount)}
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-gray-400 font-bold text-center">{month.month}</span>
                                </div>
                            );
                        }) : (
                            <div className="w-full h-48 flex items-center justify-center text-gray-400">
                                No donation data for selected period
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Donors Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Top Donors (This Period)</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Rank</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Donor</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Total Amount</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Frequency</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {topDonors.map((donor, idx) => (
                                <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                            idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                            idx === 1 ? 'bg-gray-100 text-gray-700' :
                                            idx === 2 ? 'bg-orange-100 text-orange-700' :
                                            'bg-blue-50 text-blue-600'
                                        }`}>
                                            {idx + 1}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-900">{donor.name}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="font-mono font-bold text-lg text-blue-700">₱{donor.totalAmount.toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                                            {donor.frequency}x
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Donations Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mt-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Donations (Newest First)</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Donor</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Event</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {donations
                                .slice()
                                .sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date))
                                .slice(0, 12)
                                .map((d) => {
                                    const notesArray = d.notes?.split('|') || [];
                                    const donorName = d.is_anonymous ? 'Anonymous' : (notesArray[0] || 'Anonymous');
                                    return (
                                        <tr key={d.donation_id} className="hover:bg-blue-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-700 font-semibold">
                                                {new Date(d.donation_date).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-900">{donorName}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold">
                                                    {normalizeDonationType(d)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="font-mono font-bold text-lg text-blue-700">{formatCurrency(d.amount)}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {d.event_series?.title || 'N/A'}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
                </>
            )}
        </div>
            </div>
        </div>
    );
};

export default DonationReports;
