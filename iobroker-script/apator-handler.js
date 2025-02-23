const { exec } = require('child_process')
const https = require("https")
const crypto = require("crypto")

const serviceAccount = {
  "type": "service_account",
  "project_id": "<project-id>",
  "private_key_id": "0000000000000000000000000000000000000000",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "<client-name>@<project-id>.iam.gserviceaccount.com",
  "client_id": "000000000000000000000",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/<client-name>%40<project-id>.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com",
  "api_key": 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
}

const algorithm = 'aes-256-cbc' // Encryption algorithm
const key = Buffer.from('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'base64') // 32-byte encryption key

function encryptData(data, iv) {
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(data, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  return {
    encryptedData: encrypted,
    iv: iv.toString('base64'),
  }
}

// Firebase Realtime Database URL
const databaseURL = "https://<project-id>-default-rtdb.europe-west1.firebasedatabase.app" // Replace with your project ID

// Function to create a Firebase custom token
function createCustomToken(serviceAccount, uid) {
  const header = {
    alg: "RS256",
    typ: "JWT",
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now,
    exp: now + 3600, // Token valid for 1 hour
    uid, // Unique ID for the user
  }

  const base64UrlEncode = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")

  const encodedHeader = base64UrlEncode(header)
  const encodedPayload = base64UrlEncode(payload)

  const signatureInput = `${encodedHeader}.${encodedPayload}`
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(signatureInput)
    .sign(serviceAccount.private_key, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")

  return `${signatureInput}.${signature}`
}

// Function to exchange the custom token for an ID token
function exchangeCustomTokenForIdToken(customToken) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      token: customToken,
      returnSecureToken: true,
    })

    const options = {
      hostname: "identitytoolkit.googleapis.com",
      path: `/v1/accounts:signInWithCustomToken?key=${serviceAccount.api_key}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    }

    const req = https.request(options, (res) => {
      let response = ""

      res.on("data", (chunk) => {
        response += chunk
      })

      res.on("end", () => {
        const parsedResponse = JSON.parse(response)
        if (parsedResponse.idToken) {
          resolve(parsedResponse.idToken)
        } else {
          reject(new Error(parsedResponse.error.message || "Failed to obtain ID token"))
        }
      })
    })

    req.on("error", (error) => reject(error))
    req.write(data)
    req.end()
  })
}

// Function to send data to Firebase Realtime Database
function sendDataToFirebase(idToken, path, data, method) {
  return new Promise((resolve, reject) => {
    const jsonData = JSON.stringify(data)
    const options = {
      hostname: databaseURL.replace("https://", "").replace("/", ""),
      path: `${path}.json?auth=${idToken}`,
      method: method || "POST", // Use POST to append data, or PUT to overwrite
      headers: {
        "Content-Type": "application/json",
        "Content-Length": jsonData.length,
      },
    }

    const req = https.request(options, (res) => {
      let response = ""

      res.on("data", (chunk) => {
        response += chunk
      })

      res.on("end", () => {
        resolve(response)
      })
    })

    req.on("error", (error) => reject(error))
    req.write(jsonData)
    req.end()
  })
}

const sendData = async (input = {}) => {
  try {
    // Step 1: Generate a custom token
    const uid = "unique-user-id" // Replace with a unique identifier for your user
    const customToken = createCustomToken(serviceAccount, uid)

    // Step 2: Exchange the custom token for an ID token
    const idToken = await exchangeCustomTokenForIdToken(customToken)

    // Step 3: Send data to Firebase Realtime Database
    const path = "/measurements"
    const timestamp = new Date().toISOString()
    const data = JSON.stringify({
      ...input,
      timestamp,
    })
    const iv = crypto.randomBytes(16) // Initialization vector (IV)
    const { encryptedData } = encryptData(data, iv)
    await sendDataToFirebase(idToken, `/latest/${input.id}`, {
      timestamp,
      encryptedData,
      iv: iv.toString('base64'),
    }, 'PUT')
    await sendDataToFirebase(idToken, path, {
      timestamp,
      encryptedData,
      iv: iv.toString('base64'),
    }, 'POST')
  } catch (error) {
    console.log(error)
  }
}

const writeData = (object) => {
  const rootState = '0_userdata.0'
  const metersState = rootState + '.data'
  const meters = getState(metersState)
  if (meters.notExist) {
    createState(metersState, {})
  }

  // From wmbus
  const deviceStateName = 'wireless-mbus.0.APA-' + object.id
  const infoStateName = 'wireless-mbus.0.APA-' + object.id + '.info'
  const device = getObject(deviceStateName)
  const info = getObject(infoStateName)

  // Created by this script
  const createdDeviceState = metersState + '.' + object.id
  const createdInfoState = metersState + '.' + object.id + '.info'
  const createdDataState = metersState + '.' + object.id + '.data'

  const createdDevice = getState(createdDeviceState)
  if (createdDevice.notExist) {
    createState(createdDeviceState, {})
  }
  extendObject(createdDeviceState, device)

  const createdInfo = getState(createdInfoState)
  if (createdInfo.notExist) {
    createState(createdInfoState, {})
  }

  const createdData = getState(createdDataState)
  if (createdData.notExist) {
    createState(createdDataState, {})
  }

  for (let i = 0; i < Object.keys(object).length; i++) {
    const key = Object.keys(object)[i]
    const value = Object.values(object)[i]
    const stateName = createdDataState + '.' + key
    const state = getState(stateName)
    if (state.notExist) {
      createState(stateName, value)
    }
    setState(stateName, value)
  }

  setObject(createdDataState, object)
  extendObject(createdInfoState, info)
  sendData({
    meter: object.meter,
    media: object.media,
    id: object.id,
    total_m3: object.total_m3,
    timestamp: object.timestamp,
  })
}

const readData = (hexString) => {
  const driver = 'apator162'
  const key = '00000000000000000000000000000000'
  const command = `wmbusmeters --analyze=${key}:${driver} ${hexString}`
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing wmbusmeters: ${error.message}`)
      return
    }
    if (stderr) {
      console.error(`wmbusmeters error: ${stderr}`)
      return
    }
    const JSONdata = JSON.parse('{' + stdout.split('{')[1].split('}')[0] + '}')
    writeData(JSONdata)
  })
}

on({
  id: 'wireless-mbus.0.info.rawdata',
  change: 'any',
}, function (obj) {
  const hexString = obj.state.val // Value from the data
  readData(hexString)
})

// Test
// const state = getState('wireless-mbus.0.info.rawdata');
// readData(state.val);
