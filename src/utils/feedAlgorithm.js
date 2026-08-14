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
 * The FB/IG/LinkedIn Hybrid Feed Algorithm 
 * Integrates Logarithmic Engagement, Storyteller Bumps, Active Conversation, Media Diversity, and Career Milestones.
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

  // 3. First Pass: Calculate Base Scores for all posts
  const scoredPosts = sourcePosts.map((item) => {
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

    const postTimestamp = getFeedItemTimestamp(item);
    const ageInHours = (Date.now() - postTimestamp) / (1000 * 60 * 60);

    // ---------------------------------------------------------
    // THE INSTAGRAM DNA (Visuals & Recency)
    // ---------------------------------------------------------
    
    if (ageInHours < 24) {
      score += Math.max(0, 50 - (ageInHours * 2)); 
    } else {
      score -= (ageInHours * 0.5); 
    }

    const hasImages = Array.isArray(item?.images) && item.images.length > 0;
    if (hasImages) score += 15;

    // FEATURE 2: Interaction Recency Decay (The "Active Conversation" Bump)
    if (ageInHours < 4) {
      score += 15; // Massive surge for currently trending/hyper-fresh posts
    }

    // ---------------------------------------------------------
    // THE FACEBOOK DNA (Social Graph & Deep Engagement)
    // ---------------------------------------------------------
    
    if (connectionIds.has(authorId)) score += 40;

    const weightedEngagement = (item?.reaction_count ?? 0) * 1 
                             + (item?.comment_count ?? 0) * 3 
                             + (item?.repost_count ?? 0) * 4;
                             
    if (weightedEngagement > 0) {
      score += Math.log10(weightedEngagement + 1) * 25;
    }

    // ---------------------------------------------------------
    // THE LINKEDIN DNA (Affinity, Content Depth & Milestones)
    // ---------------------------------------------------------
    
    if (myProgramClean && authorProgramClean) {
      if (myProgramClean === authorProgramClean) {
        score += 25; 
      } else if (myDiscipline && authorDiscipline && myDiscipline === authorDiscipline) {
        score += 10; 
      }
    }

    if (myBatch && authorBatch && myBatch === authorBatch) {
      score += 20; 
    }

    const captionText = String(item?.caption || item?.announcement_description || '').toLowerCase();
    const captionLength = captionText.length;
    
    if (captionLength > 300) {
      score += 15; 
    } else if (captionLength > 150) {
      score += 10; 
    }

    // FEATURE 4: Alumni Status & Career Milestone Boost
    const professionalKeywords = [
      'hiring', 'promotion', 'opening', 'business', 'opportunity', 
      'referral', 'graduated', 'upwork', 'freelance', 'figma', 
      'firebase', 'github', 'transcribe'
    ];
    
    if (professionalKeywords.some(keyword => captionText.includes(keyword))) {
      score += 20; 
    }

    // ---------------------------------------------------------
    // PLATFORM RULES & TIE-BREAKERS
    // ---------------------------------------------------------
    
    if (isAnnouncement) score += 60; 

    const itemKey = String(item?.id ?? item?.feed_id ?? '');
    score += (shuffleMap.get(itemKey) ?? 0) * 10;

    return { 
      item, 
      score, 
      authorId, 
      isAnnouncement,
      timestamp: postTimestamp 
    };
  });

  // 4. Initial Sort based on calculated scores
  scoredPosts.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.timestamp - a.timestamp;
  });

  // 5. FEATURE 3: Media Diversity Penalty (Preventing Feed Monopolization)
  // Scans the sorted feed and penalizes consecutive posts by the same author
  for (let i = 1; i < scoredPosts.length; i++) {
    // Skip penalty for announcements so multiple official updates don't bury each other
    if (scoredPosts[i].isAnnouncement) continue;

    const currentAuthor = scoredPosts[i].authorId;
    const prevAuthor = scoredPosts[i - 1].authorId;

    if (currentAuthor === prevAuthor && currentAuthor !== '') {
      scoredPosts[i].score -= 15; // Apply the diversity penalty
    }
  }

  // 6. Final Sort to lock in the Diversity Penalties
  scoredPosts.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.timestamp - a.timestamp;
  });

  // 7. Strip out the scoring wrapper and return the clean array
  return scoredPosts.map(obj => obj.item);
};