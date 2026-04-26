import os from 'os';
import path from 'path';
import fs from 'fs';

export const CREDENTIALS_PATH = path.join(os.homedir(), '.insighta', 'credentials.json');
export const API_BASE = process.env.INSIGHTA_API_URL || 'http://localhost:3000';

export interface Credentials {
  access_token: string;
  refresh_token: string;
  username: string;
  role: string;
}

export function loadCredentials(): Credentials | null {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) return null;
    return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  } catch {
    return null;
  }
}

export function saveCredentials(creds: Credentials): void {
  const dir = path.dirname(CREDENTIALS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

export function clearCredentials(): void {
  try { fs.unlinkSync(CREDENTIALS_PATH); } catch {}
}
