import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#32418C', // Sets the top safe area color
  },
  keyboardView: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Keeps the main screen body white
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
    padding: 24,
    justifyContent: 'space-between',
  },
  formSection: {
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  bottomSection: {
    width: '100%',
  },
  reminderCard: {
    backgroundColor: '#31429B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  reminderTitle: {
    color: '#FACC15',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  reminderText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  discardButton: {
    flex: 1,
    backgroundColor: '#8E8E93',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginRight: 10,
  },
  discardButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FACC15',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#31429B',
    fontSize: 16,
    fontWeight: 'bold',
  },
});