// PayMongo API utilities for fund transfers
import { supabase } from './supabaseClient';

const PAYMONGO_SECRET_KEY = process.env.REACT_APP_PAYMONGO_SECRET_KEY;
const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

// Helper to encode credentials
const getAuthHeader = () => {
    return 'Basic ' + btoa(PAYMONGO_SECRET_KEY + ':');
};

/**
 * Create a PayMongo Source (for receiving funds)
 * @param {number} amount - Amount in cents (e.g., 10000 = ₱100.00)
 * @param {string} type - 'gcash' or 'grab_pay'
 * @param {object} billing - { name, email, phone }
 * @returns {Promise<object>} PayMongo source object
 */
export const createPayMongoSource = async (amount, type = 'gcash', billing) => {
    try {
        const response = await fetch(`${PAYMONGO_API_URL}/sources`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        amount: amount * 100, // Convert to cents
                        currency: 'PHP',
                        type: type,
                        redirect: {
                            success: `${window.location.origin}/bishop/transfer-approvals?status=success`,
                            failed: `${window.location.origin}/bishop/transfer-approvals?status=failed`
                        },
                        billing: billing
                    }
                }
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.errors?.[0]?.detail || 'Failed to create source');
        
        return data.data;
    } catch (error) {
        console.error('PayMongo Source Error:', error);
        throw error;
    }
};

/**
 * Create PayMongo Payout (for sending funds to bank account)
 * @param {number} amount - Amount in pesos
 * @param {string} recipientId - PayMongo recipient ID
 * @param {string} description - Payout description
 * @returns {Promise<object>} PayMongo payout object
 */
export const createPayMongoPayout = async (amount, recipientId, description) => {
    try {
        const response = await fetch(`${PAYMONGO_API_URL}/payouts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        amount: amount * 100, // Convert to cents
                        currency: 'PHP',
                        recipient_id: recipientId,
                        description: description
                    }
                }
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.errors?.[0]?.detail || 'Failed to create payout');
        
        return data.data;
    } catch (error) {
        console.error('PayMongo Payout Error:', error);
        throw error;
    }
};

/**
 * Create PayMongo Recipient (bank account)
 * @param {object} details - { name, email, phone, bank_code, account_number, account_name, type }
 * @returns {Promise<object>} PayMongo recipient object
 */
export const createPayMongoRecipient = async (details) => {
    try {
        const response = await fetch(`${PAYMONGO_API_URL}/recipients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        name: details.name,
                        email: details.email,
                        phone: details.phone,
                        type: details.type || 'individual', // 'individual' or 'corporation'
                        bank_account: {
                            bank_code: details.bank_code, // e.g., 'bdo', 'bpi', 'ubp'
                            account_number: details.account_number,
                            account_name: details.account_name
                        }
                    }
                }
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.errors?.[0]?.detail || 'Failed to create recipient');
        
        return data.data;
    } catch (error) {
        console.error('PayMongo Recipient Error:', error);
        throw error;
    }
};

/**
 * Get PayMongo Payout Status
 * @param {string} payoutId - PayMongo payout ID
 * @returns {Promise<object>} PayMongo payout object with status
 */
export const getPayoutStatus = async (payoutId) => {
    try {
        const response = await fetch(`${PAYMONGO_API_URL}/payouts/${payoutId}`, {
            method: 'GET',
            headers: {
                'Authorization': getAuthHeader()
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.errors?.[0]?.detail || 'Failed to get payout status');
        
        return data.data;
    } catch (error) {
        console.error('PayMongo Status Error:', error);
        throw error;
    }
};

/**
 * Bank codes for PayMongo (Philippine Banks)
 */
export const BANK_CODES = {
    'BDO': 'bdo',
    'BPI': 'bpi',
    'UnionBank': 'ubp',
    'Metrobank': 'mbtc',
    'Landbank': 'lbp',
    'PNB': 'pnb',
    'Chinabank': 'chinabank',
    'Security Bank': 'securitybank',
    'RCBC': 'rcbc',
    'EastWest Bank': 'ewb'
};

export default {
    createPayMongoSource,
    createPayMongoPayout,
    createPayMongoRecipient,
    getPayoutStatus,
    BANK_CODES
};
