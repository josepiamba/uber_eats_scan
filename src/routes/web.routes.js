const fs = require('fs');
const { Router } = require('express');
const router = Router();

router.get('/', (req, res) => {

    res.json('Hello from Uber Eats Scan').status(200);

});


router.get('/scans/download/:scanId', (req, res) => {

    let { scanId } = req.params;

    if (fs.existsSync(`${process.cwd()}/public/scans/${scanId}.csv`)) {

        let scan = fs.readFileSync(`${process.cwd()}/public/scans/${scanId}.csv`);
        
        res.setHeader('Content-Type', 'application/octet-stream');
        
        res.setHeader('Content-disposition', `attachment;filename=${scanId}.csv`);
        
        res.write(scan);

        res.end();

    } else {

        res.json('The requested scan was not found').status(404);

    }

});

module.exports = router;