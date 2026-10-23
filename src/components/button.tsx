import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  /**
   * `primary` is the solid green button, `secondary` the soft green one, `outline` a white
   * button with a thin border, `ghost` just text, and `danger` the soft red one.
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /** `small` is the round pill used inside list rows. */
  size?: 'regular' | 'small';
  icon?: IconName;
  loading?: boolean;
};

export function Button({
  title,
  variant = 'primary',
  size = 'regular',
  icon,
  loading,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const colors = {
    primary: { background: theme.tint, text: theme.onTint, border: theme.tint },
    secondary: { background: theme.tintSoft, text: theme.tintText, border: theme.tintSoft },
    outline: { background: theme.backgroundElement, text: theme.text, border: theme.inputBorder },
    ghost: { background: 'transparent', text: theme.tintText, border: 'transparent' },
    danger: { background: theme.dangerSoft, text: theme.danger, border: theme.dangerSoft },
  }[variant];
  const small = size === 'small';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={(state) => [
        styles.button,
        small ? styles.small : styles.regular,
        { backgroundColor: colors.background, borderColor: colors.border },
        variant === 'primary' && !small && styles.primaryShadow,
        (state.pressed || disabled) && styles.dimmed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View style={styles.label}>
          {icon && <Icon name={icon} size={small ? 14 : 18} color={colors.text} />}
          <ThemedText type={small ? 'smallBold' : 'default'} style={[styles.text, { color: colors.text }]}>
            {title}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  /** The green glow under the website's main buttons. */
  primaryShadow: {
    boxShadow: '0px 10px 24px -12px rgba(15, 123, 95, 0.7)',
  },
  regular: {
    minHeight: 54,
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.four,
  },
  small: {
    minHeight: 40,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  text: {
    fontWeight: 700,
    textAlign: 'center',
  },
  dimmed: {
    opacity: 0.6,
  },
});
