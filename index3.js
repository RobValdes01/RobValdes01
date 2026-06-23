const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

// Configurar Express para procesar datos de formularios y JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Conectar a SQLite y crear la tabla si no existe
const db = new sqlite3.Database('./mi_base.db', (err) => {
  if (err) console.error(err.message);
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
  )`);
});

// --- VISTA PRINCIPAL (READ + INTERFAZ HTML) ---
app.get('/', (req, res) => {
  db.all('SELECT * FROM usuarios', [], (err, filas) => {
    if (err) return res.status(500).send(err.message);

    // Generar las filas de la tabla de forma dinámica
    let filasHtml = filas.map(f => `
      <tr>
        <td>${f.id}</td>
        <td>${f.nombre}</td>
        <td>
          <button onclick="editarUser(${f.id}, '${f.nombre}')">Editar</button>
          <a href="/delete/${f.id}" style="color:red; margin-left:10px;" onclick="return confirm('¿Eliminar?')">Eliminar</a>
        </td>
      </tr>
    `).join('');

    // HTML de la interfaz
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CRUD Node + SQLite</title>
        <style>
          body { font-family: sans-serif; margin: 40px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f4f4f4; }
          form { margin-bottom: 20px; background: #fafafa; padding: 15px; border: 1px solid #eee; }
        </style>
      </head>
      <body>
        <h2>CRUD de Usuarios</h2>
        
        <!-- Formulario dual (Crear / Editar) -->
        <form id="formulario" action="/create" method="POST">
          <input type="hidden" id="userId" name="id">
          <label id="formLabel">Agregar Nuevo Usuario:</label><br><br>
          <input type="text" id="userNombre" name="nombre" placeholder="Escribe un nombre" required autocomplete="off">
          <button type="submit" id="btnSubmit">Guardar</button>
          <button type="button" id="btnCancelar" style="display:none;" onclick="cancelarEdicion()">Cancelar</button>
        </form>

        <table>
          <tr><th>ID</th><th>Nombre</th><th>Acciones</th></tr>
          ${filasHtml || '<tr><td colspan="3">No hay usuarios registrados</td></tr>'}
        </table>

        <script>
          function editarUser(id, nombre) {
            document.getElementById('formulario').action = '/update';
            document.getElementById('userId').value = id;
            document.getElementById('userNombre').value = nombre;
            document.getElementById('formLabel').innerText = 'Editar Usuario (ID: ' + id + '):';
            document.getElementById('btnSubmit').innerText = 'Actualizar';
            document.getElementById('btnCancelar').style.display = 'inline-block';
          }
          function cancelarEdicion() {
            document.getElementById('formulario').action = '/create';
            document.getElementById('userId').value = '';
            document.getElementById('userNombre').value = '';
            document.getElementById('formLabel').innerText = 'Agregar Nuevo Usuario:';
            document.getElementById('btnSubmit').innerText = 'Guardar';
            document.getElementById('btnCancelar').style.display = 'none';
          }
        </script>
      </body>
      </html>
    `);
  });
});

// --- OPERACIÓN: CREATE ---
app.post('/create', (req, res) => {
  const { nombre } = req.body;
  db.run('INSERT INTO usuarios (nombre) VALUES (?)', [nombre], (err) => {
    if (err) return res.status(500).send(err.message);
    res.redirect('/');
  });
});

// --- OPERACIÓN: UPDATE ---
app.post('/update', (req, res) => {
  const { id, nombre } = req.body;
  db.run('UPDATE usuarios SET nombre = ? WHERE id = ?', [nombre, id], (err) => {
    if (err) return res.status(500).send(err.message);
    res.redirect('/');
  });
});

// --- OPERACIÓN: DELETE ---
app.get('/delete/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM usuarios WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).send(err.message);
    res.redirect('/');
  });
});

// Iniciar Servidor
app.listen(port, () => {
  console.log(`Servidor CRUD corriendo en http://localhost:${port}`);
});
