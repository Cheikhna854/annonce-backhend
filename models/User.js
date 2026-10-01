// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    motDePasse: { type: String, required: true, select: false },
    resetCodeHash: { type: String, select: false },
    resetCodeExpiresAt: { type: Date, select: false },
    resetCodeAttempts: { type: Number, select: false, default: 0 },
    resetCodeSentAt: { type: Date, select: false },
    telephone: { type: String },
    photo: { type: String, default: '' },
    role: { type: String, enum: ['client', 'prestataire', 'admin'], default: 'client' },
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    favoris: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Annonce' }],
  },
  { timestamps: true }
);

// Hook Mongoose corrigé pour les fonctions async
userSchema.pre('save', async function () {
  if (!this.isModified('motDePasse')) return;
  const salt = await bcrypt.genSalt(10);
  this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
});

userSchema.methods.comparePassword = function (motDePasse) {
  if (!this.motDePasse) return Promise.resolve(false);
  return bcrypt.compare(motDePasse, this.motDePasse);
};

module.exports = mongoose.model('User', userSchema);
