// Owned finite output stress fixture: 2 MiB across both streams.
import { writeSync } from 'node:fs';
const chunk = Buffer.alloc(4096, 120);
for (let i = 0; i < 512; i++) writeSync(i % 2 ? 1 : 2, chunk);
