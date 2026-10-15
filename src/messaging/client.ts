import type { Request, Response, ResultMap } from './protocol';

export async function request<T extends Request['type']>(message: Extract<Request, { type: T }>): Promise<ResultMap[T]> {
  const response = await chrome.runtime.sendMessage(message) as Response<ResultMap[T]>;
  if (!response?.ok) throw new Error(response?.error ?? 'Background unavailable');
  return response.data;
}
