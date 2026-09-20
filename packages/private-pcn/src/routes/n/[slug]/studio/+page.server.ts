import { error } from '@sveltejs/kit';
export const load = ({ locals }: { locals: App.Locals }) => {
  if (locals.identity?.role !== 'admin') error(403, 'Network owner access required.');
  return {};
};
