const express = require("express")
const axios = require("axios")
const http = require("http")
const https = require("https")

const app = express()
const PORT = process.env.PORT || 3000

async function getStream(id){

    const embed = `https://deportes.ksdjugfsddeports.com/tvporinternet3.php?stream=${id}_`

    const res = await axios.get(embed)

    const html = res.data

    const match = html.match(/atob\(atob\(atob\(atob\("([^"]+)/)

    if(!match) return null

    let url = match[1]

    for(let i=0;i<4;i++){
        url = Buffer.from(url,'base64').toString('utf8')
    }

    return url
}

app.get("/play", async (req,res)=>{

    const id = req.query.id || 5

    const m3u8 = await getStream(id)

    if(!m3u8){
        res.send("stream no encontrado")
        return
    }

    const playlist = await axios.get(m3u8,{
        headers:{
            "Referer":"https://deportes.ksdjugfsddeports.com/",
            "Origin":"https://deportes.ksdjugfsddeports.com",
            "User-Agent":"Mozilla/5.0"
        }
    })

    const base = m3u8.split("/").slice(0,-1).join("/")

    res.setHeader("Content-Type","application/vnd.apple.mpegurl")

    playlist.data.split("\n").forEach(line=>{

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

    if(!url){
        res.send("no url")
        return
    }

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

app.listen(PORT,()=>{
    console.log("server running")
})
