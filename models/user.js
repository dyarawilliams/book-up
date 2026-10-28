const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const UserSchema = new mongoose.Schema({
    googleId: {
        type: String
    },
    firstName: {
        type: String
    },
    lastName: {
        type: String
    },
    userName: {
        type: String, 
        unique: true,
        required: true,
    },
    email: {
        type: String, 
        unique: true
    },
    password: String,
    image: {
        type: String, // For the profile photo
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

// Password hash middleware.

UserSchema.pre('save', async function save() {
    const user = this
    if (!user.isModified('password')) return
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(user.password, salt)
})

// Helper method for validating user's password.

UserSchema.methods.comparePassword = function comparePassword(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
        cb(err, isMatch)
    })
}

module.exports = mongoose.model('User', UserSchema)