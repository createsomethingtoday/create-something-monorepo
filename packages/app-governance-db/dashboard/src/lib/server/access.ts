type DashboardEnv = {
  APP_GOVERNANCE_DASHBOARD_KEY?: string;
  DASHBOARD_ACCESS_KEY?: string;
};

export function dashboardAccessKey(env: DashboardEnv | undefined): string | undefined {
  return env?.APP_GOVERNANCE_DASHBOARD_KEY || env?.DASHBOARD_ACCESS_KEY;
}
