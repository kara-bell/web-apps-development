const mongoose = require('mongoose');

const PRIORITIES = ['high', 'medium', 'low'];
const STATUSES = ['draft', 'in_progress', 'ready'];

const testCaseSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Укажите название'],
      trim: true,
      minlength: [3, 'Название должно содержать минимум 3 символа'],
      maxlength: [120, 'Название должно содержать не больше 120 символов']
    },
    module: {
      type: String,
      required: [true, 'Укажите модуль'],
      trim: true,
      minlength: [2, 'Модуль должен содержать минимум 2 символа'],
      maxlength: [60, 'Модуль должен содержать не больше 60 символов']
    },
    priority: {
      type: String,
      required: true,
      enum: { values: PRIORITIES, message: 'Недопустимый приоритет' }
    },
    status: {
      type: String,
      required: true,
      enum: { values: STATUSES, message: 'Недопустимый статус' },
      default: 'draft'
    },
    steps: {
      type: String,
      required: [true, 'Опишите шаги сценария'],
      trim: true,
      minlength: [5, 'Шаги должны содержать минимум 5 символов'],
      maxlength: [2000, 'Шаги должны содержать не больше 2000 символов']
    }
  },
  { timestamps: true }
);

testCaseSchema.index({ owner: 1, updatedAt: -1 });

testCaseSchema.methods.toJSON = function toJSON() {
  const testCase = this.toObject();
  delete testCase.__v;
  return testCase;
};

const TestCase = mongoose.model('TestCase', testCaseSchema);

module.exports = TestCase;
module.exports.PRIORITIES = PRIORITIES;
module.exports.STATUSES = STATUSES;
