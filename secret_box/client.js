const sodium = require('sodium-native')
const http = require('http')
const alloc = require('buffer-alloc')
const PORT = 3888
const HOST = 'localhost'

// create a 32 byte length _nearly_ empty buffer that sodium will make into a Public Key
var publicKey = alloc(sodium.crypto_box_PUBLICKEYBYTES)

// create a 32 byte length _nearly_ empty buffer that sodium will make into a Secret Key
var secretKey = alloc(sodium.crypto_box_SECRETKEYBYTES)
var message = process.argv.slice(2).join(' ') || 'Hello WORLD'
var mLen = message.length
var cipher = alloc(sodium.crypto_box_SEALBYTES + mLen)

// make the keys
sodium.crypto_box_keypair(publicKey, secretKey)

var requestKeyOptions = {hostname: HOST, port: PORT, method: 'GET', path: '/pk'}
var sendMessageOptions = {hostname: HOST, port: PORT, method: 'POST', path: '/msg'}

// get the recipients PK:
var req = http.request(requestKeyOptions, (res) => {
  res.on('data', (d) => {
    /** uncomment the 3 lines below to trigger error for invalid key
     * var haxor = Buffer.alloc(32)
     * sodium.randombytes_buf(haxor)
    * let rk = haxor
    */
    let rk = d
    // encrypt the ciphertext with recipient's pk that we got from their server
    sodium.crypto_box_seal(cipher, Buffer.from(message, 'utf8'), rk)

    // post the message (encrypted with their public key!) back to them
    var req1 = http.request(sendMessageOptions, (_res) => {
      _res.on('end', () => {
        console.log('ended')
      })
      _res.on('data', (data) => {
        console.log('message received status: ', data.toString())
      })
    })
    req1.write(cipher)
    req1.end()
  })
})

req.on('err', (e) => { console.error('error: ', e) })
req.end()
