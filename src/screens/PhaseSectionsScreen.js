// PhaseSectionsScreen.js
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopHeaderDark from "../components/TopHeaderDark";
import styles from "../styles/PhaseSectionsScreen.styles";
import { getTracerProgress } from "../services/tracerQueries";
import { ThemedAlert } from "../components/ThemedAlert";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const STARS = [
  { top: '5%', left: '8%', size: 2, opacity: 0.4 },
  { top: '15%', left: '25%', size: 1.5, opacity: 0.5 },
  { top: '10%', left: '75%', size: 2, opacity: 0.3 },
  { top: '25%', left: '88%', size: 1, opacity: 0.4 },
  { top: '30%', left: '12%', size: 2.5, opacity: 0.5 },
  { top: '40%', left: '65%', size: 1, opacity: 0.3 },
  { top: '50%', left: '92%', size: 1.5, opacity: 0.4 },
  { top: '55%', left: '6%', size: 2, opacity: 0.5 },
  { top: '65%', left: '78%', size: 1, opacity: 0.3 },
  { top: '70%', left: '28%', size: 2, opacity: 0.4 },
  { top: '80%', left: '55%', size: 1.5, opacity: 0.5 },
  { top: '88%', left: '18%', size: 1, opacity: 0.3 },
];

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

/** Section Card */
const SectionCard = ({ section, index, isCompleted, isLocked, onPress }) => {
  // Determine card status
  const status = isCompleted ? 'completed' : isLocked ? 'locked' : 'available';
  
  const statusConfig = {
    completed: {
      borderColor: 'rgba(16, 185, 129, 0.3)',
      bgColor: '#1C2A4A',
      accentColor: '#10B981',
      badgeText: '✓ Complete',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      icon: '✅',
    },
    locked: {
      borderColor: 'rgba(255,255,255,0.06)',
      bgColor: '#141C3A',
      accentColor: '#4B5563',
      badgeText: '🔒 Locked',
      badgeBg: 'rgba(255,255,255,0.05)',
      icon: '🔒',
    },
    available: {
      borderColor: 'rgba(59, 130, 246, 0.3)',
      bgColor: '#161E4A',
      accentColor: '#3B82F6',
      badgeText: 'Available',
      badgeBg: 'rgba(59, 130, 246, 0.15)',
      icon: '📍',
    },
  };

  const config = statusConfig[status];

  return (
    <TouchableOpacity
      style={[
        styles.sectionCard,
        { borderColor: config.borderColor, backgroundColor: config.bgColor },
        isLocked && styles.sectionCardLocked,
      ]}
      onPress={isLocked ? null : onPress}
      activeOpacity={isLocked ? 1 : 0.7}
      disabled={isLocked}
    >
      {/* Top accent */}
      <View style={[styles.accentLine, { backgroundColor: config.accentColor }]} />
      
      <View style={styles.sectionCardContent}>
        {/* Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionNumberContainer}>
            <Text style={styles.sectionNumber}>{String(index + 1).padStart(2, '0')}</Text>
          </View>
          
          <View style={styles.sectionHeaderInfo}>
            <View style={styles.sectionBadgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: config.badgeBg }]}>
                <Text style={[styles.statusBadgeText, { color: config.accentColor }]}>
                  {config.badgeText}
                </Text>
              </View>
              {section.questions && (
                <View style={styles.questionCountBadge}>
                  <Ionicons name="help-circle-outline" size={12} color="#7B83A8" />
                  <Text style={styles.questionCountText}>
                    {section.questions.length} questions
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.sectionTitle, isLocked && styles.sectionTitleLocked]} numberOfLines={2}>
              {section.title}
            </Text>
            {section.description ? (
              <Text style={[styles.sectionDescription, isLocked && styles.sectionDescriptionLocked]} numberOfLines={2}>
                {section.description}
              </Text>
            ) : null}
          </View>

          <View style={styles.sectionStatusIcon}>
            <Text style={styles.statusEmoji}>{config.icon}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/** Phase Progress Header */
const PhaseProgressHeader = ({ phase, completedSections, totalSections }) => {
  const pct = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
  const accentColor = phase.color || '#3B82F6';

  return (
    <View style={styles.phaseProgressContainer}>
      {/* Phase icon and title */}
      <View style={styles.phaseInfoRow}>
        <View style={[styles.phaseIconCircle, { backgroundColor: accentColor + '20' }]}>
          <Text style={styles.phaseIconEmoji}>{getPhaseIcon(phase.icon)}</Text>
        </View>
        <View style={styles.phaseInfoText}>
          <Text style={styles.phaseLabel}>CURRENT MISSION</Text>
          <Text style={styles.phaseName} numberOfLines={1}>{phase.title}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.phaseProgressBar}>
        <View style={styles.phaseProgressInfo}>
          <Text style={styles.phaseProgressLabel}>Mission Progress</Text>
          <Text style={[styles.phaseProgressPct, { color: accentColor }]}>{pct}%</Text>
        </View>
        <View style={styles.phaseProgressBg}>
          <View 
            style={[
              styles.phaseProgressFill, 
              { width: `${Math.max(pct, 2)}%`, backgroundColor: accentColor }
            ]} 
          />
        </View>
        <Text style={styles.phaseProgressDetail}>
          {completedSections} of {totalSections} sections completed
        </Text>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

const PhaseSectionsScreen = ({ navigation, route }) => {
  const { phase, alumniId } = route.params;
  const [completedSections, setCompletedSections] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const sections = phase?.sections || [];

  // Sort sections by order_priority
  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => (a.order_priority || 0) - (b.order_priority || 0));
  }, [sections]);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const progress = await getTracerProgress(alumniId);
      
      if (progress?.completedSectionIds) {
        setCompletedSections(new Set(progress.completedSectionIds));
      }
    } catch (error) {
      console.error("[PhaseSections] Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSectionPress = (section, index) => {
    // Check if this section is locked (previous section not completed)
    if (index > 0) {
      const previousSection = sortedSections[index - 1];
      if (!completedSections.has(previousSection.id)) {
        ThemedAlert.alert(
          "Section Locked",
          "Please complete the previous section first, Commander!"
        );
        return;
      }
    }

    navigation.navigate("SectionQuestions", {
      phase: phase,
      section: section,
      sectionIndex: index,
      alumniId: alumniId,
      totalSections: sortedSections.length,
    });
  };

  const completedCount = sortedSections.filter(s => completedSections.has(s.id)).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0E27" />
        <TopHeaderDark />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD404" />
          <Text style={styles.loadingText}>Scanning mission data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E27" />
      <TopHeaderDark />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <StarField />

        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#FFD404" />
          <Text style={styles.backButtonText}>Mission Control</Text>
        </TouchableOpacity>

        {/* Phase Progress Header */}
        <PhaseProgressHeader
          phase={phase}
          completedSections={completedCount}
          totalSections={sortedSections.length}
        />

        {/* Section list */}
        <View style={styles.sectionsList}>
          <View style={styles.sectionListHeader}>
            <Text style={styles.sectionListTitle}>Mission Objectives</Text>
            <View style={styles.sectionListBadge}>
              <Text style={styles.sectionListBadgeText}>
                {sortedSections.length} objectives
              </Text>
            </View>
          </View>

          {sortedSections.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌌</Text>
              <Text style={styles.emptyTitle}>No Objectives Found</Text>
              <Text style={styles.emptyText}>
                This mission has no objectives yet. Check back later, Commander.
              </Text>
            </View>
          ) : (
            sortedSections.map((section, index) => {
              const isCompleted = completedSections.has(section.id);
              // Section is locked if the previous section exists and is NOT completed
              const isLocked = index > 0 && !completedSections.has(sortedSections[index - 1].id);

              return (
                <SectionCard
                  key={section.id}
                  section={section}
                  index={index}
                  isCompleted={isCompleted}
                  isLocked={isLocked}
                  onPress={() => handleSectionPress(section, index)}
                />
              );
            })
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>
            Complete all objectives to finish this mission
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PhaseSectionsScreen;