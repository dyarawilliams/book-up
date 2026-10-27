const express = require('express')
const router = express.Router()
const Book = require('../models/book')
const { ensureAuth } = require('../middleware/auth')
const asyncHandler = require('../middleware/asyncHandler')

const booksController = require('../controller/books')

// @desc All Books
// @route GET /books/
router.get('/', asyncHandler(booksController.getBooks))

// @desc New Book
// @route GET /books/new
router.get('/new', ensureAuth, asyncHandler(async (req, res) => {
    await booksController.renderNewPage(req, res, new Book())
}))

// @desc Create Book
// @route POST /books/
router.post('/', ensureAuth, asyncHandler(booksController.createBook))

// @desc Show Book
// @route GET /books/:id
router.get('/:id', asyncHandler(booksController.showBook))

// @desc Edit Book
// @route GET /books/:id/edit
router.get('/:id/edit', asyncHandler(async (req, res) => {
    const book = await Book.findById(req.params.id)
    if (!book) {
        return res.redirect('/books')
    }
    await booksController.renderEditPage(req, res, book)
}))

// @desc Update Book
// @route PUT /books/:id
router.put('/:id', ensureAuth, asyncHandler(booksController.updateBook))

// @desc Delete Book
// @route DELETE /books/:id
router.delete('/:id', ensureAuth, asyncHandler(booksController.deleteBook))

module.exports = router
