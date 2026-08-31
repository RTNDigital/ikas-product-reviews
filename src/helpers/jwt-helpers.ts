import { JwtPayload, sign, verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

/**
 * JWT helper methods
 */
export class JwtHelpers {
  /**
   * This api decodes and verify JWT Token by app secret
   *
   * @param token Encoded JWT Token string
   */
  static verifyToken(token: string) {
    const secret = process.env.CLIENT_SECRET;
    if (!secret) return;
    try {
      return verify(token, secret, {}) as JwtPayload;
    } catch (e) {
      console.error('Error verifying token:', e);
      return;
    }
  }

  /**
   * This api returns new JWT Token that contains same data as ikas created.
   *
   * @param merchantId Id of the merchant's store
   * @param authorizedAppId Id of the app which is unique per store and per installation
   */
  static createToken(merchantId: string, authorizedAppId: string) {
    const secret = process.env.CLIENT_SECRET;
    if (!secret) throw new Error('CLIENT_SECRET not configured');
    return sign({}, secret, {
      expiresIn: '4h', // 4 Hours
      algorithm: 'HS256',
      subject: merchantId,
      issuer: process.env.NEXT_PUBLIC_DEPLOY_URL || '',
      audience: authorizedAppId,
      jwtid: uuidv4(),
    });
  }
}
