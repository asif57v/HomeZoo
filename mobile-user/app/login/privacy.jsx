import { useLocalSearchParams } from 'expo-router';
import { PolicyPage } from '../../src/components/Common';

export default function Privacy() {
  const { audience } = useLocalSearchParams();
  return <PolicyPage audience={audience || 'user'} slug="privacy" titleUser="Privacy Policy" titlePartner="Partner Privacy" fallback="Latest policy not available." />;
}
