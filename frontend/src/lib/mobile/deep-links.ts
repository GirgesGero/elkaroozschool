/**
 * Deep Links Service & Canonical Routing
 * Standardized across Web, Android App Links, and iOS Universal Links.
 * 
 * Canonical routes:
 *   - /post/:id
 *   - /lecture/:id
 *   - /book/:id
 *   - /group/:id
 *   - /trainee/:id
 *   - /marathon/:id
 *   - /exam/:id
 */

export type DeepLinkResourceType =
  | 'POST'
  | 'LECTURE'
  | 'BOOK'
  | 'GROUP'
  | 'TRAINEE'
  | 'MARATHON'
  | 'EXAM'
  | 'ATTENDANCE'
  | 'NOTIFICATIONS'
  | 'SETTINGS'
  | 'UNKNOWN';

export interface DeepLinkRoute {
  resourceType: DeepLinkResourceType;
  id?: string;
  queryParams?: Record<string, string>;
  canonicalPath: string;
  rawUrl: string;
}

export class DeepLinkService {
  private static readonly CANONICAL_HOST = 'https://elkaroozschool.is-best.net';

  /**
   * Parses any incoming URL, custom scheme, or internal path into a canonical DeepLinkRoute.
   * Examples:
   *   - "https://elkaroozschool.is-best.net/post/123" -> POST, 123
   *   - "elkarooz://trainee/uuid?group=1" -> TRAINEE, uuid, group:1
   *   - "/marathon/45" -> MARATHON, 45
   */
  static parse(urlOrPath: string): DeepLinkRoute | null {
    if (!urlOrPath || !urlOrPath.trim()) return null;

    const raw = urlOrPath.trim();
    let pathname = raw;
    let queryParams: Record<string, string> = {};

    try {
      // Normalize custom scheme or full HTTP URL
      if (raw.startsWith('elkarooz://') || raw.startsWith('http://') || raw.startsWith('https://')) {
        const normalized = raw.replace('elkarooz://', 'http://elkarooz.local/');
        const url = new URL(normalized);
        pathname = url.pathname;
        url.searchParams.forEach((val, key) => {
          queryParams[key] = val;
        });
      } else if (raw.includes('?')) {
        const parts = raw.split('?');
        pathname = parts[0];
        const search = new URLSearchParams(parts[1]);
        search.forEach((val, key) => {
          queryParams[key] = val;
        });
      }
    } catch {
      pathname = raw;
    }

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      return {
        resourceType: 'UNKNOWN',
        canonicalPath: '/',
        rawUrl: raw,
        queryParams,
      };
    }

    const first = segments[0].toLowerCase();
    const id = segments[1];

    let resourceType: DeepLinkResourceType = 'UNKNOWN';
    let canonicalPath = `/${segments.join('/')}`;

    switch (first) {
      case 'post':
      case 'posts':
        resourceType = 'POST';
        canonicalPath = id ? `/post/${id}` : '/';
        break;
      case 'lecture':
      case 'lectures':
      case 'curriculum':
        resourceType = 'LECTURE';
        canonicalPath = id ? `/curriculum#lecture-${id}` : '/curriculum';
        break;
      case 'book':
      case 'books':
        resourceType = 'BOOK';
        canonicalPath = id ? `/books#book-${id}` : '/books';
        break;
      case 'group':
      case 'groups':
        resourceType = 'GROUP';
        canonicalPath = id ? `/groups/${id}` : '/groups';
        break;
      case 'trainee':
      case 'trainees':
        resourceType = 'TRAINEE';
        canonicalPath = id ? `/trainees#trainee-${id}` : '/trainees';
        break;
      case 'marathon':
        resourceType = 'MARATHON';
        canonicalPath = id ? `/marathon/${id}` : '/marathon';
        break;
      case 'exam':
      case 'exams':
        resourceType = 'EXAM';
        canonicalPath = id ? `/exams#exam-${id}` : '/exams';
        break;
      case 'attendance':
        resourceType = 'ATTENDANCE';
        canonicalPath = '/attendance';
        break;
      case 'notification':
      case 'notifications':
        resourceType = 'NOTIFICATIONS';
        canonicalPath = '/notifications';
        break;
      case 'settings':
        resourceType = 'SETTINGS';
        canonicalPath = '/settings';
        break;
    }

    return {
      resourceType,
      id,
      queryParams,
      canonicalPath,
      rawUrl: raw,
    };
  }

  /**
   * Builds an authoritative canonical URL for sharing and App Links.
   */
  static buildCanonicalUrl(resourceType: DeepLinkResourceType, id?: string): string {
    let path = '/';
    switch (resourceType) {
      case 'POST':
        path = id ? `/post/${id}` : '/';
        break;
      case 'GROUP':
        path = id ? `/groups/${id}` : '/groups';
        break;
      case 'MARATHON':
        path = id ? `/marathon/${id}` : '/marathon';
        break;
      case 'LECTURE':
        path = id ? `/curriculum#lecture-${id}` : '/curriculum';
        break;
      case 'BOOK':
        path = id ? `/books#book-${id}` : '/books';
        break;
      case 'TRAINEE':
        path = id ? `/trainees#trainee-${id}` : '/trainees';
        break;
      case 'EXAM':
        path = '/exams';
        break;
      case 'NOTIFICATIONS':
        path = '/notifications';
        break;
      case 'SETTINGS':
        path = '/settings';
        break;
    }

    return `${this.CANONICAL_HOST}${path}`;
  }

  /**
   * Resolves and navigates to the target route using Next.js router.
   */
  static navigate(urlOrPath: string, router: { push: (url: string) => void }): boolean {
    const route = this.parse(urlOrPath);
    if (!route || route.resourceType === 'UNKNOWN') return false;

    router.push(route.canonicalPath);
    return true;
  }
}
