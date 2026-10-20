import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function SettingsScreen() {
  return (
    <PlaceholderScreen
      title="Settings"
      description="Your business details and account."
      comingSoon={[
        'Business name and Google listing',
        'Edit your review request message',
        'Log out and delete account',
      ]}
    />
  );
}
