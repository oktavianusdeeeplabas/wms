import { getAPIBaseURL } from './config';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiCallOptions = {
  url: string;
  method?: HttpMethod;
  data?: unknown;
  params?: Record<string, unknown>;
};

type EntityQueryOptions = Record<string, unknown>;

type EntityMutationOptions = {
  id?: string | number;
  data?: unknown;
};

type ApiResponse<T = unknown> = {
  data: T;
  status: number;
};

type GenTextOptions = Record<string, unknown> & {
  stream?: boolean;
  onChunk?: (chunk: { content?: string }) => void;
  onComplete?: () => void;
  onError?: (error: { message?: string }) => void;
  timeout?: number;
};

function getStoredToken() {
  return window.localStorage.getItem('token');
}

function buildUrl(path: string, params?: Record<string, unknown>) {
  const url = new URL(path.startsWith('http') ? path : `${getAPIBaseURL()}${path}`);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(
      key,
      typeof value === 'object' ? JSON.stringify(value) : String(value)
    );
  });

  return url.toString();
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail =
      typeof data === 'object' && data && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : response.statusText;
    throw new Error(detail || 'Request failed');
  }

  return {
    data: data as T,
    status: response.status,
  };
}

async function request<T = unknown>({
  url,
  method = 'GET',
  data,
  params,
}: ApiCallOptions): Promise<ApiResponse<T>> {
  const token = getStoredToken();
  const isGet = method === 'GET';
  const queryParams = {
    ...(params || {}),
    ...(isGet && data && typeof data === 'object' ? (data as Record<string, unknown>) : {}),
  };

  const response = await fetch(buildUrl(url, queryParams), {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: !isGet && data !== undefined ? JSON.stringify(data) : undefined,
  });

  return parseResponse<T>(response);
}

function entityClient(entityName: string) {
  const baseUrl = `/api/v1/entities/${entityName}`;

  return {
    query: (params: EntityQueryOptions = {}) =>
      request({ url: baseUrl, method: 'GET', params }),
    get: ({ id }: { id: string | number }) =>
      request({ url: `${baseUrl}/${encodeURIComponent(String(id))}`, method: 'GET' }),
    create: ({ data }: EntityMutationOptions) =>
      request({ url: baseUrl, method: 'POST', data }),
    update: ({ id, data }: EntityMutationOptions) => {
      if (id === undefined || id === null) {
        throw new Error('Entity update requires an id');
      }
      return request({
        url: `${baseUrl}/${encodeURIComponent(String(id))}`,
        method: 'PUT',
        data,
      });
    },
    delete: ({ id }: EntityMutationOptions) => {
      if (id === undefined || id === null) {
        throw new Error('Entity delete requires an id');
      }
      return request({
        url: `${baseUrl}/${encodeURIComponent(String(id))}`,
        method: 'DELETE',
      });
    },
  };
}

async function streamText(options: GenTextOptions) {
  const { onChunk, onComplete, onError, timeout = 120_000, ...payload } = options;
  const token = getStoredToken();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(buildUrl('/api/v1/aihub/gentxt'), {
      method: 'POST',
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...payload, stream: true }),
    });

    if (!response.ok || !response.body) {
      throw new Error(response.statusText || 'Text generation failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      events.forEach((event) => {
        const dataLine = event
          .split('\n')
          .find((line) => line.startsWith('data:'));
        const data = dataLine?.replace(/^data:\s*/, '').trim();
        if (!data || data === '[DONE]') return;

        try {
          const chunk = JSON.parse(data) as { content?: string };
          onChunk?.(chunk);
        } catch {
          onChunk?.({ content: data });
        }
      });
    }

    onComplete?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Text generation failed';
    onError?.({ message });
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export const client = {
  apiCall: {
    invoke: request,
  },
  auth: {
    me: () => request({ url: '/api/v1/auth/me', method: 'GET' }),
    login: () => {
      window.location.href = '/login';
    },
    logout: async () => {
      window.localStorage.removeItem('token');
      return request({ url: '/api/v1/auth/logout', method: 'GET' });
    },
  },
  ai: {
    gentxt: async (options: GenTextOptions) => {
      if (options.stream) {
        return streamText(options);
      }
      return request({
        url: '/api/v1/aihub/gentxt',
        method: 'POST',
        data: options,
      });
    },
  },
  entities: new Proxy(
    {},
    {
      get: (_target, prop) => entityClient(String(prop)),
    }
  ) as Record<string, ReturnType<typeof entityClient>>,
};
