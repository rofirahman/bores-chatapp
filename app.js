const express = require('express')
const middleware = require('@line/bot-sdk').middleware
const JSONParseError = require('@line/bot-sdk').JSONParseError
const SignatureValidationFailed = require('@line/bot-sdk').SignatureValidationFailed
const Client = require('@line/bot-sdk').Client
const config = require('config')
const request = require('request')
const fs = require('fs');
const cheerio = require('cheerio');


const app = express()

const token = config.get('channelAccessToken')
const secret = config.get('channelSecret')

const conf = {
    channelAccessToken: token,
    channelSecret: secret
}

const client = new Client(conf);


app.use(middleware(conf))

app.get('/', (req, res, next) => {
    console.log('halo')
})

app.post('/webhook', (req, res, next) => {

    res.json(req.body.events)

    var event = req.body.events[0]

    var type = event.type
    var tokenReply = event.replyToken
    var user = event.source.userId

    if (type == 'message') {
        var msg = event.message.text
        var msg_text = msg.toLowerCase()

        // Message user must to have string "login" on first string
        var msg_match_login = msg_text.match(/login/)
        var msg_match_semester = msg_text.match(/semester/)
        var msg_match_hasil_studi = msg_text.match(/hasil studi/)

        // If message contain "login"
        if (msg_match_login) {

            var userInput = event.message.text.split(" ")
            var username = userInput[1]
            var password = userInput[2]
            console.log('user id '+event.source.userId+' logged in')

            var headers = {
                'Connection': 'keep-alive',
                'Cache-Control': 'max-age=0',
                'Origin': 'http://simpati-mhs.respati.ac.id',
                'Upgrade-Insecure-Requests': '1',
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'en-US,en;q=0.9'
            }

            var dataString = 'Username='+username+'&Password='+password;

            var options = {
                url: 'http://simpati-mhs.respati.ac.id/index.php/login/verifikasi_login',
                method: 'POST',
                headers: headers,
                body: dataString
            }

            function callback(error, response, body) {

                if (response.statusCode == 200) {

                    var str = response.headers['set-cookie'][0]
                    var cookie = str.substring(str.lastIndexOf("set-cookie=")+12,str.lastIndexOf("; exp"));

                    fs.readFile('cookies.json', 'utf8', function readFileCallback(err, data){
                        if (err){
                            console.log(err);
                        } else {
                            var jsonObj = JSON.parse(data)

                            function updateCookieUser() {
                                for (var i = 0; i < jsonObj.cookies.length; i++) {
                                    if (event.source.userId == jsonObj.cookies[i].userid) {
                                        jsonObj.cookies.splice(i,1);
                                        jsonObj.cookies.push(
                                            {
                                                userid: event.source.userId, 
                                                cookie: cookie
                                            })
                                        json = JSON.stringify(jsonObj)
                                        fs.writeFile('cookies.json', json, 'utf8', (err) => {
                                            if (err) {
                                                console.error(err);
                                                return
                                            }
                                            console.log("Cookie updated with userid :"+event.source.userId)
                                        })

                                        return true
                                    } 
                                }
                                return false
                            }

                            if (updateCookieUser() == false) {
                                jsonObj.cookies.push(
                                    {
                                        userid: event.source.userId, 
                                        cookie: cookie
                                    })
                                json = JSON.stringify(jsonObj)
                                fs.writeFile('cookies.json', json, 'utf8', (err) => {
                                    if (err) {
                                        console.error(err)
                                        return
                                    }
                                    console.log("Cookie stored with userid: "+event.source.userId)
                                })
                            }
                        }
                    })

                    var msgToUser = {
                        type: 'text',
                        text: 'Kamu berhasil login 👍'
                    }

                    client.replyMessage(tokenReply, msgToUser)

                } else if(response.statusCode == 303) {
                    console.log(body)
                    var msgToUser = {
                        type: 'text',
                        text: 'Username dan password kamu tidak cocok nih 😢'
                    }

                    client.replyMessage(tokenReply, msgToUser)
                }
            }

            request(options, callback)

        // Transkrip
        } else if(msg_text == 'transkrip') {

            fs.readFile('cookies.json', 'utf8', function readFileCallback(err, data){
                if (err){
                    console.log(err);
                } else {

                    function checkCookieUser(iduser) {
                        jsonObj = JSON.parse(data)
                        for (var i = 0; i < jsonObj.cookies.length; i++) {
                            if (iduser == jsonObj.cookies[i].userid) {
                                var c_cookie = jsonObj.cookies[i].cookie
                                var headers = {
                                    'Connection': 'keep-alive',
                                    'Cache-Control': 'max-age=0',
                                    'Upgrade-Insecure-Requests': '1',
                                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                                    'Cookie': '_ga=GA1.3.336982823.1560760977; _gid=GA1.3.1685062545.1561038520; ci_session='+c_cookie,
                                    'Accept-Language': 'en-US,en;q=0.9'
                                }

                                var options = {
                                    url: 'http://simpati-mhs.respati.ac.id/index.php/mahasiswa/lihat_tns',
                                    headers: headers
                                }

                                request(options, function(error, response, body) {
                                    if (!error && response.statusCode == 200) {
                                        if (response.headers.refresh) {
                                            var msgToUser = {
                                                type: 'text',
                                                text: 'Cookie yang kamu punya expired 😢\nLogin lagi yuk'
                                            }

                                            client.replyMessage(tokenReply, msgToUser)
                                            return 0
                                        }

                                        var $ = cheerio.load(body);

                                        let find_ipk = $('.table').filter(function() {
                                            return $(this)
                                        }).find('tbody').find('tr:contains("IP Semester:")').first().text()

                                        function sliceIPK(fe, le) {
                                            return find_ipk.substring(find_ipk.lastIndexOf(fe) + 1, find_ipk.lastIndexOf(le))
                                        }

                                        var skor = sliceIPK(': ','/')
                                        var sks_total = sliceIPK('/',' =')
                                        var ipk = sliceIPK(': ','')

                                        console.log('- Transkrip ('+event.source.userId+')')
                                        console.log('IPK = '+ipk)
                                        console.log('SKS = '+sks_total)

                                        var judul = $('title')
                                        console.log(judul.text())

                                        var msgToUser = {
                                            type: 'text',
                                            text: judul.text()+'\n'+'Total Skor : '+skor+'\nTotal SKS : '+sks_total+'\nIP Semester :'+ipk
                                        }

                                        client.replyMessage(tokenReply, msgToUser)
                                    } else {

                                        var msgToUser = {
                                            type: 'text',
                                            text: 'Kamu belum login😢'
                                        }

                                        client.replyMessage(tokenReply, msgToUser)
                                    }
                                })
                                return true
                            }
                        }
                        return false
                    }

                    console.log(checkCookieUser())

                    if (checkCookieUser(user) == false) {

                        var msgToUser = {
                            type: 'text',
                            text: 'Kamu belum punya cookie 😢\nLogin dulu yuk'
                        }

                        client.replyMessage(tokenReply, msgToUser)
                    }
                }
            })
        
        // Semester
        } else if(msg_match_semester) {

            let userInputSMT = event.message.text.split(" ")
            console.log(userInputSMT)
            var smt = userInputSMT[1]

            fs.readFile('cookies.json', 'utf8', function readFileCallback(err, data){
                if (err){
                    console.log(err);
                } else {

                    function checkCookieUser(iduser) {
                        jsonObj = JSON.parse(data)
                        for (var i = 0; i < jsonObj.cookies.length; i++) {
                            if (iduser == jsonObj.cookies[i].userid) {
                                var c_cookie = jsonObj.cookies[i].cookie
                                var headers = {
                                    'Connection': 'keep-alive',
                                    'Cache-Control': 'max-age=0',
                                    'Origin': 'http://simpati-mhs.respati.ac.id',
                                    'Upgrade-Insecure-Requests': '1',
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                                    'Referer': 'http://simpati-mhs.respati.ac.id/index.php/mahasiswa/lihat_khs',
                                    'Accept-Language': 'en-US,en;q=0.9',
                                    'Cookie': '_ga=GA1.3.336982823.1560760977; _gid=GA1.3.1685062545.1561038520; ci_session='+c_cookie
                                }

                                var options = {
                                    url: 'http://simpati-mhs.respati.ac.id/index.php/mahasiswa/lihat_khs',
                                    headers: headers
                                }

                                request(options, function(error, response, body) {
                                    if (!error && response.statusCode == 200) {
                                        if (response.headers.refresh) {
                                            var msgToUser = {
                                                type: 'text',
                                                text: 'Cookie yang kamu punya expired 😢\nLogin lagi yuk'
                                            }

                                            client.replyMessage(tokenReply, msgToUser)
                                            return 0
                                        }

                                        var $ = cheerio.load(body);
                                        let filteredEls = $('.table tbody tr').filter(function() {
                                            return $(this)
                                        })

                                        var getSemester = []

                                        filteredEls.next().find('select[name=thn_tempuh]').find('option').each((i,op) => {
                                            getSemester.push($(op).val())
                                        })

                                        var allSmt = getSemester.reverse()

                                        function getMatkul(sem, allSem) {
                                            console.log(allSem)
                                            for (var i = 0; i < allSem.length; i++) {
                                                
                                                var userSMT = sem-1
                                                if (userSMT == i) {
                                                    console.log(allSem[i])

                                                    var dataString = 'thn_tempuh='+allSem[i]+'&jensm=R';

                                                    var param = {
                                                        url: 'http://simpati-mhs.respati.ac.id/index.php/mahasiswa/lihat_khs',
                                                        method: 'POST',
                                                        headers: headers,
                                                        body: dataString

                                                    }

                                                    request(param, function(error, response, body) {
                                                        if (!error && response.statusCode == 200) {
                                                            var $ = cheerio.load(body)

                                                            // Store Matakuliah
                                                            var allMK = []

                                                            $('tr').has('td').each(function(i, result){
                                                                var kode_mk = $(result).parent().find('td:nth-child(2)').text()
                                                                var nama_mk = $(result).parent().find('td:nth-child(3)').text()
                                                                var nilai = $(result).parent().find('td:nth-child(9)').text()
                                                                var skor = $(result).parent().find('td:nth-child(10)').text()

                                                                allMK.push({
                                                                    "type": 'text',
                                                                    "text": kode_mk+' - '+nama_mk+' - '+nilai+' - '+skor+''
                                                                })
                                                            })


                                                            function printArr(arr) {
                                                                let str = "";
                                                                for (let i = 0; i < arr.length; i++) {
                                                                    if (Array.isArray(arr[i].text)) str += printArr(arr[i].text);
                                                                    else str += "( "+(i+1)+" ) "+arr[i].text + "\n\n";
                                                                }
                                                                return str;
                                                            }


                                                            // Search IPK using IP Semester
                                                            let find_ipk = $('.table').find('tbody').find('tr:contains("IP Semester:")').first().text()

                                                            function sliceIPK(fe, le) {
                                                                return find_ipk.substring(find_ipk.lastIndexOf(fe) + 1, find_ipk.lastIndexOf(le))
                                                            }

                                                            var skor = sliceIPK(': ','/')
                                                            var sks_total = sliceIPK('/',' =')
                                                            var ipk = sliceIPK('= ','')
                                                            console.log('IPK = '+ipk)

                                                            let msgToUser = 
                                                                {
                                                                    type: 'text',
                                                                    text: 
                                                                        'Daftar Hasil Studi Semester '+sem+'\n\n'+
                                                                        printArr(allMK)+'\n'+
                                                                        'Total Skor : '+skor+'\n'+
                                                                        'Total SKS : '+sks_total+'\n'+
                                                                        'IP Semester : '+ipk
                                                                }

                                                            client.replyMessage(tokenReply, msgToUser)

                                                        } else {
                                                            console.log(error)
                                                        }
                                                    })

                                                    return true
                                                }
                                                
                                            }
                                            return false
                                        }

                                        if (getMatkul(smt, allSmt) == false) {
                                            var msgToUser = {
                                                type: 'text',
                                                text: 'Data semester '+smt+' tidak ada 😢'
                                            }

                                            client.replyMessage(tokenReply, msgToUser)
                                        }

                                    } else {
                                        var msgToUser = {
                                            type: 'text',
                                            text: 'Kamu belum login😢'
                                        }

                                        client.replyMessage(tokenReply, msgToUser)
                                    }
                                })

                                return true
                            }
                        }
                        return false
                    }

                    if (checkCookieUser(user) == false) {
                        var msgToUser = {
                            type: 'text',
                            text: 'Kamu belum punya cookie 😢\nLogin dulu yuk'
                        }

                        client.replyMessage(tokenReply, msgToUser)
                    }

                    
                }
            })

        } else if(msg_text == 'hasil studi') {
            var msgToUser = {
                type: 'text',
                text: 'Maaf fitur ini sedang dalam perbaikan 😢'
            }

            client.replyMessage(tokenReply, msgToUser)

        } else if(msg_text == 'bantuan' || msg_text == 'help') {
            var msgToUser = {
                type: 'text',
                text: 
                    'Fitur yang dapat digunakan :\n\n'+
                    '1. Login \n( ketik: login [username] [password] )\n\n'+
                    '2. Lihat Transkrip Sementara \n( ketik: transkrip )\n\n'+
                    '3. Lihat Daftar Hasil Studi \n( ketik: hasil studi )\n\n'+
                    '4. Lihat Nilai pada Semester tertentu \n( ketik: semester [1/2/3/dst] )\n\n'+
                    'NB: Jika menemukan bug (seperti data tidak tampil), laporkan ke https://instagram.com/rofirahman_'
            }

            client.replyMessage(tokenReply, msgToUser)
        } else {
            console.log('Greeting')
            replyMessages(tokenReply, user)

        }
    } else {
        console.log(type)
        replyMessages(tokenReply, user)
    }
})

function replyMessages(replyToken, userId) {

    var message = {
        type: 'text',
        text: 'Halo 😁 \nRiyo adalah Chat Bot Unofficial Kampus UNRIYO.\nKetik: `help` atau `bantuan` untuk melihat perintah yang dapat digunakan.\nRiyo masih dalam tahap pengembangan.'
    };


    client.replyMessage(replyToken, message)
    console.log('Reply message to '+userId+' done')
}


app.post('/push-messages', (req, res) => {
    client.pushMessage(userId, { type: 'text', text: 'hello, world' });
})



app.use((err, req, res, next) => {
    if (err instanceof SignatureValidationFailed) {
        res.status(401).send(err.signature)
        return
    } else if (err instanceof JSONParseError) {
        res.status(400).send(err.raw)
        return
    }
next(err)
})

app.listen(3000)