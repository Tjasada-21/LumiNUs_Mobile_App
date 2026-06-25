import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/WorkExperienceScreen.styles';

const WorkExperienceScreen = ({ navigation }) => {
  // Array to map through the 4 mockup cards seamlessly
  const workExperiences = Array(4).fill({
    title: 'Graphic Designer',
    subtitle: 'At National University Philippines',
    date: 'March 2025 - Present',
    location: 'Philippines',
    description: 'A brief description about the job'
  });

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

        <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
          {/* Action Row */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Work Experience</Text>
            
            {/* Wrap the buttons in this view to group them together on the right */}
            <View style={styles.actionButtonsRow}>
              
              {/* --- FIXED: Added the onPress navigation here! --- */}
              <TouchableOpacity 
                style={styles.addNewButton}
                onPress={() => navigation.navigate("WorkExperienceFormScreen")}
                activeOpacity={0.8}
              >
                {/* Scaled down icon to 12 */}
                <Ionicons name="create-outline" size={12} color="#1F2937" /> 
                <Text style={styles.addNewText}>Add New</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.reorderButton}>
                {/* Scaled down icon to 14 */}
                <Ionicons name="reorder-three-outline" size={14} color="#FACC15" />
                <Text style={styles.reorderText}>Reorder</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cards Grid */}
          <View style={styles.cardsGrid}>
            {workExperiences.map((exp, index) => (
              <View key={index} style={styles.card}>
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
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default WorkExperienceScreen;