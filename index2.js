const sqlite3 = require('sqlite3').verbose();

// 1. Conectar a la base de datos (creará el archivo 'mi_base.db' automáticamente)
const db = new sqlite3.Database('./mi_base.db', (err) => {
  if (err) {
    return console.error('Error al conectar:', err.message);
  }
  console.log('¡Conectado con éxito a la base de datos SQLite!');
});

// 2. Operaciones de Base de Datos en orden (Serializado)
db.serialize(() => {
  // Crear una tabla de prueba
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
  )`);

  // Insertar un usuario de prueba
  db.run(`INSERT INTO usuarios (nombre) VALUES ('Rob')`);

  // Consultar y mostrar los datos en la consola
  db.all(`SELECT * FROM usuarios`, [], (err, filas) => {
    if (err) {
      throw err;
    }
    console.log('--- Datos en la Base de Datos ---');
    filas.forEach((fila) => {
      console.log(`ID: ${fila.id} | Nombre: ${fila.nombre}`);
    });
  });
});

// 3. Cerrar la conexión al terminar
db.close();
