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

    data = JSON.parse(data.toString());

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

    const access_token = createToken(email, name);

    res.status(200).json({ access_token, user: { id: user.id, name: user.name, email: user.email } });
  });
});

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
      ...album.photos.map(item => {
        const { createdAt, updatedAt, apiId, ...itemPhoto } = mappingPhotos.get(Number(item));
        return { ...itemPhoto };
      })
    ]
  };
  
  res.json(newAlbums);
});

server.get('/api/v1/photos/:id', (req, res) => {
  const db = router.db;
  const photo = db.get('photos').find({ id: Number(req.params.id) }).value();
  res.json(photo);
});

server.put('/api/v1/albums/:id', (req, res) => {
  const newData = req.body;
  const db = router.db;
  const albums = db.get('albums').value();

  const newAlbums = albums.map(object => {
    if (object.id === Number(req.params.id)) {
      return { ...object, ...newData, updatedAt: Date.now() };
    }
    return object;
  });

  fs.readFile("./db/database.json", (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }
    
    data = JSON.parse(data.toString());

    data.albums = newAlbums;

    fs.writeFile("./db/database.json", JSON.stringify(data), (err) => {
      if (err) {
        const status = 401;
        const message = err;
        res.status(status).json({ status, message });
        return;
      }
    });
    res.json({ data: newData, message: 'Successful to update data' });
  });
});

server.put('/api/v1/photos/:id', (req, res) => {
  const newData = req.body;
  const db = router.db;
  const photos = db.get('photos').value();

  const newPhotos = photos.map(object => {
    if (object.id === Number(req.params.id)) {
      return { ...object, ...newData, updatedAt: Date.now() };
    }
    return object;
  });

  fs.readFile("./db/database.json", (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }

    data = JSON.parse(data.toString());

    data.photos = newPhotos;

    fs.writeFile("./db/database.json", JSON.stringify(data), (err) => {
      if (err) {
        const status = 401;
        const message = err;
        res.status(status).json({ status, message });
        return;
      }
    });
    res.json({ data: newData, message: 'Successful to update data' });
  });
});

server.delete('/api/v1/albums/:id', (req, res) => {
  const db = router.db;
  const albums = db.get('albums').value();
  const album = db.get('albums').filter({ id: Number(req.params.id) });

  const newAlbums = albums.filter(item => item.id !== Number(req.params.id));

  fs.readFile("./db/database.json", (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }

    data = JSON.parse(data.toString());

    data.albums = newAlbums;

    fs.writeFile("./db/database.json", JSON.stringify(data), (err) => {
      if (err) {
        const status = 401;
        const message = err;
        res.status(status).json({ status, message });
        return;
      }
    });
    res.json({ data: album, message: 'Successful to deleted data' });
  });
});

server.delete('/api/v1/photos/:id', (req, res) => {
  const db = router.db;
  const photos = db.get('photos').value();
  const photo = db.get('photos').filter({ id: Number(req.params.id) });
  const albums = db.get('albums').value();

  const newPhotos = photos.filter(item => item.id !== Number(req.params.id));
  const newAlbums = albums.map(object => {
    if(object.photos.includes(Number(req.params.id))){
      return { ...object, photos: object.photos.filter(el => el !== Number(req.params.id) )}
    }
    return object;
  });

  fs.readFile("./db/database.json", (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }

    data = JSON.parse(data.toString());

    data.photos = newPhotos;
    data.albums = newAlbums;

    fs.writeFile("./db/database.json", JSON.stringify(data), (err) => {
      if (err) {
        const status = 401;
        const message = err;
        res.status(status).json({ status, message });
        return;
      }
    });
    res.json({ data: photo, message: 'Successful to deleted data' });
  });
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

server.use((req, res, next) => {
  if (req.method === 'POST') {
    req.body.createdAt = Date.now()
    req.body.updatedAt = Date.now()
  }
  next();
});

server.use(router);

server.listen(process.env.PORT || 3030, () => {
  console.log("Run Auth API Server");
});