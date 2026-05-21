// Public Apps Script Web App that appends signups to the "Soar Boar signups"
// Google Sheet. Public-by-design URL; not a secret. See NEWSLETTER_PLAN.md
// for the one-time deploy steps. Set via VITE_APPS_SCRIPT_URL in the
// deploy environment; EmailSignup throws when this is empty so unconfigured
// builds fail loud instead of silently faking success.
export const APPS_SCRIPT_URL: string = import.meta.env.VITE_APPS_SCRIPT_URL ?? '';
