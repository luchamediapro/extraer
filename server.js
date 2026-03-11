const express = require("express")
const axios = require("axios")
const http = require("http")
const https = require("https")

const app = express()
const PORT = process.env.PORT || 3000

async function getStreamFromCanal(canal,target){

    try{

        const embed = `https://regionales.saohgdasregions.fun/stream.php?canal=${canal}&target=${target}`

        const res = await axios.get(embed,{timeout:10000})

        const html = res.data

        const match = html.match(/(https?:\/\/[^"' ]+\.m3u8[^"' ]*)/)

        if(!match) return null

        return match[1]

    }catch(e){
        return null
    }

}

async function decodeEmbed(url){

    const res = await axios.get(url,{timeout:10000})

    const html = res.data

    const match = html.match(/atob\(atob\(atob\(atob\("([^"]+)/)

    if(!match) return null

    let stream = match[1]

    for(let i=0;i<4;i++){
        stream = Buffer.from(stream,'base64').toString('utf8')
    }

    return stream
}

async function getRegionalStream(stream){

    try{

        const embed = `https://regionales.saohgdasregions.fun/tvporinternet3.php?stream=${stream}_`

        return await decodeEmbed(embed)

    }catch(e){
        return null
    }

}

async function getDeportesStream(stream){

    try{

        const embed = `https://deportes.ksdjugfsddeports.com/tvporinternet3.php?stream=${stream}_`

        return await decodeEmbed(embed)

    }catch(e){
        return null
    }

}

app.get("/",(req,res)=>{
res.send("Servidor IPTV funcionando")
})

app.get("/play", async (req,res)=>{

    let m3u8 = null

    if(req.query.canal){

        const canal = req.query.canal
        const target = req.query.target || 3

        m3u8 = await getStreamFromCanal(canal,target)

    }
    else if(req.query.regional){

        m3u8 = await getRegionalStream(req.query.regional)

    }
    else if(req.query.deportes){

        m3u8 = await getDeportesStream(req.query.deportes)

    }

    if(!m3u8){
        res.send("stream no encontrado")
        return
    }

    try{

        const playlist = await axios.get(m3u8,{
            headers:{
                "User-Agent":"Mozilla/5.0",
                "Referer":"https://regionales.saohgdasregions.fun/"
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

    }catch(e){
        res.send("error cargando playlist")
    }

})

app.get("/segment",(req,res)=>{

    const url = req.query.url

    if(!url){
        res.send("segmento no valido")
        return
    }

    const client = url.startsWith("https") ? https : http

    client.get(url,{
        headers:{
            "User-Agent":"Mozilla/5.0",
            "Referer":"https://regionales.saohgdasregions.fun/"
        }
    },stream=>{

        res.setHeader("Content-Type","video/mp2t")

        stream.pipe(res)

    }).on("error",()=>{
        res.end()
    })

})

app.listen(PORT,()=>{
console.log("server running on "+PORT)
})
