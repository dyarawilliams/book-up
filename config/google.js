function googleAuthConfigured() {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

function googleCallbackURL() {
    return process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
}

async function uniqueUserName(User, seed) {
    const base = String(seed || 'reader').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24) || 'reader'
    let candidate = base
    for (let i = 0; i < 100; i++) {
        const existing = await User.findOne({ userName: candidate })
        if (!existing) return candidate
        candidate = `${base}${i + 1}`
    }
    return `${base}${Date.now()}`
}

module.exports = {
    googleAuthConfigured,
    googleCallbackURL,
    uniqueUserName,
}
