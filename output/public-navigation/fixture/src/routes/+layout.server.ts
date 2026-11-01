export const load = ({url}) => {
  const role = url.searchParams.get('fixtureRole');
  return {identity:role ? {role} : null, reviewer:role === 'admin', supportEnabled:role === 'admin', impersonation:null};
};
