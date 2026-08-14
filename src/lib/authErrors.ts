/**
 * Firebase's raw error codes aren't something a nonprofit admin should have
 * to parse. Shared between every screen that touches email/password auth
 * (sign in, register, password reset, change password).
 */
export function describeAuthError(err: any): string {
  switch (err?.code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'That password is incorrect. Please try again.';
    case 'auth/user-not-found':
      return "We couldn't find an account with that email address.";
    case 'auth/email-already-in-use':
      return 'An account with that email address already exists. Try signing in instead.';
    case 'auth/invalid-email':
      return "That doesn't look like a valid email address.";
    case 'auth/weak-password':
      return 'Please choose a password with at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/requires-recent-login':
      return 'For your security, please sign out and back in before changing your password.';
    case 'auth/network-request-failed':
      return "Couldn't reach the server. Check your connection and try again.";
    default:
      return err?.message || 'Something went wrong. Please try again.';
  }
}
