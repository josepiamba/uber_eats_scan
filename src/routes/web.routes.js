const fs = require('fs');
const { Router } = require('express');
const router = Router();

router.get('/', (req, res) => {

    res.json('Hello from Uber Eats Scan').status(200);

});


router.get('/scans/download/:scanId', (req, res) => {

    try {

        let { scanId } = req.params;

        if (fs.existsSync(`${process.cwd()}/public/scans/dataeats-${scanId}.csv`)) {

            let scan = fs.readFileSync(`${process.cwd()}/public/scans/dataeats-${scanId}.csv`);

            fs.unlinkSync(`${process.cwd()}/public/scans/dataeats-${scanId}.csv`);
            
            res.setHeader('Content-Type', 'application/octet-stream');
            
            res.setHeader('Content-disposition', `attachment;filename=dataeats-${scanId}.csv`);
            
            res.write(scan);

            res.end();

        } else {

            res.json('the_requested_scan_was_not_found').status(404);

        }
        
    } catch (e) {

        res.json('the_requested_scan_was_not_found').status(404);
        
    }

});

module.exports = router;