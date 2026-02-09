import { sql } from 'drizzle-orm';

// Fixed UUIDs for reproducible mock data
export const MOCK_USER_ID = '00000000-0000-4000-8000-000000000001';
export const MOCK_ORG_ID = '00000000-0000-4000-8000-000000000002';
export const MOCK_PROJECT_ID = '00000000-0000-4000-8000-000000000003';
export const MOCK_CLERK_ID = 'mock_clerk_user_001';

/** Convert a JS string array to PostgreSQL array literal format: {"a","b"} */
function pgArr(arr: string[]): string {
  return '{' + arr.map(s => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

const MOCK_KEYWORD_IDS = [
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000013',
  '00000000-0000-4000-8000-000000000014',
];

const MOCK_COMPETITOR_IDS = [
  '00000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000021',
];

const MOCK_ALERT_ID = '00000000-0000-4000-8000-000000000030';

/**
 * Seeds the mock PGlite database with demo data.
 * Uses raw SQL via Drizzle's sql template for reliability.
 */
export async function seedMockData(db: any) {
  // 1. Create mock user
  await db.execute(sql`
    INSERT INTO users (id, clerk_id, email, first_name, last_name, image_url)
    VALUES (
      ${MOCK_USER_ID},
      ${MOCK_CLERK_ID},
      'demo@rangefinder.dev',
      'Demo',
      'User',
      NULL
    )
    ON CONFLICT (clerk_id) DO NOTHING
  `);

  // 2. Create organization (growth tier for full access)
  await db.execute(sql`
    INSERT INTO organizations (id, name, slug, created_by_user_id, subscription_tier, subscription_status)
    VALUES (
      ${MOCK_ORG_ID},
      'Demo Organization',
      'demo-org',
      ${MOCK_USER_ID},
      'growth',
      'active'
    )
    ON CONFLICT (slug) DO NOTHING
  `);

  // 3. Create organization membership
  await db.execute(sql`
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (${MOCK_ORG_ID}, ${MOCK_USER_ID}, 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING
  `);

  // 4. Create demo project
  await db.execute(sql`
    INSERT INTO projects (id, organization_id, name, domain, brand_name, brand_aliases)
    VALUES (
      ${MOCK_PROJECT_ID},
      ${MOCK_ORG_ID},
      'Soldier Data',
      'soldierdata.com',
      'Soldier Data',
      ${pgArr(['SoldierData', 'Soldier Data Analytics'])}::text[]
    )
    ON CONFLICT DO NOTHING
  `);

  // 5. Create tracked keywords
  const keywords = [
    { id: MOCK_KEYWORD_IDS[0], keyword: 'best CRM software', category: 'CRM' },
    { id: MOCK_KEYWORD_IDS[1], keyword: 'AI analytics tools', category: 'Analytics' },
    { id: MOCK_KEYWORD_IDS[2], keyword: 'data visualization platforms', category: 'Analytics' },
    { id: MOCK_KEYWORD_IDS[3], keyword: 'business intelligence software', category: 'BI' },
    { id: MOCK_KEYWORD_IDS[4], keyword: 'marketing automation tools', category: 'Marketing' },
  ];

  for (const kw of keywords) {
    await db.execute(sql`
      INSERT INTO tracked_keywords (id, project_id, keyword, category, is_active)
      VALUES (${kw.id}, ${MOCK_PROJECT_ID}, ${kw.keyword}, ${kw.category}, true)
      ON CONFLICT (project_id, keyword) DO NOTHING
    `);
  }

  // 6. Create competitors
  const competitors = [
    { id: MOCK_COMPETITOR_IDS[0], domain: 'ahrefs.com', name: 'Ahrefs', aliases: ['Ahrefs'] },
    { id: MOCK_COMPETITOR_IDS[1], domain: 'semrush.com', name: 'SEMrush', aliases: ['SEMrush', 'Semrush'] },
  ];

  for (const comp of competitors) {
    await db.execute(sql`
      INSERT INTO competitors (id, project_id, domain, name, aliases)
      VALUES (${comp.id}, ${MOCK_PROJECT_ID}, ${comp.domain}, ${comp.name}, ${pgArr(comp.aliases)}::text[])
      ON CONFLICT (project_id, domain) DO NOTHING
    `);
  }

  // 7. Create a default alert
  await db.execute(sql`
    INSERT INTO alerts (id, project_id, alert_type, alert_channel, threshold, is_enabled)
    VALUES (${MOCK_ALERT_ID}, ${MOCK_PROJECT_ID}, 'visibility_drop', 'in_app', 10.0, true)
    ON CONFLICT DO NOTHING
  `);

  // 8. Create a sample alert event
  await db.execute(sql`
    INSERT INTO alert_events (alert_id, project_id, title, description, is_read)
    VALUES (
      ${MOCK_ALERT_ID},
      ${MOCK_PROJECT_ID},
      'Welcome to Rangefinder',
      'Your mock environment is ready. Try running a keyword monitoring scan from the dashboard.',
      false
    )
  `);

  // 9. Create a sample completed query run with results
  const queryRunId = '00000000-0000-4000-8000-000000000040';
  const now = new Date().toISOString();

  await db.execute(sql`
    INSERT INTO query_runs (id, project_id, status, engine_types, total_keywords, completed_keywords, failed_keywords, started_at, completed_at)
    VALUES (
      ${queryRunId},
      ${MOCK_PROJECT_ID},
      'completed',
      ${pgArr(['perplexity', 'google_ai_overview'])}::engine_type[],
      5,
      5,
      0,
      ${now},
      ${now}
    )
    ON CONFLICT DO NOTHING
  `);

  // Create query results + citations for each keyword × engine
  const engines = ['perplexity', 'google_ai_overview'] as const;
  let resultCounter = 50;

  for (const kw of keywords) {
    for (const engine of engines) {
      const resultId = `00000000-0000-4000-8000-0000000000${resultCounter}`;
      resultCounter++;

      await db.execute(sql`
        INSERT INTO query_results (id, query_run_id, project_id, keyword_id, engine_type, raw_response, citation_urls, processed_at)
        VALUES (
          ${resultId},
          ${queryRunId},
          ${MOCK_PROJECT_ID},
          ${kw.id},
          ${engine},
          ${'Mock response for: ' + kw.keyword},
          ${pgArr(['https://soldierdata.com/blog', 'https://techcrunch.com/review', 'https://g2.com/products'])}::text[],
          ${now}
        )
        ON CONFLICT DO NOTHING
      `);

      // Brand citation (soldierdata.com)
      await db.execute(sql`
        INSERT INTO citations (query_result_id, project_id, keyword_id, engine_type, cited_url, cited_domain, position, is_brand_citation)
        VALUES (
          ${resultId},
          ${MOCK_PROJECT_ID},
          ${kw.id},
          ${engine},
          'https://soldierdata.com/blog',
          'soldierdata.com',
          1,
          true
        )
      `);

      // Third-party citation
      await db.execute(sql`
        INSERT INTO citations (query_result_id, project_id, keyword_id, engine_type, cited_url, cited_domain, position, is_brand_citation)
        VALUES (
          ${resultId},
          ${MOCK_PROJECT_ID},
          ${kw.id},
          ${engine},
          'https://techcrunch.com/review',
          'techcrunch.com',
          2,
          false
        )
      `);

      // Brand mention
      await db.execute(sql`
        INSERT INTO brand_mentions (query_result_id, project_id, keyword_id, engine_type, mention_type, matched_text, context, confidence, sentiment)
        VALUES (
          ${resultId},
          ${MOCK_PROJECT_ID},
          ${kw.id},
          ${engine},
          'brand_name',
          'Soldier Data',
          'Soldier Data is a leading analytics platform...',
          0.95,
          'positive'
        )
      `);

      // Competitor citation for first competitor
      await db.execute(sql`
        INSERT INTO competitor_citations (query_result_id, project_id, competitor_id, keyword_id, engine_type, cited_url, position)
        VALUES (
          ${resultId},
          ${MOCK_PROJECT_ID},
          ${MOCK_COMPETITOR_IDS[0]},
          ${kw.id},
          ${engine},
          'https://ahrefs.com/tools',
          3
        )
      `);
    }
  }

  // 10. Create sample GA4 traffic data (last 7 days)
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().split('T')[0];
    const sessions = 20 + Math.floor(Math.random() * 30);

    await db.execute(sql`
      INSERT INTO ga4_traffic_data (project_id, date, source, medium, landing_page, sessions, users, engaged_sessions, conversions, avg_engagement_time)
      VALUES (
        ${MOCK_PROJECT_ID},
        ${dateStr},
        'perplexity.ai',
        'referral',
        '/blog',
        ${sessions},
        ${Math.floor(sessions * 0.8)},
        ${Math.floor(sessions * 0.6)},
        ${Math.floor(sessions * 0.05)},
        ${45.5 + Math.random() * 30}
      )
      ON CONFLICT DO NOTHING
    `);

    await db.execute(sql`
      INSERT INTO ga4_traffic_data (project_id, date, source, medium, landing_page, sessions, users, engaged_sessions, conversions, avg_engagement_time)
      VALUES (
        ${MOCK_PROJECT_ID},
        ${dateStr},
        'chatgpt.com',
        'referral',
        '/',
        ${Math.floor(sessions * 0.5)},
        ${Math.floor(sessions * 0.4)},
        ${Math.floor(sessions * 0.3)},
        ${Math.floor(sessions * 0.02)},
        ${35.0 + Math.random() * 20}
      )
      ON CONFLICT DO NOTHING
    `);
  }
}
