import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { schedulerOpenApi } from '../src/http/openapi.ts';

const allowed = [
  ['/api/v1/links/createsomething/together', 'get', 'Link'],
  ['/api/v1/availability', 'get', 'Availability']
];
const schemas = ['Link', 'Availability', 'Slot', 'Error'];
const paths = Object.fromEntries(allowed.map(([path, method]) => [
  path,
  { [method]: structuredClone(schedulerOpenApi.paths[path][method]) }
]));
const projected = {
  openapi: schedulerOpenApi.openapi,
  info: {
    ...schedulerOpenApi.info,
    title: 'CREATE SOMETHING Scheduler public read-only API'
  },
  servers: schedulerOpenApi.servers,
  paths,
  components: {
    schemas: Object.fromEntries(schemas.map((name) => [
      name,
      structuredClone(schedulerOpenApi.components.schemas[name])
    ]))
  }
};

if (projected.openapi !== '3.1.0') throw new Error('Expected OpenAPI 3.1.0');
const actual = Object.entries(projected.paths).flatMap(([path, item]) =>
  Object.keys(item).map((method) => `${method.toUpperCase()} ${path}`));
const expected = allowed.map(([path, method]) => `${method.toUpperCase()} ${path}`);
if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Unexpected operation projection');
const document = JSON.stringify(projected);
for (const forbidden of ['operatorBearer', 'bookingAction', 'browserProof', '/bookings', '/rooms', '/operator', '/credentials']) {
  if (document.includes(forbidden)) throw new Error(`Forbidden projection content: ${forbidden}`);
}
for (const match of document.matchAll(/#\/components\/schemas\/([^"}]+)/g)) {
  if (!schemas.includes(match[1])) throw new Error(`Unresolved schema reference: ${match[1]}`);
}

const destination = resolve(process.argv[2] ?? new URL('./openapi.readonly.json', import.meta.url).pathname);
writeFileSync(destination, `${JSON.stringify(projected, null, 2)}\n`);
console.log(JSON.stringify({ destination, operations: actual, schemas }));
