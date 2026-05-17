// ============================================================
// Lead Intelligence OS — SQLite Database (sql.js)
// ============================================================

// @ts-ignore
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

let db: SqlJsDatabase | null = null;
let dbPath: string = '';

/**
 * Initialize and return the database instance
 */
export async function initDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();

  dbPath = path.resolve(process.env.DATABASE_PATH || './data/leads.db');
  const dir = path.dirname(dbPath);

  // Ensure data directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    console.log(`[DB] Loaded existing database from ${dbPath}`);
  } else {
    db = new SQL.Database();
    console.log(`[DB] Created new database at ${dbPath}`);
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Initialize tables
  initializeTables(db);

  // Save to disk
  saveDatabase();

  return db;
}

/**
 * Get the current database instance (must call initDatabase first)
 */
export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Save database to disk
 */
export function saveDatabase(): void {
  if (!db || !dbPath) return;

  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('[DB] Failed to save database:', err);
  }
}

function initializeTables(db: SqlJsDatabase): void {
  db.run(`
    -- Leads Table
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      website TEXT,
      instagram TEXT,
      category TEXT,
      address TEXT,
      city TEXT,
      rating REAL,
      review_count INTEGER,
      score INTEGER DEFAULT 0,
      quality_label TEXT DEFAULT 'Unscored',
      status TEXT DEFAULT 'new',
      notes TEXT,
      tags TEXT,
      source TEXT DEFAULT 'import',
      source_id INTEGER,
      latitude REAL,
      longitude REAL,
      last_verified_at TEXT,
      ranking_reason TEXT,
      rejection_reason TEXT,
      last_contact_at TEXT,
      next_follow_up TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS import_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      source TEXT DEFAULT 'csv',
      total_rows INTEGER DEFAULT 0,
      imported_rows INTEGER DEFAULT 0,
      duplicate_rows INTEGER DEFAULT 0,
      failed_rows INTEGER DEFAULT 0,
      errors TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS validation_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      phone_valid INTEGER,
      phone_details TEXT,
      email_valid INTEGER,
      email_details TEXT,
      website_valid INTEGER,
      website_details TEXT,
      instagram_valid INTEGER,
      instagram_details TEXT,
      validated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      UNIQUE(lead_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      tags TEXT,
      business_style TEXT,
      audience_type TEXT,
      branding_quality TEXT,
      outreach_potential TEXT,
      summary TEXT,
      raw_response TEXT,
      model_used TEXT DEFAULT 'gemini',
      credibility_score INTEGER,
      opportunity_score INTEGER,
      responsiveness_likelihood TEXT,
      business_maturity TEXT,
      classification TEXT,
      analyzed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      UNIQUE(lead_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS scraping_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT DEFAULT 'pending',
      industry TEXT NOT NULL,
      city TEXT NOT NULL,
      filters TEXT,
      progress INTEGER DEFAULT 0,
      total_found INTEGER DEFAULT 0,
      validated_count INTEGER DEFAULT 0,
      rejected_count INTEGER DEFAULT 0,
      error_message TEXT,
      logs TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS provider_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_name TEXT NOT NULL,
      date TEXT NOT NULL,
      calls INTEGER DEFAULT 0,
      UNIQUE(provider_name, date)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS raw_provider_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      provider_name TEXT NOT NULL,
      raw_payload TEXT,
      lead_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES scraping_jobs(id) ON DELETE CASCADE,
      UNIQUE(job_id, provider_name)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS retest_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      status TEXT,
      logs TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )
  `);

  // Add source tracking to leads (wrap in try-catch in case they exist)
  try { db.run("ALTER TABLE leads ADD COLUMN source TEXT DEFAULT 'import'"); } catch (e) {}
  try { db.run("ALTER TABLE leads ADD COLUMN source_id INTEGER"); } catch (e) {}

  // Feature 8: CRM & Outreach Tracking
  try { db.run("ALTER TABLE leads ADD COLUMN last_contact_at TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE leads ADD COLUMN next_follow_up TEXT"); } catch (e) {}

  // AI Insights
  try { db.run("ALTER TABLE ai_analysis ADD COLUMN priority_score INTEGER DEFAULT 0"); } catch (e) {}
  try { db.run("ALTER TABLE ai_analysis ADD COLUMN priority_reasoning TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE ai_analysis ADD COLUMN competitor_weaknesses TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE ai_analysis ADD COLUMN website_seo_issues TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE ai_analysis ADD COLUMN suggested_outreach_hooks TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE scraping_jobs ADD COLUMN logs TEXT DEFAULT '[]'"); } catch (e) {}
  try { db.run("ALTER TABLE leads ADD COLUMN latitude REAL"); } catch (e) {}
  try { db.run("ALTER TABLE leads ADD COLUMN longitude REAL"); } catch (e) {}
  try { db.run("ALTER TABLE leads ADD COLUMN last_verified_at TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE leads ADD COLUMN ranking_reason TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE leads ADD COLUMN rejection_reason TEXT"); } catch (e) {}
  
  try { db.run("ALTER TABLE ai_analysis ADD COLUMN credibility_score INTEGER"); } catch (e) {}
  try { db.run("ALTER TABLE ai_analysis ADD COLUMN opportunity_score INTEGER"); } catch (e) {}
  try { db.run("ALTER TABLE ai_analysis ADD COLUMN responsiveness_likelihood TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE ai_analysis ADD COLUMN business_maturity TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE ai_analysis ADD COLUMN classification TEXT"); } catch (e) {}

  // --- AI OUTREACH ENGINE MODULE TABLES ---
  db.run(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      objective TEXT,
      offer TEXT,
      cta TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS campaign_leads (
      campaign_id INTEGER NOT NULL,
      lead_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending', -- pending, drafted, sent, replied
      draft_email_subject TEXT,
      draft_email_body TEXT,
      draft_whatsapp TEXT,
      PRIMARY KEY (campaign_id, lead_id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS outreach_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      campaign_id INTEGER,
      type TEXT NOT NULL, -- 'email', 'whatsapp', 'call', 'dm'
      status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'failed', 'replied'
      subject TEXT,
      content TEXT,
      sent_at TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS call_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      notes TEXT,
      outcome TEXT,
      duration INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_leads_business_name ON leads(business_name)',
    'CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category)',
    'CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score)',
    'CREATE INDEX IF NOT EXISTS idx_leads_quality_label ON leads(quality_label)',
    'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)',
    'CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city)',
    'CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_validation_lead_id ON validation_results(lead_id)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_ai_analysis_lead_id ON ai_analysis(lead_id)',
  ];
  indexes.forEach(sql => db!.run(sql));

  // Seed default settings
  const result = db.exec('SELECT COUNT(*) as count FROM settings');
  const count = result.length > 0 ? result[0].values[0][0] as number : 0;

  if (count === 0) {
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ['ai_provider', 'gemini']);
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ['theme', 'dark']);
    console.log('[DB] Default settings seeded.');
  }
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    console.log('[DB] Database connection closed.');
  }
}

// Helper to run queries and return results as objects
export function queryAll(sql: string, params: any[] = []): any[] {
  try {
    const d = getDatabase();
    const stmt = d.prepare(sql);
    if (params.length > 0) stmt.bind(params);

    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err: any) {
    console.error(`[DB Query Error] ${sql}:`, err.message);
    return [];
  }
}

export function queryOne(sql: string, params: any[] = []): any | null {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

export function runSql(sql: string, params: any[] = []): number {
  try {
    const d = getDatabase();
    d.run(sql, params);
    
    // Fetch ID immediately after run
    const res = d.exec('SELECT last_insert_rowid() as id');
    const lastId = (res.length > 0 && res[0].values.length > 0) ? res[0].values[0][0] as number : 0;
    
    saveDatabase();
    return lastId;
  } catch (err: any) {
    console.error(`[DB Run Error] ${sql}:`, err.message);
    return 0;
  }
}
