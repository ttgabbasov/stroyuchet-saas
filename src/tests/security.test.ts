import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { RateLimiter } from '../middleware/rate-limit.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { ErrorCodes } from '../types/api.types';

// Mock environment variables if needed
vi.mock('../config/env', () => ({
    env: {
        JWT_SECRET: 'test-secret-key-minimum-32-chars-length-required',
    },
}));

describe('Security Middleware Tests', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        mockRequest = {
            headers: {},
            ip: '127.0.0.1',
        };
        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        nextFunction = vi.fn() as unknown as NextFunction;
    });

    describe('Rate Limiter', () => {
        it('should allow requests within limit', () => {
            const limiter = new RateLimiter({ windowMs: 1000, max: 2 });
            const middleware = limiter.middleware();

            middleware(mockRequest as Request, mockResponse as Response, nextFunction);
            expect(nextFunction).toHaveBeenCalledTimes(1);

            middleware(mockRequest as Request, mockResponse as Response, nextFunction);
            expect(nextFunction).toHaveBeenCalledTimes(2);
        });

        it('should block requests exceeding limit', () => {
            const limiter = new RateLimiter({ windowMs: 1000, max: 1 });
            const middleware = limiter.middleware();

            // First request - ok
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            // Second request - blocked
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledTimes(1); // Only once
            expect(mockResponse.status).toHaveBeenCalledWith(429);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: 'RATE_LIMIT_EXCEEDED'
                })
            }));
        });
    });

    describe('Auth Middleware', () => {
        it('should return 401 if no token provided', () => {
            authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.objectContaining({
                    code: ErrorCodes.UNAUTHORIZED
                })
            }));
        });

        it('should return 401 if token format is invalid', () => {
            mockRequest.headers = { authorization: 'InvalidFormat 123' };

            authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });

        it('should call next() if token is valid', () => {
            const validToken = jwt.sign(
                { userId: '123', role: 'OWNER' },
                'test-secret-key-minimum-32-chars-length-required'
            );
            mockRequest.headers = { authorization: `Bearer ${validToken}` };

            authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
            expect((mockRequest as any).user).toBeDefined();
            expect((mockRequest as any).user.userId).toBe('123');
        });

        it('should return 401 if token is expired', () => {
            // Create expired token
            const expiredToken = jwt.sign(
                { userId: '123' },
                'test-secret-key-minimum-32-chars-length-required',
                { expiresIn: '0s' }
            );
            // Wait a tiny bit to ensure expiry (though 0s should be immediate)

            mockRequest.headers = { authorization: `Bearer ${expiredToken}` };

            authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.objectContaining({
                    code: ErrorCodes.TOKEN_EXPIRED
                })
            }));
        });
    });
});
