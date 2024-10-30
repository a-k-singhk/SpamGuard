import mongoose, { Schema } from 'mongoose';
// import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const contactSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true  // Indexed for faster search and query
    },
    spam: {
      type: Boolean,
      default: false
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true  // Each contact should be associated with a registered user
    }
  },
  {
    timestamps: true
  }
);

// Optional pagination plugin (uncomment if needed in the future)
// contactSchema.plugin(mongooseAggregatePaginate);

// Ensure that the phone number is unique for each user but can appear in different contact lists
contactSchema.index({ phone: 1, owner: 1 }, { unique: true });

export const Contact = mongoose.model('Contact', contactSchema);
