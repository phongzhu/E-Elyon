import React, { useState } from 'react';
import { Zap, Droplets, Wifi, Flame, TrendingUp, TrendingDown, Download, Calendar, Filter, X } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

const UtilityTracker = () => {
    const [selectedUtilities, setSelectedUtilities] = useState(['meralco', 'water', 'internet', 'gas']);
    const [showFilter, setShowFilter] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });

    // Sample utility bill data for the past 12 months
    const utilityData = [
        { 
            month: 'Feb 2025', 
            meralco: { amount: 13450, dueDate: '2025-03-05', status: 'Paid', accountNo: '1234-5678-9012' },
            water: { amount: 3400, dueDate: '2025-03-08', status: 'Paid', accountNo: 'MW-9876543' },
            internet: { amount: 2899, dueDate: '2025-03-01', status: 'Paid', accountNo: 'PLDT-12345' },
            gas: { amount: 1600, dueDate: '2025-03-10', status: 'Paid', accountNo: 'GAS-567890' }
        },
        { 
            month: 'Mar 2025', 
            meralco: { amount: 12800, dueDate: '2025-04-05', status: 'Paid', accountNo: '1234-5678-9012' },
            water: { amount: 3150, dueDate: '2025-04-08', status: 'Paid', accountNo: 'MW-9876543' },
            internet: { amount: 2899, dueDate: '2025-04-01', status: 'Paid', accountNo: 'PLDT-12345' },
            gas: { amount: 1550, dueDate: '2025-04-10', status: 'Paid', accountNo: 'GAS-567890' }
        },
        { 
            month: 'Apr 2025', 
            meralco: { amount: 14200, dueDate: '2025-05-05', status: 'Paid', accountNo: '1234-5678-9012' },
            water: { amount: 3350, dueDate: '2025-05-08', status: 'Paid', accountNo: 'MW-9876543' },
            internet: { amount: 2899, dueDate: '2025-05-01', status: 'Paid', accountNo: 'PLDT-12345' },
            gas: { amount: 1480, dueDate: '2025-05-10', status: 'Paid', accountNo: 'GAS-567890' }
        },
        { 
            month: 'May 2025', 
            meralco: { amount: 15100, dueDate: '2025-06-05', status: 'Paid', accountNo: '1234-5678-9012' },
            water: { amount: 3500, dueDate: '2025-06-08', status: 'Paid', accountNo: 'MW-9876543' },
            internet: { amount: 2899, dueDate: '2025-06-01', status: 'Paid', accountNo: 'PLDT-12345' },
            gas: { amount: 1520, dueDate: '2025-06-10', status: 'Paid', accountNo: 'GAS-567890' }
        },
        { 
            month: 'Jun 2025', 
            meralco: { amount: 13950, dueDate: '2025-07-05', status: 'Paid', accountNo: '1234-5678-9012' },
            water: { amount: 3280, dueDate: '2025-07-08', status: 'Paid', accountNo: 'MW-9876543' },
            internet: { amount: 2899, dueDate: '2025-07-01', status: 'Paid', accountNo: 'PLDT-12345' },
            gas: { amount: 1460, dueDate: '2025-07-10', status: 'Paid', accountNo: 'GAS-567890' }
        },
        { 
            month: 'Jul 2025', 
            meralco: { amount: 12650, dueDate: '2025-08-05', status: 'Paid', accountNo: '1234-5678-9012' },
            water: { amount: 3100, dueDate: '2025-08-08', status: 'Paid', accountNo: 'MW-9876543' },
            internet: { amount: 2899, dueDate: '2025-08-01', status: 'Paid', accountNo: 'PLDT-12345' },
            gas: { amount: 1490, dueDate: '2025-08-10', status: 'Paid', accountNo: 'GAS-567890' }
        },
        { 
            month: 'Aug 2025', 
            meralco: { amount: 13200, dueDate: '2025-09-05', status: 'Paid', accountNo: '1234-5678-9012' },
            water: { amount: 3220, dueDate: '2025-09-08', status: 'Paid', accountNo: 'MW-9876543' },
            internet: { amount: 2899, dueDate: '2025-09-01', status: 'Paid', accountNo: 'PLDT-12345' },
            gas: { amount: 1510, dueDate: '2025-09-10', status: 'Paid', accountNo: 'GAS-567890' }
        },
        { 
            month: 'Sep 2025', 
            meralco: { amount: 12900, dueDate: '2025-10-05', status: 'Paid', accountNo: '1234-5678-9012' },
            water: { amount: 3050, dueDate: '2025-10-08', status: 'Paid', accountNo: 'MW-9876543' },
            internet: { amount: 2899, dueDate: '2025-10-01', status: 'Paid', accountNo: 'PLDT-12345' },
            gas: { amount: 1440, dueDate: '2025-10-10', status: 'Paid', accountNo: 'GAS-567890' }
        },
        { 
            month: 'Oct 2025', 
            meralco: { amount: 13450, dueDate: '2025-11-05', status: 'Paid', accountNo: '1234-5678-9012' },
            water: { amount: 3180, dueDate: '2025-11-08', status: 'Paid', accountNo: 'MW-9876543' },
            internet: { amount: 2899, dueDate: '2025-11-01', status: 'Paid', accountNo: 'PLDT-12345' },
            gas: { amount: 1470, dueDate: '2025-11-10', status: 'Paid', accountNo: 'GAS-567890' }
        },
        { 
            month: 'Nov 2025', 
            meralco: { amount: 12750, dueDate: '2025-12-05', status: 'Paid', accountNo: '1234-5678-9012' },
            water: { amount: 3120, dueDate: '2025-12-08', status: 'Paid', accountNo: 'MW-9876543' },
            internet: { amount: 2899, dueDate: '2025-12-01', status: 'Paid', accountNo: 'PLDT-12345' },
            gas: { amount: 1480, dueDate: '2025-12-10', status: 'Paid', accountNo: 'GAS-567890' }
        },
        { 
            month: 'Dec 2025', 
            meralco: { amount: 12450, dueDate: '2026-01-05', status: 'Paid', accountNo: '1234-5678-9012' },
            water: { amount: 3200, dueDate: '2026-01-08', status: 'Paid', accountNo: 'MW-9876543' },
            internet: { amount: 2899, dueDate: '2026-01-01', status: 'Paid', accountNo: 'PLDT-12345' },
            gas: { amount: 1500, dueDate: '2026-01-10', status: 'Paid', accountNo: 'GAS-567890' }
        },
        { 
            month: 'Jan 2026', 
            meralco: { amount: 11230, dueDate: '2026-02-05', status: 'Pending', accountNo: '1234-5678-9012' },
            water: { amount: 2980, dueDate: '2026-02-08', status: 'Pending', accountNo: 'MW-9876543' },
            internet: { amount: 2899, dueDate: '2026-02-01', status: 'Paid', accountNo: 'PLDT-12345' },
            gas: { amount: 1450, dueDate: '2026-02-10', status: 'Pending', accountNo: 'GAS-567890' }
        },
    ];

    const calculateTrend = (utilityType) => {
        const lastMonth = utilityData[utilityData.length - 2][utilityType].amount;
        const currentMonth = utilityData[utilityData.length - 1][utilityType].amount;
        const change = ((currentMonth - lastMonth) / lastMonth) * 100;
        return { change: change.toFixed(1), isIncrease: change > 0 };
    };

    const utilities = [
        { 
            key: 'meralco', 
            name: 'Meralco (Electricity)', 
            icon: Zap, 
            color: 'yellow',
            accountNo: '1234-5678-9012'
        },
        { 
            key: 'water', 
            name: 'Water Bill (Manila Water)', 
            icon: Droplets, 
            color: 'blue',
            accountNo: 'MW-9876543'
        },
        { 
            key: 'internet', 
            name: 'Internet (PLDT Fibr)', 
            icon: Wifi, 
            color: 'indigo',
            accountNo: 'PLDT-12345'
        },
        { 
            key: 'gas', 
            name: 'Gas', 
            icon: Flame, 
            color: 'red',
            accountNo: 'GAS-567890'
        },
    ];

    const toggleUtility = (utilityKey) => {
        if (selectedUtilities.includes(utilityKey)) {
            setSelectedUtilities(selectedUtilities.filter(u => u !== utilityKey));
        } else {
            setSelectedUtilities([...selectedUtilities, utilityKey]);
        }
    };

    const selectAll = () => {
        setSelectedUtilities(['meralco', 'water', 'internet', 'gas']);
    };

    const clearAll = () => {
        setSelectedUtilities([]);
    };

    const getFilteredData = () => {
        return utilityData;
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            
            <div className="flex flex-col flex-1">
                <Header />
                
                <div className="flex-1 bg-gradient-to-br from-gray-50 to-yellow-50 p-10 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Utility Bill Tracker</h1>
                    <p className="text-gray-500">Monitor and compare utility expenses month-over-month</p>
                </div>
                <button className="flex items-center gap-2 bg-yellow-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-yellow-700 transition-all shadow-lg">
                    <Download size={18} />
                    Export Report
                </button>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <Filter size={20} className="text-orange-600" />
                        <span className="font-bold text-gray-700">Compare Utilities:</span>
                    </div>
                    <button
                        onClick={selectAll}
                        className="px-4 py-2 rounded-xl font-bold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                    >
                        Select All
                    </button>
                    <button
                        onClick={clearAll}
                        className="px-4 py-2 rounded-xl font-bold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                    >
                        Clear All
                    </button>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    {utilities.map(utility => {
                        const Icon = utility.icon;
                        const isSelected = selectedUtilities.includes(utility.key);
                        
                        return (
                            <button
                                key={utility.key}
                                onClick={() => toggleUtility(utility.key)}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                                    isSelected
                                    ? `bg-gradient-to-r from-${utility.color}-500 to-${utility.color}-600 text-white shadow-md`
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <Icon size={18} />
                                {utility.name.split('(')[0].trim()}
                                {isSelected && <span className="ml-1">✓</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Date Range Filter */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-orange-100 text-orange-700 hover:bg-orange-200 transition-all"
                    >
                        <Calendar size={16} />
                        {showFilter ? 'Hide' : 'Show'} Date Range Filter
                    </button>

                    {showFilter && (
                        <div className="mt-4 flex flex-wrap items-end gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                                <input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                />
                            </div>
                            <button
                                onClick={() => console.log('Filtering', dateRange)}
                                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold hover:from-orange-600 hover:to-orange-700 transition-all"
                            >
                                Apply Filter
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Current Month Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {utilities.map(utility => {
                    const trend = calculateTrend(utility.key);
                    const currentAmount = utilityData[utilityData.length - 1][utility.key].amount;
                    const Icon = utility.icon;
                    
                    return (
                        <div key={utility.key} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`bg-${utility.color}-100 p-3 rounded-xl`}>
                                    <Icon className={`text-${utility.color}-600`} size={24} />
                                </div>
                                <div className={`flex items-center gap-1 ${trend.isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                                    {trend.isIncrease ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    <span className="text-sm font-bold">{Math.abs(trend.change)}%</span>
                                </div>
                            </div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{utility.name}</p>
                            <p className="text-2xl font-black text-gray-900">₱{currentAmount.toLocaleString()}</p>
                            <p className="text-xs text-gray-400 mt-2">Due: {utilityData[utilityData.length - 1][utility.key].dueDate}</p>
                            <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold ${
                                utilityData[utilityData.length - 1][utility.key].status === 'Paid'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                                {utilityData[utilityData.length - 1][utility.key].status}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* 12-Month Comparison Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">12-Month Comparison</h2>
                        <p className="text-sm text-gray-500 mt-1">Track trends and identify cost-saving opportunities • Showing {selectedUtilities.length} of 4 utilities</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b-2 border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider sticky left-0 bg-gradient-to-r from-orange-50 to-yellow-50">Month</th>
                                {selectedUtilities.includes('meralco') && (
                                    <th className="px-6 py-4 text-right text-xs font-bold text-yellow-700 uppercase tracking-wider">
                                        <div className="flex items-center justify-end gap-2">
                                            <Zap size={16} /> Meralco
                                        </div>
                                    </th>
                                )}
                                {selectedUtilities.includes('water') && (
                                    <th className="px-6 py-4 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">
                                        <div className="flex items-center justify-end gap-2">
                                            <Droplets size={16} /> Water
                                        </div>
                                    </th>
                                )}
                                {selectedUtilities.includes('internet') && (
                                    <th className="px-6 py-4 text-right text-xs font-bold text-indigo-700 uppercase tracking-wider">
                                        <div className="flex items-center justify-end gap-2">
                                            <Wifi size={16} /> Internet
                                        </div>
                                    </th>
                                )}
                                {selectedUtilities.includes('gas') && (
                                    <th className="px-6 py-4 text-right text-xs font-bold text-red-700 uppercase tracking-wider">
                                        <div className="flex items-center justify-end gap-2">
                                            <Flame size={16} /> Gas
                                        </div>
                                    </th>
                                )}
                                {selectedUtilities.length > 0 && (
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-900 uppercase tracking-wider bg-orange-100">Total (Selected)</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {utilityData.slice().reverse().map((data, idx) => {
                                let total = 0;
                                if (selectedUtilities.includes('meralco')) total += data.meralco.amount;
                                if (selectedUtilities.includes('water')) total += data.water.amount;
                                if (selectedUtilities.includes('internet')) total += data.internet.amount;
                                if (selectedUtilities.includes('gas')) total += data.gas.amount;
                                
                                return (
                                    <tr key={idx} className="hover:bg-orange-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900 sticky left-0 bg-white">{data.month}</td>
                                        {selectedUtilities.includes('meralco') && (
                                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">₱{data.meralco.amount.toLocaleString()}</td>
                                        )}
                                        {selectedUtilities.includes('water') && (
                                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">₱{data.water.amount.toLocaleString()}</td>
                                        )}
                                        {selectedUtilities.includes('internet') && (
                                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">₱{data.internet.amount.toLocaleString()}</td>
                                        )}
                                        {selectedUtilities.includes('gas') && (
                                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">₱{data.gas.amount.toLocaleString()}</td>
                                        )}
                                        {selectedUtilities.length > 0 && (
                                            <td className="px-6 py-4 text-right font-mono font-black text-lg bg-orange-50 text-orange-700">₱{total.toLocaleString()}</td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                        {selectedUtilities.length > 0 && (
                            <tfoot className="bg-gradient-to-r from-orange-100 to-yellow-100 border-t-2 border-gray-300">
                                <tr>
                                    <td className="px-6 py-4 font-black text-gray-900">12-Month Average</td>
                                    {selectedUtilities.includes('meralco') && (
                                        <td className="px-6 py-4 text-right font-mono font-black text-yellow-700">
                                            ₱{(utilityData.reduce((sum, d) => sum + d.meralco.amount, 0) / utilityData.length).toFixed(0)}
                                        </td>
                                    )}
                                    {selectedUtilities.includes('water') && (
                                        <td className="px-6 py-4 text-right font-mono font-black text-blue-700">
                                            ₱{(utilityData.reduce((sum, d) => sum + d.water.amount, 0) / utilityData.length).toFixed(0)}
                                        </td>
                                    )}
                                    {selectedUtilities.includes('internet') && (
                                        <td className="px-6 py-4 text-right font-mono font-black text-indigo-700">
                                            ₱{(utilityData.reduce((sum, d) => sum + d.internet.amount, 0) / utilityData.length).toFixed(0)}
                                        </td>
                                    )}
                                    {selectedUtilities.includes('gas') && (
                                        <td className="px-6 py-4 text-right font-mono font-black text-red-700">
                                            ₱{(utilityData.reduce((sum, d) => sum + d.gas.amount, 0) / utilityData.length).toFixed(0)}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right font-mono font-black text-xl text-gray-900">
                                        ₱{(() => {
                                            let avgTotal = 0;
                                            if (selectedUtilities.includes('meralco')) avgTotal += utilityData.reduce((sum, d) => sum + d.meralco.amount, 0) / utilityData.length;
                                            if (selectedUtilities.includes('water')) avgTotal += utilityData.reduce((sum, d) => sum + d.water.amount, 0) / utilityData.length;
                                            if (selectedUtilities.includes('internet')) avgTotal += utilityData.reduce((sum, d) => sum + d.internet.amount, 0) / utilityData.length;
                                            if (selectedUtilities.includes('gas')) avgTotal += utilityData.reduce((sum, d) => sum + d.gas.amount, 0) / utilityData.length;
                                            return avgTotal.toFixed(0);
                                        })()}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* Visual Comparison Chart */}
                {selectedUtilities.length > 0 && (
                    <div className="p-8 border-t border-gray-200 bg-gradient-to-br from-white to-orange-50">
                        <h3 className="text-lg font-bold text-gray-800 mb-6">Visual Trend Comparison</h3>
                        <div className="h-64 flex items-end justify-between gap-2">
                            {utilityData.slice(-6).map((data, idx) => {
                                const maxAmount = Math.max(...utilityData.map(d => {
                                    let total = 0;
                                    if (selectedUtilities.includes('meralco')) total += d.meralco.amount;
                                    if (selectedUtilities.includes('water')) total += d.water.amount;
                                    if (selectedUtilities.includes('internet')) total += d.internet.amount;
                                    if (selectedUtilities.includes('gas')) total += d.gas.amount;
                                    return total;
                                }));
                                
                                return (
                                    <div key={idx} className="flex-1 flex flex-col gap-1">
                                        <div className="flex flex-col gap-1" style={{ height: '200px', justifyContent: 'flex-end' }}>
                                            {selectedUtilities.includes('meralco') && (
                                                <div 
                                                    className="w-full bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-sm hover:from-yellow-600 hover:to-yellow-500 transition-all cursor-pointer"
                                                    style={{ height: `${(data.meralco.amount / maxAmount) * 100}%`, minHeight: '4px' }}
                                                    title={`Meralco: ₱${data.meralco.amount.toLocaleString()}`}
                                                ></div>
                                            )}
                                            {selectedUtilities.includes('water') && (
                                                <div 
                                                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-sm hover:from-blue-600 hover:to-blue-500 transition-all cursor-pointer"
                                                    style={{ height: `${(data.water.amount / maxAmount) * 100}%`, minHeight: '4px' }}
                                                    title={`Water: ₱${data.water.amount.toLocaleString()}`}
                                                ></div>
                                            )}
                                            {selectedUtilities.includes('internet') && (
                                                <div 
                                                    className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-sm hover:from-indigo-600 hover:to-indigo-500 transition-all cursor-pointer"
                                                    style={{ height: `${(data.internet.amount / maxAmount) * 100}%`, minHeight: '4px' }}
                                                    title={`Internet: ₱${data.internet.amount.toLocaleString()}`}
                                                ></div>
                                            )}
                                            {selectedUtilities.includes('gas') && (
                                                <div 
                                                    className="w-full bg-gradient-to-t from-red-500 to-red-400 rounded-sm hover:from-red-600 hover:to-red-500 transition-all cursor-pointer"
                                                    style={{ height: `${(data.gas.amount / maxAmount) * 100}%`, minHeight: '4px' }}
                                                    title={`Gas: ₱${data.gas.amount.toLocaleString()}`}
                                                ></div>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-600 font-bold text-center mt-2">{data.month.split(' ')[0]}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 justify-center mt-6">
                            {selectedUtilities.includes('meralco') && (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                                    <span className="text-sm font-bold text-gray-700">Meralco</span>
                                </div>
                            )}
                            {selectedUtilities.includes('water') && (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                    <span className="text-sm font-bold text-gray-700">Water</span>
                                </div>
                            )}
                            {selectedUtilities.includes('internet') && (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-indigo-500 rounded"></div>
                                    <span className="text-sm font-bold text-gray-700">Internet</span>
                                </div>
                            )}
                            {selectedUtilities.includes('gas') && (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                                    <span className="text-sm font-bold text-gray-700">Gas</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
            </div>
        </div>
    );
};

export default UtilityTracker;
