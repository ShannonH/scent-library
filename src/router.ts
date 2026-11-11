/** Hash routes work on GitHub Pages without any server-side rewrites. */
export type Route =
  | { name: 'library' }
  | { name: 'scent'; id: string }
  | { name: 'new' }
  | { name: 'edit'; id: string }
  | { name: 'profile' }
  | { name: 'dupes' }
  | { name: 'bids' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [head, id] = parts;
  switch (head) {
    case 'scent':
      return id ? { name: 'scent', id } : { name: 'library' };
    case 'edit':
      return id ? { name: 'edit', id } : { name: 'library' };
    case 'new':
      return { name: 'new' };
    case 'profile':
      return { name: 'profile' };
    case 'dupes':
      return { name: 'dupes' };
    case 'bids':
      return { name: 'bids' };
    default:
      return { name: 'library' };
  }
}

export function href(route: Route): string {
  return 'id' in route ? `#/${route.name}/${encodeURIComponent(route.id)}` : `#/${route.name}`;
}

export function go(route: Route): void {
  window.location.hash = href(route);
}
