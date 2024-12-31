const express = require('express')
const router = express.Router()
const { ensureAuth, ensureGuest } = require('../middleware/auth')
const Book = require('../models/book')
const Author = require('../models/author')

const dashboardController = require('../controller/dashboard')
const booksController = require('../controller/books')
const authorController = require('../controller/author')

// @desc Dashboard
// @route GET /dashboard
router.get('/', ensureAuth, dashboardController.getIndex)

module.exports = router