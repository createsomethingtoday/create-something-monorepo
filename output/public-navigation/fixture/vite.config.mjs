import { sveltekit } from '@sveltejs/kit/vite';
export default { plugins: [sveltekit()], server: { host:'127.0.0.1',port:43127,strictPort:true,fs:{allow:['../../../']},watch:{usePolling:true} } };
