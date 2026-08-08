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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import Constants from 'expo-constants'; // ⚠️ ADD THIS IMPORT
import TopHeaderDark from "../components/TopHeaderDark";
import styles from "../styles/SectionQuestionsScreen.styles";
import {
  getOrCreateDraftResponse,
  getDraftAnswers,
  saveAnswerDraft,
  submitDraftResponse,
  uploadTracerFile,
} from "../services/tracerQueries";
import { ThemedAlert } from "../components/ThemedAlert";
import { pickFile, formatFileSize, isFileTypeAllowed } from "../utils/filePicker";

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

// ─────────────────────────────────────────────
// QUESTION DOTS WITH SCROLL & ELLIPSIS
// ─────────────────────────────────────────────

const QuestionDots = ({ questions, answers, currentIndex, onDotPress }) => {
  const scrollViewRef = useRef(null);
  const [showLeftEllipsis, setShowLeftEllipsis] = useState(false);
  const [showRightEllipsis, setShowRightEllipsis] = useState(true);

  // Handle scroll to detect ellipsis visibility
  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    setShowLeftEllipsis(contentOffset.x > 10);
    setShowRightEllipsis(contentOffset.x + layoutMeasurement.width < contentSize.width - 10);
  };

  // Auto-scroll to current question
  useEffect(() => {
    if (scrollViewRef.current && currentIndex >= 0) {
      const dotWidth = 34; // width + gap
      const scrollToX = Math.max(0, currentIndex * dotWidth - 100);
      scrollViewRef.current.scrollTo({ x: scrollToX, animated: true });
    }
  }, [currentIndex]);

  const totalQuestions = questions.length;

  return (
    <View style={styles.questionDotsContainer}>
      {/* Left ellipsis */}
      {showLeftEllipsis && (
        <View style={styles.ellipsisWrapper}>
          <Text style={styles.ellipsisText}>…</Text>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.questionDotsScrollContent}
        style={styles.questionDotsScroll}
      >
        {questions.map((q, index) => {
          const isAnswered = answers[q.id] && (
            typeof answers[q.id] === 'string'
              ? answers[q.id].trim() !== ''
              : Object.keys(answers[q.id] || {}).length > 0
          );
          const isCurrent = index === currentIndex;
          const isLast = index === totalQuestions - 1;

          return (
            <TouchableOpacity
              key={q.id || index}
              style={[
                styles.questionDot,
                isCurrent && styles.questionDotCurrent,
                isAnswered && styles.questionDotAnswered,
              ]}
              onPress={() => onDotPress(index)}
            >
              <Text style={[
                styles.questionDotText,
                isCurrent && styles.questionDotTextCurrent,
                isAnswered && styles.questionDotTextAnswered,
              ]}>
                {index + 1}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Right ellipsis */}
      {showRightEllipsis && (
        <View style={styles.ellipsisWrapper}>
          <Text style={styles.ellipsisText}>…</Text>
        </View>
      )}
    </View>
  );
};

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

/** Likert Scale Input */
const LikertScaleInput = ({ question, value, onChange, error }) => {
  const rows = question.grid_rows || [];
  const columns = question.grid_columns || [];
  const [isScrolling, setIsScrolling] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollViewRef = useRef(null);
  
  // Parse existing value as JSON object { row_id: column_id }
  const selectedValues = value ? JSON.parse(value) : {};

  const handleSelect = (rowId, columnId) => {
    const updated = { ...selectedValues, [rowId]: columnId?.toString() };
    onChange(JSON.stringify(updated));
  };

  // Hide scroll hint after user scrolls
  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 5;
    if (isAtEnd) {
      setShowScrollHint(false);
    }
    setIsScrolling(true);
    setTimeout(() => setIsScrolling(false), 500);
  };

  if (rows.length === 0) {
    return <MultipleChoiceInput question={question} value={value} onChange={onChange} error={error} />;
  }

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
      
      {/* Scroll Hint */}
      {showScrollHint && columns.length > 2 && (
        <View style={styles.scrollHintContainer}>
          <Ionicons name="chevron-forward-outline" size={16} color="#FFD404" />
          <Text style={styles.scrollHintText}>Swipe right to see more</Text>
          <Ionicons name="chevron-forward-outline" size={16} color="#FFD404" />
        </View>
      )}
      
      {/* Column headers */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.likertScrollView}
      >
        <View>
          <View style={styles.likertHeaderRow}>
            <View style={styles.likertRowLabelPlaceholder} />
            {columns.map((col) => (
              <View key={col.id} style={styles.likertColumnHeader}>
                <Text style={styles.likertColumnText}>{col.column_label}</Text>
              </View>
            ))}
          </View>
          
          {/* Rows */}
          {rows.map((row) => (
            <View key={row.id} style={styles.likertRow}>
              <View style={styles.likertRowLabel}>
                <Text style={styles.likertRowText} numberOfLines={2}>{row.row_label}</Text>
              </View>
              {columns.map((col) => {
                const isSelected = selectedValues[row.id] === col.id?.toString();
                return (
                  <TouchableOpacity
                    key={col.id}
                    style={[
                      styles.likertCell,
                      isSelected && styles.likertCellSelected,
                    ]}
                    onPress={() => handleSelect(row.id, col.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.likertRadio,
                      isSelected && styles.likertRadioSelected,
                    ]}>
                      {isSelected && <View style={styles.likertRadioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      
      {/* Scroll indicator dots */}
      {columns.length > 2 && (
        <View style={styles.scrollIndicatorContainer}>
          {columns.map((_, index) => (
            <View
              key={index}
              style={[
                styles.scrollIndicatorDot,
                index === 0 && styles.scrollIndicatorDotActive,
              ]}
            />
          ))}
        </View>
      )}
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

/** Multiple Choice Grid Input */
const MultipleChoiceGridInput = ({ question, value, onChange, error }) => {
  const rows = question.grid_rows || [];
  const columns = question.grid_columns || [];
  const [isScrolling, setIsScrolling] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollViewRef = useRef(null);
  
  // Parse existing value as JSON object { row_id: column_id }
  const selectedValues = value ? JSON.parse(value) : {};

  const handleSelect = (rowId, columnId) => {
    const updated = { ...selectedValues, [rowId]: columnId?.toString() };
    onChange(JSON.stringify(updated));
  };

  // Hide scroll hint after user scrolls
  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 5;
    if (isAtEnd) {
      setShowScrollHint(false);
    }
    setIsScrolling(true);
    setTimeout(() => setIsScrolling(false), 500);
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
      
      {/* Scroll Hint */}
      {showScrollHint && columns.length > 2 && (
        <View style={styles.scrollHintContainer}>
          <Ionicons name="chevron-forward-outline" size={16} color="#FFD404" />
          <Text style={styles.scrollHintText}>Swipe right to see more</Text>
          <Ionicons name="chevron-forward-outline" size={16} color="#FFD404" />
        </View>
      )}
      
      {/* Column headers */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.likertScrollView}
      >
        <View>
          <View style={styles.likertHeaderRow}>
            <View style={styles.likertRowLabelPlaceholder} />
            {columns.map((col) => (
              <View key={col.id} style={styles.likertColumnHeader}>
                <Text style={styles.likertColumnText}>{col.column_label}</Text>
              </View>
            ))}
          </View>
          
          {/* Rows */}
          {rows.map((row) => (
            <View key={row.id} style={styles.likertRow}>
              <View style={styles.likertRowLabel}>
                <Text style={styles.likertRowText} numberOfLines={2}>{row.row_label}</Text>
              </View>
              {columns.map((col) => {
                const isSelected = selectedValues[row.id] === col.id?.toString();
                return (
                  <TouchableOpacity
                    key={col.id}
                    style={[
                      styles.likertCell,
                      isSelected && styles.likertCellSelected,
                    ]}
                    onPress={() => handleSelect(row.id, col.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.likertRadio,
                      isSelected && styles.likertRadioSelected,
                    ]}>
                      {isSelected && <View style={styles.likertRadioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      
      {/* Scroll indicator dots */}
      {columns.length > 2 && (
        <View style={styles.scrollIndicatorContainer}>
          {columns.map((_, index) => (
            <View
              key={index}
              style={[
                styles.scrollIndicatorDot,
                index === 0 && styles.scrollIndicatorDotActive,
              ]}
            />
          ))}
        </View>
      )}
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};
/** File Upload Input */
const FileUploadInput = ({ question, value, onChange, error, onFilePick }) => {
  const [uploading, setUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const fileInfo = value ? JSON.parse(value) : null;
  
  // Check if running in Expo Go
  const isExpoGo = Platform.OS === 'ios' && 
    Constants.manifest?.extra?.expoGo !== undefined;

  const handlePickFile = async () => {
    try {
      // Get allowed file types
      const allowedTypes = question.file_types || '*/*';
      const maxSizeMB = question.max_file_size || 10;

      if (isExpoGo) {
        // Show option to use link instead
        ThemedAlert.alert(
          "File Upload Option",
          "On iOS Expo Go, you can only upload images and videos directly. For other file types, you can:\n\n1️⃣ Upload your file to Google Drive, OneDrive, or Dropbox\n2️⃣ Create a shareable link\n3️⃣ Paste the link below",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Paste Link", 
              onPress: () => setShowLinkInput(true)
            },
            { 
              text: "Pick Image/Video", 
              onPress: handlePickFileDirect
            }
          ]
        );
        return;
      }

      // For Android or dev builds - use document picker
      const file = await pickFile({
        allowedTypes,
        maxSizeMB,
      });

      if (!file) return;

      // Validate file type
      if (!isFileTypeAllowed(file.name, allowedTypes)) {
        ThemedAlert.alert(
          "Invalid File Type",
          `File type not allowed. Allowed: ${allowedTypes}`
        );
        return;
      }

      setUploading(true);
      
      // If there's an upload function, use it; otherwise store file info locally
      if (onFilePick) {
        const uploadedPath = await onFilePick(file);
        onChange(JSON.stringify({
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          path: uploadedPath || file.uri,
          source: file.type || 'document',
        }));
      } else {
        onChange(JSON.stringify({
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          path: file.uri,
          source: file.type || 'document',
        }));
      }
    } catch (err) {
      console.error("[FileUpload] Error picking file:", err);
      ThemedAlert.alert("Error", err.message || "Failed to select file.");
    } finally {
      setUploading(false);
    }
  };

  // Separate function for direct file pick (images/videos only for iOS Expo Go)
  const handlePickFileDirect = async () => {
    try {
      const allowedTypes = question.file_types || '*/*';
      const maxSizeMB = question.max_file_size || 10;

      const file = await pickFile({
        allowedTypes,
        maxSizeMB,
      });

      if (!file) return;

      setUploading(true);
      
      if (onFilePick) {
        const uploadedPath = await onFilePick(file);
        onChange(JSON.stringify({
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          path: uploadedPath || file.uri,
          source: file.type || 'document',
        }));
      } else {
        onChange(JSON.stringify({
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          path: file.uri,
          source: file.type || 'document',
        }));
      }
    } catch (err) {
      console.error("[FileUpload] Error picking file:", err);
      ThemedAlert.alert("Error", err.message || "Failed to select file.");
    } finally {
      setUploading(false);
    }
  };

  // Handle link submission
  const handleLinkSubmit = () => {
    if (!linkValue || linkValue.trim() === '') {
      ThemedAlert.alert("Error", "Please enter a valid link.");
      return;
    }

    // Basic URL validation
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlPattern.test(linkValue.trim())) {
      ThemedAlert.alert("Invalid Link", "Please enter a valid URL (e.g., https://drive.google.com/...).");
      return;
    }

    // Extract filename from URL if possible, otherwise use a generic name
    let fileName = 'Shared File';
    try {
      const url = new URL(linkValue);
      const pathSegments = url.pathname.split('/');
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (lastSegment && lastSegment.includes('.')) {
        fileName = lastSegment;
      }
    } catch (e) {
      // Use default name if URL parsing fails
    }

    onChange(JSON.stringify({
      name: fileName,
      size: 0,
      mimeType: 'application/octet-stream',
      path: linkValue.trim(),
      source: 'link',
      isLink: true,
    }));

    setShowLinkInput(false);
    setLinkValue('');
    
    ThemedAlert.alert(
      "Link Added",
      "Your file link has been saved successfully.",
      [{ text: "OK" }]
    );
  };

  const handleRemoveFile = () => {
    onChange('');
    setShowLinkInput(false);
    setLinkValue('');
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

      {question.max_file_size && (
        <Text style={styles.fileSizeHint}>
          Maximum file size: {question.max_file_size}MB
        </Text>
      )}

      {/* iOS Expo Go hint */}
      {isExpoGo && (
        <View style={styles.iosExpoContainer}>
          <Text style={styles.fileTypeHint}>
            ℹ️ On iOS Expo Go, you can upload images/videos directly or paste a shareable link.
          </Text>
          {!fileInfo && !showLinkInput && (
            <TouchableOpacity
              style={styles.linkOptionButton}
              onPress={() => setShowLinkInput(true)}
            >
              <Ionicons name="link-outline" size={16} color="#FFD404" />
              <Text style={styles.linkOptionText}>Paste file link instead</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Link input UI */}
      {showLinkInput && (
        <View style={styles.linkInputContainer}>
          <Text style={styles.linkInputLabel}>
            Paste your shareable file link from Google Drive, OneDrive, Dropbox, etc:
          </Text>
          <TextInput
            style={[styles.linkInput, error && styles.textInputError]}
            value={linkValue}
            onChangeText={setLinkValue}
            placeholder="https://drive.google.com/file/d/..."
            placeholderTextColor="rgba(255,255,255,0.25)"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.linkActionButtons}>
            <TouchableOpacity
              style={[styles.linkCancelButton]}
              onPress={() => {
                setShowLinkInput(false);
                setLinkValue('');
              }}
            >
              <Text style={styles.linkCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkSubmitButton]}
              onPress={handleLinkSubmit}
            >
              <Text style={styles.linkSubmitText}>Add Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {fileInfo ? (
        <View style={styles.filePreview}>
          <View style={styles.fileInfo}>
            {fileInfo.isLink ? (
              <Ionicons name="link-outline" size={24} color="#FFD404" />
            ) : (
              <Ionicons name="document-text" size={24} color="#FFD404" />
            )}
            <View style={styles.fileDetails}>
              <Text style={styles.fileName} numberOfLines={1}>{fileInfo.name}</Text>
              {fileInfo.isLink ? (
                <Text style={styles.fileLinkUrl} numberOfLines={1}>{fileInfo.path}</Text>
              ) : (
                <Text style={styles.fileSize}>{formatFileSize(fileInfo.size)}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.removeFileButton}
            onPress={handleRemoveFile}
          >
            <Ionicons name="close-circle" size={22} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      ) : (
        !showLinkInput && (
          <TouchableOpacity
            style={[styles.uploadButton, error && styles.textInputError]}
            onPress={handlePickFile}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFD404" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={24} color="#FFD404" />
                <Text style={styles.uploadButtonText}>Tap to upload file</Text>
                {isExpoGo && (
                  <Text style={styles.uploadSubText}>or paste link above</Text>
                )}
              </>
            )}
          </TouchableOpacity>
        )
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

  // In SectionQuestionsScreen component - add isExpoGo constant at top
  const isExpoGo = Platform.OS === 'ios' && 
    Constants.manifest?.extra?.expoGo !== undefined;

  useEffect(() => {
    initializeResponse();
  }, []);

  const initializeResponse = async () => {
    try {
      setLoading(true);
      
      const formId = phase?.form_id;
      if (!formId) {
        ThemedAlert.alert("Error", "Unable to determine form ID.");
        navigation.goBack();
        return;
      }

      const draft = await getOrCreateDraftResponse(alumniId, formId);
      setResponseId(draft.id);

      const draftAnswers = await getDraftAnswers(draft.id);
      
      const existingAnswers = {};
      draftAnswers.forEach(ans => {
        // For grid questions, reconstruct the JSON value
        if (ans.grid_row_id && ans.answer_value) {
          // This is part of a grid answer, need to aggregate by question
          if (!existingAnswers[ans.question_id]) {
            existingAnswers[ans.question_id] = {};
          }
          existingAnswers[ans.question_id][ans.grid_row_id] = ans.answer_value;
        } else {
          existingAnswers[ans.question_id] = ans.answer_value;
        }
      });
      
      // Convert grid objects to JSON strings
      Object.keys(existingAnswers).forEach(qId => {
        if (typeof existingAnswers[qId] === 'object' && !Array.isArray(existingAnswers[qId])) {
          existingAnswers[qId] = JSON.stringify(existingAnswers[qId]);
        }
      });
      
      setAnswers(existingAnswers);

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

const handleFileUpload = async (file) => {
  try {
    console.log('[FileUpload] Handling file:', file.name, 'Size:', file.size);
    
    // For Android or development builds - upload to server
    if (Platform.OS === 'android' || !isExpoGo) {
      console.log('[FileUpload] Uploading to server...');
      const uploadedPath = await uploadTracerFile(responseId, currentQuestion.id, file);
      return uploadedPath;
    }
    
    // For iOS Expo Go - store file locally
    console.log('[FileUpload] iOS Expo Go - storing locally...');
    
    // Create uploads directory if it doesn't exist
    const uploadDir = `${FileSystem.documentDirectory}uploads/`;
    const dirInfo = await FileSystem.getInfoAsync(uploadDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(uploadDir, { intermediates: true });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || '';
    const fileName = `${timestamp}_${file.name}`;
    const destination = `${uploadDir}${fileName}`;
    
    // Copy file to app's local storage
    await FileSystem.copyAsync({
      from: file.uri,
      to: destination,
    });
    
    console.log('[FileUpload] File stored locally at:', destination);
    return destination;
  } catch (error) {
    console.error("[SectionQuestions] File upload error:", error);
    ThemedAlert.alert("Upload Error", "Failed to process file. Please try again.");
    throw error;
  }
};

  const saveCurrentAnswer = async () => {
    if (!responseId || !currentQuestion) return;

    const value = answers[currentQuestion.id];
    const questionType = currentQuestion.type;
    
    // Validate required
    if (currentQuestion.is_required) {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        setErrors({ ...errors, [currentQuestion.id]: 'This question requires an answer, Commander!' });
        return false;
      }
    }

    setErrors({});
    setSaving(true);

    try {
      let selections = undefined;

      switch (questionType) {
        case 'multiple_choice':
        case 'dropdown':
          if (value) {
            selections = [{ optionId: parseInt(value), gridColumnId: null }];
          }
          break;
          
        case 'checkboxes':
          if (value) {
            selections = value.split(',').map(id => ({
              optionId: parseInt(id.trim()),
              gridColumnId: null
            }));
          }
          break;
          
        case 'likert_scale':
        case 'multiple_choice_grid':
          // Value is JSON string like {"row_id": "column_id", ...}
          if (value) {
            const gridData = JSON.parse(value);
            selections = Object.entries(gridData).map(([rowId, colId]) => ({
              optionId: null,
              gridColumnId: parseInt(colId),
              gridRowId: parseInt(rowId),
            }));
            
            // For grid questions, save each row as separate answer
            for (const selection of selections) {
              await saveAnswerDraft(
                responseId,
                currentQuestion.id,
                selection.gridColumnId?.toString() || '',
                {
                  selections: [{
                    optionId: null,
                    gridColumnId: selection.gridColumnId,
                  }],
                  gridRowId: selection.gridRowId,
                }
              );
            }
            setSaving(false);
            return true; // Already saved all rows
          }
          break;
          
        case 'file_upload':
          // Value is JSON string with file info
          if (value) {
            const fileData = JSON.parse(value);
            await saveAnswerDraft(
              responseId,
              currentQuestion.id,
              fileData.path || fileData.name,
              {
                filePath: fileData.path,
                fileName: fileData.name,
              }
            );
            setSaving(false);
            return true;
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
      ThemedAlert.alert("Error", "Failed to save answer.");
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
      case 'likert_scale':
        return (
          <LikertScaleInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            error={error}
          />
        );
      case 'multiple_choice_grid':
        return (
          <MultipleChoiceGridInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            error={error}
          />
        );
      case 'file_upload':
        return (
          <FileUploadInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            error={error}
            onFilePick={handleFileUpload}
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

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#FFD404" />
            <Text style={styles.backButtonText}>Back to Objectives</Text>
          </TouchableOpacity>

          <View style={styles.sectionInfo}>
            <Text style={styles.sectionLabel}>OBJECTIVE {String(sectionIndex + 1).padStart(2, '0')}</Text>
            <Text style={styles.sectionTitle} numberOfLines={2}>{section.title}</Text>
          </View>

          <QuestionProgress
            current={currentQuestionIndex + 1}
            total={sortedQuestions.length}
          />

          <Animated.View style={{ opacity: fadeAnim }}>
            {renderQuestion()}
          </Animated.View>

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
                Prev
              </Text>
            </TouchableOpacity>

            {/* Updated Question Dots with scroll */}
            <QuestionDots
              questions={sortedQuestions}
              answers={answers}
              currentIndex={currentQuestionIndex}
              onDotPress={(index) => animateTransition(() => setCurrentQuestionIndex(index))}
            />

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