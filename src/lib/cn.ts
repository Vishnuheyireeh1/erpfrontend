// Joins class names, skipping falsy values: cn('a', ok && 'b') → 'a b'
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
