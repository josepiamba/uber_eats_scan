const fs = require('fs');
const converter = require('json-2-csv');
const puppeteer = require('puppeteer');
const uuid = require('uuid');
const uuidV4 = uuid.v4;
const i18n = require('./../i18n/index');

const regexForUrlToUberEats = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)+(ubereats.com+[\/])([a-zA-Z-]*[a-zA-Z-]+[\/])([a-zA-Z-]*[a-zA-Z-]+[\/])([a-zA-Z-]*[a-zA-Z-]+[\/])([a-zA-Z-]*[a-zA-Z0-9-]+[\/])([a-zA-Z-0-9_]*[a-zA-Z-0-9_])$/g;

module.exports = scan = async (socket, urlForScan) => {

    let browser = undefined;

    try {

        if (urlForScan.match(regexForUrlToUberEats) === null) {

            console.log('url_invalid');
            socket.emit('errorInScan', 'url_invalid');
            return false;

        }

        console.log('the_scan_has_started');
        socket.emit('statusOfScan', 'the_scan_has_started');

        browser = await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ],
        });

        console.log('the_browser_has_been_launched');
        socket.emit('statusOfScan', 'the_browser_has_been_launched');

        let page = await browser.newPage();

        await page.goto(urlForScan, {
            waitUntil: 'domcontentloaded',
            timeout: 0,
        });

        let checkValidateDOMForScan = await page.evaluate(() => {
            return document.querySelectorAll('main ul').length;
        });

        if (checkValidateDOMForScan <= 0) {

            console.log('url_invalid');
            socket.emit('errorInScan', 'url_invalid');
            return false;

        }

        console.log('the_scan_has_reached_the_destination_url');
        socket.emit('statusOfScan', 'the_scan_has_reached_the_destination_url');

        let lang = await page.evaluate(async () => {

            await new Promise((resolve, reject) => {

                let totalHeight = 0;
                let distance = 750;

                var timer = setInterval(async () => {

                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {

                        clearInterval(timer);
                        resolve();

                    }

                }, 750);

            });

            let lang = document.querySelector('html').lang;

            if (lang.includes('es')) return 'es'; 

            return 'en';

        });

        console.log('the_scan_has_recovered_all_the_elements');
        socket.emit('statusOfScan', 'the_scan_has_recovered_all_the_elements');

        let translations = i18n[lang];

        let items = await page.evaluate((translations) => {

            let shop = document.querySelector('h1').innerText.trim();

            let date = new Date();
            date = date.toString();

            let dataOfItems = [];

            let categories = document.querySelectorAll('main > div:nth-child(3) > ul:last-child > li');

            let absolutePosition = 0;

            for (let i = 0; i < categories.length; i++) {

                let category = categories[i].querySelector('h2').innerText.trim();

                let cards = categories[i].querySelectorAll('ul > li');

                for (let j = 0; j < cards.length; j++) {
                    
                    absolutePosition++;

                    let content = cards[j].querySelector('div > div > div > div');

                    let product = content.querySelector('h4').innerText.trim();

                    let containerStatusAndPrice = content.lastElementChild;

                    let status = (containerStatusAndPrice.childElementCount > 1) ? containerStatusAndPrice.firstElementChild.innerText.trim() : translations['available'];

                    let priceAndCurrency = containerStatusAndPrice.lastElementChild.innerText.trim();

                    let price = priceAndCurrency.match(/([0-9., \s])*/g).reduce((acummulator, currentValue) => acummulator + currentValue);

                    let currency = priceAndCurrency.split(price).reduce((acummulator, currentValue) => acummulator + currentValue).trim();

                    price = parseFloat(price.trim().replace(',', ''));

                    dataOfItems.push({
                        shop,
                        product,
                        status,
                        price,
                        currency,
                        category,
                        position: j + 1,
                        absolutePosition,
                        date
                    });

                }

            }

            return dataOfItems;

        }, translations);

        console.log('the_scan_has_finished');
        socket.emit('statusOfScan', 'the_scan_has_finished');

        await browser.close();

        const csv = await converter.json2csvAsync(items, {
            delimiter: {
                field: ';',
                array: '|',
                eol: '\n',
            }
        });

        let scanId = uuidV4();

        fs.writeFileSync(`${process.cwd()}/public/scans/dataeats-${scanId}.csv`, csv);

        return `${process.env.URL}scans/download/${scanId}`;

    } catch (e) {

        console.log(e);

        socket.emit('errorInScan', e);
        return false;

    }

};