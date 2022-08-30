import fs from 'fs';
import bodyParser from 'body-parser';
import jsonServer from 'json-server';
import { v4 as uuidv4 } from 'uuid';
import { getUser } from '../model/users';
import { createToken, verifyToken } from '../lib/jwt';

const server = jsonServer.create();
const router = jsonServer.router("./db/database.json");

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

server.post("/api/auth/register", (req, res) => {
  console.log("register endpoint called; request body:");
  console.log(req.body);

  const { email, password, name } = req.body;
  let user = getUser(email, password);

  if (user) {
    const status = 400;
    const message = "Email already exist";
    res.status(status).json({ status, message });
    return;
  }

  fs.readFile("./db/users.json", (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }

    // Get current users data
    data = JSON.parse(data.toString());

    //Add new user
    user = {
      id: uuidv4(),
      email: email,
      name: name,
      password: password
    };

    data.users.push(user);

    fs.writeFile("./db/users.json", JSON.stringify(data), (err, result) => {
      if (err) {
        const status = 401;
        const message = err;
        res.status(status).json({ status, message });
        return;
      }
    });

    // Create token for new user
    const access_token = createToken(email, name);

    res.status(200).json({ access_token, user: { id: user.id, name: user.name, email: user.email } });
  });
});

// Login to one of the users from ./users.json
server.post("/api/auth/login", (req, res) => {
  console.log("login endpoint called; request body:");
  console.log(req.body);
  const { email, password } = req.body;

  const user = getUser(email, password);

  if (!user) {
    const status = 400;
    const message = "Incorrect email or password";
    res.status(status).json({ status, message });
    return;
  }

  const access_token = createToken(user.email, user.name);
  console.log("Access Token:" + access_token);

  res.status(200).json({ access_token, user: { id: user.id, name: user.name, email: user.email } });
});

server.use(/^(?!\/api\/auth).*$/, (req, res, next) => {
  if (req.headers.authorization === undefined || req.headers.authorization.split(" ")[0] !== "Bearer") {
    const status = 401;
    const message = "Error in authorization format";
    res.status(status).json({ status, message });
    return;
  }
  try {
    const verifyTokenResult = verifyToken(req.headers.authorization.split(" ")[1]);

    if (verifyTokenResult instanceof Error) {
      const status = 401;
      const message = "Access token not provided";
      res.status(status).json({ status, message });
      return;
    }
    next();
  } catch (err) {
    const status = 401;
    const message = "Error access_token is revoked";
    res.status(status).json({ status, message });
  }
});

server.get('/api/v1/albums/:id', (req, res) => {
  const db = router.db;
  const photos = db.get('photos').value();
  const album = db.get('albums').find({ id: Number(req.params.id) }).value();

  const mappingPhotos = new Map();
  photos.forEach((photo) => {
    const { id, ...item } = photo;
    mappingPhotos.set(id, { id, ...item });
  });

  const newAlbums = {
    ...album, photos: [
      ...album.photos.map(item=> ({...mappingPhotos.get(Number(item))}))
    ] };
  res.json(newAlbums);
});

server.use(router);



server.listen(3030, () => {
  console.log("Run Auth API Server");
});