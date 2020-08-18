const fs = require('fs');
const { Router } = require('express');
const router = Router();

router.get('/', (req, res) => {

    res.json('Hello from Uber Eats Scan').status(200);

});


router.get('/scans/download/:scanId', (req, res) => {

    let { scanId } = req.params;

    if (fs.existsSync(`${process.cwd()}/public/scans/UberEatsScan-${scanId}.csv`)) {

        let scan = fs.readFileSync(`${process.cwd()}/public/scans/UberEatsScan-${scanId}.csv`);
        
        res.setHeader('Content-Type', 'application/octet-stream');
        
        res.setHeader('Content-disposition', `attachment;filename=UberEatsScan-${scanId}.csv`);
        
        res.write(scan);

        res.end();

    } else {

        res.json('the_requested_scan_was_not_found').status(404);

    }

});

module.exports = router;