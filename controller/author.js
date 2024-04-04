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
            res.redirect('/')
            console.log(err)
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
                author: author,
                errorMessage: 'Error creating Author'
            })
            console.log(err)
        }
    },
    showAuthor: async (req, res) => {
        try {
            const author = await Author.findById(req.params.id)
            const books = await Book.find({ author: author.id }).limit(6).exec()
            res.render('authors/show', {
                title: `${author.name}`,
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
                author: author,
                isAuth: req.isAuthenticated()
            })
        } catch (err) {
            console.log(err)
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
                author: author,
                errorMessage: 'Error updating Author'
                })
            }
        }
    },
    deleteAuthor: async (req, res) => {
        let author
        try {
            author = await Author.findById(req.params.id)
            await author.deleteOne()
            res.redirect('/authors')
        } catch (err) {
            if(author == null) {
                res.redirect('/')
            } else {
                res.redirect(`/authors/${author.id}`)
            }
        }
        // res.send('Delete Author ' + req.params.id)
    }

}