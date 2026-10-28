module.exports = {
    plugins: [
        require('autoprefixer'),
        require('cssnano')({
            preset: ['default', {
                // cssnano rewrites U+0000-00FF inside unicode-range into an invalid range.
                normalizeUnicode: false,
                minifyParams: false,
            }]
        }),
    ]
};
