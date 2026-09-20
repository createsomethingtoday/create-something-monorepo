export async function enrollment(action: 'start' | 'complete', body: unknown) {
  const response = await fetch(`https://id.createsomething.space/v1/auth/enrollment/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || 'Account verification is unavailable. Please try again.');
  return data as { success: boolean; email?: string; message?: string };
}
