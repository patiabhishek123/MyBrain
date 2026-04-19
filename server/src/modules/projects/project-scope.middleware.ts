import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { AppError } from "../../shared/errors/AppError.js";
import { ProjectAccessService } from "./project-access.service.js";

const projectIdSchema = z.string().trim().min(1).max(64);

const extractProjectId = (req: Request): string => {
  const candidate = req.params.projectId ?? req.header("x-project-id");
  const parsed = projectIdSchema.safeParse(candidate);

  if (!parsed.success) {
    throw new AppError("projectId is required", 400);
  }

  return parsed.data;
};

export const createRequireProjectScope = (projectAccessService: ProjectAccessService) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.authUser?.id) {
        throw new AppError("Unauthorized", 401);
      }

      const projectId = extractProjectId(req);

      await projectAccessService.assertProjectOwnership({
        userId: req.authUser.id,
        projectId
      });

      req.projectScope = {
        userId: req.authUser.id,
        projectId
      };

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
