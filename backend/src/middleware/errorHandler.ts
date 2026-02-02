import type { ErrorRequestHandler } from 'express';

type HttpError = Error & { statusCode?: number; status?: number };

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  void req;

  if (res.headersSent) {
    return next(err);
  }

  const httpError = err as HttpError;
  const statusCode =
    typeof httpError.statusCode === 'number'
      ? httpError.statusCode
      : typeof httpError.status === 'number'
        ? httpError.status
        : 500;

  const message = err instanceof Error ? err.message : 'Internal Server Error';

  res.status(statusCode).json({ ok: false, error: message });
};

export default errorHandler;
