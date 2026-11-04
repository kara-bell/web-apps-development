const TestCase = require('../models/TestCase');

async function create(data) {
  return TestCase.create(data);
}

async function findAll(filter = {}) {
  return TestCase.find(filter)
    .populate('owner', 'name')
    .sort({ updatedAt: -1 })
    .exec();
}

async function findById(id) {
  return TestCase.findById(id).exec();
}

async function findByIdDetailed(id) {
  return TestCase.findById(id).populate('owner', 'name').exec();
}

async function updateByIdAndOwner(id, owner, data) {
  return TestCase.findOneAndUpdate(
    { _id: id, owner },
    data,
    { returnDocument: 'after', runValidators: true }
  )
    .populate('owner', 'name')
    .exec();
}

async function deleteByIdAndOwner(id, owner) {
  return TestCase.findOneAndDelete({ _id: id, owner }).exec();
}

async function deleteByOwner(owner) {
  return TestCase.deleteMany({ owner }).exec();
}

async function stats() {
  const [total, draft, inProgress, ready, high] = await Promise.all([
    TestCase.countDocuments({}),
    TestCase.countDocuments({ status: 'draft' }),
    TestCase.countDocuments({ status: 'in_progress' }),
    TestCase.countDocuments({ status: 'ready' }),
    TestCase.countDocuments({ priority: 'high' })
  ]);

  return { total, draft, in_progress: inProgress, ready, high };
}

module.exports = {
  create,
  findAll,
  findById,
  findByIdDetailed,
  updateByIdAndOwner,
  deleteByIdAndOwner,
  deleteByOwner,
  stats
};
