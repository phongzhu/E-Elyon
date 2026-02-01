import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, TrendingUp, Church } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';

const OfferingRecords = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offeringData, setOfferingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userBranchId, setUserBranchId] = useState(null);
  
  useEffect(() => {
    fetchUserBranch();
  }, []);

  useEffect(() => {
    if (userBranchId !== null) {
      fetchOfferingRecords();
    }
  }, [startDate, endDate, userBranchId]);

  const fetchUserBranch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user_details_id from users table
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

      setUserBranchId(userDetails?.branch_id || null);
    } catch (error) {
      console.error('Error fetching user branch:', error);
    }
  };

  const fetchOfferingRecords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('donations')
        .select(`
          donation_id,
          donation_date,
          amount,
          series_id,
          event_series (
            series_id,
            title,
            starts_on,
            branch_id
          )
        `)
        .not('series_id', 'is', null);

      if (startDate) {
        query = query.gte('donation_date', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('donation_date', `${endDate}T23:59:59.999`);
      }

      const { data, error } = await query.order('donation_date', { ascending: false });

      if (error) throw error;

      // Filter by user's branch_id
      const filteredData = data.filter(donation => {
        const eventBranchId = donation.event_series?.branch_id;
        // If user has no branch, show all
        if (!userBranchId) return true;
        // If event has no branch, skip it
        if (!eventBranchId) return false;
        // Show only matching branch
        return eventBranchId === userBranchId;
      });

      // Get unique branch_ids to fetch branch names
      const branchIds = [...new Set(filteredData.map(d => d.event_series?.branch_id).filter(Boolean))];
      
      // Fetch branch names separately
      const { data: branchesData } = await supabase
        .from('branches')
        .select('branch_id, name')
        .in('branch_id', branchIds);
      
      const branchMap = {};
      if (branchesData) {
        branchesData.forEach(b => {
          branchMap[b.branch_id] = b.name;
        });
      }

      // Group by event series
      const groupedData = {};
      filteredData.forEach(donation => {
        const seriesId = donation.series_id;
        if (!groupedData[seriesId]) {
          const branchId = donation.event_series?.branch_id;
          groupedData[seriesId] = {
            series_id: seriesId,
            title: donation.event_series?.title || 'Unknown Event',
            date: donation.event_series?.starts_on || donation.donation_date.split('T')[0],
            branch_name: branchMap[branchId] || 'N/A',
            branch_id: branchId,
            total_amount: 0,
            donation_count: 0,
            donations: []
          };
        }
        groupedData[seriesId].total_amount += parseFloat(donation.amount);
        groupedData[seriesId].donation_count += 1;
        groupedData[seriesId].donations.push(donation);
      });

      // Convert to array and sort by date
      const offeringsArray = Object.values(groupedData).sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );

      setOfferingData(offeringsArray);
    } catch (error) {
      console.error('Error fetching offering records:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalOfferings = offeringData.reduce((sum, o) => sum + o.total_amount, 0);
  const totalEvents = offeringData.length;
  const totalDonations = offeringData.reduce((sum, o) => sum + o.donation_count, 0);
  const avgPerEvent = totalEvents > 0 ? totalOfferings / totalEvents : 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex flex-col flex-1">
        <Header />
        
        <div className="flex-1 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-10 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
          Offering Records
        </h1>
        <p className="text-gray-600 font-medium">Track donations per event/service</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign size={24} />
            <p className="text-green-100 text-xs font-semibold uppercase">Total Offerings</p>
          </div>
          <p className="text-4xl font-black">₱{totalOfferings.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Church className="text-green-600" size={24} />
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Events</p>
          </div>
          <p className="text-3xl font-black text-gray-900">{totalEvents}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-teal-600" size={24} />
            <p className="text-xs font-semibold text-gray-500 uppercase">Avg per Event</p>
          </div>
          <p className="text-3xl font-black text-green-700">₱{avgPerEvent.toLocaleString('en-PH', { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Calendar size={20} className="text-gray-500" />
            <span className="font-bold text-gray-700">Date Range:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors text-sm"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                >
                  Clear Dates
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Offerings Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Donations by Event</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : offeringData.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No offering records found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Event/Series Title</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Donation Count</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Avg per Person</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {offeringData.map(offering => (
                  <tr key={offering.series_id} className="hover:bg-green-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Calendar size={14} />
                        {new Date(offering.date).toLocaleDateString('en-PH')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Church size={16} className="text-green-600" />
                        <span className="font-bold text-gray-900">{offering.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{offering.branch_name}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-mono font-bold text-lg text-green-700">₱{offering.total_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users size={14} className="text-gray-500" />
                        <span className="font-bold text-gray-900">{offering.donation_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-sm font-semibold text-gray-700">
                        ₱{(offering.total_amount / offering.donation_count).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
      </div>
    </div>
  );
};

export default OfferingRecords;
