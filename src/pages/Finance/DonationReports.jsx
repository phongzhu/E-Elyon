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
    const [loading, setLoading] = useState(true);
    const [donations, setDonations] = useState([]);

    useEffect(() => {
        fetchDonationData();
    }, [selectedPeriod, dateRange]);

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

    const fetchDonationData = async () => {
        setLoading(true);
        try {
            const { startDate, endDate } = getDateRange();

            // Fetch all donations in the period
            const { data: donationsData, error } = await supabase
                .from('donations')
                .select(`
                    donation_id,
                    amount,
                    donation_date,
                    notes,
                    is_anonymous
                `)
                .gte('donation_date', startDate)
                .lte('donation_date', endDate)
                .order('donation_date', { ascending: true });

            if (error) throw error;
            setDonations(donationsData || []);

            // Calculate totals
            const total = donationsData.reduce((sum, d) => sum + parseFloat(d.amount), 0);
            setTotalDonations(total);
            setTotalCount(donationsData.length);

            // Group by category (from notes field)
            const categoryMap = new Map();
            donationsData.forEach(donation => {
                const notesArray = donation.notes?.split('|') || [];
                const category = notesArray[1] || 'General Donation';
                
                if (categoryMap.has(category)) {
                    const existing = categoryMap.get(category);
                    categoryMap.set(category, {
                        amount: existing.amount + parseFloat(donation.amount),
                        count: existing.count + 1
                    });
                } else {
                    categoryMap.set(category, {
                        amount: parseFloat(donation.amount),
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

            // Generate monthly trend for last 6 months
            const monthlyMap = new Map();
            const months = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                months.push({ key: monthKey, label: monthLabel });
                monthlyMap.set(monthKey, 0);
            }

            donationsData.forEach(donation => {
                const date = new Date(donation.donation_date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (monthlyMap.has(monthKey)) {
                    monthlyMap.set(monthKey, monthlyMap.get(monthKey) + parseFloat(donation.amount));
                }
            });

            const trend = months.map(m => ({
                month: m.label,
                amount: monthlyMap.get(m.key)
            }));

            setMonthlyTrend(trend);

        } catch (error) {
            console.error('Error fetching donation data:', error);
        } finally {
            setLoading(false);
        }
    };

    const avgMonthlyDonation = monthlyTrend.length > 0 
        ? monthlyTrend.reduce((sum, m) => sum + m.amount, 0) / monthlyTrend.length 
        : 0;

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
        csv += `Total Donations: ₱${totalDonations.toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`;
        csv += `Total Count: ${totalCount}\n\n`;
        
        csv += 'Category,Amount,Percentage,Count\n';
        donationsByCategory.forEach(cat => {
            csv += `${cat.category},${cat.amount},${cat.percent}%,${cat.count}\n`;
        });
        
        csv += '\n\nMonthly Trend\n';
        csv += 'Month,Amount\n';
        monthlyTrend.forEach(m => {
            csv += `${m.month},${m.amount}\n`;
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
                    <p className="text-5xl font-black mb-3">₱{totalDonations.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                    <div className="flex items-center gap-2 bg-white bg-opacity-20 px-3 py-2 rounded-lg">
                        <TrendingUp size={18} />
                        <span className="text-sm font-bold">+12.5% from last period</span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-purple-100 transform hover:scale-105 transition-all">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3 tracking-wider">Average Monthly</p>
                    <p className="text-4xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">₱{avgMonthlyDonation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                    <p className="text-sm text-gray-600 font-semibold">Based on 7-month average</p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-purple-100 transform hover:scale-105 transition-all">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3 tracking-wider">Total Donors</p>
                    <p className="text-4xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">{donationsByCategory.reduce((sum, cat) => sum + cat.count, 0)}</p>
                    <p className="text-sm text-gray-600 font-semibold">Unique transactions</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Donations by Category */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <PieChart className="text-blue-600" size={24} />
                        <h2 className="text-2xl font-bold text-gray-800">Donations by Category</h2>
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
                        <h2 className="text-2xl font-bold text-gray-800">7-Month Trend</h2>
                    </div>
                    <div className="h-64 flex items-end justify-between gap-3">
                        {monthlyTrend.map((month, idx) => {
                            const maxAmount = Math.max(...monthlyTrend.map(m => m.amount));
                            const height = (month.amount / maxAmount) * 100;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div className="relative w-full">
                                        <div 
                                            className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-400 cursor-pointer"
                                            style={{ height: `${height}%` }}
                                        ></div>
                                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            ₱{(month.amount / 1000).toFixed(0)}K
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-gray-400 font-bold text-center">{month.month.split(' ')[0]}</span>
                                </div>
                            );
                        })}
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
                </>
            )}
        </div>
            </div>
        </div>
    );
};

export default DonationReports;
