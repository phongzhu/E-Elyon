# AI Budget Proposal Setup Instructions

## 1. Add Your OpenAI API Key

Open the `.env` file and replace `your_openai_api_key_here` with your actual OpenAI API key:

```
REACT_APP_OPENAI_API_KEY=sk-your-actual-key-here
```

## 2. Get Your OpenAI API Key

If you don't have one yet:
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and paste it in the .env file

## 3. How to Use the Budget Proposal Feature

### For Finance Role:
1. Log in as a Finance user
2. Navigate to "AI Budget Proposal" in the sidebar (has a sparkles icon ✨)
3. Set parameters:
   - Target Year (default: next year)
   - Expected Growth Rate (%)
   - Inflation Rate (%)
4. Click "Generate Budget Proposal"
5. Wait for AI to analyze your data and generate the proposal

### Features Available:
- **View Proposal**: See AI-generated budget for all branches
- **Edit Mode**: Manually adjust any numbers
- **Export PDF**: Download formatted PDF report
- **Export Excel**: Download detailed Excel workbook with multiple sheets
- **Branch Budgets**: See breakdown per branch with:
  - Personnel costs
  - Utilities
  - Maintenance
  - Programs
  - Miscellaneous
- **Category Budgets**: AI justification for each expense category
- **Quarterly Projections**: Q1-Q4 breakdown

### For Bishop Approval:
- The proposal displays first for bishop review
- Bishop can approve before sharing with branches
- All data is based on last year's actual transactions
- AI provides growth assumptions and recommendations

## 4. Data Sources

The AI analyzes:
- All donations from last year (by branch)
- All expenses from last year (by category and branch)
- Transaction patterns and trends
- Account balances
- Historical spending patterns

## 5. Troubleshooting

**If generation fails:**
- Check that your OpenAI API key is correct
- Ensure you have data from last year in the database
- Check browser console for specific error messages
- Verify your OpenAI account has available credits

**API Cost:**
- Using GPT-4-turbo-preview
- Typical cost per generation: $0.10 - $0.30
- Depends on data volume

## 6. Security Notes

**Important:** The API key is currently exposed in the browser (client-side). For production:
- Consider moving OpenAI calls to a backend server
- Use environment variables properly
- Don't commit .env file to version control
- Keep your API key secure

## 7. Customization

You can adjust:
- Growth rate assumptions
- Inflation rates  
- Budget categories
- Manual edits to any proposed amounts
- Branch-specific allocations

All changes can be saved before exporting!
