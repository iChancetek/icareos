/**
 * iCareOS Tavily Intelligence Service
 * Wraps the Tavily search API to give agents real-time threat intelligence,
 * CVE lookups, dependency patch info, and documentation search.
 */

const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;
const TAVILY_BASE_URL = 'https://api.tavily.com';

export interface TavilySearchResult {
    title: string;
    url: string;
    content: string;
    score: number;
    published_date?: string;
}

export interface TavilySearchResponse {
    query: string;
    results: TavilySearchResult[];
    answer?: string;
}

/**
 * Search the web for security intelligence via Tavily.
 * @param query - Search query, e.g. "CVE-2024-32002 git vulnerability patch"
 * @param maxResults - Number of results to retrieve (default: 5)
 * @param searchDepth - 'basic' or 'advanced' (advanced costs more credits)
 */
export async function tavilySearch(
    query: string,
    maxResults = 5,
    searchDepth: 'basic' | 'advanced' = 'basic'
): Promise<TavilySearchResponse> {
    if (!TAVILY_API_KEY) {
        throw new Error('[TavilyService] TAVILY_API_KEY is not configured.');
    }

    const res = await fetch(`${TAVILY_BASE_URL}/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            api_key: TAVILY_API_KEY,
            query,
            max_results: maxResults,
            search_depth: searchDepth,
            include_answer: true,
            include_raw_content: false,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`[TavilyService] Search failed: ${res.status} - ${err}`);
    }

    return res.json() as Promise<TavilySearchResponse>;
}

/**
 * Convenience: Search for CVE/security advisory information for a given dependency.
 */
export async function searchVulnerability(packageName: string, version?: string): Promise<TavilySearchResponse> {
    const query = version
        ? `security vulnerability CVE ${packageName} ${version} patch fix`
        : `latest CVE security vulnerability ${packageName} npm patch`;
    return tavilySearch(query, 5, 'advanced');
}

/**
 * Convenience: Search for best-practice fix for a given issue.
 */
export async function searchBestPracticeFix(issue: string): Promise<TavilySearchResponse> {
    return tavilySearch(`best practice solution fix: ${issue} healthcare security`, 5, 'basic');
}
