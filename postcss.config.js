const purgecss = require('@fullhuman/postcss-purgecss');

module.exports = {
    plugins: [
        require('autoprefixer'),
        ...(process.env.NODE_ENV === 'production' ? [
            purgecss({
                content: [
                    './views/**/*.ejs',
                    './public/js/**/*.js'
                ],
                defaultExtractor: content => content.match(/[\w-/:]+(?=\s|[})])/g) || []
            }),
        ] : []),
        require('postcss-short'),
        require('cssnano')({ 
            preset: 'default' 
        }),
    ]
};