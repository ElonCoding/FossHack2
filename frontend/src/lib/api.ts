export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const messageFromPayload =
      payload && typeof payload === 'object' && 'message' in payload
        ? (payload as { message?: unknown }).message
        : undefined;
    const message =
      typeof messageFromPayload === 'string' && messageFromPayload.trim().length > 0
        ? messageFromPayload
        : 'Request failed';
    throw new Error(String(message));
  }

  return payload as T;
}
