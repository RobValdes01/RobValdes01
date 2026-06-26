/* require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose'); // Reemplazamos sqlite3 por Mongoose
*/


/* 
ya que no se conecta a MONGODB
require('dotenv').config({ path: __dirname + '/.env' }); 
const express = require('express');
const mongoose = require('mongoose');
 */
 
 // 1. Forzar la lectura nativa del archivo del disco duro para saltar el bloqueo de la consola
const fs = require('fs');
if (fs.existsSync(__dirname + '/.env')) {
  const envConfig = require('dotenv').parse(fs.readFileSync(__dirname + '/.env'));
  for (const k in envConfig) { process.env[k] = envConfig[k]; }
}
// FORZAR USO DE DNS PÚBLICOS PARA EVITAR COMPORTAMIENTOS EXTRAÑOS DEL PROVEEDOR O NODE V24
const dns = require('dns');
if (dns.setServers) {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

const express = require('express');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const session = require('express-session'); 
const bcrypt = require('bcrypt');           
const jwt = require('jsonwebtoken');       
const cookieParser = require('cookie-parser'); 

// Importamos los nuevos modelos de datos
const Usuario = require('./models/Usuario');
const Admin = require('./models/Admin');

const app = express();
const port = process.env.PORT || 3000;
const CLAVE_SECRETA_JWT = process.env.JWT_SECRET || 'clave_secreta_alternativa';

app.set('view engine', 'ejs');

// MIDDLEWARES DE PROCESAMIENTO
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser()); 

// SOPORTE PARA ALERTAS FLASH
app.use(session({ 
  secret: process.env.SESSION_SECRET || 'clave_secreta_flash', 
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

// --- CONEXIÓN DE MONGOOSE A MONGODB ATLAS (NUBE) ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('¡Conexión exitosa a la nube de MongoDB Atlas!'))
  .catch(err => console.error('Error de conexión a MongoDB:', err.message));

// --- MIDDLEWARE DE SEGURIDAD JWT ---
function verificarTokenJWT(req, res, next) {
  const token = req.cookies.token_acceso;
  if (!token) return res.redirect('/login');

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

app.post('/login', async (req, res) => {
  const { usuario, password } = req.body;
  try {
    const admin = await Admin.findOne({ usuario });
    if (!admin) {
      req.flash('loginError', 'Usuario o contraseña incorrectos.');
      return res.redirect('/login');
    }

    const coinciden = await bcrypt.compare(password, admin.password);
    if (coinciden) {
      const token = jwt.sign({ id: admin._id, nombre: admin.usuario }, CLAVE_SECRETA_JWT, { expiresIn: '1h' });
      res.cookie('token_acceso', token, { maxAge: 3600000, httpOnly: true }); 
      res.redirect('/');
    } else {
      req.flash('loginError', 'Usuario o contraseña incorrectos.');
      return res.redirect('/login');
    }
  } catch {
    res.status(500).send('Error interno del sistema.');
  }
});

app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
  const { usuario, password } = req.body;
  try {
    const passwordEncriptada = await bcrypt.hash(password, 10);
    const nuevoAdmin = new Admin({ usuario, password: passwordEncriptada });
    await nuevoAdmin.save();
    
    req.flash('loginError', 'Cuenta creada con éxito. Ya puedes ingresar.');
    res.redirect('/login');
  } catch (err) {
    req.flash('loginError', 'El nombre de usuario ya está registrado o es inválido.');
    res.redirect('/register');
  }
});

app.get('/logout', (req, res) => {
  res.clearCookie('token_acceso');
  res.redirect('/login');
});

// --- RUTA: READ CON PAGINACIÓN ---
app.get('/', verificarTokenJWT, async (req, res) => {
  const limite = 3;
  let paginaActual = parseInt(req.query.pagina) || 1;
  if (paginaActual < 1) paginaActual = 1;
  
  try {
    const totalUsuarios = await Usuario.countDocuments();
    const totalPaginas = Math.ceil(totalUsuarios / limite) || 1;

    if (paginaActual > totalPaginas) return res.redirect(`/?pagina=${totalPaginas}`);

    const filas = await Usuario.find()
      .skip((paginaActual - 1) * limite)
      .limit(limite);

    res.render('index', { usuarios: filas, paginaActual, totalPaginas });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// --- RUTA: CREATE ---
app.post('/create', verificarTokenJWT, async (req, res) => {
  const { nombre, correo, edad } = req.body;
  try {
    const nuevoUsuario = new Usuario({ nombre, correo, edad: parseInt(edad) });
    await nuevoUsuario.save();
    req.flash('exito', 'Usuario guardado con éxito en la nube!');
    res.redirect('/');
  } catch (err) {
    req.flash('error', 'Error al guardar usuario: ' + err.message);
    res.redirect('/');
  }
});

// --- RUTA: UPDATE ---
app.post('/update', verificarTokenJWT, async (req, res) => {
  const { id, nombre, correo, edad } = req.body;
  try {
    await Usuario.findByIdAndUpdate(id, { nombre, correo, edad: parseInt(edad) });
    req.flash('exito', 'Usuario actualizado correctamente!');
    res.redirect('/');
  } catch (err) {
    req.flash('error', 'Error al actualizar: ' + err.message);
    res.redirect('/');
  }
});

// --- RUTA: DELETE ---
app.get('/delete/:id', verificarTokenJWT, async (req, res) => {
  try {
    await Usuario.findByIdAndDelete(req.params.id);
    req.flash('exito', 'Usuario eliminado correctamente.');
    res.redirect('/');
  } catch (err) {
    req.flash('error', 'Error al eliminar: ' + err.message);
    res.redirect('/');
  }
});

app.listen(port, () => console.log(`Servidor seguro corriendo en el puerto ${port}`));
