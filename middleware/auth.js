module.exports = {
    ensureAuth: function (req, res, next) {
        // if user is authenticated then redirect to the next page else back to the login page
        if(req.isAuthenticated()) {
            return next()
        } else {
            res.redirect('/')
        }
    },
    // if user is authenticated and going to login page then redirect to home page else back to the login page
    ensureGuest: function (req, res, next) {
        if(req.isAuthenticated()) {
            res.redirect('/dashboard')
        } else {
            return next()
        }
    }
}