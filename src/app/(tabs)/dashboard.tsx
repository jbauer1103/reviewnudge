import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function DashboardScreen() {
  return (
    <PlaceholderScreen
      title="Dashboard"
      description="See how your review requests are doing."
      comingSoon={['Review requests sent', 'Google reviews gained since you joined']}
    />
  );
}
