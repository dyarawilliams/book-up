const express = require('express')
const router = express.Router()
const { ensureAuth } = require('../middleware/auth')
const imageMimeTypes = ['image/jpeg', 'image/png', 'images/gif']

const dashboardController = require('../controller/dashboard')
const booksController = require('../controller/books')
const authorController = require('../controller/author')

// @desc Dashboard
// @route GET /dashboard
router.get('/', ensureAuth, dashboardController.getIndex)

// @desc All Books
// @route GET /dashboard/books/
router.get('/books', booksController.getBooks)

// @desc New Book 
// @route GET /dashboard/books/new
router.get('/books/new', ensureAuth, async (req, res) => {
    renderNewPage(req, res, new Book())
    // res.send('New Book')
})

// @desc Create Book
// @route POST /dashboard/books/
router.post('/books', dashboardController.createBook)

// // @desc Show Book 
// // @route GET /dashboard/books/:id
router.get('/books/:id', booksController.showBook)

// @desc Edit Book 
// @route GET /dashboard/books/:id/edit
router.get('/books/:id/edit', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
        renderEditPage(res, book)
    } catch (err) {
        console.error(err)
        res.redirect('/')
    }
})

// @desc Update Book 
// @route PUT /dashboard/books/:id 
router.put('/books/:id', ensureAuth, dashboardController.updateBook)

// @desc Delete Book 
// @route GET /dashboard/books/:id
router.delete('/books/:id', ensureAuth, dashboardController.deleteBook)

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

async function renderNewPage(req, res, book, hasError = false){
    renderFormPage(req, res, book, 'new', hasError)
}

async function renderEditPage(res, book, hasError = false){
    renderFormPage(res, book, 'edit', hasError)
}

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
            if(form === 'edit'){
                params.errorMessage = 'Error Updating Book'
            } else {
                params.errorMessage = 'Error Creating Book'
            }
        }
        res.render(`books/${form}`, params)
    } catch(err) {
        console.error(err)
        res.redirect('/dashboard')
    }
}

function saveCover(book, coverEncoded){
    if (coverEncoded == null || coverEncoded.length < 1) return 
    const cover = JSON.parse(coverEncoded)
    if (cover != null && imageMimeTypes.includes(cover.type)){
        book.coverImage = new Buffer.from(cover.data, 'base64')
        book.coverImageType = cover.type
    }
}
module.exports = router