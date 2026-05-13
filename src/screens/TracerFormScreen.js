import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
  StatusBar,
  TextInput,
  TouchableOpacity,
  BackHandler,
  Keyboard,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "../styles/TracerFormScreen.styles";
import BrandHeader from "../components/BrandHeader";
import {
  getTracerFormById,
  hasSubmittedForm,
  getOrCreateDraftResponse,
  getDraftAnswers,
  saveAnswerDraft,
  submitDraftResponse,
  submitTracerForm,
} from "../services/tracerQueries";
import { getCurrentUser } from "../services/supabaseAuth";
import { getAlumniByEmail } from "../services/alumniQueries";
import { ThemedAlert } from "../components/ThemedAlert";

const normalizeType = (type, hasOptions) => {
  const t = String(type || "").toLowerCase();
  if (t.includes("check")) return "checkbox";
  if (t.includes("drop") || t.includes("select")) return "dropdown";
  if (t.includes("area") || t.includes("long")) return "textarea";
  if (t.includes("text") && !hasOptions) return "text";
  if (t.includes("radio") || hasOptions) return "radio";
  return "text";
};

const parseSettingsOptions = (settings) => {
  if (!settings) return [];
  let parsed;
  try {
    parsed = typeof settings === "string" ? JSON.parse(settings) : settings;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed?.options)) return [];
  return parsed.options.map((opt) => {
    if (typeof opt === "string") {
      return { option_label: opt, option_value: opt };
    }
    return {
      option_label: opt?.label || opt?.option_label || String(opt?.value || ""),
      option_value: opt?.value || opt?.option_value || opt?.label || "",
    };
  });
};

const hasAnswer = (question, value) => {
  const hasOptions =
    Array.isArray(question?._options) && question._options.length > 0;
  const type = normalizeType(question?.type, hasOptions);
  if (type === "checkbox") return Array.isArray(value) && value.length > 0;
  if (type === "text" || type === "textarea")
    return typeof value === "string" && value.trim().length > 0;
  return (
    value !== undefined && value !== null && String(value).trim().length > 0
  );
};

const serializeAnswerForDraft = (value) => {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return value;
};

const hydrateDraftAnswer = (value) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return value;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : value;
  } catch {
    return value;
  }
};

const TracerFormScreen = ({ route, navigation }) => {
  const initialTracer = route?.params?.tracer || {};
  const [tracer, setTracer] = useState(initialTracer);
  const [answers, setAnswers] = useState({});
  const [showValidation, setShowValidation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSubmission, setCheckingSubmission] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [draftResponseId, setDraftResponseId] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    const selectedId = initialTracer?.id || initialTracer?.form_id;
    if (!selectedId)
      return () => {
        active = false;
      };

    const loadFormDetails = async () => {
      try {
        setLoading(true);
        const found = await getTracerFormById(selectedId).catch(() => null);
        if (active && found) setTracer(found);
      } catch {
        // fallback to navigation payload
      } finally {
        if (active) setLoading(false);
      }
    };

    loadFormDetails();

    return () => {
      active = false;
    };
  }, [initialTracer]);

  useEffect(() => {
    let active = true;
    const selectedId =
      tracer?.id ||
      tracer?.form_id ||
      initialTracer?.id ||
      initialTracer?.form_id;

    if (!selectedId) {
      return () => {
        active = false;
      };
    }

    const checkSubmissionStatus = async () => {
      try {
        setCheckingSubmission(true);
        setDraftResponseId(null);
        setAnswers({});

        const supaUser = await getCurrentUser().catch(() => null);
        if (!supaUser?.email) {
          if (active) {
            setAlreadySubmitted(false);
          }
          return;
        }

        const alumni = await getAlumniByEmail(supaUser.email).catch(() => null);
        if (!alumni?.id) {
          if (active) {
            setAlreadySubmitted(false);
          }
          return;
        }

        const submitted = await hasSubmittedForm(alumni.id, selectedId).catch(
          () => false,
        );

        if (active) {
          setAlreadySubmitted(submitted);
        }

        if (active && submitted) {
          ThemedAlert.alert(
            "Already Submitted",
            "You have already submitted this tracer form.",
            [{ text: "OK", onPress: () => navigation.replace("AlumniTracer") }],
          );
          return;
        }

        const draft = await getOrCreateDraftResponse(
          alumni.id,
          selectedId,
        ).catch(() => null);
        if (!active || !draft?.id) return;

        setDraftResponseId(draft.id);

        const draftAnswers = await getDraftAnswers(draft.id).catch(() => []);
        if (!active || !Array.isArray(draftAnswers)) return;

        const nextAnswers = {};
        draftAnswers.forEach((entry) => {
          const qid = String(entry?.tq_id || "");
          if (!qid) return;
          nextAnswers[qid] = hydrateDraftAnswer(entry?.answer_value);
        });

        setAnswers(nextAnswers);
      } finally {
        if (active) {
          setCheckingSubmission(false);
        }
      }
    };

    checkSubmissionStatus();

    return () => {
      active = false;
    };
  }, [initialTracer, navigation, tracer]);

  const questions = useMemo(() => {
    const raw =
      tracer?.questions ||
      tracer?.tracer_questions ||
      tracer?.tracerQuestions ||
      [];
    if (!Array.isArray(raw)) return [];
    return [...raw]
      .sort((a, b) => (a?.order_priority ?? 0) - (b?.order_priority ?? 0))
      .map((question) => {
        const list =
          question?.answer_options ||
          question?.answerOptions ||
          question?.tracer_answer_options ||
          parseSettingsOptions(question?.settings);
        return {
          ...question,
          _options: Array.isArray(list) ? list : [],
        };
      });
  }, [tracer]);

  const totalSteps = questions.length;
  const currentQuestion = totalSteps > 0 ? questions[currentStep - 1] : null;

  useEffect(() => {
    setCurrentStep(1);
  }, [tracer?.id, tracer?.form_id]);

  useEffect(() => {
    const percentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [currentStep, progressAnim, totalSteps]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const toggleOption = (question, value) => {
    const qid = String(question?.id || "");
    if (!qid) return;
    const type = normalizeType(question?.type, question?._options?.length > 0);

    setAnswers((prev) => {
      if (type === "checkbox") {
        const existing = Array.isArray(prev[qid]) ? prev[qid] : [];
        const next = existing.includes(value)
          ? existing.filter((v) => v !== value)
          : [...existing, value];
        return { ...prev, [qid]: next };
      }

      return { ...prev, [qid]: value };
    });
  };

  const confirmLeave = () => {
    ThemedAlert.alert(
      "Leave Form",
      "Are you sure you want to leave without submitting?",
      [
        { text: "No", style: "cancel" },
        { text: "Yes", onPress: () => navigation.replace("AlumniTracer") },
      ],
    );
  };

  const goBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setShowValidation(false);
      return;
    }

    confirmLeave();
  };

  useEffect(() => {
    const onBackPress = () => {
      goBackStep();
      return true; // handled
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => {
      if (subscription && typeof subscription.remove === "function") {
        subscription.remove();
      }
    };
  }, [currentStep, navigation, tracer, answers]);

  const setTextAnswer = (question, value) => {
    const qid = String(question?.id || "");
    if (!qid) return;
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const saveCurrentStepDraftAnswer = async () => {
    if (!currentQuestion || !draftResponseId) return;

    const qid = String(currentQuestion?.id || "");
    if (!qid) return;

    const value = answers[qid];
    if (!hasAnswer(currentQuestion, value)) return;

    setSavingDraft(true);
    try {
      await saveAnswerDraft(
        draftResponseId,
        qid,
        serializeAnswerForDraft(value),
      );
    } catch (error) {
      console.warn(
        "[TracerFormScreen] Failed to save draft answer:",
        error?.message || error,
      );
    } finally {
      setSavingDraft(false);
    }
  };

  const submitResponses = async () => {
    if (submitting) return;
    const formId = tracer?.id || tracer?.form_id;
    if (!formId) {
      ThemedAlert.alert("Submit Failed", "Unable to determine tracer form ID.");
      return;
    }

    try {
      Keyboard.dismiss();
      setSubmitting(true);

      const requiredMissing = questions.filter((question) => {
        if (!question?.is_required) return false;
        const qid = String(question?.id || "");
        return !hasAnswer(question, answers[qid]);
      });

      if (requiredMissing.length > 0) {
        setShowValidation(true);
        ThemedAlert.alert(
          "Incomplete Form",
          "Please answer all required questions.",
        );
        return;
      }

      if (alreadySubmitted) {
        ThemedAlert.alert(
          "Already Submitted",
          "You have already submitted this tracer form.",
          [{ text: "OK", onPress: () => navigation.replace("AlumniTracer") }],
        );
        return;
      }

      const supaUser = await getCurrentUser();
      if (!supaUser?.email) {
        ThemedAlert.alert(
          "Session Expired",
          "Please log in again to submit your tracer form.",
        );
        return;
      }

      const alumni = await getAlumniByEmail(supaUser.email).catch(() => null);
      if (!alumni?.id) {
        ThemedAlert.alert(
          "User not found",
          "Unable to resolve alumni profile for submission.",
        );
        return;
      }

      const submitted = await hasSubmittedForm(alumni.id, formId).catch(
        () => false,
      );
      if (submitted) {
        setAlreadySubmitted(true);
        ThemedAlert.alert(
          "Already Submitted",
          "You have already submitted this tracer form.",
          [{ text: "OK", onPress: () => navigation.replace("AlumniTracer") }],
        );
        return;
      }

      let activeDraftId = draftResponseId;
      if (!activeDraftId) {
        const draft = await getOrCreateDraftResponse(alumni.id, formId).catch(
          () => null,
        );
        activeDraftId = draft?.id || null;
        if (activeDraftId) {
          setDraftResponseId(activeDraftId);
        }
      }

      if (activeDraftId) {
        const answeredQuestions = questions.filter((question) => {
          const qid = String(question?.id || "");
          return hasAnswer(question, answers[qid]);
        });

        for (const question of answeredQuestions) {
          const qid = String(question?.id || "");
          await saveAnswerDraft(
            activeDraftId,
            qid,
            serializeAnswerForDraft(answers[qid]),
          );
        }

        await submitDraftResponse(activeDraftId);
      } else {
        // Fallback to legacy direct submit if draft row could not be created
        const answerArray = Object.keys(answers).map((qid) => ({
          questionId: qid,
          value: answers[qid],
        }));
        await submitTracerForm(alumni.id, formId, answerArray);
      }

      ThemedAlert.alert(
        "Submitted",
        "Your responses have been submitted successfully.",
        [{ text: "OK", onPress: () => navigation.replace("AlumniTracer") }],
      );
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to submit tracer responses.";
      ThemedAlert.alert("Submit Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (!currentQuestion) return;

    const qid = String(currentQuestion?.id || "");
    const currentValue = answers[qid];
    const invalidCurrent =
      currentQuestion?.is_required && !hasAnswer(currentQuestion, currentValue);

    if (invalidCurrent) {
      setShowValidation(true);
      ThemedAlert.alert(
        "Required Field",
        "Please answer this question before proceeding.",
      );
      return;
    }

    await saveCurrentStepDraftAnswer();

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
      setShowValidation(false);
      return;
    }

    ThemedAlert.alert("Confirm Submission", "Are you sure with your answers?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        onPress: () => {
          void submitResponses();
        },
      },
    ]);
  };

  return (
    <>
      <SafeAreaView edges={["top"]} style={styles.topSafe} />
      <StatusBar backgroundColor="#31429B" barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <BrandHeader />
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={goBackStep}
              accessibilityRole="button"
              hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            >
              <Text style={styles.backButtonText}>
                {currentStep > 1 ? "‹  Back" : "‹  Exit"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.stepTitle}>
              Step {totalSteps > 0 ? currentStep : 0} of {totalSteps}
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[styles.progressBarFill, { width: progressWidth }]}
            />
          </View>
        </View>
        {loading || checkingSubmission ? (
          <ActivityIndicator
            size="small"
            color="#31429B"
            style={{ marginTop: 10 }}
          />
        ) : null}
        <ScrollView
          style={styles.wizardScroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {tracer?.form_header ? (
            <Image
              source={{ uri: tracer.form_header }}
              style={styles.headerImage}
            />
          ) : (
            <View
              style={[styles.headerImage, { backgroundColor: "#E6EEF9" }]}
            />
          )}

          <View style={styles.titleCard}>
            <Text style={styles.titleText}>
              {tracer?.form_title || "Tracer Form"}
            </Text>
            {tracer?.form_description || tracer?.description ? (
              <Text style={styles.formDescriptionText}>
                {tracer?.form_description || tracer?.description}
              </Text>
            ) : null}
          </View>

          {currentQuestion ? (
            (() => {
              const qid = String(currentQuestion?.id || "");
              const options = currentQuestion?._options || [];
              const type = normalizeType(
                currentQuestion?.type,
                options.length > 0,
              );
              const selected = answers[qid];
              const isInvalid =
                showValidation &&
                currentQuestion?.is_required &&
                !hasAnswer(currentQuestion, selected);

              return (
                <View
                  style={[
                    styles.card,
                    styles.screenCard,
                    isInvalid ? styles.cardInvalid : null,
                  ]}
                >
                  <View style={styles.questionTitleRow}>
                    <Text style={styles.cardTitle}>
                      {currentQuestion?.question_text || "Question"}
                    </Text>
                    {currentQuestion?.is_required ? (
                      <Text style={styles.requiredMark}>*</Text>
                    ) : null}
                  </View>
                  {currentQuestion?.description ? (
                    <Text style={styles.cardText}>
                      {currentQuestion.description}
                    </Text>
                  ) : null}

                  {type === "text" || type === "textarea" ? (
                    <TextInput
                      value={typeof selected === "string" ? selected : ""}
                      onChangeText={(value) =>
                        setTextAnswer(currentQuestion, value)
                      }
                      placeholder={
                        type === "textarea" ? "Type your answer" : "Your answer"
                      }
                      placeholderTextColor="#9CA3AF"
                      multiline={type === "textarea"}
                      numberOfLines={type === "textarea" ? 4 : 1}
                      style={[
                        styles.textInput,
                        type === "textarea" ? styles.textArea : null,
                      ]}
                    />
                  ) : Array.isArray(options) && options.length > 0 ? (
                    options.map((option) => {
                      const value =
                        option?.option_value ?? option?.option_label ?? "";
                      const isChecked = Array.isArray(selected)
                        ? selected.includes(value)
                        : selected === value;

                      return (
                        <Pressable
                          key={`${qid}-${String(value)}`}
                          style={[
                            styles.optionRow,
                            isChecked ? styles.optionRowActive : null,
                          ]}
                          onPress={() => toggleOption(currentQuestion, value)}
                          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
                          accessibilityRole="button"
                        >
                          <View
                            style={[
                              styles.radioOuter,
                              type === "checkbox" ? styles.checkboxOuter : null,
                            ]}
                          >
                            {isChecked ? (
                              <View
                                style={[
                                  styles.radioInner,
                                  type === "checkbox"
                                    ? styles.checkboxInner
                                    : null,
                                ]}
                              />
                            ) : null}
                          </View>
                          <Text style={styles.optionText}>
                            {option?.option_label || String(value)}
                          </Text>
                        </Pressable>
                      );
                    })
                  ) : (
                    <Text style={styles.cardText}>
                      No answer options available.
                    </Text>
                  )}
                  {isInvalid ? (
                    <Text style={styles.requiredHint}>
                      This question is required.
                    </Text>
                  ) : null}
                </View>
              );
            })()
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No Questions Available</Text>
              <Text style={styles.cardText}>
                This tracer form does not have any questions yet.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              submitting ||
              alreadySubmitted ||
              checkingSubmission ||
              !currentQuestion
                ? styles.nextButtonDisabled
                : null,
            ]}
            onPress={handleNext}
            disabled={
              submitting ||
              alreadySubmitted ||
              checkingSubmission ||
              !currentQuestion
            }
            accessibilityRole="button"
          >
            {submitting || savingDraft ? (
              <ActivityIndicator
                size="small"
                color="#F9FAFB"
                style={{ marginRight: 8 }}
              />
            ) : null}
            <Text style={styles.nextButtonText}>
              {submitting
                ? "Submitting..."
                : savingDraft
                  ? "Saving draft..."
                  : currentStep >= totalSteps
                    ? "Submit"
                    : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <SafeAreaView edges={["bottom"]} style={styles.bottomSafe} />
    </>
  );
};

export default TracerFormScreen;
