const fs = require('fs');
const converter = require('json-2-csv');
const puppeteer = require('puppeteer');
const uuid = require('uuid');
const { isNumber } = require('util');
const uuidV4 = uuid.v4;

async function scraping() {

    console.log('a');

    let browser = undefined;

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
                let distance = 500;

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

        console.log('e');

        var items = await page.evaluate(() => {

            let shop = document.querySelector('h1').innerText.trim();

            let date = new Date();
            date = date.toString();

            let dataOfItems = [];

            let categories = document.querySelectorAll('main > div:nth-child(3) > ul');

            categories = categories[0].children;

            let absolutePosition = 0;

            for (let i = 0; i < categories.length; i++) {

                let category = categories[i].querySelector('h2').innerText.trim();

                let cards = categories[i].querySelectorAll('ul > li');

                for (let j = 0; j < cards.length; j++) {
                    
                    absolutePosition++;

                    if (typeof cards[j] == 'object') {

                        let content = cards[j].querySelector('div > div >div > div > div');

                        let image = null;

                        let currency = null;

                        if (cards[j].querySelector('div > img') != null) image = cards[j].querySelector('div > img').src;

                        if (content.childElementCount > 1) {

                            let price = cards[j].querySelector('div > div >div > div > div > div:nth-child(3)').innerText.trim();

                            if (price.match(String.fromCharCode(160))) {

                                componentOfPrice = price.split(String.fromCharCode(160));

                                for (let k = 0; k < componentOfPrice.length; k++) {

                                    if (isNaN(parseInt(componentOfPrice[k]))) currency = componentOfPrice[k];
                                    else price = parseInt(componentOfPrice[k].replace(',', ''));

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
                                image,
                            });

                        } else {

                            let price = cards[j].querySelector('div > div >div > div > div > div:nth-child(1)').innerText.trim();

                            if (price.match(String.fromCharCode(160))) {
                                componentOfPrice = price.split(String.fromCharCode(160));

                                for (let k = 0; k < componentOfPrice.length; k++) {

                                    if (isNaN(parseInt(componentOfPrice[k]))) currency = componentOfPrice[k];
                                    else price = parseInt(componentOfPrice[k].replace(',', ''));

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
                                image,
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
                eol: '\n',
            },
            excelBOM: true,
        });

        let directoryOfResult = `${process.cwd()}/public/scans/${uuidV4()}.csv`;

        fs.writeFileSync(directoryOfResult, csv);

        return directoryOfResult;

    } catch (e) {

        console.log(e);

    }
}

scraping();
