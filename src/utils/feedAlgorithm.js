// src/utils/feedAlgorithm.js

/**
 * Mapping helper to group related degree programs under broader academic disciplines.
 * Allows alumni in sister programs (e.g. BSIT & BSCS) to discover each other's content.
 */
const PROGRAM_DISCIPLINES = {
  computing: ['bsit', 'bscs', 'bscpe', 'bsis', 'act', 'computer', 'information technology', 'software'],
  business: ['bsba', 'bsa', 'bsais', 'bshm', 'bstm', 'accountancy', 'marketing', 'finance', 'hospitality', 'tourism'],
  engineering: ['bsee', 'bsce', 'bsme', 'bsece', 'bsie', 'engineering', 'civil', 'electrical', 'mechanical'],
  health: ['bsn', 'bsmt', 'bspt', 'nursing', 'medical technology', 'pharmacy', 'health'],
  arts_sciences: ['bacomm', 'bspsych', 'psychology', 'communication', 'arts', 'multimedia', 'criminology']
};

/**
 * Helper function to detect the discipline category for a given program string.
 */
const getDisciplineCategory = (programStr) => {
  if (!programStr) return null;
  const clean = String(programStr).toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const [category, keywords] of Object.entries(PROGRAM_DISCIPLINES)) {
    if (keywords.some((kw) => clean.includes(kw))) {
      return category;
    }
  }
  return null;
};

/**
 * Extracts a safe timestamp from a feed item.
 */
export const getFeedItemTimestamp = (item) => {
  const rawValue = item?.created_at ?? item?.date_posted ?? item?.posted_at ?? item?.published_at ?? null;
  if (!rawValue) return 0;
  const timestamp = new Date(rawValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

/**
 * The FB/IG/LinkedIn Hybrid Feed Algorithm.
 */
export const sortFeedPosts = (posts, feedSortMode, feedRefreshNonce, connections, userData) => {
  const sourcePosts = Array.isArray(posts) ? [...posts] : [];
  
  // If user explicitly selects chronological, bypass the algorithm entirely
  if (feedSortMode === 'newest') {
    return sourcePosts.sort((a, b) => getFeedItemTimestamp(b) - getFeedItemTimestamp(a));
  }

  // 1. Map current user's connections for fast lookup
  const connectionIds = new Set(
    (connections || []).map((c) => String(c?.id ?? c?.alumni_id ?? ''))
  );

  // 2. Extract current user's profile metadata for affinity matching
  const myRawProgram = String(userData?.program || userData?.course || '').toLowerCase().trim();
  const myProgramClean = myRawProgram.replace(/[^a-z0-9]/g, '');
  const myDiscipline = getDisciplineCategory(myRawProgram);
  const myBatch = String(userData?.batch || userData?.grad_year || userData?.year_graduated || '').trim();

  // Generate a distinct random shuffle map for micro-jittering ties
  const shuffleMap = new Map();
  sourcePosts.forEach((item) => {
    const itemKey = item?.id ?? item?.feed_id ?? Math.random();
    shuffleMap.set(String(itemKey), Math.random());
  });

  return sourcePosts.sort((a, b) => {
    const calculateScore = (item) => {
      let score = 0;
      
      const isAnnouncement = item?.feed_type === 'announcement';
      const authorId = String(item?.alumni?.id ?? '');
      
      const authorRawProgram = String(
        item?.alumni?.program || item?.alumni?.course || ''
      ).toLowerCase().trim();
      const authorProgramClean = authorRawProgram.replace(/[^a-z0-9]/g, '');
      const authorDiscipline = getDisciplineCategory(authorRawProgram);

      const authorBatch = String(
        item?.alumni?.batch || item?.alumni?.grad_year || item?.alumni?.year_graduated || ''
      ).trim();

      const ageInHours = (Date.now() - getFeedItemTimestamp(item)) / (1000 * 60 * 60);

      // ---------------------------------------------------------
      // 1. THE INSTAGRAM DNA (Visuals & Recency)
      // ---------------------------------------------------------
      
      // Freshness Multiplier: Posts under 24 hours old get up to 50 bonus points.
      if (ageInHours < 24) {
        score += Math.max(0, 50 - (ageInHours * 2)); 
      } else {
        // Slow decay for older posts (-0.5 pts per hour)
        score -= (ageInHours * 0.5); 
      }

      // Visual Content Bump: Posts with images/attachments get a boost
      const hasImages = Array.isArray(item?.images) && item.images.length > 0;
      if (hasImages) score += 15;

      // ---------------------------------------------------------
      // 2. THE FACEBOOK DNA (Social Graph & Deep Engagement)
      // ---------------------------------------------------------
      
      // Connections: Massive boost if the user follows the author
      if (connectionIds.has(authorId)) score += 40;

      // Deep Engagement: Not all interactions are equal
      score += (item?.reaction_count ?? 0) * 1; // Likes are cheap
      score += (item?.comment_count ?? 0) * 3;  // Comments show actual conversation
      score += (item?.repost_count ?? 0) * 4;   // Shares are high-value endorsements

      // ---------------------------------------------------------
      // 3. THE LINKEDIN DNA (Professional/Academic Affinity)
      // ---------------------------------------------------------
      
      // Academic Overlap
      if (myProgramClean && authorProgramClean) {
        if (myProgramClean === authorProgramClean) {
          score += 25; // Exact course match
        } else if (myDiscipline && authorDiscipline && myDiscipline === authorDiscipline) {
          score += 10; // Sister-course match (same department)
        }
      }

      // Batch Overlap
      if (myBatch && authorBatch && myBatch === authorBatch) {
        score += 20; // Graduated same year
      }

      // ---------------------------------------------------------
      // 4. PLATFORM RULES & TIE-BREAKERS
      // ---------------------------------------------------------
      
      // Admin Announcements need to be visible, but a highly viral, fresh friend post can still outrank them
      if (isAnnouncement) score += 60; 

      // Micro-Jitter: Just enough variance (0 to 10 points) to break ties dynamically
      const itemKey = String(item?.id ?? item?.feed_id ?? '');
      score += (shuffleMap.get(itemKey) ?? 0) * 10;

      return score;
    };

    const aScore = calculateScore(a);
    const bScore = calculateScore(b);

    // Sort descending by calculated score
    if (bScore !== aScore) return bScore - aScore;
    
    // Fallback to strict date order if scores perfectly tie
    return getFeedItemTimestamp(b) - getFeedItemTimestamp(a);
  });
};