import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../../constants/theme'

export interface SelectOption {
  label: string
  value: string
}

interface FormSelectProps {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}

export function FormSelect({ label, value, options, onChange }: FormSelectProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const active = option.value === value

          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.option, active ? styles.activeOption : null]}
            >
              <Text style={[styles.optionText, active ? styles.activeOptionText : null]}>{option.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    minHeight: 40,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  activeOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  activeOptionText: {
    color: colors.surface,
  },
})
