// SectionQuestionsScreen.js
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopHeaderDark from "../components/TopHeaderDark";
import styles from "../styles/SectionQuestionsScreen.styles";
import {
  getOrCreateDraftResponse,
  getDraftAnswers,
  saveAnswerDraft,
  submitDraftResponse,
} from "../services/tracerQueries";
import { ThemedAlert } from "../components/ThemedAlert";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const STARS = [
  { top: '3%', left: '10%', size: 1.5, opacity: 0.4 },
  { top: '8%', left: '30%', size: 2, opacity: 0.3 },
  { top: '15%', left: '80%', size: 1, opacity: 0.5 },
  { top: '22%', left: '15%', size: 2.5, opacity: 0.3 },
  { top: '30%', left: '70%', size: 1.5, opacity: 0.4 },
  { top: '38%', left: '50%', size: 1, opacity: 0.3 },
  { top: '45%', left: '88%', size: 2, opacity: 0.4 },
  { top: '55%', left: '25%', size: 1.5, opacity: 0.5 },
  { top: '65%', left: '60%', size: 1, opacity: 0.3 },
  { top: '75%', left: '8%', size: 2, opacity: 0.4 },
  { top: '82%', left: '75%', size: 1.5, opacity: 0.3 },
  { top: '90%', left: '40%', size: 1, opacity: 0.5 },
];

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

/** Progress bar at the top */
const QuestionProgress = ({ current, total }) => {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <View style={styles.questionProgressContainer}>
      <View style={styles.questionProgressInfo}>
        <Text style={styles.questionProgressLabel}>Question {current} of {total}</Text>
        <Text style={styles.questionProgressPct}>{pct}%</Text>
      </View>
      <View style={styles.questionProgressBg}>
        <View
          style={[styles.questionProgressFill, { width: `${Math.max(pct, 2)}%` }]}
        />
      </View>
    </View>
  );
};

/** Short Answer Input */
const ShortAnswerInput = ({ question, value, onChange, error }) => (
  <View style={styles.questionCard}>
    <View style={styles.questionHeader}>
      <Text style={styles.questionNumber}>Q.</Text>
      <Text style={styles.questionText}>{question.question_text}</Text>
      {question.is_required && <Text style={styles.requiredStar}>*</Text>}
    </View>
    {question.description ? (
      <Text style={styles.questionDescription}>{question.description}</Text>
    ) : null}
    <TextInput
      style={[styles.textInput, error && styles.textInputError]}
      value={value}
      onChangeText={onChange}
      placeholder={question.placeholder || "Type your answer here..."}
      placeholderTextColor="rgba(255,255,255,0.25)"
      multiline={false}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

/** Paragraph Input */
const ParagraphInput = ({ question, value, onChange, error }) => (
  <View style={styles.questionCard}>
    <View style={styles.questionHeader}>
      <Text style={styles.questionNumber}>Q.</Text>
      <Text style={styles.questionText}>{question.question_text}</Text>
      {question.is_required && <Text style={styles.requiredStar}>*</Text>}
    </View>
    {question.description ? (
      <Text style={styles.questionDescription}>{question.description}</Text>
    ) : null}
    <TextInput
      style={[styles.textArea, error && styles.textInputError]}
      value={value}
      onChangeText={onChange}
      placeholder={question.placeholder || "Type your response here..."}
      placeholderTextColor="rgba(255,255,255,0.25)"
      multiline
      numberOfLines={4}
      textAlignVertical="top"
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

/** Multiple Choice (Single select) */
const MultipleChoiceInput = ({ question, value, onChange, error }) => {
  const options = question.options || [];

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>Q.</Text>
        <Text style={styles.questionText}>{question.question_text}</Text>
        {question.is_required && <Text style={styles.requiredStar}>*</Text>}
      </View>
      {question.description ? (
        <Text style={styles.questionDescription}>{question.description}</Text>
      ) : null}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const isSelected = value === option.id?.toString();
          return (
            <TouchableOpacity
              key={option.id || index}
              style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
              onPress={() => onChange(option.id?.toString())}
              activeOpacity={0.7}
            >
              <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option.option_label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

/** Checkboxes (Multi-select) */
const CheckboxesInput = ({ question, value, onChange, error }) => {
  const options = question.options || [];
  const selectedValues = value ? value.split(',') : [];

  const toggleOption = (optionId) => {
    const idStr = optionId?.toString();
    let newSelected;
    if (selectedValues.includes(idStr)) {
      newSelected = selectedValues.filter(v => v !== idStr);
    } else {
      newSelected = [...selectedValues, idStr];
    }
    onChange(newSelected.join(','));
  };

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>Q.</Text>
        <Text style={styles.questionText}>{question.question_text}</Text>
        {question.is_required && <Text style={styles.requiredStar}>*</Text>}
      </View>
      {question.description ? (
        <Text style={styles.questionDescription}>{question.description}</Text>
      ) : null}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const isChecked = selectedValues.includes(option.id?.toString());
          return (
            <TouchableOpacity
              key={option.id || index}
              style={[styles.optionButton, isChecked && styles.optionButtonSelected]}
              onPress={() => toggleOption(option.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                {isChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={[styles.optionText, isChecked && styles.optionTextSelected]}>
                {option.option_label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

/** Dropdown */
const DropdownInput = ({ question, value, onChange, error }) => {
  const options = question.options || [];
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.id?.toString() === value);

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>Q.</Text>
        <Text style={styles.questionText}>{question.question_text}</Text>
        {question.is_required && <Text style={styles.requiredStar}>*</Text>}
      </View>
      {question.description ? (
        <Text style={styles.questionDescription}>{question.description}</Text>
      ) : null}
      
      <TouchableOpacity
        style={[styles.dropdownButton, error && styles.textInputError]}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text style={[styles.dropdownText, !selectedOption && styles.dropdownPlaceholder]}>
          {selectedOption ? selectedOption.option_label : "Select an option..."}
        </Text>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color="rgba(255,255,255,0.5)"
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownList}>
          {options.map((option, index) => {
            const isSelected = value === option.id?.toString();
            return (
              <TouchableOpacity
                key={option.id || index}
                style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                onPress={() => {
                  onChange(option.id?.toString());
                  setIsOpen(false);
                }}
              >
                <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                  {option.option_label}
                </Text>
                {isSelected && <Ionicons name="checkmark" size={16} color="#FFD404" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

const SectionQuestionsScreen = ({ navigation, route }) => {
  const { phase, section, sectionIndex, alumniId, totalSections } = route.params;
  const questions = section?.questions || [];
  
  const sortedQuestions = [...questions].sort((a, b) => (a.order_priority || 0) - (b.order_priority || 0));

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [responseId, setResponseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentQuestion = sortedQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === sortedQuestions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  useEffect(() => {
    initializeResponse();
  }, []);

  const initializeResponse = async () => {
    try {
      setLoading(true);
      
      // Get the form_id from the phase
      const formId = phase?.form_id;
      if (!formId) {
        ThemedAlert.alert("Error", "Unable to determine form ID.");
        navigation.goBack();
        return;
      }

      // Get or create draft response
      const draft = await getOrCreateDraftResponse(alumniId, formId);
      setResponseId(draft.id);

      // Load existing draft answers
      const draftAnswers = await getDraftAnswers(draft.id);
      
      const existingAnswers = {};
      draftAnswers.forEach(ans => {
        existingAnswers[ans.question_id] = ans.answer_value;
      });
      setAnswers(existingAnswers);

      // Find the first unanswered question
      const firstUnanswered = sortedQuestions.findIndex(q => !existingAnswers[q.id]);
      if (firstUnanswered >= 0) {
        setCurrentQuestionIndex(firstUnanswered);
      }
    } catch (error) {
      console.error("[SectionQuestions] Init error:", error);
      ThemedAlert.alert("Error", "Failed to load questions.");
    } finally {
      setLoading(false);
    }
  };

  const animateTransition = (callback) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(callback, 150);
  };

  const saveCurrentAnswer = async () => {
    if (!responseId || !currentQuestion) return;

    const value = answers[currentQuestion.id];
    
    // Validate required
    if (currentQuestion.is_required && (!value || value.trim() === '')) {
      setErrors({ ...errors, [currentQuestion.id]: 'This question requires an answer, Commander!' });
      return false;
    }

    setErrors({});
    setSaving(true);

    try {
      // Build selections for choice-based questions
      let selections = undefined;
      
      switch (currentQuestion.type) {
        case 'multiple_choice':
        case 'dropdown':
        case 'likert_scale':
          // Single selection - value is the option ID
          if (value) {
            selections = [{ optionId: parseInt(value), gridColumnId: null }];
          }
          break;
          
        case 'checkboxes':
          // Multiple selections - value is comma-separated IDs
          if (value) {
            selections = value.split(',').map(id => ({
              optionId: parseInt(id.trim()),
              gridColumnId: null
            }));
          }
          break;
          
        default:
          // short_answer, paragraph - no selections needed
          selections = undefined;
          break;
      }

      await saveAnswerDraft(
        responseId, 
        currentQuestion.id, 
        value || '', 
        { selections }
      );
      return true;
    } catch (error) {
      console.error("[SectionQuestions] Save error:", error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const saved = await saveCurrentAnswer();
    if (!saved) return;

    if (isLastQuestion) {
      handleSubmit();
    } else {
      animateTransition(() => {
        setCurrentQuestionIndex(prev => Math.min(prev + 1, sortedQuestions.length - 1));
      });
    }
  };

  const handlePrevious = () => {
    animateTransition(() => {
      setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));
    });
  };

  const handleSubmit = async () => {
    const saved = await saveCurrentAnswer();
    if (!saved) return;

    setSubmitting(true);

    try {
      await submitDraftResponse(responseId);
      
      // Navigate to completion screen
      navigation.replace("SectionComplete", {
        phase: phase,
        section: section,
        sectionIndex: sectionIndex,
        totalSections: totalSections,
        questionsAnswered: sortedQuestions.length,
      });
    } catch (error) {
      console.error("[SectionQuestions] Submit error:", error);
      ThemedAlert.alert("Error", "Failed to submit answers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    // Clear error when user starts typing
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const value = answers[currentQuestion.id] || '';
    const error = errors[currentQuestion.id];

    switch (currentQuestion.type) {
      case 'short_answer':
        return (
          <ShortAnswerInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            error={error}
          />
        );
      case 'paragraph':
        return (
          <ParagraphInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            error={error}
          />
        );
      case 'multiple_choice':
      case 'likert_scale':
        return (
          <MultipleChoiceInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            error={error}
          />
        );
      case 'checkboxes':
        return (
          <CheckboxesInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            error={error}
          />
        );
      case 'dropdown':
        return (
          <DropdownInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            error={error}
          />
        );
      default:
        return (
          <ShortAnswerInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            error={error}
          />
        );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0E27" />
        <TopHeaderDark />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD404" />
          <Text style={styles.loadingText}>Loading mission data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E27" />
      <TopHeaderDark />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StarField />

          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#FFD404" />
            <Text style={styles.backButtonText}>Back to Objectives</Text>
          </TouchableOpacity>

          {/* Section info */}
          <View style={styles.sectionInfo}>
            <Text style={styles.sectionLabel}>OBJECTIVE {String(sectionIndex + 1).padStart(2, '0')}</Text>
            <Text style={styles.sectionTitle} numberOfLines={2}>{section.title}</Text>
          </View>

          {/* Question progress */}
          <QuestionProgress
            current={currentQuestionIndex + 1}
            total={sortedQuestions.length}
          />

          {/* Question card with animation */}
          <Animated.View style={{ opacity: fadeAnim }}>
            {renderQuestion()}
          </Animated.View>

          {/* Navigation buttons */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonPrev, isFirstQuestion && styles.navButtonDisabled]}
              onPress={handlePrevious}
              disabled={isFirstQuestion}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-back"
                size={18}
                color={isFirstQuestion ? 'rgba(255,255,255,0.2)' : '#FFD404'}
              />
              <Text style={[styles.navButtonText, isFirstQuestion && styles.navButtonTextDisabled]}>
                Previous
              </Text>
            </TouchableOpacity>

            {/* Question dots */}
            <View style={styles.questionDots}>
              {sortedQuestions.map((q, index) => {
                const isAnswered = answers[q.id] && answers[q.id].trim() !== '';
                const isCurrent = index === currentQuestionIndex;
                return (
                  <TouchableOpacity
                    key={q.id || index}
                    style={[
                      styles.questionDot,
                      isCurrent && styles.questionDotCurrent,
                      isAnswered && styles.questionDotAnswered,
                    ]}
                    onPress={() => animateTransition(() => setCurrentQuestionIndex(index))}
                  >
                    <Text style={styles.questionDotText}>{index + 1}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.navButton, styles.navButtonNext]}
              onPress={handleNext}
              disabled={submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#1A237E" />
              ) : (
                <>
                  <Text style={[styles.navButtonText, styles.navButtonTextNext]}>
                    {isLastQuestion ? 'Submit' : 'Next'}
                  </Text>
                  {!isLastQuestion && (
                    <Ionicons name="arrow-forward" size={18} color="#1A237E" />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SectionQuestionsScreen;