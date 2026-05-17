// Load env variables first before importing any services
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { initDatabase, queryAll } from '../src/database';

async function main() {
  await initDatabase();
  
  // Dynamically import the service after env is loaded
  const { analyzeLead } = await import('../src/services/ai.service');

  console.log('Fetching first 3 leads...');
  const leads = queryAll('SELECT id, business_name FROM leads LIMIT 3');
  console.log('Leads to analyze:', leads);

  for (const lead of leads) {
    console.log(`\nAnalyzing lead: ${lead.business_name} (ID: ${lead.id})...`);
    try {
      const result = await analyzeLead(lead.id);
      if (result) {
        console.log(`Success! Priority Score: ${result.priority_score}, Maturity: ${result.business_maturity}, Classification: ${result.classification}`);
        console.log(`Suggested Hooks:\n${result.suggested_outreach_hooks}`);
      } else {
        console.log('Failed to analyze: analyzeLead returned null');
      }
    } catch (err: any) {
      console.error(`Error analyzing lead ${lead.id}:`, err.message);
    }
  }
}

main().catch(console.error);
