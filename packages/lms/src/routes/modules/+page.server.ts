import { MODULES, getModuleCategories } from '$lib/config/modules';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const categories = getModuleCategories();

  return {
    modules: MODULES,
    categories,
  };
};
