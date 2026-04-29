#!/usr/bin/env node
import { Command } from 'commander';
import { login, logout, whoami } from './commands/auth.js';
import { listProfiles, getProfile, searchProfiles, createProfile, exportProfiles } from './commands/profiles.js';

const program = new Command();

program
  .name('insighta')
  .description('CLI for the Insighta Profile Intelligence API')
  .version('1.0.0');

// Auth
const auth = program.command('auth').description('Authentication commands');

auth.command('login').description('Log in via GitHub OAuth').action(async () => {
  try { await login(); } catch (e: any) { console.error(e.message); process.exit(1); }
});

auth.command('logout').description('Log out and revoke session').action(async () => {
  await logout();
});

auth.command('whoami').description('Show current logged-in user').action(async () => {
  await whoami();
});

// Profiles
const profiles = program.command('profiles').description('Profile management commands');

profiles
  .command('list')
  .description('List profiles with optional filters')
  .option('-p, --page <n>', 'Page number', '1')
  .option('-l, --limit <n>', 'Items per page', '20')
  .option('--gender <gender>', 'Filter by gender (male/female)')
  .option('--age-group <group>', 'Filter by age group (child/teenager/adult/senior)')
  .option('--min-age <n>', 'Minimum age')
  .option('--max-age <n>', 'Maximum age')
  .option('--country-id <code>', 'Filter by ISO country code (e.g. NG)')
  .option('--sort-by <field>', 'Sort field (age, created_at, gender_probability)')
  .option('--order <dir>', 'Sort direction (asc/desc)')
  .action(async (opts) => {
    await listProfiles(opts);
  });

profiles
  .command('get <id>')
  .description('Get a single profile by ID')
  .action(async (id) => {
    await getProfile(id);
  });

profiles
  .command('search <query>')
  .description('Natural language search (e.g. "males over 30 in Nigeria")')
  .option('-p, --page <n>', 'Page number', '1')
  .option('-l, --limit <n>', 'Items per page', '20')
  .action(async (query, opts) => {
    await searchProfiles(query, opts);
  });

profiles
  .command('create')
  .description('Create a new profile (admin only)')
  .requiredOption('-n, --name <name>', 'Full name to enrich and store')
  .action(async (opts) => {
    await createProfile(opts);
  });

profiles
  .command('export <output>')
  .description('Export profiles to a CSV file')
  .option('--gender <gender>', 'Filter by gender')
  .option('--age-group <group>', 'Filter by age group')
  .option('--country-id <code>', 'Filter by ISO country code')
  .action(async (output, opts) => {
    await exportProfiles(output, opts);
  });

// Top-level aliases
program.command('login').description('Alias for: insighta auth login').action(async () => {
  try { await login(); } catch (e: any) { console.error(e.message); process.exit(1); }
});

program.command('logout').description('Alias for: insighta auth logout').action(async () => {
  await logout();
});

program.command('whoami').description('Alias for: insighta auth whoami').action(async () => {
  await whoami();
});

program.parseAsync(process.argv);
