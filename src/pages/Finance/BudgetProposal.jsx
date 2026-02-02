import React, { useState, useEffect } from 'react';
import { Sparkles, Download, FileText, TrendingUp, Edit, Save, X, AlertCircle, CheckCircle, Building, DollarSign, Calendar } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';
import { generateBudgetProposal, refineBudgetProposal } from '../../lib/openaiUtils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const BudgetProposal = () => {
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [proposal, setProposal] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editedProposal, setEditedProposal] = useState(null);
    const [parameters, setParameters] = useState({
        expectedGrowth: 5,
        inflationRate: 3,
        year: new Date().getFullYear() + 1
    });
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: userData } = await supabase
                .from('users')
                .select('user_id, role, users_details!users_user_details_id_fkey(*)')
                .eq('auth_user_id', user.id)
                .limit(1)
                .single();

            setCurrentUser(userData);
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    };

    const fetchFinancialData = async () => {
        try {
            const lastYear = new Date().getFullYear() - 1;
            const startDate = `${lastYear}-01-01`;
            const endDate = `${lastYear}-12-31`;

            // Fetch branches
            const { data: branches } = await supabase
                .from('branches')
                .select('branch_id, name, city, province');

            // Fetch donations from donations table joined with transactions for branch_id
            const { data: donationRecords } = await supabase
                .from('donations')
                .select(`
                    donation_id,
                    amount,
                    donation_date,
                    transactions!inner(branch_id, branches(name))
                `)
                .gte('donation_date', startDate)
                .lte('donation_date', endDate);

            // Fetch expenses from expenses table with items
            const { data: expenseRecords } = await supabase
                .from('expenses')
                .select(`
                    expense_id,
                    billing_period,
                    expense_categories(category_name),
                    expense_items(total_price),
                    transactions!inner(branch_id, branches(name))
                `)
                .gte('billing_period', startDate)
                .lte('billing_period', endDate);

            // Process donations
            const donations = donationRecords || [];
            const totalDonations = donations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
            const donationsByBranch = branches.map(branch => {
                const branchDonations = donations.filter(d => 
                    d.transactions?.branch_id === branch.branch_id
                );
                const amount = branchDonations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
                return {
                    branchId: branch.branch_id,
                    branchName: branch.name,
                    amount,
                    percentage: totalDonations > 0 ? ((amount / totalDonations) * 100).toFixed(2) : 0
                };
            });

            // Process expenses with items
            const expenses = expenseRecords || [];
            const expensesWithTotals = expenses.map(exp => {
                const items = Array.isArray(exp.expense_items) ? exp.expense_items : [];
                const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);
                return {
                    ...exp,
                    totalAmount,
                    category: exp.expense_categories?.category_name || 'Uncategorized',
                    branch_id: exp.transactions?.branch_id
                };
            });

            const totalExpenses = expensesWithTotals.reduce((sum, e) => sum + e.totalAmount, 0);
            
            const expensesByCategory = {};
            expensesWithTotals.forEach(exp => {
                if (!expensesByCategory[exp.category]) {
                    expensesByCategory[exp.category] = 0;
                }
                expensesByCategory[exp.category] += exp.totalAmount;
            });

            const expensesByCategoryArray = Object.entries(expensesByCategory).map(([name, amount]) => ({
                categoryName: name,
                amount,
                percentage: totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(2) : 0
            }));

            const expensesByBranch = branches.map(branch => {
                const branchExpenses = expensesWithTotals.filter(e => e.branch_id === branch.branch_id);
                const amount = branchExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
                return {
                    branchId: branch.branch_id,
                    branchName: branch.name,
                    amount
                };
            });

            return {
                donations: {
                    total: totalDonations,
                    byBranch: donationsByBranch
                },
                expenses: {
                    total: totalExpenses,
                    byCategory: expensesByCategoryArray,
                    byBranch: expensesByBranch
                },
                transactions: {
                    count: donations.length + expenses.length,
                    avgMonthlyDonations: totalDonations / 12,
                    avgMonthlyExpenses: totalExpenses / 12
                },
                branches: branches.map(b => ({ id: b.branch_id, name: b.name, location: `${b.city}, ${b.province}` })),
                currentYear: lastYear,
                expectedGrowth: parameters.expectedGrowth,
                inflationRate: parameters.inflationRate
            };
        } catch (error) {
            console.error('Error fetching financial data:', error);
            throw error;
        }
    };

    const handleGenerateProposal = async () => {
        setGenerating(true);
        setShowError(false);
        
        try {
            const financialData = await fetchFinancialData();
            const result = await generateBudgetProposal(financialData, parameters);

            if (result.success) {
                setProposal(result.data);
                setEditedProposal(JSON.parse(JSON.stringify(result.data)));
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            } else {
                setErrorMessage(result.error || 'Failed to generate proposal');
                setShowError(true);
            }
        } catch (error) {
            setErrorMessage(error.message);
            setShowError(true);
        } finally {
            setGenerating(false);
        }
    };

    const handleEditBranch = (branchIndex, field, value) => {
        const updated = { ...editedProposal };
        updated.branchBudgets[branchIndex][field] = parseFloat(value) || 0;
        setEditedProposal(updated);
    };

    const handleSaveEdits = () => {
        setProposal(editedProposal);
        setEditMode(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const handleCancelEdit = () => {
        setEditedProposal(JSON.parse(JSON.stringify(proposal)));
        setEditMode(false);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        // Title Page
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('Annual Budget Proposal', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`For Year: ${parameters.year}`, pageWidth / 2, 28, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 35, { align: 'center' });

        let yPos = 45;

        // Executive Summary
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Executive Summary', 14, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const summaryData = [
            ['Total Budget', `₱${formatCurrency(proposal.summary.totalBudget)}`],
            ['Projected Donations', `₱${formatCurrency(proposal.summary.totalProjectedDonations)}`],
            ['Projected Expenses', `₱${formatCurrency(proposal.summary.totalProjectedExpenses)}`],
            ['Projected Surplus/Deficit', `₱${formatCurrency(proposal.summary.projectedSurplus)}`]
        ];

        doc.autoTable({
            startY: yPos,
            head: [['Item', 'Amount']],
            body: summaryData,
            theme: 'grid',
            headStyles: { fillColor: [26, 77, 46] }
        });

        yPos = doc.lastAutoTable.finalY + 10;

        // Branch Summary Table
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Branch Budget Allocations Summary', 14, yPos);
        yPos += 8;

        const branchData = proposal.branchBudgets.map(branch => [
            branch.branchName,
            `₱${formatCurrency(branch.projectedDonations)}`,
            `₱${formatCurrency(branch.projectedExpenses)}`,
            `₱${formatCurrency(branch.monthlyAllocation)}`
        ]);

        doc.autoTable({
            startY: yPos,
            head: [['Branch', 'Projected Donations', 'Projected Expenses', 'Monthly Allocation']],
            body: branchData,
            theme: 'striped',
            headStyles: { fillColor: [26, 77, 46] }
        });

        // Per-Branch Detailed Pages
        proposal.branchBudgets.forEach((branch, index) => {
            doc.addPage();
            
            // Branch Header
            doc.setFillColor(26, 77, 46);
            doc.rect(0, 0, pageWidth, 35, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text(`${branch.branchName} - Detailed Budget`, pageWidth / 2, 15, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Fiscal Year ${parameters.year}`, pageWidth / 2, 25, { align: 'center' });
            
            doc.setTextColor(0, 0, 0);
            yPos = 45;

            // Branch Financial Overview
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Financial Overview', 14, yPos);
            yPos += 6;

            const branchFinancials = [
                ['Projected Annual Donations', `₱${formatCurrency(branch.projectedDonations)}`],
                ['Projected Annual Expenses', `₱${formatCurrency(branch.projectedExpenses)}`],
                ['Monthly Allocation', `₱${formatCurrency(branch.monthlyAllocation)}`],
                ['Net Position', `₱${formatCurrency(branch.projectedDonations - branch.projectedExpenses)}`]
            ];

            doc.autoTable({
                startY: yPos,
                head: [['Item', 'Amount']],
                body: branchFinancials,
                theme: 'grid',
                headStyles: { fillColor: [26, 77, 46] },
                margin: { left: 14 }
            });

            yPos = doc.lastAutoTable.finalY + 10;

            // Expense Breakdown by Category
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Monthly Expense Breakdown', 14, yPos);
            yPos += 6;

            const breakdownData = Object.entries(branch.breakdown).map(([category, amount]) => [
                category.charAt(0).toUpperCase() + category.slice(1),
                `₱${formatCurrency(amount)}`,
                `${((amount / branch.monthlyAllocation) * 100).toFixed(1)}%`
            ]);

            doc.autoTable({
                startY: yPos,
                head: [['Category', 'Monthly Amount', 'Percentage']],
                body: breakdownData,
                theme: 'striped',
                headStyles: { fillColor: [122, 40, 40] },
                margin: { left: 14 }
            });

            yPos = doc.lastAutoTable.finalY + 10;

            // Quarterly Breakdown
            if (yPos > 200) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Quarterly Projections', 14, yPos);
            yPos += 6;

            const quarterlyData = [
                ['Q1 (Jan-Mar)', `₱${formatCurrency(branch.projectedDonations / 4)}`, `₱${formatCurrency(branch.projectedExpenses / 4)}`],
                ['Q2 (Apr-Jun)', `₱${formatCurrency(branch.projectedDonations / 4)}`, `₱${formatCurrency(branch.projectedExpenses / 4)}`],
                ['Q3 (Jul-Sep)', `₱${formatCurrency(branch.projectedDonations / 4)}`, `₱${formatCurrency(branch.projectedExpenses / 4)}`],
                ['Q4 (Oct-Dec)', `₱${formatCurrency(branch.projectedDonations / 4)}`, `₱${formatCurrency(branch.projectedExpenses / 4)}`]
            ];

            doc.autoTable({
                startY: yPos,
                head: [['Quarter', 'Projected Donations', 'Projected Expenses']],
                body: quarterlyData,
                theme: 'grid',
                headStyles: { fillColor: [26, 77, 46] },
                margin: { left: 14 }
            });

            yPos = doc.lastAutoTable.finalY + 10;

            // Recommendations
            if (branch.recommendations && branch.recommendations.length > 0) {
                if (yPos > 220) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('Strategic Recommendations', 14, yPos);
                yPos += 6;

                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                branch.recommendations.forEach((rec, idx) => {
                    const lines = doc.splitTextToSize(`${idx + 1}. ${rec}`, pageWidth - 28);
                    doc.text(lines, 14, yPos);
                    yPos += lines.length * 5 + 3;

                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
            }
        });

        // Save
        doc.save(`Budget_Proposal_${parameters.year}.pdf`);
    };

    const exportToExcel = () => {
        // Summary Sheet
        const summaryData = [
            ['Annual Budget Proposal'],
            [`For Year: ${parameters.year}`],
            [`Generated: ${new Date().toLocaleDateString()}`],
            [],
            ['Executive Summary'],
            ['Item', 'Amount'],
            ['Total Budget', proposal.summary.totalBudget],
            ['Projected Donations', proposal.summary.totalProjectedDonations],
            ['Projected Expenses', proposal.summary.totalProjectedExpenses],
            ['Projected Surplus/Deficit', proposal.summary.projectedSurplus],
            [],
            ['Growth Assumptions', proposal.summary.growthAssumptions]
        ];

        // Branch Budgets Summary Sheet
        const branchData = [
            ['Branch Budget Allocations Summary'],
            [],
            ['Branch', 'Projected Donations', 'Projected Expenses', 'Monthly Allocation', 'Personnel', 'Utilities', 'Maintenance', 'Programs', 'Miscellaneous'],
            ...proposal.branchBudgets.map(branch => [
                branch.branchName,
                branch.projectedDonations,
                branch.projectedExpenses,
                branch.monthlyAllocation,
                branch.breakdown.personnel,
                branch.breakdown.utilities,
                branch.breakdown.maintenance,
                branch.breakdown.programs,
                branch.breakdown.miscellaneous
            ])
        ];

        // Category Budgets Sheet
        const categoryData = [
            ['Category Budgets'],
            [],
            ['Category', 'Projected Amount', 'Justification'],
            ...proposal.categoryBudgets.map(cat => [
                cat.categoryName,
                cat.projectedAmount,
                cat.justification
            ])
        ];

        // Quarterly Projections Sheet
        const quarterlyData = [
            ['Quarterly Projections'],
            [],
            ['Quarter', 'Projected Donations', 'Projected Expenses'],
            ...proposal.quarterlyProjections.map(q => [
                q.quarter,
                q.projectedDonations,
                q.projectedExpenses
            ])
        ];

        // Create workbook
        const wb = XLSX.utils.book_new();
        
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        const wsBranches = XLSX.utils.aoa_to_sheet(branchData);
        const wsCategories = XLSX.utils.aoa_to_sheet(categoryData);
        const wsQuarterly = XLSX.utils.aoa_to_sheet(quarterlyData);

        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
        XLSX.utils.book_append_sheet(wb, wsBranches, 'All Branches');
        XLSX.utils.book_append_sheet(wb, wsCategories, 'Categories');
        XLSX.utils.book_append_sheet(wb, wsQuarterly, 'Quarterly');

        // Add individual sheet for each branch
        proposal.branchBudgets.forEach((branch, index) => {
            const branchDetailData = [
                [`${branch.branchName} - Detailed Budget`],
                [`Fiscal Year ${parameters.year}`],
                [],
                ['Financial Overview'],
                ['Item', 'Amount'],
                ['Projected Annual Donations', branch.projectedDonations],
                ['Projected Annual Expenses', branch.projectedExpenses],
                ['Monthly Allocation', branch.monthlyAllocation],
                ['Net Position', branch.projectedDonations - branch.projectedExpenses],
                [],
                ['Monthly Expense Breakdown'],
                ['Category', 'Amount', 'Percentage'],
                ...Object.entries(branch.breakdown).map(([category, amount]) => [
                    category.charAt(0).toUpperCase() + category.slice(1),
                    amount,
                    `${((amount / branch.monthlyAllocation) * 100).toFixed(1)}%`
                ]),
                [],
                ['Quarterly Projections'],
                ['Quarter', 'Projected Donations', 'Projected Expenses'],
                ['Q1 (Jan-Mar)', branch.projectedDonations / 4, branch.projectedExpenses / 4],
                ['Q2 (Apr-Jun)', branch.projectedDonations / 4, branch.projectedExpenses / 4],
                ['Q3 (Jul-Sep)', branch.projectedDonations / 4, branch.projectedExpenses / 4],
                ['Q4 (Oct-Dec)', branch.projectedDonations / 4, branch.projectedExpenses / 4],
                [],
                ['Strategic Recommendations'],
                ...(branch.recommendations || []).map((rec, idx) => [`${idx + 1}. ${rec}`])
            ];

            const wsBranchDetail = XLSX.utils.aoa_to_sheet(branchDetailData);
            // Truncate sheet name to 31 characters max (Excel limit)
            const sheetName = branch.branchName.substring(0, 28);
            XLSX.utils.book_append_sheet(wb, wsBranchDetail, sheetName);
        });

        XLSX.writeFile(wb, `Budget_Proposal_${parameters.year}.xlsx`);
    };

    const formatCurrency = (amount) => {
        return Math.abs(parseFloat(amount || 0)).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const displayProposal = editMode ? editedProposal : proposal;

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="mb-6 bg-gradient-to-r from-[#1a4d2e] to-[#2d7a4a] rounded-2xl p-6 text-white shadow-xl">
                            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                                <Sparkles className="text-yellow-300" size={36} />
                                AI Budget Proposal Generator
                            </h1>
                            <p className="text-green-100 text-lg">Generate intelligent budget proposals based on historical financial data using AI</p>
                        </div>

                        {/* Parameters Card */}
                        <div className="bg-white rounded-2xl shadow-xl border-2 border-green-200 p-6 mb-6">
                            <h2 className="text-xl font-bold text-[#1a4d2e] mb-4 flex items-center gap-2">
                                <Calendar size={24} className="text-[#7a2828]" />
                                Generation Parameters
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Target Year</label>
                                    <input
                                        type="number"
                                        value={parameters.year}
                                        onChange={(e) => setParameters({ ...parameters, year: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-[#1a4d2e] transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Expected Growth Rate (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={parameters.expectedGrowth}
                                        onChange={(e) => setParameters({ ...parameters, expectedGrowth: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-[#1a4d2e] transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Inflation Rate (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={parameters.inflationRate}
                                        onChange={(e) => setParameters({ ...parameters, inflationRate: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-[#1a4d2e] transition-all"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleGenerateProposal}
                                disabled={generating}
                                className="mt-6 w-full bg-gradient-to-r from-[#1a4d2e] to-[#2d7a4a] text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-[#153d24] hover:to-[#236438] transition-all shadow-2xl disabled:opacity-50 flex items-center justify-center gap-3 transform hover:scale-[1.02]"
                            >
                                {generating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Generating AI Proposal...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} />
                                        Generate Budget Proposal
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Success/Error Messages */}
                        {showSuccess && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                                <CheckCircle className="text-green-600" size={24} />
                                <p className="text-green-800 font-semibold">Budget proposal generated successfully!</p>
                            </div>
                        )}

                        {showError && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                                <AlertCircle className="text-red-600" size={24} />
                                <p className="text-red-800 font-semibold">{errorMessage}</p>
                            </div>
                        )}

                        {/* Proposal Display */}
                        {displayProposal && (
                            <>
                                {/* Action Buttons */}
                                <div className="flex gap-3 mb-6">
                                    {!editMode ? (
                                        <>
                                            <button
                                                onClick={() => setEditMode(true)}
                                                className="flex-1 bg-[#1a4d2e] text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-[#153d24] transition-all flex items-center justify-center gap-2"
                                            >
                                                <Edit size={18} />
                                                Edit Proposal
                                            </button>
                                            <button
                                                onClick={exportToPDF}
                                                className="flex-1 bg-[#7a2828] text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-[#5f1f1f] transition-all flex items-center justify-center gap-2"
                                            >
                                                <FileText size={18} />
                                                Export PDF
                                            </button>
                                            <button
                                                onClick={exportToExcel}
                                                className="flex-1 bg-[#1a4d2e] text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-[#153d24] transition-all flex items-center justify-center gap-2"
                                            >
                                                <Download size={18} />
                                                Export Excel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={handleSaveEdits}
                                                className="flex-1 bg-[#1a4d2e] text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-[#153d24] transition-all flex items-center justify-center gap-2"
                                            >
                                                <Save size={18} />
                                                Save Changes
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="flex-1 bg-gray-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                                            >
                                                <X size={18} />
                                                Cancel
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Executive Summary */}
                                <div className="bg-gradient-to-br from-[#1a4d2e] via-[#2d7a4a] to-[#1a4d2e] rounded-2xl shadow-2xl p-8 mb-6 text-white border-2 border-green-400">
                                    <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                        <DollarSign size={32} className="text-yellow-300" />
                                        Executive Summary
                                    </h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div className="bg-white bg-opacity-20 rounded-lg p-4">
                                            <p className="text-sm opacity-90 mb-1">Total Budget</p>
                                            <p className="text-2xl font-bold">₱{formatCurrency(displayProposal.summary.totalBudget)}</p>
                                        </div>
                                        <div className="bg-white bg-opacity-20 rounded-lg p-4">
                                            <p className="text-sm opacity-90 mb-1">Projected Donations</p>
                                            <p className="text-2xl font-bold">₱{formatCurrency(displayProposal.summary.totalProjectedDonations)}</p>
                                        </div>
                                        <div className="bg-white bg-opacity-20 rounded-lg p-4">
                                            <p className="text-sm opacity-90 mb-1">Projected Expenses</p>
                                            <p className="text-2xl font-bold">₱{formatCurrency(displayProposal.summary.totalProjectedExpenses)}</p>
                                        </div>
                                        <div className="bg-white bg-opacity-20 rounded-lg p-4">
                                            <p className="text-sm opacity-90 mb-1">Surplus/Deficit</p>
                                            <p className="text-2xl font-bold">₱{formatCurrency(displayProposal.summary.projectedSurplus)}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-4">
                                        <p className="font-semibold mb-2">Growth Assumptions:</p>
                                        <p className="text-sm opacity-90">{displayProposal.summary.growthAssumptions}</p>
                                    </div>
                                    <div className="bg-white bg-opacity-20 rounded-lg p-4">
                                        <p className="font-semibold mb-2">Key Recommendations:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            {displayProposal.summary.keyRecommendations.map((rec, idx) => (
                                                <li key={idx} className="text-sm opacity-90">{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Branch Budgets Summary */}
                                <div className="bg-white rounded-2xl shadow-xl border-2 border-green-200 p-6 mb-6">
                                    <h2 className="text-2xl font-bold text-[#1a4d2e] mb-4 flex items-center gap-2">
                                        <Building size={24} className="text-[#7a2828]" />
                                        Branch Budget Allocations Summary
                                    </h2>
                                    <div className="space-y-4">
                                        {displayProposal.branchBudgets.map((branch, index) => (
                                            <div key={index} className="border-2 border-green-200 rounded-xl p-4 hover:shadow-lg hover:border-green-300 transition-all bg-gradient-to-r from-green-50 to-emerald-50">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-lg font-bold text-[#1a4d2e]">{branch.branchName}</h3>
                                                    <div className="text-right">
                                                        <p className="text-sm text-gray-600">Monthly Allocation</p>
                                                        {editMode ? (
                                                            <input
                                                                type="number"
                                                                value={branch.monthlyAllocation}
                                                                onChange={(e) => handleEditBranch(index, 'monthlyAllocation', e.target.value)}
                                                                className="text-xl font-bold text-[#1a4d2e] border-2 border-gray-300 rounded px-2 py-1 text-right"
                                                            />
                                                        ) : (
                                                            <p className="text-xl font-bold text-[#1a4d2e]">₱{formatCurrency(branch.monthlyAllocation)}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                                                    {Object.entries(branch.breakdown).map(([key, value]) => (
                                                        <div key={key} className="bg-white border border-green-200 rounded-lg p-3 hover:shadow-md transition-all">
                                                            <p className="text-xs text-gray-600 mb-1 capitalize">{key}</p>
                                                            {editMode ? (
                                                                <input
                                                                    type="number"
                                                                    value={value}
                                                                    onChange={(e) => {
                                                                        const updated = { ...editedProposal };
                                                                        updated.branchBudgets[index].breakdown[key] = parseFloat(e.target.value) || 0;
                                                                        setEditedProposal(updated);
                                                                    }}
                                                                    className="text-sm font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1 w-full"
                                                                />
                                                            ) : (
                                                                <p className="text-sm font-semibold text-gray-900">₱{formatCurrency(value)}</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                {branch.recommendations && branch.recommendations.length > 0 && (
                                                    <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                                                        <p className="text-sm font-semibold text-[#1a4d2e] mb-1">Recommendations:</p>
                                                        <ul className="list-disc list-inside text-sm text-green-800">
                                                            {branch.recommendations.map((rec, idx) => (
                                                                <li key={idx}>{rec}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Detailed Per-Branch Documentation Pages */}
                                <div className="bg-white rounded-2xl shadow-xl border-2 border-green-200 p-6 mb-6">
                                    <h2 className="text-2xl font-bold text-[#1a4d2e] mb-4 flex items-center gap-2">
                                        <FileText size={24} className="text-[#7a2828]" />
                                        Detailed Branch Reports
                                    </h2>
                                    <p className="text-gray-600 mb-6">Click on any branch to view comprehensive budget documentation</p>
                                    <div className="space-y-6">
                                        {displayProposal.branchBudgets.map((branch, index) => (
                                            <div key={index} className="border-2 border-green-300 rounded-2xl overflow-hidden bg-gradient-to-br from-white to-green-50 shadow-lg hover:shadow-2xl transition-all">
                                                {/* Branch Header */}
                                                <div className="bg-gradient-to-r from-[#1a4d2e] to-[#2d7a4a] p-6 text-white">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h3 className="text-2xl font-bold mb-1">{branch.branchName}</h3>
                                                            <p className="text-green-100">Fiscal Year {parameters.year} - Detailed Budget Report</p>
                                                        </div>
                                                        <Building size={40} className="text-green-200" />
                                                    </div>
                                                </div>

                                                {/* Financial Overview */}
                                                <div className="p-6 border-b-2 border-green-200">
                                                    <h4 className="text-lg font-bold text-[#1a4d2e] mb-4">Financial Overview</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        <div className="bg-gradient-to-br from-[#1a4d2e] to-[#2d7a4a] rounded-xl p-4 text-white">
                                                            <p className="text-xs opacity-90 mb-1">Annual Donations</p>
                                                            <p className="text-xl font-bold">₱{formatCurrency(branch.projectedDonations)}</p>
                                                        </div>
                                                        <div className="bg-gradient-to-br from-[#7a2828] to-[#a83c3c] rounded-xl p-4 text-white">
                                                            <p className="text-xs opacity-90 mb-1">Annual Expenses</p>
                                                            <p className="text-xl font-bold">₱{formatCurrency(branch.projectedExpenses)}</p>
                                                        </div>
                                                        <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl p-4 text-white">
                                                            <p className="text-xs opacity-90 mb-1">Monthly Allocation</p>
                                                            <p className="text-xl font-bold">₱{formatCurrency(branch.monthlyAllocation)}</p>
                                                        </div>
                                                        <div className={`bg-gradient-to-br ${branch.projectedDonations - branch.projectedExpenses >= 0 ? 'from-blue-600 to-cyan-600' : 'from-orange-600 to-red-600'} rounded-xl p-4 text-white`}>
                                                            <p className="text-xs opacity-90 mb-1">Net Position</p>
                                                            <p className="text-xl font-bold">₱{formatCurrency(branch.projectedDonations - branch.projectedExpenses)}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Monthly Expense Breakdown */}
                                                <div className="p-6 border-b-2 border-green-200">
                                                    <h4 className="text-lg font-bold text-[#1a4d2e] mb-4">Monthly Expense Breakdown</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                        {Object.entries(branch.breakdown).map(([category, amount]) => (
                                                            <div key={category} className="bg-white border-2 border-green-200 rounded-xl p-4 hover:shadow-lg transition-all">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <p className="text-xs font-semibold text-gray-600 capitalize">{category}</p>
                                                                    <DollarSign size={16} className="text-[#7a2828]" />
                                                                </div>
                                                                <p className="text-lg font-bold text-[#1a4d2e]">₱{formatCurrency(amount)}</p>
                                                                <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                                                                    <div 
                                                                        className="bg-gradient-to-r from-[#1a4d2e] to-[#2d7a4a] h-full rounded-full"
                                                                        style={{ width: `${(amount / branch.monthlyAllocation * 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                                <p className="text-xs text-gray-500 mt-1">{((amount / branch.monthlyAllocation) * 100).toFixed(1)}% of budget</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Quarterly Projections */}
                                                <div className="p-6 border-b-2 border-green-200">
                                                    <h4 className="text-lg font-bold text-[#1a4d2e] mb-4">Quarterly Projections</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'].map((quarter, qIdx) => (
                                                            <div key={qIdx} className="border-2 border-green-200 rounded-xl p-4 bg-white hover:shadow-lg transition-all">
                                                                <h5 className="font-bold text-[#1a4d2e] mb-3 text-center">{quarter}</h5>
                                                                <div className="space-y-2">
                                                                    <div className="bg-gradient-to-r from-[#1a4d2e] to-[#2d7a4a] rounded-lg p-2 text-white">
                                                                        <p className="text-xs opacity-90">Donations</p>
                                                                        <p className="font-bold">₱{formatCurrency(branch.projectedDonations / 4)}</p>
                                                                    </div>
                                                                    <div className="bg-gradient-to-r from-[#7a2828] to-[#a83c3c] rounded-lg p-2 text-white">
                                                                        <p className="text-xs opacity-90">Expenses</p>
                                                                        <p className="font-bold">₱{formatCurrency(branch.projectedExpenses / 4)}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Strategic Recommendations */}
                                                {branch.recommendations && branch.recommendations.length > 0 && (
                                                    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50">
                                                        <h4 className="text-lg font-bold text-[#1a4d2e] mb-4 flex items-center gap-2">
                                                            <AlertCircle size={20} className="text-[#7a2828]" />
                                                            Strategic Recommendations
                                                        </h4>
                                                        <div className="space-y-3">
                                                            {branch.recommendations.map((rec, idx) => (
                                                                <div key={idx} className="bg-white border-l-4 border-[#1a4d2e] rounded-r-lg p-4 shadow-md hover:shadow-lg transition-all">
                                                                    <div className="flex items-start gap-3">
                                                                        <div className="bg-[#1a4d2e] text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                                                                            {idx + 1}
                                                                        </div>
                                                                        <p className="text-gray-700 flex-1">{rec}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Category Budgets */}
                                <div className="bg-white rounded-2xl shadow-xl border-2 border-green-200 p-6 mb-6">
                                    <h2 className="text-2xl font-bold text-[#1a4d2e] mb-4 flex items-center gap-2">
                                        <DollarSign size={24} className="text-[#7a2828]" />
                                        Category Budgets
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {displayProposal.categoryBudgets.map((category, idx) => (
                                            <div key={idx} className="border-2 border-green-200 rounded-lg p-4 bg-gradient-to-br from-green-50 to-white hover:shadow-lg transition-all">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-bold text-[#1a4d2e]">{category.categoryName}</h3>
                                                    <p className="text-lg font-bold text-[#7a2828]">₱{formatCurrency(category.projectedAmount)}</p>
                                                </div>
                                                <p className="text-sm text-gray-600 italic">{category.justification}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Quarterly Projections */}
                                <div className="bg-white rounded-2xl shadow-xl border-2 border-green-200 p-6">
                                    <h2 className="text-2xl font-bold text-[#1a4d2e] mb-4 flex items-center gap-2">
                                        <Calendar size={24} className="text-[#7a2828]" />
                                        Quarterly Projections
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        {displayProposal.quarterlyProjections.map((quarter, idx) => (
                                            <div key={idx} className="border-2 border-green-200 rounded-lg p-4 bg-gradient-to-br from-green-50 to-white hover:shadow-lg transition-all">
                                                <h3 className="font-bold text-[#1a4d2e] mb-3 text-center text-lg">{quarter.quarter}</h3>
                                                <div className="space-y-2">
                                                    <div className="bg-gradient-to-br from-[#1a4d2e] to-[#2d7a4a] text-white rounded-lg p-3">
                                                        <p className="text-xs opacity-90">Donations</p>
                                                        <p className="text-lg font-bold">₱{formatCurrency(quarter.projectedDonations)}</p>
                                                    </div>
                                                    <div className="bg-gradient-to-br from-[#7a2828] to-[#a83c3c] text-white rounded-lg p-3">
                                                        <p className="text-xs opacity-90">Expenses</p>
                                                        <p className="text-lg font-bold">₱{formatCurrency(quarter.projectedExpenses)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BudgetProposal;
