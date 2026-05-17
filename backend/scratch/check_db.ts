import { initDatabase, queryAll } from '../src/database';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  await initDatabase();
  
  console.log('--- LEADS COUNT ---');
  const leadsCount = queryAll('SELECT COUNT(*) as c FROM leads')[0]?.c;
  console.log(`Total Leads: ${leadsCount}`);

  console.log('\n--- AI ANALYSIS COUNT ---');
  const aiCount = queryAll('SELECT COUNT(*) as c FROM ai_analysis')[0]?.c;
  console.log(`Total AI Analysis Rows: ${aiCount}`);

  if (aiCount > 0) {
    console.log('\n--- SAMPLE AI ANALYSIS ---');
    const samples = queryAll('SELECT lead_id, suggested_outreach_hooks, summary, analyzed_at FROM ai_analysis LIMIT 3');
    console.log(JSON.stringify(samples, null, 2));
  } else {
    console.log('\nNo AI Analysis rows found! This explains why no hooks are appearing.');
  }
}

main().catch(console.error);
