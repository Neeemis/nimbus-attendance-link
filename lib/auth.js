import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'attendance_super_secret_key_change_in_production_2024';

/**
 * Verify JWT from request headers or query params.
 * Returns the decoded user payload or null.
 */
export function verifyAuth(request) {
  let token = null;

  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '');
  }

  // Check query param (for PDF downloads, etc.)
  if (!token) {
    const { searchParams } = new URL(request.url);
    token = searchParams.get('token');
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded; // { id, email, name, role }
  } catch {
    return null;
  }
}

/**
 * Helper to get effective user ID (Admin can pass ?userId= to impersonate)
 */
export function getTargetUserId(user, searchParams) {
  if (user.role === 'admin' && searchParams.get('userId')) {
    return parseInt(searchParams.get('userId'), 10);
  }
  return user.id;
}
