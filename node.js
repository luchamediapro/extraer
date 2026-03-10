const https = require("https");

const url = "https://deportes.ksdjugfsddeports.com/tvporinternet3.php?stream=5_";

function decodeBase64Multiple(str, times){
    let result = str;
    for(let i=0;i<times;i++){
        result = Buffer.from(result, 'base64').toString('utf8');
    }
    return result;
}

https.get(url,(res)=>{

    let data = "";

    res.on("data",chunk=>{
        data += chunk;
    });

    res.on("end",()=>{

        const match = data.match(/atob\(atob\(atob\(atob\("([^"]+)"/);

        if(!match){
            console.log("No se encontró la URL codificada");
            return;
        }

        const encoded = match[1];

        const m3u8 = decodeBase64Multiple(encoded,4);

        console.log("URL M3U8:");
        console.log(m3u8);

    });

}).on("error",(err)=>{
    console.log(err);
});
