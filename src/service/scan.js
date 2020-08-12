const fs = require('fs');
const converter = require('json-2-csv');
const puppeteer = require('puppeteer');
const uuid = require('uuid');
const uuidV4 = uuid.v4;

module.exports = scan = async () => {

    var browser = undefined;

    try {

        browser = await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions', '--lang=es'],
        });

        let page = await browser.newPage();

        await page.goto('https://www.ubereats.com/cr-en/san-jose/food-delivery/delimart-guachipelin/bbLG4X08TfCBQtvis-zOWw', {
            waitUntil: 'domcontentloaded',
            timeout: 0,
        });

        await page.evaluate(async () => {

            await new Promise((resolve, reject) => {

                let totalHeight = 0;
                var distance = 500;                

                var timer = setInterval(async () => {

                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {

                        clearInterval(timer);
                        resolve();

                    }

                }, 1000);

            });

        });

        var items = await page.evaluate(() => {

            var shop = document.querySelector('h1').innerText;

            var date = new Date();
            date = date.toString();

            var dataOfItems = [];

            var categories = document.querySelectorAll('main > div:nth-child(3) > ul:nth-child(5) > li');

            let absolutePosition = 0;

            for (let i = 0; i < categories.length; i++) {

                let category = categories[i].querySelector('h2').innerText;
                var cards = categories[i].querySelectorAll('ul > li');

                for (let j = 0; j < cards.length; j++) {

                    absolutePosition++;

                    if (typeof cards[j] == 'object') {

                        var content = cards[j].querySelector('div > div >div > div > div');

                        if (content.childElementCount > 1) {

                            dataOfItems.push({
                                shop,
                                product: cards[j].querySelector('h4').innerText,
                                status: cards[j].querySelector('div > div >div > div > div > div:nth-child(1)').innerText,
                                price: cards[j].querySelector('div > div >div > div > div > div:nth-child(3)').innerText,
                                category,
                                position: j + 1,
                                absolutePosition,
                                date,
                                image: cards[j].querySelector('div > div > div > div img') != null ? cards[j].querySelector('img').src : null
                            });

                        } else {

                            dataOfItems.push({
                                shop,
                                product: cards[j].querySelector('h4').innerText,
                                status: 'Avalaible',
                                price: cards[j].querySelector('div > div >div > div > div > div:nth-child(1)').innerText,
                                category,
                                position: j + 1,
                                absolutePosition,
                                date,
                                image: cards[j].querySelector('div > div > div > div img') != null ? cards[j].querySelector('img').src : null
                            });

                        }

                    }

                }
                
            }

            return dataOfItems;

        });

        console.log('f');

        await browser.close();

        const csv = await converter.json2csvAsync(items, {
            delimiter: {
                field: ';',
                array: '|',
                eol: '\n'
            },
            excelBOM: true
        });

        fs.writeFileSync(`${process.cwd()}/public/scans/${uuidV4()}.csv`, csv);

        return true;

    } catch (e) {

        return false;

    }

};