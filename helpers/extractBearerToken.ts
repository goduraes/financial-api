const jwt = require('jsonwebtoken');

export const extractBearerToken = (authHeader?: string) => {
    if (!authHeader) return { error: "Token not provided" };
    const [scheme, token] = authHeader.split(" ");
    if (!scheme || !token) return { error: "Token error" };
    if (scheme.toLowerCase() !== "bearer") return { error: "Malformatted token" };

    return jwt.verify(token, process.env.JWTSECRETKEY, (err: any, decoded: any) => {
      if (err) return { error: 'Invalid token' };
      return { token, decoded };
    });  
  }