// src/utils/feedAlgorithm.js

/**
 * Mapping helper to group related degree programs under broader academic disciplines.
 */
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
 * Incorporates Gravity Math, Trending Velocity, Cold Starts, Media Weighting, and Social Proof.
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
    let baseScore = 10; // Baseline
    
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
        baseScore += 25; // Video requires highest dwell time
      } else if (mediaItems.length > 1) {
        baseScore += 15; // Carousel requires swiping
      } else {
        baseScore += 10; // Single image
      }
    }

    if (ageInHours < 4) baseScore += 15; 

    // --- 2. THE SOCIAL GRAPH ---
    const isDirectConnection = authorId && connectionIds.has(authorId);
    if (isDirectConnection) baseScore += 40;

    // --- 3. SECOND-DEGREE SOCIAL PROOF ---
    // Safely check if mutuals are interacting with a stranger's post
    const interactorIds = Array.isArray(item?.interactor_ids) ? item.interactor_ids : [];
    const hasNetworkInteraction = interactorIds.some(id => connectionIds.has(String(id)));
    if (hasNetworkInteraction && !isDirectConnection) {
      baseScore += 20; 
    }

    // --- 4. ENGAGEMENT & VELOCITY ---
    const weightedEngagement = (item?.reaction_count ?? 0) * 1 
                             + (item?.comment_count ?? 0) * 3 
                             + (item?.repost_count ?? 0) * 4;
                             
    if (weightedEngagement > 0) {
      baseScore += Math.log10(weightedEngagement + 1) * 35; 
      
      // Trending Detection: Boost if gaining high engagement rapidly
      const velocity = weightedEngagement / Math.max(1, ageInHours);
      if (velocity > 2) { 
        baseScore *= 1.3; // 30% multiplier for trending velocity
      }
    }

    // --- 5. THE COLD START BOOST ---
    if (item?.alumni?.is_new_alumni || item?.is_first_post) {
      baseScore += 50; 
    }

    // --- 6. AFFINITY & MILESTONES ---
    if (myProgramClean && authorProgramClean && myProgramClean === authorProgramClean) {
      baseScore += 25; 
    } else if (myDiscipline && authorDiscipline && myDiscipline === authorDiscipline) {
      baseScore += 10; 
    }

    if (myBatch && authorBatch && myBatch === authorBatch) {
      baseScore += 20; 
    }

    const captionText = String(item?.caption || item?.announcement_description || '').toLowerCase();
    const captionLength = captionText.length;
    if (captionLength > 300) baseScore += 15; 
    else if (captionLength > 150) baseScore += 10; 

    const professionalKeywords = [
      'hiring', 'promotion', 'opening', 'business', 'opportunity', 
      'referral', 'graduated', 'upwork', 'freelance', 'figma', 
      'firebase', 'github', 'transcribe'
    ];
    if (professionalKeywords.some(keyword => captionText.includes(keyword))) {
      baseScore += 20; 
    }

    if (isAnnouncement) baseScore += 70; 

    const itemKey = String(item?.id ?? item?.feed_id ?? Math.random());
    const jitter = getDeterministicHash(itemKey + feedRefreshNonce);
    baseScore += jitter;

    // --- GRAVITY DECAY ---
    const gravity = 1.2;
    const finalScore = baseScore / Math.pow(ageInHours + 2, gravity);

    return { 
      item, 
      finalScore, 
      authorId, 
      isAnnouncement,
      timestamp: postTimestamp 
    };
  });

  scoredPosts.sort((a, b) => b.finalScore - a.finalScore || b.timestamp - a.timestamp);

  // --- MEDIA DIVERSITY BUILDER ---
  const finalFeed = [];
  const delayedBuffer = [];
  let lastAuthorId = null;

  for (const post of scoredPosts) {
    if (!post.isAnnouncement && post.authorId === lastAuthorId && post.authorId !== '') {
      delayedBuffer.push(post.item);
    } else {
      finalFeed.push(post.item);
      if (!post.isAnnouncement) {
        lastAuthorId = post.authorId;
      }
    }
  }

  return [...finalFeed, ...delayedBuffer];
};