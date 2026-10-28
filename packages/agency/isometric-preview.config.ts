// Local review runner only; never used by the production build.
import config from './vite.config';
import {fileURLToPath} from 'node:url';
import {realpathSync} from 'node:fs';
const dependency = realpathSync(fileURLToPath(new URL('./node_modules/svelte', import.meta.url)));
const dependencyRoot = dependency.slice(0, dependency.indexOf('/node_modules/') + '/node_modules'.length);
export default {...config,server:{fs:{allow:[fileURLToPath(new URL('../..',import.meta.url)), dependencyRoot]}}};
