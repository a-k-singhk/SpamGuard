import mongoose, { Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    phone: {
      type: String,
      unique: true,
      required: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true  // Optional field, but still unique if provided
    },
    password: {
      type: String,
      required: [true, 'Password is required']
    },
    contacts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Contact' // Link to Contact schema to reference contacts
      }
    ],
    refreshToken: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Pre-save middleware to hash the password before saving the user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Instance method to check if the entered password is correct
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method to generate an access token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      name: this.name
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1h' // Default to 1 hour if not specified
    }
  );
};

// Method to generate a refresh token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' // Default to 7 days if not specified
    }
  );
};

// Indexes for optimizing query performance
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ name: 1 });

export const User = mongoose.model('User', userSchema);

