
import jwt from "jsonwebtoken";

export const SECRET_KEY = "123456789";
export const expiresIn = "1h";
export const createToken = (email, name) => jwt.sign({ email, name }, SECRET_KEY, { expiresIn });
export const verifyToken = token => jwt.verify(token, SECRET_KEY, (err, decode) => (decode !== undefined ? decode : err));