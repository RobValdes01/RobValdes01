const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session'); // Nuevo: Gestión de sesiones
const app = express();
const port = 3000;

app.set('view engine', 'ejs');

// Configuración de sesiones en memoria
app.use(session({
  secret: 'mi_clave_secreta_super_segura',
  resave: false,
  saveUninitialized: false
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));

const db = new sqlite3.Database('./mi_base.db', (err) => {
  if (err) console.error(err.message);
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL,
    edad INTEGER NOT NULL
  )`);
});

// --- MIDDLEWARE DE SEGURIDAD (Protege las rutas) ---
function verificarSesion(req, res, next) {
  if (req.session.usuarioLogueado) {
    return next(); // Si hay sesión, continúa a la ruta solicitada
  }
  res.redirect('/login'); // Si no, redirige al login
}

// --- RUTAS DE AUTENTICACIÓN ---
app.get('/login', (req, res) => {
  if (req.session.usuarioLogueado) return res.redirect('/');
  res.render('login');
});

app.post('/login', (req, res) => {
  const { usuario, password } = req.body;
  
  // Credenciales fijas de prueba
  if (usuario === 'admin' && password === 'admin123') {
    req.session.usuarioLogueado = true;
    res.redirect('/');
  } else {
    res.render('login', { error: 'Usuario o contraseña incorrectos.' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// --- RUTA: READ (Protegida) ---
app.get('/', verificarSesion, (req, res) => {
  db.all('SELECT * FROM usuarios', [], (err, filas) => {
    if (err) return res.status(500).send(err.message);
    res.render('index', { usuarios: filas });
  });
});

// --- RUTA: CREATE (Protegida) ---
app.post('/create', verificarSesion, (req, res) => {
  const { nombre, correo, edad } = req.body;
  if (!nombre || !correo || !edad || isNaN(edad)) {
    return res.status(400).send('Datos incorrectos.');
  }
  db.run('INSERT INTO usuarios (nombre, correo, edad) VALUES (?, ?, ?)', [nombre, correo, parseInt(edad)], (err) => {
    if (err) return res.status(500).send(err.message);
    res.redirect('/');
  });
});

// --- RUTA: UPDATE (Protegida) ---
app.post('/update', verificarSesion, (req, res) => {
  const { id, nombre, correo, edad } = req.body;
  db.run('UPDATE usuarios SET nombre = ?, correo = ?, edad = ? WHERE id = ?', [nombre, correo, parseInt(edad), id], (err) => {
    if (err) return res.status(500).send(err.message);
    res.redirect('/');
  });
});

// --- RUTA: DELETE (Protegida) ---
app.get('/delete/:id', verificarSesion, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM usuarios WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).send(err.message);
    res.redirect('/');
  });
});

app.listen(port, () => {
  console.log(`Servidor CRUD con Autenticación corriendo en http://localhost:${port}`);
});
