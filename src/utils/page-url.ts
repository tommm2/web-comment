export const PAGE_IDENTITY_INCLUDE_QUERY = true;

export function normalizePageUrl(input: string, includeQuery = PAGE_IDENTITY_INCLUDE_QUERY): string {
  const url = new URL(input);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Unsupported page URL');
  }
  url.hash = '';
  if (includeQuery) {
    url.searchParams.sort();
  } else {
    url.search = '';
  }
  return url.toString();
}
