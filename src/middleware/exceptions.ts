import { NextFunction, Request, Response } from "express";

import AppError from "../errors/AppError";

export default async function exceptions(
  error: Error,
  request: Request,
  response: Response,
  _: NextFunction,
) {
  if (error instanceof AppError) {
    return response.status(error.status).json({ message: error.message });
  }

  console.error(error);

  return response.status(500).json({ message: "Internal server error" });
}
