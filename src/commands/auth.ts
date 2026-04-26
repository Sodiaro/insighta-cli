import crypto from 'crypto';
import http from 'http';
import { URL } from 'url';
import axios from 'axios';
import open from 'open';
import chalk from 'chalk';
import ora from 'ora';
import { API_BASE, saveCredentials, clearCredentials, loadCredentials, CREDENTIALS_PATH } from '../config.js';
import { getClient } from '../api.js';

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export async function login() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString('hex');

  // Start local callback server on a random available port
  const server = http.createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as any).port as number;

  const callbackUrl = `http://127.0.0.1:${port}/callback`;

  // Build GitHub OAuth URL via backend
  const authUrl = `${API_BASE}/auth/github?code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}&redirect_uri=${encodeURIComponent(callbackUrl)}`;

  console.log(chalk.cyan('\nOpening GitHub login in your browser...'));
  console.log(chalk.dim(`If it doesn't open, visit: ${authUrl}\n`));
  await open(authUrl);

  // Wait for callback
  const { code, receivedState } = await new Promise<{ code: string; receivedState: string }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('Login timed out (60s). Please try again.'));
    }, 60_000);

    server.on('request', (req, res) => {
      const u = new URL(req.url!, `http://127.0.0.1:${port}`);
      const code = u.searchParams.get('code');
      const receivedState = u.searchParams.get('state');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h2>Login successful! You can close this tab.</h2></body></html>');

      clearTimeout(timeout);
      server.close();
      if (code && receivedState) resolve({ code, receivedState });
      else reject(new Error('Missing code or state in callback'));
    });
  });

  if (receivedState !== state) {
    throw new Error('State mismatch — possible CSRF. Please try again.');
  }

  const spinner = ora('Completing authentication...').start();
  try {
    const res = await axios.post(`${API_BASE}/auth/cli/callback`, {
      code,
      state,
      code_verifier: codeVerifier,
    });

    const { access_token, refresh_token, user } = res.data;
    saveCredentials({ access_token, refresh_token, username: user.username, role: user.role });

    spinner.succeed(chalk.green(`Logged in as @${user.username} (${user.role})`));
    console.log(chalk.dim(`Credentials stored at ${CREDENTIALS_PATH}`));
  } catch (err: any) {
    spinner.fail('Authentication failed');
    throw new Error(err.response?.data?.message || err.message);
  }
}

export async function logout() {
  const creds = loadCredentials();
  if (!creds) {
    console.log(chalk.yellow('Not logged in.'));
    return;
  }
  try {
    await axios.post(`${API_BASE}/auth/logout`, { refresh_token: creds.refresh_token });
  } catch {}
  clearCredentials();
  console.log(chalk.green('Logged out.'));
}

export async function whoami() {
  const creds = loadCredentials();
  if (!creds) {
    console.log(chalk.red('Not logged in. Run: insighta login'));
    return;
  }
  const client = getClient();
  try {
    const res = await client.get('/auth/me');
    const u = res.data.data;
    console.log(chalk.cyan('Logged in as:'));
    console.log(`  Username : ${chalk.bold(u.username)}`);
    console.log(`  Email    : ${u.email || '—'}`);
    console.log(`  Role     : ${chalk.yellow(u.role)}`);
    console.log(`  Active   : ${u.is_active ? chalk.green('yes') : chalk.red('no')}`);
  } catch (err: any) {
    console.error(chalk.red(err.message));
  }
}
