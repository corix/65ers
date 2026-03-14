#!/usr/bin/env node
/**
 * One-time migration: load fixture JSON and insert into Supabase.
 * Run: npm run migrate
 * Requires: fixtures/test-games.json (or fixtures/stored-games.json)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in .env or use --env-file=.env');
  process.exit(1);
}

const fixturePath = existsSync(join(__dirname, '../fixtures/test-games.json'))
  ? join(__dirname, '../fixtures/test-games.json')
  : join(__dirname, '../fixtures/stored-games.json');

if (!existsSync(fixturePath)) {
  console.error(`Fixture file not found. Create fixtures/test-games.json or fixtures/stored-games.json`);
  process.exit(1);
}

const raw = readFileSync(fixturePath, 'utf-8');
const { players = [], games = [] } = JSON.parse(raw);

const supabase = createClient(url, key);

async function migrate() {
  console.log(`Migrating ${players.length} players and ${games.length} games from ${fixturePath.split('/').pop()}...`);

  for (const name of players) {
    const { error } = await supabase.from('players').upsert({ name }, { onConflict: 'name', ignoreDuplicates: true });
    if (error) {
      console.error('Player upsert error:', error);
      throw error;
    }
  }
  console.log('  Players done.');

  const rows = games.map((g) => ({
    id: g.id,
    date: g.date,
    players: g.players,
    winner: g.winner,
    totals: g.totals ?? {},
    rounds: g.rounds ?? [],
    scratch: g.scratch ?? false,
    source: 'fixture',
  }));

  const { error } = await supabase.from('games').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('Games upsert error:', error);
    throw error;
  }
  console.log('  Games done.');
  console.log('Migration complete.');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
