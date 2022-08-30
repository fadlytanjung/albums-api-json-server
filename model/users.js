import fs from 'fs';

export const userdb = JSON.parse(fs.readFileSync("./db/users.json", "UTF-8"));

export const getUser = (email, password) => userdb.users.find(user => user.email === email && user.password === password);