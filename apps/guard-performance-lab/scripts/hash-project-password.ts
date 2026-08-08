import { hashProjectPassword } from '../src/lib/server/access.js';

async function readHidden(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString('utf8').replace(/[\r\n]+$/, '');
  }

  return new Promise((resolve, reject) => {
    const input = process.stdin;
    const output = process.stderr;
    let value = '';
    const restore = () => {
      input.setRawMode(false);
      input.pause();
      input.removeListener('data', onData);
      output.write('\n');
    };
    const onData = (chunk: Buffer | string) => {
      for (const character of String(chunk)) {
        if (character === '\u0003') {
          restore();
          reject(new Error('Password entry canceled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          restore();
          resolve(value);
          return;
        }
        if (character === '\u007f') {
          if (value) {
            value = value.slice(0, -1);
            output.write('\b \b');
          }
          continue;
        }
        if (character >= ' ') {
          value += character;
          output.write('•');
        }
      }
    };
    output.write(prompt);
    input.setEncoding('utf8');
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

const first = await readHidden('Shared project password: ');
if (process.stdin.isTTY) {
  const confirmation = await readHidden('Confirm project password: ');
  if (first !== confirmation) throw new Error('The project passwords do not match.');
}
console.log(await hashProjectPassword(first));
