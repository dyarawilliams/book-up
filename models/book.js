const mongoose = require('mongoose')
const genres = require('../config/genres')

const bookSchema = new mongoose.Schema({
    isbn: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    genre: {
        type: String,
        enum: genres,
        default: 'Other',
        trim: true
    },
    publishDate: {
        type: Date,
        required: true
    },
    pageCount: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    coverImage: {
        type: Buffer,
        required: true
    },
    coverImageType: {
        type: String,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Author'
    }
},  {
    timestamps: true,
})

// URL of GET /books/:id/cover. List queries omit the buffer, so this must not read coverImage.
bookSchema.virtual('coverImagePath').get(function() {
    if (this._id == null || this.coverImageType == null) return undefined
    const updated = this.updatedAt instanceof Date ? this.updatedAt.getTime() : ''
    const version = updated ? `?v=${updated}` : ''
    return `/books/${this._id}/cover${version}`
})

bookSchema.query.withoutCoverImage = function withoutCoverImage() {
    return this.select('-coverImage')
}

module.exports = mongoose.model('Book', bookSchema)
