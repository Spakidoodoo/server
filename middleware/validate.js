import { z } from 'zod';

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      console.log("error in validation middleware:", err);
      res.status(400).json({ error: err.errors });
    }
  };
};