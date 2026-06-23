const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

// Configurar motor de plantillas EJS
app.set('view engine', 'ejs');

// Middlewares para procesar datos
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Expone la carpeta interna de Bootstrap de node_modules como si fuera una carpeta pública
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));

// Conectar a SQLite y migrar/crear la tabla con nuevos campos
const db = new sqlite3.Database('./mi_base.db', (err) => {
  if (err) console.error(err.message);
  
  // Creamos la tabla con las columnas adicionales si no existe
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL,
    edad INTEGER NOT NULL
  )`);
});

// --- RUTA: READ (Renderiza la vista EJS) ---
app.get('/', (req, res) => {
  db.all('SELECT * FROM usuarios', [], (err, filas) => {
    if (err) return res.status(500).send(err.message);
    // Enviamos el array de usuarios directamente a la plantilla views/index.ejs
    res.render('index', { usuarios: filas });
  });
});

// --- RUTA: CREATE (Con validaciones de servidor) ---
app.post('/create', (req, res) => {
  const { nombre, correo, edad } = req.body;
  
  // Validación básica del lado del servidor
  if (!nombre || !correo || !edad || isNaN(edad)) {
    return res.status(400).send('Datos enviados incorrectos o incompletos.');
  }

  db.run('INSERT INTO usuarios (nombre, correo, edad) VALUES (?, ?, ?)', [nombre, correo, parseInt(edad)], (err) => {
    if (err) return res.status(500).send(err.message);
    res.redirect('/');
  });
});

// --- RUTA: UPDATE ---
app.post('/update', (req, res) => {
  const { id, nombre, correo, edad } = req.body;
  
  db.run('UPDATE usuarios SET nombre = ?, correo = ?, edad = ? WHERE id = ?', [nombre, correo, parseInt(edad), id], (err) => {
    if (err) return res.status(500).send(err.message);
    res.redirect('/');
  });
});

// --- RUTA: DELETE ---
app.get('/delete/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM usuarios WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).send(err.message);
    res.redirect('/');
  });
});

app.listen(port, () => {
  console.log(`Servidor CRUD Profesional corriendo en http://localhost:${port}`);
});
