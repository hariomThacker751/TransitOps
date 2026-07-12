require('dotenv').config()
const createApp = require('./src/app')

const app = createApp()
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`[TransitOps] API server running on http://localhost:${PORT}`)
})

module.exports = app