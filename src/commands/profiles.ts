import fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { getClient, requireAuth } from '../api.js';

function profileTable(profiles: any[]): void {
  const table = new Table({
    head: ['ID', 'Name', 'Gender', 'Age', 'Age Group', 'Country'].map((h) => chalk.cyan(h)),
    colWidths: [38, 22, 10, 6, 12, 20],
    wordWrap: true,
  });
  for (const p of profiles) {
    table.push([
      p.id,
      p.name ?? '—',
      p.gender ?? '—',
      p.age ?? '—',
      p.age_group ?? '—',
      p.country_name ?? p.country_id ?? '—',
    ]);
  }
  console.log(table.toString());
}

export async function listProfiles(opts: {
  page?: string;
  limit?: string;
  gender?: string;
  ageGroup?: string;
  minAge?: string;
  maxAge?: string;
  country?: string;
  countryId?: string;
  sortBy?: string;
  order?: string;
}) {
  requireAuth();
  const spinner = ora('Fetching profiles…').start();
  try {
    const client = getClient();
    const params: Record<string, string> = {};
    if (opts.page) params['page'] = opts.page;
    if (opts.limit) params['limit'] = opts.limit;
    if (opts.gender) params['gender'] = opts.gender;
    if (opts.ageGroup) params['age_group'] = opts.ageGroup;
    if (opts.minAge) params['min_age'] = opts.minAge;
    if (opts.maxAge) params['max_age'] = opts.maxAge;
    const countryCode = opts.country || opts.countryId;
    if (countryCode) params['country_id'] = countryCode;
    if (opts.sortBy) params['sort_by'] = opts.sortBy;
    if (opts.order) params['order'] = opts.order;

    const res = await client.get('/api/profiles', { params });
    spinner.stop();

    const { data, total, page, total_pages } = res.data;
    console.log(chalk.dim(`Page ${page} of ${total_pages} — ${total} total profiles`));
    profileTable(data);
  } catch (err: any) {
    spinner.fail('Failed to fetch profiles');
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function getProfile(id: string) {
  requireAuth();
  const spinner = ora('Fetching profile…').start();
  try {
    const client = getClient();
    const res = await client.get(`/api/profiles/${id}`);
    spinner.stop();

    const p = res.data.data;
    const table = new Table({ style: { head: [], border: [] } });
    const rows: [string, string][] = [
      ['ID', p.id],
      ['Name', p.name ?? '—'],
      ['Gender', p.gender ?? '—'],
      ['Gender Probability', String(p.gender_probability ?? '—')],
      ['Age', String(p.age ?? '—')],
      ['Age Group', p.age_group ?? '—'],
      ['Country', p.country_name ?? '—'],
      ['Country ID', p.country_id ?? '—'],
      ['Country Probability', String(p.country_probability ?? '—')],
      ['Created', p.created_at ?? '—'],
    ];
    for (const [k, v] of rows) table.push([chalk.cyan(k), v]);
    console.log(table.toString());
  } catch (err: any) {
    spinner.fail('Failed to fetch profile');
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function searchProfiles(query: string, opts: { page?: string; limit?: string }) {
  requireAuth();
  const spinner = ora('Searching…').start();
  try {
    const client = getClient();
    const params: Record<string, string> = { q: query };
    if (opts.page) params['page'] = opts.page;
    if (opts.limit) params['limit'] = opts.limit;

    const res = await client.get('/api/profiles/search', { params });
    spinner.stop();

    const { data, total, page, total_pages } = res.data;
    console.log(chalk.dim(`Page ${page} of ${total_pages} — ${total} results for: "${query}"`));
    profileTable(data);
  } catch (err: any) {
    spinner.fail('Search failed');
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function createProfile(opts: { name: string }) {
  requireAuth();
  const spinner = ora('Creating profile…').start();
  try {
    const client = getClient();
    const res = await client.post('/api/profiles', { name: opts.name });
    spinner.succeed(chalk.green(`Profile created: ${res.data.data?.id ?? 'OK'}`));
    const p = res.data.data;
    if (p) {
      console.log(chalk.dim(`  Name: ${p.name}  Gender: ${p.gender}  Age: ${p.age}  Country: ${p.country_name}`));
    }
  } catch (err: any) {
    spinner.fail('Failed to create profile');
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function exportProfiles(outputPath: string, opts: { gender?: string; ageGroup?: string; country?: string; countryId?: string }) {
  requireAuth();
  const spinner = ora('Exporting profiles as CSV…').start();
  try {
    const client = getClient();
    const params: Record<string, string> = { format: 'csv' };
    if (opts.gender) params['gender'] = opts.gender;
    if (opts.ageGroup) params['age_group'] = opts.ageGroup;
    const countryCode = opts.country || opts.countryId;
    if (countryCode) params['country_id'] = countryCode;

    const res = await client.get('/api/profiles/export', { params, responseType: 'text' });
    spinner.stop();

    fs.writeFileSync(outputPath, res.data, 'utf8');
    spinner.succeed(chalk.green(`Exported to ${outputPath}`));
  } catch (err: any) {
    spinner.fail('Export failed');
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}
