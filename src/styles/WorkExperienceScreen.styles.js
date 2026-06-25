import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#32418C', // Clean top notch color
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#32418C',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Pushes title to the left, buttons to the right
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16, // Scaled down to fit smaller screens
    fontWeight: 'bold',
    color: '#1F2937',
  },
  actionButtonsRow: {
    flexDirection: 'row', // Places the two buttons side-by-side
    alignItems: 'center',
    gap: 4, // Tightened spacing
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5, // Reduced padding
    paddingHorizontal: 8, // Reduced padding
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    backgroundColor: '#FFFFFF',
  },
  addNewText: {
    fontSize: 11, // Scaled down
    color: '#1F2937',
    marginLeft: 4,
    fontWeight: '600',
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5, // Reduced padding
    paddingHorizontal: 8, // Reduced padding
    borderRadius: 20,
    backgroundColor: '#31429B',
  },
  reorderText: {
    fontSize: 11, // Scaled down
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderColor: '#FACC15',
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  cardMenuButton: {
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  cardIcon: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  cardDateLocation: {
    fontSize: 11,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  cardDescription: {
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 16,
  },
});