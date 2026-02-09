"use client";

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
});

export function useAdminStats() {
  return useSWR('/api/admin/stats', fetcher, { refreshInterval: 30000 });
}

export function useAdminUsers() {
  return useSWR('/api/admin/users', fetcher, { refreshInterval: 30000 });
}

export function useAdminOrganizations() {
  return useSWR('/api/admin/organizations', fetcher, { refreshInterval: 30000 });
}

export function useAdminProjects() {
  return useSWR('/api/admin/projects', fetcher, { refreshInterval: 30000 });
}
