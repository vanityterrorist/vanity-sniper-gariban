const http2 = require("http2")
const https = require("https")
const axios = require("axios")
const fs = require("fs")
const path = require("path")

const configPath = path.join(process.cwd(), "config.json")
const token1 = ""
const password1 = "hairo @kindness_90210"
const serverId = "14124"
const webhookURL = "https://canary.discord.com/api/webhooks/1507882567200935968/v5jMS8O8uxAh83nvgpY4XSCAf11sKY8c59XC6GoqtqJoi-n-YPu__fqxEyH1iChmPKX-" // tokenin logout yiyip yemediğini anlamak için mfa tokeni sliceleyip webhooka gonderıyom

const createHttp2Client = () => {
	return http2.connect("https://canary.discord.com", {
		settings: {
			enablePush: false
		},
		rejectUnauthorized: false
	})
}

function setCommonHeaders(token) {
	return {
		"Authorization": token,
		"User-Agent": "Chrome/124",
		"X-Super-Properties": "eyJicm93c2VyIjoiQ2hyb21lIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiQ2hyb21lIiwiY2xpZW50X2J1aWxkX251bWJlciI6MzU1NjI0fQ==",
		"X-Discord-Timezone": "Europe/Istanbul",
		"X-Discord-Locale": "en-US",
		"X-Debug-Options": "bugReporterEnabled",
		"Content-Type": "application/json"
	}
}

async function getUserInfo(token) {
	try {
		const response = await axios.get("https://discord.com/api/v10/users/@me", {
			headers: {
				Authorization: token
			}
		})
		return response.data.username || "Unknown"
	} catch (e) {
		return "Unknown"
	}
}

async function notifyWebhook(tokenNumber, mfaToken, username) {
	try {
		const trimmedToken = `${mfaToken.substring(0, 8)}...${mfaToken.substring(mfaToken.length - 8)}`
		const content = `mfa${tokenNumber} done \`\`\`${trimmedToken}\`\`\` ${username}`
		await axios.post(webhookURL, { content })
	} catch (error) {

	}
}

function writeMFATokenToFile(mfaToken, tokenNumber) {
	try {
		const filename = `mfa${tokenNumber}.txt`
		fs.writeFileSync(filename, mfaToken, "utf8")
		const now = new Date().toLocaleTimeString("tr-TR")
		console.log(`[MFA${tokenNumber} - ${now}] Alındı: ${mfaToken.substring(0, 8)}...${mfaToken.substring(mfaToken.length - 8)}`)
		return true
	} catch (err) {
		console.error(`MFA${tokenNumber} token dosyaya yazılamadı:`, err)
		return false
	}
}

async function sendMFA(ticket, password, token, tokenNumber) {
	return new Promise((resolve) => {
		const data = JSON.stringify({
			ticket: ticket,
			mfa_type: "password",
			data: password
		})

		const options = {
			hostname: "canary.discord.com",
			port: 443,
			path: "/api/v10/mfa/finish",
			method: "POST",
			headers: {
				Authorization: token,
				"X-Debug-Options": "bugReporterEnabled",
				"X-Discord-Locale": "en-GB",
				"X-Discord-Timezone": "Europe/Istanbul",
				Accept: "*/*",
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.644 Chrome/134.0.6998.205 Electron/35.3.0 Safari/537.36",
				"Content-Type": "application/json",
				"Content-Length": data.length,
				"X-Super-Properties": "eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiRGlzY29yZCBDbGllbnQiLCJyZWxlYXNlX2NoYW5uZWwiOiJjYW5hcnkiLCJjbGllbnRfdmVyc2lvbiI6IjEuMC42NDMiLCJvc192ZXJzaW9uIjoiMTAuMC4xOTA0NSIsIm9zX2FyY2giOiJ4NjQiLCJhcHBfYXJjaCI6Ing2NCIsInN5c3RlbV9sb2NhbGUiOiJ0ciIsImhhc19jbGllbnRfbW9kcyI6ZmFsc2UsImNsaWVudF9sYXVuY2hfaWQiOiI3ZWJlMmI3My1kZTVkLTQ2YjQtOTNiYi0yMTk0NDg1MTRjMzQiLCJicm93c2VyX3VzZXJfYWdlbnQiOiJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBkaXNjb3JkLzEuMC42NDMgQ2hyb21lLzEzNC4wLjY5OTguMjA1IEVsZWN0cm9uLzM1LjMuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMzUuMy4wIiwib3Nfc2RrX3ZlcnNpb24iOiIxOTA0NSIsImNsaWVudF9idWlsZF9udW1iZXIiOjQwMzMyOSwibmF0aXZlX2J1aWxkX251bWJlciI6NjQyMTEsImNsaWVudF9ldmVudF9zb3VyY2UiOm51bGwsImNsaWVudF9oZWFydGJlYXRfc2Vzc2lvbl9pZCI6ImYzODIyMWY0LWE2YzAtNDA2Yi1hOWU1LTgzNjE1MTFhMDU5NiIsImNsaWVudF9hcHBfc3RhdGUiOiJmb2N1c2VkIn0="
			},
			agent: new https.Agent({
				ciphers: [
					"TLS_AES_256_GCM_SHA384",
					"TLS_CHACHA20_POLY1305_SHA256",
					"TLS_AES_128_GCM_SHA256"
				].join(":"),
				honorCipherOrder: true,
				rejectUnauthorized: false
			})
		}

		const req = https.request(options, (res) => {
			const chunks = []

			res.on("data", (chunk) => chunks.push(chunk))

			res.on("end", async () => {
				try {
					const response = JSON.parse(Buffer.concat(chunks).toString() || "{}")

					if (response?.token) {
						writeMFATokenToFile(response.token, tokenNumber)
						console.log(`[Token${tokenNumber}] MFA geçildi`)

						const username = await getUserInfo(token)
						await notifyWebhook(tokenNumber, response.token, username)

						resolve(response.token)
					} else if (response?.code === 60008) {
						console.log(`[Token${tokenNumber}] MFA geçilemedi - Password yanlış`)
						resolve("err")
					} else {
						console.log(`[Token${tokenNumber}] MFA response:`, JSON.stringify(response))
						resolve("err")
					}
				} catch (e) {
					console.log(`[Token${tokenNumber}] MFA response parse hatası:`, e.message)
					resolve("err")
				}
			})
		})

		req.on("error", (error) => {
			console.error(`[Token${tokenNumber}] MFA request hatası:`, error.message)
			resolve("err")
		})

		req.write(data)
		req.end()
	})
}

async function checkAndGetMFA(token, password, tokenNumber) {
	return new Promise((resolve) => {
		const client = createHttp2Client()
		const body = JSON.stringify({ code: "ataturk" })

		const headers = {
			...setCommonHeaders(token),
			":method": "PATCH",
			":path": `/api/v7/guilds/${serverId}/vanity-url`
		}

		const req = client.request(headers)
		req.setEncoding("utf8")

		let responseData = ""
		let resolved = false

		const cleanup = () => {
			if (!resolved) {
				resolved = true
				try {
					client.close()
				} catch (e) { }
			}
		}

		const timeout = setTimeout(() => {
			cleanup()
			console.log(`[Token${tokenNumber}] Timeout - MFA kontrolü tamamlanamadı`)
			resolve(null)
		}, 10000) 

		req.on("response", (responseHeaders) => {
			const status = parseInt(responseHeaders[":status"])

			req.on("data", (chunk) => {
				responseData += chunk
			})

			req.on("end", () => {
				clearTimeout(timeout)
				cleanup()

				if (status === 401) {
					try {
						const v = JSON.parse(responseData)
						if (v.mfa && v.mfa.ticket) {
							console.log(`[Token${tokenNumber}] MFA ticket alındı, MFA gönderiliyor...`)
							sendMFA(v.mfa.ticket, password, token, tokenNumber).then((newToken) => {
								if (newToken && newToken !== "err") {
									resolve(newToken)
								} else {
									console.log(`[Token${tokenNumber}] MFA token alınamadı`)
									resolve(null)
								}
							})
						} else {
							console.log(`[Token${tokenNumber}] MFA ticket bulunamadı (Status: ${status})`)
							resolve(null)
						}
					} catch (e) {
						console.log(`[Token${tokenNumber}] Response parse hatası:`, e.message)
						resolve(null)
					}
				} else {
					console.log(`[Token${tokenNumber}] MFA gerekmiyor (Status: ${status})`)
					resolve(null)
				}
			})
		})

		req.on("error", (err) => {
			clearTimeout(timeout)
			cleanup()
			console.log(`[Token${tokenNumber}] Request hatası:`, err.message)
			resolve(null)
		})

		client.on("error", (err) => {
			clearTimeout(timeout)
			cleanup()
			console.log(`[Token${tokenNumber}] Client hatası:`, err.message)
			resolve(null)
		})

		req.write(body)
		req.end()
	})
}

async function main() {
	console.log("MFA kontrolü başlatılıyor...")

	const result = await checkAndGetMFA(token1, password1, 1)

	console.log("MFA kontrolü tamamlandı.")
	console.log(`Token1 MFA: ${result ? 'Alındı' : 'Alınamadı'}`)

	console.log("5 dakika bekleniyor...")
	setTimeout(() => {
		console.log("Program sonlandırılıyor...")
		process.exit(0)
	}, 300000)
}

main().catch(console.error)

