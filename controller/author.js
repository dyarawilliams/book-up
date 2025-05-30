const Book = require('../models/book')
const Author = require('../models/author')
const User = require('../models/user')

module.exports = {
    getAuthors: async (req, res) => {
        let searchOptions = {}
        if (req.query.name != null && req.query.name != '') {
            searchOptions.name = new RegExp(req.query.name, 'i')
        }
        try {
            const authors = await Author.find(searchOptions)
            res.render('authors/index', {
                title: 'All Authors',
                isAuth: req.isAuthenticated(),
                authors: authors,
                searchOptions: req.query,
            })
        } catch (err) {
            console.error(err)
            res.redirect('/')
        }
    },
    newAuthor: (req, res) => {
        res.render('authors/new', { 
            title: 'Add New Author',
            layout: 'layouts/dashboard',
            user: req.user,
            isAuth: req.isAuthenticated(),
            author: new Author(),
        })
    },
    createNewAuthor: async (req, res) => {
        const author = new Author({
            name: req.body.name
        })
        try {
            const newAuthor = await author.save()
            res.redirect(`authors/${newAuthor.id}`)
        } catch (err) {
            res.render('authors/new', {
                title: 'Add New Author',
                layout: 'layouts/dashboard',
                author: author,
                errorMessage: 'Error creating Author'
            })
            console.error(err)
        }
    },
    showAuthor: async (req, res) => {
        try {
            const author = await Author.findById(req.params.id)
            const books = await Book.find({ author: author.id }).limit(6).exec()
            res.render('authors/show', {
                title: `${author.name}`,
                layout: 'layouts/layout',
                isAuth: req.isAuthenticated(),
                author: author,
                booksByAuthor: books,
            })
        } catch (err) {
            console.log(err)
            res.redirect('/')
        }
    },
    editAuthor: async (req, res) => {
        try {
            // finds author by Id if it exists 
            const author = await Author.findById(req.params.id)
            res.render('authors/edit', { 
                title: 'Edit Author',
                layout: 'layouts/dashboard',
                author: author,
                isAuth: req.isAuthenticated()
            })
        } catch (err) {
            // Redirects user back to authors index page 
            res.redirect('/authors')
        }
    },
    updateAuthor: async (req, res) => {
        let author
        try {
            author = await Author.findById(req.params.id)
            author.name = req.body.name
            await author.save()
            res.redirect(`/authors/${author.id}`)
        } catch (err) {
            if(author == null) {
                res.redirect('/')
            } else {
                res.render('authors/edit', {
                    layout: 'layouts/dashboard',
                    author: author,
                    errorMessage: 'Error updating Author'
                })
            }
        }
    },
    deleteAuthor: async (req, res) => {
        try {
            const author = await Author.findById(req.params.id)
            if (!author) {
                return res.redirect('/authors')
            }
            // Checks for books before deleting author
            const books = await Book.find({ author: author._id }).limit(1)
            // If books exist, render the author's show page with a error message
            if (books.length > 0) {
                // Author has books, show error message
                return res.render('authors/show', {
                    title: `${author.name}`,
                    layout: 'layouts/layout',
                    isAuth: req.isAuthenticated(),
                    author: author,
                    booksByAuthor: await Book.find({ author: author._id }).limit(6),
                    errorMessage: 'This author has books still'
                })
            }
            // If no books, delete the author directly
            await Author.deleteOne({ _id: author._id })
            res.redirect('/authors')
        } catch (err) {
            console.error(err)
            res.redirect('/')
        }
    }

}