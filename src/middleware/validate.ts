import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/apiError';

// Validates request segments against a Zod schema shaped { body?, query?, params? }.
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed.body) req.body = parsed.body;
      // query and params are read-only getters in Express 5; mutate in place instead.
      if (parsed.query) Object.assign(req.query, parsed.query);
      if (parsed.params) Object.assign(req.params, parsed.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        throw ApiError.badRequest('Validation failed', details);
      }
      throw err;
    }
  };
}
