import fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { getClient, requireAuth } from '../api.js';

function profileTable(profiles: any[]): void {
  const table = new Table({
    head: ['ID', 'Name', 'Job Title', 'Country', 'Years Exp'].map((h) => chalk.cyan(h)),
    colWidths: [38, 24, 28, 20, 10],
    wordWrap: true,
  });
  for (const p of profiles) {
    table.push([p.id, p.full_name ?? '—', p.job_title ?? '—', p.country_name ?? '—', p.years_of_experience ?? '—']);
  }
  console.log(table.toString());
}

export async function listProfiles(opts: { page?: string; limit?: string; country?: string; role?: string; sort?: string }) {
  requireAuth();
  const spinner = ora('Fetching profiles…').start();
  try {
    const client = getClient();
    const params: Record<string, string> = {};
    if (opts.page) params['page'] = opts.page;
    if (opts.limit) params['limit'] = opts.limit;
    if (opts.country) params['country_name'] = opts.country;
    if (opts.role) params['job_title'] = opts.role;
    if (opts.sort) params['sort'] = opts.sort;

    const res = await client.get('/api/profiles', { params });
    spinner.stop();

    const { data, total, page, limit, total_pages } = res.data;
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
      ['Name', p.full_name ?? '—'],
      ['Job Title', p.job_title ?? '—'],
      ['Country', p.country_name ?? '—'],
      ['Years Exp', String(p.years_of_experience ?? '—')],
      ['Skills', (p.skills ?? []).join(', ') || '—'],
      ['Bio', p.bio ?? '—'],
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

export async function createProfile(opts: {
  name: string;
  jobTitle: string;
  country: string;
  years: string;
  skills?: string;
  bio?: string;
}) {
  requireAuth();
  const spinner = ora('Creating profile…').start();
  try {
    const client = getClient();
    const body: Record<string, any> = {
      full_name: opts.name,
      job_title: opts.jobTitle,
      country_name: opts.country,
      years_of_experience: parseInt(opts.years, 10),
    };
    if (opts.skills) body['skills'] = opts.skills.split(',').map((s) => s.trim());
    if (opts.bio) body['bio'] = opts.bio;

    const res = await client.post('/api/profiles', body);
    spinner.succeed(chalk.green(`Profile created: ${res.data.data?.id ?? 'OK'}`));
  } catch (err: any) {
    spinner.fail('Failed to create profile');
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}

export async function exportProfiles(outputPath: string, opts: { country?: string; role?: string }) {
  requireAuth();
  const spinner = ora('Exporting profiles as CSV…').start();
  try {
    const client = getClient();
    const params: Record<string, string> = { format: 'csv' };
    if (opts.country) params['country_name'] = opts.country;
    if (opts.role) params['job_title'] = opts.role;

    const res = await client.get('/api/profiles/export', { params, responseType: 'text' });
    spinner.stop();

    fs.writeFileSync(outputPath, res.data, 'utf8');
    spinner.succeed(chalk.green(`Exported to ${outputPath}`));
  } catch (err: any) {
    spinner.fail('Export failed');
    console.error(chalk.red(err.response?.data?.message || err.message));
  }
}
