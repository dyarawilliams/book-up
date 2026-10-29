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

// New uploads are capped and re-encoded. Bytes already stored are served as-is
// until scripts/resize-covers.js rewrites them with this same encoder.
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

function withinCoverBounds(width, height) {
    return width > 0 && height > 0 && width <= COVER_MAX_WIDTH && height <= COVER_MAX_HEIGHT
}

// Stored covers: same bytes encodeCover would write for a new upload, except a
// WebP that already fits is left untouched (a re-encode can be smaller and would
// still bust every cached cover). Also refuse a result that is not smaller.
async function planStoredCover(input, sourceMime) {
    const buffer = asBuffer(input)
    if (!buffer || buffer.length === 0) {
        return { action: 'skip', reason: 'empty', before: buffer ? buffer.length : 0 }
    }

    const mime = normalizeMime(sourceMime)
    if (buffer.length > MAX_COVER_INPUT_BYTES) {
        return {
            action: 'skip',
            reason: 'too-large',
            before: buffer.length,
            mime,
            message: 'Cover image is too large',
        }
    }
    try {
        const meta = await sharpCover(buffer).metadata()
        const width = meta.width || 0
        const height = meta.height || 0
        if (meta.format === 'webp' && mime === 'image/webp' && withinCoverBounds(width, height)) {
            return {
                action: 'skip',
                reason: 'already-webp',
                before: buffer.length,
                after: buffer.length,
                mime,
                width,
                height,
            }
        }

        const encoded = await encodeCover(buffer, mime || sourceMime)
        const after = encoded.buffer.length
        let outWidth = 0
        let outHeight = 0
        if (after < buffer.length) {
            try {
                const outMeta = await sharpCover(encoded.buffer).metadata()
                outWidth = outMeta.width || 0
                outHeight = outMeta.height || 0
            } catch {
                // Dimensions are for the log line. The encoded bytes are still usable.
            }
        }
        if (after >= buffer.length) {
            return {
                action: 'skip',
                reason: 'not-smaller',
                before: buffer.length,
                after,
                mime,
                nextMime: encoded.mime,
                width,
                height,
            }
        }
        return {
            action: 'resize',
            before: buffer.length,
            after,
            mime,
            nextMime: encoded.mime,
            width,
            height,
            outWidth,
            outHeight,
            buffer: encoded.buffer,
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const reason = message === 'Cover image is too large' ? 'too-large' : 'corrupt'
        return {
            action: 'skip',
            reason,
            before: buffer.length,
            mime,
            message,
        }
    }
}

module.exports = {
    COVER_MAX_WIDTH,
    COVER_MAX_HEIGHT,
    MAX_COVER_INPUT_BYTES,
    COVER_CACHE_CONTROL,
    imageMimeTypes,
    normalizeMime,
    isSafeImageMime,
    asBuffer,
    strongEtag,
    encodeCover,
    planStoredCover,
}
