const express = require('express')
const router = express.Router()
const Author = require('../models/author')
const { ensureAuth, ensureGuest } = require('../middleware/auth')
const Book = require('../models/book')

const asyncHandler = require('../middleware/asyncHandler')
const authorController = require('../controller/author')

// @desc All Authors
// @route GET /authors/
router.get('/', asyncHandler(authorController.getAuthors))

// @desc New Authors
// @route GET /authors/new
router.get('/new', ensureAuth, asyncHandler(authorController.newAuthor))

// @desc Create Authors
// @route POST /authors/
router.post('/', ensureAuth, asyncHandler(authorController.createNewAuthor))

// @desc Show Author
// @route GET /authors/:id
router.get('/:id', asyncHandler(authorController.showAuthor))

// @desc Edit Author
// @route GET /authors/:id/edit
router.get('/:id/edit', ensureAuth, asyncHandler(authorController.editAuthor))

// @desc Update Author
// @route PUT /authors/:id
router.put('/:id', ensureAuth, asyncHandler(authorController.updateAuthor))

// @desc Delete Author
// @route DELETE /authors/:id/
router.delete('/:id', ensureAuth, asyncHandler(authorController.deleteAuthor))

module.exports = router