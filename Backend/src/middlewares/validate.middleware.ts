import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validateRequest = (schema: ZodSchema<any>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params
            });

            req.body = result.body;
            req.query = result.query;
            req.params = result.params;

            next();
        } catch (error) {
            next(error);
        }
    };
};
