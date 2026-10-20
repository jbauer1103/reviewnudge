import { PlaceholderScreen } from '@/components/placeholder-screen';

// The Customers tab. It is the app's first screen, so it lives at index.tsx.
export default function CustomersScreen() {
  return (
    <PlaceholderScreen
      title="Customers"
      description="Pick a customer and ask them for a Google review."
      comingSoon={[
        'Add customers by hand or from your phone contacts',
        'Search your customer list',
        'Tap "Ask for review" to open Messages with your text ready to send',
      ]}
    />
  );
}
