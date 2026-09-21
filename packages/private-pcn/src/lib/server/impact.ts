import { isReviewer } from './admission';
const entries = (value: unknown) =>
  String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
export function operatorSubjects(env: App.Platform['env']) {
  return entries(env.PCN_ANALYTICS_OPERATOR_SUBJECTS);
}
export function operatorEmails(env: App.Platform['env']) {
  return [...entries(env.PCN_ADMIN_EMAILS), ...entries(env.PCN_ANALYTICS_OPERATOR_EMAILS)].map(
    (v) => v.toLowerCase()
  );
}
export function isOperatorActivity(locals: App.Locals, env: App.Platform['env']) {
  return (
    !!locals.impersonation ||
    isReviewer(locals.identity, env) ||
    (!!locals.identity &&
      (operatorSubjects(env).includes(locals.identity.subject) ||
        operatorEmails(env).includes(locals.identity.email.toLowerCase())))
  );
}
