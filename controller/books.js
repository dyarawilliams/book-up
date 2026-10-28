const mongoose = require('mongoose')
const Author = require('../models/author')
const Book = require('../models/book')
const genres = require('../config/genres')
const {
    COVER_CACHE_CONTROL,
    imageMimeTypes,
    normalizeMime,
    isSafeImageMime,
    asBuffer,
    strongEtag,
    encodeCover,
} = require('../lib/coverImage')

module.exports = {
    getBooks: async (req, res) => {
        let query = Book.find().withoutCoverImage().populate('author')
        if (req.query.title != null && req.query.title != '') {
            query = query.regex('title', new RegExp(req.query.title, 'i'))
        }
        // Publish Before filter
        if (req.query.publishedBefore != null && req.query.publishedBefore != '') {
            query = query.lte('publishDate', req.query.publishedBefore)
        }
        // Publish After filter
        if (req.query.publishedAfter != null && req.query.publishedAfter != '') {
            query = query.gte('publishDate', req.query.publishedAfter)
        }
        try {
            const books = await query.exec()
            // handle cases where the author might be null
            const booksWithAuthors = books.map(book => {
                if (book.author) {
                    return book
                } else {
                    book.author = { name: 'Unknown Author' }
                    return book
                }
            })
            return res.render('books/index', {
                layout: 'layouts/layout',
                title: 'All Books',
                user: req.user,
                books: booksWithAuthors,
                searchOptions: req.query,
                isAuth: req.isAuthenticated()
            })
        } catch (err) {
            console.error(err)
            return res.redirect('/')
        }
    },
    showBook: async (req, res) => {
        try {
            const book = await Book.findById(req.params.id).withoutCoverImage().populate('author').exec()
            if (!book) {
                return res.redirect('/books')
            }
            return res.render('books/show', {
                title: 'Show Book',
                user: req.user,
                book: book,
                isAuth: req.isAuthenticated(),
            })
        } catch (err) {
            console.error(err)
            return res.redirect('/')
        }
    },
    createBook: async (req, res) => {
        const book = new Book({
            isbn: req.body.isbn,
            title: req.body.title,
            description: req.body.description,
            genre: req.body.genre || 'Other',
            publishDate: new Date(req.body.publishDate),
            pageCount: req.body.pageCount,
            author: req.body.author
        })

        try {
            await saveCover(book, req.body.cover)
            const newBook = await book.save()
            return res.redirect(`/books/${newBook.id}`)
        } catch (err) {
            console.error(err)
            return renderNewPage(req, res, book, true)
        }
    },
    updateBook: async (req, res) => {
        let book
        try {
            book = await Book.findById(req.params.id).withoutCoverImage()
            if (!book) {
                return res.redirect('/books')
            }
            book.title = req.body.title
            book.author = req.body.author
            book.isbn = req.body.isbn
            book.publishDate = new Date(req.body.publishDate)
            book.pageCount = req.body.pageCount
            book.description = req.body.description
            book.genre = req.body.genre || 'Other'
            // Checks to see if cover exist and not an empty string
            if (req.body.cover != null && req.body.cover !== '') {
                await saveCover(book, req.body.cover)
            }
            await book.save({ validateModifiedOnly: true })
            return res.redirect(`/books/${book.id}`)
        } catch (err) {
            console.error(err)
            if (book != null) {
                return renderEditPage(req, res, book, true)
            }
            return res.redirect('/books')
        }
    },
    deleteBook: async (req, res) => {
        let book
        try {
            book = await Book.findById(req.params.id).withoutCoverImage().populate('author')
            if (!book) {
                return res.redirect('/books')
            }
            await book.deleteOne()
            return res.redirect('/books')
        } catch (err) {
            console.error(err)
            if (book == null) {
                return res.redirect('/books')
            }
            return res.render('books/show', {
                book: book,
                errorMessage: 'Could not remove book',
                title: 'Error Page',
                user: req.user,
                isAuth: req.isAuthenticated(),
            })
        }
    },
    renderNewPage,
    renderEditPage,
    getCover,
}

async function getCover(req, res) {
    const id = req.params.id
    if (!mongoose.Types.ObjectId.isValid(id) || String(id).length !== 24) {
        return res.status(404).end()
    }

    const book = await Book.findById(id).select('coverImage coverImageType updatedAt')
    const buffer = book ? asBuffer(book.coverImage) : null
    const mime = book ? normalizeMime(book.coverImageType) : ''
    if (!book || !buffer || buffer.length === 0 || !isSafeImageMime(mime)) {
        return res.status(404).end()
    }

    res.set('Content-Type', mime)
    res.set('Cache-Control', COVER_CACHE_CONTROL)
    res.set('ETag', strongEtag(buffer))
    res.set('X-Content-Type-Options', 'nosniff')
    if (book.updatedAt instanceof Date && !Number.isNaN(book.updatedAt.getTime())) {
        res.set('Last-Modified', book.updatedAt.toUTCString())
    }

    if (req.fresh) {
        return res.status(304).end()
    }
    return res.send(buffer)
}

async function renderNewPage(req, res, book, hasError = false) {
    await renderFormPage(req, res, book, 'new', hasError)
}

async function renderEditPage(req, res, book, hasError = false) {
    await renderFormPage(req, res, book, 'edit', hasError)
}

async function renderFormPage(req, res, book, form, hasError = false) {
    try {
        const authors = await Author.find({})
        const params = {
            layout: 'layouts/dashboard',
            authors: authors,
            book: book,
            genres,
            requireCover: form === 'new',
            loadUploader: true,
            title: 'Form Page',
            user: req.user,
            isAuth: req.isAuthenticated()
        }
        if (hasError) {
            params.errorMessage = form === 'edit' ? 'Error Updating Book' : 'Error Creating Book'
        }
        return res.render(`books/${form}`, params)
    } catch (err) {
        console.error(err)
        return res.redirect('/books')
    }
}

async function saveCover(book, coverEncoded) {
    if (typeof coverEncoded !== 'string' || coverEncoded.trim().charAt(0) !== '{') return
    let cover
    try {
        cover = JSON.parse(coverEncoded)
    } catch (err) {
        console.error(err)
        return
    }
    const mime = normalizeMime(cover && cover.type)
    if (cover == null || !imageMimeTypes.includes(mime) || !cover.data) return
    const encoded = await encodeCover(Buffer.from(cover.data, 'base64'), mime)
    book.coverImage = encoded.buffer
    book.coverImageType = encoded.mime
}
