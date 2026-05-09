import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2E3F98',
  },
  container: {
    flex: 1,
    backgroundColor: '#31429B',
  },
  gradientOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: '#3A4AA2',
    opacity: 0.35,
  },
  gradientOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '38%',
    backgroundColor: '#31429B',
    opacity: 0.45,
  },
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 24,
  },
  logo: {
    width: 188,
    height: 56,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: '#2C3B89',
    borderRadius: 20,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemBtn: {
    alignItems: 'center',
  },
  iconWrap: {
    borderRadius: 21,
    backgroundColor: '#3248A2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D133D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
    marginBottom: 8,
  },
  icon: {
    width: 54,
    height: 54,
  },
  itemLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '400',
    minHeight: 38,
  },
});

export default styles;