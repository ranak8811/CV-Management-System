import jwt from "jsonwebtoken";

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, protect.env.JWT_SECRET);

      req.user = decoded;

      next();
    } catch (error) {
      console.error("Token validation error: ", error);
      res.status(401).json({
        success: false,
        message: "Not authorized, token failed",
      });
    }
  }

  if (!token) {
    res
      .status(401)
      .json({ success: false, message: "Not authorized, no token provided" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!res.user || !roles.includes(req.user.role)) {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: User role '${req.user?.role}' is not authorized to access this route`,
        });
      }
      next();
    }
  };
};

export { protect, authorize };
