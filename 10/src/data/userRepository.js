const User = require('../models/User');

async function create(data) {
  return User.create(data);
}

async function findByEmail(email, { withPassword = false } = {}) {
  const query = User.findOne({ email: String(email).toLowerCase() });
  if (withPassword) query.select('+passwordHash');
  return query.exec();
}

async function findById(id) {
  return User.findById(id).exec();
}

async function deleteById(id) {
  return User.findByIdAndDelete(id).exec();
}

async function findAllPublic() {
  return User.find({})
    .select('name email createdAt')
    .sort({ name: 1 })
    .lean()
    .exec();
}

module.exports = { create, findByEmail, findById, deleteById, findAllPublic };
