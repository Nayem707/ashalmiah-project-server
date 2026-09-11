import { Role } from '@prisma/client';
import { AccessTokenPayload } from '../utils/jwt';

// Augment Express Request with the authenticated user payload.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export type { Role };
