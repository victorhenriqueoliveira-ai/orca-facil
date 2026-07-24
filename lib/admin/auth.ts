export function isAdmin(email: string | undefined | null): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!adminEmail && !!email && email === adminEmail;
}
