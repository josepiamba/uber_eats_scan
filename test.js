const fs = require('fs');
const converter = require('json-2-csv');
const puppeteer = require('puppeteer');
const uuid = require('uuid');
const uuidV4 = uuid.v4;

const i18n = require('./src/i18n/index');

async function scraping() {

    console.log('a');

    let browser = undefined;

    // let url = 'https://www.ubereats.com/cr-en/san-jose/food-delivery/delimart-guachipelin/bbLG4X08TfCBQtvis-zOWw';

    // let url = 'https://www.ubereats.com/cr/san-jose/food-delivery/mcdonalds-escazu/umtutqU8SrK9XfPX_3zJpg';

    let url = 'https://www.ubereats.com/cr/san-jose/food-delivery/host-pavas/n3JzJc9JTLam6vVj-44pIA';

    // let url = 'https://www.ubereats.com/cr/san-jose/food-delivery/ampm-pavas-aya/WdthNWGgSeeoh0ZBDHovHA';


    try {

        browser = await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions', '--lang=es'],
        });

        console.log('b');

        let page = await browser.newPage();

        console.log('c');

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 0,
        });

        let checkValidateDOMForScan = await page.evaluate(() => {
            return document.querySelectorAll('main ul').length > 0;
        });

        if (!checkValidateDOMForScan) {

            console.log('bad url');
            return;

        }

        let classOfContainerCategories = await page.evaluate(() => {

            let classOfContainerCategories = undefined;

            let possibleContainerCategories = document.querySelectorAll('main > div:last-child > ul');

            console.log(possibleContainerCategories);

            possibleContainerCategories = Array.from(possibleContainerCategories);

            console.log(possibleContainerCategories);

            possibleContainerCategories.forEach((ul) => {

                if (ul.clientHeight > 0 && ul.clientWidth > 0) classOfContainerCategories = ul.classList;

            })

            return classOfContainerCategories === undefined ? false : Array.from(classOfContainerCategories).join('.');

        })

        if (!classOfContainerCategories) {

            console.log('bad');

        }
        console.log('d');

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

        console.log('e');

        let translations = i18n[lang];

        let items = await page.evaluate((translations, classOfContainerCategories) => {

            let shop = document.querySelector('h1').innerText.trim();

            let date = new Date();
            date = date.toString();

            let dataOfItems = [];

            let categories = document.querySelectorAll(`main > div:last-child > ul.${classOfContainerCategories} > li`);

            let absolutePosition = 0;

            for (let i = 0; i < categories.length; i++) {

                let category = categories[i].querySelector('h2').innerText.trim();

                let cards = categories[i].querySelectorAll('ul > li');

                for (let j = 0; j < cards.length; j++) {
                    
                    absolutePosition++;

                    let content = cards[j].querySelector('div > div > div > div');

                    let product = content.querySelector('h4').innerText;

                    let containerStatusAndPrice = content.lastElementChild;

                    let status = (containerStatusAndPrice.childElementCount > 1) ? containerStatusAndPrice.firstElementChild.innerText.trim() : translations['available'];

                    let priceAndCurrency = containerStatusAndPrice.lastElementChild.innerText.trim();

                    let price = priceAndCurrency.match(/([0-9., \s])*/g).reduce((acummulator, currentValue) => acummulator + currentValue);

                    let currency = priceAndCurrency.split(price).reduce((acummulator, currentValue) => acummulator + currentValue).trim();

                    price = parseFloat(price.trim().replace('.', '').replace(String.fromCharCode(160), ''));

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

        }, translations, classOfContainerCategories);

        await browser.close();

        console.log('f');

        const csv = await converter.json2csvAsync(items, {
            delimiter: {
                field: ';',
                array: '|',
                eol: '\n',
            },
            excelBOM: true
        });

        // let directoryOfResultJSON = `${process.cwd()}/public/scans/${uuidV4()}.json`;
        let directoryOfResultCSV = `${process.cwd()}/public/scans/${uuidV4()}.csv`;

        // fs.writeFileSync(directoryOfResultJSON, JSON.stringify(items, null, 4));

        fs.writeFileSync(directoryOfResultCSV, csv);

    } catch (e) {

        console.log(e);

    }
}

scraping();
