import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true
    },
    author: {
      type: String,
      default: 'Admin'
    }
  },
  { timestamps: true }
);

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    source: {
      type: String,
      trim: true,
      default: 'Website'
    },
    message: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'converted'],
      default: 'new'
    },
    notes: [noteSchema]
  },
  { timestamps: true }
);

leadSchema.index({ name: 'text', email: 'text', source: 'text', message: 'text' });

export default mongoose.model('Lead', leadSchema);
