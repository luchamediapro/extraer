const express = require("express")
const axios = require("axios")
const http = require("http")
const https = require("https")

const app = express()
const PORT = process.env.PORT || 3000

let streamCache = {}
let playlistCache = {}

async function getStream(id){

    if(streamCache[id]) return streamCache[id]

    const embed = `https://deportes.ksdjugfsddeports.com/tvporinternet3.php?stream=${id}_`

    const res = await axios.get(embed)

    const html = res.data

    const match = html.match(/atob\(atob\(atob\(atob\("([^"]+)/)

    if(!match) return null

    let url = match[1]

    for(let i=0;i<4;i++){
        url = Buffer.from(url,"base64").toString("utf8")
    }

    streamCache[id] = url

    return url
}

async function getPlaylist(id){

    const now = Date.now()

    if(playlistCache[id] && now - playlistCache[id].time < 5000){
        return playlistCache[id].data
    }

    const stream = await getStream(id)

    const res = await axios.get(stream,{
        headers:{
            "Referer":"https://deportes.ksdjugfsddeports.com/",
            "Origin":"https://deportes.ksdjugfsddeports.com",
            "User-Agent":"Mozilla/5.0"
        }
    })

    playlistCache[id] = {
        data:res.data,
        time:now
    }

    return res.data
}

app.get("/play", async (req,res)=>{

    const id = req.query.id || 5

    const m3u8 = await getStream(id)

    if(!m3u8){
        res.send("stream no encontrado")
        return
    }

    const playlist = await getPlaylist(id)

    const base = m3u8.split("/").slice(0,-1).join("/")

    res.setHeader("Content-Type","application/vnd.apple.mpegurl")

    playlist.split("\n").forEach(line=>{

        if(line.startsWith("#") || line.trim()==""){
            res.write(line+"\n")
            return
        }

        if(!line.startsWith("http")){
            line = base+"/"+line
        }

        res.write(`/segment?url=${encodeURIComponent(line)}\n`)

    })

    res.end()

})

app.get("/segment",(req,res)=>{

    const url = req.query.url

    const client = url.startsWith("https") ? https : http

    client.get(url,{
        headers:{
            "Referer":"https://deportes.ksdjugfsddeports.com/",
            "Origin":"https://deportes.ksdjugfsddeports.com",
            "User-Agent":"Mozilla/5.0"
        }
    },stream=>{

        res.setHeader("Content-Type","video/mp2t")

        stream.pipe(res)

    })

})

app.get("/playlist",(req,res)=>{

    res.setHeader("Content-Type","audio/x-mpegurl")

    let list = "#EXTM3U\n"

    for(let i=1;i<=20;i++){

        list += `#EXTINF:-1,Canal ${i}\n`
        list += `${req.protocol}://${req.get("host")}/play?id=${i}\n`

    }

    res.send(list)

})

app.get("/",(req,res)=>{

res.send(`

<html>

<head>

<script src="https://cdn.jsdelivr.net/npm/clappr"></script>

<style>

body{
background:black;
color:white;
font-family:Arial;
text-align:center;
}

.player{
width:90%;
max-width:900px;
margin:auto;
}

.channels button{
margin:5px;
padding:10px;
font-size:16px;
cursor:pointer;
}

</style>

</head>

<body>

<h2>Panel IPTV</h2>

<div class="player" id="player"></div>

<div class="channels">

<button onclick="play(1)">Canal 1</button>
<button onclick="play(2)">Canal 2</button>
<button onclick="play(3)">Canal 3</button>
<button onclick="play(4)">Canal 4</button>
<button onclick="play(5)">Canal 5</button>

</div>

<script>

var player = new Clappr.Player({
source:"/play?id=1",
parentId:"#player",
autoPlay:true
})

function play(id){
player.load("/play?id="+id)
}

</script>

</body>

</html>

`)

})

app.listen(PORT,()=>{
console.log("server running")
})
