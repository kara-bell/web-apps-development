const express = require('express');

const { User, ROLES } = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const {
  upload,
  removeFile,
  removeAvatarFile,
} = require('../middleware/upload');

const router = express.Router();

function collectProfileUpdates(body = {}) {
  const updates = {};
  const errors = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (name.length < 2 || name.length > 60) {
      errors.name = 'Имя должно содержать от 2 до 60 символов';
    } else {
      updates.name = name;
    }
  }

  if (body.role !== undefined) {
    if (!ROLES.includes(body.role)) {
      errors.role = 'Недопустимая роль';
    } else {
      updates.role = body.role;
    }
  }

  if (body.position !== undefined) {
    const position =
      typeof body.position === 'string' ? body.position.trim() : '';

    if (position.length > 80) {
      errors.position = 'Должность должна быть не длиннее 80 символов';
    } else {
      updates.position = position;
    }
  }

  if (body.about !== undefined) {
    const about = typeof body.about === 'string' ? body.about.trim() : '';

    if (about.length > 300) {
      errors.about = 'Описание должно быть не длиннее 300 символов';
    } else {
      updates.about = about;
    }
  }

  return { updates, errors };
}

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toJSON() });
});

router.put('/me', requireAuth, upload.single('avatar'), async (req, res) => {
  const { updates, errors } = collectProfileUpdates(req.body || {});

  if (Object.keys(errors).length > 0) {
    if (req.file) {
      await removeFile(req.file.path);
    }

    return res.status(400).json({
      message: 'Проверьте заполнение полей',
      errors,
    });
  }

  if (Object.keys(updates).length === 0 && !req.file) {
    return res.status(400).json({ message: 'Нет данных для обновления' });
  }

  const oldAvatarUrl = req.user.avatarUrl;

  if (req.file) {
    updates.avatarUrl = `/uploads/${req.file.filename}`;
  }

  let updatedUser;

  try {
    updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });
  } catch (error) {
    if (req.file) {
      await removeFile(req.file.path);
    }

    throw error;
  }

  if (!updatedUser) {
    if (req.file) {
      await removeFile(req.file.path);
    }

    return res.status(404).json({ message: 'Пользователь не найден' });
  }

  if (req.file && oldAvatarUrl) {
    try {
      await removeAvatarFile(oldAvatarUrl);
    } catch (error) {
      console.error('Не удалось удалить старый аватар:', error.message);
    }
  }

  return res.json({ user: updatedUser.toJSON() });
});

router.delete('/me', requireAuth, async (req, res) => {
  const { avatarUrl } = req.user;

  await User.deleteOne({ _id: req.user._id });

  try {
    await removeAvatarFile(avatarUrl);
  } catch (error) {
    console.error('Не удалось удалить аватар:', error.message);
  }

  return res.status(204).end();
});

module.exports = router;
