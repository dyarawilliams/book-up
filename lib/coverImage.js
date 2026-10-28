const crypto = require('crypto')
const sharp = require('sharp')

const COVER_MAX_WIDTH = 600
const COVER_MAX_HEIGHT = 800
const MAX_COVER_INPUT_BYTES = 8 * 1024 * 1024
const COVER_CACHE_CONTROL = 'public, max-age=31536000'

const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function normalizeMime(type) {
    if (typeof type !== 'string') return ''
    const mime = type.split(';')[0].trim().toLowerCase()
    return mime === 'image/jpg' ? 'image/jpeg' : mime
}

function isSafeImageMime(type) {
    return imageMimeTypes.includes(normalizeMime(type))
}

function asBuffer(value) {
    if (value == null) return null
    if (Buffer.isBuffer(value)) return value
    if (value instanceof Uint8Array) return Buffer.from(value)
    if (typeof value.value === 'function') {
        const out = value.value(true)
        return Buffer.isBuffer(out) ? out : Buffer.from(out)
    }
    return null
}

function strongEtag(buffer) {
    const hash = crypto.createHash('sha1').update(buffer).digest('hex')
    return `"${hash}"`
}

function sharpCover(input) {
    return sharp(input, {
        failOn: 'none',
        limitInputPixels: 40_000_000,
        pages: 1,
        animated: false,
    })
}

async function resizedWebp(input, quality) {
    return sharpCover(input)
        .rotate()
        .resize({
            width: COVER_MAX_WIDTH,
            height: COVER_MAX_HEIGHT,
            fit: 'inside',
            withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer()
}

// New uploads are capped and re-encoded. Bytes already stored are served as-is.
async function encodeCover(input, sourceMime) {
    if (!Buffer.isBuffer(input) || input.length === 0) {
        throw new Error('Cover image is empty')
    }
    if (input.length > MAX_COVER_INPUT_BYTES) {
        throw new Error('Cover image is too large')
    }

    try {
        const meta = await sharpCover(input).metadata()
        const oversized = (meta.width || 0) > COVER_MAX_WIDTH || (meta.height || 0) > COVER_MAX_HEIGHT
        let output = await resizedWebp(input, 80)
        // A high-quality WebP of hard-to-compress pixels can outweigh the upload.
        // Drop quality once before deciding to keep the original bytes.
        if (output.length >= input.length) {
            const smaller = await resizedWebp(input, 60)
            if (smaller.length < output.length) output = smaller
        }
        if (!output || output.length === 0) {
            throw new Error('Cover image could not be encoded')
        }
        const mime = normalizeMime(sourceMime)
        if (!oversized && output.length >= input.length && isSafeImageMime(mime)) {
            return { buffer: input, mime }
        }
        return { buffer: output, mime: 'image/webp' }
    } catch (err) {
        if (err instanceof Error && err.message.startsWith('Cover image')) throw err
        console.error(err)
        throw new Error('Cover image could not be processed')
    }
}

module.exports = {
    COVER_CACHE_CONTROL,
    imageMimeTypes,
    normalizeMime,
    isSafeImageMime,
    asBuffer,
    strongEtag,
    encodeCover,
}
