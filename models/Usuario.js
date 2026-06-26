const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, minlength: 3 },
  correo: { type: String, required: true, unique: true },
  edad: { type: Number, required: true, min: 1, max: 120 }
});

module.exports = mongoose.model('Usuario', UsuarioSchema);
