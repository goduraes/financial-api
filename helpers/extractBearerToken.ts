const jwt = require('jsonwebtoken');

export const extractBearerToken = (authHeader?: string) => {
    if (!authHeader) return { error: "Token não fornecido" };
    const [scheme, token] = authHeader.split(" ");
    if (!scheme || !token) return { error: "Erro no token" };
    if (scheme.toLowerCase() !== "bearer") return { error: "Token mal formatado" };

    return jwt.verify(token, process.env.JWTSECRETKEY, (err: any, decoded: any) => {
      if (err) return { error: 'Token inválido' };
      return { token, decoded };
    });  
  }