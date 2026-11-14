export function validateRequest(zodSchema) {
  return (req, res, next) => {
    try {
      req.body = zodSchema.parse(req.body);
      next();
    } catch (error) {
      const issues = error.errors?.map(e => ({
        path: e.path.join('.'),
        message: e.message
      })) || [{ message: error.message }];

      return res.status(400).json({
        error: 'Validation failed for request payload',
        details: issues
      });
    }
  };
}

