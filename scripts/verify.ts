import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://pgqcjlskwuhqmwuexaaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncWNqbHNrd3VocW13dWV4YWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDcwMDMsImV4cCI6MjA4ODQ4MzAwM30.xggh-gmihE6zMZTv2ViC-CuWxg9AzfZVZjVXRw63JkQ'
);

async function verify() {
  const { data: circuits, error: e1 } = await sb.from('circuits').select('id, name');
  const { data: congregations, error: e2 } = await sb.from('congregations').select('id, name, circuit_id');
  const { data: locations, error: e3 } = await sb.from('locations').select('id, name, circuit_id, category');

  if (e1 || e2 || e3) {
    console.error('Errors:', e1?.message, e2?.message, e3?.message);
    process.exit(1);
  }

  console.log(`✅ Circuits (${circuits!.length}):`);
  circuits!.forEach((c) => console.log(`   - ${c.name} [${c.id}]`));

  console.log(`✅ Congregations (${congregations!.length}):`);
  congregations!.forEach((c) => console.log(`   - ${c.name} → circuit ${c.circuit_id}`));

  console.log(`✅ Locations (${locations!.length}):`);
  locations!.forEach((l) => console.log(`   - ${l.name} (${l.category}) → circuit ${l.circuit_id}`));
}

verify();
