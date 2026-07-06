// TracerMenuScreen.js
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TopHeaderDark from "../components/TopHeaderDark";
import styles, { COLORS } from "../styles/TracerMenuScreen.styles";
import { getTracerForms, getTracerProgress } from "../services/tracerQueries";
import { getCurrentUser } from "../services/supabaseAuth";
import { getAlumniByEmail } from "../services/alumniQueries";
import { ThemedAlert } from "../components/ThemedAlert";
import mascotImg from '../../assets/images/nu-mascot.png';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const TOTAL_STARS = 5;
const ALUMNI_COUNT = 2847;

// Generate constellation-like stars
const generateStars = () => {
  const stars = [];
  for (let i = 0; i < 60; i++) {
    stars.push({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.15,
    });
  }
  return stars;
};

const STARS = generateStars();

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

const getPhaseIcon = (iconName) => {
  const iconMap = {
    "fa-user": "🧑‍🚀",
    "fa-graduation-cap": "🎓",
    "fa-briefcase": "💼",
    "fa-chart-line": "📊",
    "fa-home": "🏠",
    "fa-map-marker-alt": "📍",
    "fa-phone": "📡",
    "fa-envelope": "📨",
  };
  return iconMap[iconName] || "🛸";
};

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

/** Constellation background */
const StarField = () => (
  <View style={styles.starsContainer} pointerEvents="none">
    {STARS.map((star, i) => (
      <View
        key={i}
        style={{
          position: 'absolute',
          top: star.top,
          left: star.left,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: '#FFFFFF',
          opacity: star.opacity,
        }}
      />
    ))}
  </View>
);

/** Star-based progress indicator */
const StarProgress = ({ completedCount, totalSections }) => {
  const pct = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;
  const filledStars = totalSections > 0 ? Math.round((completedCount / totalSections) * TOTAL_STARS) : 0;

  return (
    <View style={styles.progressSection}>
      <Text style={styles.progressLabel}>Overall Progress</Text>
      
      {/* Stars + Percentage */}
      <View style={styles.progressHeaderRow}>
        <View style={styles.progressStarContainer}>
          {[...Array(TOTAL_STARS)].map((_, i) => (
            <Text
              key={i}
              style={[
                styles.progressStar,
                i >= filledStars && styles.progressStarEmpty,
              ]}
            >
              ⭐
            </Text>
          ))}
        </View>
        <View style={styles.progressPercentContainer}>
          <Text style={styles.progressPercentText}>{pct}%</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[styles.progressBarFill, { width: `${Math.max(pct, 2)}%` }]}
          />
        </View>
      </View>

      {/* Milestones */}
      <View style={styles.milestonesRow}>
        {[0, 25, 50, 75, 100].map((milestone) => {
          const reached = pct >= milestone;
          return (
            <View key={milestone} style={styles.milestoneItem}>
              <View
                style={[
                  styles.milestoneDot,
                  reached && styles.milestoneDotReached,
                ]}
              />
              <Text
                style={[
                  styles.milestoneLabel,
                  reached && styles.milestoneLabelReached,
                ]}
              >
                {milestone}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

/** Phase/Mission Card */
const PhaseCard = ({ phase, phaseIndex, completedCount, totalSections, onPress }) => {
  const isDone = completedCount === totalSections && totalSections > 0;
  const progressRatio = totalSections > 0 ? completedCount / totalSections : 0;
  const progressPercent = Math.round(progressRatio * 100);
  const accentColor = phase.color || COLORS.nebulaBlue;

  return (
    <TouchableOpacity
      style={[styles.phaseCard, isDone && styles.phaseCardDone]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.accentLine, { backgroundColor: isDone ? COLORS.nebulaGreen : accentColor }]} />
      
      <View style={styles.phaseCardContent}>
        {/* Header */}
        <View style={styles.phaseHeader}>
          <View style={[styles.phaseIconContainer, { backgroundColor: accentColor + '18' }]}>
            <Text style={styles.phaseIcon}>{getPhaseIcon(phase.icon)}</Text>
          </View>
          
          <View style={styles.phaseHeaderInfo}>
            <View style={styles.phaseHeaderTop}>
              <View style={[styles.phaseBadge, { backgroundColor: accentColor + '15' }]}>
                <View style={[styles.phaseBadgeDot, { backgroundColor: accentColor }]} />
                <Text style={[styles.phaseBadgeText, { color: accentColor }]}>
                  Mission {phaseIndex + 1}
                </Text>
              </View>
              {isDone && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>✦ Complete</Text>
                </View>
              )}
            </View>
            <Text style={styles.phaseTitle} numberOfLines={2}>{phase.title}</Text>
            {phase.subtitle ? (
              <Text style={styles.phaseSubtitle} numberOfLines={2}>{phase.subtitle}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressInfo}>
            <View style={styles.progressStats}>
              <Text style={styles.progressPin}>{isDone ? '✅' : '📍'}</Text>
              <Text style={[styles.progressCount, { color: isDone ? COLORS.nebulaGreen : accentColor }]}>
                {completedCount}
              </Text>
              <Text style={styles.progressTotal}> / {totalSections} sections</Text>
            </View>
            <Text style={[styles.progressPercent, { color: isDone ? COLORS.nebulaGreen : accentColor }]}>
              {progressPercent}%
            </Text>
          </View>
          
          <View style={styles.progressBarCardBg}>
            <View
              style={[
                styles.progressBarCardFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: isDone ? COLORS.nebulaGreen : accentColor,
                },
              ]}
            />
          </View>
        </View>

        {/* Action */}
        <View style={styles.actionHint}>
          <Text style={styles.actionHintText}>
            {isDone ? 'View mission report' : totalSections > 0 ? 'Continue mission' : 'Begin mission'}
          </Text>
          <Text style={[styles.actionArrow, { color: accentColor }]}>→</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

const TracerMenuScreen = ({ navigation }) => {
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alumniData, setAlumniData] = useState(null);
  const [completedSections, setCompletedSections] = useState(new Set());
  const [showAllPhases, setShowAllPhases] = useState(false);

  const loadTracerData = async () => {
    try {
      setLoading(true);
      
      const supaUser = await getCurrentUser();
      if (!supaUser?.email) {
        ThemedAlert.alert("Session Expired", "Please log in again to access the tracer.");
        navigation.replace("Login");
        return;
      }

      const alumni = await getAlumniByEmail(supaUser.email);
      if (!alumni) {
        ThemedAlert.alert("Profile Not Found", "Unable to find your alumni profile.");
        return;
      }
      setAlumniData(alumni);

      const phasesData = await getTracerForms();
      const progress = await getTracerProgress(alumni.id);
      
      if (progress?.completedSectionIds) {
        setCompletedSections(new Set(progress.completedSectionIds));
      }

      setPhases(phasesData || []);
    } catch (error) {
      console.error("[TracerMenuScreen] Error loading data:", error);
      ThemedAlert.alert("Error", "Failed to load tracer information. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTracerData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTracerData();
  };

const handlePhasePress = (phase) => {
  navigation.navigate("PhaseSections", {
    phase: phase,
    alumniId: alumniData?.id,
  });
};

  const { totalSections, overallCompleted } = useMemo(() => {
    let total = 0;
    let completed = 0;
    
    phases.forEach(phase => {
      const sections = phase.sections || [];
      total += sections.length;
      sections.forEach(section => {
        if (completedSections.has(section.id)) {
          completed++;
        }
      });
    });
    
    return { totalSections: total, overallCompleted: completed };
  }, [phases, completedSections]);

  const visiblePhases = showAllPhases ? phases : phases.slice(0, 3);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.deepSpace} />
        <TopHeaderDark />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.goldStar} />
          <Text style={styles.loadingText}>Initializing navigation systems...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.deepSpace} />
      <TopHeaderDark />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.goldStar}
            colors={[COLORS.goldStar]}
            progressBackgroundColor={COLORS.cardBg}
          />
        }
      >
        <StarField />

        {/* ── HERO ── */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Alumni Explorer</Text>
          <Text style={styles.heroSubtitle}>Digital Alumni Tracer</Text>
        </View>

        {/* ── STAR PROGRESS ── */}
        <StarProgress
          completedCount={overallCompleted}
          totalSections={totalSections}
        />

        {/* ── MISSION PHASES ── */}
        <View style={styles.phasesSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionIcon}>🛸</Text>
              <Text style={styles.sectionTitle}>Mission Phases</Text>
            </View>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{phases.length} missions</Text>
            </View>
          </View>

          {phases.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌌</Text>
              <Text style={styles.emptyTitle}>No Active Missions</Text>
              <Text style={styles.emptyText}>
                The cosmos is quiet. No tracer missions are available at this moment.
              </Text>
            </View>
          ) : (
            <>
              {visiblePhases.map((phase, index) => {
                const sections = phase.sections || [];
                const completedCount = sections.filter((section) =>
                  completedSections.has(section.id)
                ).length;

                return (
                  <PhaseCard
                    key={phase.id}
                    phase={phase}
                    phaseIndex={index}
                    completedCount={completedCount}
                    totalSections={sections.length}
                    onPress={() => handlePhasePress(phase)}
                  />
                );
              })}

              {phases.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => setShowAllPhases(!showAllPhases)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>
                    {showAllPhases
                      ? 'Show Less ▲'
                      : `View All ${phases.length} Missions ▼`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* ── SHARE YOUR JOURNEY ── */}
        <View style={styles.journeySection}>
          <Text style={styles.journeyTitle}>Share Your Alumni Journey With Us!</Text>
          <Text style={styles.journeyHighlight}>Help Future Nationalians</Text>
          <Text style={styles.journeyText}>
            Your feedback shapes NU LIPA's programs and curriculum!
          </Text>

          {/* Mascot Image - REPLACE WITH YOUR IMAGE */}
          <View style={styles.mascotContainer}>
            {/* 
              TO ADD THE MASCOT IMAGE:
              1. Place your mascot image in assets/images/ folder
              2. Import it at the top: import mascotImg from '../../assets/images/mascot.png';
              3. Replace the placeholder below with:
              <Image source={mascotImg} style={styles.mascotImage} />
            */}
            <Image source={mascotImg} style={styles.mascotImage} />
          </View>

          <View style={styles.alumniCountContainer}>
            <Text style={styles.alumniCountText}>
              Join{' '}
              <Text style={styles.alumniCountNumber}>
                {ALUMNI_COUNT.toLocaleString()}
              </Text>{' '}
              alumni who've already completed their tracer!
            </Text>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>
            Your responses help chart the course for future explorers
          </Text>
          <Text style={styles.footerStars}>✦  ✦  ✦</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TracerMenuScreen;