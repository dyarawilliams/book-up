function asyncHandler(fn) {
    return function asyncWrapped(req, res, next) {
        Promise.resolve()
            .then(() => fn(req, res, next))
            .catch(next)
    }
}

module.exports = asyncHandler
