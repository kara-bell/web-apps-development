const userRepository = require('../data/userRepository');

async function list() {
  return userRepository.findAllPublic();
}

module.exports = { list };
