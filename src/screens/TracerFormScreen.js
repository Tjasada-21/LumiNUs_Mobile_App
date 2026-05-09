
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View, Text, Image, Pressable, StatusBar, TextInput, TouchableOpacity, BackHandler, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../styles/TracerFormScreen.styles';
import BrandHeader from '../components/BrandHeader';
import { getTracerFormById, hasSubmittedForm, submitTracerForm } from '../services/tracerQueries';
import { getCurrentUser } from '../services/supabaseAuth';
import { getAlumniByEmail } from '../services/alumniQueries';
import { ThemedAlert } from '../components/ThemedAlert';

const normalizeType = (type, hasOptions) => {
	const t = String(type || '').toLowerCase();
	if (t.includes('check')) return 'checkbox';
	if (t.includes('drop') || t.includes('select')) return 'dropdown';
	if (t.includes('area') || t.includes('long')) return 'textarea';
	if (t.includes('text') && !hasOptions) return 'text';
	if (t.includes('radio') || hasOptions) return 'radio';
	return 'text';
};

const parseSettingsOptions = (settings) => {
	if (!settings) return [];
	let parsed;
	try {
		parsed = typeof settings === 'string' ? JSON.parse(settings) : settings;
	} catch {
		return [];
	}
	if (!Array.isArray(parsed?.options)) return [];
	return parsed.options.map((opt) => {
		if (typeof opt === 'string') {
			return { option_label: opt, option_value: opt };
		}
		return {
			option_label: opt?.label || opt?.option_label || String(opt?.value || ''),
			option_value: opt?.value || opt?.option_value || opt?.label || '',
		};
	});
};

const hasAnswer = (question, value) => {
	const hasOptions = Array.isArray(question?._options) && question._options.length > 0;
	const type = normalizeType(question?.type, hasOptions);
	if (type === 'checkbox') return Array.isArray(value) && value.length > 0;
	if (type === 'text' || type === 'textarea') return typeof value === 'string' && value.trim().length > 0;
	return value !== undefined && value !== null && String(value).trim().length > 0;
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

	useEffect(() => {
		let active = true;
		const selectedId = initialTracer?.id || initialTracer?.form_id;
		if (!selectedId) return () => {
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
		const selectedId = tracer?.id || tracer?.form_id || initialTracer?.id || initialTracer?.form_id;

		if (!selectedId) {
			return () => {
				active = false;
			};
		}

		const checkSubmissionStatus = async () => {
			try {
				setCheckingSubmission(true);

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

				const submitted = await hasSubmittedForm(alumni.id, selectedId).catch(() => false);

				if (active) {
					setAlreadySubmitted(submitted);
				}

				if (active && submitted) {
					ThemedAlert.alert('Already Submitted', 'You have already submitted this tracer form.', [
						{ text: 'OK', onPress: () => navigation.replace('AlumniTracer') },
					]);
				}
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
		const raw = tracer?.questions || tracer?.tracer_questions || tracer?.tracerQuestions || [];
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

	const toggleOption = (question, value) => {
		const qid = String(question?.id || '');
		if (!qid) return;
		const type = normalizeType(question?.type, question?._options?.length > 0);

		setAnswers((prev) => {
			if (type === 'checkbox') {
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
		ThemedAlert.alert('Leave Form', 'Are you sure you want to leave without submitting?', [
			{ text: 'No', style: 'cancel' },
			{ text: 'Yes', onPress: () => navigation.replace('AlumniTracer') },
		]);
	};

	useEffect(() => {
		const onBackPress = () => {
			confirmLeave();
			return true; // handled
		};

		const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
		return () => {
			if (subscription && typeof subscription.remove === 'function') {
				subscription.remove();
			}
		};
	}, [navigation, tracer, answers]);

	const setTextAnswer = (question, value) => {
		const qid = String(question?.id || '');
		if (!qid) return;
		setAnswers((prev) => ({ ...prev, [qid]: value }));
	};

	const submitResponses = async () => {
		if (submitting) return;
		const formId = tracer?.id || tracer?.form_id;
		if (!formId) {
			ThemedAlert.alert('Submit Failed', 'Unable to determine tracer form ID.');
			return;
		}

		try {
			Keyboard.dismiss();
			setSubmitting(true);
			if (alreadySubmitted) {
				ThemedAlert.alert('Already Submitted', 'You have already submitted this tracer form.', [
					{ text: 'OK', onPress: () => navigation.replace('AlumniTracer') },
				]);
				return;
			}

			const supaUser = await getCurrentUser();
			if (!supaUser?.email) {
				ThemedAlert.alert('Session Expired', 'Please log in again to submit your tracer form.');
				return;
			}

			const alumni = await getAlumniByEmail(supaUser.email).catch(() => null);
			if (!alumni?.id) {
				ThemedAlert.alert('User not found', 'Unable to resolve alumni profile for submission.');
				return;
			}

			const submitted = await hasSubmittedForm(alumni.id, formId).catch(() => false);
			if (submitted) {
				setAlreadySubmitted(true);
				ThemedAlert.alert('Already Submitted', 'You have already submitted this tracer form.', [
					{ text: 'OK', onPress: () => navigation.replace('AlumniTracer') },
				]);
				return;
			}

			// Convert answers object { qid: value } to array expected by submitTracerForm
			const answerArray = Object.keys(answers).map((qid) => ({ questionId: qid, value: answers[qid] }));

			await submitTracerForm(alumni.id, formId, answerArray);

			ThemedAlert.alert('Submitted', 'Your responses have been submitted successfully.', [
				{ text: 'OK', onPress: () => navigation.replace('AlumniTracer') },
			]);
		} catch (err) {
			const msg = err?.response?.data?.message || err?.message || 'Failed to submit tracer responses.';
			ThemedAlert.alert('Submit Failed', msg);
		} finally {
			setSubmitting(false);
		}
	};

	const handleSubmit = () => {
		setShowValidation(true);
		const requiredMissing = questions.filter((question) => {
			if (!question?.is_required) return false;
			const qid = String(question?.id || '');
			return !hasAnswer(question, answers[qid]);
		});

		if (requiredMissing.length > 0) {
			ThemedAlert.alert('Incomplete Form', 'Please answer all required questions.');
			return;
		}

		ThemedAlert.alert('Confirm Submission', 'Are you sure with your answers?', [
			{ text: 'No', style: 'cancel' },
			{ text: 'Yes', onPress: () => { void submitResponses(); } },
		]);
	};

	return (
		<>
			<SafeAreaView edges={['top']} style={styles.topSafe} />
			<StatusBar backgroundColor="#31429B" barStyle="light-content" />
			<View style={styles.container}>
				<BrandHeader />
				<View style={styles.backRow}>
					<Pressable
						style={styles.backButton}
						onPress={() => navigation.navigate('AlumniTracer')}
						accessibilityRole="button"
						hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
					>
						<Text style={styles.backButtonText}>{'‹  Alumni Tracer'}</Text>
					</Pressable>
				</View>
				{loading || checkingSubmission ? <ActivityIndicator size="small" color="#31429B" style={{ marginTop: 10 }} /> : null}
				<ScrollView contentContainerStyle={styles.content}>
					{tracer?.form_header ? (
						<Image source={{ uri: tracer.form_header }} style={styles.headerImage} />
					) : (
						<View style={[styles.headerImage, { backgroundColor: '#E6EEF9' }]} />
					)}

					<View style={styles.titleCard}>
						<Text style={styles.titleText}>{tracer?.form_title || 'Tracer Form'}</Text>
					</View>

					{questions.length > 0 ? (
						questions.map((question, questionIndex) => {
							const qid = String(question?.id || '');
							const options = question?._options || [];
							const type = normalizeType(question?.type, options.length > 0);
							const selected = answers[qid];
							const isInvalid = showValidation && question?.is_required && !hasAnswer(question, selected);

							return (
								<View key={qid || `question-${questionIndex}`} style={[styles.card, isInvalid ? styles.cardInvalid : null]}>
									<View style={styles.questionTitleRow}>
										<Text style={styles.cardTitle}>{question?.question_text || 'Question'}</Text>
										{question?.is_required ? <Text style={styles.requiredMark}>*</Text> : null}
									</View>
									{question?.description ? <Text style={styles.cardText}>{question.description}</Text> : null}

									{(type === 'text' || type === 'textarea') ? (
										<TextInput
											value={typeof selected === 'string' ? selected : ''}
											onChangeText={(value) => setTextAnswer(question, value)}
											placeholder={type === 'textarea' ? 'Type your answer' : 'Your answer'}
											placeholderTextColor="#9CA3AF"
											multiline={type === 'textarea'}
											numberOfLines={type === 'textarea' ? 4 : 1}
											style={[styles.textInput, type === 'textarea' ? styles.textArea : null]}
										/>
									) : Array.isArray(options) && options.length > 0 ? (
										options.map((option) => {
											const value = option?.option_value ?? option?.option_label ?? '';
											const isChecked = Array.isArray(selected)
												? selected.includes(value)
												: selected === value;

											return (
												<Pressable
													key={`${qid}-${String(value)}`}
													style={[styles.optionRow, isChecked ? styles.optionRowActive : null]}
													onPress={() => toggleOption(question, value)}
													hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
													accessibilityRole="button"
												>
													<View style={[styles.radioOuter, type === 'checkbox' ? styles.checkboxOuter : null]}>
														{isChecked ? <View style={[styles.radioInner, type === 'checkbox' ? styles.checkboxInner : null]} /> : null}
													</View>
													<Text style={styles.optionText}>{option?.option_label || String(value)}</Text>
												</Pressable>
											);
										})
									) : (
										<Text style={styles.cardText}>No answer options available.</Text>
									)}
									{isInvalid ? <Text style={styles.requiredHint}>This question is required.</Text> : null}
								</View>
							);
						})
					) : (
						<View style={styles.card}>
							<Text style={styles.cardTitle}>Data Privacy Notice</Text>
							<Text style={styles.cardText}>
								{tracer?.form_description || tracer?.description || 'No tracer questions available for this form yet.'}
							</Text>
						</View>
					)}

					<Pressable
						style={[styles.submitButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, submitting || alreadySubmitted || checkingSubmission ? { opacity: 0.75 } : null]}
						onPress={handleSubmit}
						disabled={submitting || alreadySubmitted || checkingSubmission}
						accessibilityRole="button"
					>
						{submitting ? <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} /> : null}
						<Text style={styles.submitText}>{submitting ? 'Submitting...' : alreadySubmitted ? 'Already submitted' : 'Submit'}</Text>
					</Pressable>
				</ScrollView>
			</View>
			<SafeAreaView edges={['bottom']} style={styles.bottomSafe} />
		</>
	);
};

export default TracerFormScreen;

