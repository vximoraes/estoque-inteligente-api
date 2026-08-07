import fs from 'node:fs';
import path from 'node:path';

const PID_FILE = path.resolve(process.cwd(), '.routes-test-runner.pid');

export default function globalTeardown(): void {
  if (!fs.existsSync(PID_FILE)) return;

  const pid = Number(fs.readFileSync(PID_FILE, 'utf8'));
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // processo já encerrado
  }
  fs.unlinkSync(PID_FILE);
}
