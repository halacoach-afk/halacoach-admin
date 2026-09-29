/** Password creation / change / reset policy (not applied on login). */
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function isPasswordPolicyValid(password: string): boolean {
  return PASSWORD_POLICY_REGEX.test(password);
}
