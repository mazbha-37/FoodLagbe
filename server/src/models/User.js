const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const savedAddressSchema = new mongoose.Schema(
  {
    label: { type: String, maxlength: 20 },
    address: String,
    latitude: Number,
    longitude: Number,
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      match: [/^(\+880|0)1[3-9]\d{8}$/, 'Please provide a valid Bangladeshi phone number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'restaurant_owner', 'rider', 'admin'],
      required: [true, 'Role is required'],
    },
    profilePhoto: {
      url: String,
      publicId: String,
    },
    savedAddresses: {
      type: [savedAddressSchema],
      validate: [
        (arr) => arr.length <= 5,
        'You can save at most 5 addresses',
      ],
    },
    lastUsedAddress: {
      address: String,
      latitude: Number,
      longitude: Number,
    },
    refreshTokenHash: { type: String, select: false },
    resetOtp: { type: String, select: false },
    resetOtpExpiry: { type: Date, select: false },
    isSuspended: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: false },
    currentDeliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    riderProfile: {
      nidNumber: String,
      nidPhoto: { url: String, publicId: String },
      vehicleType: { type: String, enum: ['bicycle', 'motorcycle', 'car'] },
      vehicleRegNumber: String,
      vehicleRegPhoto: { url: String, publicId: String },
      applicationStatus: { type: String, enum: ['pending', 'approved', 'rejected'] },
      rejectionReason: String,
    },
  },
  { timestamps: true }
);

// email and phone indexes are already created via unique:true in the schema fields
userSchema.index({ role: 1 });
// Note: 2dsphere index on currentLocation removed — it causes errors for
// rider documents created before the field existed. Geo-queries in
// riderAssignment use application-level haversine instead.

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
