const express = require('express')
const router = express.Router()
const Book = require('../models/book')
const Author = require('../models/author')
const User = require('../models/user')
const imageMimeTypes = ['image/jpeg', 'image/png', 'images/gif']
const { ensureAuth, ensureGuest } = require('../middleware/auth')

const booksController = require('../controller/books')

// @desc All Books
// @route GET /books/
router.get('/', booksController.getBooks)

// @desc Create Book
// @route POST /books/
// router.post('/', async (req, res) => {
//     const book = new Book({
//         isbn: req.body.isbn,
//         title: req.body.title,
//         author: req.body.author,
//         publishDate: new Date(req.body.publishDate),
//         pageCount: req.body.pageCount,
//         description: req.body.description
//     })
//     saveCover(book, req.body.cover)

//     try {
//         const newBook = await book.save()
//         // res.redirect(`books/${newBook.id}`)
//         res.redirect('books')
//     } catch {
//         renderNewPage(res, book, true)
//     }
// })

// @desc Show Book 
// @route GET /books/:id
router.get('/:id', booksController.showBook)

module.exports = router