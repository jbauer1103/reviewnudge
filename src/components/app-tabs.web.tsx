import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { type ComponentRef, type Ref } from 'react';
import { Pressable, View, StyleSheet, useWindowDimensions } from 'react-native';

import { Logo } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

// Web version of the tab bar: a header like the website's, with the logo on the left.
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Customers</TabButton>
          </TabTrigger>
          <TabTrigger name="dashboard" href="/dashboard" asChild>
            <TabButton>Dashboard</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton>Settings</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ref, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      // expo-router types the slot ref loosely, so narrow it for Pressable.
      ref={ref as unknown as Ref<ComponentRef<typeof View>>}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type={isFocused ? 'tint' : 'backgroundElement'} style={styles.tabButtonView}>
        <ThemedText type="smallBold" themeColor={isFocused ? 'onTint' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();
  // On a phone-sized browser only the logo's icon fits beside the tabs.
  const narrow = useWindowDimensions().width < 560;
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.tabListContainer, { borderColor: theme.border }]}>
      <View style={styles.innerContainer}>
        <Logo size={32} markOnly={narrow} />
        <View {...props} style={styles.tabs}>
          {props.children}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: Spacing.three - Spacing.half,
    paddingHorizontal: Spacing.three + Spacing.one,
  },
  innerContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three - Spacing.one,
    borderRadius: 12,
  },
});
