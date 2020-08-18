const fs = require('fs');
const converter = require('json-2-csv');
const puppeteer = require('puppeteer');
const uuid = require('uuid');
const uuidV4 = uuid.v4;

module.exports = scan = async (socket, urlForScan) => {

    console.log('the_scan_has_started');
    socket.emit('statusOfScan', 'the_scan_has_started');

    let browser = undefined;

    try {

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

        console.log('the_scan_has_reached_the_destination_url');
        socket.emit('statusOfScan', 'the_scan_has_reached_the_destination_url');

        await page.evaluate(async () => {

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

        });

        console.log('the_scan_has_recovered_all_the_elements');
        socket.emit('statusOfScan', 'the_scan_has_recovered_all_the_elements');

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

        console.log('the_scan_has_finished');
        socket.emit('statusOfScan', 'the_scan_has_finished');

        await browser.close();

        const csv = await converter.json2csvAsync(items, {
            delimiter: {
                field: ';',
                array: '|',
                eol: '\n',
            },
            excelBOM: true,
        });

        let scanId = uuidV4();

        fs.writeFileSync(`${process.cwd()}/public/scans/UberEatsScan-${scanId}.csv`, csv);

        return `${process.env.URL}scans/download/${scanId}`;

    } catch (e) {

        socket.emit('errorInScan', e);
        return false;

    }

};