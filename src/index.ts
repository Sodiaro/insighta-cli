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
  .option('-c, --country <name>', 'Filter by country')
  .option('-r, --role <title>', 'Filter by job title')
  .option('-s, --sort <field>', 'Sort field (e.g. years_of_experience:desc)')
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
  .description('Natural language search (e.g. "engineers in Nigeria with 5+ years")')
  .option('-p, --page <n>', 'Page number', '1')
  .option('-l, --limit <n>', 'Items per page', '20')
  .action(async (query, opts) => {
    await searchProfiles(query, opts);
  });

profiles
  .command('create')
  .description('Create a new profile (admin only)')
  .requiredOption('-n, --name <full_name>', 'Full name')
  .requiredOption('-j, --job-title <title>', 'Job title')
  .requiredOption('-c, --country <name>', 'Country name')
  .requiredOption('-y, --years <n>', 'Years of experience')
  .option('-s, --skills <csv>', 'Comma-separated skills')
  .option('-b, --bio <text>', 'Short bio')
  .action(async (opts) => {
    await createProfile(opts);
  });

profiles
  .command('export <output>')
  .description('Export profiles to a CSV file')
  .option('-c, --country <name>', 'Filter by country')
  .option('-r, --role <title>', 'Filter by job title')
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
