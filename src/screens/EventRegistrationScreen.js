import React from 'react';
import { View, Text, ScrollView, Pressable, ImageBackground, Image, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import BrandHeader from '../components/BrandHeader';
import { registerForEvent, getEventById } from '../services/eventQueries';
import { getAlumniByEmail } from '../services/alumniQueries';
import { getCurrentUser } from '../services/supabaseAuth';
import styles from '../styles/EventRegistrationScreen.styles';
import { ThemedAlert } from '../components/ThemedAlert';

const formatDateLabel = (startDate, endDate) => {
	if (!startDate) {
		return 'Date to be announced';
	}

	const start = new Date(startDate);
	const end = endDate ? new Date(endDate) : null;

	if (Number.isNaN(start.getTime())) {
		return 'Date to be announced';
	}

	const startLabel = start.toLocaleDateString(undefined, {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	});

	if (!end || Number.isNaN(end.getTime()) || end.getTime() === start.getTime()) {
		return startLabel;
	}

	const endLabel = end.toLocaleDateString(undefined, {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	});

	return `${startLabel} - ${endLabel}`;
};

const EventRegistrationScreen = () => {
	const navigation = useNavigation();
	const route = useRoute();
	const event = route?.params?.event ?? null;

	const eventTitle = String(event?.title ?? 'Event Details');
	const eventDescription = String(event?.description ?? '');
	const dateLabel = formatDateLabel(event?.start_date, event?.end_date);
	const eventTypeLabel = String(event?.event_type ?? 'Not set');
	const addressLabel = String(event?.venue?.address ?? event?.venue?.name ?? event?.platform ?? event?.platform_url ?? 'Address not available');
	const maxCapacityLabel = String(event?.max_capacity ?? 'Not set');
	const eventImageUri = event?.cover_image_url ?? null;
	const [privacyConsent, setPrivacyConsent] = React.useState(null);
	const [attendanceConsent, setAttendanceConsent] = React.useState(false);
	const [contactInfo, setContactInfo] = React.useState({
		email: '',
		phone: '',
	});
	const [currentAlumniId, setCurrentAlumniId] = React.useState(null);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const privacyNotice =
		' I understand and agree that by filling out and submitting this form, I am allowing NU Lipa to collect, process, use, share and disclose my personal information and responses for alumni databasing as reference for alumni activities, employment opportunities, graduate employability and planning future education needs; and to store it as long as necessary for the fulfillment of the stated purpose and in accordance with applicable laws, including the Data Privacy Act of 2012 and its implementing Rules and Regulations, and the National University Privacy Policy.';

	const goToEventsScreen = () => {
		navigation.navigate('Home', { screen: 'EventsScreen' });
	};

	React.useEffect(() => {
		let isMounted = true;

		const loadContactDetails = async () => {
			try {
				const currentUser = await getCurrentUser().catch(() => null);

				if (!currentUser?.id && !currentUser?.email) {
					return;
				}

				const profile = currentUser?.id
					? currentUser
					: await getAlumniByEmail(currentUser.email).catch(() => null);

				if (!isMounted) return;

				setCurrentAlumniId(profile?.id ?? null);
				setContactInfo({
					email: profile?.email || currentUser?.email || '',
					phone: profile?.phone_number || '',
				});
			} catch (error) {
				console.error('Failed to load registration contact details:', error);
			}
		};

		loadContactDetails();

		return () => {
			isMounted = false;
		};
	}, []);

	const handleBackPress = () => {
		if (navigation.canGoBack()) {
			navigation.goBack();
			return;
		}

		goToEventsScreen();
	};

	const handlePrivacyChoicePress = (choice) => {
		setPrivacyConsent(choice);
	};

	const handleAttendancePress = () => {
		setAttendanceConsent((currentValue) => !currentValue);
	};

	const isFormComplete =
		privacyConsent === 'agree' &&
		attendanceConsent &&
		contactInfo.email.trim().length > 0 &&
		contactInfo.phone.trim().length > 0;
	const canSubmit = isFormComplete && !isSubmitting;

	const handleRegisterSubmit = async () => {
		if (!event?.id) {
			ThemedAlert.alert('Event unavailable', 'Please go back and choose an event first.', [{ text: 'OK' }], { variant: 'error' });
			return;
		}

		if (!isFormComplete) {
			return;
		}

		try {
			setIsSubmitting(true);

			if (!currentAlumniId) {
				throw new Error('Unable to resolve alumni profile for registration');
			}

			await registerForEvent(event.id, currentAlumniId);

			ThemedAlert.alert('Registration saved', 'Your event registration has been submitted successfully.', [
				{
					text: 'OK',
					onPress: goToEventsScreen,
				},
			], { variant: 'success' });
		} catch (error) {
			const message = error.response?.data?.message ?? 'Unable to submit your registration right now.';
			ThemedAlert.alert('Registration failed', message, [{ text: 'OK' }], { variant: 'error' });
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<SafeAreaView style={styles.safeArea} edges={['top']}>
			<View style={styles.container}>
				<BrandHeader />
				<View style={styles.pageHeaderCard}>
					<Pressable style={styles.pageHeaderRow} onPress={handleBackPress} accessibilityRole="button">
						<Ionicons name="arrow-back" size={22} color="#31429B" />
						<Text style={styles.pageHeaderTitle}>Registration</Text>
					</Pressable>
				</View>
				<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
					<View style={styles.formSurface}>
						<View style={styles.eventCard}>
							{eventImageUri ? (
								<ImageBackground source={{ uri: eventImageUri }} style={styles.eventBanner} imageStyle={styles.eventBannerImage}>
									<View style={styles.eventBannerOverlay} />
								</ImageBackground>
							) : (
								<View style={styles.eventBannerFallback}>
									<View style={styles.eventBannerIconWrap}>
										<Image
											source={require('../../assets/images/registration-icon-in-blue-1.png')}
											style={styles.eventBannerIcon}
											resizeMode="contain"
										/>
									</View>
									<Text style={styles.eventBannerFallbackText}>Registration</Text>
								</View>
							)}

							<Text style={styles.eventTitle}>{eventTitle}</Text>
							<Text style={styles.eventDescription}>{eventDescription}</Text>

							<View style={styles.metaRow}>
								<View style={styles.metaItem}>
									<Ionicons name="calendar-outline" size={18} color="#5B6473" />
									<Text style={styles.metaText}>{dateLabel}</Text>
								</View>
							</View>

							<View style={styles.addressRow}>
								<Ionicons name="location-outline" size={16} color="#5B6473" />
								<Text style={styles.addressText}>{addressLabel}</Text>
							</View>

							<View style={styles.metaRow}>
								<View style={styles.metaItem}>
									<Ionicons name="pricetag-outline" size={18} color="#5B6473" />
									<Text style={styles.metaText}>{eventTypeLabel}</Text>
								</View>

								<View style={styles.metaItem}>
									<Ionicons name="people-outline" size={18} color="#5B6473" />
									<Text style={styles.metaText}>{maxCapacityLabel}</Text>
								</View>
							</View>

							<Text style={styles.sectionLabel}>Section 1: Data Privacy Notice</Text>

							<View style={styles.privacyCard}>
								<Text style={styles.privacyTitle}>Data Privacy Notice</Text>
								<Text style={styles.privacyText}>{privacyNotice}</Text>

								<View style={styles.choiceGroup}>
									<Pressable style={styles.choiceRow} onPress={() => handlePrivacyChoicePress('agree')} accessibilityRole="radio" accessibilityState={{ checked: privacyConsent === 'agree' }}>
										<View style={styles.choiceIcon}>
											<Ionicons name={privacyConsent === 'agree' ? 'radio-button-on' : 'radio-button-off'} size={18} color={privacyConsent === 'agree' ? '#31429B' : '#B4B4B4'} />
										</View>
										<Text style={styles.choiceText}>I Agree</Text>
									</Pressable>
									<Pressable style={styles.choiceRow} onPress={() => handlePrivacyChoicePress('disagree')} accessibilityRole="radio" accessibilityState={{ checked: privacyConsent === 'disagree' }}>
										<View style={styles.choiceIcon}>
											<Ionicons name={privacyConsent === 'disagree' ? 'radio-button-on' : 'radio-button-off'} size={18} color={privacyConsent === 'disagree' ? '#31429B' : '#B4B4B4'} />
										</View>
										<Text style={styles.choiceText}>I Disagree</Text>
									</Pressable>
								</View>
							</View>

							<Text style={styles.sectionLabel}>Section 2: Attendance Confirmation</Text>

							<View style={styles.confirmationCard}>
								<Text style={styles.confirmationText}>
									I hereby confirm my attendance for the selected alumni events. I understand that my slot is reserved upon
									submission, and I am willing to comply with the event guidelines and schedules set by the NU Lipa Alumni
									Affairs Office.
								</Text>

								<Pressable style={styles.choiceRow} onPress={handleAttendancePress} accessibilityRole="checkbox" accessibilityState={{ checked: attendanceConsent }}>
									<View style={styles.choiceIcon}>
										<Ionicons name={attendanceConsent ? 'radio-button-on' : 'radio-button-off'} size={18} color={attendanceConsent ? '#31429B' : '#B4B4B4'} />
									</View>
									<Text style={styles.choiceText}>I agree</Text>
								</Pressable>
							</View>

							<View style={styles.buttonWrap}>
								<Pressable
									style={[styles.primaryButton, !isFormComplete && styles.primaryButtonDisabled]}
									accessibilityRole="button"
									onPress={handleRegisterSubmit}
									disabled={!canSubmit}
									accessibilityState={{ disabled: !canSubmit }}
								>
									{isSubmitting ? (
										<ActivityIndicator color="#31429B" />
									) : (
										<Text style={styles.primaryButtonText}>Pre-Register</Text>
									)}
								</Pressable>
							</View>
						</View>
					</View>
				</ScrollView>
			</View>
		</SafeAreaView>
	);
};

export default EventRegistrationScreen;

