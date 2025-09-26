// lib/ui/theme.ts
export const theme = {
  colors: {
    bg: '#F8FAFC',
    card: '#FFFFFF',
    text: '#1F2937',
    subtext: '#6B7280',
    divider: '#E5E7EB',

    primary: '#2563EB',   // bleu
    success: '#22C55E',   // vert (Step C)
    successDark: '#16A34A',
    warning: '#F59E0B',   // orange (chips diet)
    purple: '#7C3AED',    // contraintes

    white: '#FFFFFF',
    danger: '#EF4444',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  shadowCard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  } as const,
  shadowEmph: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  } as const,
};
