/**
 * Migration script – creates circuits, congregations, locations tables
 * and seeds them with initial data via Supabase JS client.
 *
 * Run with:  npx tsx scripts/migrate.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pgqcjlskwuhqmwuexaaf.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncWNqbHNrd3VocW13dWV4YWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDcwMDMsImV4cCI6MjA4ODQ4MzAwM30.xggh-gmihE6zMZTv2ViC-CuWxg9AzfZVZjVXRw63JkQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Seed data ────────────────────────────────────────────────

const circuitRows = [
  {
    name: 'Metro Cebu Central Circuit',
    city: 'Cebu City',
    coordinator: 'Brother Santos',
    notes: 'Handles high-density downtown and nearby urban witnessing assignments.',
  },
  {
    name: 'Metro Cebu North Circuit',
    city: 'Mandaue',
    coordinator: 'Brother Reyes',
    notes: 'Coordinates northern congregations and commercial-site witnessing support.',
  },
];

async function run() {
  console.log('🔄  Starting migration…\n');

  // ── 1. Check if circuits table already has data ──────────
  const { data: existing, error: checkErr } = await supabase
    .from('circuits')
    .select('id')
    .limit(1);

  if (checkErr) {
    console.error(
      '❌  Could not query circuits table. Make sure you have run the SQL schema first.\n' +
      '    Go to Supabase Dashboard → SQL Editor → paste supabase_schema.sql and run it.\n\n' +
      '    Error:', checkErr.message
    );
    process.exit(1);
  }

  if (existing && existing.length > 0) {
    console.log('✅  Tables already have data. Skipping seed.\n');
    // Verify counts
    const { count: cc } = await supabase.from('circuits').select('*', { count: 'exact', head: true });
    const { count: cogc } = await supabase.from('congregations').select('*', { count: 'exact', head: true });
    const { count: lc } = await supabase.from('locations').select('*', { count: 'exact', head: true });
    console.log(`   circuits: ${cc}`);
    console.log(`   congregations: ${cogc}`);
    console.log(`   locations: ${lc}`);
    return;
  }

  // ── 2. Insert circuits ──────────────────────────────────
  console.log('📦  Inserting circuits…');
  const { data: insertedCircuits, error: circuitErr } = await supabase
    .from('circuits')
    .insert(circuitRows)
    .select();

  if (circuitErr) {
    console.error('❌  Failed to insert circuits:', circuitErr.message);
    process.exit(1);
  }

  const c1 = insertedCircuits![0].id;
  const c2 = insertedCircuits![1].id;
  console.log(`   ✓ ${insertedCircuits!.length} circuits created (${c1}, ${c2})\n`);

  // ── 3. Insert congregations ─────────────────────────────
  console.log('📦  Inserting congregations…');
  const congregationRows = [
    { circuit_id: c1, name: 'Central Congregation', city: 'Downtown', overseers: ['Brother Smith', 'Brother Johnson'], publisher_count: 85, shifts_served: 234, coverage_rate: 87 },
    { circuit_id: c2, name: 'Northside Congregation', city: 'North District', overseers: ['Brother Williams', 'Brother Brown'], publisher_count: 62, shifts_served: 189, coverage_rate: 92 },
    { circuit_id: c1, name: 'Riverside Congregation', city: 'Riverside', overseers: ['Brother Davis', 'Brother Miller'], publisher_count: 71, shifts_served: 201, coverage_rate: 78 },
    { circuit_id: c2, name: 'Westend Congregation', city: 'West End', overseers: ['Brother Wilson', 'Brother Moore'], publisher_count: 54, shifts_served: 156, coverage_rate: 85 },
  ];

  const { data: insertedCongs, error: congErr } = await supabase
    .from('congregations')
    .insert(congregationRows)
    .select();

  if (congErr) {
    console.error('❌  Failed to insert congregations:', congErr.message);
    process.exit(1);
  }

  // Map congregation IDs by name for location linking
  const congMap: Record<string, string> = {};
  for (const cong of insertedCongs!) {
    congMap[cong.name] = cong.id;
  }
  console.log(`   ✓ ${insertedCongs!.length} congregations created\n`);

  // ── 4. Insert locations ─────────────────────────────────
  console.log('📦  Inserting locations…');
  const locationRows = [
    {
      circuit_id: c1,
      name: 'City General Hospital',
      category: 'Hospital',
      city: 'Downtown',
      linked_congregations: [congMap['Central Congregation'], congMap['Northside Congregation']],
      active: true,
      age_group: 'Seniors excluded',
      experience_level: 'Experienced only',
      max_publishers: 2,
      notes: 'Quiet demeanor required. Hospital staff are supportive.',
    },
    {
      circuit_id: c1,
      name: 'Central Plaza',
      category: 'Plaza',
      city: 'Downtown',
      linked_congregations: [congMap['Central Congregation'], congMap['Northside Congregation'], congMap['Riverside Congregation']],
      active: true,
      age_group: 'All ages',
      experience_level: 'Any',
      max_publishers: 4,
      notes: 'High foot traffic on weekends. Bring umbrella stand.',
    },
    {
      circuit_id: c1,
      name: 'Union Station Terminal',
      category: 'Terminal',
      city: 'Downtown',
      linked_congregations: [congMap['Central Congregation'], congMap['Riverside Congregation']],
      active: true,
      age_group: 'Adults only',
      experience_level: 'Intermediate',
      max_publishers: 3,
      notes: 'Permit required. Check in with security.',
    },
    {
      circuit_id: c2,
      name: 'Riverside Mall',
      category: 'Mall',
      city: 'Riverside',
      linked_congregations: [congMap['Riverside Congregation'], congMap['Westend Congregation']],
      active: true,
      age_group: 'All ages',
      experience_level: 'Any',
      max_publishers: 3,
      notes: 'Setup near main entrance. Mall management prefers morning slots.',
    },
    {
      circuit_id: c2,
      name: 'Northside Shopping Center',
      category: 'Mall',
      city: 'North District',
      linked_congregations: [congMap['Northside Congregation'], congMap['Westend Congregation']],
      active: true,
      age_group: 'All ages',
      experience_level: 'Any',
      max_publishers: 2,
      notes: 'Good response from shoppers.',
    },
    {
      circuit_id: c2,
      name: 'Westend Plaza',
      category: 'Plaza',
      city: 'West End',
      linked_congregations: [congMap['Westend Congregation']],
      active: false,
      age_group: 'All ages',
      experience_level: 'Any',
      max_publishers: 2,
      notes: 'Temporarily inactive due to construction.',
    },
  ];

  const { data: insertedLocs, error: locErr } = await supabase
    .from('locations')
    .insert(locationRows)
    .select();

  if (locErr) {
    console.error('❌  Failed to insert locations:', locErr.message);
    process.exit(1);
  }

  console.log(`   ✓ ${insertedLocs!.length} locations created\n`);
  console.log('✅  Migration complete! All tables seeded successfully.');
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
