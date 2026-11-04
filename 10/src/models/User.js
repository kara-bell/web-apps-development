const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Укажите имя'],
      trim: true,
      minlength: [2, 'Имя должно содержать минимум 2 символа'],
      maxlength: [60, 'Имя должно содержать не больше 60 символов']
    },
    email: {
      type: String,
      required: [true, 'Укажите e-mail'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Некорректный e-mail']
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    }
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function toJSON() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);
