import { useLocalSearchParams } from 'expo-router';
import { PolicyPage } from '../../src/components/Common';

export default function Terms() {
  const { audience } = useLocalSearchParams();
  return <PolicyPage audience={audience || 'user'} slug="terms" titleUser="Terms & Conditions" titlePartner="Partner Agreement" fallback="Latest terms not available." />;
}
