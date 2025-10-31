const Author = require('../models/author')
const Book = require('../models/book')
const User = require('../models/user')
const genres = require('../config/genres')

module.exports = {
    getIndex: async (req, res) => {
        try {
            const { genre: selectedGenre, genreSort } = req.query

            const bookFilter = {}
            if (selectedGenre) {
                bookFilter.genre = selectedGenre
            }

            let sortOrder = { createdAt: -1 }
            if (genreSort === 'asc') {
                sortOrder = { genre: 1, title: 1 }
            } else if (genreSort === 'desc') {
                sortOrder = { genre: -1, title: 1 }
            }

            const bookQuery = Book.find(bookFilter).sort(sortOrder).populate('author')

            const [books, booksCount, authorsCount, distinctGenres] = await Promise.all([
                bookQuery.exec(),
                Book.countDocuments({}).exec(),
                Author.countDocuments({}).exec(),
                Book.distinct('genre')
            ])

            if (!req.isAuthenticated()) {
                return res.redirect('/login');
            }

            // Fetch the user that is authenticated in the passport session
            // This assumes that the user is stored in the session by Passport.js
            const user = req.user
            console.log(user)

            const activities = [
                'Added "New Book 1"',
                'Updated author details for "Author 2"',
                'Deleted "Old Book"',
            ];

            const genreOptions = Array.from(new Set([
                ...genres,
                ...distinctGenres.filter(Boolean)
            ])).sort((a, b) => a.localeCompare(b))

            res.render('dashboard', { 
                title: 'Dashboard', 
                layout: 'layouts/dashboard', 
                isAuth: req.isAuthenticated(),
                user: user,
                books: books,
                booksCount: booksCount,
                authorsCount: authorsCount,
                activities,
                genres: genreOptions,
                selectedGenre,
                genreSort
            })
        } catch (err) {
            console.error(err)
        }
    }
}
