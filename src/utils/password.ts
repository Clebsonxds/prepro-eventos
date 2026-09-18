export function validatePassword(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push('Use pelo menos 8 caracteres.');
  if (!/[A-Z]/.test(password)) issues.push('Inclua pelo menos uma letra maiúscula.');
  if (!/[a-z]/.test(password)) issues.push('Inclua pelo menos uma letra minúscula.');
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('Inclua pelo menos um caractere especial.');
  return issues;
}
