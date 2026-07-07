import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import styles from '../styles/WorkExperienceScreen.styles';
import supabase from '../services/supabase';
import { getCurrentUser } from '../services/supabaseAuth';
import { ThemedAlert } from '../components/ThemedAlert';

const WorkExperienceScreen = ({ navigation }) => {
  const [workExperiences, setWorkExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkExperiences = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const user = await getCurrentUser();
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('alumni_employments')
        .select('*')
        .eq('alumni_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;

      // Map database schema to UI format and format dates
      const formattedData = (data || []).map(exp => {
        const start = new Date(exp.start_date);
        const startDateStr = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        let endDateStr = 'Present';
        if (!exp.is_current && exp.end_date) {
          const end = new Date(exp.end_date);
          endDateStr = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }

        return {
          id: exp.id,
          title: exp.job_title,
          subtitle: exp.company,
          date: `${startDateStr} - ${endDateStr}`,
          location: exp.location,
          description: exp.career_description || ''
        };
      });

      setWorkExperiences(formattedData);
    } catch (error) {
      console.error('Error fetching work experiences:', error);
      ThemedAlert.alert('Error', 'Unable to load work experiences at this time.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // useFocusEffect ensures data re-fetches automatically when returning from WorkExperienceFormScreen
  useFocusEffect(
    useCallback(() => {
      fetchWorkExperiences();
    }, [])
  );

  const onRefresh = () => {
    fetchWorkExperiences(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FACC15" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Profile</Text>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#31429B" />
          }
        >
          {/* Action Row */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Work Experience</Text>
            
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity 
                style={styles.addNewButton}
                onPress={() => navigation.navigate("WorkExperienceFormScreen")}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={12} color="#1F2937" /> 
                <Text style={styles.addNewText}>Add New</Text>
              </TouchableOpacity>

              {workExperiences.length > 1 && (
                <TouchableOpacity style={styles.reorderButton}>
                  <Ionicons name="reorder-three-outline" size={14} color="#FACC15" />
                  <Text style={styles.reorderText}>Reorder</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Cards Grid & Loading State */}
          {loading ? (
            <View style={{ marginTop: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#31429B" />
            </View>
          ) : workExperiences.length === 0 ? (
            <View style={{ marginTop: 40, alignItems: 'center', paddingHorizontal: 20 }}>
              <Ionicons name="briefcase-outline" size={48} color="#9CA3AF" />
              <Text style={{ marginTop: 12, fontSize: 16, color: '#6B7280', fontFamily: 'Poppins_400Regular', textAlign: 'center' }}>
                You haven't added any work experiences yet.
              </Text>
            </View>
          ) : (
            <View style={styles.cardsGrid}>
              {workExperiences.map((exp) => (
                <View key={exp.id} style={styles.card}>
                  <TouchableOpacity style={styles.cardMenuButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#31429B" />
                  </TouchableOpacity>
                  
                  <Ionicons name="briefcase" size={28} color="#31429B" style={styles.cardIcon} />
                  
                  <Text style={styles.cardTitle}>{exp.title}</Text>
                  <Text style={styles.cardSubtitle}>{exp.subtitle}</Text>
                  
                  <Text style={styles.cardDateLocation}>
                    {exp.date}{'\n'}{exp.location}
                  </Text>
                  
                  <Text style={styles.cardDescription}>{exp.description}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default WorkExperienceScreen;