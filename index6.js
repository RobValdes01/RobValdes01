require('dotenv').config(); // 1. CARGAR VARIABLES DE ENTORNO EN LA LÍNEA 1

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const flash = require('connect-flash');
const session = require('express-session'); 
const bcrypt = require('bcrypt');           
const jwt = require('jsonwebtoken');       
const cookieParser = require('cookie-parser'); 

const app = express();
const port = process.env.PORT || 3000;
const CLAVE_SECRETA_JWT = process.env.JWT_SECRET || 'clave_secreta_alternativa_por_si_falla_el_env';

app.set('view engine', 'ejs');

// MIDDLEWARES DE PROCESAMIENTO
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser()); 

// SOPORTE PARA ALERTAS FLASH
app.use(session({ 
  secret: process.env.SESSION_SECRET || 'clave_secreta_alternativa_por_si_falla_el_env', 
  resave: false, 
  saveUninitialized: false 
}));
app.use(flash());

app.use((req, res, next) => {
  res.locals.mensajeExito = req.flash('exito');
  res.locals.mensajeError = req.flash('error');
  next();
});

app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));

// Inicializar Base de Datos
const db = new sqlite3.Database('./mi_base.db', (err) => {
  if (err) console.error(err.message);
  
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL,
    edad INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS administradores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);
});

// --- MIDDLEWARE DE SEGURIDAD REAL CON JWT ---
function verificarTokenJWT(req, res, next) {
  const token = req.cookies.token_acceso;

  if (!token) {
    return res.redirect('/login');
  }

  try {
    const verificado = jwt.verify(token, CLAVE_SECRETA_JWT);
    req.user = verificado; 
    next();
  } catch (err) {
    res.clearCookie('token_acceso');
    res.redirect('/login');
  }
}

// --- RUTAS DE AUTENTICACIÓN ---
app.get('/login', (req, res) => {
  res.render('login', { error: req.flash('loginError') });
});

app.post('/login', (req, res) => {
  const { usuario, password } = req.body;

  db.get('SELECT * FROM administradores WHERE usuario = ?', [usuario], async (err, admin) => {
    if (err || !admin) {
      req.flash('loginError', 'Usuario o contraseña incorrectos.');
      return res.redirect('/login');
    }

    const coinciden = await bcrypt.compare(password, admin.password);
    if (coinciden) {
      const token = jwt.sign({ id: admin.id, nombre: admin.usuario }, CLAVE_SECRETA_JWT, { expiresIn: '1h' });
      res.cookie('token_acceso', token, { maxAge: 3600000, httpOnly: true }); 
      res.redirect('/');
    } else {
      req.flash('loginError', 'Usuario o contraseña incorrectos.');
      res.redirect('/login');
    }
  });
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { usuario, password } = req.body;
  try {
    const passwordEncriptada = await bcrypt.hash(password, 10);
    
    db.run('INSERT INTO administradores (usuario, password) VALUES (?, ?)', [usuario, passwordEncriptada], (err) => {
      if (err) {
        req.flash('loginError', 'El nombre de usuario ya está registrado.');
        return res.redirect('/register');
      }
      req.flash('loginError', 'Cuenta creada con éxito. Ya puedes ingresar.');
      res.redirect('/login');
    });
  } catch {
    res.status(500).send('Error interno del sistema.');
  }
});

app.get('/logout', (req, res) => {
  res.clearCookie('token_acceso');
  res.redirect('/login');
});

// --- RUTA: READ CON PAGINACIÓN (Protegida) ---
app.get('/', verificarTokenJWT, (req, res) => {
  const limite = 3;
  let paginaActual = parseInt(req.query.pagina) || 1;
  if (paginaActual < 1) paginaActual = 1;
  const offset = (paginaActual - 1) * limite;

  db.get('SELECT COUNT(*) AS total FROM usuarios', [], (err, resultadoConteo) => {
    if (err) return res.status(500).send(err.message);
    const totalPaginas = Math.ceil(resultadoConteo.total / limite) || 1;

    db.all('SELECT * FROM usuarios LIMIT ? OFFSET ?', [limite, offset], (err, filas) => {
      if (err) return res.status(500).send(err.message);
      res.render('index', { usuarios: filas, paginaActual: paginaActual, totalPaginas: totalPaginas });
    });
  });
});

// --- RUTA: CREATE (Protegida) ---
app.post('/create', verificarTokenJWT, (req, res) => {
  const { nombre, correo, edad } = req.body;
  db.run('INSERT INTO usuarios (nombre, correo, edad) VALUES (?, ?, ?)', [nombre, correo, parseInt(edad)], () => res.redirect('/'));
});

// --- RUTA: UPDATE (Protegida) ---
app.post('/update', verificarTokenJWT, (req, res) => {
  const { id, nombre, correo, edad } = req.body;
  db.run('UPDATE usuarios SET nombre = ?, correo = ?, edad = ? WHERE id = ?', [nombre, correo, parseInt(edad), id], () => res.redirect('/'));
});

// --- RUTA: DELETE (Protegida) ---
app.get('/delete/:id', verificarTokenJWT, (req, res) => {
  db.run('DELETE FROM usuarios WHERE id = ?', [req.params.id], () => res.redirect('/'));
});

app.listen(port, () => console.log(`Servidor seguro corriendo en el puerto ${port}`));
