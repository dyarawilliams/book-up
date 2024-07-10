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

// @desc New Book 
// @route GET /dashboard/books/new
router.get('/books/new', ensureAuth, async (req, res) => {
    renderNewPage(req, res, new Book())
    // res.send('New Book')
})

// @desc Create Book
// @route POST /dashboard/books/
router.post('/books', ensureAuth, booksController.createBook)

// // @desc Show Book 
// // @route GET /dashboard/books/:id
router.get('/books/:id', ensureAuth, booksController.showBook)

// @desc Edit Book 
// @route GET /dashboard/books/:id/edit
router.get('/books/:id/edit', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
        renderEditPage(req, res, book)
    } catch (err) {
        console.error(err)
        res.redirect('/')
    }
})

// @desc Update Book 
// @route PUT /dashboard/books/:id 
router.put('/books/:id', ensureAuth, booksController.updateBook)

// @desc Delete Book 
// @route GET /dashboard/books/:id
router.delete('/books/:id', ensureAuth, booksController.deleteBook)

/* * * * * * * * * * * * * * * *
*
* Author Routes in Dashboard
*
* * * * * * * * * * * * * * * */

// @desc New Author
// @route GET /dashboard/authors/new
router.get('/authors/new', ensureAuth, authorController.newAuthor)

// @desc Create Author
// @route POST /dashboard/authors/
router.post('/authors', ensureAuth, authorController.createNewAuthor)

// @desc Edit Author
// @route GET /dashboard/authors/:id/edit
router.get('/authors/:id/edit', ensureAuth, authorController.editAuthor)

// @desc Update Author
// @route PUT /dashboard/authors/:id
router.put('/authors/:id', ensureAuth, authorController.updateAuthor)

// @desc Delete Author
// @route DELETE /dashboard/authors/:id/
router.delete('/authors/:id', ensureAuth, authorController.deleteAuthor)

// This function is responsible for rendering a page to create a new book.
async function renderNewPage(req, res, book, hasError = false){
    await renderFormPage(req, res, book, 'new', hasError)
}

// This function is responsible for rendering a page to edit an existing book.
async function renderEditPage(req, res, book, hasError = false){
    await renderFormPage(req, res, book, 'edit', hasError)
}

// This function is a general-purpose function to render form pages for creating or editing books.
async function renderFormPage(req, res, book, form, hasError = false){
    try {
        const authors = await Author.find({})
        const params = {
            layout: 'layouts/dashboard',
            authors: authors,
            book: book,
            title: 'Form Page',
            user: req.user,
            isAuth: req.isAuthenticated()
        }
        if(hasError) {
            params.errorMessage = form === 'edit' ? 'Error Updating Book' : 'Error Creating Book';
        }
        res.render(`books/${form}`, params)
    } catch(err) {
        console.error(err)
        res.redirect('/dashboard/books')
    }
}

module.exports = router