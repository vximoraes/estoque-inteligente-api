import type { Request, Response, NextFunction, RequestHandler } from 'express';

const asyncWrapper = (
  handler: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<unknown>,
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

export default asyncWrapper;
