import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  TextInput,
  Switch,
  Platform,
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import styles from '../styles/WorkExperienceScreen.styles';
import supabase from '../services/supabase';
import { getCurrentUser } from '../services/supabaseAuth';
import { ThemedAlert } from '../components/ThemedAlert';

const WorkExperienceScreen = ({ navigation }) => {
  const [workExperiences, setWorkExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Reorder State
  const [isReordering, setIsReordering] = useState(false);

  // Modal & Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExp, setSelectedExp] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editForm, setEditForm] = useState({
    title: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: ''
  });

  const fetchWorkExperiences = async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const user = await getCurrentUser();
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('alumni_employments')
        .select('*')
        .eq('alumni_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;

      // Sort by display_order in JS to prevent crashes if the column hasn't been added yet
      const sortedData = (data || []).sort((a, b) => {
        if (typeof a.display_order === 'number' && typeof b.display_order === 'number') {
          return a.display_order - b.display_order;
        }
        return 0;
      });

      const formattedData = sortedData.map(exp => {
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
          description: exp.career_description || '',
          display_order: exp.display_order,
          raw: exp 
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

  useFocusEffect(
    useCallback(() => {
      fetchWorkExperiences();
    }, [])
  );

  const onRefresh = () => {
    fetchWorkExperiences(true);
  };

  const handleSaveOrder = async () => {
    setIsSaving(true);
    try {
      // Loop through the visually reordered list and update their display_order index in the DB
      await Promise.all(
        workExperiences.map((exp, index) =>
          supabase
            .from('alumni_employments')
            .update({ display_order: index })
            .eq('id', exp.id)
        )
      );
      setIsReordering(false);
      ThemedAlert.alert("Success", "Work experience order saved!");
    } catch (error) {
      console.error('Save order error:', error);
      ThemedAlert.alert('Database Error', 'Failed to save order. Make sure you added the "display_order" column to the alumni_employments table in Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (exp) => {
    setSelectedExp(exp);
    setEditForm({
      title: exp.raw.job_title || '',
      company: exp.raw.company || '',
      location: exp.raw.location || '',
      startDate: exp.raw.start_date ? exp.raw.start_date.split('T')[0] : '', 
      endDate: exp.raw.end_date ? exp.raw.end_date.split('T')[0] : '',
      isCurrent: exp.raw.is_current || false,
      description: exp.raw.career_description || ''
    });
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editForm.title || !editForm.company || !editForm.startDate) {
      ThemedAlert.alert('Missing Fields', 'Please fill out the Job Title, Company, and Start Date.');
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('alumni_employments')
        .update({
          job_title: editForm.title,
          company: editForm.company,
          location: editForm.location,
          start_date: editForm.startDate || null,
          end_date: editForm.isCurrent ? null : (editForm.endDate || null),
          is_current: editForm.isCurrent,
          career_description: editForm.description
        })
        .eq('id', selectedExp.id);

      if (error) throw error;
      
      setModalVisible(false);
      fetchWorkExperiences(); 
    } catch (error) {
      console.error('Update error:', error);
      ThemedAlert.alert('Error', 'Failed to update work experience.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Remove Experience",
      "Are you sure you want to delete this work experience? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            setIsSaving(true);
            try {
              const { error } = await supabase
                .from('alumni_employments')
                .delete()
                .eq('id', selectedExp.id);
              
              if (error) throw error;
              setModalVisible(false);
              fetchWorkExperiences();
            } catch (err) {
              ThemedAlert.alert('Error', 'Could not delete work experience.');
            } finally {
              setIsSaving(false);
            }
          } 
        }
      ]
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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

          <View style={styles.content}>
            {/* Action Row */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Work Experience</Text>
              
              <View style={styles.actionButtonsRow}>
                {isReordering ? (
                  <TouchableOpacity 
                    style={[styles.reorderButton, { backgroundColor: '#10B981' }]} 
                    onPress={handleSaveOrder}
                    disabled={isSaving}
                  >
                    {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.reorderText}>Save Order</Text>}
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity 
                      style={styles.addNewButton}
                      onPress={() => navigation.navigate("WorkExperienceFormScreen")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="create-outline" size={12} color="#1F2937" /> 
                      <Text style={styles.addNewText}>Add New</Text>
                    </TouchableOpacity>

                    {workExperiences.length > 1 && (
                      <TouchableOpacity style={styles.reorderButton} onPress={() => setIsReordering(true)}>
                        <Ionicons name="reorder-three-outline" size={14} color="#FACC15" />
                        <Text style={styles.reorderText}>Reorder</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>

            {/* List / Grid Rendering */}
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
            ) : isReordering ? (
              // Draggable List View
              <DraggableFlatList
                data={workExperiences}
                onDragEnd={({ data }) => setWorkExperiences(data)}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item, drag, isActive }) => (
                  <ScaleDecorator>
                    <TouchableOpacity
                      onLongPress={drag}
                      disabled={isActive}
                      style={[
                        styles.dragCard,
                        { backgroundColor: isActive ? '#F3F4F6' : '#FFFFFF' }
                      ]}
                    >
                      <Ionicons name="reorder-two" size={28} color="#9CA3AF" style={{ marginRight: 16 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { textAlign: 'left', marginBottom: 2 }]}>{item.title}</Text>
                        <Text style={[styles.cardSubtitle, { textAlign: 'left', marginBottom: 0 }]}>{item.subtitle}</Text>
                      </View>
                    </TouchableOpacity>
                  </ScaleDecorator>
                )}
              />
            ) : (
              // Standard Grid View
              <ScrollView 
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#31429B" />}
              >
                <View style={styles.cardsGrid}>
                  {workExperiences.map((exp) => (
                    <View key={exp.id} style={styles.card}>
                      <TouchableOpacity 
                        style={styles.cardMenuButton} 
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        onPress={() => openEditModal(exp)}
                      >
                        <Ionicons name="ellipsis-horizontal" size={20} color="#31429B" />
                      </TouchableOpacity>
                      
                      <Ionicons name="briefcase" size={28} color="#31429B" style={styles.cardIcon} />
                      <Text style={styles.cardTitle}>{exp.title}</Text>
                      <Text style={styles.cardSubtitle}>{exp.subtitle}</Text>
                      <Text style={styles.cardDateLocation}>{exp.date}{'\n'}{exp.location}</Text>
                      <Text style={styles.cardDescription}>{exp.description}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>

        {/* Edit Form Modal */}
        <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
            
            <View style={styles.modalContainer}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Edit Experience</Text>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.formRow}>
                  <Text style={styles.inputLabel}>Job Title <Text style={{color: 'red'}}>*</Text></Text>
                  <TextInput style={styles.inputField} value={editForm.title} onChangeText={(text) => setEditForm(prev => ({ ...prev, title: text }))} placeholder="e.g. Software Engineer" />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.inputLabel}>Company <Text style={{color: 'red'}}>*</Text></Text>
                  <TextInput style={styles.inputField} value={editForm.company} onChangeText={(text) => setEditForm(prev => ({ ...prev, company: text }))} placeholder="e.g. Google" />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.inputLabel}>Location</Text>
                  <TextInput style={styles.inputField} value={editForm.location} onChangeText={(text) => setEditForm(prev => ({ ...prev, location: text }))} placeholder="e.g. Manila, Philippines" />
                </View>

                <View style={styles.rowSplit}>
                  <View style={[styles.formRow, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Start Date <Text style={{color: 'red'}}>*</Text></Text>
                    <TextInput style={styles.inputField} value={editForm.startDate} onChangeText={(text) => setEditForm(prev => ({ ...prev, startDate: text }))} placeholder="YYYY-MM-DD" />
                  </View>

                  {!editForm.isCurrent && (
                    <View style={[styles.formRow, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.inputLabel}>End Date</Text>
                      <TextInput style={styles.inputField} value={editForm.endDate} onChangeText={(text) => setEditForm(prev => ({ ...prev, endDate: text }))} placeholder="YYYY-MM-DD" />
                    </View>
                  )}
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.inputLabel}>I currently work here</Text>
                  <Switch value={editForm.isCurrent} onValueChange={(val) => setEditForm(prev => ({ ...prev, isCurrent: val }))} trackColor={{ false: "#D1D5DB", true: "#31429B" }} thumbColor="#FFFFFF" />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput style={[styles.inputField, styles.textArea]} value={editForm.description} onChangeText={(text) => setEditForm(prev => ({ ...prev, description: text }))} placeholder="Describe your role and achievements..." multiline numberOfLines={4} />
                </View>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity style={[styles.saveBtn, isSaving && { opacity: 0.7 }]} onPress={handleUpdate} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete} disabled={isSaving}>
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default WorkExperienceScreen;