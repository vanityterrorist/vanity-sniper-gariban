import http2 from "http2";
import WebSocket from "ws";
import fs from "fs"

const CONFIG = {
    host: 'https://canary.discord.com',
    token: "",
    serverID: "", 
    logChannel: "",
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.186 Electron/32.2.7 Safari/537.36', // Bilinmeyen mesaj alırsan superpropsu değiş :))
    superProps: 'eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiRGlzY29yZCBDbGllbnQiLCJyZWxlYXNlX2NoYW5uZWwiOiJwdGIiLCJjbGllbnRfdmVyc2lvbiI6IjEuMC4xMTMwIiwib3NfdmVyc2lvbiI6IjEwLjAuMTkwNDUiLCJvc19hcmNoIjoieDY0IiwiYXBwX2FyY2giOiJ4NjQiLCJzeXN0ZW1fbG9jYWxlIjoidHIiLCJoYXNfY2xpZW50X21vZHMiOmZhbHNlLCJicm93c2VyX3VzZXJfYWdlbnQiOiJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWxlIEdlY2tvKSBkaXNjb3JkLzEuMC4xMTMwIENocm9tZS8xMjguMC42NjEzLjE4NiBFbGVjdHJvbi8zMi4yLjcgU2FmYXJpLzUzNy4zNiIsImJyb3dzZXJfdmVyc2lvbiI6IjMyLjIuNyIsIm9zX3Nka192ZXJzaW9uIjoiMTkwNDUiLCJjbGllbnRfYnVpbGRfbnVtYmVyIjozNjY5NTUsIm5hdGl2ZV9idWlsZF9udW1iZXIiOjU4NDYzLCJjbGllbnRfZXZlbnRfc291cmNlIjpudWxsfQ=='
};

let mfaToken = "";
const targetGuilds = [];
const client = http2.connect(CONFIG.host);

const updateMfa = () => {
    try { mfaToken = fs.readFileSync("mfa.txt", "utf8").trim(); } catch {}
};
updateMfa();
fs.watch("mfa.txt", (e) => e === "change" && updateMfa());

const getHeaders = (method, path) => ({
    ':method': method,
    ':path': path,
    'authorization': CONFIG.token,
    'x-discord-mfa-authorization': mfaToken,
    'user-agent': CONFIG.userAgent,
    'x-super-properties': CONFIG.superProps,
    'content-type': 'application/json',
});

const logToDiscord = (msg) => {
    const req = client.request(getHeaders('POST', `/api/v9/channels/${CONFIG.logChannel}/messages`));
    req.write(JSON.stringify({ content: msg }));
    req.end();
};

const claimVanity = (code) => {
    const body = Buffer.from(JSON.stringify({ code }));
    for (let i = 0; i < 2; i++) {
        const start = process.hrtime.bigint();
        const req = client.request(
            getHeaders('PATCH', `/api/v8/guilds/${CONFIG.serverID}/vanity-url`),
            { weight: 255, exclusive: true }
        );
        req.on('response', (headers) => {
            const took = (Number(process.hrtime.bigint() - start) / 1000000).toFixed(2);
            console.log(`[${code}] ${took}ms | ${headers[':status']}`);
            if (headers[':status'] === '200' || headers[':status'] === '204') {
                logToDiscord(`@everyone ${code} aman şeker oğlan | Took: ${took}ms`);
            }
        });
        req.end(body);
    }
};

const GUILD_UPDATE_STR = '"GUILD_UPDATE"';
const READY_STR = '"READY"';
const OP10_STR = '"op":10';

let heartbeatTimer = null;

const connectWS = () => {
    const ws = new WebSocket("wss://gateway-us-east1-b.discord.gg", { perMessageDeflate: false });

    ws.on('open', () => {
        if (ws._socket) {
            ws._socket.setNoDelay(true);
            ws._socket.setKeepAlive(true, 0);
        }
        ws.send(JSON.stringify({
            op: 2,
            d: {
                token: CONFIG.token,
                intents: 1,
                properties: { os: "Windows", browser: "Chrome", device: "hairo" }
            }
        }));
    });

    ws.on('message', (data) => {
        const str = data.toString();

        if (str.includes(GUILD_UPDATE_STR)) {
            for (let i = 0; i < targetGuilds.length; i++) {
                const tg = targetGuilds[i];
                if (str.includes(tg.idStr1) || str.includes(tg.idStr2)) {
                    claimVanity(tg.vanity);
                    break;
                }
            }
            return;
        }

        if (!str.includes(READY_STR) && !str.includes(OP10_STR)) return;

        const packet = JSON.parse(str);
        const { t, d, op } = packet;

        if (t === "READY") {
            targetGuilds.length = 0;
            for (const g of d.guilds) {
                if (!g.vanity_url_code) continue;
                targetGuilds.push({
                    idStr1: `"id":"${g.id}"`,
                    idStr2: `"guild_id":"${g.id}"`,
                    vanity: g.vanity_url_code,
                });
            }
            console.log("allahulrabbilaleminvecihadi");
            return;
        }

        if (op === 10) {
            if (heartbeatTimer) clearInterval(heartbeatTimer);
            heartbeatTimer = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send('{"op":1,"d":null}');
            }, d.heartbeat_interval);
        }
    });

    ws.on('close', () => setTimeout(connectWS, 500));
    ws.on('error', () => {});
};

setInterval(() => {
    if (!client.destroyed) {
        client.request({ ':method': 'GET', ':path': '/api/v9/users/@me', 'authorization': CONFIG.token }).end();
    } else {
        process.exit();
    }
}, 8000);

client.on('connect', () => {
    for (let i = 0; i < 4; i++) {
        const req = client.request({ ':method': 'GET', ':path': '/api/v9/users/@me', 'authorization': CONFIG.token });
        req.on('data', () => {});
        req.on('error', () => {});
        req.end();
    }
    connectWS();
});
