const fs = require('fs');
const converter = require('json-2-csv');
const puppeteer = require('puppeteer');
const uuid = require('uuid');
const { isNumber } = require('util');
const uuidV4 = uuid.v4;

async function scraping() {

    console.log('a');
    var browser = undefined;

    try {

        browser = await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions', '--lang=es'],
        });

        console.log('b');

        let page = await browser.newPage();

        console.log('c');

        await page.goto('https://www.ubereats.com/cr-en/san-jose/food-delivery/delimart-guachipelin/bbLG4X08TfCBQtvis-zOWw', {
            waitUntil: 'domcontentloaded',
            timeout: 0,
        });

        console.log('d');

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

        // await page.evaluate(async () => {

        //     const selectors = Array.from(document.querySelectorAll('div > img'));

        //     await Promise.all(selectors.map(img => {

        //         if (img.complete) return;

        //         return new Promise((resolve, reject) => {

        //             img.addEventListener('load', resolve);
        //             img.addEventListener('error', reject);

        //         });

        //     }));

        // })

        console.log('e');

        var items = await page.evaluate(() => {

            var shop = document.querySelector('h1').innerText.trim();

            var date = new Date();
            date = date.toString();

            var dataOfItems = [];

            var categories = document.querySelectorAll('main > div:nth-child(3) > ul');

            categories = categories[0].children;

            let absolutePosition = 0;

            for (let i = 0; i < categories.length; i++) {

                let category = categories[i].querySelector('h2').innerText.trim();

                var cards = categories[i].querySelectorAll('ul > li');

                for (let j = 0; j < cards.length; j++) {

                    absolutePosition++;

                    if (typeof cards[j] == 'object') {

                        var content = cards[j].querySelector('div > div >div > div > div');

                        var image = null;

                        var currency = null;

                        if (cards[j].querySelector('div > img') != null) image = cards[j].querySelector('div > img').src

                        if (content.childElementCount > 1) {

                            var price = cards[j].querySelector('div > div >div > div > div > div:nth-child(3)').innerText.trim();

                            if (price.match(String.fromCharCode(160))) {

                                componentOfPrice = price.split(String.fromCharCode(160));

                                for (let k = 0; k < componentOfPrice.length; k++) {

                                    if (isNaN(parseInt(componentOfPrice[k]))) currency = componentOfPrice[k];
                                    else {
                                        // console.log(componentOfPrice[k].replace(',', ''));
                                        price = parseInt(componentOfPrice[k].replace(',', ''));
                                    }

                                }

                            }

                            dataOfItems.push({
                                shop,
                                product: cards[j].querySelector('h4').innerText.trim(),
                                status: cards[j].querySelector('div > div >div > div > div > div:nth-child(1)').innerText.trim(),
                                price,
                                currency,
                                category,
                                position: j + 1,
                                absolutePosition,
                                date,
                                image
                            });

                        } else {

                            var price = cards[j].querySelector('div > div >div > div > div > div:nth-child(1)').innerText.trim();

                            if (price.match(String.fromCharCode(160))) {

                                componentOfPrice = price.split(String.fromCharCode(160));

                                for (let k = 0; k < componentOfPrice.length; k++) {

                                    if (isNaN(parseInt(componentOfPrice[k]))) currency = componentOfPrice[k];
                                    else {
                                        // console.log(componentOfPrice[k].replace('.', ''));
                                        price = parseInt(componentOfPrice[k].replace(',', ''));
                                    }

                                }

                            }

                            dataOfItems.push({
                                shop,
                                product: cards[j].querySelector('h4').innerText.trim(),
                                status: 'Avalaible',
                                price,
                                currency,
                                category,
                                position: j + 1,
                                absolutePosition,
                                date,
                                image
                            });

                        }

                    }

                }
                
            }

            return dataOfItems;

        });

        console.log('f');

        // console.log(items);

        await browser.close();

        const csv = await converter.json2csvAsync(items, {
            delimiter: {
                // wrap  : '\'',
                field: ';',
                array: '|',
                eol: '\n'
            },
            excelBOM: true
        });

        fs.writeFileSync(`${process.cwd()}/public/scans/${uuidV4()}.csv`, csv);

    } catch (e) {

        console.log(e);

    }
}

scraping();
