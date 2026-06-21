/* Lightweight form validation helpers — no dependency needed. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const validators = {
  required:
    (msg = 'This field is required') =>
    (v) =>
      v && String(v).trim() ? '' : msg,

  email:
    (msg = 'Enter a valid email address') =>
    (v) =>
      EMAIL_RE.test(String(v).trim()) ? '' : msg,

  minLength:
    (n, msg) =>
    (v) =>
      String(v).length >= n ? '' : msg || `Must be at least ${n} characters`,

  match:
    (getOther, msg = 'Values do not match') =>
    (v) =>
      v === getOther() ? '' : msg,
}

/**
 * Runs a schema of `{ field: [rule, rule] }` against `values`.
 * Returns `{ field: 'first error message' }` for failing fields.
 */
export function validate(values, schema) {
  const errors = {}
  for (const field in schema) {
    for (const rule of schema[field]) {
      const error = rule(values[field], values)
      if (error) {
        errors[field] = error
        break
      }
    }
  }
  return errors
}

// Returns a 0–4 password strength score + label
export function passwordStrength(pw = '') {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['#EF4444', '#EF4444', '#F59E0B', '#06B6D4', '#10B981']
  return { score, label: labels[score], color: colors[score] }
}
