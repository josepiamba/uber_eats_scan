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
        await page.setViewport({ width: 1920, height: 1280 });

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

        let classOfContainerCategories = await page.evaluate(() => {

            let classOfContainerCategories = undefined;

            let possibleContainerCategories = document.querySelectorAll('main > div:last-child > ul');

            possibleContainerCategories = Array.from(possibleContainerCategories);

            possibleContainerCategories.forEach((ul) => {

                if (ul.clientHeight > 0 && ul.clientWidth > 0) classOfContainerCategories = ul.classList;

            })

            return classOfContainerCategories === undefined ? false : Array.from(classOfContainerCategories).join('.');

        })

        if (!classOfContainerCategories) {

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

        await page.evaluate(async () => {
            const selectors = Array.from(document.querySelectorAll('img'));
            await Promise.all(selectors.map(img => {
                if (img.complete) return;
                return new Promise((resolve, reject) => {
                    img.addEventListener('load', resolve);
                    img.addEventListener('error', reject);
                });
            }));
        })

        let translations = i18n[lang];

        let items = await page.evaluate((translations, classOfContainerCategories) => {

            let shop = document.querySelector('h1').innerText.toString();

            let date = new Date();
            date = date.toString();

            let dataOfItems = [];

            let categories = document.querySelectorAll(`main > div:last-child > ul.${classOfContainerCategories} > li`);

            let absolutePosition = 0;

            for (let i = 0; i < categories.length; i++) {

                let category = categories[i].querySelector('h2').innerText.toString();

                let cards = categories[i].querySelectorAll('ul > li');

                for (let j = 0; j < cards.length; j++) {
                    
                    absolutePosition++;

                    let content = cards[j].querySelector('div > div > div > div');

                    let product = content.querySelector('h4').innerText.toString();

                    let containerStatusAndPrice = content.lastElementChild;

                    let status = (containerStatusAndPrice.childElementCount > 1) ? containerStatusAndPrice.firstElementChild.innerText.trim() : translations['available'];

                    let priceAndCurrency = containerStatusAndPrice.lastElementChild.innerText.trim();

                    let price = priceAndCurrency.match(/([0-9., \s])*/g).reduce((acummulator, currentValue) => acummulator + currentValue);

                    let currency = priceAndCurrency.split(price).reduce((acummulator, currentValue) => acummulator + currentValue).trim();

                    // price = parseFloat(price.trim().replace(',', '').replace(String.fromCharCode(160), ''));
                    if (price.includes('.')) price = price.replace(',', '').replace('.', ',');

                    price = price.trim().replace(String.fromCharCode(160), '').split(',').shift();

                    let image = cards[j].querySelector('div > img') ? cards[j].querySelector('div > img').src : undefined;

                    dataOfItems.push({
                        shop,
                        product,
                        status,
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

            return dataOfItems;

        }, translations, classOfContainerCategories);

        console.log('the_scan_has_finished');
        socket.emit('statusOfScan', 'the_scan_has_finished');

        await browser.close();

        const csv = await converter.json2csvAsync(items, {
            delimiter: {
                field: ';',
                array: '|',
                eol: '\n',
            },
            excelBOM: true
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