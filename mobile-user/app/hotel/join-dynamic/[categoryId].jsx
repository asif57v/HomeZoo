import { useLocalSearchParams } from 'expo-router';
import PropertyWizard from '../../../src/components/partner/wizard/PropertyWizard';

export default function JoinDynamic() {
  const { categoryId } = useLocalSearchParams();
  return <PropertyWizard kind="dynamic" categoryId={String(categoryId)} />;
}
