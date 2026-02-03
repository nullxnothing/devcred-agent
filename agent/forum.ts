/**
 * Colosseum Forum API Client
 *
 * Posts notable events to the hackathon forum.
 */

import { ForumPost } from './types';

const FORUM_API_BASE = 'https://agents.colosseum.com/api';
const MIN_POST_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes between alert posts (rate limit: 30/hour)

class ForumClient {
  private apiKey: string | null = null;
  private lastPostTime = 0;
  private postCount = 0;

  /**
   * Set the API key for forum access
   */
  setApiKey(key: string): void {
    this.apiKey = key;
    console.log('[Forum] API key configured');
  }

  /**
   * Post to the Colosseum forum
   */
  async post(post: ForumPost): Promise<boolean> {
    if (!this.apiKey) {
      console.log('[Forum] No API key configured, skipping post');
      return false;
    }

    // Rate limit posts (30/hour max, so ~2 min minimum, but we use 30 min for alerts)
    const now = Date.now();
    if (now - this.lastPostTime < MIN_POST_INTERVAL_MS) {
      console.log('[Forum] Rate limited, skipping post');
      return false;
    }

    try {
      const response = await fetch(`${FORUM_API_BASE}/forum/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          title: post.title.slice(0, 200), // Max 200 chars
          body: post.body.slice(0, 10000), // Max 10k chars
          tags: post.tags.slice(0, 5), // Max 5 tags
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Forum] Post failed:', response.status, error);
        return false;
      }

      this.lastPostTime = now;
      this.postCount++;
      console.log(`[Forum] Posted: "${post.title}"`);
      return true;
    } catch (error) {
      console.error('[Forum] Post error:', error);
      return false;
    }
  }

  /**
   * Get forum client stats
   */
  getStats(): { postCount: number; hasApiKey: boolean } {
    return {
      postCount: this.postCount,
      hasApiKey: !!this.apiKey,
    };
  }
}

// Singleton instance
export const forumClient = new ForumClient();
