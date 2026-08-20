// src/utils/feedAlgorithm.js

/**
 * Easily tunable weights for A/B testing feed engagement
 */
const FEED_CONFIG = {
  BASELINE: 10,
  VIDEO_BOOST: 25,
  CAROUSEL_BOOST: 15,
  IMAGE_BOOST: 10,
  FRESHNESS_BOOST: 15,
  DIRECT_CONNECTION: 40,
  MUTUAL_INTERACTION: 20,
  COLD_START: 50,
  PROGRAM_MATCH: 25,
  DISCIPLINE_MATCH: 10,
  BATCH_MATCH: 20,
  LONG_CAPTION_BOOST: 15,
  MED_CAPTION_BOOST: 10,
  PROFESSIONAL_BOOST: 20,
  ANNOUNCEMENT: 70,
  VELOCITY_MULTIPLIER: 1.3,
  GRAVITY_DECAY: 1.2,
  AUTHOR_SPACING_STRIDE: 3 // Minimum posts between the same author
};

/**
 * Compiled Regex for fast, strict word-boundary matching
 */
const PROFESSIONAL_KEYWORDS = /\b(hiring|promotion|opening|business|opportunity|referral|graduated|upwork|freelance|figma|firebase|github|transcribe)\b/i;

const PROGRAM_DISCIPLINES = {
  computing: ['bsit', 'bscs', 'bscpe', 'bsis', 'act', 'computer', 'information technology', 'software'],
  business: ['bsba', 'bsa', 'bsais', 'bshm', 'bstm', 'accountancy', 'marketing', 'finance', 'hospitality', 'tourism'],
  engineering: ['bsee', 'bsce', 'bsme', 'bsece', 'bsie', 'engineering', 'civil', 'electrical', 'mechanical'],
  health: ['bsn', 'bsmt', 'bspt', 'nursing', 'medical technology', 'pharmacy', 'health'],
  arts_sciences: ['bacomm', 'bspsych', 'psychology', 'communication', 'arts', 'multimedia', 'criminology']
};

const getDisciplineCategory = (programStr) => {
  if (!programStr) return null;
  const clean = String(programStr).toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  
  for (const [category, keywords] of Object.entries(PROGRAM_DISCIPLINES)) {
    if (keywords.some((kw) => clean.includes(kw))) {
      return category;
    }
  }
  return null;
};

export const getFeedItemTimestamp = (item) => {
  const rawValue = item?.created_at ?? item?.date_posted ?? item?.posted_at ?? item?.published_at ?? null;
  if (!rawValue) return 0;
  const timestamp = new Date(rawValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getDeterministicHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; 
  }
  return Math.abs(hash % 10);
};

const isVideo = (uri) => {
  if (!uri) return false;
  const lowerUri = String(uri).toLowerCase();
  return lowerUri.includes('.mp4') || lowerUri.includes('.mov') || lowerUri.includes('.webm') || lowerUri.includes('.mkv');
};

/**
 * The FB/IG/LinkedIn Hybrid Feed Algorithm
 */
export const sortFeedPosts = (posts, feedSortMode, feedRefreshNonce, connections, userData) => {
  const sourcePosts = Array.isArray(posts) ? [...posts] : [];
  
  if (feedSortMode === 'newest') {
    return sourcePosts.sort((a, b) => getFeedItemTimestamp(b) - getFeedItemTimestamp(a));
  }

  const connectionIds = new Set(
    (connections || [])
      .map((c) => String(c?.id ?? c?.alumni_id ?? ''))
      .filter(Boolean)
  );

  const myRawProgram = String(userData?.program || userData?.course || '').toLowerCase().trim();
  const myProgramClean = myRawProgram.replace(/[^a-z0-9]/g, '');
  const myDiscipline = getDisciplineCategory(myRawProgram);
  const myBatch = String(userData?.batch || userData?.grad_year || userData?.year_graduated || '').trim();

  let scoredPosts = sourcePosts.map((item) => {
    let baseScore = FEED_CONFIG.BASELINE; 
    
    const isAnnouncement = item?.feed_type === 'announcement';
    const authorId = String(item?.alumni?.id ?? '');
    
    const authorRawProgram = String(item?.alumni?.program || item?.alumni?.course || '').toLowerCase().trim();
    const authorProgramClean = authorRawProgram.replace(/[^a-z0-9]/g, '');
    const authorDiscipline = getDisciplineCategory(authorRawProgram);
    const authorBatch = String(item?.alumni?.batch || item?.alumni?.grad_year || item?.alumni?.year_graduated || '').trim();

    const postTimestamp = getFeedItemTimestamp(item);
    const ageInHours = Math.max(0, (Date.now() - postTimestamp) / (1000 * 60 * 60));

    // --- 1. GRANULAR MEDIA WEIGHTING ---
    const mediaItems = Array.isArray(item?.images) ? item.images : [];
    if (mediaItems.length > 0) {
      const hasVideo = mediaItems.some(m => isVideo(m?.image_url || m?.image_path || m?.uri));
      if (hasVideo) {
        baseScore += FEED_CONFIG.VIDEO_BOOST;
      } else if (mediaItems.length > 1) {
        baseScore += FEED_CONFIG.CAROUSEL_BOOST;
      } else {
        baseScore += FEED_CONFIG.IMAGE_BOOST;
      }
    }

    if (ageInHours < 4) baseScore += FEED_CONFIG.FRESHNESS_BOOST; 

    // --- 2. THE SOCIAL GRAPH ---
    const isDirectConnection = authorId && connectionIds.has(authorId);
    if (isDirectConnection) baseScore += FEED_CONFIG.DIRECT_CONNECTION;

    // --- 3. SECOND-DEGREE SOCIAL PROOF ---
    const interactorIds = Array.isArray(item?.interactor_ids) ? item.interactor_ids : [];
    const hasNetworkInteraction = interactorIds.some(id => connectionIds.has(String(id)));
    if (hasNetworkInteraction && !isDirectConnection) {
      baseScore += FEED_CONFIG.MUTUAL_INTERACTION; 
    }

    // --- 4. ENGAGEMENT & VELOCITY ---
    const weightedEngagement = (item?.reaction_count ?? 0) * 1 
                             + (item?.comment_count ?? 0) * 3 
                             + (item?.repost_count ?? 0) * 4;
                             
    if (weightedEngagement > 0) {
      baseScore += Math.log10(weightedEngagement + 1) * 35; 
      
      // Prevent massive multiplier spikes on 0-hour posts by forcing a 0.5 hour floor
      const velocity = weightedEngagement / Math.max(0.5, ageInHours);
      if (velocity > 2) { 
        baseScore *= FEED_CONFIG.VELOCITY_MULTIPLIER; 
      }
    }

    // --- 5. THE COLD START BOOST ---
    if (item?.alumni?.is_new_alumni || item?.is_first_post) {
      baseScore += FEED_CONFIG.COLD_START; 
    }

    // --- 6. AFFINITY & MILESTONES ---
    if (myProgramClean && authorProgramClean && myProgramClean === authorProgramClean) {
      baseScore += FEED_CONFIG.PROGRAM_MATCH; 
    } else if (myDiscipline && authorDiscipline && myDiscipline === authorDiscipline) {
      baseScore += FEED_CONFIG.DISCIPLINE_MATCH; 
    }

    if (myBatch && authorBatch && myBatch === authorBatch) {
      baseScore += FEED_CONFIG.BATCH_MATCH; 
    }

    const captionText = String(item?.caption || item?.announcement_description || '').toLowerCase();
    const captionLength = captionText.length;
    if (captionLength > 300) baseScore += FEED_CONFIG.LONG_CAPTION_BOOST; 
    else if (captionLength > 150) baseScore += FEED_CONFIG.MED_CAPTION_BOOST; 

    // Replaced .some() with Regex test
    if (PROFESSIONAL_KEYWORDS.test(captionText)) {
      baseScore += FEED_CONFIG.PROFESSIONAL_BOOST; 
    }

    if (isAnnouncement) baseScore += FEED_CONFIG.ANNOUNCEMENT; 

    const itemKey = String(item?.id ?? item?.feed_id ?? Math.random());
    const jitter = getDeterministicHash(itemKey + feedRefreshNonce);
    baseScore += jitter;

    // --- GRAVITY DECAY ---
    const finalScore = baseScore / Math.pow(ageInHours + 2, FEED_CONFIG.GRAVITY_DECAY);

    return { 
      item, 
      finalScore, 
      authorId, 
      isAnnouncement,
      timestamp: postTimestamp 
    };
  });

  scoredPosts.sort((a, b) => b.finalScore - a.finalScore || b.timestamp - a.timestamp);

  // --- SMART MEDIA DIVERSITY BUILDER (STRIDE INJECTION) ---
  const finalFeed = [];
  const recentAuthors = []; 
  const delayedQueue = [];

  for (const post of scoredPosts) {
    if (post.isAnnouncement || !post.authorId) {
      finalFeed.push(post.item);
      continue;
    }

    // Check if author posted recently within the stride limit
    if (recentAuthors.includes(post.authorId)) {
      delayedQueue.push(post.item);
    } else {
      finalFeed.push(post.item);
      recentAuthors.push(post.authorId);
      
      // Keep track of the last N authors to enforce the stride
      if (recentAuthors.length > FEED_CONFIG.AUTHOR_SPACING_STRIDE) {
        recentAuthors.shift(); 
      }
    }
  }

  // Interleave delayed posts back into the feed using the Stride step
  let insertionIndex = FEED_CONFIG.AUTHOR_SPACING_STRIDE;
  while (delayedQueue.length > 0) {
    if (insertionIndex >= finalFeed.length) {
      // If we reach the end of the natural feed, just append the rest
      finalFeed.push(...delayedQueue);
      break;
    }
    finalFeed.splice(insertionIndex, 0, delayedQueue.shift());
    insertionIndex += (FEED_CONFIG.AUTHOR_SPACING_STRIDE + 1);
  }

  return finalFeed;
};