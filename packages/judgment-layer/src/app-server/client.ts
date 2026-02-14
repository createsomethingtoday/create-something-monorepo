import { spawn } from 'node:child_process';
import readline from 'node:readline';

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };
type JsonObject = { [k: string]: JsonValue };

export type ServerMessage = JsonObject;

export type AppServerClientOptions = {
  argv?: string[];
  stderr?: 'inherit' | 'pipe';
  onStderrLine?: (line: string) => void;
};

export class AppServerClient {
  private proc;
  private rl;
  private stderrRl?: readline.Interface;
  private nextId = 1;
  private pending = new Map<number | string, { resolve: (v: any) => void; reject: (e: any) => void }>();
  private recentStderr: string[] = [];
  private readonly maxRecentStderrLines = 80;

  onMessage?: (msg: ServerMessage) => void;

  constructor(opts: AppServerClientOptions = {}) {
    const argv = opts.argv ?? ['app-server'];
    const stderrMode = opts.stderr ?? 'inherit';
    const stdio: ['pipe', 'pipe', 'inherit' | 'pipe'] = ['pipe', 'pipe', stderrMode];
    this.proc = spawn('codex', argv, { stdio });
    if (!this.proc.stdin || !this.proc.stdout) {
      throw new Error('codex app-server must be spawned with stdin/stdout piped');
    }

    const stdout = this.proc.stdout;
    this.rl = readline.createInterface({ input: stdout });

    if (stderrMode === 'pipe' && this.proc.stderr) {
      const stderr = this.proc.stderr;
      this.stderrRl = readline.createInterface({ input: stderr });
      this.stderrRl.on('line', (line) => {
        this.recentStderr.push(line);
        if (this.recentStderr.length > this.maxRecentStderrLines) this.recentStderr.shift();
        opts.onStderrLine?.(line);
      });
    }

    this.proc.on('exit', (code, signal) => {
      const recent = this.recentStderr
        .filter((l) => l.trim() !== '' && !l.includes('needs_follow_up'))
        .slice(-20)
        .join('\n');
      const suffix = recent ? `\n--- codex app-server stderr (tail) ---\n${recent}` : '';
      const err = new Error(`codex app-server exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})${suffix}`);
      for (const [id, p] of this.pending.entries()) {
        this.pending.delete(id);
        p.reject(err);
      }
    });

    this.rl.on('line', (line) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(line) as ServerMessage;
      } catch {
        return;
      }

      // Response to a prior client request.
      if (msg.id !== undefined && msg.method === undefined && (msg.result !== undefined || msg.error !== undefined)) {
        const pending = this.pending.get(msg.id as any);
        if (!pending) return;
        this.pending.delete(msg.id as any);
        if (msg.error) pending.reject(msg.error);
        else pending.resolve(msg.result);
        return;
      }

      this.onMessage?.(msg);
    });
  }

  async request(method: string, params?: JsonValue, opts?: { timeoutMs?: number }): Promise<any> {
    const id = this.nextId++;
    const message: any = params === undefined ? { method, id } : { method, id, params };
    const payload = `${JSON.stringify(message)}\n`;

    return await new Promise((resolve, reject) => {
      let timeout: NodeJS.Timeout | null = null;
      if (opts?.timeoutMs) {
        timeout = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`Timeout waiting for response to ${method} (id=${id})`));
        }, opts.timeoutMs);
      }

      this.pending.set(id, {
        resolve: (v) => {
          if (timeout) clearTimeout(timeout);
          resolve(v);
        },
        reject: (e) => {
          if (timeout) clearTimeout(timeout);
          reject(e);
        }
      });
      this.proc.stdin!.write(payload, (err) => {
        if (err) {
          if (timeout) clearTimeout(timeout);
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }

  notify(method: string, params?: JsonValue): void {
    const message: any = params === undefined ? { method } : { method, params };
    this.proc.stdin!.write(`${JSON.stringify(message)}\n`);
  }

  respond(id: number | string, result: JsonValue): void {
    this.proc.stdin!.write(`${JSON.stringify({ id, result })}\n`);
  }

  close(): void {
    this.rl.close();
    this.stderrRl?.close();
    this.proc.kill();
  }
}
