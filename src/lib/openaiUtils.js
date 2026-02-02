import OpenAI from 'openai';

// Lazy initialization to ensure env variables are loaded
let openaiClient = null;

const getOpenAIClient = () => {
  if (!openaiClient) {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key is not configured. Please add a valid key to your .env file.');
    }
    openaiClient = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Only for development - consider moving to backend in production
    });
  }
  return openaiClient;
};

/**
 * Generate budget proposal using OpenAI
 * @param {Object} data - Financial data including donations, expenses, branches
 * @param {Object} parameters - User parameters like growth rate, inflation
 * @returns {Promise<Object>} AI-generated budget proposal
 */
export const generateBudgetProposal = async (data, parameters = {}) => {
  try {
    const {
      donations,
      expenses,
      transactions,
      branches,
      currentYear = new Date().getFullYear(),
      expectedGrowth = parameters.expectedGrowth || 5,
      inflationRate = parameters.inflationRate || 3
    } = data;

    // Prepare structured data for AI
    const prompt = `You are a financial analyst for a church organization with multiple branches. Analyze the following financial data and generate a comprehensive yearly budget proposal for ${currentYear + 1}.

**FINANCIAL DATA FOR ${currentYear}:**

**Branches:**
${JSON.stringify(branches, null, 2)}

**Total Donations:** ₱${donations.total.toLocaleString()}
**Breakdown by Branch:**
${donations.byBranch.map(b => `- ${b.branchName}: ₱${b.amount.toLocaleString()} (${b.percentage}%)`).join('\n')}

**Total Expenses:** ₱${expenses.total.toLocaleString()}
**Breakdown by Category:**
${expenses.byCategory.map(c => `- ${c.categoryName}: ₱${c.amount.toLocaleString()} (${c.percentage}%)`).join('\n')}

**Breakdown by Branch:**
${expenses.byBranch.map(b => `- ${b.branchName}: ₱${b.amount.toLocaleString()}`).join('\n')}

**Transaction Summary:**
- Total Transactions: ${transactions.count}
- Average Monthly Donations: ₱${transactions.avgMonthlyDonations.toLocaleString()}
- Average Monthly Expenses: ₱${transactions.avgMonthlyExpenses.toLocaleString()}

**Parameters:**
- Expected Growth Rate: ${expectedGrowth}%
- Expected Inflation Rate: ${inflationRate}%

**INSTRUCTIONS:**
Generate a detailed budget proposal with the following structure. Return ONLY valid JSON without any markdown formatting or code blocks:

{
  "summary": {
    "totalBudget": number,
    "totalProjectedDonations": number,
    "totalProjectedExpenses": number,
    "projectedSurplus": number,
    "growthAssumptions": "text explanation",
    "keyRecommendations": ["recommendation1", "recommendation2", ...]
  },
  "branchBudgets": [
    {
      "branchId": number,
      "branchName": "string",
      "projectedDonations": number,
      "projectedExpenses": number,
      "breakdown": {
        "personnel": number,
        "utilities": number,
        "maintenance": number,
        "programs": number,
        "miscellaneous": number
      },
      "monthlyAllocation": number,
      "recommendations": ["specific recommendation for this branch"]
    }
  ],
  "categoryBudgets": [
    {
      "categoryName": "string",
      "projectedAmount": number,
      "justification": "why this amount"
    }
  ],
  "quarterlyProjections": [
    {
      "quarter": "Q1",
      "projectedDonations": number,
      "projectedExpenses": number
    }
  ]
}

Base your projections on historical trends, seasonal patterns, and the provided growth/inflation parameters. Be realistic and conservative in estimates.`;

    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a professional financial analyst specializing in church and non-profit budgeting. Provide detailed, realistic budget projections based on historical data. Always return valid JSON without markdown formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content;
    const budgetProposal = JSON.parse(responseText);

    return {
      success: true,
      data: budgetProposal,
      generatedAt: new Date().toISOString(),
      metadata: {
        model: completion.model,
        tokensUsed: completion.usage.total_tokens
      }
    };

  } catch (error) {
    console.error('Error generating budget proposal:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Refine budget proposal based on user feedback
 * @param {Object} currentProposal - Current budget proposal
 * @param {String} feedback - User feedback or adjustment request
 * @returns {Promise<Object>} Refined budget proposal
 */
export const refineBudgetProposal = async (currentProposal, feedback) => {
  try {
    const prompt = `Given this budget proposal:

${JSON.stringify(currentProposal, null, 2)}

The user has provided this feedback or adjustment request:
"${feedback}"

Please refine the budget proposal according to the feedback. Return ONLY valid JSON in the same structure as the original proposal, without any markdown formatting or code blocks.`;

    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a financial analyst helping to refine budget proposals. Adjust the numbers and recommendations based on user feedback while maintaining financial prudence. Always return valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const refinedProposal = JSON.parse(completion.choices[0].message.content);

    return {
      success: true,
      data: refinedProposal
    };

  } catch (error) {
    console.error('Error refining budget proposal:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
