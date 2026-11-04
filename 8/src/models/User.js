const mongoose = require('mongoose');

const ROLES = ['tester', 'analyst', 'manager'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Укажите имя'],
      trim: true,
      minlength: [2, 'Имя слишком короткое'],
      maxlength: [60, 'Имя слишком длинное'],
    },
    email: {
      type: String,
      required: [true, 'Укажите e-mail'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Некорректный e-mail'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: 'Недопустимая роль',
      },
      default: 'tester',
    },
    position: {
      type: String,
      trim: true,
      maxlength: [80, 'Должность слишком длинная'],
      default: '',
    },
    about: {
      type: String,
      trim: true,
      maxlength: [300, 'Описание слишком длинное'],
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = { User, ROLES };
