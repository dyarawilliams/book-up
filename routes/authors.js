const express = require('express')
const router = express.Router()
const Author = require('../models/author')
const { ensureAuth, ensureGuest } = require('../middleware/auth')
const Book = require('../models/book')

const authorController = require('../controller/author')

// @desc All Authors
// @route GET /authors/
router.get('/', authorController.getAuthors)

// @desc New Authors
// @route GET /authors/new
router.get('/new', ensureAuth, authorController.newAuthor)

// @desc Create Authors
// @route POST /authors/
router.post('/', ensureAuth, authorController.createNewAuthor)

// @desc Show Author
// @route GET /authors/:id
router.get('/:id', authorController.showAuthor)

// @desc Edit Author
// @route GET /authors/:id/edit
router.get('/:id/edit', ensureAuth, authorController.editAuthor)

// @desc Update Author
// @route PUT /authors/:id
router.put('/:id', ensureAuth, authorController.updateAuthor)

// @desc Delete Author
// @route DELETE /authors/:id/
router.delete('/:id', ensureAuth, authorController.deleteAuthor)

module.exports = router