import { PolicyPage } from '../../src/components/Common';

export default function PartnerTerms() {
  return <PolicyPage audience="partner" slug="terms" titleUser="Terms & Conditions" titlePartner="Partner Agreement" fallback="Using default partner agreement until admin configures legal copy. By listing on HoomZo you agree to the platform's payout, commission, cancellation and quality standards." />;
}
