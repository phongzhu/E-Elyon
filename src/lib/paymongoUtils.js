// PayMongo API utilities
// Note: Replace with your actual PayMongo secret key
const PAYMONGO_SECRET_KEY = process.env.REACT_APP_PAYMONGO_SECRET_KEY || 'sk_test_your_secret_key';
const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

// Bank codes for PayMongo
export const BANK_CODES = {
  BDO: 'bdo',
  BPI: 'bpi',
  UNIONBANK: 'ubp',
  RCBC: 'rcbc',
  METROBANK: 'mbtc',
  CHINABANK: 'chinabank',
  SECURITYBANK: 'securitybank',
  LANDBANK: 'lbp',
  PNB: 'pnb',
  DBP: 'dbp',
  MAYBANK: 'maybank',
  AUB: 'aub',
  EWBANK: 'ewb',
  PSBANK: 'psbank',
  ROBINSONSBANK: 'robinsonsbank',
};

/**
 * Create a PayMongo Source for GCash/GrabPay payment
 * @param {number} amount - Amount in pesos (will be converted to centavos)
 * @param {string} type - 'gcash' or 'grab_pay'
 * @param {object} billing - Billing details { name, email, phone }
 * @returns {Promise<object>} PayMongo source object
 */
export const createPayMongoSource = async (amount, type, billing) => {
  try {
    const response = await fetch(`${PAYMONGO_API_URL}/sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(PAYMONGO_SECRET_KEY + ':')}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amount * 100), // Convert to centavos
            redirect: {
              success: `${window.location.origin}/bishop/transfer-approvals?payment=success`,
              failed: `${window.location.origin}/bishop/transfer-approvals?payment=failed`,
            },
            type: type,
            currency: 'PHP',
            billing: {
              name: billing.name,
              email: billing.email,
              phone: billing.phone,
            },
          },
        },
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.detail || 'Failed to create PayMongo source');
    }

    return data.data;
  } catch (error) {
    console.error('Error creating PayMongo source:', error);
    throw error;
  }
};

/**
 * Create a PayMongo Payout
 * @param {number} amount - Amount in pesos (will be converted to centavos)
 * @param {object} recipient - Recipient details { name, accountNumber, bankCode }
 * @returns {Promise<object>} PayMongo payout object
 */
export const createPayMongoPayout = async (amount, recipient) => {
  try {
    const response = await fetch(`${PAYMONGO_API_URL}/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(PAYMONGO_SECRET_KEY + ':')}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amount * 100), // Convert to centavos
            currency: 'PHP',
            recipient: {
              name: recipient.name,
              account_number: recipient.accountNumber,
              bank_code: recipient.bankCode,
            },
          },
        },
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.detail || 'Failed to create PayMongo payout');
    }

    return data.data;
  } catch (error) {
    console.error('Error creating PayMongo payout:', error);
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
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(PAYMONGO_SECRET_KEY + ':')}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.detail || 'Failed to get payout status');
    }

    return data.data;
  } catch (error) {
    console.error('Error getting payout status:', error);
    throw error;
  }
};

/**
 * Get PayMongo Source Status (to verify payment)
 * @param {string} sourceId - PayMongo source ID
 * @returns {Promise<object>} PayMongo source object with status
 */
export const getSourceStatus = async (sourceId) => {
  try {
    const response = await fetch(`${PAYMONGO_API_URL}/sources/${sourceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(PAYMONGO_SECRET_KEY + ':')}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.detail || 'Failed to get source status');
    }

    return data.data;
  } catch (error) {
    console.error('Error getting source status:', error);
    throw error;
  }
};
